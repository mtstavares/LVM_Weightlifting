import { API_URL, apiRequest } from './api-client';

export type FeedAuthor = {
  id: string;
  name: string;
  email: string;
  role: 'TRAINER' | 'ATHLETE';
  photoUrl: string | null;
};

export type FeedPost = {
  id: string;
  caption: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  videoDurationSeconds: number | null;
  createdAt: string;
  author: FeedAuthor;
  canDelete: boolean;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  comments: FeedComment[];
};

export type FeedComment = {
  id: string;
  text: string;
  createdAt: string;
  author: FeedAuthor;
  canDelete: boolean;
};

export function resolveFeedMediaUrl(url: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_URL}${url}`;
}

export function listFeedPosts() {
  return apiRequest<FeedPost[]>('/feed');
}

export function createFeedPost(input: { caption?: string; media?: File }) {
  const formData = new FormData();
  if (input.caption) formData.set('caption', input.caption);
  if (input.media) formData.set('media', input.media);
  return apiRequest<FeedPost>('/feed/posts', {
    method: 'POST',
    body: formData
  });
}

export function deleteFeedPost(postId: string) {
  return apiRequest<{ id: string; deletedAt: string }>(`/feed/posts/${postId}`, {
    method: 'DELETE'
  });
}

export function createFeedComment(postId: string, text: string) {
  return apiRequest<FeedComment>(`/feed/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

export function deleteFeedComment(postId: string, commentId: string) {
  return apiRequest<{ id: string; deletedAt: string }>(`/feed/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE'
  });
}

export function toggleFeedLike(postId: string) {
  return apiRequest<{ likedByMe: boolean; likesCount: number }>(`/feed/posts/${postId}/like`, {
    method: 'POST'
  });
}
