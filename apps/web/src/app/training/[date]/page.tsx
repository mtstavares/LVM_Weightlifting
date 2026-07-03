'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../../../components/brand-logo';
import {
  TrainingDay,
  TrainingExercise,
  TrainingSection,
  completeTraining,
  confirmTrainingPersonalRecord,
  declineTrainingPersonalRecord,
  getAthleteTrainingDay,
  saveTrainingFeedback,
  sendAthleteTrainingMessage,
  startTraining,
  updateTrainingSetAttempt
} from '../../../lib/training';

export default function AthleteTrainingDayPage() {
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
  const prCandidate = day?.possiblePersonalRecords[0] ?? null;

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
    return <main className="flex min-h-screen items-center justify-center bg-background"><div className="skeleton h-32 w-full max-w-sm" /></main>;
  }

  if (!day) {
    return (
      <main className="mx-auto max-w-3xl p-5">
        <p>Treino não encontrado.</p>
        <button className="mt-3 text-primary" onClick={() => router.push('/athlete/training')} type="button">Voltar</button>
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
      <header className="border-b border-border bg-sidebar/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <BrandLogo size="compact" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-5 p-4">
        <button className="flex items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push('/athlete/training')} type="button">
          <ArrowLeft size={17} />Voltar
        </button>

        <article className="card p-5 shadow-sm">
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
          <button className="btn-primary w-full" disabled={future || working} onClick={() => action(() => startTraining(day.id), 'Treino iniciado.')} type="button">
            {future ? 'Disponível na data agendada' : 'Iniciar treino'}
          </button>
        )}

        {prCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <article className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Novo PR identificado</p>
              <h2 className="mt-3 text-2xl font-semibold">{prCandidate.label}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Novo PR identificado em {prCandidate.label}. PR atual: {prCandidate.currentPr} kg.
                Nova marca: {prCandidate.candidateWeight} kg. Deseja atualizar seu perfil?
              </p>
              <p className="mt-2 text-xs text-muted">Exercício: {prCandidate.exerciseName}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button className="btn-primary flex-1" disabled={working} onClick={() => action(() => confirmTrainingPersonalRecord(day.id, prCandidate.movement), 'PR atualizado com sucesso.')} type="button">
                  Confirmar atualiza??o
                </button>
                <button className="btn-secondary flex-1" disabled={working} onClick={() => action(() => declineTrainingPersonalRecord(day.id, prCandidate.movement), 'Sugest?o de PR ignorada.')} type="button">
                  Recusar
                </button>
              </div>
            </article>
          </div>
        )}

        <div className="space-y-4">
          {day.sections.map((section) => {
            const ready = sectionAttemptsMarked(section);
            const selected = section.completed || ready;
            return (
              <article className="card p-5" key={section.id}>
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{section.label}</span>
                    {section.notes && <span className="mt-1 block text-sm text-muted">{section.notes}</span>}
                    {section.exercises.length > 0 && !selected && <span className="mt-1 block text-xs text-muted">Responda todas as séries para concluir este bloco.</span>}
                  </span>
                  <input checked={selected} className="h-5 w-5" disabled readOnly title="O bloco é concluído automaticamente após responder todas as séries." type="checkbox" />
                </label>

                <div className="mt-4 space-y-3">
                  {section.exercises.length === 0 && <p className="text-sm text-muted">Sem exercícios nesta seção.</p>}
                  {section.exercises.map((exercise) => (
                    <ExerciseCard
                      completed={completed}
                      day={day}
                      exercise={exercise}
                      key={exercise.id ?? `${section.id}-${exercise.name}`}
                      onAttempt={(setIndex, successful) => action(() => updateTrainingSetAttempt(day.id, exercise.id ?? '', setIndex, successful), 'Série atualizada.')}
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
          <button className="btn-primary flex w-full items-center justify-center gap-2" disabled={day.progress !== 100 || !allAttemptsMarked || working} onClick={() => action(() => completeTraining(day.id), 'Treino concluído.')} type="button">
            <CheckCircle2 size={18} />Finalizar treino
          </button>
        )}
        {!completed && day.startedAt && !allAttemptsMarked && <p className="text-center text-xs text-muted">Marque cada série como acertou ou errou antes de finalizar.</p>}

        {completed && (
          <article className="card p-5">
            <h2 className="text-lg font-semibold">Feedback do treino</h2>
            {day.feedback ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p>PSE: {day.feedback.pse}/10 · Fadiga: {day.feedback.fatigue}/10</p>
                {day.feedback.observations && <p className="mt-2 text-muted">{day.feedback.observations}</p>}
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void action(() => saveTrainingFeedback(day.id, { pse, fatigue, observations }), 'Feedback enviado.'); }}>
                <label className="block text-sm font-medium">PSE ({pse})<input className="w-full" max={10} min={1} onChange={(event) => setPse(Number(event.target.value))} type="range" value={pse} /></label>
                <label className="block text-sm font-medium">Fadiga ({fatigue})<input className="w-full" max={10} min={1} onChange={(event) => setFatigue(Number(event.target.value))} type="range" value={fatigue} /></label>
                <textarea className="min-h-24 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" onChange={(event) => setObservations(event.target.value)} placeholder="Observações" value={observations} />
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
              <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); const text = sessionMessage.trim(); if (!text) return; void action(async () => { await sendAthleteTrainingMessage(day.id, text); setSessionMessage(''); }, 'Mensagem enviada.'); }}>
                <textarea className="min-h-20 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" onChange={(event) => setSessionMessage(event.target.value)} placeholder="Responder ao treinador" value={sessionMessage} />
                <button className="btn-secondary" disabled={working || !sessionMessage.trim()} type="submit">Enviar mensagem</button>
              </form>
            </div>
          </article>
        )}

        {day.history.length > 0 && (
          <article className="card p-5">
            <h2 className="font-semibold">Histórico da prescrição</h2>
            <div className="mt-3 space-y-2 text-sm text-muted">
              {day.history.map((item) => <p key={item.id}>Versão {item.version} · {item.action} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>)}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function sectionAttemptsMarked(section: TrainingSection) {
  return section.exercises.length > 0 && section.exercises.every((exercise) => exercise.attempts.length > 0 && exercise.attempts.every((attempt) => attempt.successful !== null));
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
      <ExercisePrescription exercise={exercise} />
      {exercise.attempts.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted">{exercise.durationMinutes || exercise.notes ? 'Conclusão' : 'Execução por série'}</p>
          {exercise.attempts.map((attempt) => (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-sidebar p-2" key={attempt.setIndex}>
              <span className="font-medium">{exercise.durationMinutes || exercise.notes ? 'Exercício concluído' : `Série ${attempt.setIndex}`}</span>
              <div className="flex gap-2">
                <button aria-label={`Marcar ${exercise.name} como concluído`} className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.successful === true ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`} disabled={!started || completed || working || day.status !== 'AVAILABLE'} onClick={() => onAttempt(attempt.setIndex, true)} type="button">{exercise.durationMinutes || exercise.notes ? 'Concluiu' : '✓ Acertou'}</button>
                {!exercise.durationMinutes && !exercise.notes && <button aria-label={`Marcar série ${attempt.setIndex} de ${exercise.name} como errada`} className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.successful === false ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`} disabled={!started || completed || working || day.status !== 'AVAILABLE'} onClick={() => onAttempt(attempt.setIndex, false)} type="button">✕ Errou</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExercisePrescription({ exercise }: { exercise: TrainingExercise }) {
  if (exercise.durationMinutes) {
    return <p className="text-muted">Tempo: {exercise.durationMinutes} min</p>;
  }
  if (exercise.notes) {
    return <p className="text-muted">{exercise.notes}</p>;
  }
  const percentage = exercise.percentageEnd
    ? `${exercise.percentage}–${exercise.percentageEnd}%${exercise.prBaseLabel ? ` do ${exercise.prBaseLabel}` : ''}`
    : exercise.percentage
      ? `${exercise.percentage}%${exercise.prBaseLabel ? ` do ${exercise.prBaseLabel}` : ''}`
      : '';
  const calculatedWeight = exercise.calculatedWeightEnd
    ? `${exercise.calculatedWeight}–${exercise.calculatedWeightEnd} kg`
    : exercise.calculatedWeight
      ? `${exercise.calculatedWeight} kg`
      : '';
  return (
    <p className="text-muted">
      {exercise.sets} séries · {exercise.reps} reps
      {percentage ? ` · ${percentage}` : ''}
      {calculatedWeight ? ` · ${calculatedWeight}` : ''}
      {exercise.load ? ` · ${exercise.load} kg` : ''}
    </p>
  );
}
