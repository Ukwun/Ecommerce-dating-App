import { useState, useEffect } from 'react';
import { Platform, ToastAndroid, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Fetch the initial wishlist
  const { data: wishlistProducts, isLoading: isLoadingWishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await axiosInstance.get('/user/api/wishlist');
      const products = response.data?.wishlist ?? [];
      // Update the local state with just the IDs
      setWishlistIds(products.map((p: any) => p._id));
      return products;
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
      const message = 'Updated wishlist';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', message);
      }
    },
    onError: (error) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      const message = error instanceof Error ? error.message : 'Failed to update wishlist';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', message);
      }
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
