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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

import axiosInstance, { storeTokens } from '../../../utils/axiosinstance';

const { width } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const scale = useSharedValue(1);

  // Configure Google Auth Request
  // These IDs are obtained from the Google Cloud Console (https://console.cloud.google.com)
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  });

  // Configure Facebook Auth Request
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: "YOUR_FACEBOOK_APP_ID",
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken);
      }
    }
  }, [response]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { authentication } = fbResponse;
      if (authentication?.accessToken) {
        handleFacebookLogin(authentication.accessToken);
      }
    }
  }, [fbResponse]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post('/auth/api/login', { email, password });
      
      if (res.data.success) {
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", error.response?.data?.error || "Invalid credentials or network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch user info from Google's API
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const googleUser = await googleRes.json();

      // Sync user data with your Render backend
      const res = await axiosInstance.post('/auth/api/google-login', {
        email: googleUser.email,
        name: googleUser.name,
        photoUrl: googleUser.picture,
        token: token // Sending the real token to Render
      });

      if (res.data.success) {
        // Store tokens securely on the device
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Use replace to ensure the user cannot navigate back to Login
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error("Google Auth Sync Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Authentication Failed", error.response?.data?.error || "Could not sync with the Render backend.");
    } finally {
      setLoading(false); // CRITICAL: Reset loading state to re-enable buttons
    }
  };

  const handleFacebookLogin = async (token: string) => {
    try {
      setLoading(true);
      // Fetch user info from Facebook's Graph API
      const fbRes = await fetch(`https://graph.facebook.com/me?access_token=${token}&fields=id,name,email,picture.type(large)`);
      const fbUser = await fbRes.json();

      const res = await axiosInstance.post('/auth/api/facebook-login', {
        email: fbUser.email,
        name: fbUser.name,
        photoUrl: fbUser.picture?.data?.url,
        token: token // Sending the real token to Render
      });

      if (res.data.success) {
        await storeTokens(res.data.accessToken, res.data.refreshToken);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error("Facebook Auth Sync Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Facebook Login Failed", "Could not synchronize with the server.");
    } finally {
      setLoading(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const onButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    promptAsync();
  };

  const onFacebookPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    fbPromptAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.header}>Welcome Back</Text>
          <Text style={styles.subHeader}>Log in to access your intelligent marketplace</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, (!email || !password) && styles.buttonDisabled]} 
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>
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
            style={styles.googleButton} 
            onPress={onButtonPress}
            disabled={loading || !request || !request.url} // Disable if request not ready
          >
            {loading ? (
              <ActivityIndicator color="#007AFF" />
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
            style={[styles.googleButton, { backgroundColor: '#1877F2', borderColor: '#1877F2' }]} 
            onPress={onFacebookPress}
            disabled={loading || !fbRequest || !fbRequest.url} // Disable if fbRequest not ready
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-facebook" size={24} color="#fff" style={styles.icon} />
                <Text style={[styles.buttonText, { color: '#fff' }]}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

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