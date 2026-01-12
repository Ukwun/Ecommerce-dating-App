import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const mockNotifications = [
  { id: '1', title: 'Order Shipped', message: 'Your order #ORD-456ABC has been shipped.', time: '2 hours ago', icon: 'truck-delivery', color: '#3B82F6', read: false },
  { id: '2', title: 'Price Drop', message: 'The iPhone 14 you liked is now 10% off!', time: '5 hours ago', icon: 'tag', color: '#10B981', read: false },
  { id: '3', title: 'New Message', message: 'John sent you a message about "MacBook Pro".', time: '1 day ago', icon: 'message', color: '#8B5CF6', read: true },
  { id: '4', title: 'Welcome!', message: 'Thanks for joining Facebook Marketplace.', time: '2 days ago', icon: 'party-popper', color: '#F59E0B', read: true },
];

export default function NotificationsScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.notificationItem, !item.read && styles.unreadItem]}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockNotifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  markAllText: { color: '#FF8C00', fontWeight: '600', fontSize: 14 },
  list: { padding: 16 },
  notificationItem: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  unreadItem: { backgroundColor: '#FFF7ED', borderLeftWidth: 3, borderLeftColor: '#FF8C00' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contentContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  time: { fontSize: 12, color: '#6B7280' },
  message: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8C00', marginLeft: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
});