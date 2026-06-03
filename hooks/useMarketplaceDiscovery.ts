import { useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosinstance';

type EventPayload = {
  activityType: string;
  productId?: string | null;
  sellerId?: string | null;
  searchQuery?: string | null;
  category?: string | null;
  price?: number | null;
  metadata?: Record<string, any>;
};

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
    mutationFn: async (activityData: EventPayload) => {
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

  const logSessionStart = (surface: string = 'discover_tab') => {
    logActivityMutation.mutate({
      activityType: 'session_start',
      metadata: { surface }
    });
  };

  const logAppOpen = () => {
    logActivityMutation.mutate({
      activityType: 'app_open',
      metadata: { source: 'mobile_client' }
    });
  };

  const logRetentionHeartbeat = (surface: string = 'discover_tab') => {
    logActivityMutation.mutate({
      activityType: 'retention_heartbeat',
      metadata: { surface }
    });
  };

  // Search products
  const searchProductsMutation = useMutation({
    mutationFn: async (params: {
      query: string;
      category?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }) => {
      const response = await axiosInstance.get('/marketplace/api/products/search', {
        params: {
          q: params.query,
          category: params.category,
          sortBy: params.sortBy || 'relevance',
          page: params.page || 1,
          limit: params.limit || 20,
        },
        timeout: 15000,
      });
      return response.data.data || [];
    }
  });

  // Get similar products
  const similarProductsMutation = useMutation({
    mutationFn: async ({ productId, limit = 10 }: { productId: string; limit?: number }) => {
      const response = await axiosInstance.get(`/marketplace/api/products/${productId}/similar`, {
        params: { limit },
        timeout: 10000,
      });
      return response.data.data || [];
    }
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      return axiosInstance.post('/marketplace/api/wishlist', { productId });
    }
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      return axiosInstance.delete(`/marketplace/api/wishlist/${productId}`);
    }
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
    searchResults: searchProductsMutation.data || [],
    searchProducts: searchProductsMutation.mutateAsync,
    isSearching: searchProductsMutation.isPending,
    
    // Similar products
    similarProducts: similarProductsMutation.data || [],
    getSimilarProducts: similarProductsMutation.mutateAsync,

    // Wishlist
    addToWishlist: addToWishlistMutation.mutateAsync,
    removeFromWishlist: removeFromWishlistMutation.mutateAsync,
    
    // Activity logging
    logProductView,
    logProductSearch,
    logAddToFavorite,
    logPurchase,
    logSessionStart,
    logAppOpen,
    logRetentionHeartbeat,
  };
};
