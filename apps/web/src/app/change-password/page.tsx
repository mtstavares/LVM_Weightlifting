'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  ChangePassword,
  changePassword,
  changePasswordSchema
} from '../../lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const form = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', passwordConfirmation: '' }
  });

  async function submit(input: ChangePassword) {
    const result = await changePassword(input);
    router.replace(
      result.user.role === 'ATHLETE' && !result.user.profileComplete
        ? '/complete-profile'
        : result.user.role === 'TRAINER'
          ? '/trainer/feed'
          : '/athlete/training'
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-premium">
        <p className="eyebrow">Segurança</p>
        <h1 className="mt-3 text-2xl font-semibold">Defina uma nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-muted">A troca é obrigatória antes de acessar o restante do sistema.</p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(submit)}>
          <PasswordField label="Senha atual ou temporária" error={form.formState.errors.currentPassword?.message} registration={form.register('currentPassword')} />
          <PasswordField label="Nova senha" error={form.formState.errors.newPassword?.message} registration={form.register('newPassword')} />
          <PasswordField label="Confirmação da nova senha" error={form.formState.errors.passwordConfirmation?.message} registration={form.register('passwordConfirmation')} />
          {form.formState.errors.root && <p className="text-sm text-danger">{form.formState.errors.root.message}</p>}
          <button className="btn-primary w-full" disabled={form.formState.isSubmitting} type="submit">Trocar senha</button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({ label, error, registration }: { label: string; error?: string; registration: object }) {
  return <div><label className="mb-2 block text-sm font-semibold">{label}</label><input className="input" type="password" {...registration} />{error && <p className="mt-1 text-xs text-danger">{error}</p>}</div>;
}
