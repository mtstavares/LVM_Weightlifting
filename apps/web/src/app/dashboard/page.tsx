'use client';

import type { AuthUser } from '@lvm/shared';
import {
  Ban,
  ClipboardList,
  Dumbbell,
  LogOut,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuditLog, listAuditLogs } from '../../lib/audit-logs';
import {
  AthleteStatus,
  AthleteSummary,
  createAthlete,
  deactivateAthlete,
  getOwnAthleteProfile,
  listAthletes,
  reactivateAthlete,
  resendAthleteInvitation
} from '../../lib/athletes';
import { getCurrentUser, logout, refreshSession } from '../../lib/auth';

const statusLabels: Record<AthleteStatus, string> = {
  CONVITE_ENVIADO: 'Convite enviado',
  PRIMEIRO_LOGIN_PENDENTE: 'Primeiro login pendente',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo'
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [ownProfile, setOwnProfile] = useState<AthleteSummary | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<'athletes' | 'logs'>('athletes');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AthleteStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AthleteSummary | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        let currentUser: AuthUser;
        try {
          currentUser = await getCurrentUser();
        } catch {
          currentUser = (await refreshSession()).user;
        }
        if (currentUser.mustChangePassword) return router.replace('/change-password');
        setUser(currentUser);
        if (currentUser.role === 'ATHLETE') {
          setOwnProfile(await getOwnAthleteProfile());
        }
      } catch {
        router.replace('/login');
      }
    }
    void loadSession();
  }, [router]);

  useEffect(() => {
    if (user?.role !== 'TRAINER') return;
    const timer = setTimeout(() => {
      void listAthletes({ search, status: status || undefined }).then(setAthletes);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search, status]);

  useEffect(() => {
    if (user?.role === 'TRAINER' && tab === 'logs') void listAuditLogs().then(setLogs);
  }, [tab, user]);

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  async function refreshAthletes() {
    setAthletes(await listAthletes({ search, status: status || undefined }));
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white"><Dumbbell size={21} /></div>
          <div><h1 className="font-semibold">LVM Weightlifting</h1><p className="text-xs text-muted">{user.fullName} · {user.role}</p></div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm" onClick={handleLogout} type="button"><LogOut size={17} />Sair</button>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-7 lg:px-8">
        {user.role === 'TRAINER' ? (
          <>
            <div className="mb-6 flex border-b border-border">
              <Tab active={tab === 'athletes'} onClick={() => setTab('athletes')} icon={<Users size={17} />}>Atletas</Tab>
              <Tab active={tab === 'logs'} onClick={() => setTab('logs')} icon={<ClipboardList size={17} />}>Auditoria</Tab>
            </div>
            {tab === 'athletes' ? (
              <AthletesView
                athletes={athletes}
                search={search}
                status={status}
                setSearch={setSearch}
                setStatus={setStatus}
                openCreate={() => setShowCreate(true)}
                deactivate={setDeactivateTarget}
                reactivate={async (athlete) => {
                  await reactivateAthlete(athlete.id);
                  await refreshAthletes();
                }}
                resend={async (athlete) => {
                  await resendAthleteInvitation(athlete.id);
                  await refreshAthletes();
                }}
              />
            ) : (
              <AuditView logs={logs} athletes={athletes} setLogs={setLogs} />
            )}
          </>
        ) : (
          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-xl font-semibold">Meu perfil de atleta</h2>
            <p className="mt-4 font-medium">{ownProfile?.fullName}</p>
            <p className="text-sm text-muted">{ownProfile?.email}</p>
            <p className="mt-4 text-sm">Status: {ownProfile ? statusLabels[ownProfile.status] : '-'}</p>
          </section>
        )}
      </section>

      {showCreate && <CreateAthleteDialog close={() => setShowCreate(false)} created={async () => { setShowCreate(false); await refreshAthletes(); }} />}
      {deactivateTarget && (
        <DeactivateDialog
          athlete={deactivateTarget}
          close={() => setDeactivateTarget(null)}
          confirmed={async (reason) => {
            await deactivateAthlete(deactivateTarget.id, reason);
            setDeactivateTarget(null);
            await refreshAthletes();
          }}
        />
      )}
    </main>
  );
}

function AthletesView(props: {
  athletes: AthleteSummary[];
  search: string;
  status: AthleteStatus | '';
  setSearch: (value: string) => void;
  setStatus: (value: AthleteStatus | '') => void;
  openCreate: () => void;
  deactivate: (athlete: AthleteSummary) => void;
  reactivate: (athlete: AthleteSummary) => Promise<void>;
  resend: (athlete: AthleteSummary) => Promise<void>;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><h2 className="text-xl font-semibold">Status dos atletas</h2><p className="mt-1 text-sm text-muted">Contas vinculadas, acessos e situação operacional.</p></div>
        <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white" onClick={props.openCreate} type="button"><Plus size={17} />Cadastrar atleta</button>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-3 text-muted" size={17} /><input className="input pl-10" placeholder="Buscar por nome ou e-mail" value={props.search} onChange={(event) => props.setSearch(event.target.value)} /></label>
        <select className="input sm:w-64" value={props.status} onChange={(event) => props.setStatus(event.target.value as AthleteStatus | '')}>
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="mt-5 overflow-x-auto rounded-md border border-border bg-white">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-muted"><tr><Th>Atleta</Th><Th>Status</Th><Th>Criado em</Th><Th>Primeiro login</Th><Th>Última senha</Th><Th>Último acesso</Th><Th>Conta</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {props.athletes.map((athlete) => (
              <tr className="border-b border-border last:border-0" key={athlete.id}>
                <Td><p className="font-medium">{athlete.fullName}</p><p className="text-xs text-muted">{athlete.email}</p></Td>
                <Td><StatusBadge status={athlete.status} /></Td>
                <Td>{formatDate(athlete.createdAt)}</Td>
                <Td>{formatDate(athlete.firstLoginAt)}</Td>
                <Td>{formatDate(athlete.lastPasswordChangeAt)}</Td>
                <Td>{formatDate(athlete.lastAccessAt)}</Td>
                <Td>{athlete.isActive ? 'Ativa' : 'Inativa'}</Td>
                <Td><div className="flex gap-2">
                  {athlete.status === 'INATIVO' ? (
                    <IconButton title="Reativar" onClick={() => void props.reactivate(athlete)}><RotateCcw size={16} /></IconButton>
                  ) : (
                    <IconButton title="Desativar" onClick={() => props.deactivate(athlete)}><Ban size={16} /></IconButton>
                  )}
                  {(athlete.status === 'CONVITE_ENVIADO' || athlete.status === 'PRIMEIRO_LOGIN_PENDENTE') && <IconButton title="Reenviar convite" onClick={() => void props.resend(athlete)}><Mail size={16} /></IconButton>}
                </div></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!props.athletes.length && <div className="px-5 py-12 text-center text-sm text-muted">Nenhum atleta encontrado.</div>}
      </div>
    </>
  );
}

