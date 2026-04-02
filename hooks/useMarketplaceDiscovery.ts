import { useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosinstance';

/**
 * Hook for marketplace discovery with personalized recommendations
 */
export const useMarketplaceDiscovery = () => {
  // Fetch personalized products
  const { 
    data, 
    error, 
    refetch, 
    isLoading 
  } = useQuery({
    queryKey: ['marketplaceDiscovery'],
    queryFn: async () => {
      const response = await axiosInstance.get('/marketplace/api/discover', {
        params: { page: 1, limit: 20 },
        timeout: 15000 // 15 second timeout
      });
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      return axiosInstance.post('/marketplace/api/activity/log', activityData);
    },
    onError: (error) => {
      console.warn('Failed to log activity:', error);
    }
  });

  // Fetch trending products
  const { 
    data: trending 
  } = useQuery({
    queryKey: ['marketplaceTrending'],
    queryFn: async () => {
      const response = await axiosInstance.get('/marketplace/api/products/trending', {
        params: { limit: 10 },
        timeout: 10000 // 10 second timeout
      });
      return response.data.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  // Helper: Log product view
  const logProductView = (productId: string, category: string, duration: number = 0) => {
    logActivityMutation.mutate({
      activityType: 'product_view',
      productId,
      category,
      metadata: {
        duration: duration
      }
    });
  };

  // Helper: Log product search
  const logProductSearch = (searchQuery: string, results: number) => {
    logActivityMutation.mutate({
      activityType: 'product_search',
      searchQuery,
      category: null,
      metadata: {
        resultCount: results
      }
    });
  };

  // Helper: Log add to favorites
  const logAddToFavorite = (productId: string, category: string) => {
    logActivityMutation.mutate({
      activityType: 'add_favorite',
      productId,
      category
    });
  };

  // Helper: Log purchase
  const logPurchase = (productId: string, category: string, price: number) => {
    logActivityMutation.mutate({
      activityType: 'purchase',
      productId,
      category,
      price
    });
  };

  // Search products
  const { 
    data: searchResults, 
    refetch: searchProducts 
  } = useQuery({
    queryKey: ['marketplaceSearch'],
    queryFn: async () => {
      // This will be called with empty params when enabled is false
      return [];
    },
    enabled: false, // Only run when manually called
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 1
  });

  // Get similar products
  const { 
    data: similarProducts 
  } = useQuery({
    queryKey: ['marketplaceSimilar'],
    queryFn: async () => {
      // This will be called with empty params when enabled is false
      return [];
    },
    enabled: false, // Only run when manually called
    retry: 1
  });

  return {
    // Discovery
    products: data,
    loading: isLoading,
    error,
    refetch,
    
    // Trending
    trendingProducts: trending || [],
    
    // Search
    searchResults,
    searchProducts,
    
    // Similar products
    similarProducts,
    
    // Activity logging
    logProductView,
    logProductSearch,
    logAddToFavorite,
    logPurchase
  };
};
