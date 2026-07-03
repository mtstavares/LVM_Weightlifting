'use client';

import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuditLog, listAuditLogs } from '../../../lib/audit-logs';
import { AthleteSummary, listAthletes } from '../../../lib/athletes';

export default function TrainerAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [athleteId, setAthleteId] = useState('');
  const [event, setEvent] = useState('');
  const [result, setResult] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      setLogs(await listAuditLogs({ athleteId, event, result, dateFrom, dateTo }));
    } catch {
      setError('Não foi possível carregar os logs.');
    }
  }

  useEffect(() => {
    void Promise.all([listAuditLogs(), listAthletes()])
      .then(([currentLogs, currentAthletes]) => {
        setLogs(currentLogs);
        setAthletes(currentAthletes);
      })
      .catch(() => setError('Não foi possível carregar os logs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <Link className="flex items-center gap-2 text-sm font-semibold text-primary" href="/trainer/profile"><ArrowLeft size={17} />Voltar ao perfil</Link>
      <div className="mt-5">
        <p className="eyebrow">Auditoria</p>
        <h1 className="page-title">Logs de auditoria</h1>
        <p className="page-subtitle">Eventos relacionados à sua conta e aos seus atletas.</p>
      </div>

      <div className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
        <select className="input" value={athleteId} onChange={(input) => setAthleteId(input.target.value)}><option value="">Todos os atletas</option>{athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.fullName}</option>)}</select>
        <input className="input" placeholder="Evento" value={event} onChange={(input) => setEvent(input.target.value)} />
        <select className="input" value={result} onChange={(input) => setResult(input.target.value)}><option value="">Todos os resultados</option><option value="SUCCESS">Sucesso</option><option value="FAILURE">Falha</option></select>
        <div className="grid grid-cols-2 gap-3"><input className="input" aria-label="Data inicial" type="date" value={dateFrom} onChange={(input) => setDateFrom(input.target.value)} /><input className="input" aria-label="Data final" type="date" value={dateTo} onChange={(input) => setDateTo(input.target.value)} /></div>
        <button className="btn-primary sm:col-span-2" onClick={() => void load()} type="button">Aplicar filtros</button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 space-y-3">
        {loading && <><div className="skeleton h-24 w-full" /><div className="skeleton h-24 w-full" /></>}
        {!loading && logs.map((log) => <article className="card p-4" key={log.id}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{log.description}</p><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${log.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{log.result === 'SUCCESS' ? 'Sucesso' : 'Falha'}</span></div><p className="mt-2 text-xs text-muted">{formatDate(log.createdAt)} · {log.event}</p></article>)}
        {!loading && !logs.length && <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center"><ClipboardList className="mx-auto text-disabled" size={32} /><p className="mt-3 text-sm font-semibold">Nenhum log encontrado.</p><p className="mt-1 text-xs text-muted">Ajuste os filtros ou aguarde novos eventos sensíveis.</p></div>}
      </div>
    </section>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
