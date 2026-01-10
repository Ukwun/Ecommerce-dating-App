import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import { ProductCard } from '@/components/home/products';
import { useCart } from '@/hooks/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ProductSkeleton from '@/components/skeleton/product.skeleton';
import { LinearGradient } from 'expo-linear-gradient';import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';
import { MotiView } from 'moti';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MONTHS = ['October', 'September', 'August', 'July'];

// Mock analytics data for different months
const mockAnalytics = {
  'October': { earnings: '₦125,500', itemsSold: 88, profileViews: 1200 },
  'September': { earnings: '₦98,200', itemsSold: 72, profileViews: 950 },
  'August': { earnings: '₦150,000', itemsSold: 110, profileViews: 1500 },
  'July': { earnings: '₦75,600', itemsSold: 55, profileViews: 800 },
};

// Mock data for seller-specific reviews
const mockSellerReviews = [
  { id: 'r1', userName: 'Alice', rating: 5, comment: 'Amazing seller! Fast shipping and product was exactly as described. Highly recommended!', date: '2023-10-28' },
  { id: 'r2', userName: 'Bob', rating: 4, comment: 'Good communication, but shipping took a bit longer than expected. Overall a positive experience.', date: '2023-10-25' },
  { id: 'r3', userName: 'Charlie', rating: 5, comment: 'Fantastic! Will definitely buy from this seller again.', date: '2023-10-22' },
];

// Mock data for transaction history
const mockTransactions = [
    { id: 't1', month: 'October', sales: 88, revenue: 125500 },
    { id: 't2', month: 'September', sales: 72, revenue: 98200 },
    { id: 't3', month: 'August', sales: 110, revenue: 150000 },
];

