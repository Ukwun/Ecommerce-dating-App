import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';

interface ForgotPasswordFormData {
    email: string;
}

const styles = StyleSheet.create({
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a202c',
        marginBottom: 8,
        fontFamily: 'Poppins-Bold',
    },
    subText: {
        color: '#6b7280', // Tailwind gray-500
        fontSize: 16,
        fontFamily: 'sans-serif', // Use system font for now
    },
});

export default function ForgotPasswordScreen() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const router = useRouter();

    // Forgot password form
    const forgotPasswordForm = useForm<ForgotPasswordFormData>({
        mode: "onChange",
        defaultValues: {
            email: ""
        },
    });

    const handleBackToLogin = () => {
        router.back();
    };

    const onForgotPasswordSubmit = (data: ForgotPasswordFormData) => {
      console.log("Forgot password dtat:", data);
      // Handle forgot password submission here
      setIsSubmitted(true);
    };

    const handleResendEmail = () => {
      const email = forgotPasswordForm.getValues("email");
      if (email) {
        console.log("Resending email to:", email);
        // Handle resend email logic here
      }
    };

    const { control, formState } = forgotPasswordForm;

    // Success message after submission
    const renderSuccess = () => (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
          {/* Success Icon */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 80, height: 80, backgroundColor: '#D1FAE5', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Ionicons name="mail-outline" size={40} color="#10B981" />
            </View>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a202c', marginBottom: 12, textAlign: 'center', fontFamily: 'Poppins-Bold' }}>
            Check Your Email
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 16, textAlign: 'center', marginBottom: 16, fontFamily: 'sans-serif' }}>
            We've sent a password reset link to
            <Text style={{ fontWeight: 'bold', color: '#374151', fontFamily: 'sans-serif-medium' }}> {forgotPasswordForm.getValues('email')}</Text>
          </Text>
          {/* Instructions */}
          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: '#1D4ED8', fontWeight: 'bold', fontSize: 14, marginBottom: 8, fontFamily: 'sans-serif-medium' }}>
              What's next?
            </Text>
            <Text style={{ color: '#2563eb', fontSize: 14, lineHeight: 20, fontFamily: 'sans-serif' }}>
              {`1. Check your email inbox\n2. Click the reset link in the mail\n3. Create a new password\n4. Sign in with your new password`}
            </Text>
          </View>
          {/* Resend Email Button */}
          <TouchableOpacity 
            style={{ backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, marginBottom: 16 }}
            onPress={handleResendEmail}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontFamily: 'sans-serif-medium' }}>
              Resend Email
            </Text>
          </TouchableOpacity>
          {/* Back to Login */}
          <TouchableOpacity 
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, paddingVertical: 16 }}
            onPress={handleBackToLogin}
          >
            <Text style={{ color: '#374151', textAlign: 'center', fontSize: 18, fontFamily: 'sans-serif-medium' }}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

    return isSubmitted ? renderSuccess() : (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={handleBackToLogin}
                style={{ marginRight: 16, padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1a202c', marginBottom: 8, fontFamily: 'Poppins-Bold', textAlign: 'center' }}>
                Forgot Password
              </Text>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1a202c', marginBottom: 8, fontFamily: 'Poppins-Bold', textAlign: 'center' }}>
                Reset Your Password
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 16, fontFamily: 'Poppins-Regular', marginBottom: 16, textAlign: 'center', lineHeight: 22 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </View>

            <View>
              {/* Email Field */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'Poppins-Regular', marginBottom: 12, textAlign: 'left' }}>Email Address</Text>
                <Controller
                  control={forgotPasswordForm.control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }: { field: { onChange: (value: string) => void; onBlur: () => void; value: string } }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.email ? '#EF4444' : '#E5E7EB' }}>
                      <MaterialCommunityIcons 
                        name="email-outline"
                        size={24}
                        color={"#9CA3AF"}
                      />
                      <TextInput 
                        style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }}
                        placeholderTextColor="#9CA3AF"
                        placeholder="Enter your email"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  )}
                />
                {forgotPasswordForm.formState.errors?.email && (
                  <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                    {forgotPasswordForm.formState.errors.email?.message}
                  </Text>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={{ backgroundColor: forgotPasswordForm.watch('email') ? '#2563eb' : '#9CA3AF', borderRadius: 16, paddingVertical: 16, marginTop: 32 }}
              onPress={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
              disabled={!forgotPasswordForm.formState.isValid}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontFamily: 'sans-serif-medium' }}>
                Send Reset Link
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <View className="bg-gray-50 rounded-xl p-4">
              <Text className="text-gray-600 font-poppins text-sm text-center leading-5">
                Remember your password{""}
                <Text 
                  className="text-blue-600 font-poppins-semibold"
                  onPress={handleBackToLogin}
                >
                  Sign In
                </Text>
              </Text >
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
}
