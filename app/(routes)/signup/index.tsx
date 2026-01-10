import React from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import useSocialAuth from '@/hooks/useSocialAuth';
import { useAuth } from '@/hooks/AuthContext';

interface SignupFormData {
    name: string;
    email: string;
    password: string;
}

const signupUser = async (userdata: SignupFormData) => {
    // Try a list of candidates so the app works with whichever dev server is actually running.
    const envBase = process.env.EXPO_PUBLIC_SERVER_URI;
    const emulatorFallbacks = Platform.OS === 'android' ? ['http://10.0.2.2:8082', 'http://192.168.43.160:8082'] : ['http://localhost:8082'];
    const candidates = envBase ? [envBase, ...emulatorFallbacks] : [...emulatorFallbacks];

    const tryCandidates = async () => {
        for (const base of candidates) {
            const endpoint = `${base.replace(/\/$/, '')}/auth/api/user-registration`;
            console.log('➡️ Trying signup endpoint:', endpoint);
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userdata),
                });

                const text = await response.text().catch(() => '');
                let data: any = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (e) {
                    data = { message: text };
                }

                console.log('✅ Server responded from', base, { status: response.status, body: data });

                // If we get a 404 from this server, try the next candidate.
                if (response.status === 404) {
                    continue;
                }

                if (!response.ok) {
                    const msg = data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`;
                    const err = new Error(msg);
                    (err as any).raw = data;
                    throw err;
                }

                return data;
            } catch (err) {
                // If this candidate failed (network error), continue to the next candidate.
                console.warn('Signup candidate failed:', base, err instanceof Error ? err.message : err);
                continue;
            }
        }
        throw new Error('Could not reach backend on any candidate hosts');
    };

    return tryCandidates();
};

export default function SignupScreen() {
    const [showPassword, setShowPassword] = React.useState(false);
    const router = useRouter();
    const { login } = useAuth();
    const { promptGoogle, promptFacebook, isGoogleLoading, isFacebookLoading, isPending } = useSocialAuth();
    const signupForm = useForm<SignupFormData>({
        mode: 'onChange',
        defaultValues: { name: '', email: '', password: '' },
    });

    const signupMutation = useMutation({
        mutationFn: signupUser,
        onSuccess: async (data: any) => {
            // Case 1: Server returns user and tokens for direct login
            if (data?.user && data?.accessToken) {
                // Return the promise chain so React Query awaits its completion
                return login(data.user, data.accessToken, data.refreshToken).then(() => {
                    Toast.show({ type: 'success', text1: 'Account Created!', text2: 'Welcome aboard!' });
                        router.replace('/profile');
                });
            } 
            // Case 2: Server returns a message indicating OTP is sent
            else if (data?.message?.includes('OTP')) {
                const { name, email, password } = signupForm.getValues();
                Toast.show({ type: 'info', text1: 'Verification Required', text2: data.message });
                router.push({ pathname: '/signup-otp', params: { name, email, password } });
            } else {
                // Fallback for unexpected success response
                Toast.show({ type: 'error', text1: 'An unexpected error occurred during signup.' });
            }
        },
        onError: (error: unknown) => {
            let message = 'An unexpected error occurred';
            let raw: any = undefined;
            if (error instanceof Error) {
                message = error.message;
                raw = (error as any).raw;
            }
            Toast.show({ type: 'error', text1: message, text2: raw ? String(raw).slice(0, 200) : undefined });
        },
    });

    // React Query mutation may expose different loading flags depending on version.
    // Use a resilient check that reads common flags via `any` to avoid TS enum mismatches.
    const isSigningUp = Boolean((signupMutation as any).isPending) || Boolean((signupMutation as any).isLoading);

    const onSignupSubmit = (data: SignupFormData) => signupMutation.mutate(data);

    const handleSignInNavigation = () => router.push('/login');
    const { control, formState } = signupForm;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
                    <View style={{ marginTop: 64, marginBottom: 32 }}>
                        <Text style={styles.headerText}>Create Account</Text>
                        <Text style={styles.subText}>Sign up for a new Account</Text>
                    </View>

                    <View style={{ gap: 24, marginTop: 32 }}>
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Name</Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{ required: 'Name is required', minLength: { value: 3, message: 'Name must be at least 3 characters long' } }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.name ? '#EF4444' : '#E5E7EB' }}>
                                        <MaterialCommunityIcons name="account-outline" size={24} color={"#9CA3AF"} />
                                        <TextInput style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }} placeholderTextColor="#9CA3AF" placeholder="Enter your name" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words" editable={!isSigningUp && !isPending} />
                                    </View>
                                )}
                            />
                            {formState.errors?.name && <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4 }}>{formState.errors.name?.message}</Text>}
                        </View>

                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Email</Text>
                            <Controller
                                control={signupForm.control}
                                name="email"
                                rules={{ required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.email ? '#EF4444' : '#E5E7EB' }}>
                                        <MaterialCommunityIcons name="email-outline" size={24} color={"#9CA3AF"} />
                                        <TextInput style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }} placeholderTextColor="#9CA3AF" placeholder="Enter your email" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" editable={!isSigningUp && !isPending} />
                                    </View>
                                )}
                            />
                            {formState.errors?.email && <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4 }}>{formState.errors.email?.message}</Text>}
                        </View>

                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Password</Text>
                            <Controller
                                control={signupForm.control}
                                name="password"
                                rules={{ required: 'Password is required' }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors?.password ? '#EF4444' : '#E5E7EB' }}>
                                        <Ionicons name="lock-closed-outline" size={24} color="#9CA3AF" />
                                        <TextInput style={{ flex: 1, marginLeft: 12, color: '#1F2937', fontFamily: 'sans-serif' }} placeholderTextColor="#9CA3AF" placeholder="Enter your password" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} autoCapitalize="none" editable={!isSigningUp && !isPending} />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isSigningUp || isPending}>
                                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                            {signupForm.formState.errors?.password && <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4 }}>{signupForm.formState.errors.password?.message}</Text>}
                        </View>
                    </View>

                    <TouchableOpacity style={{ backgroundColor: signupForm.formState.isValid ? '#2563eb' : '#9CA3AF', borderRadius: 16, paddingVertical: 16, marginTop: 32, opacity: (isSigningUp || isPending) ? 0.7 : 1 }} onPress={signupForm.handleSubmit(onSignupSubmit)} disabled={!signupForm.formState.isValid || isSigningUp || isPending}>
                        <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontFamily: 'poppins-medium' }}>{isSigningUp ? 'Creating Account ...' : 'Create Account'}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 32 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                        <Text style={{ marginHorizontal: 16, color: '#6b7280', fontFamily: 'poppins-medium' }}>Or using other method</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                    </View>

                    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                        <TouchableOpacity onPress={() => promptGoogle()} disabled={isGoogleLoading || isPending} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}>
                            <Image source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} style={{ width: 24, height: 24, marginRight: 12 }} resizeMode="contain" />
                            <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>{isGoogleLoading ? 'Connecting...' : 'Sign Up with Google'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => promptFacebook()} disabled={isFacebookLoading || isPending} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}>
                            <Ionicons name="logo-facebook" size={24} color="#4267B2" style={{ marginRight: 12 }} />
                            <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>{isFacebookLoading ? 'Connecting...' : 'Sign Up with Facebook'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{ color: '#6b7280', fontSize: 16, fontFamily: 'sans-serif' }}>Already have an account? </Text>
                        <TouchableOpacity onPress={handleSignInNavigation} disabled={isSigningUp || isPending}><Text style={{ color: '#2563eb', fontSize: 16, fontFamily: 'sans-serif-medium', fontWeight: 'bold' }}>Sign In</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
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
        color: '#6b7280',
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
    },
});
