import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';

interface Notification {
  _id: string;
  type: 'order' | 'match' | 'message' | 'promo' | 'review';
  title: string;
  description: string;
  icon: string;
  color: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'orders' | 'social'>('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/marketplace/api/notifications', {
        params: { limit: 50 },
      });
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await axiosInstance.put(`/marketplace/api/notifications/${notificationId}/read`);
      setNotifications(
        notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await axiosInstance.delete(`/marketplace/api/notifications/${notificationId}`);
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      Toast.show({
        type: 'success',
        text1: 'Notification Deleted',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Delete',
        text2: 'Please try again',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.post('/marketplace/api/notifications/read-all');
      setNotifications(
        notifications.map((n) => ({ ...n, read: true }))
      );
      Toast.show({
        type: 'success',
        text1: 'All Marked as Read',
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification._id);

    if (notification.type === 'order') {
      router.push({
        pathname: '/(routes)/my-orders/[orderId]',
        params: { orderId: notification.data?.orderId },
      });
    } else if (notification.type === 'match') {
      router.push('/(tabs)/matches');
    } else if (notification.type === 'message') {
      router.push('/(tabs)/messages');
    } else if (notification.type === 'promo') {
      router.push('/');
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'orders':
        return notifications.filter((n) => n.type === 'order');
      case 'social':
        return notifications.filter((n) =>
          ['match', 'message', 'review'].includes(n.type)
        );
      default:
        return notifications;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  const renderNotificationCard = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30)} className="px-4 mb-3">
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => deleteNotification(item._id)}
        activeOpacity={0.7}
        className={`rounded-xl p-4 flex-row items-start gap-3 border border-gray-200 ${
          !item.read ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        {/* Icon */}
        <LinearGradient
          colors={[item.color, item.color + '80']}
          className="w-12 h-12 rounded-full justify-center items-center"
        >
          <Ionicons
            name={item.icon as any}
            size={20}
            color="white"
          />
        </LinearGradient>

        {/* Content */}
        <View className="flex-1 pt-1">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="font-bold text-gray-900 flex-1">{item.title}</Text>
            {!item.read && (
              <View className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
            )}
          </View>
          <Text className="text-sm text-gray-600 leading-5">
            {item.description}
          </Text>
          <Text className="text-xs text-gray-400 mt-2">
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* More Options */}
        <TouchableOpacity
          onPress={() => deleteNotification(item._id)}
          className="p-1"
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-100">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-3xl font-bold text-gray-900">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-sm text-gray-500 mt-1">
                {unreadCount} unread
              </Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="bg-blue-100 px-3 py-2 rounded-lg"
            >
              <Text className="text-blue-600 font-semibold text-xs">
                Mark All Read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Settings Toggle */}
        <View className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="notifications" size={18} color="#6B7280" />
            <Text className="text-gray-700 font-semibold">Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#D1D5DB', true: '#A3E635' }}
            thumbColor={notificationsEnabled ? '#10B981' : '#6B7280'}
          />
        </View>
      </View>

      {/* Filters */}
      <View className="px-4 py-3 border-b border-gray-100 flex-row gap-2">
        {(['all', 'unread', 'orders', 'social'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-4 py-2 rounded-full ${
              filter === f
                ? 'bg-blue-500'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-semibold capitalize ${
                filter === f
                  ? 'text-white'
                  : 'text-gray-700'
              }`}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons name="bell-outline" size={80} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-900 text-center mt-4 mb-2">
            {filter === 'all'
              ? 'No Notifications Yet'
              : `No ${filter} Notifications`}
          </Text>
          <Text className="text-gray-600 text-center">
            {filter === 'all'
              ? 'You\'re all caught up!'
              : 'Check back later for updates'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          scrollEnabled
          refreshing={loading}
          onRefresh={fetchNotifications}
        />
      )}
    </SafeAreaView>
  );
}
