import React, { useState, useEffect, Suspense, lazy } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import axios from 'axios';

// Disable static rendering for this route to allow dynamic map loading
export const experimental_disableStaticRendering = true;

// Lazy-load MapView component only on native platforms
const MapViewComponent = Platform.OS !== 'web' 
  ? lazy(() => 
      import('react-native-maps').then(module => ({
        default: module.default
      }))
    )
  : null;

type MapComponentProps = {
  style: any;
  region: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
};

const MapViewWrapper = (props: MapComponentProps) => {
  if (Platform.OS === 'web' || !MapViewComponent) {
    return null;
  }
  
  return (
    <Suspense fallback={<ActivityIndicator size="large" color="#FF8C00" />}>
      <MapViewComponent {...props} />
    </Suspense>
  );
};

type AddressFormData = {
  _id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
};

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type DeliveryPriceData = {
  distanceFromWarehouse: number;
  estimatedDeliveryPrice: number;
};

// Backend API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8082';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Add auth token to requests
api.interceptors.request.use(config => {
  // Token should be stored in AsyncStorage or context
  // For now, we'll retrieve it from a safe location
  return config;
});

const updateAddress = async (data: AddressFormData) => {
  try {
    // Get token from storage (you should implement this with your auth system)
    const token = await getAuthToken();
    
    const response = await api.post('/shipping/api/shipping-address', data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to save address');
  }
};

const calculateDeliveryPrice = async (latitude: number, longitude: number): Promise<DeliveryPriceData> => {
  try {
    const token = await getAuthToken();
    
    const response = await api.post('/shipping/api/calculate-delivery-price', 
      { latitude, longitude },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('Error calculating delivery price:', error);
    return { distanceFromWarehouse: 0, estimatedDeliveryPrice: 1000 };
  }
};

// Placeholder - implement with your auth system
const getAuthToken = async () => {
  // TODO: Retrieve from AsyncStorage or your auth context
  return 'your-auth-token';
};

export default function EditAddressScreen() {
  // Read URL params as strings, then parse into the typed AddressFormData
  const params = useLocalSearchParams();

  // Handle case where params might be empty on initial render
  if (!params || Object.keys(params).length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#FF8C00" />;
  }

  const parsedParams: AddressFormData = {
    _id: Array.isArray(params._id) ? params._id[0] : params._id ?? '',
    name: Array.isArray(params.name) ? params.name[0] : params.name ?? '',
    addressLine1: Array.isArray(params.addressLine1) ? params.addressLine1[0] : params.addressLine1 ?? '',
    city: Array.isArray(params.city) ? params.city[0] : params.city ?? '',
    state: Array.isArray(params.state) ? params.state[0] : params.state ?? '',
    postalCode: Array.isArray(params.postalCode) ? params.postalCode[0] : params.postalCode ?? '',
    country: Array.isArray(params.country) ? params.country[0] : params.country ?? 'Nigeria',
    isDefault: Array.isArray(params.isDefault) ? params.isDefault[0] === 'true' : params.isDefault === 'true',
    latitude: params.latitude ? parseFloat(Array.isArray(params.latitude) ? params.latitude[0] : params.latitude) : undefined,
    longitude: params.longitude ? parseFloat(Array.isArray(params.longitude) ? params.longitude[0] : params.longitude) : undefined,
  };

  const { control, handleSubmit, formState: { errors, isValid }, setValue, watch } = useForm<AddressFormData>({
    mode: 'onChange',
    defaultValues: parsedParams,
  });

  const queryClient = useQueryClient();
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<{ latitude: number; longitude: number } | null>(
    parsedParams.latitude && parsedParams.longitude 
      ? { latitude: parsedParams.latitude, longitude: parsedParams.longitude }
      : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryPriceData | null>(null);
  const [showPinGuide, setShowPinGuide] = useState(!pinnedLocation);

  const mutation = useMutation({
    mutationFn: updateAddress,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Address Updated!', text2: `Delivery: ₦${deliveryInfo?.estimatedDeliveryPrice}` });
      queryClient.invalidateQueries({ queryKey: ['shippingAddresses'] });
      router.back();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Failed to update address', text2: error.message });
    },
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission to access location was denied' });
        return;
      }

      // Use pinned location if available, otherwise geocode the address
      if (pinnedLocation) {
        setMapRegion({
          latitude: pinnedLocation.latitude,
          longitude: pinnedLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      } else {
        const fullAddress = `${parsedParams.addressLine1}, ${parsedParams.city}, ${parsedParams.state}`;
        try {
          const geocodedLocations = await Location.geocodeAsync(fullAddress);
          if (geocodedLocations.length > 0) {
            const { latitude, longitude } = geocodedLocations[0];
            setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            setPinnedLocation({ latitude, longitude });
            
            // Calculate delivery price for this location
            const priceData = await calculateDeliveryPrice(latitude, longitude);
            setDeliveryInfo(priceData);
          } else {
            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            setPinnedLocation({ latitude, longitude });
            
            const priceData = await calculateDeliveryPrice(latitude, longitude);
            setDeliveryInfo(priceData);
          }
        } catch (e) {
          console.error("Geocoding failed, falling back to current location", e);
          let location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          setPinnedLocation({ latitude, longitude });
          
          const priceData = await calculateDeliveryPrice(latitude, longitude);
          setDeliveryInfo(priceData);
        }
      }
    })();
  }, []);

  const handleRegionChangeComplete = async (region: MapRegion) => {
    setMapRegion(region);
    setIsGeocoding(true);
    setShowPinGuide(false);
    
    try {
      // Update pin location
      setPinnedLocation({ latitude: region.latitude, longitude: region.longitude });
      setValue('latitude', region.latitude);
      setValue('longitude', region.longitude);

      // Reverse geocode to get address
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });

      if (geocoded.length > 0) {
        const addr = geocoded[0];
        setValue('addressLine1', `${addr.streetNumber || ''} ${addr.street || ''}`.trim(), { shouldValidate: true });
        setValue('city', addr.city || '', { shouldValidate: true });
        setValue('state', addr.region || '', { shouldValidate: true });
        setValue('postalCode', addr.postalCode || '', { shouldValidate: true });
        setValue('country', addr.country || 'Nigeria', { shouldValidate: true });
      }

      // Calculate delivery price
      const priceData = await calculateDeliveryPrice(region.latitude, region.longitude);
      setDeliveryInfo(priceData);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = (data: AddressFormData) => {
    if (!pinnedLocation) {
      Alert.alert('Location Required', 'Please select a location on the map by dragging it');
      return;
    }

    const submitData = {
      ...data,
      latitude: pinnedLocation.latitude,
      longitude: pinnedLocation.longitude
    };

    mutation.mutate(submitData);
  };

  const renderInput = (name: keyof AddressFormData, placeholder: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: `${placeholder} is required.` }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            placeholder={`Enter ${placeholder.toLowerCase()}`}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value as string}
            editable={name !== 'addressLine1' || !pinnedLocation}
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
        <Text style={styles.headerTitle}>Edit Address</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Text style={styles.webText}>Map viewing not available on web</Text>
              <Text style={styles.webSubText}>Use the address fields below to enter your location</Text>
            </View>
          ) : mapRegion ? (
            <>
              <MapViewWrapper
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
              />
              <View style={styles.markerFixed}>
                <Ionicons name="location" size={40} color="#FF8C00" />
              </View>
              {showPinGuide && (
                <View style={styles.pinGuide}>
                  <Text style={styles.pinGuideText}>Drag to select location</Text>
                </View>
              )}
              {isGeocoding && <ActivityIndicator style={styles.mapLoading} size="small" color="#000" />}
            </>
          ) : (
            <ActivityIndicator size="large" color="#FF8C00" />
          )}
        </View>

        {/* Delivery Information */}
        {deliveryInfo && (
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Distance from warehouse:</Text>
              <Text style={styles.deliveryValue}>{deliveryInfo.distanceFromWarehouse.toFixed(1)} km</Text>
            </View>
            <View style={[styles.deliveryRow, styles.priceRow]}>
              <Text style={styles.deliveryLabel}>Estimated delivery:</Text>
              <Text style={styles.priceValue}>₦{deliveryInfo.estimatedDeliveryPrice.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {renderInput('name', 'Full Name')}
        {renderInput('addressLine1', 'Address Line 1')}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>{renderInput('city', 'City')}</View>
          <View style={{ flex: 1 }}>{renderInput('state', 'State')}</View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>{renderInput('postalCode', 'Postal Code')}</View>
          <View style={{ flex: 1 }}>{renderInput('country', 'Country')}</View>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Set as default address</Text>
          <Controller
            control={control}
            name="isDefault"
            render={({ field: { onChange, value } }) => (
              <Switch
                trackColor={{ false: '#767577', true: '#FFC107' }}
                thumbColor={value ? '#FF8C00' : '#f4f3f4'}
                onValueChange={onChange}
                value={value}
              />
            )}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || mutation.isPending || !pinnedLocation) && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || mutation.isPending || !pinnedLocation}
        >
          <Text style={styles.submitButtonText}>{mutation.isPending ? 'Saving...' : 'Save Changes'}</Text>
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
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  map: { width: '100%', height: '100%' },
  markerFixed: { position: 'absolute', left: '50%', top: '50%', marginLeft: -20, marginTop: -40 },
  pinGuide: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  pinGuideText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mapLoading: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 4 },
  deliveryCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00'
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  priceRow: {
    marginBottom: 0,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2'
  },
  deliveryLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  deliveryValue: { fontSize: 14, color: '#666', fontWeight: '600' },
  priceValue: { fontSize: 18, color: '#FF8C00', fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#FF8C00', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#FDBA74' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  webText: { fontSize: 16, fontWeight: '600', color: '#666', textAlign: 'center' },
  webSubText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
});