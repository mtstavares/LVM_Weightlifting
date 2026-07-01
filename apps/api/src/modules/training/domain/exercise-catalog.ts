import { PersonalRecordMovement, TargetPrExercise } from '@prisma/client';

export type ExercisePrBase = PersonalRecordMovement | 'NONE';

export type ExerciseConfig = {
  key: string;
  name: string;
  prBase: ExercisePrBase;
  targetPrExercise: TargetPrExercise | null;
  canUpdatePersonalRecord: boolean;
};

const snatchExercises = [
  ['SNATCH', 'Snatch', true],
  ['POWER_SNATCH', 'Power Snatch', false],
  ['HANG_SNATCH', 'Hang Snatch', false],
  ['HANG_POWER_SNATCH', 'Hang Power Snatch', false],
  ['BLOCK_SNATCH', 'Block Snatch', false],
  ['BLOCK_POWER_SNATCH', 'Block Power Snatch', false],
  ['MUSCLE_SNATCH', 'Muscle Snatch', false],
  ['SNATCH_PULL', 'Snatch Pull', false],
  ['SNATCH_HIGH_PULL', 'Snatch High Pull', false],
  ['SNATCH_DEADLIFT', 'Snatch Deadlift', false],
  ['SNATCH_BALANCE', 'Snatch Balance', false],
  ['DROP_SNATCH', 'Drop Snatch', false],
  ['OVERHEAD_SQUAT', 'Overhead Squat', false]
] as const;

const cleanJerkExercises = [
  ['CLEAN_JERK', 'Clean & Jerk', true],
  ['CLEAN', 'Clean', false],
  ['POWER_CLEAN', 'Power Clean', false],
  ['HANG_CLEAN', 'Hang Clean', false],
  ['HANG_POWER_CLEAN', 'Hang Power Clean', false],
  ['BLOCK_CLEAN', 'Block Clean', false],
  ['BLOCK_POWER_CLEAN', 'Block Power Clean', false],
  ['CLEAN_PULL', 'Clean Pull', false],
  ['CLEAN_HIGH_PULL', 'Clean High Pull', false],
  ['CLEAN_DEADLIFT', 'Clean Deadlift', false],
  ['JERK', 'Jerk', false],
  ['SPLIT_JERK', 'Split Jerk', false],
  ['POWER_JERK', 'Power Jerk', false],
  ['PUSH_JERK', 'Push Jerk', false],
  ['JERK_FROM_RACK', 'Jerk from Rack', false],
  ['JERK_FROM_BLOCKS', 'Jerk from Blocks', false]
] as const;

const backSquatExercises = [
  ['BACK_SQUAT', 'Back Squat', true],
  ['PAUSE_BACK_SQUAT', 'Pause Back Squat', false],
  ['TEMPO_BACK_SQUAT', 'Tempo Back Squat', false],
  ['PIN_BACK_SQUAT', 'Pin Back Squat', false],
  ['BOX_SQUAT', 'Box Squat', false]
] as const;

const frontSquatExercises = [
  ['FRONT_SQUAT', 'Front Squat', true],
  ['PAUSE_FRONT_SQUAT', 'Pause Front Squat', false],
  ['TEMPO_FRONT_SQUAT', 'Tempo Front Squat', false],
  ['PIN_FRONT_SQUAT', 'Pin Front Squat', false]
] as const;

const deadliftExercises = [
  ['DEADLIFT', 'Deadlift', true],
  ['ROMANIAN_DEADLIFT', 'Romanian Deadlift', false],
  ['RDL', 'RDL', false],
  ['DEFICIT_DEADLIFT', 'Deficit Deadlift', false],
  ['SNATCH_GRIP_DEADLIFT', 'Snatch Grip Deadlift', false]
] as const;

const noPrExercises = [
  ['MOBILITY', 'Mobilidade'],
  ['CORE', 'Core'],
  ['GENERAL_ACCESSORY', 'Acessório geral'],
  ['TECHNICAL_DRILL', 'Técnico sem carga percentual']
] as const;

function withPrBase(
  entries: readonly (readonly [string, string, boolean])[],
  prBase: PersonalRecordMovement
): ExerciseConfig[] {
  return entries.map(([key, name, canUpdatePersonalRecord]) => ({
    key,
    name,
    prBase,
    targetPrExercise: toTargetPrExercise(prBase),
    canUpdatePersonalRecord
  }));
}

function toTargetPrExercise(prBase: PersonalRecordMovement): TargetPrExercise {
  return prBase;
}

export const exerciseCatalog: ExerciseConfig[] = [
  ...withPrBase(snatchExercises, 'SNATCH'),
  ...withPrBase(cleanJerkExercises, 'CLEAN_JERK'),
  ...withPrBase(backSquatExercises, 'BACK_SQUAT'),
  ...withPrBase(frontSquatExercises, 'FRONT_SQUAT'),
  ...withPrBase(deadliftExercises, 'DEADLIFT'),
  ...noPrExercises.map(([key, name]) => ({
    key,
    name,
    prBase: 'NONE' as const,
    targetPrExercise: null,
    canUpdatePersonalRecord: false
  }))
];

const exerciseConfigByKey = new Map(exerciseCatalog.map((exercise) => [exercise.key, exercise]));

export function getExerciseConfigByKey(key: string | null | undefined) {
  return key ? exerciseConfigByKey.get(key) ?? null : null;
}
