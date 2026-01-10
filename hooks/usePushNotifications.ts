import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_SERVER_URI || 'http://10.0.2.2:8082';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Silently check for an existing token if permissions are already granted
  const registerSilently = async () => {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (token) {
        setExpoPushToken(token);
        await sendTokenToBackend(token);
      }
    }
  };

  useEffect(() => {
    // On mount, try to register without prompting the user
    registerSilently();

    // Handle notification tap when app is opened from a closed state (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      const data = response?.notification.request.content.data;
      if (data?.conversationId) {
        router.push({
          pathname: '/(routes)/dating-chat/[matchId]' as any,
          params: { matchId: data.conversationId as string }
        });
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.conversationId) {
        router.push({
          pathname: '/(routes)/dating-chat/[matchId]' as any,
          params: { matchId: data.conversationId as string }
        });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const sendTokenToBackend = async (token: string) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        await axios.post(
          `${API_BASE}/dating/api/notifications/register`,
          { token },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        console.log('Push token registered with backend');
      }
    } catch (error) {
      console.log('Failed to register push token with backend');
    }
  };

  // Actively requests permission and registers the token. To be called from a UI element.
  const requestAndRegister = async () => {
    if (!Device.isDevice) {
      Alert.alert('Emulator Notice', 'Push notifications only work on physical devices.');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask for permission if not determined
    if (existingStatus !== 'granted') {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chat_messages', {
          name: 'Chat Messages',
          sound: 'chat_sound.wav', // Ensure this matches your asset filename
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Handle denied or other non-granted statuses by guiding user to settings
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'To receive notifications, you need to enable them in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    // If granted, get the token and send to backend
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    if (token) {
      setExpoPushToken(token);
      await sendTokenToBackend(token);
      Alert.alert('Success', 'Notifications have been enabled!');
    }
    return !!token;
  };

  return { expoPushToken, notification, requestAndRegister };
};