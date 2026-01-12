import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/AuthContext';
import axiosInstance from '@/utils/axiosinstance';

const uploadImageToImageKit = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });

  const base64Data = base64.split(',')[1];
  const formData = new FormData();
  formData.append('file', base64Data);
  formData.append('fileName', `avatar_${Date.now()}.jpg`);
  formData.append('folder', '/avatars');

  const imageKitResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(process.env.EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY! + ':')}`,
    },
    body: formData,
  });

  const imageKitData = await imageKitResponse.json();
  if (!imageKitResponse.ok) {
    throw new Error(imageKitData.message || 'ImageKit upload failed');
  }
  return { url: imageKitData.url, fileId: imageKitData.fileId };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuth() as any;
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await logout();
              router.replace('/(routes)/login' as any);
            } catch (error) {
              Alert.alert("Error", "Failed to log out");
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploading(true);
        const { url } = await uploadImageToImageKit(result.assets[0].uri);
        
        // Update backend
        await axiosInstance.put('/auth/api/update-details', { avatar: url });
        
        // Update local state
        if (user && setUser) setUser({ ...user, avatar: { url } });
        
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleBoostProfile = async () => {
    try {
      await axiosInstance.post('/auth/api/boost-profile');
      Alert.alert('🚀 Boost Activated!', 'Your profile will be highlighted for 30 minutes.');
    } catch (error) {
      Alert.alert('Error', 'Failed to boost profile');
    }
  };

  const menuItems: { icon: string; label: string; description: string; route?: string; action?: () => void; color: string; iconLib: any }[] = [
    {
      icon: 'plus-square',
      label: 'Sell on Marketplace',
      description: 'List your products for sale',
      route: '/sell',
      color: '#10B981',
      iconLib: Feather
    },
    {
      icon: 'zap',
      label: 'Boost Profile',
      description: 'Get more visibility',
      action: handleBoostProfile,
      color: '#FFD700',
      iconLib: Feather
    },
    {
      icon: 'list',
      label: 'My Listings',
      description: 'Manage your products',
      route: '/(routes)/my-listings',
      color: '#8B5CF6',
      iconLib: Feather
    },
    {
      icon: 'dollar-sign',
      label: 'My Wallet',
      description: 'Earnings & Withdrawals',
      route: '/(routes)/wallet',
      color: '#10B981',
      iconLib: Feather
    },
    {
      icon: 'shopping-bag',
      label: 'My Orders',
      description: 'Track orders & history',
      route: '/(routes)/my-orders',
      color: '#4F46E5',
      iconLib: Feather
    },
    {
      icon: 'message-square',
      label: 'Messages',
      description: 'Chats & interactions',
      route: '/(tabs)/messages',
      color: '#EC4899',
      iconLib: Feather
    },
    {
      icon: 'heart',
      label: 'Wishlist',
      description: 'Your favorite items',
      route: '/(routes)/wishlist',
      color: '#EF4444',
      iconLib: Feather
    },
    {
      icon: 'map-pin',
      label: 'Shipping Address',
      description: 'Delivery preferences',
      route: '/(routes)/shipping',
      color: '#10B981',
      iconLib: Feather
    },
    {
      icon: 'lock',
      label: 'Change Password',
      description: 'Update your security',
      route: '/(routes)/change-password',
      color: '#F59E0B',
      iconLib: Feather
    },
    {
      icon: 'settings',
      label: 'Settings',
      description: 'App preferences',
      route: '/(routes)/settings',
      color: '#6B7280',
      iconLib: Feather
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Background */}
        <LinearGradient
          colors={['#FF8C00', '#FF5F6D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/(routes)/edit-profile' as any)}
              >
                <Feather name="edit-2" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.cardContainer}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: user?.avatar?.url || 'https://i.pravatar.cc/300' }} 
                style={styles.avatar}
              />
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={handleUpdateProfilePicture}
                disabled={uploading}
              >
                {uploading ? 
                  <ActivityIndicator size="small" color="#fff" /> : 
                  <Ionicons name="camera" size={22} color="white" />
                }
              </TouchableOpacity>
            </View>
            
            <Text style={styles.userName}>
              {user?.name || 'Guest User'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'Sign in to view profile'}
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2</Text>
                <Text style={styles.statLabel}>Coupons</Text>
              </View>
            </View>

            {/* Match Me Button */}
            <TouchableOpacity 
              style={styles.matchMeButton}
              onPress={() => router.push('/(routes)/match-search' as any)}
            >
              <LinearGradient
                colors={['#FF006E', '#FF4785']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.matchMeGradient}
              >
                <Text style={styles.matchMeText}>Match Me</Text>
                <Ionicons name="heart" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.action) {
                  item.action();
                } else if (item.route) {
                   router.push(item.route as any);
                } else {
                   Alert.alert(item.label, "Route not configured.");
                }
              }}
            >
              <View 
                style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}
              >
                <item.iconLib name={item.icon as any} size={30} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={26} color="#C7C7CC" />
            </TouchableOpacity>
          ))}

          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <View style={styles.logoutIconContainer}>
              <Feather name="log-out" size={30} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  headerGradient: {
    paddingBottom: 100,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: 'white',
  },
  headerButton: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  cardContainer: {
    alignItems: 'center',
    marginTop: -70,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingVertical: 40,
    paddingHorizontal: 30,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#E5E7EB',
    borderWidth: 5,
    borderColor: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: 'white',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 25,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  matchMeButton: {
    width: '100%',
    marginTop: 25,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  matchMeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  matchMeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginTop: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
});
