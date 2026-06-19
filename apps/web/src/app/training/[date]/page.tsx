'use client';

import { ArrowLeft, CheckCircle2, Dumbbell } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrainingDay,
  completeTraining,
  getAthleteTrainingDay,
  saveTrainingFeedback,
  startTraining,
  updateTrainingSection
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

  async function reload() {
    const loaded = await getAthleteTrainingDay(date);
    setDay(loaded);
    if (loaded?.feedback) {
      setPse(loaded.feedback.pse);
      setFatigue(loaded.feedback.fatigue);
      setObservations(loaded.feedback.observations ?? '');
    }
  }

  useEffect(() => {
    void reload().catch((caught) => setError(caught instanceof Error ? caught.message : 'Treino indisponível.')).finally(() => setLoading(false));
  }, [date]);

  async function action(run: () => Promise<unknown>, success: string) {
    setWorking(true); setError(''); setMessage('');
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

  if (loading) return <main className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
  if (!day) return <main className="mx-auto max-w-3xl p-5"><p>Treino não encontrado.</p><button className="mt-3 text-primary" onClick={() => router.push('/dashboard')} type="button">Voltar</button></main>;
  const completed = day.status === 'COMPLETED';
  const future = day.status === 'SCHEDULED';

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="border-b border-border bg-white"><div className="mx-auto flex h-16 max-w-3xl items-center px-4 font-semibold"><Dumbbell className="mr-2 text-primary" size={20} />LVM Weightlifting</div></header>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <button className="mb-5 flex items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push('/dashboard')} type="button"><ArrowLeft size={17} />Voltar ao perfil</button>
        <div className="rounded-xl border border-border bg-white p-5">
          <h1 className="text-2xl font-semibold">{day.title || 'Sessão de treino'}</h1>
          <p className="mt-1 text-sm text-muted">{new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR')}</p>
          {day.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{day.notes}</p>}
          <div className="mt-5"><div className="mb-1 flex justify-between text-sm"><span>Progresso</span><strong>{day.progress}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-primary transition-all" style={{ width: `${day.progress}%` }} /></div></div>
          {!day.startedAt && !completed && <button className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={future || working} onClick={() => action(() => startTraining(day.id), 'Treino iniciado.')} type="button">{future ? 'Disponível na data agendada' : 'Iniciar treino'}</button>}
        </div>

        {message && <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 space-y-4">
          {day.sections.map((section) => (
            <article className="rounded-xl border border-border bg-white p-5" key={section.id}>
              <label className="flex items-center gap-3 font-semibold">
                <input checked={section.completed} className="h-5 w-5 accent-emerald-700" disabled={!day.startedAt || completed || !section.exercises.length || working} onChange={(event) => action(() => updateTrainingSection(day.id, section.id, event.target.checked), 'Progresso atualizado.')} type="checkbox" />
                {section.label}
              </label>
              {section.notes && <p className="mt-2 text-sm text-muted">{section.notes}</p>}
              <div className="mt-3 space-y-2">
                {section.exercises.map((exercise) => <div className="rounded-lg bg-slate-50 p-3 text-sm" key={exercise.id}><strong>{exercise.name}</strong><p className="mt-1 text-muted">{exercise.sets} séries × {exercise.reps} reps{exercise.load !== null ? ` · ${exercise.load} kg` : ''}{exercise.restSeconds !== null ? ` · descanso ${exercise.restSeconds}s` : ''}</p></div>)}
                {!section.exercises.length && <p className="text-sm text-muted">Sem exercícios nesta seção.</p>}
              </div>
            </article>
          ))}
        </div>

        {!completed && day.startedAt && <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white disabled:opacity-50" disabled={day.progress !== 100 || working} onClick={() => action(() => completeTraining(day.id), 'Treino concluído. Envie seu feedback.')} type="button"><CheckCircle2 size={18} />Concluir treino</button>}

        {completed && (
          <article className="mt-5 rounded-xl border border-border bg-white p-5">
            <h2 className="font-semibold">Feedback da sessão</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Scale label="PSE" value={pse} onChange={setPse} />
              <Scale label="Fadiga" value={fatigue} onChange={setFatigue} />
            </div>
            <label className="mt-4 block text-sm font-medium">Observações<textarea className="mt-2 min-h-24 w-full rounded-md border border-border p-3 text-sm" value={observations} onChange={(event) => setObservations(event.target.value)} /></label>
            <button className="mt-3 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={working} onClick={() => action(() => saveTrainingFeedback(day.id, { pse, fatigue, observations }), 'Feedback enviado com sucesso.')} type="button">{working ? 'Salvando...' : day.feedback ? 'Atualizar feedback' : 'Enviar feedback'}</button>
            {day.feedback?.comments.length ? <div className="mt-5 border-t border-border pt-4"><h3 className="text-sm font-semibold">Comentários do treinador</h3>{day.feedback.comments.map((item) => <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm" key={item.id}><strong>{item.coach.fullName}</strong><p className="mt-1">{item.comment}</p><small className="mt-2 block text-muted">{new Date(item.createdAt).toLocaleString('pt-BR')}</small></div>)}</div> : null}
          </article>
        )}

        {day.history.length > 0 && <article className="mt-5 rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Histórico da prescrição</h2>{day.history.map((item) => <p className="mt-2 text-sm text-muted" key={item.id}>Versão {item.version} · {item.action} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>)}</article>}
      </section>
    </main>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-sm font-medium">{label}: {value}/10<input className="mt-2 w-full accent-emerald-700" max={10} min={1} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
