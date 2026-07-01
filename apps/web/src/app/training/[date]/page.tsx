'use client';

import { ArrowLeft, CheckCircle2, Dumbbell } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrainingDay,
  TrainingExercise,
  TrainingSection,
  completeTraining,
  confirmTrainingPersonalRecord,
  getAthleteTrainingDay,
  saveTrainingFeedback,
  sendAthleteTrainingMessage,
  startTraining,
  updateTrainingSetAttempt
} from '../../../lib/training';

export default function AthleteTrainingPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<TrainingDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pse, setPse] = useState(5);
  const [fatigue, setFatigue] = useState(5);
  const [observations, setObservations] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');

  async function reload() {
    const loaded = await getAthleteTrainingDay(date);
    setDay(loaded);
    if (!loaded?.feedback) return;
    setPse(loaded.feedback.pse);
    setFatigue(loaded.feedback.fatigue);
    setObservations('');
  }

  useEffect(() => {
    void reload()
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Treino indisponível.'))
      .finally(() => setLoading(false));
  }, [date]);

  async function action(run: () => Promise<unknown>, success: string) {
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await run();
      await reload();
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir a ação.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </main>
    );
  }

  if (!day) {
    return (
      <main className="mx-auto max-w-3xl p-5">
        <p>Treino não encontrado.</p>
        <button className="mt-3 text-primary" onClick={() => router.push('/dashboard')} type="button">
          Voltar
        </button>
      </main>
    );
  }

  const completed = day.status === 'COMPLETED';
  const future = day.status === 'SCHEDULED';
  const allAttemptsMarked = day.sections
    .flatMap((section) => section.exercises)
    .every((exercise) => exercise.attempts.every((attempt) => attempt.successful !== null));

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 font-semibold">
          <Dumbbell className="mr-2 text-primary" size={20} />LVM Weightlifting
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-5 p-4">
        <button className="flex items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push('/dashboard')} type="button">
          <ArrowLeft size={17} />Voltar
        </button>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Treino do dia</p>
          <h1 className="mt-1 text-2xl font-semibold">{day.title ?? 'Sessão de treino'}</h1>
          <p className="mt-1 text-sm text-muted">{new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR')}</p>
          {day.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-muted">{day.notes}</p>}
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${day.progress}%` }} />
          </div>
          <p className="mt-2 text-sm font-medium text-muted">{day.progress}% concluído</p>
        </article>

        {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p>}

        {!day.startedAt && !completed && (
          <button
            className="btn-primary w-full"
            disabled={future || working}
            onClick={() => action(() => startTraining(day.id), 'Treino iniciado.')}
            type="button"
          >
            {future ? 'Disponível na data agendada' : 'Iniciar treino'}
          </button>
        )}

        {day.possiblePersonalRecords.length > 0 && (
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-800">Possível novo PR</h2>
            <div className="mt-3 space-y-3">
              {day.possiblePersonalRecords.map((record) => (
                <div className="rounded-lg bg-white p-3 text-sm" key={record.movement}>
                  <p className="font-medium">Novo PR batido em {record.label}!</p>
                  <p className="text-muted">{record.exerciseName}: {record.candidateWeight} kg. PR atual: {record.currentPr} kg.</p>
                  <button
                    className="mt-2 text-sm font-semibold text-primary"
                    disabled={working}
                    onClick={() => action(() => confirmTrainingPersonalRecord(day.id, record.movement), 'PR atualizado com sucesso.')}
                    type="button"
                  >
                    Atualizar meu PR
                  </button>
                </div>
              ))}
            </div>
          </article>
        )}

        <div className="space-y-4">
          {day.sections.map((section) => {
            const ready = sectionAttemptsMarked(section);
            const selected = section.completed || ready;
            return (
              <article className="rounded-2xl border border-border bg-white p-5" key={section.id}>
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{section.label}</span>
                    {section.notes && <span className="mt-1 block text-sm text-muted">{section.notes}</span>}
                    {section.exercises.length > 0 && !selected && (
                      <span className="mt-1 block text-xs text-muted">Responda todas as séries para concluir este bloco.</span>
                    )}
                  </span>
                  <input
                    checked={selected}
                    className="h-5 w-5"
                    disabled
                    readOnly
                    title="O bloco é concluído automaticamente após responder todas as séries."
                    type="checkbox"
                  />
                </label>

                <div className="mt-4 space-y-3">
                  {section.exercises.length === 0 && <p className="text-sm text-muted">Sem exercícios nesta seção.</p>}
                  {section.exercises.map((exercise) => (
                    <ExerciseCard
                      completed={completed}
                      day={day}
                      exercise={exercise}
                      key={exercise.id ?? `${section.id}-${exercise.name}`}
                      onAttempt={(setIndex, successful) => action(
                        () => updateTrainingSetAttempt(day.id, exercise.id ?? '', setIndex, successful),
                        'Série atualizada.'
                      )}
                      started={Boolean(day.startedAt)}
                      working={working}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {!completed && day.startedAt && (
          <button
            className="btn-primary flex w-full items-center justify-center gap-2"
            disabled={day.progress !== 100 || !allAttemptsMarked || working}
            onClick={() => action(() => completeTraining(day.id), 'Treino concluído.')}
            type="button"
          >
            <CheckCircle2 size={18} />Finalizar treino
          </button>
        )}
        {!completed && day.startedAt && !allAttemptsMarked && (
          <p className="text-center text-xs text-muted">Marque cada série como acertou ou errou antes de finalizar.</p>
        )}

        {completed && (
          <article className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-lg font-semibold">Feedback do treino</h2>
            {day.feedback ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p>PSE: {day.feedback.pse}/10 · Fadiga: {day.feedback.fatigue}/10</p>
                {day.feedback.observations && <p className="mt-2 text-muted">{day.feedback.observations}</p>}
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={(event) => {
                event.preventDefault();
                void action(() => saveTrainingFeedback(day.id, { pse, fatigue, observations }), 'Feedback enviado.');
              }}>
                <label className="block text-sm font-medium">PSE ({pse})<input className="w-full" max={10} min={1} onChange={(event) => setPse(Number(event.target.value))} type="range" value={pse} /></label>
                <label className="block text-sm font-medium">Fadiga ({fatigue})<input className="w-full" max={10} min={1} onChange={(event) => setFatigue(Number(event.target.value))} type="range" value={fatigue} /></label>
                <textarea className="min-h-24 w-full rounded-md border border-border p-3 text-sm" onChange={(event) => setObservations(event.target.value)} placeholder="Observações" value={observations} />
                <button className="btn-primary" disabled={working} type="submit">Enviar feedback</button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              <h3 className="font-semibold">Mensagens da sessão</h3>
              {day.messages.length === 0 && <p className="text-sm text-muted">Nenhuma mensagem nesta sessão.</p>}
              {day.messages.map((item) => (
                <div className="rounded-lg bg-slate-50 p-3 text-sm" key={item.id}>
                  <p className="font-medium">{item.sender.fullName}</p>
                  <p className="mt-1 text-muted">{item.message}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              <form className="space-y-2" onSubmit={(event) => {
                event.preventDefault();
                const text = sessionMessage.trim();
                if (!text) return;
                void action(async () => {
                  await sendAthleteTrainingMessage(day.id, text);
                  setSessionMessage('');
                }, 'Mensagem enviada.');
              }}>
                <textarea className="min-h-20 w-full rounded-md border border-border p-3 text-sm" onChange={(event) => setSessionMessage(event.target.value)} placeholder="Responder ao treinador" value={sessionMessage} />
                <button className="btn-secondary" disabled={working || !sessionMessage.trim()} type="submit">Enviar mensagem</button>
              </form>
            </div>
          </article>
        )}

        {day.history.length > 0 && (
          <article className="rounded-2xl border border-border bg-white p-5">
            <h2 className="font-semibold">Histórico da prescrição</h2>
            <div className="mt-3 space-y-2 text-sm text-muted">
              {day.history.map((item) => (
                <p key={item.id}>Versão {item.version} · {item.action} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
              ))}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function sectionAttemptsMarked(section: TrainingSection) {
  return section.exercises.length > 0 && section.exercises.every((exercise) =>
    exercise.attempts.length > 0 && exercise.attempts.every((attempt) => attempt.successful !== null)
  );
}

function ExerciseCard({ completed, day, exercise, onAttempt, started, working }: {
  completed: boolean;
  day: TrainingDay;
  exercise: TrainingExercise;
  onAttempt: (setIndex: number, successful: boolean) => void;
  started: boolean;
  working: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-medium">{exercise.name}</p>
      <p className="text-muted">
        {exercise.sets} séries × {exercise.reps} reps
        {exercise.percentage ? ` · ${exercise.percentage}%${exercise.prBaseLabel ? ` do ${exercise.prBaseLabel}` : ''}` : ''}
        {exercise.calculatedWeight ? ` · ${exercise.calculatedWeight} kg` : ''}
        {exercise.load ? ` · ${exercise.load} kg` : ''}
      </p>
      {exercise.attempts.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted">Execução por série</p>
          {exercise.attempts.map((attempt) => (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white p-2" key={attempt.setIndex}>
              <span className="font-medium">Série {attempt.setIndex}</span>
              <div className="flex gap-2">
                <button
                  aria-label={`Marcar série ${attempt.setIndex} de ${exercise.name} como acertada`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.successful === true ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  disabled={!started || completed || working || day.status !== 'AVAILABLE'}
                  onClick={() => onAttempt(attempt.setIndex, true)}
                  type="button"
                >
                  ✓ Acertou
                </button>
                <button
                  aria-label={`Marcar série ${attempt.setIndex} de ${exercise.name} como errada`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.successful === false ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}
                  disabled={!started || completed || working || day.status !== 'AVAILABLE'}
                  onClick={() => onAttempt(attempt.setIndex, false)}
                  type="button"
                >
                  × Errou
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
