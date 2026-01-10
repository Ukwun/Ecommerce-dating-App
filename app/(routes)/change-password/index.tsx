import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { LinearGradient } from 'expo-linear-gradient';

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const changePassword = async (data: Omit<PasswordFormData, 'confirmPassword'>) => {
  // This now uses your real axios instance to make a backend call.
  // Your backend just needs to implement the '/auth/api/change-password' endpoint.
  const response = await axiosInstance.post('/auth/api/change-password', data);
  return response.data;
};

export default function ChangePasswordScreen() {
  const { control, handleSubmit, watch, formState: { errors, isValid } } = useForm<PasswordFormData>({
    mode: 'onChange',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const newPassword = watch('newPassword');

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password Updated!', text2: 'You can now use your new password to log in.' });
      router.back();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message });
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    mutation.mutate(data);
  };

  const renderInput = (
    name: keyof PasswordFormData,
    placeholder: string,
    secure: boolean,
    toggleSecure: () => void,
    rules: object = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <View style={[styles.inputContainer, errors[name] && styles.inputError]}>
        <Controller
          control={control}
          name={name}
          rules={rules}
          render={({ field: { onChange, onBlur, value } }: { field: { onChange: (text: string) => void; onBlur: () => void; value: string } }) => (
            <TextInput
              style={styles.input}
              placeholder={`Enter your ${placeholder.toLowerCase()}`}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry={!secure}
              autoCapitalize="none"
            />
          )}
        />
        <TouchableOpacity onPress={toggleSecure}>
          <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
    </View>
  );

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            {renderInput('currentPassword', 'Current Password', showCurrentPassword, () => setShowCurrentPassword(!showCurrentPassword), { required: 'Current password is required.' })}
            {renderInput('newPassword', 'New Password', showNewPassword, () => setShowNewPassword(!showNewPassword), {
              required: 'New password is required.',
              minLength: { value: 8, message: 'Password must be at least 8 characters long.' },
            })}
            {renderInput('confirmPassword', 'Confirm New Password', showNewPassword, () => setShowNewPassword(!showNewPassword), {
              required: 'Please confirm your new password.',
              validate: (value: string) => value === newPassword || 'The passwords do not match.',
            })}

            <TouchableOpacity
              style={[styles.submitButton, (!isValid || mutation.isPending) && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
  scrollContainer: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  formContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputGroup: { marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 50, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', marginTop: 4, fontSize: 13 },
  submitButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#FDBA74',
  },
  submitButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 'bold',
  },
});