'use client';

import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AthleteProfile,
  getTrainerAthleteProfile,
  movementLabels
} from '../../../../../../lib/athlete-profile';
import {
  exerciseCatalog,
  getExerciseConfigByKey,
  prBaseLabel
} from '../../../../../../lib/exercise-catalog';
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

type EditableExercise = TrainingExercise & { mode: 'MANUAL' | 'PERCENTAGE' };
type EditableSection = {
  type: TrainingSectionType;
  notes: string;
  exercises: EditableExercise[];
};

export default function TrainerTrainingPage() {
  const { athleteId, date } = useParams<{ athleteId: string; date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<TrainingDay | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState<EditableSection[]>(emptySections());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  async function reload() {
    const [loaded, loadedProfile] = await Promise.all([
      getTrainerTrainingDay(athleteId, date),
      getTrainerAthleteProfile(athleteId)
    ]);
    setDay(loaded);
    setProfile(loadedProfile);
    setTitle(loaded?.title ?? '');
    setNotes(loaded?.notes ?? '');
    setSections(definitions.map((definition) => {
      const section = loaded?.sections.find((item) => item.type === definition.type);
      return {
        type: definition.type,
        notes: section?.notes ?? '',
        exercises: section?.exercises.map(toEditableExercise) ?? []
      };
    }));
  }

  useEffect(() => {
    void reload()
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Treino indisponível.'))
      .finally(() => setLoading(false));
  }, [athleteId, date]);

  function updateExercise(sectionIndex: number, exerciseIndex: number, patch: Partial<EditableExercise>) {
    setSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      exercises: section.exercises.map((exercise, itemIndex) => itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise)
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await saveTrainerTrainingDay(athleteId, date, {
        title,
        notes,
        sections: sections.map((section) => ({
          type: section.type,
          notes: section.notes,
          exercises: section.exercises.map((exercise) => ({
            exerciseKey: exercise.exerciseKey ?? undefined,
            name: exercise.name,
            sets: Number(exercise.sets),
            reps: Number(exercise.reps),
            mode: exercise.mode,
            load: exercise.mode === 'MANUAL' ? Number(exercise.load ?? 0) : undefined,
            percentage: exercise.mode === 'PERCENTAGE' ? Number(exercise.percentage ?? 0) : undefined
          }))
        }))
      });
      setMessage('Treino salvo com sucesso.');
      await reload();
      router.push(`/trainer/athletes/${athleteId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o treino.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Deseja excluir esta prescrição? O histórico será preservado.')) return;
    setSaving(true);
    setError('');
    try {
      await deleteTrainerTrainingDay(athleteId, date);
      router.push(`/trainer/athletes/${athleteId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o treino.');
    } finally {
      setSaving(false);
    }
  }

  async function sendComment() {
    const text = comment.trim();
    if (!day || !text) return;
    setSaving(true);
    setError('');
    try {
      await addTrainingComment(day.id, text);
      setComment('');
      setMessage('Comentário enviado.');
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o comentário.');
    } finally {
      setSaving(false);
    }
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
                  <label className="text-xs text-muted sm:col-span-2">Exercício<select className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm" value={exercise.exerciseKey ?? ''} onChange={(event) => {
                    const config = getExerciseConfigByKey(event.target.value);
                    updateExercise(sectionIndex, exerciseIndex, {
                      exerciseKey: config?.key ?? null,
                      name: config?.name ?? '',
                      load: null,
                      percentage: null,
                      targetPrExercise: config?.prBase === 'NONE' ? null : config?.prBase ?? null,
                      prBaseLabel: config ? prBaseLabel(config.prBase) : null
                    });
                  }}>
                    <option value="">Selecione</option>
                    {exerciseCatalog.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
                  </select></label>
                  <NumberField label="Séries" value={exercise.sets ?? 1} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { sets: value })} />
                  <NumberField label="Reps" value={exercise.reps ?? 1} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { reps: value })} />
                  <label className="text-xs text-muted">Modo<select className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm" value={exercise.mode} onChange={(event) => updateExercise(sectionIndex, exerciseIndex, { mode: event.target.value as EditableExercise['mode'], load: null, percentage: null })}>
                    <option value="MANUAL">Manual</option>
                    <option value="PERCENTAGE">Por porcentagem</option>
                  </select></label>
                  {exercise.mode === 'PERCENTAGE' ? (
                    <NumberField label="Porcentagem" value={exercise.percentage ?? 0} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { percentage: value })} />
                  ) : (
                    <NumberField label="Carga kg" value={exercise.load ?? 0} onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { load: value })} />
                  )}
                  <div className="sm:col-span-6">
                    {exercise.mode === 'PERCENTAGE' && <PercentagePreview exercise={exercise} profile={profile} />}
                    {exercise.percentage && exercise.calculatedWeight ? <p className="text-xs text-muted">Snapshot salvo: {exercise.percentage}% = {exercise.calculatedWeight} kg</p> : null}
                  </div>
                  {exercise.attempts.some((attempt) => attempt.successful !== null) && <AttemptSummary attempts={exercise.attempts} />}
                  {!completed && <button className="text-left text-xs font-medium text-danger sm:col-span-6" onClick={() => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, exercises: item.exercises.filter((_, itemIndex) => itemIndex !== exerciseIndex) } : item))} type="button"><Trash2 className="mr-1 inline" size={13} />Remover exercício</button>}
                </div>
              ))}
            </div>
          </article>
        ))}
      </fieldset>

      {!completed && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={save} type="button"><Save size={17} />{saving ? 'Salvando...' : 'Salvar treino'}</button>
          {day && <button className="btn-secondary text-danger" disabled={saving} onClick={remove} type="button">Excluir treino</button>}
        </div>
      )}

      {completed && day && (
        <article className="mt-5 rounded-xl border border-border bg-white p-5">
          <h2 className="text-lg font-semibold">Feedback do atleta</h2>
          {day.feedback ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              <p>PSE: {day.feedback.pse}/10 · Fadiga: {day.feedback.fatigue}/10</p>
              {day.feedback.observations && <p className="mt-2 text-muted">{day.feedback.observations}</p>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">Nenhum feedback enviado.</p>}
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
            <textarea className="min-h-20 w-full rounded-md border border-border p-3 text-sm" onChange={(event) => setComment(event.target.value)} placeholder="Comentário para o atleta" value={comment} />
            <button className="btn-secondary" disabled={saving || !comment.trim()} onClick={sendComment} type="button">Enviar comentário</button>
          </div>
        </article>
      )}
    </section>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="text-xs text-muted">{label}
      <input className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm" min={0} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value ?? ''} />
    </label>
  );
}

