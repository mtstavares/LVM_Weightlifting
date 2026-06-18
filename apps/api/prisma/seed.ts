import { PrismaClient, ExerciseCategory } from '@prisma/client';

const prisma = new PrismaClient();

const exercises: Array<{ name: string; category: ExerciseCategory }> = [
  { name: 'Snatch', category: ExerciseCategory.SNATCH },
  { name: 'Power Snatch', category: ExerciseCategory.SNATCH },
  { name: 'Hang Snatch', category: ExerciseCategory.SNATCH },
  { name: 'Block Snatch', category: ExerciseCategory.SNATCH },
  { name: 'Clean', category: ExerciseCategory.CLEAN },
  { name: 'Power Clean', category: ExerciseCategory.CLEAN },
  { name: 'Hang Clean', category: ExerciseCategory.CLEAN },
  { name: 'Block Clean', category: ExerciseCategory.CLEAN },
  { name: 'Split Jerk', category: ExerciseCategory.JERK },
  { name: 'Power Jerk', category: ExerciseCategory.JERK },
  { name: 'Push Jerk', category: ExerciseCategory.JERK },
  { name: 'Push Press', category: ExerciseCategory.JERK },
  { name: 'Front Squat', category: ExerciseCategory.SQUAT },
  { name: 'Back Squat', category: ExerciseCategory.SQUAT },
  { name: 'Overhead Squat', category: ExerciseCategory.SQUAT },
  { name: 'Snatch Pull', category: ExerciseCategory.PULL },
  { name: 'Clean Pull', category: ExerciseCategory.PULL },
  { name: 'Snatch Balance', category: ExerciseCategory.ACCESSORY },
  { name: 'Muscle Snatch', category: ExerciseCategory.ACCESSORY },
  { name: 'Muscle Clean', category: ExerciseCategory.ACCESSORY }
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: { category: exercise.category },
      create: exercise
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
