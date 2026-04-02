import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.100:5000';

const CATEGORIES = [
  { id: 'order_issue', label: 'Order Issue', icon: '📦' },
  { id: 'payment_issue', label: 'Payment Issue', icon: '💳' },
  { id: 'product_quality', label: 'Product Quality', icon: '⭐' },
  { id: 'return_refund', label: 'Return/Refund', icon: '↩️' },
  { id: 'shipping_delivery', label: 'Shipping/Delivery', icon: '🚚' },
  { id: 'seller_issue', label: 'Seller Issue', icon: '⚠️' },
  { id: 'account_issue', label: 'Account Issue', icon: '👤' },
  { id: 'technical_issue', label: 'Technical Issue', icon: '🔧' },
  { id: 'other', label: 'Other', icon: '💬' },
];

export default function SupportCreateScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Fetch user's orders for context
  const { data: orders } = useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/marketplace/api/orders?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.orders || [];
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem('userToken');
      return axios.post(
        `${API_BASE_URL}/support/api/tickets`,
        {
          category,
          subject,
          message,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: (response) => {
      Alert.alert(
        'Success',
        `Support ticket created. Ticket number: ${response.data.ticketNumber}`,
        [
          {
            text: 'View Ticket',
            onPress: () => router.push('/(routes)/(customer)/support/chat'),
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert('Error', (error as any)?.response?.data?.message || 'Failed to create ticket');
    },
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Category Selection */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.sectionTitle}>What is your issue about?</ThemedText>

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                category === cat.id && { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
              <ThemedText style={styles.categoryLabel} numberOfLines={2}>
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {category && (
        <>
          {/* Subject */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.sectionTitle}>Subject</ThemedText>

            <TextInput
              style={[
                styles.input,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholder="Brief subject of your issue..."
              placeholderTextColor="#999"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Message */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.sectionTitle}>Describe Your Issue</ThemedText>

            <TextInput
              style={[
                styles.messageInput,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholder="Please provide details about your issue. The more details you provide, the better we can help..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Helpful Links */}
          {category === 'return_refund' && (
            <View style={[styles.section, { backgroundColor: '#FEF3C7' }]}>
              <ThemedText style={styles.helpfulTitle}>💡 Did you know?</ThemedText>
              <ThemedText style={styles.helpfulText}>
                You can request a return directly from your orders. Check the Returns section to start a return request.
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(routes)/(customer)/returns/request')}>
                <ThemedText style={styles.linkText}>Open Returns →</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {category === 'order_issue' && (
            <View style={[styles.section, { backgroundColor: '#E0F2FE' }]}>
              <ThemedText style={styles.helpfulTitle}>🔍 Troubleshooting Tips</ThemedText>
              <ThemedText style={styles.helpfulText}>
                • Check your order status in the Orders section
              </ThemedText>
              <ThemedText style={styles.helpfulText}>
                • Wait 24 hours for seller confirmation
              </ThemedText>
              <ThemedText style={styles.helpfulText}>
                • Contact the seller using the chat feature
              </ThemedText>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
              !subject || !message ? { opacity: 0.5 } : {},
            ]}
            onPress={() => {
              if (!subject || !message) {
                Alert.alert('Error', 'Please fill in all fields');
                return;
              }
              createTicketMutation.mutate();
            }}
            disabled={
              !subject || !message || createTicketMutation.isPending
            }
          >
            <ThemedText style={styles.submitButtonText}>
              {createTicketMutation.isPending
                ? 'Creating Ticket...'
                : 'Create Support Ticket'}
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginVertical: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helpfulTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpfulText: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 6,
    lineHeight: 18,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 8,
  },
  submitButton: {
    marginHorizontal: 10,
    marginVertical: 15,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