function PercentagePreview({ exercise, profile }: { exercise: EditableExercise; profile: AthleteProfile | null }) {
  const config = getExerciseConfigByKey(exercise.exerciseKey);
  if (!config) return <p className="text-xs text-muted">Selecione um exercício configurado para usar porcentagem.</p>;
  if (config.prBase === 'NONE') return <p className="text-xs text-danger">{config.name} não possui PR base. Use prescrição manual.</p>;
  const record = profile?.personalRecords.find((item) => item.exercise === config.prBase);
  if (!record) return <p className="text-xs text-danger">Atleta não possui PR de {movementLabels[config.prBase]}. Cadastre o PR ou use prescrição manual.</p>;
  if (!exercise.percentage) return <p className="text-xs text-muted">PR base usado: {movementLabels[config.prBase]}. Informe a porcentagem para calcular a carga.</p>;
  const calculated = Math.round((Number(record.weight) * exercise.percentage) / 100);
  return <p className="text-xs font-medium text-primary">Prévia: {exercise.percentage}% de {movementLabels[config.prBase]} ({Number(record.weight)} kg) = {calculated} kg.</p>;
}

function AttemptSummary({ attempts }: { attempts: EditableExercise['attempts'] }) {
  return (
    <div className="sm:col-span-6">
      <p className="text-xs font-medium text-muted">Execução do atleta</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attempts.map((attempt) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.successful === true ? 'bg-emerald-50 text-emerald-700' : attempt.successful === false ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-muted'}`} key={attempt.setIndex}>
            Série {attempt.setIndex}: {attempt.successful === true ? 'acertou' : attempt.successful === false ? 'errou' : 'pendente'}
          </span>
        ))}
      </div>
    </div>
  );
}

function emptySections(): EditableSection[] {
  return definitions.map((definition) => ({ type: definition.type, notes: '', exercises: [] }));
}

function newExercise(): EditableExercise {
  return {
    exerciseKey: null,
    name: '',
    sets: 1,
    reps: 1,
    load: 0,
    percentage: null,
    targetPrExercise: null,
    prBaseLabel: null,
    calculatedWeight: null,
    attempts: [],
    mode: 'MANUAL'
  };
}

function toEditableExercise(exercise: TrainingExercise): EditableExercise {
  return {
    ...exercise,
    mode: exercise.percentage ? 'PERCENTAGE' : 'MANUAL'
  };
}
