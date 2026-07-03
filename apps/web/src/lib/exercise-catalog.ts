import { PersonalRecordMovement, movementLabels } from './athlete-profile';
export type { PersonalRecordMovement } from './athlete-profile';

export type ExercisePrBase = PersonalRecordMovement | 'NONE';
export type ExerciseCategory =
  | 'SNATCH'
  | 'CLEAN_AND_JERK'
  | 'CLEAN'
  | 'JERK'
  | 'SQUAT'
  | 'PULL'
  | 'DEADLIFT'
  | 'MOBILITY'
  | 'GENERAL_WARMUP'
  | 'ACCESSORY';

export type ExercisePrescriptionType = 'LOAD' | 'TIME' | 'TEXT';

export const exerciseCategoryLabels: Record<ExerciseCategory, string> = {
  SNATCH: 'Snatch',
  CLEAN_AND_JERK: 'Clean & Jerk',
  CLEAN: 'Clean',
  JERK: 'Jerk',
  SQUAT: 'Agachamentos',
  PULL: 'Puxadas',
  DEADLIFT: 'Deadlift',
  MOBILITY: 'Mobilidade',
  GENERAL_WARMUP: 'Aquecimento Geral',
  ACCESSORY: 'Acessórios'
};

export const exercisePrescriptionTypeLabels: Record<ExercisePrescriptionType, string> = {
  LOAD: 'Carga',
  TIME: 'Tempo',
  TEXT: 'Texto'
};

export function prBaseLabel(prBase: ExercisePrBase | null | undefined) {
  return !prBase || prBase === 'NONE' ? 'Nenhum' : movementLabels[prBase];
}
