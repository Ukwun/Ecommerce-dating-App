import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { NotificationsList } from '@/components/notifications/NotificationBell';
import { useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      Toast.show({
        type: 'success',
        text1: 'Notifications updated',
        text2: 'All notifications marked as read',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: 'Could not mark all notifications as read',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} disabled={markAllReadMutation.isPending}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <NotificationsList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  markAllText: { color: '#FF8C00', fontWeight: '600', fontSize: 14 },
});
