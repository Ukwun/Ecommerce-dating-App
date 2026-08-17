import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import axiosInstance from '@/utils/axiosinstance';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

/**
 * REAL-TIME NOTIFICATIONS SYSTEM
 * Handles order updates, messages, matches, promotions
 * with smart notification grouping and priority
 */

interface Notification {
  id: string;
  type: 'order' | 'message' | 'match' | 'promotion' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
}

export default function useRealTimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<any>(null);
  const notificationListenerRef = useRef<any>(null);

  // Initialize notifications
  useEffect(() => {
    if (!user) return;

    // Request notification permissions
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📱 [NOTIFICATION] Received:', notification.request.content.title);
        return {
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Listen for incoming notifications
    notificationListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notification = response.notification.request.content;
        handleNotificationTap(notification.data);
      }
    );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
    };
  }, [user]);

  // Track notification received
  const handleNotificationReceived = useCallback((notification: any) => {
    const newNotification: Notification = {
      id: notification.id || Date.now().toString(),
      type: notification.type || 'system',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: false,
      timestamp: Date.now(),
      priority: notification.priority || 'normal'
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast for critical notifications
    if (newNotification.priority === 'high') {
      Toast.show({
        type: 'success',
        text1: newNotification.title,
        text2: newNotification.body,
        visibilityTime: 4000
      });
    }
  }, []);

  // Handle notification tap
  const handleNotificationTap = useCallback((data: any) => {
    console.log('👆 [NOTIFICATION] Tapped:', data);
    const path = data?.path;
    if (typeof path === 'string' && path.startsWith('/')) router.push(path as any);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Delete notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Send test notification
  const sendTestNotification = useCallback(async (title: string, body: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type: 'system',
      title,
      body,
      read: false,
      timestamp: Date.now(),
      priority: 'normal'
    };
    handleNotificationReceived(notification);
  }, [handleNotificationReceived]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    sendTestNotification,
    handleNotificationReceived
  };
}
