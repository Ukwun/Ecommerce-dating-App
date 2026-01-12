import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import axiosInstance from '../utils/axiosinstance';

const { width } = Dimensions.get('window');

const plans = [
  { id: '1', duration: '1', unit: 'month', price: '9.99', label: 'Starter' },
  { id: '2', duration: '6', unit: 'months', price: '4.99', label: 'Most Popular', save: '50%' },
  { id: '3', duration: '12', unit: 'months', price: '3.99', label: 'Best Value', save: '60%' },
];

const features = [
  { icon: 'heart', text: 'See who likes you' },
  { icon: 'infinite', text: 'Unlimited Likes' },
  { icon: 'star', text: '5 Super Likes a day' },
  { icon: 'flash', text: '1 Boost a month' },
  { icon: 'airplane', text: 'Passport to any location' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(plans[1]);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Mock payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call backend to update status
      await axiosInstance.post('/auth/api/subscribe', { planId: selectedPlan.id });
      
      // Update local user context
      await updateUser({ isPremium: true });
      
      Alert.alert('Welcome to Premium!', 'You now have access to all premium features.', [
        { text: 'Awesome', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFD700', '#FFAA00']} style={styles.headerBackground} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Get Premium</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="crown" size={50} color="#FFD700" />
            </View>
            <Text style={styles.appName}>Tinder Gold</Text>
            <Text style={styles.tagline}>Unlock all features & find matches faster</Text>
          </View>

          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={feature.icon as any} size={20} color="#FFD700" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan)}
                  style={[styles.planCard, isSelected && styles.selectedPlanCard]}
                >
                  {plan.save && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveText}>SAVE {plan.save}</Text>
                    </View>
                  )}
                  <Text style={[styles.planDuration, isSelected && styles.selectedText]}>{plan.duration}</Text>
                  <Text style={[styles.planUnit, isSelected && styles.selectedText]}>{plan.unit}</Text>
                  <Text style={[styles.planPrice, isSelected && styles.selectedText]}>${plan.price}/mo</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={loading}
            style={styles.subscribeButton}
          >
            <LinearGradient
              colors={['#FFD700', '#FFAA00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.subscribeText}>CONTINUE</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            Recurring billing, cancel anytime. By tapping Continue, you agree to our Terms and Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  closeButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  featuresContainer: { backgroundColor: '#1F2937', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 30 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: { marginRight: 12 },
  featureText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  plansContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 30 },
  planCard: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, paddingVertical: 20, alignItems: 'center', borderWidth: 2, borderColor: '#374151', position: 'relative' },
  selectedPlanCard: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.1)' },
  saveBadge: { position: 'absolute', top: -12, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  saveText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  planDuration: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  planUnit: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  planPrice: { fontSize: 16, fontWeight: '600', color: '#fff' },
  selectedText: { color: '#FFD700' },
  subscribeButton: { marginHorizontal: 20, borderRadius: 30, overflow: 'hidden', marginBottom: 16 },
  gradientButton: { paddingVertical: 18, alignItems: 'center' },
  subscribeText: { color: '#000', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  disclaimer: { textAlign: 'center', color: '#6B7280', fontSize: 12, paddingHorizontal: 40 },
});