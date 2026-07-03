import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Exercise, ExerciseCategory, ExercisePrescriptionType, PersonalRecordMovement, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../../../shared/application/audit.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ListExercisesQueryDto, SaveExerciseDto } from '../presentation/dto/exercise-library.dto';

type RequestContext = { ipAddress?: string; userAgent?: string };

@Injectable()
export class ExerciseLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listForTrainer(trainerId: string, filters: ListExercisesQueryDto) {
    const search = filters.search?.trim();
    const activeOnly = filters.activeOnly !== 'false';
    const exercises = await this.prisma.exercise.findMany({
      where: {
        category: filters.category,
        isActive: activeOnly ? true : undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
        OR: [{ isSystem: true }, { trainerId }]
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    });
    return exercises.map((exercise) => this.present(exercise));
  }

  async create(trainerId: string, input: SaveExerciseDto, context: RequestContext) {
    const exercise = await this.prisma.exercise.create({
      data: this.toData(trainerId, input)
    });
    await this.audit.record({
      event: 'EXERCISE_CREATED',
      userId: trainerId,
      actorUserId: trainerId,
      description: `Treinador criou o exercício ${exercise.name}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { exerciseId: exercise.id, key: exercise.key }
    });
    return this.present(exercise);
  }

  async update(trainerId: string, exerciseId: string, input: SaveExerciseDto, context: RequestContext) {
    const exercise = await this.requireOwnedExercise(trainerId, exerciseId, context, true);
    const updated = await this.prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        name: input.name.trim(),
        category: input.category,
        prescriptionType: input.prescriptionType,
        prBase: input.prBase ?? null,
        canUpdatePersonalRecord: this.canUpdatePr(input),
        description: input.description?.trim() || null
      }
    });
    await this.audit.record({
      event: 'EXERCISE_UPDATED',
      userId: trainerId,
      actorUserId: trainerId,
      description: `Treinador editou o exercício ${updated.name}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { exerciseId: updated.id, key: updated.key }
    });
    return this.present(updated);
  }

  async deactivate(trainerId: string, exerciseId: string, context: RequestContext) {
    const exercise = await this.requireOwnedExercise(trainerId, exerciseId, context, true);
    const updated = await this.prisma.exercise.update({
      where: { id: exercise.id },
      data: { isActive: false }
    });
    await this.audit.record({
      event: 'EXERCISE_DEACTIVATED',
      userId: trainerId,
      actorUserId: trainerId,
      description: `Treinador inativou o exercício ${updated.name}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { exerciseId: updated.id, key: updated.key }
    });
    return this.present(updated);
  }

  async duplicateSystemExercise(trainerId: string, exerciseId: string, context: RequestContext) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: exerciseId, isSystem: true }
    });
    if (!exercise) throw new NotFoundException('System exercise not found.');

    const copy = await this.prisma.exercise.create({
      data: {
        key: `CUSTOM_${randomUUID()}`,
        trainerId,
        name: `${exercise.name} (cópia)`,
        category: exercise.category,
        prescriptionType: exercise.prescriptionType,
        prBase: exercise.prBase,
        canUpdatePersonalRecord: exercise.canUpdatePersonalRecord,
        isSystem: false,
        isActive: true,
        description: exercise.description
      }
    });
    await this.audit.record({
      event: 'EXERCISE_DUPLICATED',
      userId: trainerId,
      actorUserId: trainerId,
      description: `Treinador duplicou o exercício do sistema ${exercise.name}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { sourceExerciseId: exercise.id, exerciseId: copy.id }
    });
    return this.present(copy);
  }

  private async requireOwnedExercise(
    trainerId: string,
    exerciseId: string,
    context: RequestContext,
    denySystemEdit: boolean
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new NotFoundException('Exercise not found.');
    if (exercise.isSystem && denySystemEdit) {
      await this.audit.record({
        event: 'EXERCISE_GLOBAL_EDIT_DENIED',
        userId: trainerId,
        actorUserId: trainerId,
        result: 'FAILURE',
        description: 'Tentativa de editar exercício global do sistema.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { exerciseId }
      });
      throw new ForbiddenException('System exercises cannot be edited.');
    }
    if (exercise.trainerId !== trainerId) {
      await this.audit.record({
        event: 'EXERCISE_ACCESS_DENIED',
        userId: trainerId,
        actorUserId: trainerId,
        result: 'FAILURE',
        description: 'Tentativa de acessar exercício de outro treinador.',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { exerciseId }
      });
      throw new ForbiddenException('Exercise does not belong to authenticated trainer.');
    }
    return exercise;
  }

  private toData(trainerId: string, input: SaveExerciseDto): Prisma.ExerciseCreateInput {
    return {
      key: `CUSTOM_${randomUUID()}`,
      trainer: { connect: { id: trainerId } },
      name: input.name.trim(),
      category: input.category,
      prescriptionType: input.prescriptionType,
      prBase: input.prBase ?? null,
      canUpdatePersonalRecord: this.canUpdatePr(input),
      isSystem: false,
      isActive: true,
      description: input.description?.trim() || null
    };
  }

  private canUpdatePr(input: SaveExerciseDto) {
    return input.prescriptionType === 'LOAD' && Boolean(input.prBase) && input.canUpdatePersonalRecord;
  }

  private present(exercise: Exercise) {
    return {
      id: exercise.id,
      key: exercise.key,
      name: exercise.name,
      category: exercise.category as ExerciseCategory,
      prescriptionType: exercise.prescriptionType as ExercisePrescriptionType,
      prBase: exercise.prBase as PersonalRecordMovement | null,
      canUpdatePersonalRecord: exercise.canUpdatePersonalRecord,
      description: exercise.description,
      isActive: exercise.isActive,
      origin: exercise.isSystem ? 'SYSTEM' : 'CUSTOM',
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    };
  }
}
