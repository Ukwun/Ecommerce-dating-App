import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../utils/axiosinstance';

// ─── Dating Profile ───────────────────────────────────────────────────────────
export const useDatingProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    // Safety timeout — never stay loading more than 6 seconds
    const timer = setTimeout(() => setLoading(false), 6000);
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) { clearTimeout(timer); setLoading(false); return; }
      const res = await axiosInstance.get('/dating/api/profile');
      setProfile(res.data?.profile || res.data || null);
      setError(null);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setProfile(null);
      } else {
        setError(err?.response?.data?.message || 'Failed to fetch profile');
        setProfile(null);
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const createProfile = async (data: any) => {
    const res = await axiosInstance.post('/dating/api/profile', data);
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const updateProfile = async (updates: any) => {
    const res = await axiosInstance.put('/dating/api/profile', updates);
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const uploadPhoto = async (photoUrl: string, cloudinaryId: string, isProfilePhoto = false) => {
    const res = await axiosInstance.post('/dating/api/profile/photo/upload', { photoUrl, cloudinaryId, isProfilePhoto });
    setProfile(res.data?.profile || res.data);
    return res.data?.photo;
  };

  const deletePhoto = async (photoIndex: number) => {
    const res = await axiosInstance.delete(`/dating/api/profile/photo/${photoIndex}`);
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const updateLocation = async (latitude: number, longitude: number, address: string | null = null) => {
    const res = await axiosInstance.post('/dating/api/profile/location', { latitude, longitude, address });
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await axiosInstance.get(`/dating/api/profile/${userId}`);
      return res.data;
    } catch { return null; }
  };

  const enableTwoFactor = async (photoUrl: string) => {
    const res = await axiosInstance.post('/dating/api/verification/enable', { photoUrl });
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const disableTwoFactor = async () => {
    const res = await axiosInstance.post('/dating/api/verification/disable', {});
    setProfile(res.data?.profile || res.data);
    return res.data;
  };

  const verifyIdentity = async (livePhotoUrl: string) => {
    const res = await axiosInstance.post('/dating/api/verification/verify-login', { livePhotoUrl });
    return res.data;
  };

  const forgotTwoFactor = async () => {
    const res = await axiosInstance.post('/dating/api/verification/forgot', {});
    return res.data;
  };

  useEffect(() => { fetchProfile(); }, []);

  return {
    profile, loading, error, fetchProfile, createProfile, updateProfile,
    uploadPhoto, deletePhoto, updateLocation, fetchUserProfile,
    enableTwoFactor, disableTwoFactor, verifyIdentity, forgotTwoFactor,
  };
};

// ─── Discovery ────────────────────────────────────────────────────────────────
export const useDiscovery = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({ page: 1, limit: 10, ageMin: 18, ageMax: 80, maxDistance: 50 });

  const fetchProfiles = async (customFilters: any = null) => {
    try {
      setLoading(true);
      const f = customFilters || filters;
      const params = new URLSearchParams(Object.entries(f).map(([k, v]) => [k, String(v)])).toString();
      const res = await axiosInstance.get(`/dating/api/discover?${params}`);
      setProfiles(res.data?.profiles || []);
      setCurrentIndex(0);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  const swipe = async (targetId: string, action: string) => {
    const res = await axiosInstance.post(`/dating/api/swipe/${targetId}`, { action });
    setCurrentIndex(prev => prev + 1);
    return res.data;
  };

  const getCurrentProfile = () => profiles[currentIndex] || null;

  useEffect(() => { fetchProfiles(); }, []);

  return { profiles, loading, error, currentIndex, filters, setFilters, fetchProfiles, swipe, getCurrentProfile };
};

// ─── Matches ──────────────────────────────────────────────────────────────────
export const useMatches = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    const timer = setTimeout(() => setLoading(false), 8000);
    try {
      setLoading(true);
      const res = await axiosInstance.get('/dating/api/matches');
      setMatches(res.data?.matches || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch matches');
      setMatches([]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const unmatch = async (matchId: string) => {
    await axiosInstance.post(`/dating/api/matches/${matchId}/unmatch`, {});
    setMatches(prev => prev.filter(m => m._id !== matchId));
    return true;
  };

  const blockUser = async (matchId: string, reason = '') => {
    await axiosInstance.post(`/dating/api/matches/${matchId}/block`, { reason });
    setMatches(prev => prev.filter(m => m._id !== matchId));
    return true;
  };

  useEffect(() => { fetchMatches(); }, []);

  return { matches, loading, error, fetchMatches, unmatch, blockUser };
};

// ─── Conversations ────────────────────────────────────────────────────────────
export const useConversations = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/dating/api/conversations');
      setConversations(res.data?.conversations || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, imageUrl: string | null = null) => {
    const res = await axiosInstance.post(`/dating/api/chat/send/${conversationId}`, { content, imageUrl });
    return res.data?.messageData;
  };

  const archiveConversation = async (conversationId: string) => {
    await axiosInstance.post(`/dating/api/conversations/${conversationId}/archive`, {});
    setConversations(prev => prev.filter(c => c._id !== conversationId));
    return true;
  };

  useEffect(() => { fetchConversations(); }, []);

  return { conversations, loading, error, fetchConversations, sendMessage, archiveConversation };
};
