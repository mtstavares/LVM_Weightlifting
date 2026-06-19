'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AthleteProfileForm } from '../../components/athlete-profile-form';
import { SaveFeedback } from '../../components/save-feedback';
import {
  AthleteProfile,
  getOwnProfile,
  resolveProfilePhoto,
  updateProfile
} from '../../lib/athlete-profile';
import { getCurrentUser } from '../../lib/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (user.role !== 'ATHLETE') return router.replace('/dashboard');
        if (!user.profileComplete) return router.replace('/complete-profile');
        setProfile(await getOwnProfile());
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!profile) return <main className="min-h-screen bg-background" />;
  const photo = resolveProfilePhoto(profile.profilePhotoUrl);

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-md border border-border bg-white p-6">
        <button className="mb-5 flex items-center gap-2 text-sm text-primary" onClick={() => router.push('/dashboard')} type="button">
          <ArrowLeft size={16} />Voltar
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {photo ? (
            <img alt={profile.fullName} className="h-20 w-20 rounded-full object-cover" src={photo} />
          ) : (
            <div className="h-20 w-20 rounded-full bg-slate-200" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
            <p className="mt-1 text-sm text-muted">{profile.email}</p>
            <p className="mt-1 text-sm">
              {profile.weightCategory ? `${profile.weightCategory} kg` : 'Categoria não informada'}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-muted">Somente você pode alterar estes dados.</p>
        {feedback && (
          <div className="mt-5">
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

        <div className="mt-7">
          <AthleteProfileForm
            profile={profile}
            requirePhoto={false}
            submitLabel="Salvar alterações"
            onSubmit={async (input, selectedPhoto) => {
              setFeedback(null);
              try {
                await updateProfile(input, selectedPhoto);
                setProfile(await getOwnProfile());
                setFeedback('success');
                window.setTimeout(() => router.push('/dashboard'), 1200);
              } catch {
                setFeedback('error');
                throw new Error('profile-update-failed');
              }
            }}
          />
        </div>
      </section>
    </main>
  );
}
