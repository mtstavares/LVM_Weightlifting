export const USER_ROLES = ['TRAINER', 'ATHLETE'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TARGET_PR_EXERCISES = ['SNATCH', 'CLEAN', 'JERK', 'BACK_SQUAT', 'FRONT_SQUAT'] as const;
export type TargetPrExercise = (typeof TARGET_PR_EXERCISES)[number];

export const TRAINING_WEEK_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type TrainingWeekStatus = (typeof TRAINING_WEEK_STATUSES)[number];

export const EXERCISE_CATEGORIES = ['SNATCH', 'CLEAN', 'JERK', 'SQUAT', 'PULL', 'ACCESSORY'] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  mustChangePassword: boolean;
};
