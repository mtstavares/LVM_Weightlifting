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

  if (error) return <p className="rounded-md bg-red-50 p-4 text-sm text-danger">{error}</p>;
  if (!profile) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />;
  const photo = resolveProfilePhoto(profile.profilePhotoUrl);

  return (
    <section>
      <button className="mb-5 flex items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push('/trainer/athletes')} type="button">
        <ArrowLeft size={17} />Voltar para atletas
      </button>

      <article className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Dados pessoais</p>
        <div className="flex items-center gap-4">
          {photo ? <img alt={profile.fullName} className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24" src={photo} /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-muted sm:h-24 sm:w-24"><UserRound size={34} /></span>}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{profile.fullName}</h1>
            <p className="truncate text-sm text-muted">{profile.email}</p>
            <p className="mt-2 text-sm">{profile.isActive ? 'Conta ativa' : 'Conta inativa'} · {profile.profileStatus === 'PROFILE_COMPLETE' ? 'Perfil completo' : 'Perfil incompleto'}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info label="Idade" value={profile.age ? `${profile.age} anos` : undefined} />
          <Info label="Nascimento" value={profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('pt-BR') : undefined} />
          <Info label="Academia" value={profile.gym ?? undefined} />
        </div>
      </article>

      <article className="mt-4 rounded-xl border border-border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dados esportivos</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Categoria" value={profile.weightCategory ? `${profile.weightCategory} kg` : undefined} />
          <Info label="Nível de treinamento" value={profile.competitiveLevel ? levelLabels[profile.competitiveLevel] : undefined} />
          {profile.personalRecords.map((record) => <Info key={record.id} label={movementLabels[record.exercise]} value={`${record.weight} kg · ${new Date(record.recordDate).toLocaleDateString('pt-BR')}`} />)}
          {!profile.personalRecords.length && <p className="text-sm text-muted">Nenhum PR cadastrado.</p>}
        </div>
      </article>

      <article className="mt-4 rounded-xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="text-primary" size={20} />
          <div><h2 className="font-semibold">Calendário de treinos</h2><p className="text-xs text-muted">Clique em uma data para prescrever ou visualizar.</p></div>
        </div>
        <TrainingCalendar
          load={loadCalendar}
          onSelect={(date) => router.push(`/trainer/athletes/${athleteId}/training/${date}`)}
        />
      </article>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-medium uppercase text-muted">{label}</p><p className="mt-1 text-sm font-medium">{value ?? '-'}</p></div>;
}
