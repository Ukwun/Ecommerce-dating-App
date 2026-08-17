import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput,
  ActivityIndicator, 
  SafeAreaView,
  Dimensions,
  Alert
  ,Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  Easing,
  ZoomIn
} from 'react-native-reanimated';

import axiosInstance, { storeTokens } from '../../../utils/axiosinstance';
import useSocialAuth from '@/hooks/useSocialAuth';
import { useAuth } from '@/hooks/AuthContext';

const { width } = Dimensions.get('window');

// Global error handler to catch any errors not caught by try-catch
if (typeof global !== 'undefined' && !(global as any).__errorHandlerAttached) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes('Non-serializable values')) {
      // Skip non-serializable warnings
      return;
    }
    originalWarn(...args);
  };
  
  (global as any).__errorHandlerAttached = true;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { promptGoogle, promptFacebook, promptApple, isGoogleLoading: googleLoading, isFacebookLoading: facebookLoading, isAppleLoading: appleLoading } = useSocialAuth();
  // Legacy handler setters remain no-ops while older callbacks are phased out.
  const setGoogleLoading = (_loading: boolean) => undefined;
  const setFacebookLoading = (_loading: boolean) => undefined;
  // INDEPENDENT loading states for each auth method - fixes the "all buttons loading" bug
  const [emailLoading, setEmailLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const emailFocusValue = useSharedValue(0);
  const passwordFocusValue = useSharedValue(0);
  
  const scale = useSharedValue(1);
  const emailButtonScale = useSharedValue(1);
  const buttonScale = {
    email: useSharedValue(1),
    google: useSharedValue(1),
    facebook: useSharedValue(1),
  };


  const handleEmailLogin = async () => {
    console.log('🔵 [LOGIN] Email login button pressed');
    console.log('🔵 [LOGIN] Email:', email);
    console.log('🔵 [LOGIN] Password length:', password.length);
    
    if (!email || !password) {
      console.log('❌ [LOGIN] Missing fields');
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      console.log('🟡 [LOGIN] Starting animation and loading state');
      emailButtonScale.value = withSpring(0.95);
      setEmailLoading(true);
      setStatusMessage('Signing you in...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('🟡 [LOGIN] Making axios request to /auth/api/login');
      const res = await axiosInstance.post('/auth/api/login', { email, password });
      console.log('[LOGIN] Authentication response received');
      
      if (res.data.success || res.data.message === "Login successful" || (res.data.accessToken && res.data.user)) {
        console.log('🟢 [LOGIN] Success response, storing tokens');
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        await login(res.data.user, res.data.accessToken, res.data.refreshToken);
        setStatusMessage('✓ Login successful!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          console.log('🟢 [LOGIN] Navigating to home');
          router.replace('/(tabs)' as any);
        }, 500);
      } else {
        console.log('❌ [LOGIN] Response marked as not successful');
        console.log('❌ [LOGIN] Backend error:', res.data.error);
        const errorMsg = res.data.error || "Invalid email or password";
        Alert.alert("Login Failed", errorMsg);
      }
    } catch (error: any) {
      console.error('❌ [LOGIN] CAUGHT ERROR:', error);
      console.error('❌ [LOGIN] Error message:', error.message);
      console.error('❌ [LOGIN] Error response:', error.response?.data);
      console.error('❌ [LOGIN] Error code:', error.code);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusMessage('');
      
      let errorMsg = "Login failed";
      if (error.message.includes('Server timeout') || error.message.includes('Connection')) {
        errorMsg = error.message;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message.includes('timeout') || error.message.includes('Network')) {
        errorMsg = 'Connection timeout. Make sure backend is running on port 8082.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMsg = 'Backend not reachable on port 8082. Is it running?';
      } else {
        errorMsg = error.message || "Invalid email or password";
      }
      
      console.log('🔴 [LOGIN] Showing alert with message:', errorMsg);
      Alert.alert("Login Failed", errorMsg);
    } finally {
      emailButtonScale.value = withSpring(1);
      setEmailLoading(false);
    }
  };

  const handleGoogleLogin = async (token: string) => {
    try {
      scale.value = withSpring(0.95);
      setGoogleLoading(true);
      setStatusMessage('Authenticating with Google...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const googleUser = await googleRes.json();

      const res = await axiosInstance.post('/auth/api/google-login', {
        email: googleUser.email,
        name: googleUser.name,
        photoUrl: googleUser.picture,
        token: token
      });

      if (res.data.success) {
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        setStatusMessage('✓ Google login successful!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          router.replace('/(tabs)' as any);
        }, 500);
      }
    } catch (error: any) {
      console.error("Google Auth Sync Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusMessage('');
      Alert.alert("Google Login Failed", "Could not authenticate. Please try again.");
    } finally {
      scale.value = withSpring(1);
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async (token: string) => {
    try {
      scale.value = withSpring(0.95);
      setFacebookLoading(true);
      setStatusMessage('Authenticating with Facebook...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const fbRes = await fetch(`https://graph.facebook.com/me?access_token=${token}&fields=id,name,email,picture.type(large)`);
      const fbUser = await fbRes.json();

      const res = await axiosInstance.post('/auth/api/facebook-login', {
        email: fbUser.email,
        name: fbUser.name,
        photoUrl: fbUser.picture?.data?.url,
        token: token
      });

      if (res.data.success) {
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        setStatusMessage('✓ Facebook login successful!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          router.replace('/(tabs)' as any);
        }, 500);
      }
    } catch (error: any) {
      console.error("Facebook Auth Sync Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusMessage('');
      Alert.alert("Facebook Login Failed", "Could not authenticate. Please try again.");
    } finally {
      scale.value = withSpring(1);
      setFacebookLoading(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const emailButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emailButtonScale.value }]
  }));

  const emailInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + (emailFocusValue.value * 0.02) }],
    shadowOpacity: emailFocusValue.value * 0.15,
  }));

  const passwordInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + (passwordFocusValue.value * 0.02) }],
    shadowOpacity: passwordFocusValue.value * 0.15,
  }));

  const onButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    promptGoogle();
  };

  const onFacebookPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    promptFacebook();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.header}>Welcome Back</Text>
          <Text style={styles.subHeader}>Log in to access your intelligent marketplace</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.form}>
          <Animated.View style={[emailInputAnimatedStyle, styles.inputContainer]}>
            <Ionicons name="mail-outline" size={20} color={emailFocused ? '#007AFF' : '#8E8E93'} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => {
                setEmailFocused(true);
                emailFocusValue.value = 1.02;
              }}
              onBlur={() => {
                setEmailFocused(false);
                emailFocusValue.value = 1;
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Animated.View>

          <Animated.View style={[passwordInputAnimatedStyle, styles.inputContainer]}>
            <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? '#007AFF' : '#8E8E93'} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              onFocus={() => {
                setPasswordFocused(true);
                passwordFocusValue.value = 1.02;
              }}
              onBlur={() => {
                setPasswordFocused(false);
                passwordFocusValue.value = 1;
              }}
              secureTextEntry
            />
          </Animated.View>

          <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/forgot-password')} accessibilityRole="button">
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Animated.View style={emailButtonAnimatedStyle}>
            <TouchableOpacity 
              style={[styles.loginButton, (!email || !password) && styles.buttonDisabled]} 
              onPress={handleEmailLogin}
              disabled={emailLoading}
              activeOpacity={0.8}
            >
              {emailLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={[styles.buttonContainer, animatedStyle]}
        >
          <TouchableOpacity 
            style={[styles.googleButton, googleLoading && styles.buttonLoadingState]} 
            onPress={onButtonPress}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#EA4335" size="small" />
                <Text style={[styles.buttonText, { color: '#EA4335', marginLeft: 8 }]}>Signing in...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#EA4335" style={styles.icon} />
                <Text style={styles.buttonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(700).springify()}
          style={[styles.buttonContainer, { marginTop: 12 }, animatedStyle]}
        >
          <TouchableOpacity 
            style={[styles.googleButton, { backgroundColor: '#1877F2', borderColor: '#1877F2' }, facebookLoading && styles.buttonLoadingState]} 
            onPress={onFacebookPress}
            disabled={facebookLoading}
            activeOpacity={0.8}
          >
            {facebookLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.buttonText, { color: '#fff', marginLeft: 8 }]}>Signing in...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="logo-facebook" size={24} color="#fff" style={styles.icon} />
                <Text style={[styles.buttonText, { color: '#fff' }]}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInDown.delay(750).springify()} style={[styles.buttonContainer, { marginTop: 12 }, animatedStyle]}>
            <TouchableOpacity style={[styles.googleButton, appleLoading && styles.buttonLoadingState]} onPress={promptApple} disabled={appleLoading} activeOpacity={0.8}>
              {appleLoading ? <ActivityIndicator color="#111" size="small" /> : (
                <><Ionicons name="logo-apple" size={24} color="#111" style={styles.icon} /><Text style={styles.buttonText}>Continue with Apple</Text></>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(800).springify()} style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(routes)/signup')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { fontSize: 32, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  subHeader: { fontSize: 16, color: '#8E8E93', marginBottom: 48 },
  form: { marginBottom: 24 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1C1C1E' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: '#007AFF', fontWeight: '600' },
  loginButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingState: {
    opacity: 0.8,
  },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { marginHorizontal: 16, color: '#8E8E93', fontWeight: '600' },
  buttonContainer: { width: '100%' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  icon: { marginRight: 12 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: '#8E8E93', fontSize: 15 },
  signUpText: { color: '#007AFF', fontSize: 15, fontWeight: '700' },
});
