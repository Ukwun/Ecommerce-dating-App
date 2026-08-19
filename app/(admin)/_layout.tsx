import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '@/hooks/AuthContext';

export default function AdminLayout() {
  const theme = useTheme();
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!user?.roles?.admin) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: theme.colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="admin-dashboard" options={{ title: 'Admin Control Panel', headerRight: () => <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text></TouchableOpacity> }} />
      <Stack.Screen name="seller-approval" options={{ title: 'Approve Sellers', headerBackTitle: 'Back' }} />
      <Stack.Screen name="returns-management" options={{ title: 'Manage Returns', headerBackTitle: 'Back' }} />
      <Stack.Screen name="support-queue" options={{ title: 'Support Tickets', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
