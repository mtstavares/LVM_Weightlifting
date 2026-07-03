'use client';

import { Copy, Dumbbell, Pencil, Plus, Search, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ExerciseCategory,
  ExercisePrescriptionType,
  exerciseCategoryLabels,
  exercisePrescriptionTypeLabels,
  prBaseLabel
} from '../../../lib/exercise-catalog';
import {
  ExerciseLibraryItem,
  SaveExerciseInput,
  createExercise,
  deactivateExercise,
  duplicateExercise,
  listExercises,
  updateExercise
} from '../../../lib/exercises';
import { PersonalRecordMovement, movementLabels } from '../../../lib/athlete-profile';

const categories = Object.keys(exerciseCategoryLabels) as ExerciseCategory[];
const prescriptionTypes = Object.keys(exercisePrescriptionTypeLabels) as ExercisePrescriptionType[];
const prBases: PersonalRecordMovement[] = ['SNATCH', 'CLEAN_JERK', 'BACK_SQUAT', 'FRONT_SQUAT', 'DEADLIFT'];

export default function TrainerExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ExerciseLibraryItem | null>(null);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setExercises(await listExercises({ search, category: category || undefined, activeOnly: false }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => exercises, [exercises]);

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(success);
      setCreating(false);
      setEditing(null);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir a ação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Treinador</p>
          <h1 className="page-title">Biblioteca de Exercícios</h1>
          <p className="mt-2 text-sm text-muted">Gerencie exercícios do sistema e personalizados usados na prescrição.</p>
        </div>
        <button className="btn-primary" onClick={() => { setCreating(true); setEditing(null); }} type="button"><Plus size={17} />Novo exercício</button>
      </div>

      {message && <p className="mt-5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <article className="card mt-6 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input className="input pl-10" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((item) => <option key={item} value={item}>{exerciseCategoryLabels[item]}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void reload()} type="button">Filtrar</button>
      </article>

      {(creating || editing) && (
        <ExerciseForm
          disabled={saving}
          exercise={editing}
          onCancel={() => { setCreating(false); setEditing(null); }}
          onSubmit={(input) => run(() => editing ? updateExercise(editing.id, input) : createExercise(input), editing ? 'Exercício atualizado.' : 'Exercício criado.')}
        />
      )}

      <div className="mt-5 space-y-3">
        {loading && <div className="skeleton h-28 w-full" />}
        {!loading && filtered.length === 0 && <p className="card p-5 text-sm text-muted">Nenhum exercício encontrado.</p>}
        {filtered.map((exercise) => (
          <article className="card p-5 transition hover:border-primary/35 hover:bg-surface-hover" key={exercise.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Dumbbell size={18} /></span>
                  <div>
                    <h2 className="font-semibold">{exercise.name}</h2>
                    <p className="text-xs text-muted">{exerciseCategoryLabels[exercise.category]} · {exercisePrescriptionTypeLabels[exercise.prescriptionType]} · PR base: {prBaseLabel(exercise.prBase)}</p>
                  </div>
                </div>
                {exercise.description && <p className="mt-3 text-sm text-muted">{exercise.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{exercise.origin === 'SYSTEM' ? 'Sistema' : 'Personalizado'}</Badge>
                <Badge>{exercise.isActive ? 'Ativo' : 'Inativo'}</Badge>
                {exercise.canUpdatePersonalRecord && <Badge>Sugere PR</Badge>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {exercise.origin === 'CUSTOM' && exercise.isActive && <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setEditing(exercise)} type="button"><Pencil size={15} />Editar</button>}
              {exercise.origin === 'CUSTOM' && exercise.isActive && <button className="btn-secondary px-3 py-2 text-sm text-danger" onClick={() => run(() => deactivateExercise(exercise.id), 'Exercício inativado.')} type="button"><XCircle size={15} />Inativar</button>}
              {exercise.origin === 'SYSTEM' && <button className="btn-secondary px-3 py-2 text-sm" onClick={() => run(() => duplicateExercise(exercise.id), 'Exercício duplicado como personalizado.')} type="button"><Copy size={15} />Duplicar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExerciseForm({ disabled, exercise, onCancel, onSubmit }: {
  disabled: boolean;
  exercise: ExerciseLibraryItem | null;
  onCancel: () => void;
  onSubmit: (input: SaveExerciseInput) => void;
}) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? 'ACCESSORY');
  const [prescriptionType, setPrescriptionType] = useState<ExercisePrescriptionType>(exercise?.prescriptionType ?? 'LOAD');
  const [prBase, setPrBase] = useState<PersonalRecordMovement | ''>(exercise?.prBase ?? '');
  const [canUpdatePersonalRecord, setCanUpdatePersonalRecord] = useState(exercise?.canUpdatePersonalRecord ?? false);
  const [description, setDescription] = useState(exercise?.description ?? '');
  return (
    <form className="card mt-5 grid gap-4 p-5 md:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      onSubmit({
        name,
        category,
        prescriptionType,
        prBase: prescriptionType === 'LOAD' && prBase ? prBase : null,
        canUpdatePersonalRecord: prescriptionType === 'LOAD' && Boolean(prBase) && canUpdatePersonalRecord,
        description
      });
    }}>
      <label className="text-sm font-semibold md:col-span-2">Nome<input className="input mt-2" required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="text-sm font-semibold">Categoria<select className="input mt-2" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory)}>{categories.map((item) => <option key={item} value={item}>{exerciseCategoryLabels[item]}</option>)}</select></label>
      <label className="text-sm font-semibold">Tipo de prescrição<select className="input mt-2" value={prescriptionType} onChange={(event) => setPrescriptionType(event.target.value as ExercisePrescriptionType)}>{prescriptionTypes.map((item) => <option key={item} value={item}>{exercisePrescriptionTypeLabels[item]}</option>)}</select></label>
      <label className="text-sm font-semibold">PR base<select className="input mt-2" disabled={prescriptionType !== 'LOAD'} value={prBase} onChange={(event) => setPrBase(event.target.value as PersonalRecordMovement | '')}><option value="">Nenhum</option>{prBases.map((item) => <option key={item} value={item}>{movementLabels[item]}</option>)}</select></label>
      <label className="flex items-center gap-3 text-sm font-semibold"><input checked={canUpdatePersonalRecord} disabled={prescriptionType !== 'LOAD' || !prBase} onChange={(event) => setCanUpdatePersonalRecord(event.target.checked)} type="checkbox" />Pode sugerir atualização de PR</label>
      <label className="text-sm font-semibold md:col-span-2">Descrição/Instruções<textarea className="mt-2 min-h-28 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <button className="btn-primary" disabled={disabled} type="submit">{disabled ? 'Salvando...' : 'Salvar exercício'}</button>
        <button className="btn-secondary" disabled={disabled} onClick={onCancel} type="button">Cancelar</button>
      </div>
    </form>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-sidebar px-3 py-1 text-xs font-semibold text-muted">{children}</span>;
}
