import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, SafeAreaView, StatusBar,
  StyleSheet, ScrollView, RefreshControl, Alert,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useMatches, useDatingProfile } from '../../hooks/useDating';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ReAnimated, {
  FadeInDown, FadeInUp, ZoomIn, SlideInRight, useSharedValue,
  useAnimatedStyle, withSpring, withTiming, withSequence,
} from 'react-native-reanimated';

const AnimatedTouchable = ReAnimated.createAnimatedComponent(TouchableOpacity);

function ActionButton({ onPress, style, children, delay = 0 }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <ReAnimated.View entering={ZoomIn.delay(delay).springify()} style={[aStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => { scale.value = withSpring(0.85); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </ReAnimated.View>
  );
}

function NewMatchBubble({ match, index, onChat }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const photoUrl = match.profile?.profilePhotoUrl || `https://i.pravatar.cc/150?u=${match._id}`;
  return (
    <ReAnimated.View entering={SlideInRight.delay(index * 70).springify()}>
      <ReAnimated.View style={aStyle}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={() => { scale.value = withSpring(0.92); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          onPress={() => onChat(match)}
          style={styles.newMatchBubble}
        >
          <Image source={{ uri: photoUrl }} style={styles.newMatchAvatar} />
          {match.unreadCount > 0 && (
            <ReAnimated.View entering={ZoomIn.springify()} style={styles.bubbleUnread}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>{match.unreadCount}</Text>
            </ReAnimated.View>
          )}
          {match.match?.isOnline && <View style={styles.bubbleOnline} />}
          <Text style={styles.bubbleName} numberOfLines={1}>
            {match.otherUser?.name?.split(' ')[0] || 'User'}
          </Text>
        </TouchableOpacity>
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

function MatchListItem({ match, index, onPress, onChat }: any) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const photoUrl = match.profile?.profilePhotoUrl || `https://i.pravatar.cc/150?u=${match._id}`;
  const name = match.otherUser?.name || 'Unknown';
  const isOnline = match.match?.isOnline;
  const unread = match.unreadCount || 0;
  const lastMsg = match.match?.lastMessageContent;

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).springify()}>
      <ReAnimated.View style={aStyle}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={() => { scale.value = withSpring(0.97); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          onPress={() => onPress(match)}
          style={styles.matchItem}
        >
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: photoUrl }} style={styles.matchAvatar} />
            {isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{name}</Text>
            <Text style={styles.matchPreview} numberOfLines={1}>
              {lastMsg || 'You matched! Say hello 👋'}
            </Text>
          </View>
          <View style={styles.matchMeta}>
            {unread > 0 && (
              <ReAnimated.View entering={ZoomIn.springify()} style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </ReAnimated.View>
            )}
            <TouchableOpacity
              style={styles.chatIconBtn}
              onPress={() => onChat(match)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#FF1493" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

function EmptyState({ onExplore }: { onExplore: () => void }) {
  const heartScale = useSharedValue(1);
  useEffect(() => {
    const pulse = () => {
      heartScale.value = withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      );
      setTimeout(pulse, 2000);
    };
    pulse();
  }, [heartScale]);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  return (
    <ReAnimated.View entering={FadeInUp.springify()} style={styles.emptyContainer}>
      <ReAnimated.View style={heartStyle}>
        <Text style={{ fontSize: 80 }}>💝</Text>
      </ReAnimated.View>
      <ReAnimated.Text entering={FadeInDown.delay(200).springify()} style={styles.emptyTitle}>
        No matches yet
      </ReAnimated.Text>
      <ReAnimated.Text entering={FadeInDown.delay(350).springify()} style={styles.emptySubtitle}>
        Start swiping to find your perfect match
      </ReAnimated.Text>
      <ReAnimated.View entering={FadeInDown.delay(500).springify()}>
        <TouchableOpacity style={styles.exploreButton} onPress={onExplore} activeOpacity={0.85}>
          <LinearGradient colors={['#FF1493', '#FF69B4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.exploreGradient}>
            <AntDesign name="heart" size={18} color="#fff" />
            <Text style={styles.exploreButtonText}>Start Discovering</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

function SetupPrompt({ onSetup }: { onSetup: () => void }) {
  return (
    <LinearGradient colors={['#FF006E', '#9B27AF']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <ReAnimated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 20 }}>
          <Text style={{ fontSize: 80 }}>❤️</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' }}>Find Your Match</Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 }}>
            Create a dating profile to see and connect with your matches
          </Text>
          <ReAnimated.View entering={FadeInDown.delay(400).springify()} style={{ width: '100%', marginTop: 8 }}>
            <TouchableOpacity
              onPress={onSetup}
              activeOpacity={0.85}
              style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ color: '#FF006E', fontWeight: '800', fontSize: 17 }}>Create Dating Profile 💕</Text>
            </TouchableOpacity>
          </ReAnimated.View>
        </ReAnimated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SkeletonCard() {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    const animate = () => {
      opacity.value = withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 }),
      );
      setTimeout(animate, 1500);
    };
    animate();
  }, [opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <ReAnimated.View style={[styles.skeletonCard, aStyle]}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </ReAnimated.View>
  );
}

export default function MatchesScreen() {
  const { matches, loading, fetchMatches, unmatch } = useMatches();
  const { profile: datingProfile, loading: datingLoading } = useDatingProfile();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [fetchMatches])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const handleMatchPress = (match: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(routes)/dating-profile/[userId]' as any,
      params: { userId: match.otherUser._id },
    });
  };

  const handleChatPress = (match: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(routes)/dating-chat/[matchId]' as any,
      params: { matchId: match._id, userId: match.otherUser._id, userName: match.otherUser.name },
    });
  };

  const handleUnmatch = (match: any) => {
    Alert.alert('Unmatch?', `Are you sure you want to unmatch with ${match.otherUser?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch', style: 'destructive',
        onPress: async () => {
          try { await unmatch(match._id); } catch { Alert.alert('Error', 'Failed to unmatch'); }
        },
      },
    ]);
  };

  // Not loaded yet
  if (datingLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ReAnimated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
        </ReAnimated.View>
        <SkeletonCard />
      </View>
    );
  }

  // No dating profile
  if (!datingProfile) {
    return <SetupPrompt onSetup={() => router.push('/(routes)/dating-profile-setup' as any)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <ReAnimated.View entering={FadeInDown.springify()} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Matches</Text>
          {matches.length > 0 && (
            <Text style={styles.headerSub}>{matches.length} connection{matches.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <ActionButton
          onPress={() => router.push('/(tabs)/discover' as any)}
          style={styles.discoverBtn}
        >
          <LinearGradient colors={['#FF1493', '#FF69B4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.discoverGradient}>
            <Ionicons name="flame" size={16} color="#fff" />
            <Text style={styles.discoverText}>Discover</Text>
          </LinearGradient>
        </ActionButton>
      </ReAnimated.View>

      {/* New Matches Row */}
      {matches.length > 0 && (
        <ReAnimated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionLabel}>New Matches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newMatchesRow}
          >
            {matches.slice(0, 6).map((match: any, i: number) => (
              <NewMatchBubble key={match._id} match={match} index={i} onChat={handleChatPress} />
            ))}
          </ScrollView>
        </ReAnimated.View>
      )}

      {/* Match List */}
      {loading && matches.length === 0 ? (
        <SkeletonCard />
      ) : matches.length === 0 ? (
        <EmptyState onExplore={() => router.push('/(tabs)/discover' as any)} />
      ) : (
        <>
          <ReAnimated.Text entering={FadeInDown.delay(150).springify()} style={styles.sectionLabel}>
            Messages
          </ReAnimated.Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF1493" colors={['#FF1493']} />
            }
          >
            {matches.map((match: any, index: number) => (
              <MatchListItem
                key={match._id}
                match={match}
                index={index}
                onPress={handleMatchPress}
                onChat={handleChatPress}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#111' },
  headerSub: { fontSize: 13, color: '#999', marginTop: 2 },
  discoverBtn: { borderRadius: 20, overflow: 'hidden' },
  discoverGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  discoverText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  newMatchesRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  newMatchBubble: { alignItems: 'center', width: 72 },
  newMatchAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#FF1493' },
  bubbleName: { fontSize: 11, color: '#333', fontWeight: '600', marginTop: 6, textAlign: 'center' },
  bubbleUnread: {
    position: 'absolute', top: 0, right: 4,
    backgroundColor: '#FF1493', borderRadius: 8, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  bubbleOnline: {
    position: 'absolute', bottom: 22, right: 4,
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  matchItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  matchAvatar: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  matchPreview: { fontSize: 13, color: '#888' },
  matchMeta: { alignItems: 'center', gap: 8 },
  unreadBadge: {
    backgroundColor: '#FF1493', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  chatIconBtn: { padding: 6, backgroundColor: '#FFF0F7', borderRadius: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  exploreButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  exploreGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 16 },
  exploreButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skeletonCard: { padding: 16, gap: 12 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB', marginRight: 14 },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6 },
});
