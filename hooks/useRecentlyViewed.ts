import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';

const RECENTLY_VIEWED_KEY = 'recently_viewed_products';
const MAX_RECENTLY_VIEWED = 10;

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  images?: { url: string }[];
  title?: string;
  regular_price?: number;
  rating?: number;
};

const fetchProductsByIds = async (ids: string[]): Promise<Product[]> => {
  if (ids.length === 0) return [];
  // TODO: replace with a dedicated batch endpoint when available.
  const response = await axiosInstance.get('/marketplace/api/products', { params: { limit: 200 } });
  const allProducts = response.data?.data ?? [];
  const productMap = new Map(allProducts.map((p: Product) => [p._id, p]));
  return ids.map(id => productMap.get(id)).filter(Boolean) as Product[];
};

export const useRecentlyViewed = () => {
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadViewedIds = async () => {
      try {
        const storedIds = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
        if (storedIds) setViewedIds(JSON.parse(storedIds));
      } catch (e) {
        console.error('Failed to load recently viewed products.', e);
      }
    };
    loadViewedIds();
  }, []);

  const { data: recentlyViewedProducts, isLoading: isLoadingRecentlyViewed } = useQuery({
    queryKey: ['recentlyViewed', viewedIds],
    queryFn: () => fetchProductsByIds(viewedIds),
    enabled: viewedIds.length > 0,
  });

  const addProductToRecentlyViewed = useCallback(async (productId: string) => {
    try {
      const newIds = [productId, ...viewedIds.filter(id => id !== productId)].slice(0, MAX_RECENTLY_VIEWED);
      setViewedIds(newIds);
      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(newIds));
    } catch (e) {
      console.error('Failed to save recently viewed product.', e);
    }
  }, [viewedIds]);

  const clearRecentlyViewed = useCallback(async () => {
    try {
      setViewedIds([]);
      await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
    } catch (e) {
      console.error('Failed to clear recently viewed products.', e);
    }
  }, []);

  return { recentlyViewedProducts, isLoadingRecentlyViewed, addProductToRecentlyViewed, clearRecentlyViewed };
};