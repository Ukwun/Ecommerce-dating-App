import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import axiosInstance from '@/utils/axiosinstance';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) return Alert.alert('Invalid link', 'Request a new password reset link.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return Alert.alert('Choose a stronger password', 'Use at least 8 characters with a letter and number.');
    }
    if (password !== confirmation) return Alert.alert('Passwords do not match', 'Enter the same password twice.');
    try {
      setLoading(true);
      await axiosInstance.put(`/auth/api/reset-password/${encodeURIComponent(token)}`, { password });
      Alert.alert('Password changed', 'You can now sign in with your new password.', [
        { text: 'Sign in', onPress: () => router.replace('/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Reset failed', error?.response?.data?.error || 'Request a new reset link and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
          <View style={styles.icon}><Ionicons name="lock-closed" size={30} color="#FF8C00" /></View>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>This secure link works once and expires after 15 minutes.</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry={!visible} placeholder="New password" autoCapitalize="none" />
            <TouchableOpacity onPress={() => setVisible(value => !value)} accessibilityLabel={visible ? 'Hide password' : 'Show password'}><Ionicons name={visible ? 'eye-off' : 'eye'} size={22} color="#6B7280" /></TouchableOpacity>
          </View>
          <TextInput style={styles.confirm} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} placeholder="Confirm new password" autoCapitalize="none" />
          <TouchableOpacity onPress={submit} disabled={loading} style={[styles.button, loading && styles.disabled]} accessibilityRole="button">
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update password</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/forgot-password')} style={styles.link}><Text style={styles.linkText}>Request another link</Text></TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7ED' }, center: { flex: 1, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },
  icon: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' }, subtitle: { color: '#6B7280', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, paddingHorizontal: 16 }, input: { flex: 1, paddingVertical: 16, fontSize: 16 },
  confirm: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, marginTop: 14 },
  button: { backgroundColor: '#FF8C00', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 }, disabled: { opacity: 0.6 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { alignItems: 'center', paddingTop: 18 }, linkText: { color: '#C2410C', fontWeight: '700' },
});