function AuditView({ logs, athletes, setLogs }: { logs: AuditLog[]; athletes: AthleteSummary[]; setLogs: (logs: AuditLog[]) => void }) {
  const [athleteId, setAthleteId] = useState('');
  const [event, setEvent] = useState('');
  const [result, setResult] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  async function filter() {
    setLogs(await listAuditLogs({ athleteId, event, result, dateFrom, dateTo }));
  }
  return (
    <>
      <div><h2 className="text-xl font-semibold">Logs de auditoria</h2><p className="mt-1 text-sm text-muted">Eventos dos seus atletas ordenados do mais recente.</p></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <select className="input" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}><option value="">Todos os atletas</option>{athletes.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}</select>
        <input className="input" placeholder="Evento, ex: LOGIN_FAILED" value={event} onChange={(e) => setEvent(e.target.value)} />
        <select className="input" value={result} onChange={(e) => setResult(e.target.value)}><option value="">Todos os resultados</option><option value="SUCCESS">Sucesso</option><option value="FAILURE">Falha</option></select>
        <input className="input" aria-label="Data inicial" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="input" aria-label="Data final" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button className="h-11 rounded-md bg-primary text-sm font-semibold text-white" onClick={() => void filter()} type="button">Aplicar filtros</button>
      </div>
      <div className="mt-5 space-y-3">
        {logs.map((log) => <article className="rounded-md border border-border bg-white p-4" key={log.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{log.description}</p><span className={`text-xs font-semibold ${log.result === 'SUCCESS' ? 'text-primary' : 'text-danger'}`}>{log.result === 'SUCCESS' ? 'Sucesso' : 'Falha'}</span></div><p className="mt-2 text-xs text-muted">{formatDate(log.createdAt)} · {log.event} · IP {log.ipAddress ?? '-'}</p></article>)}
        {!logs.length && <p className="rounded-md border border-border bg-white p-8 text-center text-sm text-muted">Nenhum log encontrado.</p>}
      </div>
    </>
  );
}

function CreateAthleteDialog({ close, created }: { close: () => void; created: () => Promise<void> }) {
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false);
  return <Modal title="Cadastrar atleta" close={close}><form onSubmit={async (event) => { event.preventDefault(); setLoading(true); await createAthlete({ fullName, email }); await created(); }}><label className="mb-2 block text-sm font-medium">Nome completo</label><input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} /><label className="mb-2 mt-4 block text-sm font-medium">E-mail</label><input className="input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /><DialogActions close={close} loading={loading} label="Criar e enviar acesso" /></form></Modal>;
}

function DeactivateDialog({ athlete, close, confirmed }: { athlete: AthleteSummary; close: () => void; confirmed: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState(''); const [loading, setLoading] = useState(false);
  return <Modal title="Desativar atleta" close={close}><p className="text-sm leading-6">Deseja desativar este atleta? O acesso dele será bloqueado, mas o histórico de treinos será preservado.</p><p className="mt-2 font-medium">{athlete.fullName}</p><label className="mb-2 mt-5 block text-sm font-medium">Motivo opcional</label><textarea className="min-h-24 w-full rounded-md border border-border p-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} /><DialogActions close={close} loading={loading} label="Desativar" action={async () => { setLoading(true); await confirmed(reason); }} /></Modal>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"><section className="w-full max-w-md rounded-md bg-white p-6"><div className="flex justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={close} type="button">×</button></div><div className="mt-5">{children}</div></section></div>; }
function DialogActions({ close, loading, label, action }: { close: () => void; loading: boolean; label: string; action?: () => Promise<void> }) { return <div className="mt-6 flex justify-end gap-3"><button className="h-10 rounded-md border border-border px-4 text-sm" onClick={close} type="button">Cancelar</button><button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={action ? () => void action() : undefined} type={action ? 'button' : 'submit'}>{label}</button></div>; }
function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${active ? 'border-primary text-primary' : 'border-transparent text-muted'}`} onClick={onClick} type="button">{icon}{children}</button>; }
function StatusBadge({ status }: { status: AthleteStatus }) { return <span className={`rounded px-2 py-1 text-xs font-semibold ${status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700' : status === 'INATIVO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[status]}</span>; }
function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={title} className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-slate-50" onClick={onClick} title={title} type="button">{children}</button>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-'; }
