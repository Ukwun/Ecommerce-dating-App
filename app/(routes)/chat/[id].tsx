import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  FadeInDown, FadeInLeft, FadeInRight, SlideInUp,
} from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { io, Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosinstance';
import { useAuth } from '@/hooks/AuthContext';

const BACKEND = process.env.EXPO_PUBLIC_SERVER_URI || 'https://marketplace-backend.railway.app';

type Message = { _id: string; content: string; sender: string; createdAt: string; read?: boolean };

export default function ChatScreen() {
  const { id: conversationId, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);
  const sendScale = useSharedValue(1);
  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  // Load message history
  const loadHistory = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/marketplace/api/messages/${conversationId}`);
      const msgs: Message[] = res.data?.data || res.data?.messages || [];
      setMessages(msgs);
    } catch (_) {} finally { setLoading(false); }
  }, [conversationId]);

  // Socket setup
  useEffect(() => {
    let socket: Socket;
    const setup = async () => {
      const token = await SecureStore.getItemAsync('access_token');
      socket = io(BACKEND, {
        transports: ['websocket'],
        auth: { token: token || '' },
        reconnection: true,
        reconnectionAttempts: 5,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('joinConversation', { conversationId });
        // Mark messages as read
        socket.emit('markRead', { conversationId });
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('newMessage', (msg: Message) => {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        // Mark as read
        socket.emit('markRead', { conversationId });
      });

      socket.on('userTyping', ({ userId }: { userId: string }) => {
        if (userId !== user?.id) setIsTyping(true);
      });

      socket.on('userStoppedTyping', ({ userId }: { userId: string }) => {
        if (userId !== user?.id) setIsTyping(false);
      });

      socket.on('messagesRead', ({ conversationId: cId }: any) => {
        if (cId === conversationId) {
          setMessages(prev => prev.map(m => ({ ...m, read: true })));
        }
      });
    };

    loadHistory();
    setup();
    return () => { socket?.disconnect(); };
  }, [conversationId]);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { conversationId });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { conversationId });
      }, 1500);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendScale.value = withSpring(0.85, {}, () => { sendScale.value = withSpring(1); });

    const tempMsg: Message = {
      _id: `temp-${Date.now()}`,
      content: text,
      sender: user?.id || '',
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await axiosInstance.post('/marketplace/api/messages', { conversationId, content: text });
      const saved: Message = res.data?.data || res.data?.message || tempMsg;
      setMessages(prev => prev.map(m => m._id === tempMsg._id ? { ...saved, _id: saved._id || tempMsg._id } : m));
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendMessage', { conversationId, content: text, messageId: saved._id });
      }
    } catch (_) {}
  };

  const isFromMe = (msg: Message) => msg.sender === user?.id || msg.sender?.toString() === user?.id?.toString();

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const fromMe = isFromMe(item);
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <Animated.View
        entering={fromMe ? FadeInRight.delay(20).springify() : FadeInLeft.delay(20).springify()}
        style={[styles.bubbleRow, fromMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}
      >
        {!fromMe && (
          <Image source={{ uri: avatar || 'https://i.pravatar.cc/40' }} style={styles.bubbleAvatar} />
        )}
        <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, fromMe && styles.bubbleTextMe]}>{item.content}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, fromMe && styles.bubbleTimeMe]}>{time}</Text>
            {fromMe && (
              <Ionicons
                name={item.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.read ? '#60A5FA' : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: avatar || 'https://i.pravatar.cc/40' }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{name || 'Chat'}</Text>
            <View style={styles.onlineRow}>
              <View style={[styles.onlineDot, connected ? styles.online : styles.offline]} />
              <Text style={styles.onlineText}>{connected ? 'Online' : 'Connecting...'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF8C00" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m._id}
              renderItem={renderMessage}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                  <Text style={styles.emptyChatSub}>Send a message to start the conversation</Text>
                </View>
              }
            />
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <Animated.View entering={SlideInUp.springify()} style={styles.typingIndicator}>
              <Text style={styles.typingText}>{name || 'Someone'} is typing</Text>
              <View style={styles.typingDots}>
                {[0, 1, 2].map(i => <View key={i} style={styles.typingDot} />)}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Composer */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              style={styles.composerInput}
              multiline
              maxLength={1000}
            />
            <Animated.View style={sendStyle}>
              <TouchableOpacity
                onPress={send}
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 10, gap: 12 },
  backBtn: { padding: 6 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  online: { backgroundColor: '#10B981' },
  offline: { backgroundColor: '#F59E0B' },
  onlineText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  messagesContainer: { flex: 1, backgroundColor: '#F9FAFB', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyChatText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptyChatSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 8 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 30, height: 30, borderRadius: 15 },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#FF8C00', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  bubbleTime: { fontSize: 11, color: '#9CA3AF' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  typingText: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  composerInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 120, borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { backgroundColor: '#FF8C00', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});
