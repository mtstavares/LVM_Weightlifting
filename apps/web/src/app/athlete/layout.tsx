'use client';

import type { AuthUser } from '@lvm/shared';
import { CalendarDays, Home, LogOut, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/brand-logo';
import { getCurrentUser, logout, refreshSession } from '../../lib/auth';

const navigation = [
  { href: '/athlete/feed', label: 'Feed', icon: Home },
  { href: '/athlete/training', label: 'Meu Treino', icon: CalendarDays },
  { href: '/athlete/profile', label: 'Meu Perfil', icon: UserRound }
];

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        let current: AuthUser;
        try {
          current = await getCurrentUser();
        } catch {
          current = (await refreshSession()).user;
        }
        if (current.role !== 'ATHLETE') return router.replace('/trainer/feed');
        if (current.mustChangePassword) return router.replace('/change-password');
        if (!current.profileComplete) return router.replace('/complete-profile');
        setUser(current);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  async function signOut() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-2/3" />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-sidebar/95 p-4 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${collapsed ? 'w-24' : 'w-72'}`}>
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link className="rounded-2xl border border-primary/20 bg-black/30 px-2 py-1 shadow-glow hover:bg-primary/5" href="/athlete/training">
            <BrandLogo size={collapsed ? 'compact' : 'sm'} />
          </Link>
          {!collapsed && (
            <button aria-label="Recolher menu" className="btn-ghost h-10 w-10 p-0" onClick={() => setCollapsed(true)} type="button">‹</button>
          )}
        </div>
        {collapsed && <button aria-label="Expandir menu" className="btn-ghost mx-auto mt-4 h-10 w-10 p-0" onClick={() => setCollapsed(false)} type="button">›</button>}
        {!collapsed && <p className="mt-4 px-2 text-xs font-medium text-muted">Athlete performance suite</p>}

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                className={`relative flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground'} ${collapsed ? 'justify-center' : ''}`}
                href={item.href}
                key={item.href}
                title={collapsed ? item.label : undefined}
              >
                {active && <span className="absolute left-0 h-7 w-1 rounded-r-full bg-primary" />}
                <Icon size={20} />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <button className={`btn-ghost mt-auto ${collapsed ? 'px-0' : ''}`} onClick={signOut} title={collapsed ? 'Sair' : undefined} type="button">
          <LogOut size={17} />{!collapsed && <span>Sair</span>}
        </button>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-sidebar/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link className="rounded-2xl border border-primary/20 bg-black/30 px-2 shadow-glow" href="/athlete/training">
            <BrandLogo size="compact" />
          </Link>
          <button className="btn-ghost" onClick={signOut} type="button">
            <LogOut size={17} /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className={`mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-24 transition-[padding] duration-300 sm:px-6 lg:pb-10 lg:pt-8 ${collapsed ? 'lg:pl-32' : 'lg:pl-80'}`}
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 px-2">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold ${active ? 'text-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
                href={item.href}
                key={item.href}
              >
                {active && <span className="absolute top-1 h-0.5 w-8 rounded-full bg-primary" />}
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
