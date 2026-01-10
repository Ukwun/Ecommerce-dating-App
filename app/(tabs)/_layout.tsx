
import React from 'react';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { BlurTabBarBackground } from '@/components/ui/blur-tab-bar-background';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
            height: 64,
            paddingBottom: 8,
            borderTopWidth: 0,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Feather name="heart" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <AntDesign name="star" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <AntDesign name="message" size={size} color={color} />,
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
