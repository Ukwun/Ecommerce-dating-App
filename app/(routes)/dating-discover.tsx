import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import { useDiscovery, useDatingProfile } from '@/hooks/useDating';
import { ModernSwipeCard } from '@/components/dating/ModernSwipeCard';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function DatingDiscoverScreen() {
  const router = useRouter();
  const { profiles, loading, currentIndex, swipe, fetchProfiles } = useDiscovery();
  const { profile: datingProfile } = useDatingProfile();
  const [swiping, setSwiping] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  const handleLike = async () => {
    setSwiping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const profile = profiles[currentIndex];
    if (profile) {
      try {
        await swipe(profile._id, 'like');
      } catch (error) {
        console.error('Error liking profile:', error);
      }
    }
    setSwiping(false);
  };

  const handleDislike = async () => {
    setSwiping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const profile = profiles[currentIndex];
    if (profile) {
      try {
        await swipe(profile._id, 'pass');
      } catch (error) {
        console.error('Error passing profile:', error);
      }
    }
    setSwiping(false);
  };

  const handleSuperLike = async () => {
    setSwiping(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile = profiles[currentIndex];
    if (profile) {
      try {
        await swipe(profile._id, 'superlike');
      } catch (error) {
        console.error('Error super liking profile:', error);
      }
    }
    setSwiping(false);
  };

  if (loading && profiles.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF006E" />
        <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>Finding profiles...</Text>
      </View>
    );
  }

  if (!datingProfile) {
    return (
      <LinearGradient colors={['#FF006E', '#9B27AF']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 72, marginBottom: 16 }}>💖</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
            Set Up Your Dating Profile
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            Create your dating profile to start discovering matches
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(routes)/dating-profile')}
            style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 32, marginBottom: 12 }}
          >
            <Text style={{ color: '#FF006E', fontWeight: '800', fontSize: 16 }}>Create Profile 💕</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentProfile = profiles[currentIndex];
  const hasMore = currentIndex < profiles.length;

  if (!hasMore && !loading) {
    return (
      <LinearGradient colors={['#FF006E', '#9B27AF']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <MaterialCommunityIcons name="heart-broken" size={80} color="#fff" style={{ marginBottom: 24 }} />
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
            No More Profiles
          </Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Check back later for more matches
          </Text>
          <TouchableOpacity
            onPress={() => fetchProfiles()}
            style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 28 }}
          >
            <Text style={{ color: '#FF006E', fontWeight: '700', fontSize: 14 }}>Refresh Profiles</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FF006E', '#FF4785']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>Discover</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/matches')}>
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="heart" size={24} color="#fff" />
              <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#FFD700', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FF006E' }}>
                  {currentIndex + 1}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Swipe Card */}
        {currentProfile && hasMore ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}>
            <ModernSwipeCard
              profile={currentProfile}
              onLike={handleLike}
              onDislike={handleDislike}
              onSuperLike={handleSuperLike}
              loading={swiping}
              onSwipeComplete={() => setSwiping(false)}
            />
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24, gap: 12 }}>
          {/* Pass Button */}
          <TouchableOpacity
            onPress={handleDislike}
            disabled={swiping}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#fff',
              borderWidth: 2,
              borderColor: '#ff6b6b',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: swiping ? 0.5 : 1,
            }}
          >
            <MaterialCommunityIcons name="close" size={32} color="#ff6b6b" />
          </TouchableOpacity>

          {/* Super Like Button */}
          <TouchableOpacity
            onPress={handleSuperLike}
            disabled={swiping}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#4B81FF',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#4B81FF',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
              opacity: swiping ? 0.5 : 1,
            }}
          >
            <MaterialCommunityIcons name="star" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity
            onPress={handleLike}
            disabled={swiping}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#FF1493',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#FF1493',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 8,
              opacity: swiping ? 0.5 : 1,
            }}
          >
            <AntDesign name="heart" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
