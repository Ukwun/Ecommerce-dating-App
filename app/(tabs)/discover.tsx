import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMarketplaceDiscovery } from '../../hooks/useMarketplaceDiscovery';
import Toast from 'react-native-toast-message';


const { width } = Dimensions.get('window');

export default function DiscoverScreen() {
  const router = useRouter();
  const {
    products,
    loading,
    refetch,
    trendingProducts,
    logProductView,
    logProductSearch,
    logAddToFavorite,
  } = useMarketplaceDiscovery();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'personalized' | 'trending'>('personalized');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProductPress = (product: any) => {
    // Log product view
    logProductView(product._id, product.category, 0);
    
    // Navigate to product detail
    router.push({
      pathname: '/(routes)/product/[id]',
      params: { id: product._id }
    });
  };

  const handleAddToFavorite = (product: any) => {
    logAddToFavorite(product._id, product.category);
    Toast.show({
      type: 'success',
      text1: 'Added to Favorites',
      text2: `${product.name} saved to your wishlist`
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      logProductSearch(query, 0);
    }
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <View className="px-3 mb-4">
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        activeOpacity={0.75}
        className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
      >
        {/* Product Image */}
        <View className="bg-gray-100 h-48 w-full relative">
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0].url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <MaterialCommunityIcons name="image-off" size={40} color="#D1D5DB" />
            </View>
          )}

          {/* Category Badge */}
          <View className="absolute top-3 left-3 bg-black/70 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">{item.category}</Text>
          </View>

          {/* Discount Badge */}
          {item.oldPrice && item.oldPrice > item.price && (
            <View className="absolute top-3 right-3 bg-red-500 rounded-full px-2 py-1">
              <Text className="text-white text-xs font-bold">
                {Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)}% OFF
              </Text>
            </View>
          )}

          {/* Favorite Button */}
          <TouchableOpacity
            onPress={() => handleAddToFavorite(item)}
            className="absolute bottom-3 right-3 bg-white rounded-full p-2 shadow-lg"
          >
            <Feather name="heart" size={16} color="#FF006E" fill="#FF006E" />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View className="p-3">
          {/* Product Name */}
          <Text
            className="text-sm font-semibold text-gray-900 line-clamp-2"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {/* Seller Info */}
          <View className="flex-row items-center mt-2 gap-1">
            <Image
              source={{ uri: item.seller?.avatar || 'https://via.placeholder.com/24' }}
              className="w-5 h-5 rounded-full bg-gray-200"
            />
            <Text className="text-xs text-gray-600 truncate">{item.seller?.name || 'Verified Seller'}</Text>
          </View>

          {/* Rating */}
          <View className="flex-row items-center mt-2 gap-1">
            <View className="flex-row">
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.floor(item.ratings || 0) ? 'star' : 'star-outline'}
                  size={14}
                  color="#FCD34D"
                />
              ))}
            </View>
            <Text className="text-xs text-gray-500">
              ({item.numOfReviews || 0} reviews)
            </Text>
          </View>

          {/* Price */}
          <View className="flex-row items-baseline gap-2 mt-3">
            <Text className="text-lg font-bold text-gray-900">
              ₦{item.price?.toLocaleString() || 'N/A'}
            </Text>
            {item.oldPrice && item.oldPrice > item.price && (
              <Text className="text-xs text-gray-400 line-through">
                ₦{item.oldPrice?.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Stock Status */}
          <Text
            className={`text-xs font-semibold mt-2 ${
              item.stock > 10 ? 'text-green-600' : item.stock > 0 ? 'text-orange-600' : 'text-red-600'
            }`}
          >
            {item.stock > 10 ? 'In Stock' : item.stock > 0 ? `Only ${item.stock} left` : 'Out of Stock'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const displayedProducts = activeTab === 'personalized' ? products : trendingProducts;
  const displayLoading = activeTab === 'personalized' ? loading : false;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-3xl font-bold text-gray-900 mb-3">Discover</Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2.5 gap-2">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            className="flex-1 text-gray-900 font-medium"
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row gap-2 px-4 py-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab('personalized')}
          className={`flex-1 py-2 px-4 rounded-lg border ${
            activeTab === 'personalized'
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'personalized' ? 'text-white' : 'text-gray-700'
            }`}
          >
            For You
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('trending')}
          className={`flex-1 py-2 px-4 rounded-lg border ${
            activeTab === 'trending'
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'trending' ? 'text-white' : 'text-gray-700'
            }`}
          >
            Trending
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={displayedProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          displayLoading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="mt-4 text-gray-600 font-medium">Loading products...</Text>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-20 px-6">
              <View className="w-20 h-20 rounded-full bg-gray-100 justify-center items-center mb-4">
                <MaterialCommunityIcons name="package-variant-closed" size={32} color="#D1D5DB" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                No Products Found
              </Text>
              <Text className="text-gray-600 text-center leading-5">
                Try searching for something or check back later for new products
              </Text>
            </View>
          )
        }
        scrollEnabled={true}
        numColumns={1}
      />
    </SafeAreaView>
  );
}
