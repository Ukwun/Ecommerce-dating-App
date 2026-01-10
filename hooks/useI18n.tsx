import React from 'react';
let localeGuess = 'en';
try {
  // try to require expo-localization at runtime (optional dependency)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Localization = require('expo-localization');
  localeGuess = (Localization?.locale || 'en').split('-')[0];
} catch (e) {
  // fallback to en
  localeGuess = 'en';
}

const translations: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings',
    language: 'Language',
    currency: 'Currency',
    delivery: 'Delivery',
    home: 'Home',
    station: 'Station',
    notifications: 'Notifications',
  },
  fr: {
    settings: 'Paramètres',
    language: 'Langue',
    currency: 'Devise',
    delivery: 'Livraison',
    home: 'Domicile',
    station: 'Station',
    notifications: 'Notifications',
  }
};

export const useI18n = (lang?: string) => {
  const locale = lang || localeGuess || 'en';
  const t = (key: string) => translations[locale]?.[key] ?? translations['en'][key] ?? key;
  return { t, locale };
};
