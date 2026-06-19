'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AthleteProfileForm } from '../../components/athlete-profile-form';
import { AthleteProfile, completeProfile, getOwnProfile } from '../../lib/athlete-profile';
import { getCurrentUser, logout, refreshSession } from '../../lib/auth';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (user.role !== 'ATHLETE') return router.replace('/dashboard');
        if (user.mustChangePassword) return router.replace('/change-password');
        const current = await getOwnProfile();
        if (current.profileStatus === 'PROFILE_COMPLETE') return router.replace('/dashboard');
        setProfile(current);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!profile) return <Loading />;

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-md border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Finalizar cadastro</h1>
            <p className="mt-2 text-sm text-muted">Complete seu perfil para liberar o restante do sistema.</p>
          </div>
          <button className="flex items-center gap-2 text-sm" onClick={async () => { await logout(); router.replace('/login'); }} type="button"><LogOut size={16} />Sair</button>
        </div>
        <div className="mt-7">
          <AthleteProfileForm
            profile={profile}
            requirePhoto
            submitLabel="Concluir cadastro"
            onSubmit={async (input, photo) => {
              if (!photo) return;
              await completeProfile(input, photo);
              await refreshSession();
              router.replace('/dashboard');
            }}
          />
        </div>
      </section>
    </main>
  );
}

function Loading() {
  return <main className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
}
