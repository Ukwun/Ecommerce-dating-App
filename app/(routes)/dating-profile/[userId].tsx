import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatingProfile } from '../../../hooks/useDating';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { fetchUserProfile } = useDatingProfile();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (userId) {
        const data = await fetchUserProfile(userId as string);
        setProfile(data);
      }
      setLoading(false);
    };
    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white px-6">
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text className="text-lg text-gray-500 mt-4 text-center">Profile not found or user is hidden.</Text>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)/discover' as any)}
          className="mt-6 bg-pink-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go to Discover</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {profile.userId?.name || 'User Profile'}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Main Photo */}
        <View className="h-96 bg-gray-200 relative">
          {profile.profilePhotoUrl ? (
            <Image
              source={{ uri: profile.profilePhotoUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="person" size={80} color="#ccc" />
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 p-6 bg-black/40">
            <Text className="text-3xl font-bold text-white">
              {profile.userId?.name}, {profile.age}
            </Text>
            {profile.location?.city && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="location" size={16} color="#fff" />
                <Text className="text-white ml-1">{profile.location.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View className="p-6">
          {/* Bio */}
          {profile.bio && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-2">About</Text>
              <Text className="text-gray-600 leading-6">{profile.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">Interests</Text>
              <View className="flex-row flex-wrap gap-2">
                {profile.interests.map((interest: string, idx: number) => (
                  <View key={idx} className="bg-pink-100 px-4 py-2 rounded-full">
                    <Text className="text-pink-600 font-semibold">{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* More Photos */}
          {profile.photos && profile.photos.length > 1 && (
            <View>
              <Text className="text-lg font-bold text-gray-900 mb-3">Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                {profile.photos.map((photo: any, idx: number) => (
                  <Image key={idx} source={{ uri: photo.url }} className="w-32 h-32 rounded-lg" />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}