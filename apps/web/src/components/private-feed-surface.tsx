'use client';

import { Heart, ImagePlus, MessageCircle, Plus, Send, Trash2, UserRound, Video, X } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  FeedComment,
  FeedPost,
  createFeedComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  listFeedPosts,
  resolveFeedMediaUrl,
  toggleFeedLike
} from '../lib/feed';

type FeedSurfaceProps = {
  areaLabel: string;
  subtitle: string;
};

type DraftMedia = {
  file: File;
  url: string;
  kind: 'IMAGE' | 'VIDEO';
};

const maxCaption = 1200;
const maxComment = 500;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
const blockedExtensions = ['svg', 'html', 'htm', 'exe', 'bat', 'cmd', 'js', 'mjs', 'ps1', 'sh'];

export function PrivateFeedSurface({ areaLabel, subtitle }: FeedSurfaceProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<DraftMedia | null>(null);

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => () => {
    if (media) URL.revokeObjectURL(media.url);
  }, [media]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function reload() {
    setLoading(true);
    setError('');
    try {
      setPosts(await listFeedPosts());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o feed.');
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError('');
    setComposerError('');
    setMessage('');
    try {
      const trimmedCaption = caption.trim();
      if (!trimmedCaption && !media) throw new Error('Adicione uma mídia ou escreva uma legenda.');
      const post = await createFeedPost({ caption: trimmedCaption, media: media?.file });
      setPosts((current) => [post, ...current]);
      closeComposer();
      setMessage('Publicado.');
    } catch (caught) {
      setComposerError(caught instanceof Error ? caught.message : 'Não foi possível publicar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(postId: string) {
    if (!confirm('Deseja excluir esta publicação?')) return;
    setError('');
    setMessage('');
    try {
      await deleteFeedPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage('Excluído.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir a publicação.');
    }
  }

  async function like(postId: string) {
    const previous = posts;
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, likedByMe: !post.likedByMe, likesCount: post.likedByMe ? Math.max(0, post.likesCount - 1) : post.likesCount + 1 }
      : post));
    setError('');
    try {
      const result = await toggleFeedLike(postId);
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, ...result } : post));
    } catch (caught) {
      setPosts(previous);
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a curtida.');
    }
  }

  async function comment(postId: string, text: string) {
    const created = await createFeedComment(postId, text);
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, comments: [...post.comments, created], commentsCount: post.commentsCount + 1 }
      : post));
  }

  async function removeComment(postId: string, commentId: string) {
    await deleteFeedComment(postId, commentId);
    setPosts((current) => current.map((post) => post.id === postId
      ? {
          ...post,
          comments: post.comments.filter((item) => item.id !== commentId),
          commentsCount: Math.max(0, post.commentsCount - 1)
        }
      : post));
  }

  async function selectMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setComposerError('');
    try {
      validateFileName(file.name);
      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);
      if (!isImage && !isVideo) throw new Error('Formato inválido. Envie JPG, PNG, WEBP, MP4, MOV ou WEBM.');
      if (isImage && file.size > 10 * 1024 * 1024) throw new Error('Imagem excede 10 MB.');
      if (isVideo && file.size > 80 * 1024 * 1024) throw new Error('Vídeo excede 80 MB.');
      if (isVideo) await validateVideoDuration(file);
      if (media) URL.revokeObjectURL(media.url);
      setMedia({ file, url: URL.createObjectURL(file), kind: isImage ? 'IMAGE' : 'VIDEO' });
    } catch (caught) {
      setComposerError(caught instanceof Error ? caught.message : 'Arquivo inválido.');
    }
  }

  function removeDraftMedia() {
    setMedia((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function closeComposer() {
    setCreating(false);
    setCaption('');
    setComposerError('');
    removeDraftMedia();
  }

  const counter = useMemo(() => `${caption.length}/${maxCaption}`, [caption.length]);

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{areaLabel}</p>
          <h1 className="page-title">Feed</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <button className="btn-primary inline-flex items-center justify-center gap-2" onClick={() => setCreating(true)} type="button">
          <Plus size={18} /> Nova publicação
        </button>
      </div>

      {message && <div className="fixed right-4 top-20 z-50 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-premium">{message}</div>}
      {error && !creating && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="mt-6 space-y-5">
        {loading && <FeedSkeleton />}
        {!loading && posts.map((post) => (
          <PostCard
            key={post.id}
            onComment={comment}
            onDelete={remove}
            onDeleteComment={removeComment}
            onLike={like}
            post={post}
          />
        ))}
        {!loading && posts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-5 py-16 text-center shadow-premium">
            <ImagePlus className="mx-auto text-disabled" size={38} />
            <p className="mt-4 font-semibold">Nenhuma publicação no momento</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Compartilhe uma foto, vídeo curto ou mensagem com o seu grupo privado.</p>
            <button className="btn-secondary mt-6" onClick={() => setCreating(true)} type="button">Criar primeira publicação</button>
          </div>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <article className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Feed privado</p>
                <h2 className="text-xl font-semibold">Nova publicação</h2>
              </div>
              <button aria-label="Fechar" className="btn-ghost h-10 w-10 p-0" onClick={closeComposer} type="button"><X size={18} /></button>
            </div>
            {composerError && <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{composerError}</div>}

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium">
                Legenda
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-border bg-sidebar p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  maxLength={maxCaption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Escreva uma mensagem para o grupo..."
                  value={caption}
                />
              </label>
              <p className="text-right text-xs text-muted">{counter}</p>

              {!media ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-sidebar p-6 text-center transition hover:border-primary/60 hover:bg-surface-hover">
                  <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={selectMedia} type="file" />
                  <ImagePlus className="text-primary" size={28} />
                  <span className="mt-3 text-sm font-semibold">Adicionar foto ou vídeo curto</span>
                  <span className="mt-1 text-xs text-muted">Uma mídia por publicação. Vídeos até 15 segundos.</span>
                </label>
              ) : (
                <div className="rounded-3xl border border-border bg-sidebar p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{media.file.name}</p>
                    <div className="flex gap-2">
                      <label className="btn-secondary cursor-pointer px-3 py-2 text-xs">
                        Trocar
                        <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={selectMedia} type="file" />
                      </label>
                      <button className="btn-ghost px-3 py-2 text-xs text-danger" onClick={removeDraftMedia} type="button">Remover</button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-black">
                    {media.kind === 'IMAGE'
                      ? <img alt="Prévia da publicação" className="max-h-[360px] w-full object-contain" src={media.url} />
                      : <video autoPlay className="max-h-[360px] w-full" controls muted playsInline src={media.url} />}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary flex-1" disabled={saving || (!caption.trim() && !media)} onClick={publish} type="button">
                {saving ? 'Publicando...' : 'Publicar'}
              </button>
              <button className="btn-secondary flex-1" disabled={saving} onClick={closeComposer} type="button">Cancelar</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function PostCard({ post, onDelete, onLike, onComment, onDeleteComment }: {
  post: FeedPost;
  onDelete: (postId: string) => void;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string, text: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
}) {
  const mediaUrl = resolveFeedMediaUrl(post.mediaUrl);
  const initials = post.author.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const visibleComments = commentsOpen ? post.comments : post.comments.slice(-1);

  async function submitComment() {
    const text = commentText.trim();
    if (!text) {
      setCommentError('Comentário não pode ficar vazio.');
      return;
    }
    setCommentSaving(true);
    setCommentError('');
    try {
      await onComment(post.id, text);
      setCommentText('');
      setCommentsOpen(true);
    } catch (caught) {
      setCommentError(caught instanceof Error ? caught.message : 'Não foi possível comentar.');
    } finally {
      setCommentSaving(false);
    }
  }

  async function removeComment(commentId: string) {
    setCommentError('');
    try {
      await onDeleteComment(post.id, commentId);
    } catch (caught) {
      setCommentError(caught instanceof Error ? caught.message : 'Não foi possível excluir o comentário.');
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-premium">
      <header className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-sidebar text-sm font-bold text-primary">
            {post.author.photoUrl ? <img alt={post.author.name} className="h-full w-full object-cover" src={resolveFeedMediaUrl(post.author.photoUrl) ?? post.author.photoUrl} /> : initials || <UserRound size={18} />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{post.author.name}</p>
            <p className="text-xs text-muted">{post.author.role === 'TRAINER' ? 'Treinador' : 'Atleta'} · {new Date(post.createdAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>
        {post.canDelete && (
          <button aria-label="Excluir publicação" className="btn-ghost h-10 w-10 p-0 text-danger" onClick={() => onDelete(post.id)} type="button">
            <Trash2 size={17} />
          </button>
        )}
      </header>

      {mediaUrl && post.mediaType === 'IMAGE' && <img alt="Mídia da publicação" className="max-h-[720px] w-full bg-black object-contain" loading="lazy" src={mediaUrl} />}
      {mediaUrl && post.mediaType === 'VIDEO' && <FeedVideo src={mediaUrl} />}

      <div className="space-y-4 p-4">
        {post.mediaType === 'VIDEO' && <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Video size={14} />Vídeo curto</p>}
        {post.caption && <PostCaption authorName={post.author.name} caption={post.caption} />}

        <div className="flex items-center gap-4 border-t border-border pt-3 text-sm text-muted">
          <button className={`inline-flex items-center gap-2 font-semibold transition ${post.likedByMe ? 'text-red-300' : 'hover:text-foreground'}`} onClick={() => onLike(post.id)} type="button">
            <Heart className={post.likedByMe ? 'fill-current' : ''} size={20} /> {post.likesCount}
          </button>
          <button className="inline-flex items-center gap-2 font-semibold transition hover:text-foreground" onClick={() => setCommentsOpen((current) => !current)} type="button">
            <MessageCircle size={20} /> {post.commentsCount} comentário{post.commentsCount === 1 ? '' : 's'}
          </button>
        </div>

        {post.commentsCount > 1 && !commentsOpen && (
          <button className="text-sm font-semibold text-primary" onClick={() => setCommentsOpen(true)} type="button">
            Ver todos os comentários
          </button>
        )}

        {visibleComments.length > 0 && (
          <div className="space-y-3 rounded-2xl bg-sidebar/70 p-3">
            {visibleComments.map((comment) => (
              <FeedCommentRow comment={comment} key={comment.id} onDelete={removeComment} />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-sidebar p-2">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-disabled"
              maxLength={maxComment}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submitComment();
                }
              }}
              placeholder="Adicione um comentário..."
              value={commentText}
            />
            <button aria-label="Enviar comentário" className="btn-primary h-9 w-9 p-0" disabled={commentSaving || !commentText.trim()} onClick={submitComment} type="button">
              <Send size={16} />
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between px-2 text-xs">
            <span className="text-red-200">{commentError}</span>
            <span className="text-muted">{commentText.length}/{maxComment}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedCommentRow({ comment, onDelete }: { comment: FeedComment; onDelete: (commentId: string) => void }) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-bold text-primary">
        {comment.author.photoUrl
          ? <img alt={comment.author.name} className="h-full w-full object-cover" src={resolveFeedMediaUrl(comment.author.photoUrl) ?? comment.author.photoUrl} />
          : comment.author.name.slice(0, 1).toUpperCase() || <UserRound size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words leading-6 text-muted [overflow-wrap:anywhere]">
          <span className="font-semibold text-foreground">{comment.author.name}</span>{' '}
          {comment.text}
        </p>
        <p className="text-xs text-disabled">{new Date(comment.createdAt).toLocaleString('pt-BR')}</p>
      </div>
      {comment.canDelete && (
        <button aria-label="Excluir comentário" className="btn-ghost h-8 w-8 shrink-0 p-0 text-danger" onClick={() => onDelete(comment.id)} type="button">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function FeedVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6 && !ended) {
          void video.play().catch(() => undefined);
          return;
        }
        video.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [ended]);

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }

  return (
    <div className="relative bg-black">
      <video
        className="max-h-[720px] w-full"
        controls
        muted
        onEnded={() => setEnded(true)}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {ended && (
        <button
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 px-5 py-3 text-sm font-semibold text-white shadow-premium backdrop-blur transition hover:bg-black"
          onClick={replay}
          type="button"
        >
          Replay
        </button>
      )}
    </div>
  );
}

function PostCaption({ authorName, caption }: { authorName: string; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = caption.length > 140 || caption.split(/\r?\n/).length > 2;
  const preview = useMemo(() => {
    if (!shouldCollapse || expanded) return caption;
    const firstTwoLines = caption.split(/\r?\n/).slice(0, 2).join('\n');
    return firstTwoLines.length > 140 ? `${firstTwoLines.slice(0, 140).trimEnd()}...` : firstTwoLines;
  }, [caption, expanded, shouldCollapse]);

  return (
    <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">
      <span className="font-semibold text-foreground">{authorName}</span>{' '}
      {preview}
      {!expanded && shouldCollapse && (
        <button className="ml-1 font-semibold text-primary" onClick={() => setExpanded(true)} type="button">... mais</button>
      )}
    </p>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-96 w-full rounded-3xl" />
      <div className="skeleton h-80 w-full rounded-3xl" />
    </div>
  );
}

function validateFileName(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  const extension = parts.at(-1);
  if (!extension || blockedExtensions.includes(extension)) throw new Error('Extensão de arquivo não permitida.');
  const suspiciousExtensions = parts.slice(1, -1);
  if (suspiciousExtensions.some((part) => blockedExtensions.includes(part))) {
    throw new Error('Arquivos com dupla extensão perigosa não são permitidos.');
  }
}

function validateVideoDuration(file: File) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(video.duration) && video.duration > 15) {
        reject(new Error('Vídeo deve ter no máximo 15 segundos.'));
        return;
      }
      resolve();
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível validar a duração do vídeo.'));
    };
    video.src = url;
  });
}
