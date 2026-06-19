'use client';

import { Dumbbell, Home, LogOut, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@lvm/shared';
import { getCurrentUser, logout, refreshSession } from '../lib/auth';

const navigation = [
  { href: '/trainer/feed', label: 'Feed', icon: Home },
  { href: '/trainer/athletes', label: 'Atletas', icon: Users },
  { href: '/trainer/profile', label: 'Perfil', icon: UserRound }
];

export function TrainerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        let current: AuthUser;
        try {
          current = await getCurrentUser();
        } catch {
          current = (await refreshSession()).user;
        }
        if (current.role !== 'TRAINER') return router.replace('/dashboard');
        if (current.mustChangePassword) return router.replace('/change-password');
        setUser(current);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" href="/trainer/feed">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"><Dumbbell size={19} /></span>
            <span className="hidden sm:inline">LVM Weightlifting</span>
            <span className="sm:hidden">LVM</span>
          </Link>
          <button
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium"
            onClick={async () => {
              await logout().catch(() => undefined);
              router.replace('/login');
            }}
            type="button"
          >
            <LogOut size={17} /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-20 sm:px-6 sm:pt-24">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === '/trainer/profile' && pathname.startsWith('/trainer/audit'));
            const Icon = item.icon;
            return (
              <Link
                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${active ? 'text-primary' : 'text-muted'}`}
                href={item.href}
                key={item.href}
              >
                <Icon fill={active ? 'currentColor' : 'none'} size={21} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
