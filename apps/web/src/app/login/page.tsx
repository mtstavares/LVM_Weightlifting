'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BrandLogo } from '../../components/brand-logo';
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
      router.replace(
        result.user.mustChangePassword
          ? '/change-password'
          : result.user.role === 'ATHLETE' && !result.user.profileComplete
            ? '/complete-profile'
            : result.user.role === 'TRAINER'
              ? '/trainer/feed'
              : '/athlete/training'
      );
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
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative hidden overflow-hidden border-r border-border bg-[#0B0B0B] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.22),transparent_34rem)]" />
        <div className="relative">
          <BrandLogo priority size="sm" />
          <p className="mt-2 text-sm text-muted">Elite performance system</p>
        </div>
        <div className="relative max-w-2xl">
          <p className="eyebrow">Gestão de LPO</p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.02]">Precisão para treinadores e atletas de alto rendimento.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted">Planejamento, execução, PRs e segurança de acesso em uma experiência premium para levantamento de peso olímpico.</p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <Feature icon={<ShieldCheck size={18} />} title="Acesso seguro" text="Contas verificadas, isolamento por treinador e auditoria." />
            <Feature icon={<Zap size={18} />} title="Performance" text="Fluxos rápidos para prescrição e execução de treinos." />
          </div>
        </div>
        <p className="relative text-xs text-disabled">Ambiente local de desenvolvimento</p>
      </section>

      <section className="flex min-h-screen items-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-premium sm:p-8">
          <div className="mb-7 text-center">
            <div className="mb-6 flex justify-center">
              <BrandLogo priority size="md" />
            </div>
            <p className="eyebrow">LVM</p>
            <h2 className="mt-3 text-3xl font-semibold">{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{mode === 'login' ? 'Entre para acompanhar performance, treinos e PRs.' : 'Enviaremos um código temporário para confirmar seu e-mail.'}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-border bg-sidebar p-1">
            {(['login', 'register'] as const).map((item) => (
              <button key={item} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === item ? 'bg-primary text-black' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`} onClick={() => { setMode(item); setServerError(null); }} type="button">
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
              <div className="text-right"><Link className="text-sm font-semibold text-primary hover:underline" href="/forgot-password">Esqueci minha senha</Link></div>
              <SubmitButton loading={loginForm.formState.isSubmitting}>Entrar</SubmitButton>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={registrationForm.handleSubmit(submitRegistration)}>
              <Field label="Nome completo" error={registrationForm.formState.errors.fullName?.message}><input className="input" {...registrationForm.register('fullName')} /></Field>
              <Field label="E-mail" error={registrationForm.formState.errors.email?.message}><input className="input" type="email" {...registrationForm.register('email')} /></Field>
              <Field label="Senha" error={registrationForm.formState.errors.password?.message}><PasswordInput show={showPassword} toggle={() => setShowPassword((value) => !value)} registration={registrationForm.register('password')} /></Field>
              <Field label="Confirmação de senha" error={registrationForm.formState.errors.passwordConfirmation?.message}><input className="input" type="password" {...registrationForm.register('passwordConfirmation')} /></Field>
              <SubmitButton loading={registrationForm.formState.isSubmitting}>Criar conta</SubmitButton>
            </form>
          )}

          {serverError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{serverError}</div>}
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-white/[0.04] p-4"><span className="text-primary">{icon}</span><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-sm font-semibold">{label}</label>{children}{error && <p className="mt-1.5 text-xs text-danger">{error}</p>}</div>;
}

function PasswordInput({ show, toggle, registration }: { show: boolean; toggle: () => void; registration: object }) {
  return <div className="relative"><input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" {...registration} /><button aria-label={show ? 'Ocultar senha' : 'Exibir senha'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground" onClick={toggle} type="button">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button className="btn-primary w-full" disabled={loading} type="submit">{loading && <LoaderCircle className="animate-spin" size={18} />}{children}</button>;
}
