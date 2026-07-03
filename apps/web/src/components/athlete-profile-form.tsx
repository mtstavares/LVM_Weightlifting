'use client';

import { useMemo, useState } from 'react';
import {
  AthleteProfile,
  AthleteSex,
  CompetitiveLevel,
  ProfileInput,
  levelLabels,
  weightCategories
} from '../lib/athlete-profile';

const levels = Object.keys(levelLabels) as CompetitiveLevel[];

export function AthleteProfileForm({
  profile,
  requirePhoto,
  submitLabel,
  onSubmit
}: {
  profile?: AthleteProfile | null;
  requirePhoto: boolean;
  submitLabel: string;
  onSubmit: (input: ProfileInput, photo: File | null) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate?.slice(0, 10) ?? '');
  const [sex, setSex] = useState<AthleteSex>(profile?.sex ?? 'FEMALE');
  const [weightCategory, setWeightCategory] = useState(profile?.weightCategory ?? '');
  const [competitiveLevel, setCompetitiveLevel] = useState<CompetitiveLevel>(
    profile?.competitiveLevel ?? 'BEGINNER'
  );
  const [gym, setGym] = useState(profile?.gym ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const age = useMemo(() => calculateAge(birthDate), [birthDate]);

  function changeSex(value: AthleteSex) {
    setSex(value);
    setWeightCategory('');
  }

  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        if (requirePhoto && !photo) return setError('Selecione uma foto de perfil.');
        setLoading(true);
        try {
          await onSubmit(
            { fullName, birthDate, sex, weightCategory, competitiveLevel, gym },
            photo
          );
        } catch {
          setError('Não foi possível salvar as alterações. Tente novamente.');
        } finally {
          setLoading(false);
        }
      }}
    >
      <Field label="Nome completo">
        <input className="input" required minLength={3} value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </Field>
      <Field label="Foto de perfil">
        <input
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="block h-11 w-full rounded-xl border border-border bg-sidebar p-2 text-sm text-muted"
          required={requirePhoto}
          type="file"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
      </Field>
      <Field label="Data de nascimento">
        <input className="input" max={new Date().toISOString().slice(0, 10)} required type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
        <p className="mt-1 text-xs text-muted">Idade calculada: {age ?? '-'}</p>
      </Field>
      <Field label="Sexo">
        <select className="input" value={sex} onChange={(event) => changeSex(event.target.value as AthleteSex)}>
          <option value="FEMALE">Feminino</option>
          <option value="MALE">Masculino</option>
        </select>
      </Field>
      <Field label="Categoria de peso">
        <select className="input" required value={weightCategory} onChange={(event) => setWeightCategory(event.target.value)}>
          <option value="">Selecione</option>
          {weightCategories[sex].map((category) => (
            <option key={category.value} value={category.value}>
              {category.value} kg{category.olympic ? ' — Olímpica' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nível competitivo">
        <select className="input" value={competitiveLevel} onChange={(event) => setCompetitiveLevel(event.target.value as CompetitiveLevel)}>
          {levels.map((level) => <option key={level} value={level}>{levelLabels[level]}</option>)}
        </select>
      </Field>
      <Field label="Academia">
        <input className="input" maxLength={120} value={gym} onChange={(event) => setGym(event.target.value)} />
      </Field>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <button className="btn-primary sm:col-span-2" disabled={loading} type="submit">
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>;
}

function calculateAge(value: string) {
  if (!value) return null;
  const birthDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth() - birthDate.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
