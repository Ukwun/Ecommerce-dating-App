import React, { useRef, useState } from 'react';
import {
  Dimensions, StyleSheet, Text, View, Image,
  TouchableOpacity, FlatList, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  withTiming, interpolate, Extrapolation, FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Buy & Sell Anything',
    subtitle: 'Discover thousands of products from verified sellers across Nigeria. Best prices, guaranteed.',
    gradient: ['#FF8C00', '#FF5F6D'] as [string, string],
    emoji: '🛍️',
  },
  {
    id: '2',
    title: 'Meet Your Match',
    subtitle: 'Find meaningful connections with people who share your interests, all in one app.',
    gradient: ['#FF006E', '#9B27AF'] as [string, string],
    emoji: '💖',
  },
  {
    id: '3',
    title: 'Secure & Fast',
    subtitle: 'Pay securely with Paystack. Real-time delivery tracking. 24/7 customer support.',
    gradient: ['#0EA5E9', '#0D4B7C'] as [string, string],
    emoji: '⚡',
  },
];

function Dot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const aStyle = useAnimatedStyle(() => ({
    width: withSpring(activeIndex === index ? 28 : 8),
    opacity: withTiming(activeIndex === index ? 1 : 0.4),
    backgroundColor: '#fff',
  }));
  return <Animated.View style={[styles.dot, aStyle]} />;
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleSkip = async () => {
    await AsyncStorage.setItem('@onboarding_done', '1');
    router.replace('/(routes)/login' as any);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    btnScale.value = withSpring(0.93, {}, () => { btnScale.value = withSpring(1); });
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      handleSkip();
    }
  };

  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index }) => (
          <LinearGradient colors={item.gradient} style={styles.slide}>
            {/* Background decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            {/* Skip */}
            {index < SLIDES.length - 1 && (
              <Animated.View entering={FadeIn.delay(300)} style={styles.skipRow}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Content */}
            <View style={styles.slideContent}>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emojiBox}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(300).springify()} style={styles.title}>
                {item.title}
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(400).springify()} style={styles.subtitle}>
                {item.subtitle}
              </Animated.Text>
            </View>

            {/* Bottom image */}
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.imageBox}>
              <Image
                source={require('../../assets/onboarding/onboarding.jpg')}
                style={styles.slideImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', item.gradient[1]]}
                style={styles.imageOverlay}
              />
            </Animated.View>
          </LinearGradient>
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: SLIDES[activeIndex].gradient[1] }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => <Dot key={i} index={i} activeIndex={activeIndex} />)}
        </View>

        <Animated.View style={btnStyle}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={1}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>
                {activeIndex === SLIDES.length - 1 ? "Let's Go 🚀" : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, flex: 1, position: 'relative' },
  bgCircle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.08)', top: -80, right: -80 },
  bgCircle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 120, left: -60 },
  skipRow: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  skipText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 80, zIndex: 2 },
  emojiBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  emoji: { fontSize: 48 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 16, lineHeight: 40 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  imageBox: { position: 'absolute', bottom: 80, left: 0, right: 0, height: height * 0.28, overflow: 'hidden' },
  slideImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  footer: { paddingHorizontal: 28, paddingBottom: 48, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { borderRadius: 50, overflow: 'hidden' },
  nextBtnGradient: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
