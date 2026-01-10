import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SwipeCardProps {
  profile: any;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
  loading?: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  onLike,
  onDislike,
  onSuperLike,
  loading = false
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text className="mt-4 text-gray-600">Loading profiles...</Text>
      </View>
    );
  }

  const photos = profile.photos || [];
  const currentPhoto = photos[currentPhotoIndex]?.url || profile.profilePhotoUrl;

  const handleNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  return (
    <View className="flex-1 bg-white rounded-2xl overflow-hidden shadow-lg">
      {/* Photo Section with Navigation */}
      <View className="relative bg-gray-200" style={{ height: 500 }}>
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 justify-center items-center bg-gray-300">
            <Ionicons name="person-circle" size={60} color="#ccc" />
          </View>
        )}

        {/* Photo Navigation - Left */}
        {currentPhotoIndex > 0 && (
          <TouchableOpacity
            onPress={handlePrevPhoto}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 bg-black/30 rounded-full p-2"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        )}

        {/* Photo Navigation - Right */}
        {photos.length > 1 && currentPhotoIndex < photos.length - 1 && (
          <TouchableOpacity
            onPress={handleNextPhoto}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 bg-black/30 rounded-full p-2"
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <View className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full">
            <Text className="text-white text-sm font-semibold">
              {currentPhotoIndex + 1}/{photos.length}
            </Text>
          </View>
        )}

        {/* Verification Badge */}
        {profile.verificationScore > 70 && (
          <View className="absolute top-4 left-4 bg-blue-500 rounded-full p-1">
            <Ionicons name="checkmark-circle" size={20} color="white" />
          </View>
        )}

        {/* Gradient Overlay for Text Readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            zIndex: 5
          }}
        />
      </View>

      {/* Profile Info Section */}
      <View className="px-5 py-6 flex-1">
        {/* Name, Age, Distance */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl font-bold text-gray-900">
              {profile.userId?.name || 'Anonymous'}
            </Text>
            <Text className="text-lg text-gray-600 ml-2">
              {profile.age || '?'}
            </Text>
          </View>
          {profile.distance !== null && (
            <View className="flex-row items-center bg-pink-100 px-3 py-1 rounded-full">
              <Ionicons name="location" size={14} color="#FF6B6B" />
              <Text className="text-sm text-pink-600 font-semibold ml-1">
                {Math.round(profile.distance)}km
              </Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <Text className="text-gray-700 text-sm mb-4 leading-5">
            {profile.bio}
          </Text>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-600 mb-2">INTERESTS</Text>
            <View className="flex-row flex-wrap">
              {profile.interests.slice(0, 5).map((interest: string, idx: number) => (
                <View
                  key={idx}
                  className="bg-pink-100 rounded-full px-3 py-1 mr-2 mb-2"
                >
                  <Text className="text-xs text-pink-600 font-semibold">
                    {interest}
                  </Text>
                </View>
              ))}
              {profile.interests.length > 5 && (
                <View className="bg-gray-200 rounded-full px-3 py-1">
                  <Text className="text-xs text-gray-600 font-semibold">
                    +{profile.interests.length - 5} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Compatibility Score */}
        {profile.compatibilityScore !== undefined && (
          <View className="flex-row items-center mb-4">
            <View className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
              <View
                className="bg-gradient-to-r from-pink-500 to-red-500 rounded-full h-2"
                style={{ width: `${profile.compatibilityScore}%` }}
              />
            </View>
            <Text className="text-sm font-bold text-gray-700">
              {profile.compatibilityScore}%
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row justify-center items-center gap-4 px-5 py-6 bg-gray-50">
        {/* Dislike Button */}
        <TouchableOpacity
          onPress={onDislike}
          disabled={loading}
          className={`w-14 h-14 rounded-full justify-center items-center border-2 border-gray-300 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          <Ionicons name="close" size={28} color="#999" />
        </TouchableOpacity>

        {/* SuperLike Button */}
        <TouchableOpacity
          onPress={onSuperLike}
          disabled={loading}
          className={`w-16 h-16 rounded-full justify-center items-center bg-blue-500 shadow-lg ${
            loading ? 'opacity-50' : ''
          }`}
        >
          <Ionicons name="star" size={28} color="white" />
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          onPress={onLike}
          disabled={loading}
          className={`w-14 h-14 rounded-full justify-center items-center border-2 border-pink-500 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          <Ionicons name="heart" size={28} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SwipeCard;
