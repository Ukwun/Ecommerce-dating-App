import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

type HeaderProps = {
  wishlist?: string[];
  toggleWishlist?: (id: string) => void;
  cartCount?: number;
}

export default function Header({ cartCount = 0 }: HeaderProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCartCount = useRef(cartCount);

  useEffect(() => {
    // Animate only when cart count increases, not on initial render or decrease
    if (cartCount > prevCartCount.current) {
      scaleAnim.setValue(1); // Reset animation value
      // Start the "pop" animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    // Update the previous cart count for the next render
    prevCartCount.current = cartCount;
  }, [cartCount, scaleAnim]);

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

 return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop</Text>

      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => router.push('/_hidden/wishlist')} style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/_hidden/cart')} style={styles.iconButton}>
          <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
          {cartCount > 0 && (
            <Animated.View style={[styles.badgeContainer, animatedStyle]}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', paddingVertical: 10 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  iconContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { marginRight: 8, position: 'relative' },
  badgeContainer: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF8C00',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
