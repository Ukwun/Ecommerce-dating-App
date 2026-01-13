# Google Play Console Deployment Checklist

## Prerequisites
- [ ] Expo account created (https://expo.io)
- [ ] Google account with payment method
- [ ] App icon (512x512 PNG)
- [ ] App screenshots (2-8 images, 1080x1920 or 1440x2560)

## Phase 1: Accounts & Credentials

### 1.1 Google Play Developer Account
- [ ] Go to https://play.google.com/console
- [ ] Sign in with Google account
- [ ] Pay $25 registration fee
- [ ] Create new app named "Facebook Marketplace"
  - Category: Shopping
  - Type: App
  - Content Rating: Everyone

### 1.2 Create Service Account for EAS Submission
- [ ] Open https://console.cloud.google.com
- [ ] Create new project (or use existing)
- [ ] Enable Google Play API
- [ ] Create Service Account
  - Role: Editor
  - Generate JSON key file
- [ ] Save JSON as: `google-play-key.json` in project root

## Phase 2: Build & Submission

### 2.1 Build with EAS
Run in project directory:
```bash
cd "c:\dev\facebook-marketplace\Facebook Marketplace App"
eas login
eas build --platform android --build-type production
```

Save the BUILD_ID from output

### 2.2 Submit to Internal Testing
```bash
eas submit --platform android --build-id <BUILD_ID> --track internal
```

## Phase 3: Store Listing Configuration

In Google Play Console:

### 3.1 App Details
- [ ] App Title: Facebook Marketplace
- [ ] Short Description: Shop & sell items in your local area safely and easily
- [ ] Full Description: [See STORE_DESCRIPTION.md]
- [ ] App Icon: 512x512 PNG
- [ ] Screenshots: 4-6 images showing key features
- [ ] Feature Graphic: 1024x500 PNG
- [ ] Content Rating: Complete questionnaire
- [ ] Minimum Android version: API 21

### 3.2 Pricing & Distribution
- [ ] Pricing: Free
- [ ] Countries: Select all or your target regions
- [ ] Consent: Check all boxes
- [ ] Website & Privacy Policy: Add URLs

### 3.3 Target Audience
- [ ] Age rating: Unrated (suitable for all ages)
- [ ] Content: No restricted content

## Phase 4: Testing

### 4.1 Internal Testing
- [ ] Create internal test release
- [ ] Add test users (Google account emails)
- [ ] Share testing link with team
- [ ] Test on real devices:
  - [ ] List browsing works
  - [ ] Chat functionality works
  - [ ] Search & filters work
  - [ ] Payment integration works
  - [ ] Notifications work
  - [ ] No crashes or errors

### 4.2 Staged Rollout (Optional)
- [ ] Start with 10% rollout to catch any issues
- [ ] Monitor crash rates for 24 hours
- [ ] Increase to 50%, then 100%

## Phase 5: Production Release

### 5.1 Submit for Review
- [ ] Create production release
- [ ] Add release notes (v1.0.0)
- [ ] Check content rating again
- [ ] Click "Review" to start submission

### 5.2 Wait for Review
- Typical time: 2-4 hours
- Maximum: 7 days
- You'll receive email notification

### 5.3 Launch
- [ ] Review approved - ready to publish!
- [ ] Click "Release to production"
- [ ] Set rollout to 100%

## Checklist Summary
- Total steps: 30
- Estimated time: 2-4 hours (including review wait)

## Troubleshooting

If build fails:
```bash
eas build --platform android --build-type production --verbose
```

If submission fails:
- Check Service Account has Editor role
- Verify google-play-key.json is valid
- Ensure app signing is configured

## Support Resources
- Expo Deployment: https://docs.expo.dev/build/setup/
- Google Play Console: https://developer.android.com/google-play/console
- EAS Submit: https://docs.expo.dev/submit/android/
