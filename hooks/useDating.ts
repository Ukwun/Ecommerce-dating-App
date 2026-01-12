import { useEffect, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:8082'; // Android emulator localhost

/**
 * Hook for managing dating profile state
 */
export const useDatingProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/dating/api/profile`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfile(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.put(
        `${API_BASE}/dating/api/profile`,
        updates,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfile(response.data.profile);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      throw err;
    }
  };

  const uploadPhoto = async (photoUrl: string, cloudinaryId: string, isProfilePhoto = false) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE}/dating/api/profile/photo/upload`,
        { photoUrl, cloudinaryId, isProfilePhoto },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfile(response.data.profile);
      return response.data.photo;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo');
      throw err;
    }
  };

  const deletePhoto = async (photoIndex: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.delete(
        `${API_BASE}/dating/api/profile/photo/${photoIndex}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfile(response.data.profile);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete photo');
      throw err;
    }
  };

  const updateLocation = async (latitude: number, longitude: number, address: string | null = null) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE}/dating/api/profile/location`,
        { latitude, longitude, address },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfile(response.data.profile);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update location');
      throw err;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE}/dating/api/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (err: any) {
      return null;
    }
  };

  const enableTwoFactor = async (photoUrl: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        `${API_BASE}/dating/api/verification/enable`,
        { photoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data.profile);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable 2FA');
      throw err;
    }
  };

  const disableTwoFactor = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        `${API_BASE}/dating/api/verification/disable`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data.profile);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
      throw err;
    }
  };

  const verifyIdentity = async (livePhotoUrl: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        `${API_BASE}/dating/api/verification/verify-login`,
        { livePhotoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
      throw err;
    }
  };

  const forgotTwoFactor = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        `${API_BASE}/dating/api/verification/forgot`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request reset');
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    updateLocation,
    fetchUserProfile,
    enableTwoFactor,
    disableTwoFactor,
    verifyIdentity,
    forgotTwoFactor
  };
};

/**
 * Hook for managing discovery and swiping
 */
export const useDiscovery = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    ageMin: 18,
    ageMax: 80,
    maxDistance: 50
  });

  const fetchProfiles = async (customFilters = null) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const filterParams = customFilters || filters;
      const params: any = {
        ...filterParams,
        page: filterParams.page || 1,
        limit: filterParams.limit || 10,
        ageMin: filterParams.ageMin || 18,
        ageMax: filterParams.ageMax || 80,
        maxDistance: filterParams.maxDistance || 50
      };

      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();

      const response = await axios.get(
        `${API_BASE}/dating/api/discover?${queryString}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfiles(response.data.profiles || []);
      setCurrentIndex(0);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch profiles');
      console.error('Discovery error:', err);
    } finally {
      setLoading(false);
    }
  };

  const swipe = async (targetId: string, action: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE}/dating/api/swipe/${targetId}`,
        { action },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Move to next profile
      setCurrentIndex(prev => prev + 1);
      
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to swipe');
      throw err;
    }
  };

  const getCurrentProfile = () => {
    return profiles[currentIndex] || null;
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    loading,
    error,
    currentIndex,
    filters,
    setFilters,
    fetchProfiles,
    swipe,
    getCurrentProfile
  };
};

/**
 * Hook for managing matches
 */
export const useMatches = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/dating/api/matches`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMatches(response.data.matches || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const unmatch = async (matchId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      await axios.post(
        `${API_BASE}/dating/api/matches/${matchId}/unmatch`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMatches(prev => prev.filter(m => m._id !== matchId));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unmatch');
      throw err;
    }
  };

  const blockUser = async (matchId: string, reason = '') => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      await axios.post(
        `${API_BASE}/dating/api/matches/${matchId}/block`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMatches(prev => prev.filter(m => m._id !== matchId));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to block user');
      throw err;
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return {
    matches,
    loading,
    error,
    fetchMatches,
    unmatch,
    blockUser
  };
};

/**
 * Hook for managing conversations/chat
 */
export const useConversations = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/dating/api/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setConversations(response.data.conversations || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, imageUrl: string | null = null) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.post(
        `${API_BASE}/dating/api/chat/send/${conversationId}`,
        { content, imageUrl },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      return response.data.messageData;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      throw err;
    }
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      await axios.post(
        `${API_BASE}/dating/api/conversations/${conversationId}/archive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setConversations(prev => prev.filter(c => c._id !== conversationId));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive');
      throw err;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    sendMessage,
    archiveConversation
  };
};
