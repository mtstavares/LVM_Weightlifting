'use client';

import { Ban, Mail, Plus, RotateCcw, Search, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AthleteStatus,
  AthleteSummary,
  createAthlete,
  deactivateAthlete,
  listAthletes,
  reactivateAthlete,
  resendAthleteInvitation
} from '../../../lib/athletes';
import { resolveProfilePhoto } from '../../../lib/athlete-profile';

const statusLabels: Record<AthleteStatus, string> = {
  CONVITE_ENVIADO: 'Convite enviado',
  PRIMEIRO_LOGIN_PENDENTE: 'Primeiro login pendente',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo'
};

export default function TrainerAthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AthleteStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AthleteSummary | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      setAthletes(await listAthletes({ search, status: status || undefined }));
    } catch {
      setError('Não foi possível carregar os atletas.');
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [search, status]);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold">Atletas</h1>
          <p className="mt-2 text-sm text-muted">Gerencie exclusivamente os atletas vinculados à sua conta.</p>
        </div>
        <button className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white" onClick={() => setShowCreate(true)} type="button">
          <Plus size={18} /><span className="hidden sm:inline">Adicionar atleta</span>
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 text-muted" size={18} />
          <input className="input pl-10" placeholder="Buscar por nome ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value as AthleteStatus | '')}>
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {athletes.map((athlete) => {
          const photo = resolveProfilePhoto(athlete.profilePhotoUrl);
          return (
            <article
              className="cursor-pointer rounded-xl border border-border bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
              key={athlete.id}
              onClick={() => router.push(`/trainer/athletes/${athlete.id}`)}
            >
              <div className="flex items-start gap-3">
                {photo ? <img alt={athlete.fullName} className="h-12 w-12 rounded-full object-cover" src={photo} /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted"><UserRound size={23} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{athlete.fullName}</p>
                  <p className="truncate text-sm text-muted">{athlete.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <StatusBadge status={athlete.status} />
                    <span className="text-muted">Último acesso: {formatDate(athlete.lastAccessAt)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3" onClick={(event) => event.stopPropagation()}>
                {athlete.status === 'INATIVO' ? (
                  <Action title="Reativar" onClick={async () => { await reactivateAthlete(athlete.id); await load(); }}><RotateCcw size={16} /></Action>
                ) : (
                  <Action title="Desativar" onClick={() => setDeactivateTarget(athlete)}><Ban size={16} /></Action>
                )}
                {athlete.status === 'CONVITE_ENVIADO' && (
                  <Action title="Reenviar convite" onClick={async () => { await resendAthleteInvitation(athlete.id); await load(); }}><Mail size={16} /></Action>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!athletes.length && !error && <p className="mt-5 rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted">Nenhum atleta encontrado.</p>}

      {showCreate && <CreateDialog close={() => setShowCreate(false)} created={async () => { setShowCreate(false); await load(); }} />}
      {deactivateTarget && <DeactivateDialog athlete={deactivateTarget} close={() => setDeactivateTarget(null)} confirmed={async (reason) => { await deactivateAthlete(deactivateTarget.id, reason); setDeactivateTarget(null); await load(); }} />}
    </section>
  );
}

function CreateDialog({ close, created }: { close: () => void; created: () => Promise<void> }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Adicionar atleta" close={close}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
          await createAthlete({ fullName, email });
          await created();
        } catch {
          setError('Não foi possível adicionar o atleta.');
        } finally {
          setLoading(false);
        }
      }}>
        <label className="text-sm font-medium">Nome completo<input className="input mt-2" required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">E-mail<input className="input mt-2" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <DialogActions close={close} loading={loading} label="Criar e enviar acesso" />
      </form>
    </Modal>
  );
}

function DeactivateDialog({ athlete, close, confirmed }: { athlete: AthleteSummary; close: () => void; confirmed: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Modal title="Desativar atleta" close={close}>
      <p className="text-sm leading-6">Deseja desativar este atleta? O acesso será bloqueado, mas todo o histórico será preservado.</p>
      <p className="mt-2 font-medium">{athlete.fullName}</p>
      <label className="mt-5 block text-sm font-medium">Motivo opcional<textarea className="mt-2 min-h-24 w-full rounded-md border border-border p-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <DialogActions close={close} loading={loading} label="Desativar" action={async () => { setLoading(true); await confirmed(reason); }} />
    </Modal>
  );
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-5"><section className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="text-2xl" onClick={close} type="button">×</button></div><div className="mt-5">{children}</div></section></div>;
}
function DialogActions({ close, loading, label, action }: { close: () => void; loading: boolean; label: string; action?: () => Promise<void> }) {
  return <div className="mt-6 grid grid-cols-2 gap-3"><button className="h-11 rounded-md border border-border text-sm" onClick={close} type="button">Cancelar</button><button className="h-11 rounded-md bg-primary text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={action ? () => void action() : undefined} type={action ? 'button' : 'submit'}>{loading ? 'Salvando...' : label}</button></div>;
}
function Action({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={title} className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium" onClick={onClick} title={title} type="button">{children}<span className="hidden sm:inline">{title}</span></button>;
}
function StatusBadge({ status }: { status: AthleteStatus }) {
  return <span className={`rounded-full px-2 py-1 font-semibold ${status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700' : status === 'INATIVO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[status]}</span>;
}
function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';
}
