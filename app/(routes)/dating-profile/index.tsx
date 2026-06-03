import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Image, StyleSheet, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useDatingProfile } from '../../../hooks/useDating';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function DatingProfileScreen() {
  const router = useRouter();
  const {
    profile, loading, updateProfile, uploadPhoto, deletePhoto,
    updateLocation, enableTwoFactor, disableTwoFactor,
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
      await updateProfile({ bio: bioText, interests });
      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        await uploadPhoto(result.assets[0].uri, '', (profile?.photos?.length || 0) === 0);
        Alert.alert('Success', 'Photo added');
      } catch {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  const handleUpdateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Location permission is required'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      await updateLocation(loc.coords.latitude, loc.coords.longitude);
      Alert.alert('Success', 'Location updated');
    } catch {
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const handleShareProfile = async () => {
    try {
      const id = typeof profile?.userId === 'object' ? profile?.userId?._id : profile?.userId;
      await Share.share({ message: `Check out my dating profile! https://app.link/dating-profile/${id}` });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleToggle2FA = async () => {
    if (profile?.isTwoFactorEnabled) {
      try { await disableTwoFactor(); Alert.alert('Success', '2FA disabled'); }
      catch { Alert.alert('Error', 'Failed to disable 2FA'); }
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Camera permission required'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.5,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled) {
        try { await enableTwoFactor(result.assets[0].uri); Alert.alert('Success', '2FA enabled'); }
        catch { Alert.alert('Error', 'Failed to enable 2FA'); }
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF1493" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <LinearGradient colors={['#FF006E', '#9B27AF']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 20 }}>
            <Text style={{ fontSize: 80 }}>💕</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' }}>
              No Dating Profile Yet
            </Text>
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 }}>
              Create your dating profile to start meeting people
            </Text>
            <Animated.View entering={FadeInDown.delay(300).springify()} style={{ width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/(routes)/dating-profile-setup' as any)}
                activeOpacity={0.85}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Create Dating Profile 💖</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Dating Profile</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleShareProfile} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={20} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEditing(e => !e)}
            style={[styles.headerBtn, editing && styles.headerBtnActive]}
          >
            <Text style={[styles.editText, editing && styles.editTextActive]}>
              {editing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Profile Photo */}
        <View style={styles.photoHeader}>
          <Image
            source={{ uri: profile.profilePhotoUrl || profile.photos?.[0]?.url || 'https://i.pravatar.cc/300' }}
            style={styles.mainPhoto}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.userId?.name || 'User'}</Text>
            {profile.age && <Text style={styles.profileAge}>{profile.age} years old</Text>}
            {profile.location?.city && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={14} color="#FF1493" />
                <Text style={styles.profileLocation}>{profile.location.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Likes', value: profile.totalLikes || 0, color: '#FF1493' },
            { label: 'Matches', value: profile.totalMatches || 0, color: '#10B981' },
            { label: 'Verified', value: `${profile.verificationScore || 0}%`, color: '#3B82F6' },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statNumber, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Photos */}
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photosGrid}>
          {profile.photos?.map((photo: any, idx: number) => (
            <View key={idx} style={styles.photoThumb}>
              <Image source={{ uri: photo.url }} style={styles.thumbImg} resizeMode="cover" />
              {photo.isProfilePhoto && (
                <View style={styles.mainBadge}><Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>MAIN</Text></View>
              )}
              {editing && (
                <TouchableOpacity onPress={() => deletePhoto(idx)} style={styles.deletePhotoBtn}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {editing && (profile.photos?.length || 0) < 9 && (
            <TouchableOpacity onPress={handleUploadPhoto} style={styles.addPhotoBtn}>
              <Ionicons name="add" size={28} color="#FF1493" />
              <Text style={{ fontSize: 10, color: '#FF1493', marginTop: 4 }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bio */}
        <Text style={styles.sectionTitle}>Bio</Text>
        {editing ? (
          <View>
            <TextInput
              value={bioText}
              onChangeText={setBioText}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#aaa"
              multiline
              maxLength={500}
              style={styles.bioInput}
            />
            <Text style={styles.charCount}>{bioText.length}/500</Text>
          </View>
        ) : (
          <Text style={styles.bioText}>{bioText || 'No bio yet. Tap Edit to add one.'}</Text>
        )}

        {/* Interests */}
        <Text style={styles.sectionTitle}>Interests</Text>
        {editing && (
          <View style={styles.interestInputRow}>
            <TextInput
              value={interestInput}
              onChangeText={setInterestInput}
              placeholder="Add an interest..."
              placeholderTextColor="#aaa"
              style={styles.interestInput}
              onSubmitEditing={() => {
                if (interestInput.trim() && !interests.includes(interestInput.trim())) {
                  setInterests(p => [...p, interestInput.trim()]);
                  setInterestInput('');
                }
              }}
            />
            <TouchableOpacity
              style={styles.addInterestBtn}
              onPress={() => {
                if (interestInput.trim() && !interests.includes(interestInput.trim())) {
                  setInterests(p => [...p, interestInput.trim()]);
                  setInterestInput('');
                }
              }}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.tagsRow}>
          {interests.length === 0 && !editing && (
            <Text style={{ color: '#aaa', fontSize: 14 }}>No interests added yet</Text>
          )}
          {interests.map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              {editing && (
                <TouchableOpacity onPress={() => setInterests(p => p.filter((_, idx) => idx !== i))} style={{ marginLeft: 4 }}>
                  <Ionicons name="close" size={13} color="#FF1493" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationBox}>
          <Ionicons name="location" size={18} color="#FF1493" />
          <Text style={styles.locationText}>
            {profile.location?.city || (profile.location?.coordinates ? 'Location set' : 'Not set')}
          </Text>
          {editing && (
            <TouchableOpacity onPress={handleUpdateLocation} style={styles.updateLocBtn}>
              <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Update</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        {expoPushToken ? (
          <View style={styles.notifEnabled}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={{ color: '#10B981', fontWeight: '600', marginLeft: 8 }}>Notifications enabled</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={requestAndRegister} style={styles.notifBtn} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Enable Push Notifications</Text>
          </TouchableOpacity>
        )}

        {/* 2FA */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.securityRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111', marginBottom: 2 }}>2-Step Verification</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>Require selfie verification on new devices</Text>
          </View>
          <TouchableOpacity
            onPress={handleToggle2FA}
            style={[styles.toggleBtn, profile.isTwoFactorEnabled && styles.toggleBtnOn]}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
              {profile.isTwoFactorEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        {editing && (
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  loadingText: { color: '#888', fontSize: 15 },
  createBtn: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
  createBtnText: { color: '#FF006E', fontWeight: '800', fontSize: 17 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  headerBtnActive: { backgroundColor: '#FF1493' },
  editText: { fontSize: 14, fontWeight: '700', color: '#111' },
  editTextActive: { color: '#fff' },
  photoHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  mainPhoto: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FF1493' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#111' },
  profileAge: { fontSize: 14, color: '#666' },
  profileLocation: { fontSize: 13, color: '#666' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12, marginTop: 8 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute', bottom: 4, left: 4, backgroundColor: '#FF1493',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  deletePhotoBtn: {
    position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#FF1493', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF0F7',
  },
  bioInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#111', minHeight: 100, textAlignVertical: 'top',
    backgroundColor: '#fff', marginBottom: 4,
  },
  charCount: { fontSize: 11, color: '#aaa', textAlign: 'right', marginBottom: 16 },
  bioText: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 16 },
  interestInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  interestInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111', backgroundColor: '#fff',
  },
  addInterestBtn: {
    backgroundColor: '#FF1493', borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F7',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FFCCE8',
  },
  tagText: { color: '#FF1493', fontWeight: '600', fontSize: 13 },
  locationBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, gap: 8, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  locationText: { flex: 1, fontSize: 15, color: '#333' },
  updateLocBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EFF6FF', borderRadius: 8 },
  notifEnabled: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    borderRadius: 12, padding: 14, marginBottom: 24,
  },
  notifBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3B82F6', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  securityRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  toggleBtn: {
    backgroundColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 52, alignItems: 'center',
  },
  toggleBtnOn: { backgroundColor: '#10B981' },
  saveBtn: {
    backgroundColor: '#FF1493', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#FF1493', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
