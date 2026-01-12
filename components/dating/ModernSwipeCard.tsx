import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const SWIPE_OUT_DURATION = 250;

interface ModernSwipeCardProps {
  profile: any;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
  loading?: boolean;
  onSwipeComplete?: () => void;
}

export const ModernSwipeCard: React.FC<ModernSwipeCardProps> = ({
  profile,
  onLike,
  onDislike,
  onSuperLike,
  loading = false,
  onSwipeComplete
}) => {
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [cardDirection, setCardDirection] = useState<'like' | 'dislike' | null>(null);

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-pink-50 to-white">
        <ActivityIndicator size="large" color="#FF006E" />
        <Text className="mt-4 text-gray-600 font-semibold">Loading profiles...</Text>
      </View>
    );
  }

  const photos = profile.photos || [];
  const currentPhoto = photos[currentPhotoIndex]?.url || profile.profilePhotoUrl;
  const distance = profile.distance ? Math.round(profile.distance / 1000) : null;
  const compatibilityScore = profile.compatibilityScore ? Math.round(profile.compatibilityScore) : null;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        swipeX.setValue(gestureState.dx);
        swipeY.setValue(gestureState.dy);
        rotation.setValue((gestureState.dx / (width / 2)) * 20);

        // Change opacity based on swipe direction
        const oppacity = 1 - Math.abs(gestureState.dx) / (width * 0.5);
        opacity.setValue(Math.max(oppacity, 0.5));
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Determine swipe direction
          if (gestureState.dx > 0) {
            // Swipe right - Like
            animateSwipeOut('like');
            onLike();
          } else {
            // Swipe left - Dislike
            animateSwipeOut('dislike');
            onDislike();
          }
        } else {
          // Reset position if swipe threshold not reached
          Animated.parallel([
            Animated.spring(swipeX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 8,
            }),
            Animated.spring(swipeY, {
              toValue: 0,
              useNativeDriver: true,
              speed: 8,
            }),
            Animated.spring(rotation, {
              toValue: 0,
              useNativeDriver: true,
              speed: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              speed: 8,
            }),
          ]).start();
        }
      }
    })
  ).current;

  const animateSwipeOut = (direction: 'like' | 'dislike') => {
    const finalX = direction === 'like' ? width * 1.5 : -width * 1.5;
    
    Animated.timing(swipeX, {
      toValue: finalX,
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      // Reset for next card
      swipeX.setValue(0);
      swipeY.setValue(0);
      rotation.setValue(0);
      opacity.setValue(1);
      setCurrentPhotoIndex(0);
      setShowDetails(false);
      setCardDirection(null);
      onSwipeComplete?.();
    });
  };

  const handleLikeButton = () => {
    setCardDirection('like');
    animateSwipeOut('like');
    onLike();
  };

  const handleDislikeButton = () => {
    setCardDirection('dislike');
    animateSwipeOut('dislike');
    onDislike();
  };

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

  const animatedStyle = {
    transform: [
      { translateX: swipeX },
      { translateY: swipeY },
      { rotate: rotation.interpolate({
          inputRange: [-20, 0, 20],
          outputRange: ['-15deg', '0deg', '15deg']
        })
      },
      { scale: scale }
    ],
    opacity: opacity,
  };

  return (
    <Animated.View
      style={animatedStyle}
      {...panResponder.panHandlers}
      className="absolute w-full"
    >
      <View className="bg-white rounded-3xl overflow-hidden shadow-2xl mx-4" style={{ height: 650 }}>
        {/* Main Photo Section */}
        <View className="relative bg-gray-300" style={{ height: 500 }}>
          {currentPhoto ? (
            <>
              <Image
                source={{ uri: currentPhoto }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {/* Gradient Overlay */}
              <LinearGradient
                colors={['transparent', 'transparent', 'rgba(0,0,0,0.4)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                className="absolute inset-0"
              />
            </>
          ) : (
            <View className="flex-1 justify-center items-center bg-gradient-to-b from-gray-300 to-gray-400">
              <Ionicons name="person-circle" size={80} color="#fff" opacity={0.5} />
            </View>
          )}

          {/* Photo Navigation - Left */}
          {currentPhotoIndex > 0 && (
            <TouchableOpacity
              onPress={handlePrevPhoto}
              className="absolute left-3 top-1/2 z-10 bg-black/40 rounded-full p-2.5 active:bg-black/60"
            >
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
          )}

          {/* Photo Navigation - Right */}
          {photos.length > 1 && currentPhotoIndex < photos.length - 1 && (
            <TouchableOpacity
              onPress={handleNextPhoto}
              className="absolute right-3 top-1/2 z-10 bg-black/40 rounded-full p-2.5 active:bg-black/60"
            >
              <Ionicons name="chevron-forward" size={28} color="white" />
            </TouchableOpacity>
          )}

          {/* Photo Counter & Badges */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between items-center z-20">
            <View className="flex-row gap-2">
              {photos.length > 0 && photos.map((_: any, idx: number) => (
                <View
                  key={idx}
                  className={`h-1 rounded-full ${
                    idx === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50 w-3'
                  }`}
                />
              ))}
            </View>
          </View>

          {/* Top Right Badges */}
          <View className="absolute top-4 right-4 flex-col gap-2 z-20">
            {compatibilityScore && (
              <View className="bg-pink-500 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                <MaterialCommunityIcons name="heart" size={14} color="white" />
                <Text className="text-white text-xs font-bold">{compatibilityScore}% Match</Text>
              </View>
            )}
            {distance && (
              <View className="bg-blue-500 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                <MaterialCommunityIcons name="map-marker" size={14} color="white" />
                <Text className="text-white text-xs font-bold">{distance} km away</Text>
              </View>
            )}
          </View>

          {/* Online Status */}
          {profile.lastActive && (
            <View className="absolute bottom-4 right-4 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Profile Info Section */}
        <View className="flex-1 p-4 justify-between">
          {/* Name and Basic Info */}
          <View>
            <View className="flex-row items-baseline justify-between mb-2">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-2xl font-bold text-gray-900">{profile.name}</Text>
                <Text className="text-lg text-gray-600">{profile.age}</Text>
              </View>
              {profile.verificationScore > 0 && (
                <MaterialCommunityIcons name="check-circle" size={18} color="#FF006E" />
              )}
            </View>

            {/* Bio */}
            {profile.bio && (
              <Text className="text-sm text-gray-700 leading-5 line-clamp-2">
                {profile.bio}
              </Text>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {profile.interests.slice(0, 3).map((interest: string, idx: number) => (
                  <View
                    key={idx}
                    className="bg-pink-100 px-3 py-1 rounded-full"
                  >
                    <Text className="text-xs text-pink-600 font-semibold">{interest}</Text>
                  </View>
                ))}
                {profile.interests.length > 3 && (
                  <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-xs text-gray-600 font-semibold">
                      +{profile.interests.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Looking For Badge */}
          {profile.lookingFor && (
            <View className="mt-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl">
              <Text className="text-xs text-gray-600 font-semibold">Looking for</Text>
              <Text className="text-sm font-bold text-gray-900 capitalize">{profile.lookingFor}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="px-4 py-4 flex-row justify-around items-center border-t border-gray-100">
          <TouchableOpacity
            onPress={handleDislikeButton}
            disabled={loading}
            className="w-14 h-14 rounded-full bg-white border-2 border-red-300 justify-center items-center active:bg-red-50"
          >
            <MaterialCommunityIcons name="close" size={32} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSuperLike}
            disabled={loading}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 justify-center items-center shadow-lg active:shadow-md transform active:scale-95"
          >
            <MaterialCommunityIcons name="star" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLikeButton}
            disabled={loading}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-red-500 justify-center items-center active:shadow-md transform active:scale-95"
          >
            <MaterialCommunityIcons name="heart" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
