import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RouteParams = { id?: string };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const [messages, setMessages] = useState<Array<{ id: string; text: string; fromMe?: boolean }>>([]);
  const [input, setInput] = useState('');

  // Use same WS env var as messages screen
  const envWs = typeof process !== 'undefined' ? (process.env as any)?.EXPO_PUBLIC_CHATTING_WEBSOCKET_URI : undefined;
  const WS_URL = envWs || (__DEV__ ? 'ws://localhost:3000' : undefined);
  const wsRef = useRef<WebSocket | null>(null);

  const isValidWsUrl = (u?: string) => {
    if (!u) return false;
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch (e) { return false; }
  };

  useEffect(() => {
    if (!isValidWsUrl(WS_URL)) return;
    try {
      const ws = new WebSocket(WS_URL as string);
      wsRef.current = ws;
      ws.onopen = () => {
        console.log('Chat WS connected');
        // Optionally request conversation history
        ws.send(JSON.stringify({ type: 'join', payload: { conversationId: id } }));
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string);
          if (data?.type === 'message' && data.payload?.conversationId === id) {
            setMessages(prev => [...prev, { id: String(Date.now()), text: data.payload.content, fromMe: false }]);
          }
        } catch (e) { console.warn('chat parse', e); }
      };
      ws.onerror = (e) => console.warn('chat ws error', e);
      ws.onclose = () => console.log('chat ws closed');
      return () => { wsRef.current?.close(); wsRef.current = null; };
    } catch (e) { console.warn('chat ws failed', e); }
  }, [WS_URL, id]);

  const send = () => {
    if (!input.trim()) return;
    const payload = { type: 'message', payload: { conversationId: id, content: input } };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      setMessages(prev => [...prev, { id: String(Date.now()), text: input, fromMe: true }]);
      setInput('');
      return;
    }
    // fallback: show locally
    setMessages(prev => [...prev, { id: String(Date.now()), text: input, fromMe: true }]);
    setInput('');
    if (!isValidWsUrl(WS_URL)) {
      Alert.alert('Offline', 'Real-time messaging is not configured.');
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          <View style={{ width: 36 }} />
        </View>
        <FlatList data={messages} keyExtractor={m => m.id} renderItem={({ item }) => (
          <View style={[styles.bubble, item.fromMe ? styles.bubbleRight : styles.bubbleLeft]}>
            <Text style={{ color: item.fromMe ? '#fff' : '#111' }}>{item.text}</Text>
          </View>
        )} contentContainerStyle={{ padding: 12 }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <View style={styles.composer}>
            <TextInput value={input} onChangeText={setInput} placeholder="Type a message" style={styles.input} placeholderTextColor="#6B7280" />
            <TouchableOpacity onPress={send} style={styles.sendButton}><Ionicons name="send" size={20} color="#fff" /></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingTop: 18 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff' },
  input: { flex: 1, height: 44, paddingHorizontal: 12, color: '#111', borderRadius: 8, backgroundColor: '#F3F4F6' },
  sendButton: { marginLeft: 8, backgroundColor: '#FF8C00', padding: 10, borderRadius: 8 },
  bubble: { padding: 10, marginVertical: 6, maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 8 },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#FF8C00', borderRadius: 8 },
});
