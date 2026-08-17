import { useCallback, useState } from 'react';
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
        const response = await axiosInstance.get('/marketplace/api/wishlist');
        const products = (response.data?.data ?? [])
          .map((item: any) => item.product)
          .filter(Boolean);
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
      if (action === 'add') {
        return axiosInstance.post('/marketplace/api/wishlist', { productId });
      }
      return axiosInstance.delete(`/marketplace/api/wishlist/${productId}`);
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
    await toggleWishlistMutation.mutateAsync({
      productId,
      action: isInWishlist ? 'remove' : 'add',
    });
  };

  const removeFromWishlist = async (productId: string) => {
    if (!wishlistIds.includes(productId)) return;
    await toggleWishlistMutation.mutateAsync({ productId, action: 'remove' });
  };

  const refreshWishlist = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
  }, [queryClient]);

  return {
    wishlistIds,
    toggleWishlist,
    isLoadingWishlist,
    wishlistProducts,
    wishlistItems: wishlistProducts ?? [],
    loading: isLoadingWishlist,
    removeFromWishlist,
    refreshWishlist,
  };
};
