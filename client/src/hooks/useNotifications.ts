import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type Notification = {
  id: number;
  type: string;
  actorName: string | null;
  read: boolean;
  createdAt: string;
};

type NotifResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export const NOTIF_TYPE_LABELS: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your highlight',
  follow: 'started following you',
  mention: 'mentioned you',
  coach_interest: 'is interested in your profile',
  message_request: 'sent you a message request',
  ranking_change: 'Your ranking changed',
  subscription: 'Your subscription was updated',
};

export function useNotifications(enabled = true) {
  const qc = useQueryClient();

  const query = useQuery<NotifResponse>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<NotifResponse>('/api/notifications'),
    refetchInterval: 30_000,
    enabled,
    retry: false,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch('/api/notifications/mark-read', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneRead = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/notifications/mark-read/${id}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    markAllRead: markAllRead.mutate,
    markOneRead: markOneRead.mutate,
  };
}
