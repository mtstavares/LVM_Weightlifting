import { apiRequest } from './api-client';
import { ExerciseCategory, ExercisePrescriptionType, PersonalRecordMovement } from './exercise-catalog';

export type ExerciseOrigin = 'SYSTEM' | 'CUSTOM';

export type ExerciseLibraryItem = {
  id: string;
  key: string;
  name: string;
  category: ExerciseCategory;
  prescriptionType: ExercisePrescriptionType;
  prBase: PersonalRecordMovement | null;
  canUpdatePersonalRecord: boolean;
  description: string | null;
  isActive: boolean;
  origin: ExerciseOrigin;
  createdAt: string;
  updatedAt: string;
};

export type SaveExerciseInput = {
  name: string;
  category: ExerciseCategory;
  prescriptionType: ExercisePrescriptionType;
  prBase?: PersonalRecordMovement | null;
  canUpdatePersonalRecord: boolean;
  description?: string;
};

export function listExercises(filters: { search?: string; category?: string; activeOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.activeOnly === false) params.set('activeOnly', 'false');
  const query = params.toString();
  return apiRequest<ExerciseLibraryItem[]>(`/exercises${query ? `?${query}` : ''}`);
}

export function createExercise(input: SaveExerciseInput) {
  return apiRequest<ExerciseLibraryItem>('/exercises', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateExercise(exerciseId: string, input: SaveExerciseInput) {
  return apiRequest<ExerciseLibraryItem>(`/exercises/${exerciseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deactivateExercise(exerciseId: string) {
  return apiRequest<ExerciseLibraryItem>(`/exercises/${exerciseId}/deactivate`, {
    method: 'POST'
  });
}

export function duplicateExercise(exerciseId: string) {
  return apiRequest<ExerciseLibraryItem>(`/exercises/${exerciseId}/duplicate`, {
    method: 'POST'
  });
}
