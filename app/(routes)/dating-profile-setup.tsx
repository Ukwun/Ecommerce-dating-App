import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatingProfile } from '@/hooks/useDating';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { useImageUpload } from '@/hooks/useImageUpload';

export default function DatingProfileSetup() {
  const router = useRouter();
  const { profile, createProfile, loading: profileLoading } = useDatingProfile();
  const { uploadImage, uploading: imageUploading } = useImageUpload();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    bio: '',
    age: '',
    interests: '',
    gender: '',
    lookingFor: '',
    profilePhoto: '',
  });
  const [creating, setCreating] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only redirect if profile loaded AND we haven't already navigated away
    if (!profileLoading) {
      setInitialized(true);
      if (profile) {
        router.replace('/(tabs)/matches' as any);
      }
    }
  }, [profile, profileLoading, router]);

  const handlePhotoSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const { url } = await uploadImage(result.assets[0].uri, '/dating-profiles');
        setFormData(prev => ({ ...prev, profilePhoto: url }));
        Toast.show({ type: 'success', text1: 'Photo uploaded!' });
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Photo upload failed' });
      }
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.bio.trim()) {
      return Toast.show({ type: 'error', text1: 'Bio is required' });
    }
    if (!formData.age || parseInt(formData.age) < 18) {
      return Toast.show({ type: 'error', text1: 'You must be 18 or older' });
    }
    if (!formData.profilePhoto) {
      return Toast.show({ type: 'error', text1: 'Profile photo is required' });
    }

    setCreating(true);
    try {
      await createProfile({
        bio: formData.bio,
        age: parseInt(formData.age),
        interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean),
        gender: formData.gender,
        lookingFor: formData.lookingFor,
        profilePhotoUrl: formData.profilePhoto,
      });
      Toast.show({ type: 'success', text1: 'Profile created!' });
      router.replace('/(tabs)/matches' as any);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to create profile' });
    } finally {
      setCreating(false);
    }
  };

  // Show a brief loading indicator only on first load, not indefinitely
  if (profileLoading && !initialized) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#FF1493', '#FF69B4']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Your Dating Profile</Text>
            <Text style={styles.subtitle}>Step {step} of 3</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i <= step && styles.progressBarActive,
                ]}
              />
            ))}
          </View>

          {/* Step 1: Photo */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Ionicons name="image-outline" size={60} color="#fff" style={{ marginBottom: 16 }} />
              <Text style={styles.stepTitle}>Add Your Best Photo</Text>
              <Text style={styles.stepDesc}>First impressions matter!</Text>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePhotoSelect}
                disabled={imageUploading}
              >
                {formData.profilePhoto ? (
                  <Image source={{ uri: formData.profilePhoto }} style={styles.photoPreview} />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color="#FF1493" />
                    <Text style={styles.photoButtonText}>
                      {imageUploading ? 'Uploading...' : 'Choose Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Ionicons name="person-outline" size={60} color="#fff" style={{ marginBottom: 16 }} />
              <Text style={styles.stepTitle}>Tell Us About You</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="18"
                  keyboardType="number-pad"
                  value={formData.age}
                  onChangeText={text => setFormData(prev => ({ ...prev, age: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderSelector}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        formData.gender === g && styles.genderButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, gender: g }))}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          formData.gender === g && styles.genderTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Looking For</Text>
                <View style={styles.genderSelector}>
                  {['Male', 'Female', 'Anyone'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        formData.lookingFor === g && styles.genderButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, lookingFor: g }))}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          formData.lookingFor === g && styles.genderTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Bio & Interests */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Ionicons name="heart-outline" size={60} color="#fff" style={{ marginBottom: 16 }} />
              <Text style={styles.stepTitle}>Your Story</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio (max 500 chars)</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Tell us about yourself..."
                  multiline
                  maxLength={500}
                  value={formData.bio}
                  onChangeText={text => setFormData(prev => ({ ...prev, bio: text }))}
                />
                <Text style={styles.charCount}>
                  {formData.bio.length}/500
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Interests (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Travel, Cooking, Music"
                  value={formData.interests}
                  onChangeText={text => setFormData(prev => ({ ...prev, interests: text }))}
                />
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep(step - 1)}
              >
                <Feather name="chevron-left" size={20} color="#fff" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (creating || imageUploading) && styles.disabledButton]}
              onPress={step === 3 ? handleCreateProfile : () => setStep(step + 1)}
              disabled={creating || imageUploading}
            >
              <Text style={styles.primaryButtonText}>
                {creating ? 'Creating...' : step === 3 ? 'Create Profile' : 'Next'}
              </Text>
              {step < 3 && !creating && (
                <Feather name="chevron-right" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF1493' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  progressContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  progressBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressBarActive: { backgroundColor: '#fff' },
  stepContainer: { alignItems: 'center', marginBottom: 32 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  photoButton: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  bioInput: { height: 120, textAlignVertical: 'top' },
  charCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4, textAlign: 'right' },
  genderSelector: { flexDirection: 'row', gap: 8, width: '100%' },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  genderButtonActive: { backgroundColor: '#fff', borderColor: '#fff' },
  genderText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  genderTextActive: { color: '#FF1493' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 32 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: { color: '#FF1493', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { opacity: 0.6 },
});
