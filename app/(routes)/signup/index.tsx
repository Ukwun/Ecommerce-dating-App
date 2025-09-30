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
import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, TouchableOpacity, ToastAndroid } from 'react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'react-native';

interface SignupFormData {
    name: string;
    email: string;
    password: string;
}
const signupUser = async (userdata: SignupFormData) => {
    try {
        const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/api/user-registration`, userdata);
        return response.data;
    } catch (err) {
        let message = "An unexpected error occurred";
        if (axios.isAxiosError(err)) {
            if (!err.response) {
                message = "Network error. Please check your connection";
            } else {
                const status = err.response.status;
                const errorData = err.response.data;
                if (status === 400 || status === 422) {
                    throw new Error(errorData?.message || "Invalid input data");
                } else if (status === 409) {
                    throw new Error(errorData?.message || "User already exists with this email");
                } else if (status > 500) {
                    throw new Error(errorData?.message || "Server error. Please try again");
                } else {
                    throw new Error(errorData?.message || "OTP verification failed");
                }
            }
        }
        Toast.show({ type: 'error', text1: message });
        throw new Error(message);
    }
}


export default function SignupScreen() {
    const [showPassword, setShowPassword] = React.useState(false);
    const router = useRouter();
    const signupForm = useForm<SignupFormData>({
        mode: 'onChange',
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signupMutation = useMutation({
        mutationFn: signupUser,
        onSuccess: (data: any, variables: SignupFormData) => {
            router.replace({
                pathname: "/(routes)/signup",
                params: {
                    name: variables.name,
                    email: variables.email,
                    password: variables.password,
                }
            });
        },
        onError: (error: unknown) => {
            let message = "An unexpected error occurred";
            if (error instanceof Error) message = error.message;
            Toast.show({ type: 'error', text1: message });
        }
    });

    const onSignupSubmit = (data: SignupFormData) => {
        // Trigger the mutation
        signupMutation.mutate(data);
    };

    const handleSignInNavigation = () => {
        router.push("/(routes)/login");
    };
    const { control, formState } = signupForm;

    return (
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
                    <View style={{ marginTop: 64, marginBottom: 32 }}>
                        <Text style={styles.headerText}>Create Account</Text>
                        <Text style={styles.subText}>Sign up for a new Account</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={{ gap: 24, marginTop: 32 }}>
                        {/* Name Field */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Name</Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{
                                    required: 'Name is required',
                                    minLength: {
                                        value: 3,
                                        message: 'Name must be at least 3 characters long',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }: { field: { onChange: (value: string) => void; onBlur: () => void; value: string } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.name ? '#EF4444' : '#E5E7EB' }}>
                                        <MaterialCommunityIcons 
                                            name="account-outline"
                                            size={24}
                                            color={"#9CA3AF"}
                                        />
                                        <TextInput 
                                            style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }}
                                            placeholderTextColor="#9CA3AF"
                                            placeholder="Enter your name"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoCapitalize="words"
                                            editable={!signupMutation.isPending}
                                        />
                                    </View>
                                )}
                            />
                            {formState.errors?.name && (
                                <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                                    {formState.errors.name?.message}
                                </Text>
                            )}
                        </View>
                        {/* Email Field */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Email</Text>
                            <Controller
                                control={signupForm.control}
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
                                            editable={!signupMutation.isPending}
                                        />
                                    </View>
                                )}
                            />
                            {formState.errors?.email && (
                                <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                                    {formState.errors.email?.message}
                                </Text>
                            )}
                        </View>
                        {/* Password Field */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Password</Text>
                            <Controller 
                                control={signupForm.control}
                                name="password"
                                rules={{
                                    required: "Password is required",
                                }}
                                render={({ field: { onChange, onBlur, value } }: { field: { onChange: (value: string) => void; onBlur: () => void; value: string } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.password ? '#EF4444' : '#E5E7EB' }}>
                                        <Ionicons 
                                            name="lock-closed-outline"
                                            size={24}
                                            color="#9CA3AF"
                                        />
                                        <TextInput 
                                            style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }}
                                            placeholderTextColor="#9CA3AF"
                                            placeholder="Enter your password"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            editable={!signupMutation.isPending}
                                        />
                                        <TouchableOpacity 
                                            onPress={() => setShowPassword(!showPassword)}
                                            disabled={signupMutation.isPending}
                                        >
                                            <Ionicons 
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#9CA3AF"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                            {signupForm.formState.errors?.password && (
                                <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                                    {signupForm.formState.errors.password?.message}
                                </Text>
                            )}
                        </View>
                    </View>
                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={{ backgroundColor: signupForm.watch('password') ? '#2563eb' : '#9CA3AF', borderRadius: 16, paddingVertical: 16, marginTop: 32 }}
                        onPress={signupForm.handleSubmit(onSignupSubmit)}
                        disabled={!signupForm.formState.isValid || signupMutation.isPending}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontFamily: 'poppins-medium' }}>
                            {signupMutation.isPending
                            ? "Creating Account ..."
                            : "Create Account"}
                        </Text>
                    </TouchableOpacity>
                    {/* Divider */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 32 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                        <Text style={{ marginHorizontal: 16, color: '#6b7280', fontFamily: 'poppins-medium' }}>
                            Or using other method
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                    </View>
                    {/* Social Login Buttons - Centered */}
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                        {/* Google Login Button */}
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}
                            disabled={signupMutation.isPending}
                        >
                            <Image 
                                source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
                                style={{ width: 24, height: 24, marginRight: 12 }}
                                resizeMode="contain"
                            />
                            <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>Sign Up with Google</Text>
                        </TouchableOpacity>
                        {/* Facebook Login Button */}
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}
                            disabled={signupMutation.isPending}
                        >
                            <Ionicons 
                                name="logo-facebook"
                                size={24}
                                color="#4267B2"
                                style={{ marginRight: 12 }}
                            />
                            <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>Sign Up with Facebook</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Switch to Sign In Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{ color: '#6b7280', fontSize: 16, fontFamily: 'sans-serif' }}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={handleSignInNavigation}
                            disabled={signupMutation.isPending}
                        >
                            <Text style={{ color: '#2563eb', fontSize: 16, fontFamily: 'sans-serif-medium', fontWeight: 'bold' }}>
                                Sign In
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );

// ...existing code...

