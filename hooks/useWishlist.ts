import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Fetch the initial wishlist
  const { data: wishlistProducts, isLoading: isLoadingWishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/user/api/wishlist');
        const products = response.data?.wishlist ?? [];
        // Update the local state with just the IDs
        setWishlistIds(products.map((p: any) => p._id));
        return products;
      } catch (error: any) {
        console.warn('Failed to fetch wishlist:', error?.message);
        // Return empty array if API fails, don't crash the app
        return [];
      }
    },
  });

  // Mutation for toggling an item in the wishlist
  const toggleWishlistMutation = useMutation({
    mutationFn: async ({ productId, action }: { productId: string; action: 'add' | 'remove' }) => {
      return axiosInstance.post('/user/api/toggle-wishlist', { productId, action });
    },
    onMutate: async ({ productId }) => {
      // Optimistic update
      setWishlistIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (error) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const toggleWishlist = async (productId: string) => {
    const isInWishlist = wishlistIds.includes(productId);
    toggleWishlistMutation.mutate({
      productId,
      action: isInWishlist ? 'remove' : 'add',
    });
  };

  return {
    wishlistIds,
    toggleWishlist,
    isLoadingWishlist,
    wishlistProducts,
  };
};
