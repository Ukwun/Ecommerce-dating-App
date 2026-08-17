import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, SlideInUp, ZoomIn } from 'react-native-reanimated';
import useSocialAuth from '@/hooks/useSocialAuth';
import { useAuth } from '@/hooks/AuthContext';
import { AnimatedButton } from '@/components/AnimatedButton';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const signupUser = async (data: SignupFormData) => {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ecommerce-dating-app.onrender.com';
  const endpoint = `${BACKEND_URL}/auth/api/user-registration`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }

  if (!body.user || !body.accessToken) {
    throw new Error('Invalid server response');
  }

  if (!body.refreshToken) throw new Error('Server did not return a refresh token');
  return { user: body.user, accessToken: body.accessToken, refreshToken: body.refreshToken };
};

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { promptGoogle, promptFacebook, promptApple, isGoogleLoading, isFacebookLoading, isAppleLoading, isPending } = useSocialAuth();

  const signupForm = useForm<SignupFormData>({
    mode: 'onChange',
    defaultValues: { name: '', email: '', password: '', acceptedTerms: false },
  });

  const signupMutation = useMutation({
    mutationFn: signupUser,
    onSuccess: async (data: any) => {
      await login(data.user, data.accessToken, data.refreshToken);
      Toast.show({ type: 'success', text1: '✅ Account Created!', text2: 'Welcome to Marketplace' });
      router.push('/(tabs)');
    },
    onError: (error: Error) => {
      const errorMsg = error.message.includes('Network') 
        ? 'Network error - Backend not responding. Please try again.'
        : error.message;
      Toast.show({ type: 'error', text1: '❌ Sign Up Failed', text2: errorMsg, visibilityTime: 4000 });
    },
  });

  const isLoading = signupMutation.isPending || isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <AnimatedView entering={FadeInDown.delay(100).springify()} style={{ marginTop: 48, marginBottom: 32 }}>
            <Text style={styles.headerText}>Create Account</Text>
            <Text style={styles.subText}>Join millions shopping and connecting</Text>
          </AnimatedView>

          {/* Name */}
          <AnimatedView entering={SlideInUp.delay(150).springify()} style={{ marginTop: 24 }}>
            <Text style={styles.label}>Full Name</Text>
            <Controller
              control={signupForm.control}
              name="name"
              rules={{
                required: 'Name is required',
                minLength: { value: 3, message: 'Name must be at least 3 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, signupForm.formState.errors.name && styles.inputError]}>
                  <MaterialCommunityIcons name="account-outline" size={24} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              )}
            />
            {signupForm.formState.errors.name && (
              <Text style={styles.errorText}>{signupForm.formState.errors.name.message}</Text>
            )}
          </AnimatedView>

          {/* Email */}
          <AnimatedView entering={SlideInUp.delay(200).springify()} style={{ marginTop: 24 }}>
            <Text style={styles.label}>Email Address</Text>
            <Controller
              control={signupForm.control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, signupForm.formState.errors.email && styles.inputError]}>
                  <MaterialCommunityIcons name="email-outline" size={24} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>
              )}
            />
            {signupForm.formState.errors.email && (
              <Text style={styles.errorText}>{signupForm.formState.errors.email.message}</Text>
            )}
          </AnimatedView>

          {/* Password */}
          <AnimatedView entering={SlideInUp.delay(250).springify()} style={{ marginTop: 24 }}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={signupForm.control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                validate: (value) => (/[A-Za-z]/.test(value) && /\d/.test(value)) || 'Include at least one letter and number',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, signupForm.formState.errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={24} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {signupForm.formState.errors.password && (
              <Text style={styles.errorText}>{signupForm.formState.errors.password.message}</Text>
            )}
          </AnimatedView>

          <Controller
            control={signupForm.control}
            name="acceptedTerms"
            rules={{ validate: (value) => value || 'You must accept the Terms and Privacy Policy' }}
            render={({ field: { value, onChange } }) => (
              <TouchableOpacity onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 22 }} accessibilityRole="checkbox" accessibilityState={{ checked: value }}>
                <Ionicons name={value ? 'checkbox' : 'square-outline'} size={24} color={value ? '#2563EB' : '#6B7280'} />
                <Text style={{ flex: 1, marginLeft: 10, color: '#4B5563', lineHeight: 20 }}>
                  I agree to the Terms of Service and Privacy Policy.
                </Text>
              </TouchableOpacity>
            )}
          />
          {signupForm.formState.errors.acceptedTerms && <Text style={styles.errorText}>{signupForm.formState.errors.acceptedTerms.message}</Text>}

          {/* Sign Up Button */}
          <AnimatedView entering={ZoomIn.delay(300).springify()} style={{ marginTop: 32 }}>
            <AnimatedButton
              onPress={() => signupForm.handleSubmit((data) => signupMutation.mutate(data))()}
              style={[
                styles.signupButton,
                {
                  backgroundColor: signupForm.formState.isValid ? '#2563EB' : '#D1D5DB',
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
              disabled={!signupForm.formState.isValid || isLoading}
              haptic="medium"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </AnimatedButton>
          </AnimatedView>

          {/* Divider */}
          <AnimatedView entering={FadeInDown.delay(350).springify()} style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or sign up with</Text>
            <View style={styles.divider} />
          </AnimatedView>

          {/* OAuth Buttons */}
          <AnimatedView entering={SlideInUp.delay(400).springify()} style={styles.oauthContainer}>
            {/* Google */}
            <AnimatedButton
              onPress={promptGoogle}
              style={[styles.oauthButton, { marginBottom: 12 }]}
              disabled={isGoogleLoading || isPending}
              haptic="light"
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#1F2937" />
              ) : (
                <>
                  <Image source={{ uri: 'https://www.gstatic.com/firebaseapp/v8.2.0/images/firebaselogo.png' }} style={styles.oauthIcon} />
                  <Text style={styles.oauthText}>Google</Text>
                </>
              )}
            </AnimatedButton>

            {/* Facebook */}
            <AnimatedButton
              onPress={promptFacebook}
              style={[styles.oauthButton, { marginBottom: 12 }]}
              disabled={isFacebookLoading || isPending}
              haptic="light"
            >
              {isFacebookLoading ? (
                <ActivityIndicator size="small" color="#1F2937" />
              ) : (
                <>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" style={{ marginRight: 8 }} />
                  <Text style={styles.oauthText}>Facebook</Text>
                </>
              )}
            </AnimatedButton>

            {/* Apple */}
            {Platform.OS === 'ios' && (
              <AnimatedButton
                onPress={promptApple}
                style={styles.oauthButton}
                disabled={isAppleLoading || isPending}
                haptic="light"
              >
                {isAppleLoading ? (
                  <ActivityIndicator size="small" color="#1F2937" />
                ) : (
                  <>
                    <AntDesign name="apple" size={20} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.oauthText}>Apple</Text>
                  </>
                )}
              </AnimatedButton>
            )}
          </AnimatedView>

          {/* Sign In Link */}
          <AnimatedView entering={FadeInDown.delay(450).springify()} style={styles.signinContainer}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(routes)/login' as any)} disabled={isLoading}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerText: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subText: { fontSize: 16, color: '#6B7280' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  inputError: { borderColor: '#EF4444' },
  input: { flex: 1, marginLeft: 12, color: '#1F2937', fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 6 },
  signupButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  signupButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  oauthContainer: { gap: 0 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  oauthIcon: { width: 20, height: 20 },
  oauthText: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
  signinContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 32, marginBottom: 48 },
  signinText: { color: '#6B7280', fontSize: 15 },
  signinLink: { color: '#2563EB', fontWeight: 'bold', fontSize: 15 },
});
