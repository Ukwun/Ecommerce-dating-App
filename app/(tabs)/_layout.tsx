
import React from 'react';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign, Feather } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { BlurTabBarBackground } from '@/components/ui/blur-tab-bar-background';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  usePushNotifications(); // Initialize push notifications

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: BlurTabBarBackground,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            height: 70,
            paddingBottom: 12,
            borderTopWidth: 0,
          },
          default: {
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 10),
            height: 72,
            paddingBottom: 10,
            paddingTop: 6,
            borderRadius: 16,
            borderTopWidth: 0,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <AntDesign name="heart" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Feather name="message-square" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
