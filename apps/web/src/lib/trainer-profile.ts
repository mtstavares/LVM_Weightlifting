import { API_URL, apiRequest } from './api-client';

export type TrainerProfile = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  profilePhotoUrl: string | null;
  birthDate: string | null;
  age: number | null;
  gym: string | null;
  bio: string | null;
};

export type TrainerProfileInput = {
  fullName: string;
  birthDate?: string;
  gym?: string;
  bio?: string;
};

export type TrainerPublication = {
  id: string;
  trainerId: string;
  senderName: string;
  type: 'ALERTA' | 'MENSAGEM_TREINADOR' | 'AVISO_GERAL';
  message: string;
  createdAt: string;
};

function profileForm(input: TrainerProfileInput, photo?: File | null) {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value) form.set(key, value);
  });
  if (photo) form.set('photo', photo);
  return form;
}

export function resolveTrainerPhoto(path: string | null) {
  if (!path) return null;
  if (API_URL.startsWith('http')) return new URL(path, API_URL).toString();
  return `${API_URL}${path}`;
}

export function getTrainerProfile() {
  return apiRequest<TrainerProfile>('/trainers/me/profile');
}

export function updateTrainerProfile(input: TrainerProfileInput, photo?: File | null) {
  return apiRequest<TrainerProfile>('/trainers/me/profile', {
    method: 'PATCH',
    body: profileForm(input, photo)
  });
}

export function getTrainerFeed() {
  return apiRequest<{ trainerId: string; publications: TrainerPublication[] }>(
    '/trainers/me/feed'
  );
}
