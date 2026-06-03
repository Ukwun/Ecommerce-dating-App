import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  FadeInDown, FadeInRight, useSharedValue,
  useAnimatedStyle, withSpring, withTiming, runOnJS,
  SlideInRight,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';

type Address = {
  _id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  estimatedDeliveryPrice?: number;
  distanceFromWarehouse?: number;
};

const fetchAddresses = async (): Promise<Address[]> => {
  const res = await axiosInstance.get('/shipping/api/shipping-addresses');
  return res.data.data || [];
};

const deleteAddress = async (id: string) => {
  await axiosInstance.delete(`/shipping/api/shipping-addresses/${id}`);
};

const setDefault = async (address: Address) => {
  await axiosInstance.post('/shipping/api/shipping-address', { ...address, _id: address._id, isDefault: true });
};

function AddressCard({ item, index, onDelete, onSetDefault, onEdit }: {
  item: Address; index: number;
  onDelete: (id: string) => void;
  onSetDefault: (item: Address) => void;
  onEdit: (item: Address) => void;
}) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(item._id) },
        ]);
      }}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View entering={SlideInRight.delay(index * 80).springify()} style={cardStyle}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPressIn={() => { scale.value = withSpring(0.98); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          onPress={() => onEdit(item)}
          style={[styles.card, item.isDefault && styles.defaultCard]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconCircle, item.isDefault && styles.iconCircleDefault]}>
              <Ionicons name="location" size={22} color={item.isDefault ? '#FF8C00' : '#6B7280'} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardAddress} numberOfLines={2}>
                {item.addressLine1}, {item.city}, {item.state}
              </Text>
              {item.estimatedDeliveryPrice !== undefined && (
                <Text style={styles.deliveryCost}>
                  🚚 Delivery: ₦{item.estimatedDeliveryPrice.toLocaleString()}
                  {item.distanceFromWarehouse ? ` · ${item.distanceFromWarehouse.toFixed(1)}km` : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.cardActions}>
            {!item.isDefault && (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={(e) => { e.stopPropagation(); onSetDefault(item); }}
              >
                <Text style={styles.setDefaultText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

export default function ShippingScreen() {
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading, refetch } = useQuery({
    queryKey: ['shippingAddresses'],
    queryFn: fetchAddresses,
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shippingAddresses'] });
      Toast.show({ type: 'success', text1: 'Address deleted' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to delete address' }),
  });

  const defaultMutation = useMutation({
    mutationFn: setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shippingAddresses'] });
      Toast.show({ type: 'success', text1: '✅ Default address updated' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update default address' }),
  });

  const handleEdit = (item: Address) => {
    router.push({
      pathname: '/(routes)/shipping/edit',
      params: {
        _id: item._id,
        name: item.name,
        addressLine1: item.addressLine1,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        country: item.country,
        isDefault: String(item.isDefault),
      },
    } as any);
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipping Addresses</Text>
          <TouchableOpacity
            onPress={() => router.push('/(routes)/shipping/add' as any)}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading addresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyBox}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={72} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptySubtitle}>Add a delivery address to get started</Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => router.push('/(routes)/shipping/add' as any)}
            >
              <Text style={styles.addFirstBtnText}>+ Add First Address</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <AddressCard
                item={item}
                index={index}
                onDelete={(id) => deleteMutation.mutate(id)}
                onSetDefault={(a) => defaultMutation.mutate(a)}
                onEdit={handleEdit}
              />
            )}
            ListFooterComponent={
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <TouchableOpacity
                  style={styles.addMoreBtn}
                  onPress={() => router.push('/(routes)/shipping/add' as any)}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FF8C00" />
                  <Text style={styles.addMoreText}>Add New Address</Text>
                </TouchableOpacity>
              </Animated.View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultCard: { borderWidth: 2, borderColor: '#FF8C00' },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  iconCircleDefault: { backgroundColor: '#FEF3C7' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  defaultBadge: { backgroundColor: '#FF8C00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  defaultBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardAddress: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  deliveryCost: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 4 },
  cardActions: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  setDefaultBtn: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  setDefaultText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginLeft: 8, gap: 4 },
  deleteText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 15 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  addFirstBtn: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25, marginTop: 8 },
  addFirstBtnText: { color: '#FF8C00', fontWeight: '700', fontSize: 16 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, marginTop: 4 },
  addMoreText: { color: '#FF8C00', fontWeight: '700', fontSize: 15 },
});
