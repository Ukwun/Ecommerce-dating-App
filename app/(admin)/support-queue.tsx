import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_URI ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://marketplace-backend.railway.app';

export default function SupportQueueScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Fetch support tickets
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['admin-tickets', priorityFilter],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const params = priorityFilter !== 'all' ? `?priority=${priorityFilter}` : '';
      const response = await axios.get(
        `${API_BASE_URL}/admin/api/support-tickets${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.tickets || [];
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (payload: { ticketId: string; message: string }) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/admin/api/support-tickets/${payload.ticketId}/reply`,
        { message: payload.message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      setShowReplyModal(false);
      setReplyMessage('');
      Alert.alert('Success', 'Reply sent to customer');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send reply');
    },
  });

  // Close ticket mutation
  const closeMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.put(
        `${API_BASE_URL}/admin/api/support-tickets/${ticketId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      refetch();
      setSelectedTicket(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to close ticket');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  const priorityCounts = {
    urgent: tickets?.filter((t: any) => t.priority === 'urgent').length || 0,
    high: tickets?.filter((t: any) => t.priority === 'high').length || 0,
    medium: tickets?.filter((t: any) => t.priority === 'medium').length || 0,
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Priority Summary */}
        <View style={styles.summaryContainer}>
          <SummaryCard
            label="🚨 Urgent"
            count={priorityCounts.urgent}
            color="#EF4444"
            onPress={() => setPriorityFilter(priorityCounts.urgent > 0 ? 'urgent' : 'all')}
          />
          <SummaryCard
            label="⚠️ High"
            count={priorityCounts.high}
            color="#F59E0B"
            onPress={() => setPriorityFilter(priorityCounts.high > 0 ? 'high' : 'all')}
          />
          <SummaryCard
            label="ℹ️ Medium"
            count={priorityCounts.medium}
            color="#3B82F6"
            onPress={() => setPriorityFilter(priorityCounts.medium > 0 ? 'medium' : 'all')}
          />
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => setPriorityFilter('all')}
          >
            <ThemedText style={styles.clearText}>Clear Filter</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Tickets List */}
        {tickets?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>✅ All tickets resolved!</ThemedText>
          </View>
        ) : (
          tickets?.map((ticket: any) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              onReply={() => {
                setSelectedTicket(ticket);
                setShowReplyModal(true);
              }}
              onClose={() => {
                Alert.alert('Close Ticket?', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Close',
                    onPress: () => closeMutation.mutate(ticket._id),
                    style: 'destructive',
                  },
                ]);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Reply to Ticket #{(selectedTicket as any)?.ticketNumber}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <ThemedText style={styles.closeButton}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.replyInput,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholder="Type your reply..."
              placeholderTextColor="#999"
              value={replyMessage}
              onChangeText={setReplyMessage}
              multiline
              numberOfLines={5}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#E5E7EB' }]}
                onPress={() => setShowReplyModal(false)}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#3B82F6' }]}
                onPress={() =>
                  replyMutation.mutate({
                    ticketId: (selectedTicket as any)?._id,
                    message: replyMessage,
                  })
                }
                disabled={!replyMessage.trim() || replyMutation.isPending}
              >
                <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                  {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SummaryCard({ label, count, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.summaryCard, { backgroundColor: color + '20' }]} onPress={onPress}>
      <ThemedText style={[styles.summaryLabel, { color }]}>{label}</ThemedText>
      <ThemedText style={[styles.summaryCount, { color }]}>{count}</ThemedText>
    </TouchableOpacity>
  );
}

function TicketCard({ ticket, onReply, onClose }: any) {
  const theme = useTheme();
  const priorityColors = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#10B981',
  };

  const priority = (ticket as any)?.priority as string;
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.ticketHeader}>
        <View>
          <ThemedText style={styles.ticketNumber}>
            Ticket #{ticket.ticketNumber}
          </ThemedText>
          <ThemedText style={styles.category}>{ticket.category}</ThemedText>
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: (priorityColors as any)[priority] + '30' },
          ]}
        >
          <ThemedText
            style={[styles.priorityText, { color: (priorityColors as any)[priority] }]}
          >
            {ticket.priority}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.subject} numberOfLines={2}>
        {ticket.messages[0]?.message || 'No subject'}
      </ThemedText>

      <View style={styles.meta}>
        <ThemedText style={styles.metaText}>
          👤 {ticket.userId?.firstName} {ticket.userId?.lastName}
        </ThemedText>
        <ThemedText style={styles.metaText}>
          💬 {ticket.messages?.length || 0} messages
        </ThemedText>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F3F4F6' }]}
          onPress={onReply}
        >
          <ThemedText style={styles.actionText}>💬 Reply</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
          onPress={onClose}
        >
          <ThemedText style={[styles.actionText, { color: '#EF4444' }]}>
            ✓ Close
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  summaryCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  clearFilter: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    opacity: 0.6,
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subject: {
    fontSize: 13,
    marginVertical: 8,
    opacity: 0.8,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
