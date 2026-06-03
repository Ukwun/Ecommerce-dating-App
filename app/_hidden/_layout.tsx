import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function HiddenLayout() {
  const { isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: isDark ? '#111827' : '#fff' },
        animationEnabled: true,
        animationTypeForReplace: 'pop',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="wishlist" options={{ presentation: 'modal' }} />
      <Stack.Screen name="wishlist_full" options={{ presentation: 'modal' }} />
      <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
      <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
      <Stack.Screen name="order-confirmation" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="empty-cart.json" />
    </Stack>
  );
}
