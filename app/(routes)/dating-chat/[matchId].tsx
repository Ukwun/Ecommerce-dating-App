import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'http://10.0.2.2:8082';

interface Message {
  senderId: string;
  content: string;
  imageUrl?: string;
  messageType?: 'text' | 'image';
  timestamp: Date;
  isRead: boolean;
}

export default function DatingChatScreen() {
  const { matchId, userId, userName } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const handleIncomingMessage = useCallback((data: any) => {
    // Verify the message belongs to this conversation
    if (data.conversationId === matchId) {
      // Prevent duplication if the message is from self (handled by optimistic update)
      if (data.senderId === currentUserId) return;

      const newMessage: Message = {
        senderId: data.senderId,
        content: data.content,
        imageUrl: data.imageUrl,
        messageType: data.messageType,
        timestamp: data.timestamp,
        isRead: false,
      };
      setMessages((prev) => [...prev, newMessage]);
    }
  }, [matchId, currentUserId]);

  useEffect(() => {
    const setupSocket = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const envWs = typeof process !== 'undefined' ? (process.env as any)?.EXPO_PUBLIC_CHATTING_WEBSOCKET_URI : undefined;
      const normalizeDevHost = (raw?: string) => {
        if (!raw) return raw;
        return raw.replace(/^ws:\/\/10\.0\.2\.2(:|\/|$)/, 'ws://10.0.2.2$1');
      };
      const WS_URL = normalizeDevHost(envWs) || (__DEV__ ? 'ws://10.0.2.2:8082' : undefined);

      if (!WS_URL) return;

      socketRef.current = io(WS_URL, {
        transports: ['websocket'],
        auth: { token: token || '' },
      });

      socketRef.current.on('connect', () => {
        socketRef.current?.emit('conversation:join', matchId);
      });

      socketRef.current.on('message:received', handleIncomingMessage);

      socketRef.current.on('user:typing', () => {
        setIsTyping(true);
      });

      socketRef.current.on('user:stop-typing', () => {
        setIsTyping(false);
      });
    };

    setupSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [matchId, handleIncomingMessage]);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const user = await AsyncStorage.getItem('userData');
      
      if (user) {
        const userData = JSON.parse(user);
        setCurrentUserId(userData._id);
      }

      // Fetch messages
      if (matchId) {
        try {
          const response = await axios.get(
            `${API_BASE}/dating/api/chat/${matchId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setMessages(response.data.messages || []);
        } catch (err) {
          Alert.alert('Error', 'Failed to load messages');
        } finally {
          setLoading(false);
        }
      }
    };

    init();
  }, [matchId]);

  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (socketRef.current && currentUserId) {
      socketRef.current.emit('user:typing', { conversationId: matchId, userId: currentUserId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('user:stop-typing', { conversationId: matchId, userId: currentUserId });
      }, 2000);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? You will no longer receive messages from them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.post(
                `${API_BASE}/dating/api/matches/${matchId}/block`,
                { reason: 'Blocked from chat' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Blocked', 'User has been blocked.');
              router.replace('/matches' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to block user.');
            }
          }
        }
      ]
    );
  };

  const showOptions = () => {
    Alert.alert('Options', 'Select an action', [
      { text: 'Block User', onPress: handleBlockUser, style: 'destructive' },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const uploadImageToCloudinary = async (uri: string) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloud_name';
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your_unsigned_preset';

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    } as any);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSending(true);
        
        try {
          const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
          
          const token = await AsyncStorage.getItem('userToken');
          const response = await axios.post(
            `${API_BASE}/dating/api/chat/send/${matchId}`,
            { imageUrl: uploadedUrl },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMessages((prev) => [...prev, response.data.messageData]);
        } finally {
          setSending(false);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to send image');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await axios.post(
        `${API_BASE}/dating/api/chat/send/${matchId}`,
        { content: newMessage.trim() },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages([...messages, response.data.messageData]);
      setNewMessage('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isSent = item.senderId === currentUserId;

    return (
      <View
        className={`flex-row mb-3 ${isSent ? 'justify-end' : 'justify-start'} px-4`}
      >
        {!isSent && (
          <View className="w-8 h-8 rounded-full bg-pink-200 justify-center items-center mr-2">
            <Text className="text-pink-600 font-bold text-xs">
              {(typeof userName === 'string' ? userName : userName?.[0])?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}

        <View
          className={`max-w-xs px-4 py-3 rounded-2xl ${
            isSent
              ? 'bg-pink-500 rounded-br-none'
              : 'bg-gray-200 rounded-bl-none'
          }`}
        >
          {item.messageType === 'image' && item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={{ width: 200, height: 200, borderRadius: 10 }} 
              resizeMode="cover"
            />
          ) : (
            <Text className={`${isSent ? 'text-white' : 'text-gray-900'} text-base leading-6`}>
              {item.content}
            </Text>
          )}
          <Text
            className={`text-xs mt-1 ${
              isSent ? 'text-pink-100' : 'text-gray-500'
            }`}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {isSent && (
          <View className="w-8 h-8 rounded-full bg-blue-200 justify-center items-center ml-2">
            <Text className="text-blue-600 font-bold text-xs">Y</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-2"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">
              {userName}
            </Text>
            <Text className="text-xs text-green-500 font-semibold">Online</Text>
          </View>
        </View>

        <TouchableOpacity className="p-2" onPress={showOptions}>
          <Ionicons name="ellipsis-vertical" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
        inverted
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center">
            <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
            <Text className="mt-4 text-gray-500 font-semibold">No messages yet</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Say hello to {userName}!
            </Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View className="px-6 py-2 bg-white">
          <Text className="text-gray-400 text-xs italic">
            {userName} is typing...
          </Text>
        </View>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View className="flex-row items-center gap-2 px-4 py-4 border-t border-gray-200 bg-white">
          {/* Emoji/Media Button */}
          <TouchableOpacity 
            onPress={handlePickImage}
            className="w-10 h-10 rounded-full bg-gray-100 justify-center items-center"
          >
            <Ionicons name="add-circle" size={24} color="#FF6B6B" />
          </TouchableOpacity>

          {/* Text Input */}
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex-row items-center">
            <TextInput
              value={newMessage}
              onChangeText={handleTyping}
              placeholder="Message..."
              placeholderTextColor="#999"
              className="flex-1 text-gray-900"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className={`w-10 h-10 rounded-full justify-center items-center ${
              newMessage.trim() && !sending ? 'bg-pink-500' : 'bg-gray-300'
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() ? 'white' : '#999'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
