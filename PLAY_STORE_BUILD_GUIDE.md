# Play Store Production Build Guide

## Prerequisites
- Node.js 16+ installed
- Android SDK 34 (API level 34)
- Android Keystore file (or create one)
- Google Play Developer Account

## Step 1: Generate Signing Key (First Time Only)

```bash
# Create a new keystore
keytool -genkey -v -keystore marketplace-release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias marketplace_key

# You'll be prompted for:
# - Keystore password
# - Key password (can be same as keystore)
# - Your name, organization, city, state, country
```

Save the keystore file securely and remember the passwords.

## Step 2: Update Build Configuration

Add to `app.json` android section:
```json
"releaseChannel": "production",
"versionCode": 1,
"releaseChannel": "production"
```

## Step 3: Build AAB (Android App Bundle) for Play Store

```bash
# Clean previous builds
npx expo prebuild --clean

# Build for production
eas build --platform android --auto-submit

# OR manually:
cd android
./gradlew bundleRelease
```

The AAB will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

## Step 4: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to "Release" > "Production"
4. Click "Create new release"
5. Upload the AAB file
6. Review the details:
   - App name: "Facebook Marketplace"
   - Package name: "com.ukwun.marketplace"
   - Version code: Incremental
   - Version name: "1.0.0", "1.0.1", etc.
7. Add release notes
8. Submit for review

## Step 5: Monitor Review Status

- Go to Play Console dashboard
- Check review status (typically 1-3 hours, up to 7 days)
- Once approved, release to production in phases (staged rollout recommended)

## Production Build Checklist

- [x] Web completely disabled (platforms: ["ios", "android"])
- [x] Static rendering disabled for map screens
- [x] API endpoints configured for production
- [x] Location permissions configured
- [x] Shipping routes added to backend
- [x] Delivery pricing implemented
- [x] Address pin selection working
- [x] Privacy policy URL set
- [x] App icon and splash screens properly configured
- [x] All dependencies updated and compatible
- [x] No console errors or warnings

## Environment Variables for Production

Create `.env.production`:
```
EXPO_PUBLIC_API_URL=https://your-production-api.com
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_LOG_LEVEL=error
```

## Troubleshooting

### Build fails with: "resource android:attr/dialogCornerRadius not found"
- Update android compileSdkVersion to 34 in app.json

### Signing key error
- Verify keystore path and passwords
- Check key alias name matches config

### Play Store upload fails
- Ensure version code is higher than previous release
- Check app signing certificate is correct
- Verify app meets Play Store policies

## Monitoring Post-Release

1. Set up Firebase Crash Reporting
2. Monitor user reviews and ratings
3. Track analytics for:
   - User acquisition
   - Retention rates
   - Crash reports
   - ANR (Application Not Responding) rates

## Next Steps

1. Configure Firebase for analytics and crash reporting
2. Set up error tracking (Sentry)
3. Implement app update checking
4. Set up automated nightly builds for testing
