'use client';

import type { AuthUser } from '@lvm/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentUser, refreshSession } from '../../lib/auth';

export default function DashboardPage() {
  const router = useRouter();

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
        router.replace('/athlete/training');
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-background px-6"><div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6"><div className="skeleton h-5 w-36" /><div className="skeleton h-24 w-full" /><div className="skeleton h-10 w-2/3" /></div></main>;
}
