'use client';

import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrainingDay,
  TrainingExercise,
  TrainingSectionType,
  addTrainingComment,
  deleteTrainerTrainingDay,
  getTrainerTrainingDay,
  saveTrainerTrainingDay
} from '../../../../../../lib/training';

const definitions: { type: TrainingSectionType; label: string }[] = [
  { type: 'WARMUP', label: 'Aquecimento' },
  { type: 'TECHNIQUE_BALLISTIC', label: 'Técnica / Balístico' },
  { type: 'STRENGTH', label: 'Força' },
  { type: 'BODYBUILDING', label: 'Musculação' }
];

type EditableSection = {
  type: TrainingSectionType;
  notes: string;
  exercises: TrainingExercise[];
};

export default function TrainerTrainingPage() {
  const { athleteId, date } = useParams<{ athleteId: string; date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<TrainingDay | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState<EditableSection[]>(emptySections());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  async function reload() {
    const loaded = await getTrainerTrainingDay(athleteId, date);
    setDay(loaded);
    setTitle(loaded?.title ?? '');
    setNotes(loaded?.notes ?? '');
    setSections(definitions.map((definition) => {
      const section = loaded?.sections.find((item) => item.type === definition.type);
      return {
        type: definition.type,
        notes: section?.notes ?? '',
        exercises: section?.exercises ?? []
      };
    }));
  }

  useEffect(() => {
    void reload().catch((caught) => setError(caught instanceof Error ? caught.message : 'Treino indisponível.')).finally(() => setLoading(false));
  }, [athleteId, date]);

  function updateExercise(sectionIndex: number, exerciseIndex: number, patch: Partial<TrainingExercise>) {
    setSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      exercises: section.exercises.map((exercise, itemIndex) => itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise)
    }));
  }

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />;
  const completed = day?.status === 'COMPLETED';

  return (
    <section>
      <button className="mb-5 flex items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push(`/trainer/athletes/${athleteId}`)} type="button">
        <ArrowLeft size={17} />Voltar ao atleta
      </button>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Treino de {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')}</h1>
        <p className="mt-1 text-sm text-muted">{completed ? 'Sessão concluída e preservada para consulta.' : day ? 'Edite a prescrição existente.' : 'Crie uma nova prescrição.'}</p>
      </div>
      {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p>}

      <fieldset className="space-y-4" disabled={completed || saving}>
        <article className="rounded-xl border border-border bg-white p-5">
          <label className="block text-sm font-medium">Título<input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-medium">Orientações gerais<textarea className="mt-2 min-h-24 w-full rounded-md border border-border p-3 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </article>
        {sections.map((section, sectionIndex) => (
          <article className="rounded-xl border border-border bg-white p-5" key={section.type}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{definitions[sectionIndex].label}</h2>
              {!completed && <button className="flex items-center gap-1 text-sm font-medium text-primary" onClick={() => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, exercises: [...item.exercises, newExercise()] } : item))} type="button"><Plus size={16} />Exercício</button>}
            </div>
            <textarea className="mt-3 min-h-16 w-full rounded-md border border-border p-3 text-sm" placeholder="Observações da seção" value={section.notes} onChange={(event) => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, notes: event.target.value } : item))} />
            <div className="mt-3 space-y-3">
              {section.exercises.map((exercise, exerciseIndex) => (
                <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-6" key={`${section.type}-${exerciseIndex}`}>
                  <input className="input sm:col-span-2" placeholder="Exercício" required value={exercise.name} onChange={(event) => updateExercise(sectionIndex, exerciseIndex, { name: event.target.value })} />
                  <NumberField label="Séries" value={exercise.sets} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { sets: value ?? 1 })} />
                  <NumberField label="Reps" value={exercise.reps} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { reps: value ?? 1 })} />
                  <NumberField label="Carga kg" optional value={exercise.load} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { load: value })} />
                  <div className="flex gap-2"><NumberField label="Desc. s" optional value={exercise.restSeconds} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { restSeconds: value })} /><button aria-label="Remover exercício" className="text-danger" onClick={() => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, exercises: item.exercises.filter((_, itemIndex) => itemIndex !== exerciseIndex) } : item))} type="button"><Trash2 size={17} /></button></div>
                </div>
              ))}
              {!section.exercises.length && <p className="text-sm text-muted">Seção vazia; ela não será considerada no progresso.</p>}
            </div>
          </article>
        ))}
      </fieldset>

      {!completed && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={async () => {
            setSaving(true); setError(''); setMessage('');
            try {
              const saved = await saveTrainerTrainingDay(athleteId, date, {
                title, notes,
                sections: sections.map((section) => ({
                  type: section.type,
                  notes: section.notes,
                  exercises: section.exercises.map((exercise) => ({
                    name: exercise.name,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    load: exercise.load ?? undefined,
                    restSeconds: exercise.restSeconds ?? undefined
                  }))
                }))
              });
              setDay(saved);
              setMessage('Treino salvo com sucesso.');
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o treino.');
            } finally { setSaving(false); }
          }} type="button"><Save size={17} />{saving ? 'Salvando...' : 'Salvar treino'}</button>
          {day && <button className="h-11 rounded-md border border-red-200 px-5 text-sm font-semibold text-danger" onClick={async () => {
            if (!window.confirm('Deseja excluir logicamente este treino? O histórico será preservado.')) return;
            await deleteTrainerTrainingDay(athleteId, date);
            router.push(`/trainer/athletes/${athleteId}`);
          }} type="button">Excluir treino</button>}
        </div>
      )}

      {day?.feedback && (
        <article className="mt-5 rounded-xl border border-border bg-white p-5">
          <h2 className="font-semibold">Feedback do atleta</h2>
          <p className="mt-3 text-sm">PSE: <strong>{day.feedback.pse}/10</strong> · Fadiga: <strong>{day.feedback.fatigue}/10</strong></p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{day.feedback.observations || 'Sem observações.'}</p>
          <div className="mt-4 space-y-2">{day.feedback.comments.map((item) => <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}><strong>{item.coach.fullName}</strong><p className="mt-1">{item.comment}</p></div>)}</div>
          <textarea className="mt-4 min-h-20 w-full rounded-md border border-border p-3 text-sm" placeholder="Adicionar comentário" value={comment} onChange={(event) => setComment(event.target.value)} />
          <button className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!comment.trim()} onClick={async () => {
            await addTrainingComment(day.id, comment); setComment(''); await reload(); setMessage('Comentário enviado.');
          }} type="button">Enviar comentário</button>
        </article>
      )}

      {day && <article className="mt-5 rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Histórico de alterações</h2><div className="mt-3 space-y-2">{day.history.map((item) => <p className="text-sm text-muted" key={item.id}>Versão {item.version} · {item.action} · {item.changedBy.fullName} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>)}</div></article>}
    </section>
  );
}

function emptySections(): EditableSection[] {
  return definitions.map((definition) => ({ type: definition.type, notes: '', exercises: [] }));
}

function newExercise(): TrainingExercise {
  return { name: '', sets: 1, reps: 1, load: null, restSeconds: null };
}

function NumberField({ label, value, optional, onChange }: { label: string; value: number | null; optional?: boolean; onChange: (value: number | null) => void }) {
  return <label className="text-xs text-muted">{label}<input className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm" min={0} required={!optional} type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} /></label>;
}
