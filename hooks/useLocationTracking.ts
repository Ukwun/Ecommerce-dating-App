import { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocationTracking = () => {
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationWatcherRef = useRef<any>(null);

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  // Get initial location once
  const getInitialLocation = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setError('Location permission denied');
        setLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });

      // Get address from coordinates
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        if (addresses.length > 0) {
          const addr = addresses[0];
          const fullAddress = `${addr.city || ''}, ${addr.region || ''}`.trim();
          setAddress(fullAddress);
        }
      } catch (e) {
        console.warn('Geocoding error:', e);
      }

      return { latitude, longitude };
    } catch (err: any) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Start continuous location tracking
  const startLocationTracking = async (onLocationUpdate?: (location: any) => void) => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      // Stop any existing watcher
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }

      // Watch location with 5-second update interval
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({ latitude, longitude });
          
          // Call callback if provided
          if (onLocationUpdate) {
            onLocationUpdate({ latitude, longitude });
          }

          // Update address
          Location.reverseGeocodeAsync({ latitude, longitude })
            .then((addresses) => {
              if (addresses.length > 0) {
                const addr = addresses[0];
                const fullAddress = `${addr.city || ''}, ${addr.region || ''}`.trim();
                setAddress(fullAddress);
              }
            })
            .catch((e) => console.warn('Geocoding error:', e));
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start location tracking');
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return {
    location,
    address,
    loading,
    error,
    getInitialLocation,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
  };
};

// Hook to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
