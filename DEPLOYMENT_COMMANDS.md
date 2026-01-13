# Quick Google Play Deployment Commands

## Prerequisites
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login
```

## Build for Production
```bash
# Build AAB file in cloud
eas build --platform android --build-type production

# Note the BUILD_ID from the output
```

## Submit to Internal Testing
```bash
# Replace <BUILD_ID> with the actual ID from build
eas submit --platform android --build-id <BUILD_ID> --track internal
```

## Submit to Production
```bash
# After testing is complete
eas submit --platform android --build-id <BUILD_ID> --track production
```

## Or Submit Using Service Account (Automated)
```bash
# After creating service account and saving google-play-key.json
eas submit --platform android --build-id <BUILD_ID> --track internal
```

## Monitor Build Status
```bash
# List all builds
eas builds --platform android

# Show specific build status
eas build --platform android --status <BUILD_ID>
```

## View Build Logs
```bash
# Get detailed logs
eas build --platform android --verbose
```

## Package Names & Identifiers

- **App ID (Bundle ID):** com.ukwun.marketplace
- **Package Name:** com.ukwun.marketplace
- **Display Name:** Facebook Marketplace

## App Signing Configuration

Google Play will automatically manage signing in production. No manual key required.

## Important Dates

- Developer Account Created: January 12, 2026
- Expected First Release: January 12-13, 2026 (after 2-4 hour review)

## Support Contacts

- Expo Support: https://expo.dev/support
- Google Play Support: https://support.google.com/googleplay/android-developer
