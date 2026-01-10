# Implementation Complete: Address Pin Selection & Production Build Setup

## ✅ Features Implemented

### 1. Address Pin Selection on Map
- **Location**: `app/(routes)/shipping/edit.tsx`
- **Features**:
  - Interactive map with draggable pin
  - Real-time reverse geocoding as user drags the pin
  - Visual indicator showing pin position
  - "Drag to select location" guide for first-time users
  - Automatic address field population based on selected coordinates

### 2. Backend Shipping API Routes
- **Location**: `backend/routes/shipping.js`
- **Models**: `backend/models/ShippingAddress.js`
- **Endpoints**:
  ```
  POST   /shipping/api/shipping-address          - Create/Update address with coordinates
  GET    /shipping/api/shipping-addresses        - Get all user addresses
  GET    /shipping/api/shipping-addresses/default - Get default address
  GET    /shipping/api/shipping-addresses/:id    - Get single address
  DELETE /shipping/api/shipping-addresses/:id    - Delete address
  POST   /shipping/api/calculate-delivery-price  - Calculate price for coordinates
  ```

### 3. Delivery Distance-Based Pricing
- **Algorithm**: Haversine formula for accurate distance calculation
- **Configuration**:
  - Warehouse location: Lagos, Nigeria (6.5244°N, 3.3792°E)
  - Base delivery price: ₦1,000
  - Per-km rate: ₦50
  - Formula: `Total = ₦1,000 + (distance - 1 km) × ₦50`

**Example Pricing**:
- Within 1 km: ₦1,000
- 5 km away: ₦1,200 (₦1,000 + 4 × ₦50)
- 10 km away: ₦1,450 (₦1,000 + 9 × ₦50)

### 4. Hardened Web Disabled
- **app.json**: 
  - Removed "web" configuration
  - Added `"platforms": ["ios", "android"]`
  - Removed web favicon and output settings
  
- **Platform Detection**:
  - Map components only load on native platforms
  - Web route shows friendly "Mobile Only" message
  - Static rendering disabled for map screens

### 5. Production Build Configuration
- **Files Created**:
  - `PLAY_STORE_BUILD_GUIDE.md` - Complete step-by-step guide
  - `config/production.config.js` - Production settings
  - Android permissions configured for location and storage

## 📱 User Flow for Address Management

### 1. Adding/Editing Address
```
User opens Edit Address Screen
  ↓
Map loads with current location
  ↓
User drags map to select location (pin stays center)
  ↓
Reverse geocoding updates address fields automatically
  ↓
System calculates delivery distance & price in real-time
  ↓
User reviews address details
  ↓
User taps "Save Changes"
  ↓
Address saved to backend with coordinates & delivery price
  ↓
Query cache invalidated, list updates
```

### 2. Distance Calculation Flow
```
User moves pin on map
  ↓
New coordinates sent to Haversine calculation
  ↓
Distance calculated from warehouse
  ↓
Delivery price calculated based on distance
  ↓
UI updates with distance & price display
  ↓
Price saved to database when address is saved
```

## 🔧 Integration Steps

### Step 1: Update Auth System
The shipping API requires authentication. Update your auth context to:

```typescript
// In your AuthContext or hook
const getAuthToken = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return token;
};
```

### Step 2: Configure Environment Variables
Create `.env` file:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8082  # Dev
# or for production:
EXPO_PUBLIC_API_URL=https://api.your-domain.com
```

### Step 3: Update API Base URL in edit.tsx
In `app/(routes)/shipping/edit.tsx`, update:
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8082';
```

### Step 4: Ensure Backend Routes are Registered
Already done in `backend/server.js`:
```javascript
const shippingRoutes = require('./routes/shipping');
app.use('/shipping/api', shippingRoutes);
```

### Step 5: Update User Model (Optional)
If you want to add default address to User profile:
```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields
  defaultShippingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShippingAddress'
  }
});
```

## 🛠️ Customization Options

### Change Warehouse Location
In `backend/routes/shipping.js`:
```javascript
const WAREHOUSE_LAT = 6.5244;   // Change this
const WAREHOUSE_LNG = 3.3792;   // And this
```

