'use client';

import { CalendarDays, Flame, Medal, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { TrainingCalendar } from '../../../components/training-calendar';
import { athleteCalendar } from '../../../lib/training';

export default function AthleteTrainingPage() {
  const router = useRouter();
  const loadCalendar = useCallback((month: string) => athleteCalendar(month), []);

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Rotina</p>
        <h1 className="page-title">Meu Treino</h1>
        <p className="page-subtitle">Acesse seu calendário, execute sessões prescritas e acompanhe sua consistência.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays size={20} /></span>
          <div><h2 className="text-xl font-semibold">Calendário de treinos</h2><p className="text-sm text-muted">Selecione uma data com treino para abrir a sessão.</p></div>
        </div>
        <TrainingCalendar
          load={loadCalendar}
          onSelect={(date, training) => {
            if (training) router.push(`/training/${date}`);
          }}
        />
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Flame size={20} /></span>
          <div><h2 className="text-xl font-semibold">Sequência de Treinos</h2><p className="text-sm text-muted">Estrutura preparada para frequência, sequência e gamificação.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StreakPlaceholder icon={<Flame size={19} />} label="Sequência atual" value="Em breve" />
          <StreakPlaceholder icon={<Target size={19} />} label="Meta semanal" value="Em breve" />
          <StreakPlaceholder icon={<Medal size={19} />} label="Recorde" value="Em breve" highlight />
        </div>
      </section>
    </section>
  );
}

function StreakPlaceholder({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-sidebar p-4">
      <span className={highlight ? 'text-primary' : 'text-muted'}>{icon}</span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
