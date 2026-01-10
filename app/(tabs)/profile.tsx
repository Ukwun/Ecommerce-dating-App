import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useDatingProfile } from '../../hooks/useDating';

export default function ProfileScreen() {
  const router = useRouter();
  // Fetch dating profile to check 2FA status
  const { profile, loading } = useDatingProfile();

  const handleEnterDating = () => {
    if (profile?.isTwoFactorEnabled) {
      // If 2FA is enabled, go to verification screen
      router.push('/(routes)/dating/verify' as any);
    } else {
      // Otherwise, go directly to dating discover
      router.push('/(tabs)/discover' as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          className="bg-white p-6 border-b border-gray-200 items-center"
        >
          <View className="w-24 h-24 bg-gray-200 rounded-full mb-4 justify-center items-center">
            <Ionicons name="person" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-bold text-gray-900">User Profile</Text>
          <Text className="text-gray-500">Marketplace User</Text>
        </MotiView>

        {/* Marketplace Options */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
          className="mt-6 px-4"
        >
          <Text className="text-lg font-bold text-gray-900 mb-3">Marketplace</Text>
          <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center mb-2">
            <Ionicons name="list" size={24} color="#4B5563" />
            <Text className="ml-3 text-gray-700 font-semibold">My Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white p-4 rounded-lg flex-row items-center">
            <Ionicons name="cart" size={24} color="#4B5563" />
            <Text className="ml-3 text-gray-700 font-semibold">Orders</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Dating Section Entry */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          className="mt-8 px-4"
        >
          <Text className="text-lg font-bold text-gray-900 mb-3">Dating</Text>
          
          <TouchableOpacity
            onPress={handleEnterDating}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FF512F', '#DD2476']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ loop: true, type: 'timing', duration: 1500 }}
                  style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="heart" size={28} color="white" />
                </MotiView>
                <View style={{ marginLeft: 16 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 22 }}>Match Me</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>Find your perfect match</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}