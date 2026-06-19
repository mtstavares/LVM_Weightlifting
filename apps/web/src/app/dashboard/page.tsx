'use client';

import type { AuthUser } from '@lvm/shared';
import { Dumbbell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AthleteHome } from '../../components/athlete-home';
import { AthleteProfile, getOwnProfile } from '../../lib/athlete-profile';
import { getCurrentUser, logout, refreshSession } from '../../lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        let current: AuthUser;
        try {
          current = await getCurrentUser();
        } catch {
          current = (await refreshSession()).user;
        }
        if (current.mustChangePassword) return router.replace('/change-password');
        if (current.role === 'TRAINER') return router.replace('/trainer/feed');
        if (!current.profileComplete) return router.replace('/complete-profile');
        setUser(current);
        setProfile(await getOwnProfile());
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!user || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"><Dumbbell size={19} /></span>LVM Weightlifting</div>
          <button className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm" onClick={async () => { await logout().catch(() => undefined); router.replace('/login'); }} type="button"><LogOut size={17} />Sair</button>
        </div>
      </header>
      <section className="px-4 py-6 sm:px-6"><AthleteHome profile={profile} /></section>
    </main>
  );
}
