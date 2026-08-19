import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '@/hooks/AuthContext';

export default function SellerLayout() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (user?.roles?.seller?.status !== 'approved') return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: theme.colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="seller-dashboard" options={{ title: 'Seller Dashboard', headerRight: () => <TouchableOpacity onPress={() => router.push('/(seller)/seller-profile' as any)} style={{ marginRight: 15 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Settings</Text></TouchableOpacity> }} />
      <Stack.Screen name="seller-profile" options={{ title: 'My Profile', headerBackTitle: 'Back' }} />
      <Stack.Screen name="orders" options={{ title: 'My Orders', headerBackTitle: 'Back' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
