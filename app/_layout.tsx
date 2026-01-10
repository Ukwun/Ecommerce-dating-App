import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/hooks/AuthContext';
import { CartProvider } from '@/hooks/CartContext';
import { CheckoutProvider } from '@/hooks/CheckoutContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { SharedElementProvider } from '@/hooks/useSharedElement';
import { LogBox } from 'react-native';

// Suppress known deprecation warnings for libraries we can't control
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'Non-serializable values were found in the navigation state'
]);

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SharedElementProvider>
          <ThemeProvider>
            <AuthProvider>
              <CheckoutProvider>
                <CartProvider>
                  <Slot />
                  <Toast />
                </CartProvider>
              </CheckoutProvider>
            </AuthProvider>
          </ThemeProvider>
        </SharedElementProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
