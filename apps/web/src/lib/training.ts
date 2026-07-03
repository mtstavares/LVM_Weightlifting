import { apiRequest } from './api-client';

export type TrainingStatus = 'SCHEDULED' | 'AVAILABLE' | 'COMPLETED' | 'MISSED';
export type TrainingSectionType =
  | 'WARMUP'
  | 'TECHNIQUE_BALLISTIC'
  | 'STRENGTH'
  | 'BODYBUILDING';

export type TrainingExercise = {
  id?: string;
  exerciseKey: string | null;
  name: string;
  exerciseCategory: string | null;
  prescriptionType: string | null;
  prBase: string | null;
  sets: number;
  reps: number;
  load: number | null;
  percentage: number | null;
  percentageEnd: number | null;
  targetPrExercise: string | null;
  prBaseLabel: string | null;
  calculatedWeight: number | null;
  calculatedWeightEnd: number | null;
  durationMinutes: number | null;
  notes: string | null;
  attempts: {
    setIndex: number;
    successful: boolean | null;
    completedAt: string | null;
  }[];
};

export type TrainingSection = {
  id: string;
  type: TrainingSectionType;
  label: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  exercises: TrainingExercise[];
};

export type TrainingDay = {
  id: string;
  date: string;
  title: string | null;
  notes: string | null;
  status: TrainingStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  sections: TrainingSection[];
  feedback: {
    id: string;
    pse: number;
    fatigue: number;
    observations: string | null;
    createdAt: string;
    updatedAt: string;
    comments: {
      id: string;
      comment: string;
      createdAt: string;
      coach: { id: string; fullName: string };
    }[];
  } | null;
  messages: {
    id: string;
    message: string;
    createdAt: string;
    sender: { id: string; fullName: string; role: 'TRAINER' | 'ATHLETE' };
  }[];
  possiblePersonalRecords: {
    movement: string;
    label: string;
    currentPr: number;
    candidateWeight: number;
    exerciseName: string;
  }[];
  history: {
    id: string;
    version: number;
    action: 'CREATED' | 'UPDATED' | 'DELETED';
    changedBy: { id: string; fullName: string; role: string };
    createdAt: string;
  }[];
};

export type CalendarDay = {
  id: string;
  date: string;
  title: string | null;
  status: TrainingStatus;
  progress: number;
  completedAt: string | null;
};

export type TrainingCalendar = { month: string; days: CalendarDay[] };

export type SaveTrainingDay = {
  title?: string;
  notes?: string;
  sections: {
    type: TrainingSectionType;
    notes?: string;
    exercises: {
      exerciseKey?: string;
      name: string;
      sets: number;
      reps: number;
      mode?: 'MANUAL' | 'PERCENTAGE' | 'PERCENTAGE_RANGE' | 'TIME' | 'TEXT';
      load?: number;
      percentage?: number;
      percentageEnd?: number;
      durationMinutes?: number;
      notes?: string;
    }[];
  }[];
};

export function trainerCalendar(athleteId: string, month: string) {
  return apiRequest<TrainingCalendar>(
    `/training/trainer/athletes/${athleteId}/calendar?month=${month}`
  );
}

export function athleteCalendar(month: string) {
  return apiRequest<TrainingCalendar>(`/training/athlete/calendar?month=${month}`);
}

export function getTrainerTrainingDay(athleteId: string, date: string) {
  return apiRequest<TrainingDay | null>(
    `/training/trainer/athletes/${athleteId}/days/${date}`
  );
}

export function getAthleteTrainingDay(date: string) {
  return apiRequest<TrainingDay | null>(`/training/athlete/days/${date}`);
}

export function saveTrainerTrainingDay(
  athleteId: string,
  date: string,
  input: SaveTrainingDay
) {
  return apiRequest<TrainingDay>(
    `/training/trainer/athletes/${athleteId}/days/${date}`,
    { method: 'PUT', body: JSON.stringify(input) }
  );
}

export function deleteTrainerTrainingDay(athleteId: string, date: string) {
  return apiRequest<void>(`/training/trainer/athletes/${athleteId}/days/${date}`, {
    method: 'DELETE'
  });
}

export function startTraining(trainingDayId: string) {
  return apiRequest(`/training/athlete/days/${trainingDayId}/start`, { method: 'POST' });
}

export function updateTrainingSection(
  trainingDayId: string,
  sectionId: string,
  completed: boolean
) {
  return apiRequest<TrainingDay>(
    `/training/athlete/days/${trainingDayId}/sections/${sectionId}`,
    { method: 'PATCH', body: JSON.stringify({ completed }) }
  );
}

export function updateTrainingSetAttempt(
  trainingDayId: string,
  trainingSetId: string,
  setIndex: number,
  successful: boolean
) {
  return apiRequest<TrainingDay>(
    `/training/athlete/days/${trainingDayId}/sets/${trainingSetId}/attempts/${setIndex}`,
    { method: 'PATCH', body: JSON.stringify({ successful }) }
  );
}

export function completeTraining(trainingDayId: string) {
  return apiRequest<TrainingDay>(`/training/athlete/days/${trainingDayId}/complete`, {
    method: 'POST'
  });
}

export function confirmTrainingPersonalRecord(trainingDayId: string, movement: string) {
  return apiRequest<TrainingDay>(
    `/training/athlete/days/${trainingDayId}/personal-records/${movement}/confirm`,
    { method: 'POST' }
  );
}

export function declineTrainingPersonalRecord(trainingDayId: string, movement: string) {
  return apiRequest<TrainingDay>(
    `/training/athlete/days/${trainingDayId}/personal-records/${movement}/decline`,
    { method: 'POST' }
  );
}

export function saveTrainingFeedback(
  trainingDayId: string,
  input: { pse: number; fatigue: number; observations?: string }
) {
  return apiRequest(`/training/athlete/days/${trainingDayId}/feedback`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export function sendAthleteTrainingMessage(trainingDayId: string, message: string) {
  return apiRequest(`/training/athlete/days/${trainingDayId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

export function addTrainingComment(trainingDayId: string, comment: string) {
  return apiRequest(`/training/trainer/days/${trainingDayId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment })
  });
}
