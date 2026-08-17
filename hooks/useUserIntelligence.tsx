import { useRef, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';

/**
 * COMPREHENSIVE USER INTELLIGENCE LAYER
 * Tracks all user activities, behaviors, preferences, and engagement
 * to build a complete user profile for realistic recommendations
 */

interface UserActivity {
  type: 'view' | 'search' | 'favorite' | 'cart_add' | 'purchase' | 'swipe' | 'message' | 'review' | 'share' | 'click';
  itemId?: string;
  itemType?: 'product' | 'user' | 'category' | 'store';
  metadata?: Record<string, any>;
  timestamp: number;
}

interface UserPreference {
  categories: { [key: string]: number };
  priceRange: { min: number; max: number };
  brands: { [key: string]: number };
  colors: { [key: string]: number };
  sellers: { [key: string]: number };
  averageSessionDuration: number;
  lastActive: number;
}

interface UserBehavior {
  purchaseCount: number;
  viewCount: number;
  favoriteCount: number;
  cartCount: number;
  reviewCount: number;
  searchQueries: string[];
  timeOfDayPreference: { morning: number; afternoon: number; evening: number; night: number };
  deviceUsagePattern: number[];
}

export default function useUserIntelligence() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const [userBehavior, setUserBehavior] = useState<UserBehavior | null>(null);
  
  const activityQueue = useRef<UserActivity[]>([]);
  const batchTimerRef = useRef<any>(null);
  const sessionStartRef = useRef<number>(Date.now());

  /**
   * Track a user activity (view, search, favorite, purchase, etc.)
   */
  const trackActivity = useCallback(async (
    type: UserActivity['type'],
    itemId?: string,
    itemType?: UserActivity['itemType'],
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    const activity: UserActivity = {
      type,
      itemId,
      itemType,
      metadata,
      timestamp: Date.now()
    };

    activityQueue.current.push(activity);

    // Batch activities and send every 30 seconds or when queue reaches 10 items
    if (activityQueue.current.length >= 10) {
      await flushActivityBatch();
    } else if (!batchTimerRef.current) {
      batchTimerRef.current = setTimeout(flushActivityBatch, 30000);
    }

    console.log(`📊 [INTELLIGENCE] Tracked activity:`, type, itemId);
  }, [user]);

  /**
   * Flush accumulated activities to backend
   */
  const flushActivityBatch = useCallback(async () => {
    if (!user || activityQueue.current.length === 0) return;

    const activitiesToSend = activityQueue.current.splice(0, activityQueue.current.length);

    try {
      await axiosInstance.post('/analytics/api/track-activities', {
        userId: user.id,
        activities: activitiesToSend,
        sessionDuration: Date.now() - sessionStartRef.current
      });
      console.log(`📊 [INTELLIGENCE] Sent ${activitiesToSend.length} activities to server`);
    } catch (error) {
      console.log('⚠️ [INTELLIGENCE] Failed to send activities:', error instanceof Error ? error.message : error);
      // Re-queue failed activities
      activityQueue.current.unshift(...activitiesToSend);
    }

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  }, [user]);

  /**
   * Get personalized recommendations based on user behavior
   */
  const getPersonalizedRecommendations = useCallback(async (count = 10) => {
    if (!user) return [];

    try {
      const response = await axiosInstance.get('/analytics/api/recommendations', {
        params: { userId: user.id, count, type: 'personalized' }
      });
      return response.data.recommendations || [];
    } catch (error) {
      console.log('⚠️ [INTELLIGENCE] Failed to get recommendations:', error);
      return [];
    }
  }, [user]);

  /**
   * Get similar users based on preferences
   */
  const getSimilarUsers = useCallback(async () => {
    if (!user) return [];

    try {
      const response = await axiosInstance.get('/analytics/api/similar-users', {
        params: { userId: user.id }
      });
      return response.data.users || [];
    } catch (error) {
      console.log('⚠️ [INTELLIGENCE] Failed to get similar users:', error);
      return [];
    }
  }, [user]);

  /**
   * Update user preferences based on activity
   */
  const updateUserPreferences = useCallback(async (preferences: Partial<UserPreference>) => {
    if (!user) return;

    try {
      const response = await axiosInstance.put('/user/api/preferences', {
        userId: user.id,
        preferences
      });
      setUserPreferences(response.data.preferences);
    } catch (error) {
      console.log('⚠️ Failed to update preferences:', error);
    }
  }, [user]);

  /**
   * Get user's search history with intelligence insights
   */
  const getSearchHistory = useCallback(async () => {
    if (!user) return [];

    try {
      const response = await axiosInstance.get('/analytics/api/search-history', {
        params: { userId: user.id }
      });
      return response.data.searches || [];
    } catch (error) {
      console.log('⚠️ Failed to get search history:', error);
      return [];
    }
  }, [user]);

  /**
   * Get trending products for this user's location/preferences
   */
  const getTrendingForUser = useCallback(async () => {
    if (!user) return [];

    try {
      const response = await axiosInstance.get('/marketplace/api/trending', {
        params: { userId: user.id }
      });
      return response.data.products || [];
    } catch (error) {
      console.log('⚠️ Failed to get trending:', error);
      return [];
    }
  }, [user]);

  /**
   * Match users for dating based on preferences and behavior
   */
  const findMatchedUsers = useCallback(async (filters?: any) => {
    if (!user) return [];

    try {
      const response = await axiosInstance.get('/dating/api/matched-users', {
        params: { userId: user.id, ...filters }
      });
      return response.data.users || [];
    } catch (error) {
      console.log('⚠️ Failed to find matched users:', error);
      return [];
    }
  }, [user]);

  /**
   * Record user interaction with another user (for dating algorithm)
   */
  const recordUserInteraction = useCallback(async (
    targetUserId: string,
    interactionType: 'view' | 'like' | 'skip' | 'message'
  ) => {
    if (!user) return;

    try {
      await axiosInstance.post('/dating/api/interactions', {
        userId: user.id,
        targetUserId,
        type: interactionType,
        timestamp: Date.now()
      });
      console.log(`📊 [DATING] Recorded interaction with ${targetUserId}: ${interactionType}`);
    } catch (error) {
      console.log('⚠️ Failed to record interaction:', error);
    }
  }, [user]);

  /**
   * Get user insights (for analytics dashboard)
   */
  const getUserInsights = useCallback(async () => {
    if (!user) return null;

    try {
      const response = await axiosInstance.get('/analytics/api/user-insights', {
        params: { userId: user.id }
      });
      setUserProfile(response.data.profile);
      setUserBehavior(response.data.behavior);
      return response.data;
    } catch (error) {
      console.log('⚠️ Failed to get user insights:', error);
      return null;
    }
  }, [user]);

  /**
   * Load full user intelligence profile on mount
   */
  useEffect(() => {
    if (user) {
      getUserInsights();
    }
  }, [user]);

  /**
   * Cleanup on unmount - flush any remaining activities
   */
  useEffect(() => {
    return () => {
      flushActivityBatch();
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, []);

  return {
    // Activity tracking
    trackActivity,
    flushActivityBatch,

    // User data
    userProfile,
    userPreferences,
    userBehavior,

    // Recommendations
    getPersonalizedRecommendations,
    getSimilarUsers,
    getTrendingForUser,

    // Dating
    findMatchedUsers,
    recordUserInteraction,

    // Preferences
    updateUserPreferences,
    getSearchHistory,

    // Insights
    getUserInsights
  };
}
