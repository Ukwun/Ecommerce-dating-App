import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "./globals.css";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Providers from '../config/providers';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Only load system fonts to avoid Android blank screen
  const [loaded, error] = useFonts({
    // 'SpaceMono-Regular': require("../assets/fonts/SpaceMono-Regular.ttf"),
    // 'Inter-Regular': require("../assets/fonts/Inter-Regular.otf"),
    // 'Inter-SemiBold': require("../assets/fonts/Inter-SemiBold.otf"),
    // 'Inter-Bold': require("../assets/fonts/Inter-Bold.otf"),
    // 'Poppins-Regular': require("../assets/fonts/Poppins-Regular.ttf"),
    // 'Poppins-Medium': require("../assets/fonts/Poppins-Medium.ttf"),
    // 'Poppins-SemiBold': require("../assets/fonts/Poppins-SemiBold.ttf"),
    // 'Poppins-Bold': require("../assets/fonts/Poppins-Bold.ttf"),
    // 'Raleway-Regular': require("../assets/fonts/Raleway-Regular.ttf"),
    // 'Raleway-Bold': require("../assets/fonts/Raleway-Bold.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView>
        <Providers>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <StatusBar style="auto" />
        </Providers>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
