import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View, ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Slide = { id: string; eyebrow: string; title: string; subtitle: string; icon: IconName; accent: string; tint: string; points: { icon: IconName; label: string }[] };

const SLIDES: Slide[] = [
  { id: 'marketplace', eyebrow: 'A marketplace that feels local', title: 'Find it. Love it.\nMake it yours.', subtitle: 'Shop real listings from approved sellers, save favourites, chat, and keep every order in one place.', icon: 'storefront-outline', accent: '#F97316', tint: '#FFF3E8', points: [{ icon: 'shield-checkmark-outline', label: 'Approved sellers' }, { icon: 'sparkles-outline', label: 'Personal discovery' }] },
  { id: 'connection', eyebrow: 'More than shopping', title: 'Meet people who\nmatch your energy.', subtitle: 'Opt into meaningful connections with privacy controls, reporting, and blocking always close at hand.', icon: 'people-outline', accent: '#DB2777', tint: '#FDF2F8', points: [{ icon: 'heart-outline', label: 'Shared interests' }, { icon: 'lock-closed-outline', label: 'Safety controls' }] },
  { id: 'confidence', eyebrow: 'Built for real transactions', title: 'Shop, sell and connect\nwith confidence.', subtitle: 'Secure Paystack checkout, seller-specific fulfilment, real order updates, and support when you need it.', icon: 'checkmark-done-circle-outline', accent: '#2563EB', tint: '#EFF6FF', points: [{ icon: 'card-outline', label: 'Secure payments' }, { icon: 'chatbubble-ellipses-outline', label: 'Real support' }] },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  const finishOnboarding = useCallback(() => {
    if (finishing) return;
    setFinishing(true);
    onComplete();
    void AsyncStorage.setItem('@onboarding_done', '1').catch(() => undefined);
  }, [finishing, onComplete]);

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    buttonScale.value = withSpring(0.96, {}, () => { buttonScale.value = withSpring(1); });
    if (activeIndex === SLIDES.length - 1) return finishOnboarding();
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Slide>[] }) => {
    if (typeof viewableItems[0]?.index === 'number') setActiveIndex(viewableItems[0].index);
  }).current;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />
      <View style={styles.header}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandLetter}>B</Text></View><Text style={styles.brand}>BizMingle</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" hitSlop={12} onPress={finishOnboarding} disabled={finishing} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text><Ionicons name="arrow-forward" size={16} color="#374151" />
        </Pressable>
      </View>

      <FlatList
        ref={listRef} data={SLIDES} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id} viewabilityConfig={{ itemVisiblePercentThreshold: 60 }} onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Animated.View entering={FadeInUp.duration(450)} style={[styles.visual, { backgroundColor: item.tint }]}>
              <View style={[styles.orbit, styles.orbitLarge, { borderColor: `${item.accent}24` }]} /><View style={[styles.orbit, styles.orbitSmall, { borderColor: `${item.accent}35` }]} />
              <LinearGradient colors={[item.accent, `${item.accent}CC`]} style={styles.iconCard}><Ionicons name={item.icon} size={72} color="#FFFFFF" /></LinearGradient>
              <View style={[styles.floatBadge, styles.floatBadgeLeft]}><Ionicons name={item.points[0].icon} size={18} color={item.accent} /><Text style={styles.floatText}>{item.points[0].label}</Text></View>
              <View style={[styles.floatBadge, styles.floatBadgeRight]}><Ionicons name={item.points[1].icon} size={18} color={item.accent} /><Text style={styles.floatText}>{item.points[1].label}</Text></View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.copy}>
              <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow.toUpperCase()}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.subtitle}>{item.subtitle}</Text>
            </Animated.View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>{SLIDES.map((slide, index) => <View key={slide.id} style={[styles.dot, index === activeIndex && { width: 28, backgroundColor: SLIDES[activeIndex].accent }]} />)}</View>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={activeIndex === SLIDES.length - 1 ? 'Go to sign in' : 'Next onboarding page'} onPress={next} disabled={finishing} style={[styles.primaryButton, buttonStyle, { backgroundColor: SLIDES[activeIndex].accent }]}>
          {finishing ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>{activeIndex === SLIDES.length - 1 ? "Let's go" : 'Continue'}</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></>}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF8' }, header: { height: 68, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' }, brandLetter: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 }, brand: { color: '#111827', fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  skipButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 }, skipText: { color: '#374151', fontSize: 15, fontWeight: '700' },
  slide: { flex: 1, paddingHorizontal: 22, paddingTop: 12 }, visual: { flex: 1.12, maxHeight: 410, minHeight: 280, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderWidth: 1.5, borderRadius: 999 }, orbitLarge: { width: 330, height: 330 }, orbitSmall: { width: 230, height: 230 },
  iconCard: { width: 142, height: 142, borderRadius: 44, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowColor: '#111827', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  floatBadge: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7, shadowColor: '#111827', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 }, floatBadgeLeft: { left: 20, top: 34 }, floatBadgeRight: { right: 16, bottom: 32 }, floatText: { color: '#1F2937', fontWeight: '700', fontSize: 12 },
  copy: { paddingTop: 28, paddingHorizontal: 4 }, eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.3, marginBottom: 12 }, title: { color: '#111827', fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -1.4 }, subtitle: { color: '#667085', fontSize: 15.5, lineHeight: 23, marginTop: 14, maxWidth: 520 },
  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, dots: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  primaryButton: { minWidth: 146, minHeight: 54, borderRadius: 18, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: '#111827', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
