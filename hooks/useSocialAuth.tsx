import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'marketplace', path: 'oauth' });
const messageFor = (error: any, fallback: string) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function useSocialAuth() {
  const { login } = useAuth();
  const [isFacebookLoading, setFacebookLoading] = useState(false);
  const [facebookEnabled, setFacebookEnabled] = useState(false);

  useEffect(() => {
    axiosInstance.get('/auth/api/auth-capabilities')
      .then(response => setFacebookEnabled(Boolean(response.data?.providers?.facebook)))
      .catch(() => setFacebookEnabled(false));
  }, []);

  const promptFacebook = async () => {
    if (!FACEBOOK_APP_ID || !facebookEnabled) {
      Toast.show({ type: 'error', text1: 'Facebook sign-in unavailable', text2: 'Please use email and password while Facebook sign-in is configured.' });
      return;
    }
    setFacebookLoading(true);
    try {
      const state = Crypto.randomUUID();
      const url = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${encodeURIComponent(FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=public_profile,email&state=${encodeURIComponent(state)}`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
      if (result.type !== 'success') return;
      const params = new URLSearchParams(result.url.split('#')[1] || '');
      if (params.get('state') !== state) throw new Error('Facebook authentication state mismatch');
      const accessToken = params.get('access_token');
      if (!accessToken) throw new Error(params.get('error_description') || 'Facebook did not return an access token');
      const response = await axiosInstance.post('/auth/api/facebook-login', { accessToken });
      const { user, accessToken: sessionToken, refreshToken } = response.data || {};
      if (!user || !sessionToken || !refreshToken) throw new Error('Authentication server returned an incomplete session');
      await login(user, sessionToken, refreshToken);
      Toast.show({ type: 'success', text1: `Welcome, ${user.name}`, text2: 'Your account is ready.' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Facebook sign-in failed', text2: messageFor(error, 'Please try again.') });
    } finally {
      setFacebookLoading(false);
    }
  };

  return { promptFacebook, isFacebookLoading, isPending: isFacebookLoading, availability: { facebook: Boolean(FACEBOOK_APP_ID) && facebookEnabled } };
}
