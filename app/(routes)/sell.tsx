import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';

type FormData = {
  name: string;
  description: string;
  price: string;
  oldPrice?: string;
  category: string;
  stock: string;
  sizes?: string;
  colors?: string;
};

const uploadImageToImageKit = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });

  const base64Data = base64.split(',')[1];
  const formData = new FormData();
  formData.append('file', base64Data);
  formData.append('fileName', `product_${Date.now()}.jpg`);
  formData.append('folder', '/products');

  const imageKitResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(process.env.EXPO_PUBLIC_IMAGEKIT_PRIVATE_KEY! + ':')}`,
    },
    body: formData,
  });

  const imageKitData = await imageKitResponse.json();
  if (!imageKitResponse.ok) {
    throw new Error(imageKitData.message || 'ImageKit upload failed');
  }
  return { url: imageKitData.url, fileId: imageKitData.fileId };
};

const createProduct = async (data: FormData & { images: { url: string; fileId: string }[] }) => {
  const response = await axiosInstance.post('/marketplace/api/products', {
    ...data,
    price: parseFloat(data.price),
    oldPrice: data.oldPrice ? parseFloat(data.oldPrice) : undefined,
    stock: parseInt(data.stock, 10),
    sizes: data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
    colors: data.colors ? data.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
  });
  return response.data;
};

const updateProduct = async (id: string, data: FormData & { images: { url: string; fileId: string }[] }) => {
  const response = await axiosInstance.put(`/marketplace/api/products/${id}`, {
    ...data,
    price: parseFloat(data.price),
    oldPrice: data.oldPrice ? parseFloat(data.oldPrice) : undefined,
    stock: parseInt(data.stock, 10),
    sizes: data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
    colors: data.colors ? data.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
  });
  return response.data;
};

export default function SellScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isEditing = !!id;
  const navigation = useNavigation();
  const [images, setImages] = useState<string[]>([]);
  const existingImagesRef = useRef<{ url: string; fileId: string }[]>([]);
  const { control, handleSubmit, reset, setValue, formState: { errors, isValid } } = useForm<FormData>({ mode: 'onChange' });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (images.length === 0) {
        throw new Error('Please upload at least one product image.');
      }
      // Upload all images to ImageKit
      const uploadedImages = await Promise.all(images.map(async (uri) => {
        const existing = existingImagesRef.current.find(img => img.url === uri);
        if (existing) return existing;
        return uploadImageToImageKit(uri);
      }));

      if (isEditing) {
        return updateProduct(id, { ...data, images: uploadedImages });
      }
      // Create product with uploaded image URLs
      return createProduct({ ...data, images: uploadedImages });
    },
    onSuccess: (data) => {
      Toast.show({ 
        type: 'success', 
        text1: isEditing ? 'Product Updated!' : 'Product Listed!', 
        text2: isEditing ? 'Your changes have been saved.' : 'Your product is now live.' 
      });
      if (isEditing) {
        router.back();
      } else {
        router.replace(`/(routes)/product/${data.product._id}` as any);
      }
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: error.message });
    },
  });

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({ headerTitle: 'Edit Product' });
      const fetchProduct = async () => {
        try {
          const response = await axiosInstance.get(`/marketplace/api/products/${id}`);
          const product = response.data.data;
          
          reset({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            oldPrice: product.oldPrice?.toString(),
            category: product.category,
            stock: product.stock.toString(),
            sizes: product.sizes?.join(', '),
            colors: product.colors?.join(', '),
          });

          if (product.images && product.images.length > 0) {
            existingImagesRef.current = product.images;
            setImages(product.images.map((img: any) => img.url));
          }
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load product details' });
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, navigation, reset]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(asset => asset.uri)]);
    }
  };

  const removeImage = (uri: string) => {
    setImages(prev => prev.filter(imageUri => imageUri !== uri));
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const renderInput = (name: keyof FormData, placeholder: string, keyboardType: 'default' | 'numeric' = 'default', isOptional = false) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: !isOptional && `${placeholder} is required.` }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            placeholder={`Enter product ${placeholder.toLowerCase()}`}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType={keyboardType}
          />
        )}
      />
      {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Product' : 'List a New Product'}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.section}>
            <Text style={styles.label}>Product Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroller}>
              {images.map(uri => (
                <View key={uri} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(uri)}>
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color="#9CA3AF" />
                <Text style={styles.addImageText}>Add Images</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {renderInput('name', 'Name')}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <Controller
              control={control}
              name="description"
              rules={{ required: 'Description is required.' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                  placeholder="Describe your product in detail"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                />
              )}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>{renderInput('price', 'Price', 'numeric')}</View>
            <View style={{ flex: 1 }}>{renderInput('oldPrice', 'Slashed Price (Optional)', 'numeric', true)}</View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>{renderInput('category', 'Category')}</View>
            <View style={{ flex: 1 }}>{renderInput('stock', 'Stock Quantity', 'numeric')}</View>
          </View>

          {renderInput('sizes', 'Sizes (e.g. S, M, L)', 'default', true)}
          {renderInput('colors', 'Colors (e.g. Red, Blue)', 'default', true)}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || mutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditing ? 'Update Product' : 'List Product'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scrollContainer: { padding: 16 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputGroup: { marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16 },
  imageScroller: { paddingVertical: 8 },
  imageContainer: { position: 'relative', marginRight: 12 },
  image: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#E5E7EB' },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#FF8C00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#FDBA74',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});