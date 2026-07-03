'use client';

import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AthleteProfile,
  getTrainerAthleteProfile,
  movementLabels
} from '../../../../../../lib/athlete-profile';
import {
  ExerciseCategory,
  exerciseCategoryLabels
} from '../../../../../../lib/exercise-catalog';
import { ExerciseLibraryItem, listExercises } from '../../../../../../lib/exercises';
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

const categoryOrder: ExerciseCategory[] = [
  'MOBILITY',
  'GENERAL_WARMUP',
  'SNATCH',
  'CLEAN_AND_JERK',
  'SQUAT',
  'DEADLIFT',
  'ACCESSORY'
];

type PrescriptionMode = 'MANUAL' | 'PERCENTAGE' | 'PERCENTAGE_RANGE' | 'TIME' | 'TEXT';
type EditableExercise = Omit<
  TrainingExercise,
  'sets' | 'reps' | 'load' | 'percentage' | 'percentageEnd' | 'durationMinutes' | 'notes'
> & {
  localId: string;
  mode: PrescriptionMode;
  sets: string;
  reps: string;
  load: string;
  percentage: string;
  percentageEnd: string;
  durationMinutes: string;
  notes: string;
};
type EditableSection = {
  type: TrainingSectionType;
  notes: string;
  exercises: EditableExercise[];
};
type FieldErrors = Record<string, string>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [comment, setComment] = useState('');
  const [focusExerciseId, setFocusExerciseId] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseLibraryItem[]>([]);

  const groupedExercises = useMemo(() => categoryOrder.map((category) => ({
    category,
    exercises: exerciseOptions.filter((exercise) => exercise.category === category)
  })).filter((group) => group.exercises.length > 0), [exerciseOptions]);

  async function reload() {
    const [loaded, loadedProfile, loadedExercises] = await Promise.all([
      getTrainerTrainingDay(athleteId, date),
      getTrainerAthleteProfile(athleteId),
      listExercises()
    ]);
    setDay(loaded);
    setProfile(loadedProfile);
    setExerciseOptions(loadedExercises);
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

  useEffect(() => {
    if (!focusExerciseId) return;
    const element = document.querySelector<HTMLSelectElement>(`[data-exercise-id="${focusExerciseId}"]`);
    element?.focus();
    setFocusExerciseId(null);
  }, [focusExerciseId, sections]);

  function addExercise(sectionIndex: number) {
    const exercise = newExercise();
    setSections((current) => current.map((section, index) => index === sectionIndex ? {
      ...section,
      exercises: [...section.exercises, exercise]
    } : section));
    setFocusExerciseId(exercise.localId);
  }

  function updateExercise(sectionIndex: number, exerciseIndex: number, patch: Partial<EditableExercise>) {
    setSections((current) => current.map((section, index) => index !== sectionIndex ? section : {
      ...section,
      exercises: section.exercises.map((exercise, itemIndex) => itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise)
    }));
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    sections.forEach((section, sectionIndex) => {
      section.exercises.forEach((exercise, exerciseIndex) => {
        const prefix = `${sectionIndex}.${exerciseIndex}`;
        const config = findExercise(exerciseOptions, exercise.exerciseKey);
        const isTimeExercise = config?.prescriptionType === 'TIME';

        if (!exercise.exerciseKey || !config) {
          nextErrors[`${prefix}.exerciseKey`] = 'Selecione um exercício.';
          return;
        }

        if (isTimeExercise) {
          if (!positiveNumber(exercise.durationMinutes)) {
            nextErrors[`${prefix}.durationMinutes`] = 'Informe o tempo em minutos.';
          }
          return;
        }
        if (config?.prescriptionType === 'TEXT') {
          if (!exercise.notes.trim()) {
            nextErrors[`${prefix}.notes`] = 'Informe a descrição da prescrição.';
          }
          return;
        }

        if (!positiveNumber(exercise.sets)) {
          nextErrors[`${prefix}.sets`] = 'A quantidade de séries deve ser maior que zero.';
        }
        if (!positiveNumber(exercise.reps)) {
          nextErrors[`${prefix}.reps`] = 'As repetições devem ser maiores que zero.';
        }
        if (exercise.mode === 'MANUAL' && !numberFilled(exercise.load)) {
          nextErrors[`${prefix}.load`] = 'Informe a carga.';
        }
        if ((exercise.mode === 'PERCENTAGE' || exercise.mode === 'PERCENTAGE_RANGE') && !config.prBase) {
          nextErrors[`${prefix}.mode`] = 'Este exercício não possui PR base para cálculo percentual.';
        }
        if ((exercise.mode === 'PERCENTAGE' || exercise.mode === 'PERCENTAGE_RANGE') && config.prBase) {
          const record = profile?.personalRecords.find((item) => item.exercise === config.prBase);
          if (!record) {
            nextErrors[`${prefix}.mode`] = `O atleta ainda não cadastrou PR de ${movementLabels[config.prBase]}.`;
          }
          if (!positiveNumber(exercise.percentage)) {
            nextErrors[`${prefix}.percentage`] = 'Informe a porcentagem.';
          }
          if (exercise.mode === 'PERCENTAGE_RANGE') {
            if (!positiveNumber(exercise.percentageEnd)) {
              nextErrors[`${prefix}.percentageEnd`] = 'Informe a porcentagem final.';
            } else if (Number(exercise.percentageEnd) < Number(exercise.percentage)) {
              nextErrors[`${prefix}.percentageEnd`] = 'A porcentagem final deve ser maior ou igual à inicial.';
            }
          }
        }
      });
    });
    setFieldErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) setError(firstError);
    return Object.keys(nextErrors).length === 0;
  }

  async function save() {
    setMessage('');
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await saveTrainerTrainingDay(athleteId, date, {
        title,
        notes,
        sections: sections.map((section) => ({
          type: section.type,
          notes: section.notes,
          exercises: section.exercises.map((exercise) => {
            const config = findExercise(exerciseOptions, exercise.exerciseKey);
            if (config?.prescriptionType === 'TIME') {
              return {
                exerciseKey: exercise.exerciseKey ?? undefined,
                name: exercise.name,
                sets: 1,
                reps: 1,
                mode: 'TIME',
                durationMinutes: Number(exercise.durationMinutes)
              };
            }
            if (config?.prescriptionType === 'TEXT') {
              return {
                exerciseKey: exercise.exerciseKey ?? undefined,
                name: exercise.name,
                sets: 1,
                reps: 1,
                mode: 'TEXT',
                notes: exercise.notes.trim()
              };
            }
            return {
              exerciseKey: exercise.exerciseKey ?? undefined,
              name: exercise.name,
              sets: Number(exercise.sets),
              reps: Number(exercise.reps),
              mode: exercise.mode,
              load: exercise.mode === 'MANUAL' ? Number(exercise.load) : undefined,
              percentage: exercise.mode === 'PERCENTAGE' || exercise.mode === 'PERCENTAGE_RANGE' ? Number(exercise.percentage) : undefined,
              percentageEnd: exercise.mode === 'PERCENTAGE_RANGE' ? Number(exercise.percentageEnd) : undefined
            };
          })
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

  if (loading) return <div className="skeleton h-20 w-full max-w-sm" />;
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
      {message && <p className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <fieldset className="space-y-4" disabled={completed || saving}>
        <article className="card p-5">
          <label className="block text-sm font-medium">Título<input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-medium">Orientações gerais<textarea className="mt-2 min-h-24 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </article>

        {sections.map((section, sectionIndex) => (
          <article className="card p-5" key={section.type}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{definitions[sectionIndex].label}</h2>
              {!completed && <AddExerciseButton onClick={() => addExercise(sectionIndex)} />}
            </div>
            <textarea className="mt-3 min-h-16 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Observações da seção" value={section.notes} onChange={(event) => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, notes: event.target.value } : item))} />
            <div className="mt-3 space-y-3">
              {section.exercises.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhum exercício neste bloco.</p>}
              {section.exercises.map((exercise, exerciseIndex) => {
                const config = findExercise(exerciseOptions, exercise.exerciseKey);
                const isTimeExercise = config?.prescriptionType === 'TIME';
                const isTextExercise = config?.prescriptionType === 'TEXT';
                const prefix = `${sectionIndex}.${exerciseIndex}`;
                return (
                  <div className="rounded-2xl border border-border bg-card p-4" key={exercise.localId}>
                    <div className="grid gap-3 lg:grid-cols-12">
                      <label className="text-xs text-muted lg:col-span-4">Exercício
                        <select
                          className={inputClass(Boolean(fieldErrors[`${prefix}.exerciseKey`]))}
                          data-exercise-id={exercise.localId}
                          value={exercise.exerciseKey ?? ''}
                          onChange={(event) => {
                            const selected = findExercise(exerciseOptions, event.target.value);
                            updateExercise(sectionIndex, exerciseIndex, {
                              exerciseKey: selected?.key ?? null,
                              name: selected?.name ?? '',
                              load: '',
                              percentage: '',
                              percentageEnd: '',
                              durationMinutes: '',
                              notes: '',
                              mode: selected?.prescriptionType === 'TIME' ? 'TIME' : selected?.prescriptionType === 'TEXT' ? 'TEXT' : 'MANUAL',
                              targetPrExercise: selected?.prBase ?? null,
                              prBaseLabel: selected?.prBase ? movementLabels[selected.prBase] : null
                            });
                          }}
                        >
                          <option value="">Selecione</option>
                          {groupedExercises.map((group) => (
                            <optgroup key={group.category} label={exerciseCategoryLabels[group.category]}>
                              {group.exercises.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <FieldError message={fieldErrors[`${prefix}.exerciseKey`]} />
                      </label>

                      {isTimeExercise ? (
                        <NumberField error={fieldErrors[`${prefix}.durationMinutes`]} label="Tempo (min)" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { durationMinutes: value })} value={exercise.durationMinutes} />
                      ) : isTextExercise ? (
                        <label className="text-xs text-muted lg:col-span-8">Descrição da prescrição
                          <textarea
                            className={`mt-1 min-h-24 w-full rounded-xl border bg-sidebar px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 ${fieldErrors[`${prefix}.notes`] ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`}
                            onChange={(event) => updateExercise(sectionIndex, exerciseIndex, { notes: event.target.value })}
                            placeholder={exercise.exerciseKey === 'CORE' ? 'Ex.: 3 rounds: prancha 45s, hollow hold 30s, dead bug 12 reps por lado.' : 'Ex.: Remada unilateral 3x10 leve + face pull 3x15.'}
                            value={exercise.notes}
                          />
                          <FieldError message={fieldErrors[`${prefix}.notes`]} />
                        </label>
                      ) : (
                        <>
                          <NumberField error={fieldErrors[`${prefix}.sets`]} label="Séries" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { sets: value })} value={exercise.sets} />
                          <NumberField error={fieldErrors[`${prefix}.reps`]} label="Reps" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { reps: value })} value={exercise.reps} />
                          <label className="text-xs text-muted lg:col-span-2">Modo
                            <select className={inputClass(Boolean(fieldErrors[`${prefix}.mode`]))} value={exercise.mode} onChange={(event) => updateExercise(sectionIndex, exerciseIndex, { mode: event.target.value as PrescriptionMode, load: '', percentage: '', percentageEnd: '' })}>
                              <option value="MANUAL">Manual</option>
                              <option value="PERCENTAGE">Porcentagem fixa</option>
                              <option value="PERCENTAGE_RANGE">Faixa percentual</option>
                            </select>
                            <FieldError message={fieldErrors[`${prefix}.mode`]} />
                          </label>
                          {exercise.mode === 'MANUAL' && <NumberField error={fieldErrors[`${prefix}.load`]} label="Carga kg" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { load: value })} value={exercise.load} />}
                          {exercise.mode === 'PERCENTAGE' && <NumberField error={fieldErrors[`${prefix}.percentage`]} label="Porcentagem" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { percentage: value })} value={exercise.percentage} />}
                          {exercise.mode === 'PERCENTAGE_RANGE' && (
                            <>
                              <NumberField error={fieldErrors[`${prefix}.percentage`]} label="% inicial" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { percentage: value })} value={exercise.percentage} />
                              <NumberField error={fieldErrors[`${prefix}.percentageEnd`]} label="% final" onChange={(value) => updateExercise(sectionIndex, exerciseIndex, { percentageEnd: value })} value={exercise.percentageEnd} />
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-3">
                      {isTimeExercise && exercise.durationMinutes && <p className="text-xs text-muted">O atleta verá apenas {exercise.name} por {exercise.durationMinutes} min.</p>}
                      {isTextExercise && exercise.notes && <p className="text-xs text-muted">O atleta verá {exercise.name}: {exercise.notes}</p>}
                      {!isTimeExercise && !isTextExercise && (exercise.mode === 'PERCENTAGE' || exercise.mode === 'PERCENTAGE_RANGE') && <PercentagePreview exercise={exercise} exercises={exerciseOptions} profile={profile} />}
                      {!isTimeExercise && !isTextExercise && exercise.percentage && exercise.calculatedWeight ? (
                        <p className="text-xs text-muted">Snapshot salvo: {exercise.percentage}{exercise.percentageEnd ? `–${exercise.percentageEnd}` : ''}% = {exercise.calculatedWeight}{exercise.calculatedWeightEnd ? `–${exercise.calculatedWeightEnd}` : ''} kg</p>
                      ) : null}
                    </div>

                    {exercise.attempts.some((attempt) => attempt.successful !== null) && <AttemptSummary attempts={exercise.attempts} />}
                    {!completed && <button className="mt-3 text-left text-xs font-medium text-danger" onClick={() => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, exercises: item.exercises.filter((_, itemIndex) => itemIndex !== exerciseIndex) } : item))} type="button"><Trash2 className="mr-1 inline" size={13} />Remover exercício</button>}
                  </div>
                );
              })}
            </div>
            {!completed && section.exercises.length > 0 && <div className="mt-4"><AddExerciseButton onClick={() => addExercise(sectionIndex)} /></div>}
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
        <article className="mt-5 card p-5">
          <h2 className="text-lg font-semibold">Feedback do atleta</h2>
          {day.feedback ? (
            <div className="mt-3 rounded-lg border border-border bg-sidebar p-3 text-sm">
              <p>PSE: {day.feedback.pse}/10 · Fadiga: {day.feedback.fatigue}/10</p>
              {day.feedback.observations && <p className="mt-2 text-muted">{day.feedback.observations}</p>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">Nenhum feedback enviado.</p>}
          <div className="mt-5 space-y-3">
            <h3 className="font-semibold">Mensagens da sessão</h3>
            {day.messages.length === 0 && <p className="text-sm text-muted">Nenhuma mensagem nesta sessão.</p>}
            {day.messages.map((item) => (
              <div className="rounded-lg border border-border bg-sidebar p-3 text-sm" key={item.id}>
                <p className="font-medium">{item.sender.fullName}</p>
                <p className="mt-1 text-muted">{item.message}</p>
                <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            ))}
            <textarea className="min-h-20 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" onChange={(event) => setComment(event.target.value)} placeholder="Comentário para o atleta" value={comment} />
            <button className="btn-secondary" disabled={saving || !comment.trim()} onClick={sendComment} type="button">Enviar comentário</button>
          </div>
        </article>
      )}
    </section>
  );
}

