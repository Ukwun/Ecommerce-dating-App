import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';

export default function AdminLayout() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Admin Control Panel',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                // Logout handler
                router.replace('/(tabs)');
              }}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="seller-approval"
        options={{
          title: 'Approve Sellers',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="returns-management"
        options={{
          title: 'Manage Returns',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="support-queue"
        options={{
          title: 'Support Tickets',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}

import { TouchableOpacity, Text } from 'react-native';
