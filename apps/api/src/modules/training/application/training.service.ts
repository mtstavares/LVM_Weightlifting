import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AuthAuditEvent,
  Exercise,
  PersonalRecordMovement,
  Prisma,
  TrainingBlockType,
  TrainingRevisionAction,
  TrainingSectionType,
  TargetPrExercise
} from '@prisma/client';
import { AuditService } from '../../../shared/application/audit.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SaveTrainingDayDto } from '../presentation/dto/save-training-day.dto';

type RequestContext = { ipAddress?: string; userAgent?: string };
type Actor = { id: string; fullName: string };
type ExerciseConfig = Pick<Exercise, 'key' | 'name' | 'category' | 'prescriptionType' | 'prBase' | 'canUpdatePersonalRecord'>;

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
    const preparedSections = await this.prepareSections(input, athlete, trainer, context);

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
            create: preparedSections.map((section, sectionIndex) => ({
              title: sectionLabels[section.type],
              type: this.legacyBlockType(section.type),
              sectionType: section.type,
              notes: section.notes?.trim() || null,
              displayOrder: sectionIndex,
              sets: {
                create: section.exercises.map((exercise, exerciseIndex) => ({
                  exerciseKey: exercise.exerciseKey,
                  exerciseName: exercise.name.trim(),
                  exerciseCategorySnapshot: exercise.exerciseCategory,
                  prescriptionTypeSnapshot: exercise.prescriptionType,
                  prBaseSnapshot: exercise.prBase,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  percentage: exercise.percentage,
                  percentageEnd: exercise.percentageEnd ?? null,
                  prescribedWeight: exercise.prescribedWeight,
                  targetPrExercise: exercise.targetPrExercise,
                  calculatedWeightSnapshot: exercise.calculatedWeightSnapshot,
                  calculatedWeightEndSnapshot: exercise.calculatedWeightEndSnapshot ?? null,
                  durationMinutes: exercise.durationMinutes ?? null,
                  notes: exercise.notes?.trim() || null,
                  prUpdateEligible: exercise.prUpdateEligible,
                  prCandidateDeclinedWeight: null,
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
    await this.recordPrescriptionAudit(trainer, athlete, saved, preparedSections, context);
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
    if (completed && !this.allSectionAttemptsMarked(section)) {
      throw new BadRequestException('All section sets must be marked as hit or missed before completing the section.');
    }
    await this.prisma.trainingBlock.update({
      where: { id: sectionId },
      data: { completedAt: completed ? new Date() : null }
    });
    return this.findDayById(trainingDayId);
  }

  async updateSetAttempt(
    userId: string,
    trainingDayId: string,
    trainingSetId: string,
    setIndex: number,
    successful: boolean
  ) {
    const { day } = await this.requireOwnDay(userId, trainingDayId);
    if (day.workoutCompletions[0]?.completed) {
      throw new BadRequestException('Completed training cannot be changed.');
    }
    if (!day.workoutCompletions[0]?.startedAt) {
      throw new BadRequestException('Training must be started before marking set attempts.');
    }
    const set = day.blocks.flatMap((block) => block.sets).find((item) => item.id === trainingSetId);
    if (!set) throw new NotFoundException('Training set not found.');
    const section = day.blocks.find((block) => block.sets.some((item) => item.id === trainingSetId));
    if (!section) throw new NotFoundException('Training section not found.');
    if (setIndex < 1 || setIndex > set.sets) {
      throw new BadRequestException('Set index is outside the prescribed range.');
    }

    await this.prisma.trainingSetAttempt.upsert({
      where: { trainingSetId_setIndex: { trainingSetId, setIndex } },
      create: { trainingSetId, setIndex, successful },
      update: { successful, completedAt: new Date() }
    });
    await this.prisma.trainingBlock.update({
      where: { id: section.id },
      data: {
        completedAt: this.allSectionAttemptsMarked(section, { trainingSetId, setIndex }) ? new Date() : null
      }
    });
    return this.findDayById(trainingDayId);
  }

  async completeDay(userId: string, trainingDayId: string, context: RequestContext) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    const populated = day.blocks.filter((block) => block.sets.length > 0);
    if (!populated.length || populated.some((block) => !block.completedAt)) {
      throw new BadRequestException('All non-empty sections must be completed.');
    }
    const incompleteSet = populated
      .flatMap((block) => block.sets)
      .some((set) => set.attempts.length < set.sets);
    if (incompleteSet) {
      throw new BadRequestException('All prescribed sets must be marked as hit or missed before completion.');
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
    await this.recordPersonalRecordCandidates(athlete, day, context);
    return this.findDayById(trainingDayId);
  }

  async confirmPersonalRecord(
    userId: string,
    trainingDayId: string,
    movement: PersonalRecordMovement,
    context: RequestContext
  ) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    if (!day.workoutCompletions[0]?.completed) {
      throw new BadRequestException('Personal record confirmation is available after training completion.');
    }
    const candidate = this.possiblePersonalRecords(day).find((item) => item.movement === movement);
    if (!candidate) {
      throw new BadRequestException('No personal record candidate found for this movement.');
    }

    const record = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.personalRecord.upsert({
        where: { athleteId_exercise: { athleteId: athlete.id, exercise: movement } },
        create: {
          athleteId: athlete.id,
          exercise: movement,
          weight: candidate.candidateWeight,
          recordDate: day.scheduledDate,
          notes: `Atualizado automaticamente após treino: ${candidate.exerciseName}.`
        },
        update: {
          weight: candidate.candidateWeight,
          recordDate: day.scheduledDate,
          notes: `Atualizado automaticamente após treino: ${candidate.exerciseName}.`
        }
      });
      await transaction.personalRecordHistory.create({
        data: {
          personalRecordId: updated.id,
          athleteId: athlete.id,
          exercise: movement,
          weight: candidate.candidateWeight,
          recordDate: day.scheduledDate,
          notes: `Atualizado automaticamente após treino: ${candidate.exerciseName}.`
        }
      });
      await transaction.trainingSet.updateMany({
        where: {
          trainingBlock: { trainingDayId },
          targetPrExercise: movement,
          prUpdateEligible: true
        },
        data: { prCandidateDeclinedWeight: null }
      });
      return updated;
    });

    await this.audit.record({
      event: 'PERSONAL_RECORD_UPDATE_CONFIRMED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} confirmou novo PR de ${candidate.label} pelo treino.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        athleteId: athlete.id,
        trainingDayId,
        personalRecordId: record.id,
        movement,
        previousWeight: candidate.currentPr,
        weight: candidate.candidateWeight,
        exerciseName: candidate.exerciseName
      }
    });
    return this.findDayById(trainingDayId);
  }

  async declinePersonalRecord(
    userId: string,
    trainingDayId: string,
    movement: PersonalRecordMovement,
    context: RequestContext
  ) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    if (!day.workoutCompletions[0]?.completed) {
      throw new BadRequestException('Personal record decision is available after training completion.');
    }
    const candidate = this.possiblePersonalRecords(day).find((item) => item.movement === movement);
    if (!candidate) {
      throw new BadRequestException('No personal record candidate found for this movement.');
    }

    await this.prisma.trainingSet.updateMany({
      where: {
        trainingBlock: { trainingDayId },
        targetPrExercise: movement,
        prUpdateEligible: true
      },
      data: { prCandidateDeclinedWeight: candidate.candidateWeight }
    });

    await this.audit.record({
      event: 'PERSONAL_RECORD_UPDATE_DECLINED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} recusou atualizar PR de ${candidate.label}.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        athleteId: athlete.id,
        trainingDayId,
        movement,
        previousWeight: candidate.currentPr,
        declinedWeight: candidate.candidateWeight,
        exerciseName: candidate.exerciseName
      }
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
    if (day.feedbacks[0]) {
      throw new BadRequestException('Feedback already submitted.');
    }
    const feedback = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.feedback.create({
        data: {
          athleteId: athlete.id,
          trainingDayId,
          rpe: input.pse,
          fatigue: input.fatigue,
          comment: input.observations?.trim() || null
        }
      });
      if (input.observations?.trim()) {
        await transaction.trainingMessage.create({
          data: {
            trainingDayId,
            senderUserId: userId,
            message: input.observations.trim()
          }
        });
      }
      return created;
    });
    await this.audit.record({
      event: 'FEEDBACK_CREATED',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} enviou o feedback do treino.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId, pse: input.pse, fatigue: input.fatigue }
    });
    return feedback;
  }

  async addAthleteMessage(
    userId: string,
    trainingDayId: string,
    message: string,
    context: RequestContext
  ) {
    const { athlete, day } = await this.requireOwnDay(userId, trainingDayId);
    if (!day.feedbacks[0]) {
      throw new BadRequestException('Initial feedback is required before session messages.');
    }
    const created = await this.createTrainingMessage(userId, trainingDayId, message);
    await this.audit.record({
      event: 'TRAINING_MESSAGE_SENT',
      userId,
      actorUserId: userId,
      affectedUserId: userId,
      description: `Atleta ${athlete.user.fullName} enviou uma mensagem sobre o treino.`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { athleteId: athlete.id, trainingDayId }
    });
    return created;
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
    const created = await this.createTrainingMessage(trainer.id, trainingDayId, comment);
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

  private createTrainingMessage(senderUserId: string, trainingDayId: string, message: string) {
    return this.prisma.trainingMessage.create({
      data: {
        trainingDayId,
        senderUserId,
        message: message.trim()
      }
    });
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
        include: {
          sets: {
            include: { attempts: { orderBy: { setIndex: 'asc' as const } } },
            orderBy: { displayOrder: 'asc' as const }
          }
        },
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
      trainingMessages: {
        include: { sender: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'asc' as const }
      },
      trainingWeek: {
        include: {
          athlete: {
            include: {
              personalRecords: true,
              user: { select: { id: true, fullName: true } }
            }
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
          exerciseKey: set.exerciseKey,
          name: set.exerciseName,
          exerciseCategory: set.exerciseCategorySnapshot,
          prescriptionType: set.prescriptionTypeSnapshot,
          prBase: set.prBaseSnapshot,
          sets: set.sets,
          reps: set.reps,
          load: set.prescribedWeight === null ? null : Number(set.prescribedWeight),
          percentage: set.percentage === null ? null : Number(set.percentage),
          percentageEnd: set.percentageEnd === null ? null : Number(set.percentageEnd),
          targetPrExercise: set.targetPrExercise,
          prBaseLabel: set.targetPrExercise ? this.movementLabel(set.targetPrExercise as PersonalRecordMovement) : null,
          calculatedWeight: set.calculatedWeightSnapshot === null ? null : Number(set.calculatedWeightSnapshot),
          calculatedWeightEnd: set.calculatedWeightEndSnapshot === null ? null : Number(set.calculatedWeightEndSnapshot),
          durationMinutes: set.durationMinutes,
          notes: set.notes,
          attempts: Array.from({ length: set.sets }, (_, index) => {
            const setIndex = index + 1;
            const attempt = set.attempts.find((item) => item.setIndex === setIndex);
            return {
              setIndex,
              successful: attempt?.successful ?? null,
              completedAt: attempt?.completedAt ?? null
            };
          })
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
      messages: day.trainingMessages.map((message) => ({
        id: message.id,
        message: message.message,
        createdAt: message.createdAt,
        sender: message.sender
      })),
      possiblePersonalRecords: completion?.completed ? this.possiblePersonalRecords(day) : [],
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
      include: { user: true, personalRecords: true }
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
      include: { user: true, personalRecords: true }
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

  private async prepareSections(
    input: SaveTrainingDayDto,
    athlete: {
      id: string;
      userId: string;
      personalRecords: { exercise: PersonalRecordMovement; weight: Prisma.Decimal | number | string }[];
    },
    trainer: Actor,
    context: RequestContext
  ) {
    return Promise.all(input.sections.map(async (section) => ({
      ...section,
      exercises: await Promise.all(section.exercises.map(async (exercise) => {
        const mode = exercise.mode ?? (exercise.percentage ? 'PERCENTAGE' : 'MANUAL');
        const exerciseConfig = await this.findExerciseForPrescription(trainer.id, exercise.exerciseKey);
        const targetPrExercise = this.toTargetPrExercise(exerciseConfig?.prBase ?? null);
        const prUpdateEligible = Boolean(exerciseConfig?.canUpdatePersonalRecord);
        const exerciseName = exerciseConfig?.name ?? exercise.name;

        if (!exerciseName?.trim()) {
          throw new BadRequestException('Exercise name is required.');
        }

        if (mode === 'TIME') {
          if (!exerciseConfig || exerciseConfig.prescriptionType !== 'TIME') {
            throw new BadRequestException('Time prescription is only allowed for mobility or general warm-up exercises.');
          }
          if (!exercise.durationMinutes || exercise.durationMinutes <= 0) {
            throw new BadRequestException('Duration is required for time prescription.');
          }
          return {
            ...exercise,
            exerciseKey: exerciseConfig.key,
            name: exerciseConfig.name,
            sets: 1,
            reps: 1,
            load: undefined,
            percentage: null,
            percentageEnd: null,
            prescribedWeight: null,
            calculatedWeightSnapshot: null,
            calculatedWeightEndSnapshot: null,
            durationMinutes: exercise.durationMinutes,
            exerciseCategory: exerciseConfig.category,
            prescriptionType: exerciseConfig.prescriptionType,
            prBase: exerciseConfig.prBase,
            targetPrExercise: null,
            prUpdateEligible: false
          };
        }

        if (mode === 'TEXT') {
          if (!exerciseConfig || exerciseConfig.prescriptionType !== 'TEXT') {
            throw new BadRequestException('Text prescription is only allowed for Core or General Accessory.');
          }
          if (!exercise.notes?.trim()) {
            throw new BadRequestException('Description is required for Core or General Accessory prescription.');
          }
          return {
            ...exercise,
            exerciseKey: exerciseConfig.key,
            name: exerciseConfig.name,
            sets: 1,
            reps: 1,
            load: undefined,
            percentage: null,
            percentageEnd: null,
            prescribedWeight: null,
            calculatedWeightSnapshot: null,
            calculatedWeightEndSnapshot: null,
            durationMinutes: null,
            notes: exercise.notes.trim(),
            exerciseCategory: exerciseConfig.category,
            prescriptionType: exerciseConfig.prescriptionType,
            prBase: exerciseConfig.prBase,
            targetPrExercise: null,
            prUpdateEligible: false
          };
        }

        if (exerciseConfig?.prescriptionType === 'TIME') {
          throw new BadRequestException('Mobility and general warm-up exercises must use time prescription.');
        }
        if (exerciseConfig?.prescriptionType === 'TEXT') {
          throw new BadRequestException('Core and General Accessory exercises must use text prescription.');
        }
        if (!exercise.sets || exercise.sets <= 0) {
          throw new BadRequestException('Sets must be greater than zero.');
        }
        if (!exercise.reps || exercise.reps <= 0) {
          throw new BadRequestException('Reps must be greater than zero.');
        }

        if (mode === 'MANUAL') {
          if (exercise.load === undefined || exercise.load === null) {
            throw new BadRequestException('Load is required for manual prescription.');
          }
          return {
            ...exercise,
            exerciseKey: exerciseConfig?.key ?? exercise.exerciseKey ?? null,
            name: exerciseName,
            percentage: null,
            percentageEnd: null,
            prescribedWeight: exercise.load,
            calculatedWeightSnapshot: null,
            calculatedWeightEndSnapshot: null,
            durationMinutes: null,
            exerciseCategory: exerciseConfig?.category ?? null,
            prescriptionType: exerciseConfig?.prescriptionType ?? null,
            prBase: exerciseConfig?.prBase ?? null,
            targetPrExercise,
            prUpdateEligible
          };
        }

        if (!exerciseConfig) {
          await this.audit.record({
            event: 'TRAINING_PERCENTAGE_WITHOUT_PR',
            userId: trainer.id,
            actorUserId: trainer.id,
            affectedUserId: athlete.userId,
            result: 'FAILURE',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            description: `Treinador ${trainer.fullName} tentou prescrever exercício não configurado por porcentagem.`,
            metadata: { athleteId: athlete.id, exerciseKey: exercise.exerciseKey, exerciseName: exercise.name }
          });
          throw new BadRequestException('Exercise must be selected from the configured catalog for percentage prescription.');
        }
        if (!exerciseConfig.prBase || !targetPrExercise) {
          await this.audit.record({
            event: 'TRAINING_PERCENTAGE_WITHOUT_PR',
            userId: trainer.id,
            actorUserId: trainer.id,
            affectedUserId: athlete.userId,
            result: 'FAILURE',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            description: `Treinador ${trainer.fullName} tentou prescrever ${exerciseConfig.name} por porcentagem sem PR base configurado.`,
            metadata: { athleteId: athlete.id, exerciseKey: exerciseConfig.key, exerciseName: exerciseConfig.name, prBase: exerciseConfig.prBase }
          });
          throw new BadRequestException(`Exercise ${exerciseConfig.name} does not have a PR base configured.`);
        }

        const record = athlete.personalRecords.find(
          (personalRecord) => personalRecord.exercise === exerciseConfig.prBase
        );
        if (!record) {
          await this.audit.record({
            event: 'TRAINING_PERCENTAGE_WITHOUT_PR',
            userId: trainer.id,
            actorUserId: trainer.id,
            affectedUserId: athlete.userId,
            result: 'FAILURE',
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            description: `Treinador ${trainer.fullName} tentou prescrever ${exerciseConfig.name} por porcentagem sem PR cadastrado.`,
            metadata: { athleteId: athlete.id, exerciseKey: exerciseConfig.key, exerciseName: exerciseConfig.name, targetPrExercise }
          });
          throw new BadRequestException(`No personal record registered for ${this.movementLabel(exerciseConfig.prBase)}.`);
        }
        if (!exercise.percentage) {
          throw new BadRequestException('Percentage is required for percentage prescription.');
        }
        if (mode === 'PERCENTAGE_RANGE' && !exercise.percentageEnd) {
          throw new BadRequestException('Final percentage is required for percentage range prescription.');
        }
        if (mode === 'PERCENTAGE_RANGE' && Number(exercise.percentageEnd) < Number(exercise.percentage)) {
          throw new BadRequestException('Final percentage must be greater than or equal to initial percentage.');
        }

        const calculatedWeight = this.roundWeight(
          (Number(record.weight) * Number(exercise.percentage)) / 100
        );
        const calculatedWeightEnd = mode === 'PERCENTAGE_RANGE'
          ? this.roundWeight((Number(record.weight) * Number(exercise.percentageEnd)) / 100)
          : null;
        return {
          ...exercise,
          exerciseKey: exerciseConfig.key,
          name: exerciseConfig.name,
          load: undefined,
          prescribedWeight: calculatedWeight,
          calculatedWeightSnapshot: calculatedWeight,
          calculatedWeightEndSnapshot: calculatedWeightEnd,
          exerciseCategory: exerciseConfig.category,
          prescriptionType: exerciseConfig.prescriptionType,
          prBase: exerciseConfig.prBase,
          targetPrExercise,
          percentage: exercise.percentage,
          percentageEnd: mode === 'PERCENTAGE_RANGE' ? exercise.percentageEnd : null,
          durationMinutes: null,
          prUpdateEligible
        };
      }))
    })));
  }

  private async recordPrescriptionAudit(
    trainer: Actor,
    athlete: { id: string; userId: string; user: { fullName: string } },
    day: { id: string; scheduledDate: Date },
    sections: Awaited<ReturnType<TrainingService['prepareSections']>>,
    context: RequestContext
  ) {
    const exercises = sections.flatMap((section) => section.exercises);
    const hasManual = exercises.some((exercise) => !exercise.percentage);
    const percentageExercises = exercises.filter((exercise) => exercise.percentage);
    const coreExercises = exercises.filter((exercise) => exercise.exerciseKey === 'CORE');
    const accessoryExercises = exercises.filter((exercise) => exercise.exerciseKey === 'GENERAL_ACCESSORY');
    if (hasManual) {
      await this.audit.record({
        event: 'TRAINING_MANUAL_PRESCRIPTION_CREATED',
        userId: trainer.id,
        actorUserId: trainer.id,
        affectedUserId: athlete.userId,
        description: `Treinador ${trainer.fullName} criou prescrição manual para ${athlete.user.fullName}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId: day.id }
      });
    }
    if (percentageExercises.length) {
      await this.audit.record({
        event: 'TRAINING_PERCENTAGE_PRESCRIPTION_CREATED',
        userId: trainer.id,
        actorUserId: trainer.id,
        affectedUserId: athlete.userId,
        description: `Treinador ${trainer.fullName} criou prescrição por porcentagem para ${athlete.user.fullName}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId: day.id, count: percentageExercises.length }
      });
      await this.audit.record({
        event: 'TRAINING_PERCENTAGE_CALCULATED',
        userId: trainer.id,
        actorUserId: trainer.id,
        affectedUserId: athlete.userId,
        description: `Sistema calculou cargas por PR para ${athlete.user.fullName}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          athleteId: athlete.id,
          trainingDayId: day.id,
          exercises: percentageExercises.map((exercise) => ({
            name: exercise.name,
            percentage: exercise.percentage,
            calculatedWeight: exercise.calculatedWeightSnapshot,
            targetPrExercise: exercise.targetPrExercise
          }))
        }
      });
    }
    if (coreExercises.length) {
      await this.audit.record({
        event: 'TRAINING_CORE_PRESCRIPTION_CREATED',
        userId: trainer.id,
        actorUserId: trainer.id,
        affectedUserId: athlete.userId,
        description: `Treinador ${trainer.fullName} prescreveu Core para ${athlete.user.fullName}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId: day.id, count: coreExercises.length }
      });
    }
    if (accessoryExercises.length) {
      await this.audit.record({
        event: 'TRAINING_ACCESSORY_PRESCRIPTION_CREATED',
        userId: trainer.id,
        actorUserId: trainer.id,
        affectedUserId: athlete.userId,
        description: `Treinador ${trainer.fullName} prescreveu Acessório Geral para ${athlete.user.fullName}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId: day.id, count: accessoryExercises.length }
      });
    }
  }

  private async recordPersonalRecordCandidates(
    athlete: {
      id: string;
      userId: string;
      user: { fullName: string };
      personalRecords: { exercise: PersonalRecordMovement; weight: Prisma.Decimal | number | string }[];
    },
    day: Awaited<ReturnType<TrainingService['rawDay']>> & {},
    context: RequestContext
  ) {
    const candidates = this.possiblePersonalRecords(day);
    for (const candidate of candidates) {
      await this.audit.record({
        event: 'PERSONAL_RECORD_CANDIDATE_IDENTIFIED',
        userId: athlete.userId,
        actorUserId: athlete.userId,
        affectedUserId: athlete.userId,
        description: `Possível novo PR identificado para ${athlete.user.fullName} em ${candidate.label}.`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { athleteId: athlete.id, trainingDayId: day.id, ...candidate }
      });
    }
  }

  private possiblePersonalRecords(day: Awaited<ReturnType<TrainingService['rawDay']>> & {}) {
    const records = new Map(
      day.trainingWeek.athlete.personalRecords.map((record) => [
        record.exercise,
        Number(record.weight)
      ])
    );
    const byMovement = new Map<PersonalRecordMovement, {
      movement: PersonalRecordMovement;
      label: string;
      currentPr: number;
      candidateWeight: number;
      exerciseName: string;
    }>();
    for (const block of day.blocks) {
      for (const set of block.sets) {
        if (!set.prUpdateEligible || !set.targetPrExercise) continue;
        if (!set.attempts.some((attempt) => attempt.successful)) continue;
        const movement = set.targetPrExercise as PersonalRecordMovement;
        const currentPr = records.get(movement);
        const candidateWeight = Number(set.calculatedWeightSnapshot ?? set.prescribedWeight ?? 0);
        if (!currentPr || candidateWeight <= currentPr) continue;
        if (set.prCandidateDeclinedWeight && candidateWeight <= Number(set.prCandidateDeclinedWeight)) continue;
        const existing = byMovement.get(movement);
        if (!existing || candidateWeight > existing.candidateWeight) {
          byMovement.set(movement, {
            movement,
            label: this.movementLabel(movement),
            currentPr,
            candidateWeight,
            exerciseName: set.exerciseName
          });
        }
      }
    }
    return [...byMovement.values()];
  }

  private async findExerciseForPrescription(trainerId: string, key: string | null | undefined): Promise<ExerciseConfig | null> {
    if (!key) return null;
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        key,
        isActive: true,
        OR: [{ isSystem: true }, { trainerId }]
      },
      select: {
        key: true,
        name: true,
        category: true,
        prescriptionType: true,
        prBase: true,
        canUpdatePersonalRecord: true
      }
    });
    return exercise;
  }

  private toTargetPrExercise(prBase: PersonalRecordMovement | null): TargetPrExercise | null {
    return prBase as TargetPrExercise | null;
  }

  private movementLabel(movement: PersonalRecordMovement) {
    return movement
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .replace('Clean Jerk', 'Clean & Jerk');
  }

  private roundWeight(value: number) {
    return Math.round(value * 100) / 100;
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

  private allSectionAttemptsMarked(
    section: {
      sets: {
        id: string;
        sets: number;
        attempts: { setIndex: number }[];
      }[];
    },
    pendingAttempt?: { trainingSetId: string; setIndex: number }
  ) {
    return section.sets.length > 0 && section.sets.every((set) =>
      Array.from({ length: set.sets }, (_, index) => index + 1).every((setIndex) =>
        set.attempts.some((attempt) => attempt.setIndex === setIndex) ||
        (pendingAttempt?.trainingSetId === set.id && pendingAttempt.setIndex === setIndex)
      )
    );
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