function AddExerciseButton({ onClick }: { onClick: () => void }) {
  return <button className="btn-secondary inline-flex items-center gap-1 px-3 py-2 text-sm" onClick={onClick} type="button"><Plus size={16} />Exercício</button>;
}

function NumberField({ error, label, onChange, value }: { error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="text-xs text-muted lg:col-span-2">{label}
      <input className={inputClass(Boolean(error))} min={0} onChange={(event) => onChange(event.target.value)} type="number" value={value} />
      <FieldError message={error} />
    </label>
  );
}

function PercentagePreview({ exercise, exercises, profile }: { exercise: EditableExercise; exercises: ExerciseLibraryItem[]; profile: AthleteProfile | null }) {
  const config = findExercise(exercises, exercise.exerciseKey);
  if (!config) return <p className="text-xs text-muted">Selecione um exercício configurado para usar porcentagem.</p>;
  if (!config.prBase) return <p className="text-xs text-red-300">{config.name} não possui PR base. Use prescrição manual.</p>;
  const record = profile?.personalRecords.find((item) => item.exercise === config.prBase);
  if (!record) return <p className="text-xs text-red-300">Atleta não possui PR de {movementLabels[config.prBase]}. Cadastre o PR ou use prescrição manual.</p>;
  if (!exercise.percentage) return <p className="text-xs text-muted">PR base usado: {movementLabels[config.prBase]}. Informe a porcentagem para calcular a carga.</p>;
  const start = Math.round((Number(record.weight) * Number(exercise.percentage)) / 100);
  if (exercise.mode === 'PERCENTAGE_RANGE' && exercise.percentageEnd) {
    const end = Math.round((Number(record.weight) * Number(exercise.percentageEnd)) / 100);
    return <p className="text-xs font-medium text-primary">Prévia: {exercise.percentage}–{exercise.percentageEnd}% de {movementLabels[config.prBase]} ({Number(record.weight)} kg) = {start}–{end} kg.</p>;
  }
  return <p className="text-xs font-medium text-primary">Prévia: {exercise.percentage}% de {movementLabels[config.prBase]} ({Number(record.weight)} kg) = {start} kg.</p>;
}

