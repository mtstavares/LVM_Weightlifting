'use client';

import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { TrainingCalendar } from '../../../../components/training-calendar';
import {
  AthleteProfile,
  getTrainerAthleteProfile,
  levelLabels,
  movementLabels,
  resolveProfilePhoto
} from '../../../../lib/athlete-profile';
import { trainerCalendar } from '../../../../lib/training';

export default function TrainerAthleteProfilePage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [error, setError] = useState('');
  const loadCalendar = useCallback((month: string) => trainerCalendar(athleteId, month), [athleteId]);

  useEffect(() => {
    void getTrainerAthleteProfile(athleteId)
      .then(setProfile)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Perfil indisponível.'));
  }, [athleteId]);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</p>;
  if (!profile) return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-44 w-full" /><div className="skeleton h-80 w-full" /></div>;
  const photo = resolveProfilePhoto(profile.profilePhotoUrl);

  return (
    <section>
      <button className="mb-5 flex items-center gap-2 text-sm font-semibold text-primary" onClick={() => router.push('/trainer/athletes')} type="button">
        <ArrowLeft size={17} />Voltar para atletas
      </button>

      <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="h-28 bg-[radial-gradient(circle_at_18%_20%,rgba(212,175,55,0.24),transparent_28rem)]" />
        <div className="p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            {photo ? <img alt={profile.fullName} className="h-28 w-28 rounded-3xl border border-primary/35 object-cover shadow-glow" src={photo} /> : <span className="flex h-28 w-28 items-center justify-center rounded-3xl border border-primary/35 bg-primary/10 text-primary shadow-glow"><UserRound size={38} /></span>}
            <div className="min-w-0 pb-1">
              <p className="eyebrow">Dados pessoais</p>
              <h1 className="mt-2 truncate text-2xl font-semibold sm:text-3xl">{profile.fullName}</h1>
              <p className="truncate text-sm text-muted">{profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge label={profile.isActive ? 'Conta ativa' : 'Conta inativa'} tone={profile.isActive ? 'success' : 'danger'} />
                <StatusBadge label={profile.profileStatus === 'PROFILE_COMPLETE' ? 'Perfil completo' : 'Perfil incompleto'} tone={profile.profileStatus === 'PROFILE_COMPLETE' ? 'success' : 'warning'} />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Info label="Idade" value={profile.age ? `${profile.age} anos` : undefined} />
            <Info label="Nascimento" value={profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('pt-BR') : undefined} />
            <Info label="Academia" value={profile.gym ?? undefined} />
          </div>
        </div>
      </article>

      <article className="card mt-5 p-5">
        <p className="eyebrow">Dados esportivos</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Categoria" value={profile.weightCategory ? `${profile.weightCategory} kg` : undefined} />
          <Info label="Nível competitivo" value={profile.competitiveLevel ? levelLabels[profile.competitiveLevel] : undefined} />
          {profile.personalRecords.map((record) => <Info key={record.id} label={movementLabels[record.exercise]} value={`${record.weight} kg · ${new Date(record.recordDate).toLocaleDateString('pt-BR')}`} highlight />)}
          {!profile.personalRecords.length && <p className="text-sm text-muted">Nenhum PR cadastrado.</p>}
        </div>
      </article>

      <article className="card mt-5 p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays size={20} /></span>
          <div><h2 className="text-xl font-semibold">Calendário de treinos</h2><p className="text-sm text-muted">Clique em uma data para prescrever ou visualizar.</p></div>
        </div>
        <TrainingCalendar
          load={loadCalendar}
          onSelect={(date) => router.push(`/trainer/athletes/${athleteId}/training/${date}`)}
        />
      </article>
    </section>
  );
}

function Info({ label, value, highlight = false }: { label: string; value?: string; highlight?: boolean }) {
  return <div className="rounded-2xl border border-border bg-sidebar p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p><p className={`mt-2 text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value ?? '-'}</p></div>;
}

function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' }) {
  const classes = tone === 'success' ? 'bg-emerald-50 text-emerald-700' : tone === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}
