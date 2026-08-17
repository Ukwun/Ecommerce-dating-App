import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { useState } from 'react';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'marketplace', path: 'oauth' });

const messageFor = (error: any, fallback: string) =>
  error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function useSocialAuth() {
  const { login } = useAuth();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [isFacebookLoading, setFacebookLoading] = useState(false);
  const [isAppleLoading, setAppleLoading] = useState(false);
  const isPending = isGoogleLoading || isFacebookLoading || isAppleLoading;

  const finish = async (response: any) => {
    const { user, accessToken, refreshToken } = response.data || {};
    if (!user || !accessToken || !refreshToken) throw new Error('Authentication server returned an incomplete session');
    await login(user, accessToken, refreshToken);
    Toast.show({ type: 'success', text1: `Welcome, ${user.name}`, text2: 'Your account is ready.' });
  };

  const promptGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) return Toast.show({ type: 'error', text1: 'Google sign-in unavailable', text2: 'Google client ID is not configured for this device.' });
    setGoogleLoading(true);
    try {
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const nonce = Crypto.randomUUID();
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: { nonce, prompt: 'select_account' },
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== 'success') return;
      if (!result.params.id_token) throw new Error(result.params?.error_description || 'Google did not return an identity token');
      await finish(await axiosInstance.post('/auth/api/google-login', { idToken: result.params.id_token }));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Google sign-in failed', text2: messageFor(error, 'Please try again.') });
    } finally {
      setGoogleLoading(false);
    }
  };

  const promptFacebook = async () => {
    if (!FACEBOOK_APP_ID) return Toast.show({ type: 'error', text1: 'Facebook sign-in unavailable', text2: 'Facebook App ID is not configured.' });
    setFacebookLoading(true);
    try {
      const state = Crypto.randomUUID();
      const url = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${encodeURIComponent(FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=public_profile,email&state=${encodeURIComponent(state)}`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
      if (result.type !== 'success') return;
      const fragment = result.url.split('#')[1] || '';
      const params = new URLSearchParams(fragment);
      if (params.get('state') !== state) throw new Error('Facebook authentication state mismatch');
      const accessToken = params.get('access_token');
      if (!accessToken) throw new Error(params.get('error_description') || 'Facebook did not return an access token');
      await finish(await axiosInstance.post('/auth/api/facebook-login', { accessToken }));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Facebook sign-in failed', text2: messageFor(error, 'Please try again.') });
    } finally {
      setFacebookLoading(false);
    }
  };

  const promptApple = async () => {
    if (Platform.OS !== 'ios') return;
    setAppleLoading(true);
    try {
      if (!(await AppleAuthentication.isAvailableAsync())) throw new Error('Sign in with Apple is unavailable on this device');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token');
      const name = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName) : undefined;
      await finish(await axiosInstance.post('/auth/api/apple-login', { identityToken: credential.identityToken, email: credential.email, name }));
    } catch (error: any) {
      if (error?.code !== 'ERR_REQUEST_CANCELED' && error?.code !== 'ERR_CANCELED') {
        Toast.show({ type: 'error', text1: 'Apple sign-in failed', text2: messageFor(error, 'Please try again.') });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return { promptGoogle, promptFacebook, promptApple, isGoogleLoading, isFacebookLoading, isAppleLoading, isPending };
}
