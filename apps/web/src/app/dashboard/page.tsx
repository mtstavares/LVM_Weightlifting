'use client';

import type { AuthUser } from '@lvm/shared';
import { Dumbbell, LogOut, Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout, refreshSession } from '../../lib/auth';
import {
  AthleteSummary,
  createAthlete,
  getOwnAthleteProfile,
  listAthletes
} from '../../lib/athletes';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [ownProfile, setOwnProfile] = useState<AthleteSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let currentUser: AuthUser;
        try {
          currentUser = await getCurrentUser();
        } catch {
          currentUser = (await refreshSession()).user;
        }
        if (currentUser.mustChangePassword) {
          router.replace('/change-password');
          return;
        }
        setUser(currentUser);
        if (currentUser.role === 'TRAINER') {
          setAthletes(await listAthletes());
        } else {
          setOwnProfile(await getOwnAthleteProfile());
        }
      } catch {
        router.replace('/login');
      }
    }
    void load();
  }, [router]);

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white"><Dumbbell size={21} /></div>
          <div><h1 className="font-semibold">LVM Weightlifting</h1><p className="text-xs text-muted">{user.fullName} · {user.role}</p></div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm" onClick={handleLogout} type="button"><LogOut size={17} />Sair</button>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 lg:px-8">
        {user.role === 'TRAINER' ? (
          <>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-semibold">Seus atletas</h2><p className="mt-1 text-sm text-muted">Somente atletas vinculados a sua conta aparecem aqui.</p></div>
              <button className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white" onClick={() => setShowCreate(true)} type="button"><Plus size={17} />Cadastrar atleta</button>
            </div>
            <div className="mt-6 overflow-hidden rounded-md border border-border bg-white">
              {athletes.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-14 text-center"><Users className="text-muted" size={30} /><p className="mt-3 font-medium">Nenhum atleta cadastrado</p><p className="mt-1 text-sm text-muted">Cadastre o primeiro atleta para enviar o acesso temporario.</p></div>
              ) : athletes.map((athlete) => (
                <div className="flex items-center justify-between border-b border-border px-5 py-4 last:border-0" key={athlete.id}>
                  <div><p className="font-medium">{athlete.fullName}</p><p className="text-sm text-muted">{athlete.email}</p></div>
                  <span className={`text-sm font-medium ${athlete.isActive ? 'text-primary' : 'text-danger'}`}>{athlete.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-xl font-semibold">Meu perfil de atleta</h2>
            <section className="mt-6 rounded-md border border-border bg-white p-5">
              <p className="font-medium">{ownProfile?.fullName}</p>
              <p className="mt-1 text-sm text-muted">{ownProfile?.email}</p>
              <p className="mt-4 text-sm">Seu acesso esta vinculado exclusivamente ao treinador responsavel pela criacao da conta.</p>
            </section>
          </div>
        )}
      </section>

      {showCreate && <CreateAthleteDialog close={() => setShowCreate(false)} created={(athlete) => { setAthletes((current) => [athlete, ...current]); setShowCreate(false); }} />}
    </main>
  );
}

function CreateAthleteDialog({ close, created }: { close: () => void; created: (athlete: AthleteSummary) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      created(await createAthlete({ fullName, email }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao cadastrar atleta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-5">
      <form className="w-full max-w-md rounded-md bg-white p-6" onSubmit={submit}>
        <h2 className="text-lg font-semibold">Cadastrar atleta</h2>
        <div className="mt-5 space-y-4">
          <div><label className="mb-2 block text-sm font-medium">Nome completo</label><input className="input" minLength={3} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
          <div><label className="mb-2 block text-sm font-medium">E-mail</label><input className="input" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3"><button className="h-10 rounded-md border border-border px-4 text-sm" onClick={close} type="button">Cancelar</button><button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">Criar e enviar acesso</button></div>
      </form>
    </div>
  );
}
