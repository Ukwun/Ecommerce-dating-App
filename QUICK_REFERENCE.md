# 🚀 Quick Reference - Facebook Marketplace App

## Essential Commands

### Development
```bash
# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Clear cache
npx expo prebuild --clean
```

### Production Build
```bash
# Prebuild for Android
npx expo prebuild --platform android --clean

# Build AAB for Play Store
cd android && ./gradlew bundleRelease

# Build APK for testing
cd android && ./gradlew assembleRelease
```

### Backend
```bash
# Start dev server
cd backend && npm run dev

# Start production
cd backend && npm start
```

---

## API Endpoints Quick Reference

### Shipping Address API
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/shipping/api/shipping-address` | Create/Update address |
| GET | `/shipping/api/shipping-addresses` | List all addresses |
| GET | `/shipping/api/shipping-addresses/default` | Get default |
| GET | `/shipping/api/shipping-addresses/:id` | Get single |
| DELETE | `/shipping/api/shipping-addresses/:id` | Delete address |
| POST | `/shipping/api/calculate-delivery-price` | Calc price |

**Base URL**: `http://192.168.1.100:8082` (dev) or `https://api.your-domain.com` (prod)

---

## Key Configuration Values

### Delivery Pricing
- **Base**: ₦1,000
- **Per KM**: ₦50
- **Warehouse**: Lagos (6.5244°N, 3.3792°E)

### Android SDK
- **Min**: API 21 (Android 5.0)
- **Target**: API 34 (Android 14)
- **Compile**: API 34

### Permissions Required
- Location (fine & coarse)
- Internet
- Storage (read & write)

---

## File Locations

### Frontend Changes
- **Address Edit**: `app/(routes)/shipping/edit.tsx`
- **Web Blocker**: `app/web-not-available.tsx`

### Backend Changes
- **Shipping Routes**: `backend/routes/shipping.js`
- **Address Model**: `backend/models/ShippingAddress.js`
- **Server Config**: `backend/server.js`

### Configuration
- **App Config**: `app.json`
- **Prod Config**: `config/production.config.js`

---

## Environment Variables

```env
# Development (.env)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8082

# Production (.env.production)
EXPO_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Map not loading | Check permissions + Platform check |
| Web still works | Clear cache, rebuild |
| API not responding | Check network, verify base URL |
| Auth failing | Verify token retrieval logic |
| Delivery price 0 | Check warehouse coordinates |

---

## Performance Checklist

- [x] Static rendering disabled
- [x] Lazy loading implemented
- [x] Platform detection added
- [x] Web completely disabled
- [x] API endpoints optimized
- [x] Database indexes added
- [x] Error handling implemented

---

## Security Checklist

- [x] Auth middleware on all endpoints
- [x] API protected routes
- [x] No hardcoded secrets
- [x] Environment variables used
- [x] Web platform disabled

---

## Testing Checklist

- [ ] Create address with map pin
- [ ] Edit address
- [ ] Delete address
- [ ] Verify delivery price
- [ ] Check distance calculation
- [ ] Test on real device
- [ ] Test permissions flow

---

## Play Store Submission

### Version Management
- Initial: `1.0.0` (versionCode: 1)
- Bug fix: `1.0.1` (versionCode: 2)
- Feature: `1.1.0` (versionCode: 3)
- Major: `2.0.0` (versionCode: 4)

### Keystore Setup
```bash
keytool -genkey -v -keystore marketplace-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias marketplace_key
```

### Upload Steps
1. Go to Play Console
2. Create new release
3. Upload AAB
4. Add release notes
5. Submit for review

---

## Useful Links

- **Expo Docs**: https://docs.expo.dev/
- **React Native Maps**: https://github.com/react-native-maps/react-native-maps
- **Play Console**: https://play.google.com/console/
- **Firebase**: https://firebase.google.com/
- **Sentry**: https://sentry.io/

---

## API Request Template

```javascript
// Create/Update Address
const response = await api.post('/shipping/api/shipping-address', {
  name: 'Home',
  addressLine1: '123 Main St',
  city: 'Lagos',
  state: 'Lagos State',
  postalCode: '100001',
  country: 'Nigeria',
  latitude: 6.5244,
  longitude: 3.3792,
  isDefault: true
}, {
  headers: { Authorization: `Bearer ${token}` }
});

// Calculate Price
const priceResponse = await api.post(
  '/shipping/api/calculate-delivery-price',
  { latitude: 6.5244, longitude: 3.3792 },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Performance Tips

1. **Cache Query Results** - Use React Query for efficient data fetching
2. **Lazy Load Maps** - Only load on native platforms
3. **Batch Geocoding** - Use local cache before API calls
4. **Debounce Updates** - Prevent rapid API calls while dragging

---

## Debug Mode

Enable debug logging:
```javascript
// In production.config.js
const DEBUG = process.env.EXPO_PUBLIC_LOG_LEVEL === 'debug';

if (DEBUG) {
  console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
  console.log('Distance:', distance);
  console.log('Price:', estimatedDeliveryPrice);
}
```

---

**Last Updated**: January 10, 2026  
**App Version**: 1.0.0  
**Status**: Production Ready ✅
