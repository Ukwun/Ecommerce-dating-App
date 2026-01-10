import { View, Text, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

interface VerifyOTPData {
    otp: string;
    email: string;
    name: string;
    password: string;
}

interface ResendOTPData {
    email: string;
    name: string;
    password: string;
}



export default function SignupOtp() {
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

        // Get dynamic parameters from signup screen
    const { name, email, password } = useGlobalSearchParams<{
        name: string;
        email: string;
        password: string;
    }>();

        // Create refs for each input
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // countdown timer effect
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (countdown > 0 && !canResend) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        } else if (countdown === 0) {
            setCanResend(true);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown, canResend]);

    // Start countdown on component mount
    useEffect(() => {
        setCanResend(false);
        setCountdown(60);
    }, []);

    // Validate required parameters
    const router = useRouter();
    useEffect(() => {
        if (!name || !email || !password) {
            Toast.show({ type: 'error', text1: "Missing Information", text2: "Required signup data is missing. Please try again" });
            if (router && typeof router.back === 'function') router.back();
        }
    }, [name, email, password]);

    const verifyOtp = async (data: VerifyOTPData) => {
        try {
            const response = await axios.post(
                `${process.env.EXPO_PUBLIC_SERVER_URI}/auth/api/verify-user`,
                {
                    otp: data.otp,
                    email: data.email,
                    name: data?.name,
                    password: data?.password,
                },
                {
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error: unknown) {
            console.error("OTP verification error:", error);
            let message = "OTP verification failed";
            if (isAxiosError(error)) {
                if (!error.response) {
                    message = "Network error. Please check your connection";
                } else {
                    const status = error.response.status;
                    const errorData = error.response.data;
                    if (status === 400 || status === 422) {
                        message = errorData?.message || "Invalid OTP or signup data";
                    } else if (status === 404) {
                        message = errorData?.message || "OTP expired or not found";
                    } else if (status === 409) {
                        message = errorData?.message || "Too many attempts. Please try again later";
                    } else if (status > 500) {
                        message = errorData?.message || "Server error. Please try again later.";
                    }
                }
            }
            Toast.show({ type: 'error', text1: message });
            throw new Error(message);
        }
    };

    const verifyOTPMutation = useMutation({
        mutationFn: verifyOtp,
        onSuccess: (data) => {
            Toast.show({ type: 'success', text1: "Welcome!", text2: `Account created successfully for ${name}!` });
            // Navigate to next screen on success
            if (router && typeof router.replace === 'function') router.replace('/login');
        },
        onError: (error: Error) => {
            Toast.show({ type: 'error', text1: "Verification Failed", text2: error.message });
        },
    });

    // Dummy resendOTP function for mutation
    const resendOTP = async (data: ResendOTPData) => {
        // Implement actual resend logic here
        return Promise.resolve({ success: true });
    };
    const resendOTPMutation = useMutation({
        mutationFn: resendOTP,
        onSuccess: (data) => {
            Toast.show({ type: 'success', text1: "OTP Sent!", text2: `A new OTP has been sent to ${email}.` });
            setOtp(["", "", "", ""]);
            inputRefs.current[0]?.focus();
            setCanResend(false);
            setCountdown(60);
        },
        onError: (error: Error) => {
            Toast.show({ type: 'error', text1: "Resend Failed", text2: error.message });
        },
    });

    const handleOtpChange = (value: string, index: number) => {
        // only allow single digit
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        // Auto focus next input if value is entered
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        // handle backspace - go to previous input if current is empty
        if (key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = () => {
        const otpCode = otp.join("");
        if (otpCode.length < 4) {
            Toast.show({ type: 'error', text1: "Invalid OTP", text2: "Please enter complete 4-digit OTP" });
            return;
        }
        if (!name || !email || !password) {
            Toast.show({ type: 'error', text1: "Missing Information", text2: "Required signup data is missing. Please try again" });
            return;
        }
        // Trigger the verification mutation with all signup data
        verifyOTPMutation.mutate({
            otp: otpCode,
            email: email,
            name: name,
            password: password,
        });
    };

    const handleResendOTP = () => {
        if (!canResend || resendOTPMutation.isPending) return;
        if (!email) {
            Toast.show({ type: 'error', text1: "Missing Email", text2: "Email address is required to resend OTP." });
            return;
        }
        // Trigger the resend mutation
        resendOTPMutation.mutate({
            email: email as string,
            name: name as string,
            password: password as string,
        });
    };


    const handleGoBack = () => {
        if (router && typeof router.back === 'function') router.back();
    };

        // Auto-focus first input on mount
    useEffect(() => {
        const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
            inputRefs.current[0]?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const isOTPComplete = otp.every((digit) => digit !== "");
    const isVerifying = verifyOTPMutation.isPending;
    const isResending = resendOTPMutation.isPending;

     // Format countdown time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1"
        >
            {/* Header with Back Button */}
            <View className="flex-row items-center px-6 mt-6 mb-8">
                <TouchableOpacity 
                    onPress={handleGoBack}
                    className="rounded-full bg-gray-100 p-2 mr-2"
                    disabled={isVerifying}
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-2xl font-poppins-bold text-gray-900">
                    Verify OTP
                </Text>
            </View>

            <View className="flex-1 px-6">
                <View className="items-center mb-8">
                    <View className="items-center mb-8">
                        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                            <Ionicons name="shield-checkmark-sharp" size={40} color={"#2563E8"} />
                        </View>

                        <Text className="text-xl font-poppins-bold text-gray-900 mb-2 text-center">
                            Hi {name || "Solace"}! Verify Your Account
                        </Text>
                        <Text className="text-gray-500 font-poppins text-base text-center">
                            We&apos;ve sent a 4-digit verification code to {email || "support@8Gigabytes.com"}
                        </Text>
                    </View>

                    {/* OTP Input Fields */}
                    <View className="flex-row justify-center mb-8" gap-4>
                        {otp?.map((digit, index) => (
                            <View key={index} className="w-16 h-16">
                                <TextInput
                                    ref={(ref: TextInput | null) => { inputRefs.current[index] = ref; }}
                                    className={`w-full h-full text-center text-2xl font-poppins-bold border-2 rounded-xl ${digit ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                                    value={digit}
                                    onChangeText={(Value) => handleOtpChange(Value, index)}
                                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                    keyboardType="numeric"
                                    maxLength={1}
                                    selectTextOnFocus
                                    editable={!isVerifying}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Verify Button */}
                <TouchableOpacity 
                  className={`rounded-xl py-4 mb-6 ${isOTPComplete && !isVerifying ? "bg-blue-600" : "bg-gray-400"
                  }`}
                  onPress={handleVerifyOtp}
                  disabled={!isOTPComplete || isVerifying}
                >

                    <Text className="text-white text-center tex-lg font-poppins-medium">
                        {isVerifying ? "verifying..." : "verify OTP"}
                    </Text>
                </TouchableOpacity>

                {/* Resend OTP */}
                <View
                className="flex-row justify-center">
                    <Text className="text-gray-600 font-poppins">
                        Didn&apos;t receive the code?
                    </Text>
                    {canResend ? (
                        <TouchableOpacity
                          onPress={handleResendOTP}
                          disabled={isResending}
                        >
                            <Text
                              className={`font-poppins-semibold ml-1 ${
                                isResending ? "text-gray-400" : "text-blue-600"
                              }`}
                            >
                                {isResending ? "Sending ..." : "Resend OTP"} 
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text className="text-gray-400 font-poppins-semibold ml-2">
                            Resend OTP ({formatTime(countdown)})
                        </Text>
                    )}
                    
                </View>
            </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  )
}