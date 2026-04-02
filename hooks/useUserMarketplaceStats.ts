import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosinstance';

/**
 * Hook to fetch user activity statistics for profile display
 */
export const useUserMarketplaceStats = () => {
  const { 
    data: stats, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['userMarketplaceStats'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/marketplace/api/user/stats');
        return response.data.data || {
          totalViews: 0,
          totalSearches: 0,
          totalFavorites: 0,
          totalPurchases: 0,
          avgSessionDuration: 0
        };
      } catch (error) {
        console.warn('Failed to fetch user marketplace stats:', error);
        return {
          totalViews: 0,
          totalSearches: 0,
          totalFavorites: 0,
          totalPurchases: 0,
          avgSessionDuration: 0
        };
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: stats || {
      totalViews: 0,
      totalSearches: 0,
      totalFavorites: 0,
      totalPurchases: 0,
      avgSessionDuration: 0
    },
    isLoading,
    error,
    refetch
  };
};
