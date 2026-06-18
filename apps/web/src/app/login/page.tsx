'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Dumbbell, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  LoginCredentials,
  TrainerRegistration,
  login,
  loginSchema,
  registerTrainer,
  trainerRegistrationSchema
} from '../../lib/auth';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });
  const registrationForm = useForm<TrainerRegistration>({
    resolver: zodResolver(trainerRegistrationSchema),
    defaultValues: { fullName: '', email: '', password: '', passwordConfirmation: '' }
  });

  async function submitLogin(credentials: LoginCredentials) {
    setServerError(null);
    try {
      const result = await login(credentials);
      router.replace(result.user.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Falha ao autenticar.');
    }
  }

  async function submitRegistration(input: TrainerRegistration) {
    setServerError(null);
    try {
      const result = await registerTrainer(input);
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Falha ao criar a conta.');
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary">
            <Dumbbell size={24} />
          </div>
          <div><p className="font-semibold">LVM Weightlifting</p><p className="text-sm text-zinc-400">Performance management</p></div>
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase text-emerald-400">Gestao de LPO</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Planejamento e acompanhamento tecnico em um unico ambiente.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">Contas verificadas, acesso isolado por treinador e primeiro login seguro para atletas.</p>
        </div>
        <p className="text-xs text-zinc-500">Ambiente local de desenvolvimento</p>
      </section>

      <section className="flex min-h-screen items-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-semibold">{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta de treinador'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{mode === 'login' ? 'Use suas credenciais para acessar o painel.' : 'Enviaremos um codigo temporario para confirmar seu e-mail.'}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 border-b border-border">
            {(['login', 'register'] as const).map((item) => (
              <button key={item} className={`border-b-2 px-3 py-3 text-sm font-medium ${mode === item ? 'border-primary text-primary' : 'border-transparent text-muted'}`} onClick={() => { setMode(item); setServerError(null); }} type="button">
                {item === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <form className="space-y-5" onSubmit={loginForm.handleSubmit(submitLogin)}>
              <Field label="E-mail" error={loginForm.formState.errors.email?.message}><input className="input" type="email" autoComplete="email" {...loginForm.register('email')} /></Field>
              <Field label="Senha" error={loginForm.formState.errors.password?.message}>
                <PasswordInput show={showPassword} toggle={() => setShowPassword((value) => !value)} registration={loginForm.register('password')} />
              </Field>
              <div className="text-right"><Link className="text-sm font-medium text-primary hover:underline" href="/forgot-password">Esqueci minha senha</Link></div>
              <SubmitButton loading={loginForm.formState.isSubmitting}>Entrar</SubmitButton>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={registrationForm.handleSubmit(submitRegistration)}>
              <Field label="Nome completo" error={registrationForm.formState.errors.fullName?.message}><input className="input" {...registrationForm.register('fullName')} /></Field>
              <Field label="E-mail" error={registrationForm.formState.errors.email?.message}><input className="input" type="email" {...registrationForm.register('email')} /></Field>
              <Field label="Senha" error={registrationForm.formState.errors.password?.message}><PasswordInput show={showPassword} toggle={() => setShowPassword((value) => !value)} registration={registrationForm.register('password')} /></Field>
              <Field label="Confirmacao de senha" error={registrationForm.formState.errors.passwordConfirmation?.message}><input className="input" type="password" {...registrationForm.register('passwordConfirmation')} /></Field>
              <SubmitButton loading={registrationForm.formState.isSubmitting}>Criar conta</SubmitButton>
            </form>
          )}

          {serverError && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{serverError}</div>}
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-sm font-medium">{label}</label>{children}{error && <p className="mt-1.5 text-xs text-danger">{error}</p>}</div>;
}

function PasswordInput({ show, toggle, registration }: { show: boolean; toggle: () => void; registration: object }) {
  return <div className="relative"><input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" {...registration} /><button aria-label={show ? 'Ocultar senha' : 'Exibir senha'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted" onClick={toggle} type="button">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading && <LoaderCircle className="animate-spin" size={18} />}{children}</button>;
}
