'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CalendarDay, TrainingCalendar as CalendarResponse } from '../lib/training';

const statusStyle = {
  SCHEDULED: 'bg-blue-100 text-blue-800 ring-blue-300',
  AVAILABLE: 'bg-amber-100 text-amber-800 ring-amber-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  MISSED: 'bg-red-100 text-red-800 ring-red-300'
};

export function TrainingCalendar({
  load,
  onSelect
}: {
  load: (month: string) => Promise<CalendarResponse>;
  onSelect: (date: string, training: CalendarDay | null) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState('');
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setError('');
    setData(null);
    void load(monthKey).then(setData).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Calendário indisponível.');
    });
  }, [load, monthKey]);

  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const byDate = new Map(data?.days.map((day) => [day.date, day]) ?? []);
  const minimum = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const maximum = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Mês anterior"
          className="btn-ghost h-10 w-10 p-0"
          disabled={month <= minimum}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold capitalize text-foreground">
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          aria-label="Próximo mês"
          className="btn-ghost h-10 w-10 p-0"
          disabled={month >= maximum}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {!data && !error && <div className="mt-4 grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, index) => <span className="skeleton aspect-square" key={index} />)}</div>}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: count }).map((_, index) => {
              const day = index + 1;
              const date = `${monthKey}-${String(day).padStart(2, '0')}`;
              const training = byDate.get(date) ?? null;
              return (
                <button
                  className={`aspect-square rounded-xl text-sm ring-1 transition hover:-translate-y-0.5 hover:ring-2 ${
                    training ? statusStyle[training.status] : 'bg-slate-100 text-slate-600 ring-slate-200'
                  }`}
                  key={date}
                  onClick={() => onSelect(date, training)}
                  title={training?.title ?? 'Sem treino prescrito'}
                  type="button"
                >
                  <span className="font-semibold">{day}</span>
                  {training && <span className="block text-[9px]">{training.progress}%</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <Legend color="bg-slate-300" label="Sem treino" />
        <Legend color="bg-blue-400" label="Futuro" />
        <Legend color="bg-amber-400" label="Pendente" />
        <Legend color="bg-emerald-500" label="Concluído" />
        <Legend color="bg-red-400" label="Não realizado" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}
