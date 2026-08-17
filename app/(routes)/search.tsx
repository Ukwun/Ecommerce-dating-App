import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/hooks/CartContext';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';

export default function SearchResultsScreen() {
  const router = useRouter();
  const { query: initialQuery } = useLocalSearchParams<{ query: string }>();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({ sortBy: 'relevance', category: 'all' });
  const { addToCart } = useCart();

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Search',
        text2: 'Please enter a search term',
      });
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      const params: Record<string, any> = { search: query };
      if (filters.sortBy !== 'relevance') {
        params.sort = filters.sortBy === 'price-asc' ? 'price' : filters.sortBy;
      }
      if (filters.category !== 'all') {
        params.category = filters.category;
      }

      const response = await axiosInstance.get('/marketplace/api/products', { params });
      setResults(response.data?.data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Search Failed',
        text2: error?.response?.data?.message || 'Could not search products',
      });
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.sortBy]);

  useFocusEffect(
    useCallback(() => {
      if (initialQuery) performSearch(initialQuery);
    }, [initialQuery, performSearch])
  );

  const handleProductPress = (product: any) => {
    router.push({
      pathname: '/(routes)/product/[id]',
      params: { id: product._id },
    });
  };

  const handleAddToCart = (product: any, e: any) => {
    e.stopPropagation();
    try {
      addToCart(product);
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${product.name} added`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not add to cart',
      });
    }
  };

  const renderProductCard = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30)} className="flex-1 px-2 mb-4">
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}
        className="bg-white rounded-xl overflow-hidden border border-gray-100"
      >
        {/* Image */}
        <View className="bg-gray-100 h-40 w-full relative">
          <Image
            source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/160' }}
            className="w-full h-full"
            resizeMode="cover"
          />

          {/* Discount Badge */}
          {item.oldPrice && item.oldPrice > item.price && (
            <View className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-lg">
              <Text className="text-white text-xs font-bold">
                -{Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)}%
              </Text>
            </View>
          )}

          {/* Category */}
          <View className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-lg">
            <Text className="text-white text-xs font-semibold">{item.category}</Text>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            onPress={(e) => handleAddToCart(item, e)}
            className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-2"
          >
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View className="p-3">
          <Text className="text-sm font-semibold text-gray-900 line-clamp-2" numberOfLines={2}>
            {item.name}
          </Text>

          {/* Rating */}
          <View className="flex-row items-center mt-1 gap-1">
            <Ionicons name="star" size={12} color="#FCD34D" />
            <Text className="text-xs text-gray-600">
              {item.ratings?.toFixed(1) || '0'} ({item.numOfReviews || 0})
            </Text>
          </View>

          {/* Price */}
          <View className="flex-row items-baseline gap-2 mt-2">
            <Text className="text-lg font-bold text-gray-900">
              ₦{item.price?.toLocaleString()}
            </Text>
            {item.oldPrice && item.oldPrice > item.price && (
              <Text className="text-xs text-gray-400 line-through">
                ₦{item.oldPrice?.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Stock */}
          <Text
            className={`text-xs font-semibold mt-2 ${
              item.stock > 10
                ? 'text-green-600'
                : item.stock > 0
                  ? 'text-orange-600'
                  : 'text-red-600'
            }`}
          >
            {item.stock > 0 ? `${item.stock} left` : 'Out of Stock'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 flex-1">Search</Text>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2.5 gap-2">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => performSearch(searchQuery)}
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

      {/* Filters */}
      {searched && results.length > 0 && (
        <View className="px-4 py-3 border-b border-gray-100 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setFilters({ ...filters, sortBy: 'relevance' })}
            className={`px-3 py-1.5 rounded-full ${
              filters.sortBy === 'relevance'
                ? 'bg-blue-500'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                filters.sortBy === 'relevance'
                  ? 'text-white'
                  : 'text-gray-700'
              }`}
            >
              Relevant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilters({ ...filters, sortBy: 'price-asc' })}
            className={`px-3 py-1.5 rounded-full ${
              filters.sortBy === 'price-asc'
                ? 'bg-blue-500'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                filters.sortBy === 'price-asc'
                  ? 'text-white'
                  : 'text-gray-700'
              }`}
            >
              Price: Low to High
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilters({ ...filters, sortBy: 'rating' })}
            className={`px-3 py-1.5 rounded-full ${
              filters.sortBy === 'rating'
                ? 'bg-blue-500'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                filters.sortBy === 'rating'
                  ? 'text-white'
                  : 'text-gray-700'
              }`}
            >
              Rating
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Searching...</Text>
        </View>
      ) : !searched ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons name="magnify" size={80} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-900 text-center mt-4 mb-2">
            Find What You're Looking For
          </Text>
          <Text className="text-gray-600 text-center">
            Search for products, brands, or categories
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons name="text-search" size={80} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-900 text-center mt-4 mb-2">
            No Results Found
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Try different keywords or browse our categories
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearched(false);
              setResults([]);
            }}
            className="bg-blue-500 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-bold">Try Another Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderProductCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
          scrollEnabled
          ListHeaderComponent={
            <Text className="text-gray-600 text-sm mb-3 px-2">
              Found {results.length} product{results.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
