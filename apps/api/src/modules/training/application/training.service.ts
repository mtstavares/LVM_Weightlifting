import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AuthAuditEvent,
  Prisma,
  TrainingBlockType,
  TrainingRevisionAction,
  TrainingSectionType
} from '@prisma/client';
import { AuditService } from '../../../shared/application/audit.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SaveTrainingDayDto } from '../presentation/dto/save-training-day.dto';

type RequestContext = { ipAddress?: string; userAgent?: string };
type Actor = { id: string; fullName: string };

const sectionLabels: Record<TrainingSectionType, string> = {
  WARMUP: 'Aquecimento',
  TECHNIQUE_BALLISTIC: 'Tecnica / Balistico',
  STRENGTH: 'Forca',
  BODYBUILDING: 'Musculacao'
};

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async trainerCalendar(trainerId: string, athleteId: string, month: string, context: RequestContext) {
    const athlete = await this.requireTrainerAthlete(trainerId, athleteId, context);
    return this.calendar(athlete.id, month);
  }

  async athleteCalendar(userId: string, month: string) {
    const athlete = await this.requireAthleteUser(userId);
    return this.calendar(athlete.id, month);
  }

  async trainerDay(trainerId: string, athleteId: string, date: string, context: RequestContext) {
    const athlete = await this.requireTrainerAthlete(trainerId, athleteId, context);
    return this.findDay(athlete.id, date);
  }

  async athleteDay(userId: string, date: string) {
    const athlete = await this.requireAthleteUser(userId);
    return this.findDay(athlete.id, date);
  }

  async saveDay(
    trainer: Actor,
    athleteId: string,
    date: string,
    input: SaveTrainingDayDto,
    context: RequestContext
  ) {
    const athlete = await this.requireTrainerAthlete(trainer.id, athleteId, context);
    const scheduledDate = this.parseDate(date);
    this.assertAllowedDate(scheduledDate);
    if (new Set(input.sections.map((section) => section.type)).size !== input.sections.length) {
      throw new BadRequestException('Training sections cannot be duplicated.');
    }

    const existing = await this.rawDay(athlete.id, date);
    if (existing?.workoutCompletions.some((completion) => completion.completed)) {
      throw new BadRequestException('Completed training cannot be edited.');
    }

    const saved = await this.prisma.$transaction(async (transaction) => {
      const week = await this.findOrCreateWeek(transaction, athlete.id, scheduledDate);
      let day = existing;
      if (!day) {
        day = await transaction.trainingDay.create({
          data: {
            trainingWeekId: week.id,
            scheduledDate,
            weekday: this.isoWeekday(scheduledDate),
            title: input.title?.trim() || null,
            notes: input.notes?.trim() || null
          },
          include: this.dayInclude()
        });
      } else {
        await transaction.trainingRevision.create({
          data: {
            trainingDayId: day.id,
            changedById: trainer.id,
            version: day.version,
            action: TrainingRevisionAction.UPDATED,
            snapshot: this.snapshot(day)
          }
        });
        await transaction.complexMovement.deleteMany({
          where: { trainingBlock: { trainingDayId: day.id } }
        });
        await transaction.trainingSet.deleteMany({
          where: { trainingBlock: { trainingDayId: day.id } }
        });
        await transaction.trainingBlock.deleteMany({ where: { trainingDayId: day.id } });
      }

      const version = existing ? existing.version + 1 : 1;
      const updated = await transaction.trainingDay.update({
        where: { id: day.id },
        data: {
          trainingWeekId: week.id,
          scheduledDate,
          weekday: this.isoWeekday(scheduledDate),
          title: input.title?.trim() || null,
          notes: input.notes?.trim() || null,
          deletedAt: null,
          version,
          blocks: {
            create: input.sections.map((section, sectionIndex) => ({
              title: sectionLabels[section.type],
              type: this.legacyBlockType(section.type),
              sectionType: section.type,
              notes: section.notes?.trim() || null,
              displayOrder: sectionIndex,
              sets: {
                create: section.exercises.map((exercise, exerciseIndex) => ({
                  exerciseName: exercise.name.trim(),
                  sets: exercise.sets,
                  reps: exercise.reps,
                  prescribedWeight: exercise.load,
                  restSeconds: exercise.restSeconds,
                  displayOrder: exerciseIndex
                }))
              }
            }))
          }
        },
        include: this.dayInclude()
      });

      if (!existing) {
        await transaction.trainingRevision.create({
          data: {
            trainingDayId: updated.id,
            changedById: trainer.id,
            version,
            action: TrainingRevisionAction.CREATED,
            snapshot: this.snapshot(updated)
          }
        });
      }
      return updated;
    });

    await this.recordTrainingEvent(existing ? 'TRAINING_UPDATED' : 'TRAINING_CREATED', trainer, athlete, saved, context);
    return this.presentDay(saved);
  }

  async deleteDay(
    trainer: Actor,
    athleteId: string,
    date: string,
    context: RequestContext
  ) {
    const athlete = await this.requireTrainerAthlete(trainer.id, athleteId, context);
    const day = await this.rawDay(athlete.id, date);
    if (!day) throw new NotFoundException('Training not found.');
    if (day.workoutCompletions.some((completion) => completion.completed)) {
      throw new BadRequestException('Completed training cannot be deleted.');
    }
    await this.prisma.$transaction([
      this.prisma.trainingRevision.create({
        data: {
          trainingDayId: day.id,
          changedById: trainer.id,
          version: day.version,
          action: TrainingRevisionAction.DELETED,
          snapshot: this.snapshot(day)
        }
      }),
      this.prisma.trainingDay.update({
        where: { id: day.id },
        data: { deletedAt: new Date(), version: { increment: 1 } }
      })
    ]);
    await this.recordTrainingEvent('TRAINING_DELETED', trainer, athlete, day, context);
  }

  async startDay(userId: string, trainingDayId: string, context: RequestContext) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    if (day.scheduledDate > this.startOfToday()) {
      throw new BadRequestException('Future training cannot be started.');
    }
    const current = day.workoutCompletions[0];
    const completion = await this.prisma.workoutCompletion.upsert({
      where: { athleteId_trainingDayId: { athleteId: athlete.id, trainingDayId } },
      create: { athleteId: athlete.id, trainingDayId, startedAt: new Date() },
      update: { startedAt: current?.startedAt ?? new Date() }
    });
    if (!current?.startedAt) {
      await this.audit.record({
        event: 'TRAINING_STARTED',
        userId,
        actorUserId: userId,
        affectedUserId: userId,
        description: `Atleta ${athlete.user.fullName} iniciou o treino de ${this.formatDate(day.scheduledDate)}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId }
      });
    }
    return completion;
  }

  async updateSection(
    userId: string,
    trainingDayId: string,
    sectionId: string,
    completed: boolean
  ) {
    const { day } = await this.requireOwnDay(userId, trainingDayId);
    if (day.workoutCompletions[0]?.completed) {
      throw new BadRequestException('Completed training cannot be changed.');
    }
    const section = day.blocks.find((block) => block.id === sectionId);
    if (!section) throw new NotFoundException('Training section not found.');
    if (!section.sets.length) throw new BadRequestException('Empty section does not affect progress.');
    await this.prisma.trainingBlock.update({
      where: { id: sectionId },
      data: { completedAt: completed ? new Date() : null }
    });
    return this.findDayById(trainingDayId);
  }

  async completeDay(userId: string, trainingDayId: string, context: RequestContext) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    const populated = day.blocks.filter((block) => block.sets.length > 0);
    if (!populated.length || populated.some((block) => !block.completedAt)) {
      throw new BadRequestException('All non-empty sections must be completed.');
    }
    const now = new Date();
    const startedAt = day.workoutCompletions[0]?.startedAt ?? now;
    await this.prisma.workoutCompletion.upsert({
      where: { athleteId_trainingDayId: { athleteId: athlete.id, trainingDayId } },
      create: {
        athleteId: athlete.id,
        trainingDayId,
        startedAt,
        finishedAt: now,
        completed: true,
        durationMinutes: Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60_000))
      },
      update: {
        finishedAt: now,
        completed: true,
        durationMinutes: Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60_000))
      }
    });
    await this.audit.record({
      event: 'TRAINING_COMPLETED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} concluiu o treino de ${this.formatDate(day.scheduledDate)}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId }
    });
    return this.findDayById(trainingDayId);
  }

  async saveFeedback(
    userId: string,
    trainingDayId: string,
    input: { pse: number; fatigue: number; observations?: string },
    context: RequestContext
  ) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    if (!day.workoutCompletions[0]?.completed) {
      throw new BadRequestException('Feedback is available after training completion.');
    }
    const existing = day.feedbacks[0];
    const feedback = await this.prisma.feedback.upsert({
      where: { athleteId_trainingDayId: { athleteId: athlete.id, trainingDayId } },
      create: {
        athleteId: athlete.id,
        trainingDayId,
        rpe: input.pse,
        fatigue: input.fatigue,
        comment: input.observations?.trim() || null
      },
      update: {
        rpe: input.pse,
        fatigue: input.fatigue,
        comment: input.observations?.trim() || null
      }
    });
    await this.audit.record({
      event: existing ? 'FEEDBACK_UPDATED' : 'FEEDBACK_CREATED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} ${existing ? 'atualizou' : 'enviou'} o feedback do treino.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId, pse: input.pse, fatigue: input.fatigue }
    });
    return feedback;
  }

  async addCoachComment(
    trainer: Actor,
    trainingDayId: string,
    comment: string,
    context: RequestContext
  ) {
    const day = await this.prisma.trainingDay.findUnique({
      where: { id: trainingDayId },
      include: {
        trainingWeek: { include: { athlete: { include: { user: true } } } },
        feedbacks: true
      }
    });
    if (!day) throw new NotFoundException('Training not found.');
    const athlete = day.trainingWeek.athlete;
    if (athlete.coachId !== trainer.id) {
      await this.denied(trainer.id, athlete.userId, context, { trainingDayId });
    }
    const feedback = day.feedbacks[0];
    if (!feedback) throw new BadRequestException('Athlete feedback is required before commenting.');
    const created = await this.prisma.coachComment.create({
      data: { coachId: trainer.id, feedbackId: feedback.id, comment: comment.trim() }
    });
    await this.audit.record({
      event: 'COACH_COMMENT_ADDED',
      userId: trainer.id,
      actorUserId: trainer.id,
      affectedUserId: athlete.userId,
      description: `Treinador ${trainer.fullName} comentou o treino de ${athlete.user.fullName}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId }
    });
    return created;
  }

  private async calendar(athleteId: string, month: string) {
    const { start, end } = this.monthRange(month);
    const days = await this.prisma.trainingDay.findMany({
      where: {
        trainingWeek: { athleteId },
        scheduledDate: { gte: start, lte: end },
        deletedAt: null
      },
      include: {
        blocks: { include: { sets: true } },
        workoutCompletions: { where: { athleteId } }
      },
      orderBy: { scheduledDate: 'asc' }
    });
    return {
      month,
      days: days.map((day) => ({
        id: day.id,
        date: this.dateKey(day.scheduledDate),
        title: day.title,
        status: this.status(day.scheduledDate, day.workoutCompletions[0]?.completed),
        progress: this.progress(day.blocks),
        completedAt: day.workoutCompletions[0]?.finishedAt ?? null
      }))
    };
  }

  private async findDay(athleteId: string, date: string) {
    const day = await this.rawDay(athleteId, date);
    if (!day) return null;
    return this.presentDay(day);
  }

  private async findDayById(id: string) {
    const day = await this.prisma.trainingDay.findUnique({
      where: { id },
      include: this.dayInclude()
    });
    if (!day || day.deletedAt) throw new NotFoundException('Training not found.');
    return this.presentDay(day);
  }

  private async rawDay(athleteId: string, date: string) {
    return this.prisma.trainingDay.findFirst({
      where: {
        trainingWeek: { athleteId },
        scheduledDate: this.parseDate(date),
        deletedAt: null
      },
      include: this.dayInclude()
    });
  }

  private dayInclude() {
    return {
      blocks: {
        include: { sets: { orderBy: { displayOrder: 'asc' as const } } },
        orderBy: { displayOrder: 'asc' as const }
      },
      workoutCompletions: true,
      feedbacks: {
        include: {
          coachComments: {
            include: { coach: { select: { id: true, fullName: true } } },
            orderBy: { createdAt: 'asc' as const }
          }
        }
      },
      revisions: {
        include: { changedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' as const }
      }
    };
  }

  private presentDay(day: Awaited<ReturnType<TrainingService['rawDay']>> & {}) {
    if (!day) return null;
    const completion = day.workoutCompletions[0];
    return {
      id: day.id,
      date: this.dateKey(day.scheduledDate),
      title: day.title,
      notes: day.notes,
      status: this.status(day.scheduledDate, completion?.completed),
      progress: this.progress(day.blocks),
      startedAt: completion?.startedAt ?? null,
      completedAt: completion?.finishedAt ?? null,
      sections: day.blocks.map((block) => ({
        id: block.id,
        type: block.sectionType,
        label: sectionLabels[block.sectionType],
        notes: block.notes,
        completed: Boolean(block.completedAt),
        completedAt: block.completedAt,
        exercises: block.sets.map((set) => ({
          id: set.id,
          name: set.exerciseName,
          sets: set.sets,
          reps: set.reps,
          load: set.prescribedWeight === null ? null : Number(set.prescribedWeight),
          restSeconds: set.restSeconds
        }))
      })),
      feedback: day.feedbacks[0]
        ? {
            id: day.feedbacks[0].id,
            pse: day.feedbacks[0].rpe,
            fatigue: day.feedbacks[0].fatigue,
            observations: day.feedbacks[0].comment,
            createdAt: day.feedbacks[0].createdAt,
            updatedAt: day.feedbacks[0].updatedAt,
            comments: day.feedbacks[0].coachComments.map((comment) => ({
              id: comment.id,
              comment: comment.comment,
              createdAt: comment.createdAt,
              coach: comment.coach
            }))
          }
        : null,
      history: day.revisions.map((revision) => ({
        id: revision.id,
        version: revision.version,
        action: revision.action,
        changedBy: revision.changedBy,
        createdAt: revision.createdAt
      }))
    };
  }

  private async requireTrainerAthlete(trainerId: string, athleteId: string, context: RequestContext) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: athleteId },
      include: { user: true }
    });
    if (!athlete) throw new NotFoundException('Athlete not found.');
    if (athlete.coachId !== trainerId) {
      await this.denied(trainerId, athlete.userId, context, { athleteId });
    }
    return athlete;
  }

  private async requireAthleteUser(userId: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!athlete) throw new NotFoundException('Athlete not found.');
    return athlete;
  }

  private async requireOwnDay(userId: string, trainingDayId: string) {
    const athlete = await this.requireAthleteUser(userId);
    const day = await this.prisma.trainingDay.findFirst({
      where: { id: trainingDayId, trainingWeek: { athleteId: athlete.id }, deletedAt: null },
      include: this.dayInclude()
    });
    if (!day) {
      await this.denied(userId, userId, {}, { trainingDayId });
    }
    return { athlete, day: day! };
  }

  private async denied(
    actorUserId: string,
    affectedUserId: string,
    context: RequestContext,
    metadata: Prisma.InputJsonObject
  ): Promise<never> {
    await this.audit.record({
      event: 'ACCESS_DENIED',
      userId: actorUserId,
      actorUserId,
      affectedUserId,
      result: 'FAILURE',
      description: 'Tentativa de acesso indevido a um treino.',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata
    });
    throw new ForbiddenException('Training does not belong to authenticated user.');
  }

  private async findOrCreateWeek(
    transaction: Prisma.TransactionClient,
    athleteId: string,
    date: Date
  ) {
    const startDate = new Date(date);
    startDate.setUTCDate(date.getUTCDate() - (this.isoWeekday(date) - 1));
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    const existing = await transaction.trainingWeek.findFirst({
      where: { athleteId, startDate }
    });
    if (existing) return existing;
    return transaction.trainingWeek.create({
      data: {
        athleteId,
        weekNumber: this.isoWeekNumber(date),
        startDate,
        endDate,
        status: 'PUBLISHED'
      }
    });
  }

  private snapshot(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private progress(blocks: { completedAt: Date | null; sets: unknown[] }[]) {
    const populated = blocks.filter((block) => block.sets.length > 0);
    if (!populated.length) return 0;
    return Math.round((populated.filter((block) => block.completedAt).length / populated.length) * 100);
  }

  private status(date: Date, completed?: boolean) {
    if (completed) return 'COMPLETED';
    const today = this.startOfToday();
    if (date > today) return 'SCHEDULED';
    if (date.getTime() === today.getTime()) return 'AVAILABLE';
    return 'MISSED';
  }

  private monthRange(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Month must use YYYY-MM.');
    const start = new Date(`${month}-01T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid month.');
    const current = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const minimum = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 12, 1));
    const maximum = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
    if (start < minimum || start > maximum) {
      throw new BadRequestException('Month is outside the allowed calendar range.');
    }
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return { start, end };
  }

  private assertAllowedDate(date: Date) {
    this.monthRange(this.dateKey(date).slice(0, 7));
  }

  private parseDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Date must use YYYY-MM-DD.');
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || this.dateKey(parsed) !== date) {
      throw new BadRequestException('Invalid date.');
    }
    return parsed;
  }

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private isoWeekday(date: Date) {
    return date.getUTCDay() || 7;
  }

  private isoWeekNumber(date: Date) {
    const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    return Math.ceil(((value.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }

  private legacyBlockType(section: TrainingSectionType): TrainingBlockType {
    if (section === 'TECHNIQUE_BALLISTIC') return 'COMPLEX';
    if (section === 'STRENGTH') return 'STRENGTH';
    if (section === 'BODYBUILDING') return 'ACCESSORY';
    return 'STANDARD';
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
  }

  private async recordTrainingEvent(
    event: Extract<AuthAuditEvent, 'TRAINING_CREATED' | 'TRAINING_UPDATED' | 'TRAINING_DELETED'>,
    trainer: Actor,
    athlete: { id: string; userId: string; user: { fullName: string } },
    day: { id: string; scheduledDate: Date },
    context: RequestContext
  ) {
    const action = event === 'TRAINING_CREATED' ? 'criou' : event === 'TRAINING_UPDATED' ? 'alterou' : 'excluiu';
    await this.audit.record({
      event,
      userId: trainer.id,
      actorUserId: trainer.id,
      affectedUserId: athlete.userId,
      description: `Treinador ${trainer.fullName} ${action} o treino de ${athlete.user.fullName} em ${this.formatDate(day.scheduledDate)}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId: day.id }
    });
  }
}
