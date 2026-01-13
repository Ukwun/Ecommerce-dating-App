import React, { useRef, useEffect, useCallback, useState } from 'react'
import { View, Text, Image, StyleSheet, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TouchableOpacity } from 'react-native'
import VectorSvg from '@/assets/svgs/vector'

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 190;

const banners = [
  {
    id: '1',
    image: require('@/assets/images/banners/1.jpg'),
    title: 'Up to 50% Discounts',
    specialText: true,
  },
  {
    id: '2',
    image: require('@/assets/images/banners/2.jpg'),
    title: 'Flash Sale Friday!',
    specialText: false,
  },
  {
    id: '3',
    image: require('@/assets/images/banners/3.jpg'),
    title: 'New Fashion Arrivals',
    specialText: false,
  },
  {
    id: '4',
    image: require('@/assets/images/banners/1.jpg'),
    title: 'Home Decor Deals',
    specialText: false,
  },
];

const BannerItem = ({ item }: { item: typeof banners[0] }) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.touchable}>
    <Image source={item.image} style={styles.image} resizeMode="cover" />

    <LinearGradient
      colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.1)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.overlayLeft}>
        <Text style={styles.bannerTitle}>
          {item.title}
        </Text>

        {item.specialText && (
          <View style={{ position: 'relative' }}>
            <View style={{ position: 'absolute', bottom: -44, left: -24 }}>
              <VectorSvg />
            </View>
            <View style={{ position: 'absolute', bottom: -16, left: 0 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Happening</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Now</Text>
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

export default function BigSaleBanner() {
  const flatListRef = useRef<FlatList | null>(null);
  const scrollIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const nextIndex = (scrollIndex.current + 1) % banners.length;
      scrollIndex.current = nextIndex;
      flatListRef.current?.scrollToIndex({
        animated: true,
        index: nextIndex,
      });
    }, 10000); // 10 seconds
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoScroll]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const index = Math.round(scrollPosition / BANNER_HEIGHT);
    setActiveIndex(index);
    scrollIndex.current = index;
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={({ item }) => <BannerItem item={item} />}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        style={{ height: BANNER_HEIGHT }}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }}
        onScrollEndDrag={() => {
          startAutoScroll();
        }}
      />
      <View style={styles.paginationContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              activeIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    position: 'relative',
  },
  touchable: {
    width: width - 32,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 24,
    width: '60%',
  },
  bannerTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  paginationContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginVertical: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    height: 20,
  },
})
