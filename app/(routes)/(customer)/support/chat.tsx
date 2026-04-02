import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.100:5000';

export default function SupportChatScreen() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch tickets
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/support/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.tickets || [];
    },
    enabled: isFocused,
  });

  // Fetch detailed ticket
  const { data: ticketDetail, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ['ticket-detail', (selectedTicket as any)?._id],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE_URL}/support/api/tickets/${(selectedTicket as any)?._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    enabled: !!selectedTicket,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/support/api/tickets/${(selectedTicket as any)?._id}/messages`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      setNewMessage('');
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send message');
    },
  });

  // Close ticket mutation
  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.put(
        `${API_BASE_URL}/support/api/tickets/${(selectedTicket as any)?._id}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      Alert.alert('Success', 'Ticket closed');
      setSelectedTicket(null);
      refetch();
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

  // Split view: Tickets list and chat
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!selectedTicket ? (
        // Tickets List View
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {tickets?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyIcon}>💬</ThemedText>
              <ThemedText style={styles.emptyText}>No support tickets</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Create a ticket if you need help
              </ThemedText>
            </View>
          ) : (
            tickets?.map((ticket: any) => (
              <TicketListItem
                key={ticket._id}
                ticket={ticket}
                onPress={() => setSelectedTicket(ticket)}
              />
            ))
          )}
        </ScrollView>
      ) : (
        // Chat View
        <View style={styles.chatContainer}>
          {/* Header */}
          <View
            style={[
              styles.chatHeader,
              { backgroundColor: theme.colors.primary, borderBottomColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => setSelectedTicket(null)}>
              <ThemedText style={styles.backButton}>← Back</ThemedText>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <ThemedText style={styles.ticketNumber}>
                #{ticketDetail?.ticketNumber || (selectedTicket as any)?.ticketNumber}
              </ThemedText>
              <ThemedText style={styles.ticketStatus}>
                {ticketDetail?.status || '...'}
              </ThemedText>
            </View>
          </View>

          {/* Error State */}
          {ticketError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
              <ThemedText style={styles.errorText}>Failed to load ticket</ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => setSelectedTicket(null)}
              >
                <ThemedText style={styles.retryText}>Back to Tickets</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
          {/* Messages */}
          <FlatList
            data={ticketDetail?.messages || []}
            renderItem={({ item }) => (
              <MessageBubble message={item} />
            )}
            keyExtractor={(item, index) => index.toString()}
            inverted
            contentContainerStyle={styles.messagesList}
          />

          {/* Input */}
          {ticketDetail?.status !== 'closed' && (
            <View
              style={[
                styles.inputContainer,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TextInput
                style={[
                  styles.messageInput,
                  { color: theme.colors.text },
                ]}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                onPress={() => {
                  if (newMessage.trim()) {
                    sendMessageMutation.mutate(newMessage);
                  }
                }}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                style={styles.sendButton}
              >
                <ThemedText style={styles.sendIcon}>
                  {sendMessageMutation.isPending ? '⏳' : '📤'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          {ticketDetail?.status !== 'closed' && !ticketError && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  Alert.alert('Close Ticket?', 'Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Close',
                      onPress: () => closeTicketMutation.mutate(),
                      style: 'destructive',
                    },
                  ]);
                }}
              >
                <ThemedText style={styles.actionButtonText}>
                  Close Ticket
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function TicketListItem({ ticket, onPress }: any) {
  const theme = useTheme();
  const colors = {
    open: '#FEF3C7',
    'in-progress': '#DBEAFE',
    'waiting-customer': '#FCE7F3',
    closed: '#D1FAE5',
  };
  const ticketStatus = (ticket as any)?.status as string;
  const colorMap = colors as any;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.ticketItem, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.ticketItemContent}>
        <ThemedText style={styles.ticketItemNumber}>
          Ticket #{ticket.ticketNumber}
        </ThemedText>
        <ThemedText style={styles.ticketItemCategory}>
          {ticket.category}
        </ThemedText>
        <ThemedText
          style={styles.ticketItemMessage}
          numberOfLines={1}
        >
          {ticket.messages?.[0]?.message || 'No messages'}
        </ThemedText>
      </View>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: colorMap[ticketStatus] || '#E5E7EB' },
        ]}
      >
        <ThemedText style={styles.statusBadgeText}>
          {ticket.status}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

function MessageBubble({ message }: any) {
  const isCustomer = message.senderType === 'customer';

  return (
    <View
      style={[
        styles.messageBubbleContainer,
        isCustomer ? styles.messageBubbleRight : styles.messageBubbleLeft,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isCustomer ? '#3B82F6' : '#E5E7EB',
          },
        ]}
      >
        <ThemedText
          style={[
            styles.messageText,
            { color: isCustomer ? '#fff' : '#000' },
          ]}
        >
          {message.message}
        </ThemedText>
        <ThemedText
          style={[
            styles.messageTime,
            { color: isCustomer ? '#fff' : '#666' },
            { opacity: 0.7, fontSize: 10 },
          ]}
        >
          {new Date(message.createdAt).toLocaleTimeString()}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.6,
  },
  ticketItem: {
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketItemContent: {
    flex: 1,
  },
  ticketItemNumber: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  ticketItemCategory: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 6,
  },
  ticketItemMessage: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  headerInfo: {
    flex: 1,
  },
  ticketNumber: {
    color: '#fff',
    fontWeight: '600',
  },
  ticketStatus: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  messageBubbleContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageBubbleLeft: {
    justifyContent: 'flex-start',
  },
  messageBubbleRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 13,
  },
  messageTime: {
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 13,
  },
  sendButton: {
    padding: 8,
  },
  sendIcon: {
    fontSize: 18,
  },
  actions: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    padding: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
