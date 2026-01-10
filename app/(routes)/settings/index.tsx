import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCheckout } from '@/hooks/CheckoutContext';
import { useAuth } from '@/hooks/AuthContext';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { currency, setCurrency, language, setLanguage, deliveryOption, setDeliveryOption } = useCheckout();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const n = await AsyncStorage.getItem('@prefs_notifications');
        if (n !== null) setNotificationsEnabled(n === '1');
      } catch (e) { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@prefs_notifications', notificationsEnabled ? '1' : '0').catch(() => {});
  }, [notificationsEnabled]);

  const backgroundColors: [string, string] = isDark ? ['#111827', '#374151'] : ['#FF8C00', '#4B2E05'];
  const textColor = isDark ? '#F9FAFB' : '#FFFFFF';
  const cardBackgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)';
  const cardTextColor = isDark ? '#E5E7EB' : '#111827';

  return (
    <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.settingRow}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Dark Mode</Text>
              <Switch
                trackColor={{ false: '#767577', true: '#FFC107' }}
                thumbColor={isDark ? '#FF8C00' : '#f4f3f4'}
                onValueChange={toggleTheme}
                value={isDark}
              />
            </View>
          </View>

          {/* Language */}
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor, marginTop: 12 }]}>
            <View style={styles.settingRow}>
              <Ionicons name="language" size={22} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Language</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => setLanguage('en')} style={{ marginRight: 8 }}>
                  <Text style={{ color: language === 'en' ? '#111827' : cardTextColor }}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLanguage('fr')}>
                  <Text style={{ color: language === 'fr' ? '#111827' : cardTextColor }}>Français</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Currency */}
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor, marginTop: 12 }]}>
            <View style={styles.settingRow}>
              <Ionicons name="cash" size={22} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Currency</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => setCurrency('NGN')} style={{ marginRight: 8 }}>
                  <Text style={{ color: currency === 'NGN' ? '#111827' : cardTextColor }}>NGN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrency('USD')} style={{ marginRight: 8 }}>
                  <Text style={{ color: currency === 'USD' ? '#111827' : cardTextColor }}>USD</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrency('EUR')}>
                  <Text style={{ color: currency === 'EUR' ? '#111827' : cardTextColor }}>EUR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Delivery Option */}
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor, marginTop: 12 }]}>
            <View style={styles.settingRow}>
              <Ionicons name="bicycle" size={22} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Delivery</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: cardTextColor, marginRight: 8 }}>{deliveryOption === 'home' ? 'Home' : 'Station'}</Text>
                <Switch value={deliveryOption === 'home'} onValueChange={() => setDeliveryOption(deliveryOption === 'home' ? 'station' : 'home')} />
              </View>
            </View>
          </View>

          {/* Notifications */}
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor, marginTop: 12 }]}>
            <View style={styles.settingRow}>
              <Ionicons name="notifications" size={22} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>
          </View>

          {/* Quick links: Addresses and Payment Methods */}
          <View style={[styles.settingCard, { backgroundColor: cardBackgroundColor, marginTop: 12 }]}> 
            <TouchableOpacity onPress={() => router.push('/(routes)/shipping/')} style={[styles.settingRow, { paddingVertical: 14 }]}> 
              <Ionicons name="location-outline" size={20} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Manage Addresses</Text>
              <Ionicons name="chevron-forward" size={20} color={cardTextColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(routes)/payment')} style={[styles.settingRow, { paddingVertical: 14 }]}> 
              <Ionicons name="card-outline" size={20} color={cardTextColor} style={styles.icon} />
              <Text style={[styles.settingLabel, { color: cardTextColor }]}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color={cardTextColor} />
            </TouchableOpacity>
          </View>

          {/* Logout quick action */}
          <View style={{ marginTop: 18 }}>
            <TouchableOpacity onPress={() => logout().then(() => router.replace('/login'))} style={{ backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#DC2626', fontWeight: '700' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: {
    padding: 16,
  },
  settingCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  icon: {
    marginRight: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});