'use client';

import { LoaderCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { resendVerification, verifyEmail } from '../../lib/auth';

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}><VerifyEmailContent /></Suspense>;
}

function VerifyEmailContent() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyEmail(email, code);
      router.replace(result.user.role === 'TRAINER' ? '/trainer/feed' : '/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Codigo invalido.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    await resendVerification(email);
    setMessage('Um novo codigo foi enviado. Verifique seu e-mail.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-md border border-border bg-white p-6">
        <h1 className="text-xl font-semibold">Confirme seu e-mail</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Digite o codigo de seis numeros enviado para {email}.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input className="input text-center text-xl tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white disabled:opacity-60" disabled={loading || code.length !== 6} type="submit">
            {loading && <LoaderCircle className="animate-spin" size={18} />}Confirmar
          </button>
        </form>
        <button className="mt-4 w-full text-sm font-medium text-primary hover:underline" onClick={resend} type="button">Reenviar codigo</button>
      </section>
    </main>
  );
}
