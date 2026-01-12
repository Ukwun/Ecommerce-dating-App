import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useDiscovery } from '../../hooks/useDating';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { ModernSwipeCard } from '../../components/dating/ModernSwipeCard';
import { MotiView } from 'moti';

const { width, height } = Dimensions.get('window');

interface FilterState {
  distance: number;
  ageMin: number;
  ageMax: number;
  interests: string[];
}

export default function ModernDiscoverScreen() {
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

  const {
    location,
    address,
    getInitialLocation,
    startLocationTracking
  } = useLocationTracking();

  const [showFilters, setShowFilters] = useState(false);
  const [swipingLoading, setSwipingLoading] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    distance: 50,
    ageMin: 18,
    ageMax: 65,
    interests: []
  });
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const currentProfile = getCurrentProfile();

  // Setup location on mount
  useEffect(() => {
    const initLocation = async () => {
      await getInitialLocation();
      // Start real-time tracking for continuous updates
      startLocationTracking((newLocation) => {
        // Optionally refresh profiles when location changes significantly
        console.log('Location updated:', newLocation);
      });
    };
    initLocation();
  }, []);

  // Fetch profiles when filters change
  useEffect(() => {
    fetchProfiles();
  }, [filterState]);

  useFocusEffect(
    useCallback(() => {
      // Refresh profiles when screen comes into focus
      if (currentIndex >= profiles.length && profiles.length > 0) {
        // If we've swiped through all, fetch more
        fetchProfiles();
      }
    }, [currentIndex, profiles.length])
  );

  const handleLike = async () => {
    if (!currentProfile) return;
    
    try {
      setSwipingLoading(true);
      const result = await swipe((currentProfile as any)._id, 'like');
      
      if (result.isMatch) {
        showMatchAnimation();
        Alert.alert(
          '🎉 It\'s a Match!',
          `You and ${(currentProfile as any).name} both like each other!`,
          [
            {
              text: 'Keep Swiping',
              onPress: () => {},
              style: 'cancel'
            },
            {
              text: 'Say Hi!',
              onPress: () => {
                // Navigate to chat
              }
            }
          ]
        );
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
        showMatchAnimation();
        Alert.alert(
          '⭐ Super Like!',
          `${(currentProfile as any).name} will definitely notice you!`
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to super like this profile');
    } finally {
      setSwipingLoading(false);
    }
  };

  const showMatchAnimation = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (loading && profiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FDF2F8" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF006E" />
          <Text className="mt-6 text-lg font-semibold text-gray-900">Finding people near you...</Text>
          {location && address && (
            <Text className="mt-2 text-sm text-gray-600">📍 {address}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (currentIndex >= profiles.length && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-4xl font-extrabold text-gray-900 tracking-tight">Discover</Text>
        </View>

        {/* Empty State */}
        <MotiView 
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          className="flex-1 justify-center items-center px-8"
        >
          <View className="w-32 h-32 rounded-full bg-pink-50 justify-center items-center mb-8 shadow-sm">
            <MaterialCommunityIcons name="heart-broken" size={64} color="#FF006E" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
            That's everyone!
          </Text>
          
          <Text className="text-lg text-gray-500 text-center mb-10 leading-7">
            You've checked out all the available profiles in your area. New people are joining every day!
          </Text>

          <View className="gap-3 w-full">
            <TouchableOpacity
              onPress={() => {
                setFilterState({...filterState});
                fetchProfiles();
              }}
              className="bg-gradient-to-r from-pink-500 to-red-500 px-8 py-5 rounded-2xl shadow-lg shadow-pink-200"
            >
              <Text className="text-white font-bold text-lg text-center">Refresh Profiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="bg-white border-2 border-gray-100 px-8 py-5 rounded-2xl"
            >
              <Text className="text-gray-900 font-bold text-lg text-center">Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <View>
          <Text className="text-4xl font-extrabold text-gray-900 tracking-tight">Discover</Text>
          {location && address && (
            <Text className="text-sm font-medium text-gray-500 mt-1 ml-1">📍 {address}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="w-12 h-12 rounded-full bg-gray-50 justify-center items-center active:opacity-75 border border-gray-100"
        >
          <Ionicons name="funnel" size={20} color="#FF006E" />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <ScrollView 
          className="bg-white border-b border-gray-100"
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          <View className="p-6 gap-6">
            {/* Distance Filter */}
            <View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-gray-900">Distance Range</Text>
                <View className="bg-pink-100 px-3 py-1 rounded-full">
                  <Text className="text-sm font-bold text-pink-600">{filterState.distance} km</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                {[25, 50, 100, 150].map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setFilterState({...filterState, distance: km})}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                      filterState.distance === km
                        ? 'bg-gradient-to-r from-pink-500 to-red-500 border-pink-500'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-bold ${
                      filterState.distance === km ? 'text-white' : 'text-gray-900'
                    }`}>
                      {km}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age Filter */}
            <View>
              <Text className="text-lg font-bold text-gray-900 mb-3">
                Age: {filterState.ageMin} - {filterState.ageMax}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 mb-2 font-semibold">Minimum</Text>
                  <View className="border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                    <Text className="text-gray-900 font-bold text-center">{filterState.ageMin}</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 mb-2 font-semibold">Maximum</Text>
                  <View className="border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                    <Text className="text-gray-900 font-bold text-center">{filterState.ageMax}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Apply Filter Button */}
            <TouchableOpacity
              onPress={() => {
                setFilters({
                  ...filters,
                  ageMin: filterState.ageMin,
                  ageMax: filterState.ageMax,
                  maxDistance: filterState.distance
                });
                setShowFilters(false);
              }}
              className="bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl py-4 shadow-lg shadow-pink-200"
            >
              <Text className="text-white font-bold text-center text-lg">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Swipe Cards Container */}
      <View className="flex-1 justify-center items-center pt-8 pb-4">
        {currentProfile ? (
          <ModernSwipeCard
            profile={currentProfile}
            onLike={handleLike}
            onDislike={handleDislike}
            onSuperLike={handleSuperLike}
            loading={swipingLoading}
            onSwipeComplete={() => {
              // Card swiped, next profile will automatically load
            }}
          />
        ) : (
          <ActivityIndicator size="large" color="#FF006E" />
        )}
      </View>

      {/* Match Animation Overlay */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 0, 110, 0.1)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
        <View className="items-center">
          <Text className="text-6xl font-bold text-pink-500 drop-shadow-lg">💕</Text>
          <Text className="text-3xl font-bold text-gray-900 mt-4">It's a Match!</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
