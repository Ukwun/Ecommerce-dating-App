import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axiosinstance';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  notificationType: 'new_product' | 'price_drop' | 'back_in_stock' | 'order_status' | 'message' | 'rating_received' | 'seller_promo' | 'personalized_recommendation' | 'loyalty_reward' | 'system';
  relatedId?: string;
  data?: Record<string, any>;
  isRead: boolean;
  isSent: boolean;
  createdAt: string;
  readAt?: string;
  sentAt?: string;
}

interface NotificationsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  pages: number;
  unreadCount: number;
  data: Notification[];
}

interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}

interface NotificationResponse {
  success: boolean;
  data: Notification;
}

export const useNotifications = (page = 1, limit = 20, isRead?: boolean, type?: string) => {
  return useQuery({
    queryKey: ['notifications', page, limit, isRead, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (isRead !== undefined) params.append('isRead', String(isRead));
      if (type) params.append('type', type);

      const { data } = await axios.get<NotificationsResponse>(
        `/marketplace/api/notifications?${params.toString()}`
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUnreadNotifications = () => {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await axios.get<UnreadCountResponse>(
        '/marketplace/api/notifications/unread'
      );
      return data.unreadCount;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
};

export const useSingleNotification = (id: string) => {
  return useQuery({
    queryKey: ['notification', id],
    queryFn: async () => {
      const { data } = await axios.get<NotificationResponse>(
        `/marketplace/api/notifications/${id}`
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.put<NotificationResponse>(
        `/marketplace/api/notifications/${id}/read`
      );
      return data.data;
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['notification', data._id] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.put(
        '/marketplace/api/notifications/read-all'
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(
        `/marketplace/api/notifications/${id}`
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
};

export const useSendNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationData: {
      userId: string;
      title: string;
      body: string;
      notificationType: string;
      relatedId?: string;
      data?: Record<string, any>;
    }) => {
      const { data } = await axios.post<NotificationResponse>(
        '/marketplace/api/notifications/send',
        notificationData
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate unread count and notifications list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
};
