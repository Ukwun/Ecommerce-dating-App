import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Image, Alert, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Swipeable } from 'react-native-gesture-handler';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';

// Mock data for conversations (initial seed)
const initialConversations = [
  {
    id: '1',
    userName: 'Jane Doe',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
    lastMessage: 'Sounds good! See you then.',
    timestamp: '10:42 AM',
    unreadCount: 2,
  },
  {
    id: '2',
    userName: 'John Smith',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
    lastMessage: 'Can you send me the address?',
    timestamp: '9:30 AM',
    unreadCount: 0,
  },
  {
    id: '3',
    userName: 'GadgetGod',
    userAvatar: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=faces',
    lastMessage: 'You: Is this still available?',
    timestamp: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: '4',
    userName: 'Fashionista',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces',
    lastMessage: 'Yes, I can do ₦15,000.',
    timestamp: 'Yesterday',
    unreadCount: 1,
  },
  {
    id: '5',
    userName: 'Bookworm',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces',
    lastMessage: 'Perfect, thank you!',
    timestamp: 'Oct 28',
    unreadCount: 0,
  },
];

type Conversation = {
  id: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  justUpdated?: boolean;
};

type WSMessage = {
  type: 'message' | 'typing' | 'presence';
  payload: any;
};

const ConversationItem = ({ item, onDelete, onAnimationComplete }: { item: Conversation; onDelete: (id: string) => void; onAnimationComplete: (id: string) => void; }) => {
  const isUnread = item.unreadCount > 0;

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteAction}>
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <MotiView
      from={{ scale: 1, backgroundColor: '#F3F4F6' }}
      animate={{
        scale: item.justUpdated ? 1.02 : 1,
        backgroundColor: item.justUpdated ? '#FEF3C7' : '#F3F4F6',
      }}
      transition={{ type: 'timing', duration: 300 }}
      onDidAnimate={() => {
        if (item.justUpdated) {
          onAnimationComplete(item.id);
        }
      }}
    >
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity style={styles.conversationItem} onPress={() => router.push(`/chat/${item.id}`)} activeOpacity={1}>
          <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
          <View style={styles.conversationDetails}>
            <View style={styles.conversationHeader}>
              <Text style={[styles.userName, isUnread && styles.unreadText]}>{item.userName}</Text>
              <Text style={[styles.timestamp, isUnread && styles.unreadText]}>{item.timestamp}</Text>
            </View>
            <View style={styles.lastMessageContainer}>
              <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
                {item.lastMessage}
              </Text>
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </MotiView>
  );
};

