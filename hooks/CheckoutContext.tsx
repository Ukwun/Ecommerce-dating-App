import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/AuthContext';
import axiosInstance from '@/utils/axiosinstance';

type Address = {
  _id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type PaymentMethod = {
  _id: string;
  cardType: string;
  last4: string;
  isDefault: boolean;
};

interface CheckoutContextProps {
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  // New preferences
  currency: string;
  setCurrency: (c: string) => void;
  language: string;
  setLanguage: (l: string) => void;
  deliveryOption: 'home' | 'station';
  setDeliveryOption: (d: 'home' | 'station') => void;
}

const CheckoutContext = createContext<CheckoutContextProps | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  // Preferences persisted to AsyncStorage
  const [currency, setCurrency] = useState<string>('NGN');
  const [language, setLanguage] = useState<string>('en');
  const [deliveryOption, setDeliveryOption] = useState<'home' | 'station'>('home');

  // load persisted prefs on mount
  useEffect(() => {
    (async () => {
      try {
        const [c, l, d] = await Promise.all([
          AsyncStorage.getItem('@prefs_currency'),
          AsyncStorage.getItem('@prefs_language'),
          AsyncStorage.getItem('@prefs_delivery'),
        ]);
        if (c) setCurrency(c);
        if (l) setLanguage(l);
        if (d === 'home' || d === 'station') setDeliveryOption(d);
      } catch (e) {
        // ignore
        console.warn('Failed to load checkout prefs', e);
      }
    })();
  }, []);

  // persist prefs when they change
  useEffect(() => {
    AsyncStorage.setItem('@prefs_currency', currency).catch(() => {});
  }, [currency]);
  useEffect(() => {
    AsyncStorage.setItem('@prefs_language', language).catch(() => {});
  }, [language]);
  useEffect(() => {
    AsyncStorage.setItem('@prefs_delivery', deliveryOption).catch(() => {});
  }, [deliveryOption]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      axiosInstance.patch('/auth/api/preferences', { currency, language, deliveryOption })
        .catch((error) => console.warn('Failed to sync checkout preferences', error?.message));
    }, 400);
    return () => clearTimeout(timer);
  }, [currency, language, deliveryOption, user?.id]);

  return (
    <CheckoutContext.Provider
      value={{
        selectedAddress,
        setSelectedAddress,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        currency,
        setCurrency,
        language,
        setLanguage,
        deliveryOption,
        setDeliveryOption,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};
