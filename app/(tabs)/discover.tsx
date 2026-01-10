import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiscovery } from '../../hooks/useDating';
import { SwipeCard } from '../../components/dating/SwipeCard';

export default function DiscoverScreen() {
  const {
    profiles,
    loading,
    error,
    currentIndex,
    filters,
    setFilters,
    fetchProfiles,
    swipe,
    getCurrentProfile
  } = useDiscovery();

  const [showFilters, setShowFilters] = useState(false);
  const [swipingLoading, setSwipingLoading] = useState(false);
  const currentProfile = getCurrentProfile();

  const handleLike = async () => {
    if (!currentProfile) return;
    
    try {
      setSwipingLoading(true);
      const result = await swipe((currentProfile as any)._id, 'like');
      
      if (result.isMatch) {
        Alert.alert('🎉 Match!', `You matched with ${(currentProfile as any).name}!`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to like this profile');
    } finally {
      setSwipingLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!currentProfile) return;
    
    try {
      setSwipingLoading(true);
      await swipe((currentProfile as any)._id, 'dislike');
    } catch (err) {
      Alert.alert('Error', 'Failed to skip this profile');
    } finally {
      setSwipingLoading(false);
    }
  };

  const handleSuperLike = async () => {
    if (!currentProfile) return;
    
    try {
      setSwipingLoading(true);
      const result = await swipe((currentProfile as any)._id, 'superlike');
      
      if (result.isMatch) {
        Alert.alert('🎉 Match!', `You matched with ${(currentProfile as any).name}!`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to super like this profile');
    } finally {
      setSwipingLoading(false);
    }
  };

  if (loading && profiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text className="mt-4 text-gray-600">Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  if (currentIndex >= profiles.length && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="heart-dislike" size={80} color="#FF6B6B" />
        <Text className="text-2xl font-bold text-gray-900 mt-6 text-center">
          No more profiles
        </Text>
        <Text className="text-gray-600 text-center mt-3 mb-8">
          You've seen everyone available. Come back later!
        </Text>
        <TouchableOpacity
          onPress={() => {
            setFilters({ ...filters, page: 1 });
            fetchProfiles();
          }}
          className="bg-pink-500 px-8 py-4 rounded-full"
        >
          <Text className="text-white font-bold text-lg">Refresh</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900">Discover</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="w-12 h-12 rounded-full bg-pink-100 justify-center items-center"
        >
          <Ionicons name="funnel" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <ScrollView className="bg-white px-6 py-4 border-b border-gray-200">
          {/* Age Range */}
          <View className="mb-6">
            <Text className="font-semibold text-gray-900 mb-3">
              Age: {filters.ageMin} - {filters.ageMax}
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">Min Age</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                  onPress={() => {
                    // TODO: Implement age slider
                  }}
                >
                  <Text className="text-gray-900 font-semibold">{filters.ageMin}</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">Max Age</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                  onPress={() => {
                    // TODO: Implement age slider
                  }}
                >
                  <Text className="text-gray-900 font-semibold">{filters.ageMax}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Distance */}
          <View className="mb-6">
            <Text className="font-semibold text-gray-900 mb-3">
              Distance: {filters.maxDistance}km
            </Text>
            <TouchableOpacity
              className="border border-gray-300 rounded-lg p-3 bg-gray-50"
              onPress={() => {
                // TODO: Implement distance slider
              }}
            >
              <Text className="text-gray-900 font-semibold">{filters.maxDistance}km</Text>
            </TouchableOpacity>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            onPress={() => {
              fetchProfiles();
              setShowFilters(false);
            }}
            className="bg-pink-500 rounded-lg py-4 mb-4"
          >
            <Text className="text-white font-bold text-center text-lg">
              Apply Filters
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Swipe Card */}
      <View className="flex-1 px-4 py-6 justify-center">
        {currentProfile ? (
          <SwipeCard
            profile={currentProfile}
            onLike={handleLike}
            onDislike={handleDislike}
            onSuperLike={handleSuperLike}
            loading={swipingLoading}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        )}
      </View>

      {/* Stats Footer */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-pink-500">
              {currentIndex + 1}
            </Text>
            <Text className="text-sm text-gray-600">Seen</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-500">
              {profiles.length}
            </Text>
            <Text className="text-sm text-gray-600">Available</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-500">
              {Math.round((currentIndex / Math.max(profiles.length, 1)) * 100)}%
            </Text>
            <Text className="text-sm text-gray-600">Progress</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
