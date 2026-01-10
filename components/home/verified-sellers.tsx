import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';

// Mock data for verified sellers
const verifiedSellers = [
  { id: 'seller1', name: 'GadgetGod', avatar: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller2', name: 'Fashionista', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller3', name: 'HomeGoods', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller4', name: 'Bookworm', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller5', name: 'ToyMaster', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller6', name: 'Artisan', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller7', name: 'VintageFinds', avatar: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller8', name: 'Techie', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller9', name: 'GreenThumb', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces' },
  { id: 'seller10', name: 'FitLife', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces' },
];

export default function VerifiedSellers() {
  const { isDark } = useTheme();
  const handlePressSeller = (seller: typeof verifiedSellers[0]) => {
    // Navigate to the seller route using typed dynamic path
    router.push({
      pathname: '/(routes)/seller/[sellerId]',
      params: { sellerId: seller.id, name: seller.name, avatar: seller.avatar }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#D1D5DB' : '#FFFFFF' }]}>Verified Sellers</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {verifiedSellers.map((seller) => (
          <TouchableOpacity
            key={seller.id}
            style={styles.sellerCard}
            onPress={() => handlePressSeller(seller)}
          >
            <Image source={{ uri: seller.avatar }} style={styles.avatar} />
            <Text style={[styles.sellerName, { color: isDark ? '#E5E7EB' : '#FFFFFF' }]} numberOfLines={1}>{seller.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  scrollContainer: {
    paddingHorizontal: 14,
  },
  sellerCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});