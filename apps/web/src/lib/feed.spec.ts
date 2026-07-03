import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFeedComment, createFeedPost, deleteFeedComment, deleteFeedPost, listFeedPosts, resolveFeedMediaUrl, toggleFeedLike } from './feed';

describe('feed client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('[]') }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists feed posts', async () => {
    await listFeedPosts();
    expect(fetch).toHaveBeenCalledWith('/api/feed', expect.objectContaining({ credentials: 'include' }));
  });

  it('creates post with form data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"id":"post-1"}') } as Response);
    await createFeedPost({ caption: 'Treino forte' });
    expect(fetch).toHaveBeenCalledWith('/api/feed/posts', expect.objectContaining({ method: 'POST' }));
  });

  it('deletes post', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"id":"post-1"}') } as Response);
    await deleteFeedPost('post-1');
    expect(fetch).toHaveBeenCalledWith('/api/feed/posts/post-1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('creates comment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"id":"comment-1"}') } as Response);
    await createFeedComment('post-1', 'Boa');
    expect(fetch).toHaveBeenCalledWith('/api/feed/posts/post-1/comments', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: 'Boa' })
    }));
  });

  it('deletes comment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"id":"comment-1"}') } as Response);
    await deleteFeedComment('post-1', 'comment-1');
    expect(fetch).toHaveBeenCalledWith('/api/feed/posts/post-1/comments/comment-1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('toggles like', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"likedByMe":true,"likesCount":1}') } as Response);
    await toggleFeedLike('post-1');
    expect(fetch).toHaveBeenCalledWith('/api/feed/posts/post-1/like', expect.objectContaining({ method: 'POST' }));
  });

  it('resolves storage media url through API rewrite', () => {
    expect(resolveFeedMediaUrl('/storage/feed/file.jpg')).toBe('/api/storage/feed/file.jpg');
  });
});