const AnalyticsCard = ({ icon, label, value, index, style }: { icon: any; label: string; value: string | number; index: number; style?: any }) => (
  <MotiView
    from={{ opacity: 0, translateY: 20 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{
      type: 'spring',
      damping: 15,
      stiffness: 100,
      delay: 100 + index * 100,
    }}
    style={[styles.analyticsCard, style]}
  >
    <>
      <MaterialCommunityIcons name={icon} size={28} color="#FFD700" />
      {/* Use a key to force re-render on month change */}
      <Text key={value} style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </>
  </MotiView>
);

export default function SellerProfileScreen() {
  const { sellerId, name, avatar } = useLocalSearchParams<{ sellerId: string; name: string; avatar: string }>();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();

  // NOTE: This fetches all products. In a real app, you would have an endpoint like `/products/seller/${sellerId}`
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('collection'); // collection, reviews, activity
  const { height } = useWindowDimensions();
  const DRAGGABLE_PANEL_TOP = height * 0.5;
  const DRAGGABLE_PANEL_BOTTOM = height - 250;

  const translateY = useSharedValue(DRAGGABLE_PANEL_BOTTOM);
  const scrollY = useSharedValue(0);

  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products', 'seller', sellerId],
    queryFn: async () => {
      const response = await axiosInstance.get('/product/api/get-all-products');
      // Mocking seller-specific products by taking a slice. Replace with real API filtering.
      return (response.data?.products ?? []).slice(0, 8);
    },
    // Mock top selling products from the fetched list
    select: (data) => ({ all: data, top: data.slice(0, 3) }),
  });

  const handleToggleWishlist = (id: string) => {
    const action = wishlistIds.includes(id) ? 'remove' : 'add';
    toggleWishlist(id);
  };

  const context = useSharedValue({ y: 0 });
  const sheetGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = event.translationY + context.value.y;
      // Clamp the drag to be within the top and bottom bounds
      translateY.value = Math.max(DRAGGABLE_PANEL_TOP, Math.min(newY, DRAGGABLE_PANEL_BOTTOM));
    })
    .onEnd((event) => {
      if (event.velocityY > 500) { // Fling down
        translateY.value = withSpring(DRAGGABLE_PANEL_BOTTOM, { damping: 18, stiffness: 120 });
      } else if (event.velocityY < -500) { // Fling up
        translateY.value = withSpring(DRAGGABLE_PANEL_TOP, { damping: 18, stiffness: 120 });
      } else { // Snap to nearest point
        if (translateY.value > (DRAGGABLE_PANEL_TOP + DRAGGABLE_PANEL_BOTTOM) / 2) {
          translateY.value = withSpring(DRAGGABLE_PANEL_BOTTOM, { damping: 18, stiffness: 120 });
        } else {
          translateY.value = withSpring(DRAGGABLE_PANEL_TOP, { damping: 18, stiffness: 120 });
        }
      }
    });

  const animatedPanelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [DRAGGABLE_PANEL_BOTTOM, DRAGGABLE_PANEL_TOP],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  const analytics = mockAnalytics[selectedMonth as keyof typeof mockAnalytics];

  const MonthSelectorModal = () => (
    <Modal
      transparent={true}
      visible={isMonthModalVisible}
      animationType="fade"
      onRequestClose={() => setIsMonthModalVisible(false)}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMonthModalVisible(false)}>
        <View style={styles.modalContent}>
          {MONTHS.map((month) => (
            <TouchableOpacity
              key={month}
              style={styles.monthOption}
              onPress={() => {
                setSelectedMonth(month);
                setIsMonthModalVisible(false);
              }}
            >
              <Text style={[styles.monthOptionText, selectedMonth === month && styles.selectedMonthOptionText]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reviews':
        return (
          <FlatList
            data={mockSellerReviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{item.userName}</Text>
                  <Text style={styles.reviewDate}>{item.date}</Text>
                </View>
                <View style={styles.ratingRow}>
                  {[...Array(5)].map((_, i) => <Ionicons key={i} name="star" size={16} color={i < item.rating ? '#FFD700' : '#E5E7EB'} />)}
                </View>
                <Text style={styles.reviewComment}>{item.comment}</Text>
              </View>
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 250 }}
          />
        );
      case 'activity':
        return (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 250 }}>
            <Text style={styles.activitySectionTitle}>Top Selling Products</Text>
            {products?.top?.map((item: any) => (
              <TouchableOpacity key={item._id} style={styles.topProductCard} onPress={() => router.push(`/product/${item._id}` as any)}>
                <Image source={{ uri: item.image }} style={styles.topProductImage} />
                <View style={styles.topProductDetails}>
                  <Text style={styles.topProductName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.topProductPrice}>₦{(item.price || 0).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.activitySectionTitle}>Sales History</Text>
      {mockTransactions.map((item: any) => (
        <View key={item.id} style={styles.transactionCard}>
          <Text style={styles.transactionMonth}>{item.month}</Text>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionLabel}>Sales: <Text style={styles.transactionValue}>{item.sales}</Text></Text>
            <Text style={styles.transactionLabel}>Revenue: <Text style={styles.transactionValue}>₦{item.revenue.toLocaleString()}</Text></Text>
          </View>
        </View>
      ))}
          </ScrollView>
        );
      case 'collection':
      default:
        return (
          <FlatList
            data={products?.all}
            renderItem={({ item }) => <ProductCard item={item} wishlist={wishlistIds} toggleWishlist={handleToggleWishlist} addToCart={addToCart} />}
            keyExtractor={(item) => item._id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 14 }}
            contentContainerStyle={{ paddingBottom: 250, paddingTop: 10 }}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#333" />}
          />
        );
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <MonthSelectorModal />

        <View style={styles.sellerHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <Text style={styles.sellerName}>{name}</Text>
          <Text style={styles.sellerSubtext}>Verified Seller</Text>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat/${sellerId}?name=${encodeURIComponent(name ?? '')}&avatar=${encodeURIComponent(avatar ?? '')}`)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111827" />
            <Text style={styles.chatButtonText}>Chat with Seller</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.analyticsContainer, animatedHeaderStyle]}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>Seller Analytics</Text>
            <TouchableOpacity style={styles.monthSelector} onPress={() => setIsMonthModalVisible(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.monthText}>{selectedMonth}</Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.bentoGrid}>
            <AnalyticsCard key={`earnings-${selectedMonth}`} icon="cash-multiple" label="Earnings" value={analytics.earnings} index={0} style={styles.bentoLarge} />
            <View style={styles.bentoSmallContainer}>
              <AnalyticsCard key={`sold-${selectedMonth}`} icon="package-variant-closed" label="Items Sold" value={analytics.itemsSold} index={1} style={styles.bentoSmall} />
              <AnalyticsCard key={`views-${selectedMonth}`} icon="account-eye-outline" label="Profile Views" value={analytics.profileViews.toLocaleString()} index={2} style={styles.bentoSmall} />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.draggablePanel, animatedPanelStyle]}>
          <GestureDetector gesture={sheetGesture}>
            <View style={styles.panelHeader}>
              <View style={styles.grabber} />
              <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('collection')} style={[styles.tabButton, activeTab === 'collection' && styles.activeTabButton]}>
                  <Text style={[styles.tabText, activeTab === 'collection' && styles.activeTabText]}>Collection</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('reviews')} style={[styles.tabButton, activeTab === 'reviews' && styles.activeTabButton]}>
                  <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('activity')} style={[styles.tabButton, activeTab === 'activity' && styles.activeTabButton]}>
                  <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Activity</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>
          {isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 14, paddingTop: 20 }}>
              {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
            </View> 
          ) : renderTabContent()}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  sellerHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  sellerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  sellerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
  },
  chatButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  analyticsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  monthText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 4,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
    height: 180, // Give the bento grid a fixed height
  },
  bentoLarge: {
    flex: 2,
  },
  bentoSmallContainer: {
    flex: 1,
    gap: 10,
  },
  bentoSmall: {
    flex: 1,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  draggablePanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  panelHeader: {
    alignItems: 'center',
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  grabber: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 2.5,
    marginBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C00',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  topProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  topProductDetails: {
    flex: 1,
  },
  topProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  topProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginTop: 4,
  },
  transactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  transactionMonth: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  transactionDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  transactionLabel: { fontSize: 14, color: '#4B5563' },
  transactionValue: { fontWeight: '600', color: '#111827' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    width: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  monthOption: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  monthOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedMonthOptionText: {
    fontWeight: 'bold',
    color: '#FF8C00',
  },
});