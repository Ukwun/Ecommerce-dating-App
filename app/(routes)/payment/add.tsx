import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

type CardFormData = {
  cardHolderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isDefault: boolean;
};

// Mock API call
const addPaymentMethod = async (data: CardFormData) => {
  console.log('Adding new card:', data);
  // Simulate network delay
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
};

export default function AddPaymentMethodScreen() {
  const { control, handleSubmit, formState: { errors, isValid }, watch } = useForm<CardFormData>({
    mode: 'onChange',
    defaultValues: { cardHolderName: '', cardNumber: '', expiryDate: '', cvv: '', isDefault: false },
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addPaymentMethod,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Card Added Successfully!' });
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      router.back();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Failed to add card', text2: error.message });
    },
  });

  const onSubmit = (data: CardFormData) => {
    mutation.mutate(data);
  };

  const formatCardNumber = (text: string) => {
    return text.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (text: string) => {
    if (text.length === 2 && !text.includes('/')) {
      return `${text}/`;
    }
    return text;
  };

  const renderInput = (name: keyof CardFormData, placeholder: string, keyboardType: 'default' | 'numeric' = 'default', maxLength?: number, formatter?: (text: string) => string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: `${placeholder} is required.` }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            placeholder={`Enter ${placeholder.toLowerCase()}`}
            onBlur={onBlur}
            onChangeText={(text) => onChange(formatter ? formatter(text) : text)}
            value={value as string}
            keyboardType={keyboardType}
            maxLength={maxLength}
            secureTextEntry={name === 'cvv'}
          />
        )}
      />
      {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Card</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.cardPreview}>
          <MaterialCommunityIcons name="credit-card-chip" size={40} color="#FFD700" />
          <Text style={styles.cardPreviewNumber}>{watch('cardNumber') || '**** **** **** ****'}</Text>
          <View style={styles.cardPreviewBottom}>
            <Text style={styles.cardPreviewName}>{watch('cardHolderName') || 'CARDHOLDER NAME'}</Text>
            <Text style={styles.cardPreviewExpiry}>{watch('expiryDate') || 'MM/YY'}</Text>
          </View>
        </View>

        {renderInput('cardHolderName', 'Cardholder Name')}
        {renderInput('cardNumber', 'Card Number', 'numeric', 19, formatCardNumber)}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>{renderInput('expiryDate', 'Expiry Date (MM/YY)', 'numeric', 5, formatExpiryDate)}</View>
          <View style={{ flex: 1 }}>{renderInput('cvv', 'CVV', 'numeric', 3)}</View>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Set as default payment method</Text>
          <Controller
            control={control}
            name="isDefault"
            render={({ field: { onChange, value } }) => (
              <Switch
                trackColor={{ false: '#767577', true: '#FFC107' }}
                thumbColor={value ? '#FF8C00' : '#f4f3f4'}
                onValueChange={onChange}
                value={value}
              />
            )}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || mutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || mutation.isPending}
        >
          <Text style={styles.submitButtonText}>{mutation.isPending ? 'Saving...' : 'Save Card'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scrollContainer: { padding: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputGroup: { marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#FF8C00', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#FDBA74' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardPreview: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    height: 180,
    justifyContent: 'space-between',
  },
  cardPreviewNumber: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardPreviewName: {
    color: '#D1D5DB',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  cardPreviewExpiry: {
    color: '#D1D5DB',
    fontSize: 14,
  },
});