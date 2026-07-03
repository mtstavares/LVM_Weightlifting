'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword } from '../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await forgotPassword(email);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-premium">
        <p className="eyebrow">Acesso</p>
        <h1 className="mt-3 text-2xl font-semibold">Recuperar acesso</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Informe o e-mail da sua conta.</p>
        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="btn-primary w-full" type="submit">Enviar instruções</button>
          </form>
        )}
        <Link className="mt-5 block text-center text-sm font-semibold text-primary hover:underline" href="/login">Voltar ao login</Link>
      </section>
    </main>
  );
}
