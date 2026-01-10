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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useMatches } from '../../hooks/useDating';
import { useRouter } from 'expo-router';

export default function MatchesScreen() {
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
      pathname: '/(routes)/dating-chat/[matchId]' as any,
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
              Alert.alert('Unmatched', 'You have unmatched with this person');
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
              Alert.alert('Blocked', `${userName} has been blocked`);
            } catch (err) {
              Alert.alert('Error', 'Failed to block user');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderMatchItem = ({ item }: { item: any }) => {
    const otherUser = item.otherUser;
    const profile = item.profile;
    const photoUrl = profile?.profilePhotoUrl;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleChatPress(item._id, otherUser._id, otherUser.name)}
        className="bg-white mx-4 mb-4 rounded-2xl overflow-hidden shadow-md"
      >
        <View className="flex-row">
          {/* Photo */}
          <View className="w-24 h-24">
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-gray-200 justify-center items-center">
                <Ionicons name="person-circle" size={40} color="#ccc" />
              </View>
            )}
          </View>

          {/* Info */}
          <View className="flex-1 p-3 justify-between">
            <View>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">
                    {otherUser.name}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    {item.match.lastMessageContent ? (
                      <>
                        <Text>
                          {item.match.lastMessageFrom === otherUser._id ? 'They: ' : 'You: '}
                        </Text>
                        <Text>{item.match.lastMessageContent}</Text>
                      </>
                    ) : (
                      'No messages yet'
                    )}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View className="w-6 h-6 rounded-full bg-pink-500 justify-center items-center">
                    <Text className="text-white text-xs font-bold">
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Match Time */}
            <Text className="text-xs text-gray-500">
              Matched {formatDate(item.match.matchedAt)}
            </Text>
          </View>

          {/* Action Menu */}
          <View className="justify-center items-center pr-3">
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Options',
                  '',
                  [
                    {
                      text: 'Chat',
                      onPress: () =>
                        handleChatPress(item._id, otherUser._id, otherUser.name)
                    },
                    {
                      text: 'Unmatch',
                      onPress: () => handleUnmatch(item._id, otherUser.name),
                      style: 'destructive'
                    },
                    {
                      text: 'Block',
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
              className="p-2"
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && matches.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text className="mt-4 text-gray-600">Loading matches...</Text>
      </SafeAreaView>
    );
  }

  if (matches.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <Text className="text-3xl font-bold text-gray-900">Matches</Text>
        </View>

        {/* Empty State */}
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="heart-outline" size={80} color="#FF6B6B" />
          <Text className="text-2xl font-bold text-gray-900 mt-6 text-center">
            No matches yet
          </Text>
          <Text className="text-gray-600 text-center mt-3 mb-8">
            Start swiping to find your perfect match!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discover' as any)}
            className="bg-pink-500 px-8 py-4 rounded-full"
          >
            <Text className="text-white font-bold text-lg">Discover People</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-3xl font-bold text-gray-900">
            Matches <Text className="text-pink-500">{matches.length}</Text>
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="w-10 h-10 rounded-full bg-pink-100 justify-center items-center"
          >
            <Ionicons name="refresh" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Matches List */}
      <FlatList
        data={matches}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          <View className="py-6 items-center">
            <Text className="text-gray-500 text-sm">No more matches</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}m ago`;
};
