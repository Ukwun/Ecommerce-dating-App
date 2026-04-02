import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axiosinstance';

export interface SellerRating {
  _id: string;
  seller: string;
  buyer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  order?: string;
  rating: number; // 1-5
  comment?: string;
  categories?: {
    productQuality: number;
    delivery: number;
    communication: number;
  };
  createdAt: string;
}

export interface SellerStats {
  sellerId: string;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    productQuality: number;
    delivery: number;
    communication: number;
  };
  categoryBreakdown?: {
    [category: string]: number;
  };
  totalOrders: number;
  totalSales: number;
  responseTime?: string;
  returnRate?: number;
}

export interface TopSeller {
  _id: string;
  name: string;
  avatar?: string;
  email: string;
  averageRating: number;
  totalRatings: number;
  totalOrders: number;
  categories?: string[];
}

interface SellerRatingsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  pages: number;
  data: SellerRating[];
}

interface SellerStatsResponse {
  success: boolean;
  data: SellerStats;
}

interface TopSellersResponse {
  success: boolean;
  data: TopSeller[];
}

interface RateSellerResponse {
  success: boolean;
  data: SellerRating;
}

/**
 * Hook for fetching seller ratings/reviews
 */
export const useSellerRatings = (sellerId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['seller-ratings', sellerId, page, limit],
    queryFn: async () => {
      const { data } = await axios.get<SellerRatingsResponse>(
        `/marketplace/api/sellers/${sellerId}/ratings?page=${page}&limit=${limit}`
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!sellerId,
  });
};

/**
 * Hook for fetching seller statistics (ratings, review count, etc.)
 */
export const useSellerStats = (sellerId: string) => {
  return useQuery({
    queryKey: ['seller-stats', sellerId],
    queryFn: async () => {
      const { data } = await axios.get<SellerStatsResponse>(
        `/marketplace/api/sellers/${sellerId}/stats`
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!sellerId,
  });
};

/**
 * Hook for fetching top-rated sellers
 */
export const useTopSellers = (limit = 10) => {
  return useQuery({
    queryKey: ['top-sellers', limit],
    queryFn: async () => {
      const { data } = await axios.get<TopSellersResponse>(
        `/marketplace/api/sellers/top-rated?limit=${limit}`
      );
      return data.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook for submitting a seller rating
 */
export const useRateSeller = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ratingData: {
      sellerId: string;
      orderId?: string;
      rating: number;
      comment?: string;
      categories?: {
        productQuality: number;
        delivery: number;
        communication: number;
      };
    }) => {
      const { data } = await axios.post<RateSellerResponse>(
        '/marketplace/api/sellers/rate',
        ratingData
      );
      return data.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['seller-ratings', data.seller] });
      queryClient.invalidateQueries({ queryKey: ['seller-stats', data.seller] });
      queryClient.invalidateQueries({ queryKey: ['top-sellers'] });
    },
    onError: (error: any) => {
      console.error('Error rating seller:', error);
    },
  });
};

/**
 * Helper function to format seller rating for display
 */
export const formatSellerRating = (rating: SellerStats) => {
  return {
    stars: Math.round(rating.averageRating * 10) / 10,
    count: rating.totalRatings,
    label: rating.averageRating >= 4.5 ? '🌟 Excellent' :
           rating.averageRating >= 4.0 ? '⭐ Great' :
           rating.averageRating >= 3.5 ? '⭐ Good' :
           rating.averageRating >= 3.0 ? '⭐ Fair' : '⚠️ Poor'
  };
};

/**
 * Helper function to get star color based on rating
 */
export const getStarColor = (rating: number) => {
  if (rating >= 4.5) return '#FFD700'; // Gold
  if (rating >= 4.0) return '#4CAF50'; // Green
  if (rating >= 3.5) return '#8BC34A'; // Light Green
  if (rating >= 3.0) return '#FFC107'; // Amber
  return '#F44336'; // Red
};
