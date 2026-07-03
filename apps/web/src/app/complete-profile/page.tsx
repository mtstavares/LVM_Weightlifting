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
        if (user.role !== 'ATHLETE') return router.replace('/athlete/training');
        if (user.mustChangePassword) return router.replace('/change-password');
        const current = await getOwnProfile();
        if (current.profileStatus === 'PROFILE_COMPLETE') return router.replace('/athlete/training');
        setProfile(current);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!profile) return <Loading />;

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-6 shadow-premium">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Perfil</p>
            <h1 className="mt-2 text-2xl font-semibold">Finalizar cadastro</h1>
            <p className="mt-2 text-sm text-muted">Complete seu perfil para liberar o restante do sistema.</p>
          </div>
          <button className="btn-ghost" onClick={async () => { await logout(); router.replace('/login'); }} type="button"><LogOut size={16} />Sair</button>
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
              router.replace('/athlete/training');
            }}
          />
        </div>
      </section>
    </main>
  );
}

function Loading() {
  return <main className="flex min-h-screen items-center justify-center bg-background"><div className="skeleton h-32 w-full max-w-sm" /></main>;
}