export default function MessagesScreen() {
  const { isDark } = useTheme();
  // WebSocket URL: prefer an injected public env var. In dev, normalize common emulator loopback addresses.
  const envWs = typeof process !== 'undefined' ? (process.env as any)?.EXPO_PUBLIC_CHATTING_WEBSOCKET_URI : undefined;
  // Normalize a few common dev hostnames to proper loopback addresses depending on Android/iOS emulator.
  const normalizeDevHost = (raw?: string) => {
    if (!raw) return raw;
    // replace common placeholder with localhost
    const replaced = raw.replace(/^ws:\/\/10\.0\.2\.2(:|\/|$)/, 'ws://10.0.2.2$1');
    return replaced;
  };
  const WS_URL = normalizeDevHost(envWs) || (__DEV__ ? 'ws://10.0.2.2:8082' : undefined);

  // Helper: validate WS_URL and avoid known placeholders used in examples.
  const isValidWsUrl = (u?: string) => {
    if (!u) return false;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return false;
      // Avoid example.com placeholder
      if (parsed.hostname.includes('example.com')) return false;
      return true;
    } catch (e) {
      return false;
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [searchQuery, setSearchQuery] = useState('');

  // WebSocket reference and reconnection state
  const wsRef = useRef<Socket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error' | 'disabled'>(() => isValidWsUrl(WS_URL) ? 'connecting' : 'disabled');

  const connect = async () => {
    // Do not attempt to connect if WS_URL is missing or a placeholder
    if (!isValidWsUrl(WS_URL)) {
      console.warn('WebSocket: no valid WS_URL configured. Skipping connection. Set EXPO_PUBLIC_CHATTING_WEBSOCKET_URI to enable real-time messaging. Current value:', WS_URL);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('access_token');
      
      // Initialize Socket.IO client
      const socket = io(WS_URL as string, {
        transports: ['websocket'],
        auth: { token: token || '' },
        reconnection: true,
        reconnectionAttempts: 5,
      });

      wsRef.current = socket;

      socket.on('connect', () => {
        reconnectAttempt.current = 0;
        setConnectionState('open');
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current as any);
          reconnectTimeout.current = null;
        }
        console.log('Socket.IO connected');
      });

      socket.on('message:received', (data: any) => {
        // Handle incoming message
        // Expected payload: { conversationId, content, senderName, senderAvatar, timestamp }
        const convId = data.conversationId;
        
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === convId);
          
          if (idx === -1) {
            // New conversation
            const newConv: Conversation = {
              id: convId,
              userName: data.senderName || 'Unknown',
              userAvatar: data.senderAvatar || 'https://via.placeholder.com/150',
              lastMessage: data.content || 'Sent a message',
              timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unreadCount: 1,
              justUpdated: true,
            };
            return [newConv, ...prev];
          }

          const updated = [...prev];
          const existing = updated[idx];
          updated.splice(idx, 1);
          updated.unshift({
            ...existing,
            lastMessage: data.content || 'Sent a message',
            timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: existing.unreadCount + 1,
            justUpdated: true,
          });
          return updated;
        });
      });

      socket.on('connect_error', (err) => {
        setConnectionState('error');
        console.warn('Socket error', err.message);
      });

      socket.on('disconnect', (reason) => {
        setConnectionState('closed');
        console.log('Socket disconnected', reason);
      });
    } catch (err) {
      console.warn('Socket connect failed', err);
    }
  };

  useEffect(() => {
    // Only connect if WS URL is configured and valid
    if (!isValidWsUrl(WS_URL)) {
      // show an informative message in dev for visibility (not in prod)
      if (__DEV__) {
        console.warn('Real-time websocket not configured. Set EXPO_PUBLIC_CHATTING_WEBSOCKET_URI to enable it.');
      }
      setConnectionState('disabled');
    } else {
      setConnectionState('connecting');
      connect();
    }
    // cleanup
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current as any);
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Example: mark conversation read when user opens the chat screen.
  // You would call this from the chat screen after navigation or via a messaging context.
  const markAsRead = (conversationId: string) => {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
  };

  const handleAnimationComplete = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, justUpdated: false } : c));
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to permanently delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setConversations(prev => prev.filter(c => c.id !== id));
        }}
      ]
    );
  };

  // Simple UI action to test sending a ping/payload to the server (replace with real send)
  const sendTestMessage = () => {
    if (!wsRef.current || !wsRef.current.connected) {
      Alert.alert('Connection', 'WebSocket not connected');
      return;
    }
    // Emit a test event
    wsRef.current.emit('ping', { ts: Date.now() });
  };

  const handleRetry = () => {
    if (connectionState === 'disabled') {
      Alert.alert('WebSocket', 'WebSocket not configured. Set EXPO_PUBLIC_CHATTING_WEBSOCKET_URI to enable.');
      return;
    }
    setConnectionState('connecting');
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    connect();
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, connectionState === 'open' ? styles.statusOpen : connectionState === 'connecting' ? styles.statusConnecting : styles.statusClosed]} />
              <Text style={styles.statusText}>{connectionState}</Text>
              {connectionState !== 'open' && connectionState !== 'disabled' && (
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.searchButton} onPress={() => sendTestMessage()}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 50 }}
            ><ConversationItem item={item} onDelete={handleDelete} onAnimationComplete={handleAnimationComplete} /></MotiView>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ backgroundColor: isDark ? '#111827' : '#F3F4F6' }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
  },
  searchButton: { padding: 4 },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // Add a background color
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#FF8C00',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 78, // Aligns with the start of the text
  },
  statusContainer: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    marginLeft: 8,
    marginRight: 6,
  },
  statusOpen: { backgroundColor: '#10B981' },
  statusConnecting: { backgroundColor: '#F59E0B' },
  statusClosed: { backgroundColor: '#EF4444' },
  statusText: { color: '#fff', marginRight: 8, textTransform: 'capitalize' },
  retryButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
  retryText: { color: '#fff', fontSize: 12 },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 80,
    paddingRight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
});