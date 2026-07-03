'use client';

import { Calendar, Pencil, Scale, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AthleteProfile,
  levelLabels,
  movementLabels,
  resolveProfilePhoto,
  sexLabels
} from '../../../lib/athlete-profile';
import { getOwnProfile } from '../../../lib/athlete-profile';

export default function AthleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void getOwnProfile()
      .then(setProfile)
      .catch(() => setError('Não foi possível carregar seu perfil.'));
  }, []);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</p>;
  if (!profile) return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-44 w-full" /><div className="skeleton h-32 w-full" /></div>;

  const photo = resolveProfilePhoto(profile.profilePhotoUrl);

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Conta do atleta</p>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="page-subtitle">Dados pessoais, informações esportivas, status e recordes em um único lugar.</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="h-28 bg-[radial-gradient(circle_at_18%_20%,rgba(212,175,55,0.24),transparent_28rem)]" />
        <div className="p-5 pt-0">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {photo ? (
                <img alt={profile.fullName} className="h-28 w-28 rounded-3xl border border-primary/35 bg-surface object-cover shadow-glow" src={photo} />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-3xl border border-primary/35 bg-primary/10 text-primary shadow-glow"><UserRound size={38} /></span>
              )}
              <div className="pb-1">
                <h2 className="text-2xl font-semibold">{profile.fullName}</h2>
                <p className="mt-1 text-sm text-muted">{profile.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge label={profile.profileStatus === 'PROFILE_COMPLETE' ? 'Perfil completo' : 'Perfil incompleto'} tone={profile.profileStatus === 'PROFILE_COMPLETE' ? 'success' : 'warning'} />
                  <StatusBadge label={profile.isActive ? 'Atleta ativo' : 'Atleta inativo'} tone={profile.isActive ? 'success' : 'danger'} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => router.push('/profile')} type="button"><Pencil size={16} />Editar dados</button>
              <button className="btn-secondary" onClick={() => router.push('/personal-records')} type="button"><Trophy size={16} />Editar PRs</button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-3"><UserRound className="text-primary" size={20} /><h2 className="text-xl font-semibold">Dados pessoais</h2></div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Nome" value={profile.fullName} />
            <Info label="E-mail" value={profile.email} />
            <Info label="Nascimento" value={formatDate(profile.birthDate)} icon={<Calendar size={16} />} />
            <Info label="Idade" value={profile.age ? `${profile.age} anos` : '-'} />
            <Info label="Sexo" value={profile.sex ? sexLabels[profile.sex] : '-'} />
          </dl>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-3"><Scale className="text-primary" size={20} /><h2 className="text-xl font-semibold">Dados esportivos</h2></div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Categoria" value={profile.weightCategory ? `${profile.weightCategory} kg` : '-'} />
            <Info label="Nível competitivo" value={profile.competitiveLevel ? levelLabels[profile.competitiveLevel] : '-'} />
            <Info label="Status" value={profile.isActive ? 'Ativo' : 'Inativo'} icon={<ShieldCheck size={16} />} />
          </dl>
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Trophy className="text-primary" size={20} /><h2 className="text-xl font-semibold">PRs atuais</h2></div>
          <button className="btn-secondary h-10 px-4" onClick={() => router.push('/personal-records')} type="button">Editar PRs</button>
        </div>
        {profile.personalRecords.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {profile.personalRecords.map((record) => (
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4" key={record.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{movementLabels[record.exercise]}</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{record.weight} kg</p>
                <p className="mt-1 text-xs text-muted">{formatDate(record.recordDate)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-sidebar p-8 text-center text-sm text-muted">Nenhum PR cadastrado.</p>
        )}
      </section>
    </section>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{icon}{label}</dt><dd className="mt-1 text-sm font-medium text-foreground">{value}</dd></div>;
}

function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' }) {
  const classes = tone === 'success' ? 'bg-emerald-50 text-emerald-700' : tone === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '-';
}
