import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';

type AddressFormData = {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const addAddress = async (data: AddressFormData) => {
  // Simulate API call
  console.log('Adding address:', data);
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
};

export default function AddAddressScreen() {
  const { control, handleSubmit, formState: { errors, isValid }, setValue } = useForm<AddressFormData>({
    mode: 'onChange',
    defaultValues: { country: 'Nigeria', isDefault: false },
  });
  const queryClient = useQueryClient();
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const mutation = useMutation({
    mutationFn: addAddress,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Address Added!' });
      queryClient.invalidateQueries({ queryKey: ['shippingAddresses'] });
      router.back();
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Failed to add address', text2: error.message });
    },
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission to access location was denied' });
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const initialRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(initialRegion);
    })();
  }, []);

  const handleRegionChangeComplete = async (region: Region) => {
    setMapRegion(region);
    setIsGeocoding(true);
    try {
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
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = (data: AddressFormData) => {
    mutation.mutate(data);
  };

  const renderInput = (name: Exclude<keyof AddressFormData, 'isDefault'>, placeholder: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <Controller
        control={control}
        /* name is narrowed to exclude 'isDefault' (boolean) so value is a string */
        name={name as any}
        rules={{ required: `${placeholder} is required.` }}
        render={({ field: { onChange, onBlur, value } }) => {
          const stringValue: string = typeof value === 'boolean' ? String(value) : (value ?? '');
          return (
            <TextInput
              style={[styles.input, errors[name] && styles.inputError]}
              placeholder={`Enter ${placeholder.toLowerCase()}`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(text)}
              // explicit string ensures TextInput typings match
              value={stringValue}
            />
          );
        }}
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
        <Text style={styles.headerTitle}>Add New Address</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.mapContainer}>
          {mapRegion ? (
            <>
              <MapView
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
              />
              <View style={styles.markerFixed}>
                  <Ionicons name="location" size={40} color="#FF8C00" />
              </View>
              {isGeocoding && <ActivityIndicator style={styles.mapLoading} size="small" color="#000" />}
            </>
          ) : (
            <ActivityIndicator size="large" color="#FF8C00" />
          )}
        </View>
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
          style={[styles.submitButton, (!isValid || mutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || mutation.isPending}
        >
          <Text style={styles.submitButtonText}>{mutation.isPending ? 'Saving...' : 'Save Address'}</Text>
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
  mapLoading: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 4 },
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
});