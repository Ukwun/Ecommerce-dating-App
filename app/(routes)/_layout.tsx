import React from 'react';
import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function RoutesLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
