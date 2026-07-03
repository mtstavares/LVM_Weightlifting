'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SaveFeedback } from '../../components/save-feedback';
import {
  PersonalRecord,
  PersonalRecordMovement,
  listPersonalRecords,
  movementLabels,
  upsertPersonalRecord
} from '../../lib/athlete-profile';
import { getCurrentUser } from '../../lib/auth';

const movements = Object.keys(movementLabels) as PersonalRecordMovement[];

export default function PersonalRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (user.role !== 'ATHLETE') return router.replace('/athlete/training');
        if (!user.profileComplete) return router.replace('/complete-profile');
        setRecords(await listPersonalRecords());
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto max-w-5xl">
        <button className="mb-5 flex items-center gap-2 text-sm font-semibold text-primary" onClick={() => router.push('/athlete/profile')} type="button">
          <ArrowLeft size={16} />Voltar ao perfil
        </button>
        <h1 className="page-title">Recordes pessoais</h1>
        <p className="page-subtitle">Cadastre ou atualize sua melhor marca em cada movimento.</p>

        {feedback && (
          <div className="mt-4">
            <SaveFeedback
              type={feedback}
              message={
                feedback === 'success'
                  ? 'Dados atualizados com sucesso.'
                  : 'Não foi possível salvar as alterações. Tente novamente.'
              }
            />
          </div>
        )}

        <section className="card mt-6 p-5">
          <h2 className="font-semibold">PRs atuais</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {records.map((record) => (
              <span className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary" key={record.id}>
                {movementLabels[record.exercise]}: <strong>{record.weight} kg</strong>
              </span>
            ))}
            {!records.length && <p className="text-sm text-muted">Nenhum PR cadastrado.</p>}
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {movements.map((movement) => (
            <RecordForm
              key={`${movement}-${records.find((item) => item.exercise === movement)?.updatedAt ?? ''}`}
              movement={movement}
              record={records.find((item) => item.exercise === movement)}
              clearFeedback={() => setFeedback(null)}
              failed={() => setFeedback('error')}
              saved={async () => {
                setRecords(await listPersonalRecords());
                setFeedback('success');
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function RecordForm({
  movement,
  record,
  saved,
  failed,
  clearFeedback
}: {
  movement: PersonalRecordMovement;
  record?: PersonalRecord;
  saved: () => Promise<void>;
  failed: () => void;
  clearFeedback: () => void;
}) {
  const [weight, setWeight] = useState(record?.weight ?? '');
  const [recordDate, setRecordDate] = useState(record?.recordDate.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="card p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        clearFeedback();
        setLoading(true);
        try {
          const updated = await upsertPersonalRecord(movement, {
            weight: Number(weight),
            recordDate,
            notes
          });
          setWeight(updated.weight);
          setRecordDate(updated.recordDate.slice(0, 10));
          setNotes(updated.notes ?? '');
          await saved();
        } catch {
          failed();
        } finally {
          setLoading(false);
        }
      }}
    >
      <h2 className="font-semibold">{movementLabels[movement]}</h2>
      {record?.history?.length ? (
        <div className="mt-3 rounded-xl border border-border bg-sidebar p-3 text-xs text-muted">
          <p className="font-semibold text-foreground">Últimas atualizações</p>
          {record.history.slice(0, 3).map((item) => (
            <p className="mt-1" key={item.id}>{item.weight} kg em {new Date(item.recordDate).toLocaleDateString('pt-BR')}</p>
          ))}
        </div>
      ) : null}
      <label className="mt-4 block text-sm font-semibold">
        Carga (kg)
        <input className="input mt-2" min="0.5" max="1000" step="0.01" required type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Data da marca
        <input className="input mt-2" max={new Date().toISOString().slice(0, 10)} required type="date" value={recordDate} onChange={(event) => setRecordDate(event.target.value)} />
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Observação
        <textarea className="mt-2 min-h-20 w-full rounded-xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button className="btn-primary mt-4 w-full" disabled={loading} type="submit">
        {loading ? 'Salvando...' : 'Salvar PR'}
      </button>
    </form>
  );
}
