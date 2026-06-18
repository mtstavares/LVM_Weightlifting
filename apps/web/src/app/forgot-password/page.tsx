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
      <section className="w-full max-w-md rounded-md border border-border bg-white p-6">
        <h1 className="text-xl font-semibold">Recuperar acesso</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Informe o e-mail da sua conta.</p>
        {sent ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-white" type="submit">Enviar instrucoes</button>
          </form>
        )}
        <Link className="mt-5 block text-center text-sm font-medium text-primary hover:underline" href="/login">Voltar ao login</Link>
      </section>
    </main>
  );
}
