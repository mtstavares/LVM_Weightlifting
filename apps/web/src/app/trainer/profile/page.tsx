'use client';

import { Camera, ClipboardList, Dumbbell, Pencil, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SaveFeedback } from '../../../components/save-feedback';
import {
  TrainerProfile,
  getTrainerProfile,
  resolveTrainerPhoto,
  updateTrainerProfile
} from '../../../lib/trainer-profile';

export default function TrainerProfilePage() {
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    void getTrainerProfile().then(setProfile);
  }, []);

  if (!profile) return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-40 w-full" /></div>;
  const photo = resolveTrainerPhoto(profile.profilePhotoUrl);

  return (
    <section>
      <div><p className="eyebrow">Minha conta</p><h1 className="page-title">Perfil</h1></div>
      <article className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="h-24 bg-[radial-gradient(circle_at_12%_10%,rgba(212,175,55,0.28),transparent_28rem)]" />
        <div className="p-5 pt-0">
          <div className="-mt-10 flex items-end gap-4">
            {photo ? <img alt={profile.fullName} className="h-24 w-24 rounded-3xl border border-primary/35 object-cover shadow-glow" src={photo} /> : <span className="flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/35 bg-primary/10 text-primary shadow-glow"><UserRound size={36} /></span>}
            <div className="min-w-0 flex-1 pb-1"><h2 className="truncate text-2xl font-semibold">{profile.fullName}</h2><p className="truncate text-sm text-muted">{profile.email}</p><p className="mt-1 text-sm text-muted">{profile.gym || 'Academia não informada'}</p></div>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={() => setEditing((value) => !value)} type="button"><Pencil size={17} />{editing ? 'Fechar edição' : 'Editar perfil'}</button>
        </div>
      </article>

      {feedback && <div className="mt-4"><SaveFeedback type={feedback} message={feedback === 'success' ? 'Dados atualizados com sucesso.' : 'Não foi possível salvar as alterações. Tente novamente.'} /></div>}
      {editing && <TrainerProfileForm profile={profile} saved={(updated) => { setProfile(updated); setEditing(false); setFeedback('success'); }} failed={() => setFeedback('error')} />}

      <article className="card mt-5 p-5">
        <h2 className="font-semibold">Informações</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Idade" value={profile.age ? `${profile.age} anos` : '-'} />
          <Info label="Academia" value={profile.gym || '-'} />
          <Info label="Descrição pessoal" value={profile.bio || '-'} wide />
        </dl>
      </article>

      <Link className="card mt-5 flex items-center justify-between p-5 font-semibold transition hover:border-primary/35 hover:bg-surface-hover" href="/trainer/exercises">
        <span className="flex items-center gap-3"><Dumbbell className="text-primary" size={20} />Biblioteca de Exercícios</span><span className="text-primary">›</span>
      </Link>

      <Link className="card mt-5 flex items-center justify-between p-5 font-semibold transition hover:border-primary/35 hover:bg-surface-hover" href="/trainer/audit">
        <span className="flex items-center gap-3"><ClipboardList className="text-primary" size={20} />Logs de auditoria</span><span className="text-primary">›</span>
      </Link>
    </section>
  );
}

function TrainerProfileForm({ profile, saved, failed }: { profile: TrainerProfile; saved: (profile: TrainerProfile) => void; failed: () => void }) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [birthDate, setBirthDate] = useState(profile.birthDate?.slice(0, 10) ?? '');
  const [gym, setGym] = useState(profile.gym ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const age = useMemo(() => calculateAge(birthDate), [birthDate]);
  return (
    <form className="card mt-5 grid gap-4 p-5 sm:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault();
      setLoading(true);
      try {
        saved(await updateTrainerProfile({ fullName, birthDate, gym, bio }, photo));
      } catch {
        failed();
      } finally {
        setLoading(false);
      }
    }}>
      <label className="text-sm font-semibold sm:col-span-2">Foto<div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-border bg-sidebar px-3"><Camera size={17} /><input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="min-w-0 text-sm text-muted" type="file" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></div></label>
      <label className="text-sm font-semibold">Nome<input className="input mt-2" minLength={3} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label className="text-sm font-semibold">Nascimento<input className="input mt-2" max={new Date().toISOString().slice(0, 10)} type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /><span className="mt-1 block text-xs text-muted">Idade: {age ?? '-'}</span></label>
      <label className="text-sm font-semibold sm:col-span-2">Academia<input className="input mt-2" maxLength={150} value={gym} onChange={(event) => setGym(event.target.value)} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Descrição pessoal<textarea className="mt-2 min-h-28 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" maxLength={1000} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
      <button className="btn-primary sm:col-span-2" disabled={loading} type="submit">{loading ? 'Salvando...' : 'Salvar alterações'}</button>
    </form>
  );
}
function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</dt><dd className="mt-1 text-sm text-foreground">{value}</dd></div>;
}
function calculateAge(value: string) {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
