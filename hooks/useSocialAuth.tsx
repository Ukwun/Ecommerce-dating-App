import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { Platform } from 'react-native';

// Only import Apple authentication on iOS
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.warn('Apple authentication not available');
  }
}

WebBrowser.maybeCompleteAuthSession();

const BACKEND = process.env.EXPO_PUBLIC_SERVER_URI || 'https://marketplace-backend.railway.app';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

export default function useSocialAuth() {
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [isFacebookLoading, setFacebookLoading] = useState(false);
  const [isAppleLoading, setAppleLoading] = useState(false);
  const [isPending, setPending] = useState(false);
  const { login } = useAuth();

  const promptGoogle = async () => {
    setGoogleLoading(true);
    try {
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_')) {
        Toast.show({
          type: 'info',
          text1: 'Google Sign-in Not Configured',
          text2: 'Please use email sign-up for now',
          duration: 3000,
        });
        setGoogleLoading(false);
        return;
      }

      const redirectUri = AuthSession.makeRedirectUri();
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params?.access_token) {
        setPending(true);

        try {
          // Get user info from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${result.params.access_token}` },
          });
          const userInfo = await userInfoResponse.json();

          // Send to backend
          const response = await axiosInstance.post(`${BACKEND}/auth/api/google`, {
            accessToken: result.params.access_token,
            idToken: result.params.id_token,
            email: userInfo.email,
            name: userInfo.name,
          });

          if (response.data?.accessToken && response.data?.user) {
            await login(response.data.user, response.data.accessToken);
            Toast.show({
              type: 'success',
              text1: '✅ Welcome!',
              text2: `Signed in as ${response.data.user.name}`,
            });
          }
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Sign-in Failed',
            text2: error instanceof Error ? error.message : 'Could not complete Google sign-in',
          });
        } finally {
          setPending(false);
        }
      } else if (result.type !== 'dismiss') {
        Toast.show({
          type: 'info',
          text1: 'Sign-in Cancelled',
          text2: 'You cancelled Google sign-in',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Google Sign-in Error',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const promptFacebook = async () => {
    setFacebookLoading(true);
    try {
      if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID.includes('YOUR_')) {
        Toast.show({
          type: 'info',
          text1: 'Facebook Sign-in Not Configured',
          text2: 'Please use email sign-up for now',
          duration: 3000,
        });
        setFacebookLoading(false);
        return;
      }

      const redirectUri = AuthSession.makeRedirectUri();
      const authUrl =
        `https://www.facebook.com/v18.0/dialog/oauth` +
        `?client_id=${FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=public_profile,email`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        setPending(true);
        const match = result.url.match(/access_token=([^&]+)/);
        const token = match?.[1];

        if (token) {
          try {
            // Get user info from Facebook
            const userInfoResponse = await fetch(
              `https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`
            );
            const userInfo = await userInfoResponse.json();

            // Send to backend
            const response = await axiosInstance.post(`${BACKEND}/auth/api/facebook`, {
              accessToken: token,
              email: userInfo.email,
              name: userInfo.name,
            });

            if (response.data?.accessToken && response.data?.user) {
              await login(response.data.user, response.data.accessToken);
              Toast.show({
                type: 'success',
                text1: '✅ Welcome!',
                text2: `Signed in as ${response.data.user.name}`,
              });
            }
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Sign-in Failed',
              text2: error instanceof Error ? error.message : 'Could not complete Facebook sign-in',
            });
          } finally {
            setPending(false);
          }
        }
      } else if (result.type !== 'dismiss') {
        Toast.show({
          type: 'info',
          text1: 'Sign-in Cancelled',
          text2: 'You cancelled Facebook sign-in',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Facebook Sign-in Error',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setFacebookLoading(false);
    }
  };

  const promptApple = async () => {
    if (Platform.OS !== 'ios') {
      Toast.show({
        type: 'info',
        text1: 'Apple Sign-in',
        text2: 'Apple Sign-in only available on iOS',
      });
      return;
    }

    if (!AppleAuthentication) {
      Toast.show({
        type: 'error',
        text1: 'Apple Sign-in Not Available',
        text2: 'Please use Google or Facebook sign-in',
      });
      return;
    }

    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        setPending(true);

        try {
          const response = await axiosInstance.post(`${BACKEND}/auth/api/apple`, {
            identityToken: credential.identityToken,
            email: credential.email,
            name: credential.fullName?.givenName || 'Apple User',
          });

          if (response.data?.accessToken && response.data?.user) {
            await login(response.data.user, response.data.accessToken);
            Toast.show({
              type: 'success',
              text1: '✅ Welcome!',
              text2: `Signed in as ${response.data.user.name}`,
            });
          }
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Sign-in Failed',
            text2: error instanceof Error ? error.message : 'Could not complete Apple sign-in',
          });
        } finally {
          setPending(false);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ERR_CANCELED') {
        Toast.show({
          type: 'error',
          text1: 'Apple Sign-in Error',
          text2: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return {
    promptGoogle,
    promptFacebook,
    promptApple,
    isGoogleLoading,
    isFacebookLoading,
    isAppleLoading,
    isPending,
  };
}
