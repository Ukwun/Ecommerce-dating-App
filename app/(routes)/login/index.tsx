import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';

interface LoginFormData {
    email: string;
    password: string;
}

export default function LoginScreen() {
    const [showPassword, setShowPassword] = React.useState(false);
    const router = useRouter();
    const loginFForm = useForm<LoginFormData>({
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleSignUpNavigation = () => {
        router.push("/signup");
    };
    const { control, formState } = loginFForm;

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
                        <Text style={styles.headerText}>Welcome Back</Text>
                        <Text style={styles.subText}>
                            Sign in to your account
                        </Text>
                    </View>

                    {/* Form Fields */}
                    <View style={{ gap: 24, marginTop: 32 }}>
                        {/* Email Field */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Email</Text>
                            <Controller
                                control={control}
                                name="email"
                                rules={{
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Enter a valid email address',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }: { field: { onChange: (value: string) => void; onBlur: () => void; value: string } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors.email ? '#EF4444' : '#E5E7EB' }}>
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
                                            // editable={!loginMutation.isLoading}
                                        />
                                    </View>
                                )}
                            />
                            {formState.errors.email && (
                                <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                                    {formState.errors.email.message}
                                </Text>
                            )}
                        </View>

                        {/* Password Field */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontFamily: 'sans-serif', marginBottom: 12 }}>Password</Text>
                            <Controller 
                                control={control}
                                name="password"
                                rules={{
                                    required: "Password is required",
                                }}
                                render={({ field: { onChange, onBlur, value } }: { field: { onChange: (value: string) => void; onBlur: () => void; value: string } }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: formState.errors.password ? '#EF4444' : '#E5E7EB' }}>
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
                                            // editable={!loginMutation.isPending}
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity 
                                            onPress={() => setShowPassword(!showPassword)}
                                            /// disabled={loginMutation.isPending}
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
                            {formState.errors.password && (
                                <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 4, fontFamily: 'sans-serif' }}>
                                    {formState.errors.password.message}
                                </Text>
                            )}
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity 
                            style={{ alignSelf: 'flex-end', marginTop: 8 }}
                            onPress={() => router.push("/forgot-password")}
                        >
                            <Text style={{ color: '#EF4444', fontFamily: 'sans-serif-medium' }}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={{ backgroundColor: loginFForm.watch('password') ? '#2563eb' : '#9CA3AF', borderRadius: 16, paddingVertical: 16, marginTop: 32 }}
                        onPress={loginFForm.handleSubmit(() => {/* handle login */})}
                        disabled={!loginFForm.formState.isValid /* || loginMutation.isPending */}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontFamily: 'sans-serif-medium' }}>
                            Sign in
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 32 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                        <Text style={{ marginHorizontal: 16, color: '#6b7280', fontFamily: 'sans-serif-medium' }}>
                            Or using other method
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
                    </View>

                                        {/* Social Login Buttons - Centered */}
                                        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                                                {/* Google Login Button */}
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}
                                                >
                                                        <Image 
                                                            source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
                                                            style={{ width: 24, height: 24, marginRight: 12 }}
                                                            resizeMode="contain"
                                                        />
                                                        <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>Sign in with Google</Text>
                                                </TouchableOpacity>

                                                {/* Facebook Login Button */}
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: '#E5E7EB', width: '80%' }}
                                                >
                                                        <Ionicons 
                                                            name="logo-facebook"
                                                            size={24}
                                                            color="#4267B2"
                                                            style={{ marginRight: 12 }}
                                                        />
                                                        <Text style={{ color: '#1F2937', fontSize: 16, fontFamily: 'sans-serif-medium' }}>Sign in with Facebook</Text>
                                                </TouchableOpacity>
                                        </View>

                    {/* Switch to Sign Up Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{ color: '#6b7280', fontSize: 16, fontFamily: 'sans-serif' }}>
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text style={{ color: '#2563eb', fontSize: 16, fontFamily: 'sans-serif-medium', fontWeight: 'bold' }}>
                                Sign Up
                            </Text>
                        </TouchableOpacity>
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
        color: '#6b7280', // Tailwind gray-500
        fontSize: 16,
        fontFamily: 'sans-serif', // Use system font for now
    },
});
