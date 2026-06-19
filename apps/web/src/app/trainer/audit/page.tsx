'use client';

import { ArrowLeft } from 'lucide-react';
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

  async function load() {
    setLogs(await listAuditLogs({ athleteId, event, result, dateFrom, dateTo }));
  }

  useEffect(() => {
    void Promise.all([listAuditLogs(), listAthletes()]).then(([currentLogs, currentAthletes]) => {
      setLogs(currentLogs);
      setAthletes(currentAthletes);
    });
  }, []);

  return (
    <section>
      <Link className="flex items-center gap-2 text-sm font-medium text-primary" href="/trainer/profile"><ArrowLeft size={17} />Voltar ao perfil</Link>
      <h1 className="mt-5 text-2xl font-semibold">Logs de auditoria</h1>
      <p className="mt-2 text-sm text-muted">Eventos relacionados à sua conta e aos seus atletas.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <select className="input" value={athleteId} onChange={(event) => setAthleteId(event.target.value)}><option value="">Todos os atletas</option>{athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.fullName}</option>)}</select>
        <input className="input" placeholder="Evento" value={event} onChange={(input) => setEvent(input.target.value)} />
        <select className="input" value={result} onChange={(input) => setResult(input.target.value)}><option value="">Todos os resultados</option><option value="SUCCESS">Sucesso</option><option value="FAILURE">Falha</option></select>
        <div className="grid grid-cols-2 gap-3"><input className="input" aria-label="Data inicial" type="date" value={dateFrom} onChange={(input) => setDateFrom(input.target.value)} /><input className="input" aria-label="Data final" type="date" value={dateTo} onChange={(input) => setDateTo(input.target.value)} /></div>
        <button className="h-11 rounded-md bg-primary text-sm font-semibold text-white sm:col-span-2" onClick={() => void load()} type="button">Aplicar filtros</button>
      </div>
      <div className="mt-5 space-y-3">
        {logs.map((log) => <article className="rounded-xl border border-border bg-white p-4" key={log.id}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{log.description}</p><span className={`shrink-0 text-xs font-semibold ${log.result === 'SUCCESS' ? 'text-primary' : 'text-danger'}`}>{log.result === 'SUCCESS' ? 'Sucesso' : 'Falha'}</span></div><p className="mt-2 text-xs text-muted">{formatDate(log.createdAt)} · {log.event}</p></article>)}
        {!logs.length && <p className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted">Nenhum log encontrado.</p>}
      </div>
    </section>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
