import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { TouchableOpacity, Text } from 'react-native';

export default function SellerLayout() {
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
          title: 'Seller Dashboard',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                // Settings
                router.push('/(seller)/profile');
              }}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>⚙️</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'My Orders',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
