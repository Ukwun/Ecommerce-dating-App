import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, useUnreadNotifications, useMarkNotificationAsRead, useDeleteNotification } from '../../hooks/useNotifications';

interface NotificationBadgeProps {
  onPress?: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onPress }) => {
  const { data: unreadCount = 0 } = useUnreadNotifications();

  return (
    <TouchableOpacity onPress={onPress} style={styles.badgeContainer}>
      <Ionicons name="notifications" size={24} color="#007AFF" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface NotificationItemProps {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  onPress?: () => void;
  onDelete?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  body,
  isRead,
  createdAt,
  onPress,
  onDelete,
}) => {
  const markAsRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();

  const handlePress = () => {
    if (!isRead) {
      markAsRead.mutate(id);
    }
    onPress?.();
  };

  const handleDelete = () => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: () => deleteNotification.mutate(id),
        style: 'destructive',
      },
    ]);
  };

  const date = new Date(createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !isRead && styles.unreadNotification]}
      onPress={handlePress}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>
      <TouchableOpacity
        onPress={handleDelete}
        style={styles.deleteButton}
      >
        <Ionicons name="close-circle" size={20} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

interface NotificationsListProps {
  isRead?: boolean;
  type?: string;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({
  isRead,
  type,
}) => {
  const { data: notifications = [], isLoading, error } = useNotifications(1, 30, isRead, type);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>Failed to load notifications</Text>
      </View>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="mail-open" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No notifications</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <NotificationItem
          id={item._id}
          title={item.title}
          body={item.body}
          isRead={item.isRead}
          createdAt={item.createdAt}
        />
      )}
      contentContainerStyle={styles.listContainer}
      scrollEnabled={false}
    />
  );
};

// Helper function
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ccc',
  },
  unreadNotification: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#007AFF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  body: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  timeAgo: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  deleteButton: {
    padding: 4,
  },
  listContainer: {
    paddingVertical: 10,
  },
  error: {
    color: '#F44336',
    fontSize: 14,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12,
  },
});
