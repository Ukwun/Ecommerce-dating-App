import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (uri: string, folder = '/products') => {
    try {
      setUploading(true);

      // Read file as base64 using expo-file-system (works in React Native, no FileReader needed)
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `${folder.replace(/\//g, '_')}_${Date.now()}.jpg`;

      const res = await axiosInstance.post('/marketplace/api/upload/image', {
        base64Data,
        fileName,
        folder,
      });

      if (res.data?.url) {
        return { url: res.data.url, fileId: res.data.fileId };
      }

      throw new Error('No URL returned from server');
    } catch (error: any) {
      const msg = error?.response?.data?.error || error.message || 'Upload failed';
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: msg });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading };
};