function AttemptSummary({ attempts }: { attempts: EditableExercise['attempts'] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted">Execução do atleta</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attempts.map((attempt) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.successful === true ? 'bg-emerald-500/10 text-emerald-300' : attempt.successful === false ? 'bg-red-500/10 text-red-300' : 'bg-white/5 text-muted'}`} key={attempt.setIndex}>
            Série {attempt.setIndex}: {attempt.successful === true ? 'acertou' : attempt.successful === false ? 'errou' : 'pendente'}
          </span>
        ))}
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-xs text-red-300">{message}</span> : null;
}

function inputClass(hasError: boolean) {
  return `mt-1 h-10 w-full rounded-xl border bg-sidebar px-3 text-sm text-foreground outline-none transition focus:ring-2 ${hasError ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'}`;
}

function numberFilled(value: string) {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

function positiveNumber(value: string) {
  return numberFilled(value) && Number(value) > 0;
}

function findExercise(exercises: ExerciseLibraryItem[], key: string | null | undefined) {
  return key ? exercises.find((exercise) => exercise.key === key) ?? null : null;
}

function emptySections(): EditableSection[] {
  return definitions.map((definition) => ({ type: definition.type, notes: '', exercises: [] }));
}

function newExercise(): EditableExercise {
  return {
    localId: crypto.randomUUID(),
    exerciseKey: null,
    name: '',
    exerciseCategory: null,
    prescriptionType: null,
    prBase: null,
    sets: '',
    reps: '',
    load: '',
    percentage: '',
    percentageEnd: '',
    durationMinutes: '',
    notes: '',
    targetPrExercise: null,
    prBaseLabel: null,
    calculatedWeight: null,
    calculatedWeightEnd: null,
    attempts: [],
    mode: 'MANUAL'
  };
}

function toEditableExercise(exercise: TrainingExercise): EditableExercise {
  const mode: PrescriptionMode = exercise.durationMinutes
    ? 'TIME'
    : exercise.prescriptionType === 'TEXT'
      ? 'TEXT'
      : exercise.percentageEnd
      ? 'PERCENTAGE_RANGE'
      : exercise.percentage
        ? 'PERCENTAGE'
        : 'MANUAL';
  return {
    ...exercise,
    localId: exercise.id ?? crypto.randomUUID(),
    mode,
    sets: String(exercise.sets ?? ''),
    reps: String(exercise.reps ?? ''),
    load: exercise.load === null ? '' : String(exercise.load),
    percentage: exercise.percentage === null ? '' : String(exercise.percentage),
    percentageEnd: exercise.percentageEnd === null ? '' : String(exercise.percentageEnd),
    durationMinutes: exercise.durationMinutes === null ? '' : String(exercise.durationMinutes),
    notes: exercise.notes ?? ''
  };
}