### Adjust Delivery Pricing
In `backend/routes/shipping.js`:
```javascript
const BASE_DELIVERY_PRICE = 1000;  // Base price in kobo/cents
const PRICE_PER_KM = 50;           // Per-km rate
```

Or use dynamic pricing from database:
```javascript
const pricingConfig = await PricingModel.findOne({ active: true });
const price = pricingConfig.basePrice + (distance - 1) * pricingConfig.perKmRate;
```

### Customize Map Behavior
In `edit.tsx`, modify `handleRegionChangeComplete`:
- Change reverse geocoding timeout
- Add address validation
- Implement address suggestions

## 🚀 Play Store Build Instructions

### Quick Start
```bash
# 1. Ensure android version is set in app.json
# 2. Create signing key (if first time)
keytool -genkey -v -keystore marketplace-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias marketplace_key

# 3. Build AAB
cd android && ./gradlew bundleRelease

# 4. Upload AAB to Play Console
# See PLAY_STORE_BUILD_GUIDE.md for full details
```

### Versioning Strategy
- Version 1.0.0 - Initial release
- Increment: 1.0.1, 1.0.2 for bug fixes
- Minor: 1.1.0 for features
- Major: 2.0.0 for breaking changes

**Version Code** (for Play Store):
- Initial: 1
- After update: 2, 3, 4, etc. (must always increment)

## 🔒 Security Checklist

- [x] Web platform disabled in app.json
- [x] API endpoints protected with auth middleware
- [x] Location data stored securely
- [x] Authentication required for shipping API
- [x] No sensitive data in logs
- [x] HTTPS enforced for production API
- [ ] Implement rate limiting on backend
- [ ] Add request validation for coordinates
- [ ] Implement address verification (optional)

## 📊 Backend Database Schema

### ShippingAddress Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String,
  addressLine1: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  latitude: Number,
  longitude: Number,
  isDefault: Boolean,
  distanceFromWarehouse: Number,
  estimatedDeliveryPrice: Number,
  createdAt: Date,
  updatedAt: Date,
  __v: 0
}
```

### Indexes
- `{ userId: 1 }` - Fast user queries
- `{ userId: 1, isDefault: 1 }` - Find default address

## 🐛 Troubleshooting

### Map not loading on Android
- Ensure `expo-location` is installed
- Check location permissions in AndroidManifest.xml
- Verify Google Play Services is configured

### Reverse geocoding fails
- Ensure `expo-location` is properly linked
- Check network connection
- Implement fallback to manual address entry

### Delivery price not calculating
- Check warehouse coordinates are valid
- Verify distance calculation logic
- Ensure API endpoint is accessible

### Web still accessible
- Clear build cache: `npx expo prebuild --clean`
- Verify app.json has `"platforms": ["ios", "android"]`
- Remove web build artifacts if any

## 📚 Testing Recommendations

### Manual Testing Checklist
- [ ] Create new address with map pin
- [ ] Edit existing address
- [ ] Delete address
- [ ] Set default address
- [ ] Verify delivery price updates as pin moves
- [ ] Test on actual Android device
- [ ] Test offline map loading
- [ ] Verify permissions prompt appears

### Automated Testing
```bash
# Unit tests for distance calculation
npm test -- calculate-delivery-price.test.js

# Integration tests for API
npm test -- shipping-api.test.js
```

## 🎯 Next Steps

1. **Implement Payment Integration**
   - Add payment gateway for delivery charges
   - Store payment method

2. **Add Delivery Tracking**
   - Real-time order tracking
   - Driver location updates

3. **Implement Review System**
   - Rate delivery service
   - Feedback collection

4. **Analytics**
   - Track popular delivery zones
   - Monitor average delivery costs
   - User behavior analysis

5. **Machine Learning**
   - Predict delivery time based on traffic
   - Dynamic pricing based on demand
   - Route optimization

## 📞 Support

For issues or questions:
1. Check PLAY_STORE_BUILD_GUIDE.md
2. Review backend/routes/shipping.js
3. Verify environment variables
4. Check network connectivity
5. Enable debug logging in production.config.js

---
**Last Updated**: January 10, 2026
**Status**: Ready for Production Build
