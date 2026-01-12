import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useMatches } from '../../hooks/useDating';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

interface Match {
  _id: string;
  otherUser: {
    _id: string;
    name: string;
  };
  profile: {
    profilePhotoUrl: string;
    bio?: string;
  };
  match: {
    lastMessageContent?: string;
    lastMessageFrom?: string;
    matchedAt: string;
  };
  unreadCount: number;
}

export default function ModernMatchesScreen() {
  const { matches, loading, error, fetchMatches, unmatch, blockUser } = useMatches();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const handleChatPress = (matchId: string, userId: string, userName: string) => {
    router.push({
      pathname: '/dating-chat/[matchId]' as any,
      params: { matchId, userId, userName }
    });
  };

  const handleUnmatch = (matchId: string, userName: string) => {
    Alert.alert(
      'Unmatch?',
      `Are you sure you want to unmatch with ${userName}?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Unmatch',
          onPress: async () => {
            try {
              await unmatch(matchId);
              Alert.alert('✓ Unmatched', 'You have unmatched with this person');
            } catch (err) {
              Alert.alert('Error', 'Failed to unmatch');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleBlock = (matchId: string, userName: string) => {
    Alert.alert(
      'Block User?',
      `Block ${userName}? They won't be able to message you.`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Block',
          onPress: async () => {
            try {
              await blockUser(matchId, 'User blocked from matches screen');
              Alert.alert('✓ Blocked', `${userName} has been blocked`);
            } catch (err) {
              Alert.alert('Error', 'Failed to block user');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderMatchItem = ({ item, index }: { item: Match, index: number }) => {
    const otherUser = item.otherUser;
    const profile = item.profile;
    const photoUrl = profile?.profilePhotoUrl;
    const hasUnread = item.unreadCount > 0;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
      >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleChatPress(item._id, otherUser._id, otherUser.name)}
        className="mx-5 mb-5"
      >
        <LinearGradient
          colors={['#FFFFFF', '#FDF2F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl overflow-hidden shadow-sm border border-gray-100"
        >
          <View className="flex-row">
            {/* Photo Section */}
            <View className="relative w-32 h-32">
              {photoUrl ? (
                <>
                  <Image
                    source={{ uri: photoUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  {/* Unread Badge */}
                  {hasUnread && (
                    <View className="absolute inset-0 bg-black/10" />
                  )}
                </>
              ) : (
                <View className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 justify-center items-center">
                  <MaterialCommunityIcons name="account-circle" size={40} color="#ccc" />
                </View>
              )}
              
              {/* Online Indicator */}
              <View className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            </View>

            {/* Info Section */}
            <View className="flex-1 p-5 justify-center">
              {/* Top - Name and Time */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                        {otherUser.name}
                      </Text>
                      {hasUnread && (
                        <View className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      )}
                    </View>
                  </View>
                </View>

                {/* Message Preview */}
                {item.match.lastMessageContent ? (
                  <Text
                    className={`text-base mt-1 ${
                      hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-600'
                    }`}
                    numberOfLines={1}
                  >
                    {item.match.lastMessageFrom === otherUser._id ? (
                      <>
                        <Text className="font-semibold">They: </Text>
                        {item.match.lastMessageContent}
                      </>
                    ) : (
                      <>
                        <Text className="font-semibold">You: </Text>
                        {item.match.lastMessageContent}
                      </>
                    )}
                  </Text>
                ) : (
                  <Text className="text-base text-gray-400 italic mt-1">Start a conversation...</Text>
                )}
              </View>

              {/* Bottom - Time and Badge */}
              <View className="flex-row justify-between items-center mt-3">
                <Text className="text-xs text-gray-500">
                  {formatDate(item.match.matchedAt)}
                </Text>
                {hasUnread && (
                  <View className="bg-gradient-to-r from-pink-500 to-red-500 px-2.5 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">
                      {item.unreadCount} new
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Menu */}
            <View className="justify-center px-3 py-4">
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Actions',
                    '',
                    [
                      {
                        text: '💬 Chat',
                        onPress: () =>
                          handleChatPress(item._id, otherUser._id, otherUser.name)
                      },
                      {
                        text: '💔 Unmatch',
                        onPress: () => handleUnmatch(item._id, otherUser.name),
                        style: 'destructive'
                      },
                      {
                        text: '🚫 Block',
                        onPress: () => handleBlock(item._id, otherUser.name),
                        style: 'destructive'
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel'
                      }
                    ],
                    { cancelable: true }
                  );
                }}
                className="p-2 active:opacity-60"
              >
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#FF006E" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading && matches.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FDF2F8" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF006E" />
          <Text className="mt-4 text-gray-600 font-semibold">Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (matches.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-4xl font-extrabold text-gray-900 tracking-tight">Matches</Text>
        </View>

        {/* Empty State */}
        <MotiView 
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          className="flex-1 justify-center items-center px-8"
        >
          <View className="w-32 h-32 rounded-full bg-pink-50 justify-center items-center mb-8 shadow-sm">
            <MaterialCommunityIcons name="heart-outline" size={64} color="#FF006E" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
            No matches yet
          </Text>
          
          <Text className="text-lg text-gray-500 text-center mb-10 leading-7">
            Start swiping to find your perfect match. New people are waiting!
          </Text>
          
          <TouchableOpacity
            onPress={() => router.push('/discover' as any)}
            className="bg-gradient-to-r from-pink-500 to-red-500 px-8 py-5 rounded-2xl w-full shadow-lg shadow-pink-200"
          >
            <Text className="text-white font-bold text-lg text-center">Discover People</Text>
          </TouchableOpacity>
        </MotiView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-4xl font-extrabold text-gray-900 tracking-tight">Matches</Text>
            <Text className="text-base font-medium text-pink-500 mt-1">
              {matches.length} {matches.length === 1 ? 'Connection' : 'Connections'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="w-12 h-12 rounded-full bg-gray-50 justify-center items-center active:opacity-60 border border-gray-100"
          >
            <Ionicons name="refresh" size={20} color="#FF006E" />
          </TouchableOpacity>
        </View>

        {/* See Who Likes You Button */}
        <TouchableOpacity
          onPress={() => router.push('/who-liked-me' as any)}
          className="flex-row items-center bg-pink-50 p-4 rounded-2xl border border-pink-100 mt-6"
        >
          <View className="w-10 h-10 rounded-full bg-pink-100 justify-center items-center mr-3">
            <Ionicons name="heart" size={20} color="#FF006E" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">See Who Likes You</Text>
            <Text className="text-sm text-gray-500">Check your pending likes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF006E" />
        </TouchableOpacity>
      </View>

      {/* Matches List */}
      <FlatList
        data={matches}
        renderItem={({ item, index }) => renderMatchItem({ item, index })}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#FF006E"
          />
        }
        scrollIndicatorInsets={{ right: 1 }}
      />
    </SafeAreaView>
  );
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}m ago`;
};
