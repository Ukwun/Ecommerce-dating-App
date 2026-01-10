import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatingProfile } from './useDating';

export default function DatingVerificationScreen() {
  const router = useRouter();
  const { verifyIdentity, forgotTwoFactor } = useDatingProfile();
  const [verifying, setVerifying] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const handleTakeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required for verification');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotoUri(result.assets[0].uri);
      verifyLogin(result.assets[0].uri);
    }
  };

  const verifyLogin = async (uri: string) => {
    try {
      setVerifying(true);
      // In a real app, you would upload 'uri' to Cloudinary here and pass the URL.
      // For this implementation, we pass the URI to the backend mock.
      const response = await verifyIdentity(uri);
      
      if (response.verified) {
        Alert.alert('Success', 'Identity Verified!');
        router.replace('/(tabs)/discover' as any);
      } else {
        Alert.alert('Failed', 'Verification failed. Please try again.');
        setPhotoUri(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
      setPhotoUri(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleForgot2FA = () => {
    Alert.alert(
      'Trouble Verifying?',
      'If you cannot verify your selfie, we can send a reset link to your registered email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            try {
              setSendingReset(true);
              await forgotTwoFactor();
              Alert.alert('Email Sent', 'Please check your email to reset your 2-step verification.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reset link');
            } finally {
              setSendingReset(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-pink-100 rounded-full justify-center items-center mb-4">
          <Ionicons name="shield-checkmark" size={40} color="#FF6B6B" />
        </View>
        <Text className="text-2xl font-bold text-gray-900 text-center">
          2-Step Verification
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Please take a selfie to verify your identity and access your dating profile.
        </Text>
      </View>

      {photoUri ? (
        <View className="w-48 h-48 rounded-full overflow-hidden mb-8 border-4 border-pink-500">
          <Image source={{ uri: photoUri }} className="w-full h-full" />
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleTakeSelfie}
          disabled={verifying}
          className="bg-pink-500 w-full py-4 rounded-full flex-row justify-center items-center"
        >
          {verifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Take Selfie</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleForgot2FA} className="mt-6 p-2" disabled={sendingReset}>
        {sendingReset ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <Text className="text-gray-500 font-semibold text-sm">
            Trouble verifying?
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}