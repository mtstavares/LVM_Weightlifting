'use client';

import { Bell, CalendarDays, Dumbbell, Pencil, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { TrainingCalendar } from './training-calendar';
import {
  AthleteProfile,
  levelLabels,
  movementLabels,
  resolveProfilePhoto
} from '../lib/athlete-profile';
import { athleteCalendar } from '../lib/training';

export function AthleteHome({ profile }: { profile: AthleteProfile }) {
  const router = useRouter();
  const photo = resolveProfilePhoto(profile.profilePhotoUrl);
  const loadCalendar = useCallback((month: string) => athleteCalendar(month), []);

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {photo ? (
                <img
                  alt={profile.fullName}
                  className="h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow"
                  src={photo}
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow">
                  <Dumbbell size={34} />
                </div>
              )}
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${profile.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {profile.isActive ? 'Conta ativa' : 'Conta inativa'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{profile.email}</p>
                <p className="mt-2 text-sm">
                  {profile.weightCategory ? `${profile.weightCategory} kg` : 'Categoria não informada'}
                  {profile.competitiveLevel ? ` · ${levelLabels[profile.competitiveLevel]}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white" onClick={() => router.push('/profile')} type="button">
                <Pencil size={16} />Editar dados
              </button>
              <button className="flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold" onClick={() => router.push('/personal-records')} type="button">
                <Trophy size={16} />Editar PRs
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <ProfileMetric label="Idade" value={profile.age ? `${profile.age} anos` : '-'} />
            <ProfileMetric label="Perfil" value={profile.profileStatus === 'PROFILE_COMPLETE' ? 'Completo' : 'Incompleto'} />
            <ProfileMetric label="PRs cadastrados" value={String(profile.personalRecords.length)} />
          </div>

          {profile.personalRecords.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.personalRecords.map((record) => (
                <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium" key={record.id}>
                  {movementLabels[record.exercise]}: {record.weight} kg
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="text-primary" size={20} />
          <div><h2 className="text-lg font-semibold">Meus treinos</h2><p className="text-sm text-muted">Abra uma sessão para executar e enviar feedback.</p></div>
        </div>
        <TrainingCalendar
          load={loadCalendar}
          onSelect={(date, training) => {
            if (training) router.push(`/training/${date}`);
          }}
        />
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="text-primary" size={20} />
          <div>
            <h2 className="text-lg font-semibold">Avisos e mensagens</h2>
            <p className="text-sm text-muted">Atualizações do treinador e da plataforma.</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-white px-5 py-12 text-center">
          <Bell className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 text-sm font-medium">Nenhum aviso ou mensagem no momento.</p>
          <p className="mt-1 text-xs text-muted">Alertas, mensagens e comunicados aparecerão aqui.</p>
        </div>
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
