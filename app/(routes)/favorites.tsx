import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/CartContext';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

export default function FavoritesScreen() {
  const router = useRouter();
  const { wishlistItems, loading, removeFromWishlist, refreshWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshWishlist();
    }, [refreshWishlist])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWishlist();
    setRefreshing(false);
  };

  const handleRemoveFromFavorites = async (productId: string, productName: string) => {
    try {
      await removeFromWishlist(productId);
      Toast.show({
        type: 'success',
        text1: 'Removed from Favorites',
        text2: `${productName} removed from wishlist`,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Remove',
        text2: error?.response?.data?.message || 'Try again',
      });
    }
  };

  const handleAddToCart = (product: any) => {
    try {
      addToCart(product);
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${product.name} added to your cart`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to cart',
      });
    }
  };

  const handleViewProduct = (product: any) => {
    router.push({
      pathname: '/(routes)/product/[id]',
      params: { id: product._id },
    });
  };

  const renderFavoriteCard = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)} className="px-4 mb-4">
      <TouchableOpacity
        onPress={() => handleViewProduct(item)}
        activeOpacity={0.75}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-row"
      >
        {/* Product Image */}
        <Image
          source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/120' }}
          className="w-28 h-28 bg-gray-100"
          resizeMode="cover"
        />

        {/* Product Info */}
        <View className="flex-1 p-3 justify-between">
          <View>
            <Text className="font-bold text-gray-900 line-clamp-2 text-sm" numberOfLines={2}>
              {item.name}
            </Text>

            {/* Seller */}
            <View className="flex-row items-center mt-1 gap-1">
              <Image
                source={{ uri: item.seller?.avatar || 'https://via.placeholder.com/16' }}
                className="w-4 h-4 rounded-full bg-gray-200"
              />
              <Text className="text-xs text-gray-500 truncate">{item.seller?.name || 'Seller'}</Text>
            </View>

            {/* Rating */}
            <View className="flex-row items-center mt-1 gap-1">
              <Ionicons name="star" size={12} color="#FCD34D" />
              <Text className="text-xs text-gray-600">
                {item.ratings?.toFixed(1) || '0'} ({item.numOfReviews || 0})
              </Text>
            </View>
          </View>

          {/* Price */}
          <View className="mt-2">
            <Text className="text-lg font-bold text-gray-900">₦{item.price?.toLocaleString()}</Text>
            {item.oldPrice && item.oldPrice > item.price && (
              <Text className="text-xs text-gray-400 line-through">
                ₦{item.oldPrice?.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-12 items-center justify-between py-3 px-2">
          {/* Remove Button */}
          <TouchableOpacity
            onPress={() => handleRemoveFromFavorites(item._id, item.name)}
            className="active:scale-90"
          >
            <Feather name="heart" size={20} color="#EF4444" />
          </TouchableOpacity>

          {/* Add to Cart Button */}
          <TouchableOpacity
            onPress={() => handleAddToCart(item)}
            className="bg-blue-500 rounded-lg p-2 active:scale-90"
          >
            <Ionicons name="add" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading favorites...</Text>
      </SafeAreaView>
    );
  }

  const isEmpty = !wishlistItems || wishlistItems.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-bold text-gray-900">Favorites</Text>
          {!isEmpty && (
            <Text className="text-sm text-gray-500 mt-1">
              {wishlistItems?.length || 0} item{wishlistItems?.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {!isEmpty && (
          <TouchableOpacity
            onPress={() => {
              wishlistItems?.forEach((item: any) => removeFromWishlist(item._id));
              Toast.show({
                type: 'success',
                text1: 'Cleared',
                text2: 'All favorites removed',
              });
            }}
            className="bg-red-50 rounded-full p-3"
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Favorites List or Empty State */}
      {isEmpty ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 rounded-full bg-gray-100 justify-center items-center mb-4">
            <Feather name="heart" size={40} color="#D1D5DB" />
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            No Favorites Yet
          </Text>
          <Text className="text-gray-600 text-center mb-6 leading-5">
            Save your favorite products here for quick access later
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/')}
            className="bg-blue-500 px-8 py-3 rounded-full"
          >
            <Text className="text-white font-bold">Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderFavoriteCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          scrollEnabled
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <MaterialCommunityIcons name="heart-off" size={40} color="#D1D5DB" />
              <Text className="mt-4 text-gray-600">No favorites</Text>
            </View>
          }
        />
      )}

      {/* Bottom Action */}
      {!isEmpty && (
        <Animated.View entering={FadeInDown} className="border-t border-gray-100 p-4">
          <TouchableOpacity
            onPress={() => router.push('/')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 py-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-lg">Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
