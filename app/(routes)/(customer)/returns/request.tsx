import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';

export default function ReturnRequestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Calculate current step based on form progress
  const getCurrentStep = () => {
    if (!selectedOrder) return 1;
    if (!reason) return 2;
    if (!description.trim()) return 3;
    return 4;
  };

  // Fetch eligible orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['eligible-orders'],
    queryFn: async () => {
      const response = await axiosInstance.get('/marketplace/api/orders?status=delivered&limit=50');
      return response.data.data || [];
    },
  });

  // Create return request mutation
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      const item = selectedProduct;
      if (!item?.product?._id && !item?.product) throw new Error('This order has no returnable item');
      return axiosInstance.post('/marketplace/api/returns/requests', {
        orderId: (selectedOrder as any)?._id,
        products: [{ productId: item.product?._id || item.product, quantity: item.quantity }],
        reason,
        detailedReason: description,
      });
    },
    onSuccess: (response) => {
      Alert.alert(
        'Success',
        `Return request created. Return number: ${response.data.data?.returnNumber}`,
        [
          {
            text: 'View Status',
            onPress: () => router.push('/(routes)/(customer)/returns/status'),
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create return request');
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera roll permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                step <= currentStep && { backgroundColor: theme.colors.primary },
                step < currentStep && { backgroundColor: '#10B981' },
              ]}
            >
              <ThemedText style={styles.progressText}>
                {step < currentStep ? '✓' : step}
              </ThemedText>
            </View>
            {step < 4 && (
              <View
                style={[
                  styles.progressLine,
                  step < currentStep && { backgroundColor: '#10B981' },
                  step === currentStep && { backgroundColor: theme.colors.primary },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.stepIndicator}>
        <ThemedText style={styles.stepText}>
          Step {currentStep}/4 • {['Select Order', 'Choose Reason', 'Add Description', 'Upload Proof'][currentStep - 1]}
        </ThemedText>
      </View>

      {/* Step 1: Select Order */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={styles.stepTitle}>Step 1: Select Order</ThemedText>

        {orders?.length === 0 ? (
          <ThemedText style={styles.emptyText}>No eligible orders for return</ThemedText>
        ) : (
          orders?.map((order: any) => (
            <TouchableOpacity
              key={order._id}
              style={[
                styles.orderOption,
                (selectedOrder as any)?._id === order._id && { backgroundColor: '#DBEAFE' },
              ]}
              onPress={() => { setSelectedOrder(order); setSelectedProduct(null); }}
            >
              <View style={styles.orderDetails}>
                <ThemedText style={styles.orderId}>
                  {(selectedOrder as any)?._id === order._id ? '✓ ' : ''}Order #{order.orderNumber || order._id}
                </ThemedText>
                <ThemedText style={styles.productName}>{order.products?.length || 0} item(s)</ThemedText>
                <ThemedText style={styles.orderDate}>
                  Delivered: {new Date(order.deliveredAt || order.updatedAt).toLocaleDateString()}
                </ThemedText>
              </View>
              <ThemedText style={styles.price}>₦{Number(order.total || 0).toLocaleString()}</ThemedText>
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedOrder && (
        <>
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.stepTitle}>Choose the item to return</ThemedText>
            {(selectedOrder as any).products?.map((item: any) => {
              const productId = item.product?._id || item.product;
              return <TouchableOpacity key={String(productId)} style={[styles.reasonButton, (selectedProduct?.product?._id || selectedProduct?.product) === productId && { backgroundColor: '#DBEAFE' }]} onPress={() => setSelectedProduct(item)}><View style={styles.radioButton}>{(selectedProduct?.product?._id || selectedProduct?.product) === productId && <View style={styles.radioDot} />}</View><ThemedText style={styles.reasonText}>{item.product?.name || 'Purchased item'} · Qty {item.quantity}</ThemedText></TouchableOpacity>;
            })}
          </View>
          {/* Step 2: Reason */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.stepTitle}>Step 2: Reason for Return</ThemedText>

            {[
              'Defective',
              'Damaged in Shipping',
              'Not as Described',
              'Wrong Item Received',
              'Color/Size Mismatch',
              'Other',
            ].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reasonButton,
                  reason === r && { backgroundColor: '#DBEAFE' },
                ]}
                onPress={() => setReason(r)}
              >
                <View style={styles.radioButton}>
                  {reason === r && <View style={styles.radioDot} />}
                </View>
                <ThemedText style={styles.reasonText}>{r}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 3: Description */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.stepTitle}>Step 3: Detailed Description</ThemedText>

            <TextInput
              style={[
                styles.descriptionInput,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholder="Explain why you want to return this item..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
          </View>

          {/* Step 4: Upload Proof */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <ThemedText style={styles.stepTitle}>Step 4: Upload Proof (Images)</ThemedText>

            <TouchableOpacity
              style={[styles.uploadButton, { borderColor: theme.colors.primary }]}
              onPress={pickImage}
            >
              <ThemedText style={styles.uploadIcon}>📸</ThemedText>
              <ThemedText style={styles.uploadText}>Add Images</ThemedText>
            </TouchableOpacity>

            {/* Image Preview */}
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setImages(images.filter((_, i) => i !== index))}
                  >
                    <ThemedText style={styles.removeIcon}>✕</ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  reason && description.trim()
                    ? theme.colors.primary
                    : '#D1D5DB',
              },
            ]}
            onPress={() => {
              if (!reason) {
                Alert.alert('Missing Field', 'Please select a reason for return');
                return;
              }
              if (!selectedProduct) {
                Alert.alert('Missing Item', 'Please select the item you want to return');
                return;
              }
              if (!description.trim()) {
                Alert.alert('Missing Field', 'Please provide a detailed description');
                return;
              }
              createReturnMutation.mutate();
            }}
            disabled={createReturnMutation.isPending || (!selectedProduct || !reason || !description.trim())}
          >
            <ThemedText style={styles.submitButtonText}>
              {createReturnMutation.isPending ? '⏳ Processing...' : '✓ Submit Return Request'}
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginHorizontal: 20,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: -2,
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 15,
  },
  stepText: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '500',
  },
  section: {
    marginVertical: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 15,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
    paddingVertical: 20,
  },
  orderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orderDetails: {
    flex: 1,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  productName: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    opacity: 0.6,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  reasonText: {
    fontSize: 13,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginVertical: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  imageContainer: {
    position: 'relative',
    width: '30%',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    marginHorizontal: 10,
    marginVertical: 15,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
