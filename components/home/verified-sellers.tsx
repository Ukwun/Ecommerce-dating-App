import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import axiosInstance from '@/utils/axiosinstance';
import { useTheme } from '@/hooks/useTheme';

export default function VerifiedSellers() {
  const { isDark } = useTheme();
  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['verified-sellers'],
    queryFn: async () => (await axiosInstance.get('/auth/api/verified-sellers')).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <ActivityIndicator style={styles.loading} color="#FFD700" />;
  if (!sellers.length) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#D1D5DB' : '#FFFFFF' }]}>Verified Sellers</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {sellers.map((seller: any) => {
          const user = seller.userId;
          const sellerId = seller._id;
          const name = seller.businessName || user?.name || 'Verified seller';
          const avatar = seller.businessLogo || user?.avatar;
          return (
            <TouchableOpacity key={sellerId} style={styles.sellerCard} onPress={() => router.push({ pathname: '/(routes)/seller/[sellerId]', params: { sellerId } })}>
              {avatar ? <Image source={{ uri: typeof avatar === 'string' ? avatar : avatar.url }} style={styles.avatar} /> : <View style={[styles.avatar, styles.fallback]}><Text style={styles.initial}>{name[0]}</Text></View>}
              <Text style={[styles.sellerName, { color: isDark ? '#E5E7EB' : '#FFFFFF' }]} numberOfLines={1}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 12 },
  loading: { marginVertical: 28 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14, paddingHorizontal: 14 },
  scrollContainer: { paddingHorizontal: 14 },
  sellerCard: { alignItems: 'center', marginRight: 16, width: 80 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#FFD700', marginBottom: 8 },
  fallback: { backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sellerName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
