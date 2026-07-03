import { ExerciseCategory, ExercisePrescriptionType, PersonalRecordMovement, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const exercises: {
  key: string;
  name: string;
  category: ExerciseCategory;
  prescriptionType?: ExercisePrescriptionType;
  prBase?: PersonalRecordMovement;
  canUpdatePersonalRecord?: boolean;
}[] = [
  { key: 'SNATCH', name: 'Snatch', category: ExerciseCategory.SNATCH, prBase: 'SNATCH', canUpdatePersonalRecord: true },
  { key: 'CLEAN_JERK', name: 'Clean & Jerk', category: ExerciseCategory.CLEAN_AND_JERK, prBase: 'CLEAN_JERK', canUpdatePersonalRecord: true },
  { key: 'BACK_SQUAT', name: 'Back Squat', category: ExerciseCategory.SQUAT, prBase: 'BACK_SQUAT', canUpdatePersonalRecord: true },
  { key: 'FRONT_SQUAT', name: 'Front Squat', category: ExerciseCategory.SQUAT, prBase: 'FRONT_SQUAT', canUpdatePersonalRecord: true },
  { key: 'DEADLIFT', name: 'Deadlift', category: ExerciseCategory.DEADLIFT, prBase: 'DEADLIFT', canUpdatePersonalRecord: true },
  { key: 'MOBILITY', name: 'Mobilidade', category: ExerciseCategory.MOBILITY, prescriptionType: ExercisePrescriptionType.TIME },
  { key: 'GENERAL_WARMUP', name: 'Aquecimento Geral', category: ExerciseCategory.GENERAL_WARMUP, prescriptionType: ExercisePrescriptionType.TIME },
  { key: 'CORE', name: 'Core', category: ExerciseCategory.ACCESSORY, prescriptionType: ExercisePrescriptionType.TEXT },
  { key: 'GENERAL_ACCESSORY', name: 'Acessório geral', category: ExerciseCategory.ACCESSORY, prescriptionType: ExercisePrescriptionType.TEXT }
] as const;

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { key: exercise.key },
      update: {
        name: exercise.name,
        category: exercise.category,
        prescriptionType: exercise.prescriptionType ?? ExercisePrescriptionType.LOAD,
        prBase: exercise.prBase ?? null,
        canUpdatePersonalRecord: exercise.canUpdatePersonalRecord ?? false,
        isSystem: true,
        isActive: true
      },
      create: {
        key: exercise.key,
        name: exercise.name,
        category: exercise.category,
        prescriptionType: exercise.prescriptionType ?? ExercisePrescriptionType.LOAD,
        prBase: exercise.prBase ?? null,
        canUpdatePersonalRecord: exercise.canUpdatePersonalRecord ?? false,
        isSystem: true,
        isActive: true
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
