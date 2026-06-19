import { API_URL, apiRequest } from './api-client';

export type AthleteSex = 'FEMALE' | 'MALE';
export type CompetitiveLevel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'NATIONAL'
  | 'INTERNATIONAL';
export type ProfileStatus = 'PROFILE_INCOMPLETE' | 'PROFILE_COMPLETE';
export type PersonalRecordMovement =
  | 'SNATCH'
  | 'CLEAN_JERK'
  | 'BACK_SQUAT'
  | 'FRONT_SQUAT'
  | 'DEADLIFT';

export type PersonalRecord = {
  id: string;
  exercise: PersonalRecordMovement;
  weight: string;
  recordDate: string;
  notes: string | null;
  updatedAt: string;
};

export type AthleteProfile = {
  id: string;
  userId: string;
  trainerId: string;
  fullName: string;
  email: string;
  profilePhotoUrl: string | null;
  birthDate: string | null;
  age: number | null;
  sex: AthleteSex | null;
  weightCategory: string | null;
  competitiveLevel: CompetitiveLevel | null;
  gym: string | null;
  profileStatus: ProfileStatus;
  isActive: boolean;
  personalRecords: PersonalRecord[];
};

export type ProfileInput = {
  fullName: string;
  birthDate: string;
  sex: AthleteSex;
  weightCategory: string;
  competitiveLevel: CompetitiveLevel;
  gym?: string;
};

export const weightCategories: Record<AthleteSex, { value: string; olympic: boolean }[]> = {
  FEMALE: ['49', '53', '57', '61', '69', '77', '86', '+86'].map((value) => ({
    value,
    olympic: value === '49' || value === '57'
  })),
  MALE: ['60', '65', '70', '75', '85', '95', '110', '+110'].map((value) => ({
    value,
    olympic: value === '60' || value === '70'
  }))
};

export const movementLabels: Record<PersonalRecordMovement, string> = {
  SNATCH: 'Snatch',
  CLEAN_JERK: 'Clean & Jerk',
  BACK_SQUAT: 'Back Squat',
  FRONT_SQUAT: 'Front Squat',
  DEADLIFT: 'Deadlift'
};

export const levelLabels: Record<CompetitiveLevel, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  NATIONAL: 'Nacional',
  INTERNATIONAL: 'Internacional'
};

function profileForm(input: ProfileInput, photo?: File | null) {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => form.set(key, value));
  if (photo) form.set('photo', photo);
  return form;
}

export function resolveProfilePhoto(path: string | null) {
  if (!path) return null;
  if (API_URL.startsWith('http')) return new URL(path, API_URL).toString();
  return `${API_URL}${path}`;
}

export function getOwnProfile() {
  return apiRequest<AthleteProfile>('/athletes/me/profile');
}

export function completeProfile(input: ProfileInput, photo: File) {
  return apiRequest<AthleteProfile>('/athletes/me/profile/complete', {
    method: 'PUT',
    body: profileForm(input, photo)
  });
}

export function updateProfile(input: ProfileInput, photo?: File | null) {
  return apiRequest<AthleteProfile>('/athletes/me/profile', {
    method: 'PATCH',
    body: profileForm(input, photo)
  });
}

export function getTrainerAthleteProfile(athleteId: string) {
  return apiRequest<AthleteProfile>(`/athletes/${athleteId}/profile`);
}

export function listPersonalRecords() {
  return apiRequest<PersonalRecord[]>('/athletes/me/personal-records');
}

export function upsertPersonalRecord(
  movement: PersonalRecordMovement,
  input: { weight: number; recordDate: string; notes?: string }
) {
  return apiRequest<PersonalRecord>(`/athletes/me/personal-records/${movement}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}
