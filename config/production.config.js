/**
 * Production Configuration for Facebook Marketplace App
 * 
 * This file ensures production-ready settings are applied:
 * - Web is completely disabled
 * - Static rendering is optimized
 * - Android-only build configuration
 * - Shipping and delivery features configured
 */

module.exports = {
  // Platform Configuration
  platforms: {
    enabled: ['android', 'ios'],
    web: false,
  },

  // Build Configuration
  build: {
    android: {
      versionCode: 1,
      minSdkVersion: 21,
      targetSdkVersion: 34,
      compileSdkVersion: 34,
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.INTERNET',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    ios: {
      buildNumber: 1,
      minimumOsVersion: '12.0',
    },
  },

  // API Configuration
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.marketplace.com',
    timeout: 10000,
    retryAttempts: 3,
  },

  // Feature Flags
  features: {
    shippingAddresses: true,
    deliveryPricing: true,
    mapPinSelection: true,
    dating: true,
    messaging: true,
  },

  // Delivery Pricing Constants
  shipping: {
    warehouseLocation: {
      latitude: 6.5244,
      longitude: 3.3792,
    },
    baseDeliveryPrice: 1000, // ₦1000
    pricePerKm: 50, // ₦50 per km
  },

  // Static Rendering
  staticRendering: {
    disabled: true,
    disabledRoutes: [
      'app/(routes)/shipping/edit',
      'app/(routes)/map',
    ],
  },

  // Analytics
  analytics: {
    enabled: true,
    trackingId: process.env.REACT_APP_ANALYTICS_ID,
  },

  // Error Tracking
  errorTracking: {
    enabled: true,
    dsn: process.env.SENTRY_DSN,
  },
};
