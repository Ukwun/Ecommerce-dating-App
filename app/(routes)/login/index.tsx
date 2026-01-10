import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useSocialAuth from "@/hooks/useSocialAuth";
import { useAuth } from "@/hooks/AuthContext";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const {
    promptGoogle,
    promptFacebook,
    isGoogleLoading,
    isFacebookLoading,
    isPending,
  } = useSocialAuth();

  const loginFForm = useForm<LoginFormData>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 🔥 FIXED LOGIN FUNCTION
  const loginUser = async (data: LoginFormData) => {
    const envBase = process.env.EXPO_PUBLIC_SERVER_URI;
    const emulatorFallbacks =
      Platform.OS === "android"
        ? ["http://10.0.2.2:8082", "http://192.168.43.160:8082"]
        : ["http://localhost:8082"];
    const candidates = envBase ? [envBase, ...emulatorFallbacks] : emulatorFallbacks;

    for (const base of candidates) {
      const endpoint = `${base.replace(/\/$/, "")}/auth/api/login`;
      console.log("➡️ Trying login endpoint:", endpoint);

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const text = await resp.text();
        let body: any = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = { message: text };
        }

        console.log("✅ Server responded:", { status: resp.status, body });

        if (resp.status === 404) continue; // try next candidate

        if (!resp.ok) {
          throw new Error(body?.error || body?.message || "Login failed");
        }

        return {
          user: body.user ?? body?.data?.user,
          accessToken:
            body.accessToken || body.token || body?.access_token || body?.data?.token,
        };
      } catch (err: any) {
        console.warn("Login failed on:", base, err?.message);
        continue;
      }
    }

    throw new Error("Could not connect to backend on any available host");
  };

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data: any) => {
      if (data?.user && data?.accessToken) {
        try {
          await login(data.user, data.accessToken);
          Toast.show({ type: "success", text1: "Welcome back!" });
          router.replace("/");
        } catch (storageError) {
          console.error('Storage error during login:', storageError);
          Toast.show({ type: "error", text1: "Failed to save login session" });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Invalid server response",
        });
      }
    },
    onError: (err) => {
      let msg = "Login failed";
      if (err instanceof Error) msg = err.message;
      console.error('Login mutation error:', err);
      Toast.show({ type: "error", text1: msg });
    },
  });

  const handleSignUpNavigation = () => router.push("/signup");

  const { control, formState } = loginFForm;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ marginTop: 64, marginBottom: 32 }}>
            <Text style={styles.headerText}>Welcome Back</Text>
            <Text style={styles.subText}>Sign in to your account</Text>
          </View>

          {/* Email */}
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: formState.errors.email ? "#EF4444" : "#E5E7EB" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={24}
                    color="#9CA3AF"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loginMutation.isPending}
                  />
                </View>
              )}
            />
            {formState.errors.email && (
              <Text style={styles.errorText}>
                {formState.errors.email?.message}
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: formState.errors.password ? "#EF4444" : "#E5E7EB" },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={24} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    editable={!loginMutation.isPending && !isPending}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loginMutation.isPending}
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
              <Text style={styles.errorText}>
                {formState.errors.password?.message}
              </Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginTop: 8 }}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={{ color: "#EF4444", fontFamily: "sans-serif-medium" }}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: loginFForm.formState.isValid ? "#2563eb" : "#9CA3AF",
                opacity: loginMutation.isPending || isPending ? 0.7 : 1,
              },
            ]}
            onPress={loginFForm.handleSubmit((data) =>
              loginMutation.mutate(data)
            )}
            disabled={
              !loginFForm.formState.isValid || loginMutation.isPending || isPending
            }
          >
            <Text style={styles.primaryButtonText}>
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Social Login */}
          <View style={{ alignItems: "center", marginVertical: 32 }}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or using other method</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              onPress={() => promptGoogle()}
              disabled={isGoogleLoading || isPending}
              style={styles.socialButton}
            >
              <Image
                source={{
                  uri: "https://developers.google.com/identity/images/g-logo.png",
                }}
                style={{ width: 24, height: 24, marginRight: 12 }}
              />
              <Text style={styles.socialText}>
                {isGoogleLoading ? "Connecting..." : "Sign in with Google"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => promptFacebook()}
              disabled={isFacebookLoading || isPending}
              style={styles.socialButton}
            >
              <Ionicons
                name="logo-facebook"
                size={24}
                color="#4267B2"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.socialText}>
                {isFacebookLoading ? "Connecting..." : "Sign in with Facebook"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch to Sign Up */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 16 }}>
              Don’t have an account?{" "}
            </Text>
            <TouchableOpacity onPress={handleSignUpNavigation}>
              <Text style={{ color: "#2563eb", fontWeight: "bold" }}>Sign Up</Text>
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
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
  },
  subText: {
    color: "#6b7280",
    fontSize: 16,
  },
  label: {
    color: "#1f2937",
    fontSize: 16,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#1F2937",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 32,
  },
  primaryButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#6b7280",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "80%",
    marginBottom: 12,
  },
  socialText: {
    color: "#1F2937",
    fontSize: 16,
  },
});
