'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TrainerPublication, getTrainerFeed } from '../../../lib/trainer-profile';

export default function TrainerFeedPage() {
  const [publications, setPublications] = useState<TrainerPublication[]>([]);

  useEffect(() => {
    void getTrainerFeed().then((feed) => {
      setPublications(
        [...feed.publications].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
        )
      );
    });
  }, []);

  return (
    <section>
      <div>
        <p className="text-sm font-medium text-primary">Área do treinador</p>
        <h1 className="mt-1 text-2xl font-semibold">Feed</h1>
        <p className="mt-2 text-sm text-muted">Publicações, avisos e mensagens do seu grupo aparecerão aqui.</p>
      </div>
      <div className="mt-6 space-y-4">
        {publications.map((publication) => (
          <article className="rounded-xl border border-border bg-white p-5" key={publication.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{publication.senderName}</p>
              <span className="text-xs font-medium text-primary">{publication.type}</span>
            </div>
            <p className="mt-3 text-sm leading-6">{publication.message}</p>
            <p className="mt-3 text-xs text-muted">{new Date(publication.createdAt).toLocaleString('pt-BR')}</p>
          </article>
        ))}
        {!publications.length && (
          <div className="rounded-xl border border-dashed border-border bg-white px-5 py-16 text-center">
            <Bell className="mx-auto text-slate-300" size={34} />
            <p className="mt-3 font-medium">Nenhuma publicação no momento</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">O endpoint já usa o treinador autenticado; futuras publicações serão isoladas pelo trainer_id do grupo.</p>
          </div>
        )}
      </div>
    </section>
  );
}
