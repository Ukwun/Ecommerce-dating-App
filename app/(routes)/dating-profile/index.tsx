import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useDatingProfile } from '../../../hooks/useDating';
import { usePushNotifications } from '../../../hooks/usePushNotifications';

export default function DatingProfileScreen() {
  const {
    profile,
    loading,
    error,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    updateLocation,
    enableTwoFactor,
    disableTwoFactor
  } = useDatingProfile();

  const { expoPushToken, requestAndRegister } = usePushNotifications();

  const [editing, setEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBioText(profile.bio || '');
      setInterests(profile.interests || []);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateProfile({
        bio: bioText,
        interests
      });
      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled) {
      try {
        // In production, upload to Cloudinary or similar
        // For now, use local URI
        const photoUri = result.assets[0].uri;
        await uploadPhoto(photoUri, '', profile?.photos?.length === 0);
        Alert.alert('Success', 'Photo added');
      } catch (err) {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  const handleUpdateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      await updateLocation(latitude, longitude);
      Alert.alert('Success', 'Location updated');
    } catch (err) {
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const handleToggle2FA = async () => {
    if (profile?.isTwoFactorEnabled) {
      // Disable
      try {
        await disableTwoFactor();
        Alert.alert('Success', '2-Step Verification disabled');
      } catch (err) {
        Alert.alert('Error', 'Failed to disable 2FA');
      }
    } else {
      // Enable - Launch Camera
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
        cameraType: ImagePicker.CameraType.front
      });

      if (!result.canceled && result.assets[0].uri) {
        try {
          // In prod, upload to Cloudinary first. Sending URI for now.
          await enableTwoFactor(result.assets[0].uri);
          Alert.alert('Success', '2-Step Verification enabled with your selfie');
        } catch (err) {
          Alert.alert('Error', 'Failed to enable 2FA');
        }
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 justify-center items-center">
        <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
        <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
          No dating profile
        </Text>
        <TouchableOpacity className="bg-pink-500 px-8 py-3 rounded-full mt-6">
          <Text className="text-white font-bold">Create Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleShareProfile = async () => {
    try {
      const id = typeof profile?.userId === 'object' ? profile?.userId?._id : profile?.userId;
      // Use HTTPS URL for Universal/App Links (requires website configuration)
      const url = `https://www.your-website.com/dating-profile/${id}`;
      await Share.share({
        message: `Check out my dating profile on Marketplace! ${url}`,
        url: url,
        title: 'My Dating Profile'
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">My Profile</Text>
        <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleShareProfile}
          className="p-2 rounded-full bg-gray-100"
        >
          <Ionicons name="share-outline" size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (editing) {
              setEditing(false);
            } else {
              setEditing(true);
            }
          }}
          className="px-4 py-2 rounded-full bg-pink-500"
        >
          <Text className="text-white font-semibold text-sm">
            {editing ? 'Done' : 'Edit'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-4">Photos</Text>
          <View className="flex-row flex-wrap gap-3">
            {profile.photos?.map((photo: any, idx: number) => (
              <View key={idx} className="relative w-24 h-24">
                <Image
                  source={{ uri: photo.url }}
                  className="w-full h-full rounded-lg"
                  resizeMode="cover"
                />
                {editing && (
                  <TouchableOpacity
                    onPress={() => deletePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                )}
                {photo.isProfilePhoto && (
                  <View className="absolute top-1 left-1 bg-blue-500 rounded-full px-2 py-1">
                    <Text className="text-white text-xs font-bold">Main</Text>
                  </View>
                )}
              </View>
            ))}

            {editing && profile.photos?.length < 9 && (
              <TouchableOpacity
                onPress={handleUploadPhoto}
                className="w-24 h-24 border-2 border-dashed border-pink-500 rounded-lg justify-center items-center bg-pink-50"
              >
                <Ionicons name="add" size={28} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bio */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">Bio</Text>
          {editing ? (
            <TextInput
              value={bioText}
              onChangeText={setBioText}
              placeholder="Tell people about yourself..."
              multiline
              maxLength={500}
              numberOfLines={5}
              className="border border-gray-300 rounded-lg p-4 text-gray-900"
            />
          ) : (
            <Text className="text-gray-700 leading-6">
              {bioText || 'No bio yet'}
            </Text>
          )}
          {editing && (
            <Text className="text-xs text-gray-500 mt-2">
              {bioText.length}/500
            </Text>
          )}
        </View>

        {/* Interests */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">Interests</Text>

          {!editing ? (
            <View className="flex-row flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest, idx) => (
                  <View key={idx} className="bg-pink-100 rounded-full px-4 py-2">
                    <Text className="text-pink-600 font-semibold text-sm">
                      {interest}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-500">No interests added yet</Text>
              )}
            </View>
          ) : (
            <>
              <View className="flex-row gap-2 mb-3">
                <TextInput
                  value={interestInput}
                  onChangeText={setInterestInput}
                  placeholder="Add an interest..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                />
                <TouchableOpacity
                  onPress={handleAddInterest}
                  className="bg-pink-500 rounded-lg px-4 justify-center"
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {interests.map((interest, idx) => (
                  <View
                    key={idx}
                    className="bg-pink-100 rounded-full px-3 py-2 flex-row items-center"
                  >
                    <Text className="text-pink-600 font-semibold mr-2">
                      {interest}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveInterest(interest)}>
                      <Ionicons name="close" size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Location */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">Location</Text>
          {profile.location?.coordinates ? (
            <View className="bg-blue-50 rounded-lg p-4">
              <Text className="text-gray-700 font-semibold">
                {profile.location.city || 'Location set'}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Last updated: {new Date(profile.location.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <View className="bg-gray-100 rounded-lg p-4">
              <Text className="text-gray-600">Location not set</Text>
            </View>
          )}

          {editing && (
            <TouchableOpacity
              onPress={handleUpdateLocation}
              className="bg-blue-500 rounded-lg p-4 mt-3"
            >
              <Text className="text-white font-bold text-center">Update Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Settings */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">Notifications</Text>
          {expoPushToken ? (
            <View className="bg-green-50 rounded-lg p-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="green" />
              <Text className="text-green-700 font-semibold ml-2">Notifications are enabled</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={requestAndRegister}
              className="bg-blue-500 rounded-lg p-4"
            >
              <Text className="text-white font-bold text-center">Enable Push Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security Settings */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">Security</Text>
          <View className="bg-white rounded-lg p-4 border border-gray-200">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-900 font-semibold">2-Step Verification</Text>
              <TouchableOpacity
                onPress={handleToggle2FA}
                className={`px-4 py-2 rounded-full ${profile.isTwoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <Text className="text-white font-bold text-xs">
                  {profile.isTwoFactorEnabled ? 'ENABLED' : 'ENABLE'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-500 text-xs">Require a selfie verification when logging in from a new device.</Text>
          </View>
        </View>

        {/* Profile Stats */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-4">Profile Stats</Text>
          <View className="flex-row justify-around bg-white rounded-lg p-4">
            <View className="items-center">
              <Text className="text-2xl font-bold text-pink-500">
                {profile.totalLikes || 0}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Likes</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">
                {profile.totalMatches || 0}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Matches</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">
                {profile.verificationScore || 0}%
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Verified</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={saving}
            className={`py-4 rounded-lg mb-6 ${
              saving ? 'bg-gray-400' : 'bg-pink-500'
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-center text-lg">
                Save Profile
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
