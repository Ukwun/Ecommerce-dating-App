import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/hooks/AuthContext';
import OnboardingScreen from '../screens/onboarding/onboarding.screen';
import LoginScreen from './(routes)/login';
import SignupScreen from './(routes)/signup';
import ForgotPasswordScreen from './(routes)/forgot-password';

function BrandIntro({ onDone }: { onDone: () => void }) {
  const scale = useSharedValue(0.92); const opacity = useSharedValue(1); const lift = useSharedValue(8);
  useEffect(() => {
    scale.value = withSequence(withSpring(1.08, { damping: 10, stiffness: 150 }), withSpring(1, { damping: 13 })); lift.value = withDelay(180, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(onDone, 1750); return () => clearTimeout(timer);
  }, [lift, onDone, scale]);
  const logoStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }, { translateY: lift.value }] }));
  return <Animated.View exiting={FadeOut.duration(260)} style={styles.intro}><View style={styles.glow} /><Animated.View style={[styles.logoShell, logoStyle]}><Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="cover" /></Animated.View><Animated.View entering={FadeIn.delay(420).duration(450)} style={styles.wordmark}><Text style={styles.name}>BizMingle</Text><Text style={styles.tagline}>Shop. Connect. Belong.</Text></Animated.View></Animated.View>;
}

export default function Index() {
  const { user, isLoading } = useAuth(); const [introComplete, setIntroComplete] = useState(false); const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot'>('login');
  const completeIntro = useCallback(() => setIntroComplete(true), []);
  if (!introComplete || isLoading || onboardingComplete === null) return <BrandIntro onDone={completeIntro} />;
  if (user?.roles?.admin?.role === 'super_admin') return <Redirect href={'/(admin)/admin-dashboard' as any} />;
  if (user) return <Redirect href={'/(tabs)/home' as any} />;
  if (onboardingComplete) {
    if (authPage === 'signup') return <SignupScreen onSignIn={() => setAuthPage('login')} />;
    if (authPage === 'forgot') return <ForgotPasswordScreen onBack={() => setAuthPage('login')} />;
    return <LoginScreen onSignUp={() => setAuthPage('signup')} onForgotPassword={() => setAuthPage('forgot')} />;
  }
  return <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />;
}

const styles = StyleSheet.create({ intro: { flex: 1, backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center' }, glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFF0DF', opacity: 0.9 }, logoShell: { width: 112, height: 112, borderRadius: 34, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#F97316', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 }, logo: { width: '100%', height: '100%' }, wordmark: { alignItems: 'center', marginTop: 24 }, name: { color: '#111827', fontSize: 30, fontWeight: '900', letterSpacing: -1.1 }, tagline: { color: '#6B7280', fontSize: 13, fontWeight: '600', letterSpacing: 0.7, marginTop: 7 } });
