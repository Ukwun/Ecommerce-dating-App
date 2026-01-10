import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const trackingData = [
  { status: 'Order Placed', date: 'Oct 22, 2023, 10:00 AM', icon: 'package-variant' as const, completed: true },
  { status: 'Processing', date: 'Oct 22, 2023, 11:30 AM', icon: 'cogs' as const, completed: true },
  { status: 'Shipped', date: 'Oct 24, 2023, 02:00 PM', icon: 'truck-fast' as const, completed: true },
  { status: 'Out for Delivery', date: 'Oct 26, 2023, 09:00 AM', icon: 'map-marker-path' as const, completed: false },
  { status: 'Delivered', date: '', icon: 'check-circle' as const, completed: false },
];

const TrackingItem = ({ item, isLast }: { item: typeof trackingData[0], isLast: boolean }) => (
  <View style={styles.trackingItem}>
    <View style={styles.iconColumn}>
      <View style={[styles.iconContainer, item.completed && styles.iconCompleted]}>
        <MaterialCommunityIcons name={item.icon} size={24} color={item.completed ? '#fff' : '#4B5563'} />
      </View>
      {!isLast && <View style={[styles.line, item.completed && styles.lineCompleted]} />}
    </View>
    <View style={styles.detailsColumn}>
      <Text style={[styles.statusText, item.completed && styles.statusCompleted]}>{item.status}</Text>
      <Text style={styles.dateText}>{item.date}</Text>
    </View>
  </View>
);

export default function TrackOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryOrderId}>Order ID: {orderId}</Text>
            <Text style={styles.summaryText}>Estimated Delivery: Oct 27, 2023</Text>
          </View>

          <View style={styles.trackingContainer}>
            {trackingData.map((item, index) => (
              <TrackingItem key={index} item={item} isLast={index === trackingData.length - 1} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { padding: 16 },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryOrderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4B5563',
  },
  trackingContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 20,
  },
  trackingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconColumn: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCompleted: {
    backgroundColor: '#FF8C00',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  lineCompleted: {
    backgroundColor: '#FF8C00',
  },
  detailsColumn: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 32,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusCompleted: {
    color: '#111827',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
});