# BizMingle - Quick Testing Guide for Android Device

## Prerequisites
- Android device/emulator connected to development machine
- Expo CLI installed
- Backend server running (or use mock data)

---

## Step 1: Start Expo Development Server

```bash
cd "Facebook Marketplace App"
npm install  # If not already installed
npx expo start
```

Wait for server to start, you should see:
```
Expo Go QR code
Press 's' for Android
```

## Step 2: Test on Android Device

### Option A: Use Expo Go (Easiest)
```
1. Open Expo Go app on Android device
2. Scan the QR code displayed in terminal
3. Wait for app to load (may take 1-2 minutes)
```

### Option B: Build APK (For Real Testing)
```bash
# From project root
npx expo build:android -t apk --local
```

Then install the generated APK:
```bash
adb install app-release.apk
```

---

## Step 3: Test Marketplace Features

### ✅ Test Add to Cart:

**Navigate to:** Home Tab → Any Product Card

**Actions:**
1. Find a product card
2. Click the **cart icon** button (bottom right of product)
3. **Expected Result:**
   - Alert appears: "✓ Added to Cart: [Product Name]"
   - Lottie animation plays
   - Haptic vibration (short buzz)
   - Navigation icon updates with cart count

**Repeat 2x:**
- Click cart on same product again
- **Expected:** Quantity increases (not duplicate added)

---

### ✅ Test Wishlist/Favorites:

**Navigate to:** Home Tab → Any Product Card

**Actions:**
1. Find a product card
2. Click the **heart icon** (top right of product image)
3. **Expected Result:**
   - Heart fills with red color (#FF6B6B)
   - Haptic vibration (light)
   - No navigation away

**Verify Toggle:**
1. Click heart again
2. **Expected:** Heart returns to white outline
3. Click again
4. **Expected:** Heart fills red again

**Verify Persistence:**
1. Scroll away from product
2. Scroll back
3. **Expected:** Heart still shows correct state (filled/outline)

---

## Step 4: Test Dating Features

### ✅ Navigate to Dating Section:

**Option A - From Home:**
```
Tab Navigation → "Matches" tab
```

**Option B - Direct Discovery:**
```
Menu → "Discover Profiles" 
OR
Press "Explore Profiles" button
```

### ✅ Test Swipe Gestures:

**Ensure:** Dating profile is created (if prompted, click "Create Dating Profile")

**Actions:**

1. **Swipe Right (Like):**
   - Place finger on card
   - Drag to right
   - Release when card is halfway off screen
   - **Expected:**
     - Card animates off to right
     - Next card fades in
     - Heart haptic feedback (medium buzz)
     - New profile displays

2. **Swipe Left (Pass):**
   - Place finger on card
   - Drag to left
   - Release when card is halfway off screen
   - **Expected:**
     - Card animates off to left
     - Next card fades in
     - Light haptic feedback
     - New profile displays

3. **Tap Like Button (❤️ icon - bottom right):**
   - Click the red heart button
   - **Expected:**
     - Immediate card swiped right
     - Heart animation plays
     - Haptic feedback
     - Next profile shows

4. **Tap Pass Button (✕ icon - bottom left):**
   - Click the gray X button
   - **Expected:**
     - Immediate card swiped left
     - X animation plays
     - Haptic feedback
     - Next profile shows

5. **Tap SuperLike Button (⭐ icon - bottom center):**
   - Click the blue star button
   - **Expected:**
     - Card animates upward
     - Star animation plays
     - Success haptic (3 pulses)
     - Next profile shows

---

### ✅ Test Profile Details:

**On any profile card:**
1. Tap photo carousel buttons to scroll through photos
2. **Expected:** Photos change smoothly
3. View badges: "Online", "Verified", distance, compatibility %
4. Read bio and interests
5. **Expected:** All information displays clearly

---

### ✅ Test Matches Screen:

**Tab:** Matches (or after matching with someone)

**Actions:**
1. View list of matches
2. Tap a match card
3. **Expected:** Chat screen opens OR profile details display
4. Tap message icon (💬)
5. **Expected:** Navigate to messaging

---

## Step 5: Verify Micro-Animations

### ✅ Product Cards:
- [ ] Heart icon scales up smoothly on click (1.0 → 1.3 → 1.0)
- [ ] Cart button has active opacity change
- [ ] Products fade in when scrolling

### ✅ Swipe Cards:
- [ ] Card rotates slightly during swipe
- [ ] Card opacity changes based on swipe direction
- [ ] Like/Pass text appears during swipe
- [ ] Card snaps back if not swiped far enough

### ✅ Buttons:
- [ ] All buttons have active state (slight scale down)
- [ ] Shadows increase on press
- [ ] Colors transition smoothly
- [ ] No lag or jank

---

## Step 6: Verify App Name

**Expected:** When app loads or shows in launcher, should say:
```
"BizMingle" (not "Marketplace")
```

---

## Step 7: Test Data Persistence

### ✅ Cart Persistence:
1. Add 2-3 items to cart
2. Close app completely
3. Reopen app
4. Navigate to cart
5. **Expected:** All items still there

### ✅ Wishlist Persistence:
1. Add 2-3 items to wishlist (click hearts)
2. Close app completely
3. Reopen app
4. Scroll to same products
5. **Expected:** Hearts still red/filled

---

## Common Issues & Solutions

### Issue: App Takes Long Time to Load
**Solution:** 
- First load is slow (compilation)
- Wait 2-3 minutes
- Subsequent reloads are faster

### Issue: Animations Stutter/Lag
**Solution:**
- Close other apps
- Restart phone
- Use higher-end device for testing

### Issue: Buttons Don't Respond
**Solution:**
- Hard refresh: Press 'r' in Expo terminal
- Clear Expo cache: `expo start --clear`
- Reinstall Expo Go

### Issue: Cart/Wishlist Not Persisting
**Solution:**
- Check AsyncStorage is working
- Verify internet connection
- Clear app data and retry

### Issue: Dating Cards Not Loading
**Solution:**
- Create dating profile first (if prompted)
- Ensure location permissions granted
- Check backend API is running
- Try "Refresh Profiles" button

---

## Performance Checklist

### Smooth Performance ✅:
- [ ] No frame drops when scrolling products
- [ ] Swipe cards animate at 60fps
- [ ] Button presses respond instantly
- [ ] Heart animations complete smoothly
- [ ] Cart adds items without lag

### Responsive UI ✅:
- [ ] All buttons clickable
- [ ] No dead zones
- [ ] Touch feedback immediate
- [ ] Haptics work consistently
- [ ] Navigation instant

---

## Final Sign-Off Checklist

Before considering testing complete:

- [ ] ✅ App name shows "BizMingle"
- [ ] ✅ Add to cart works with animation
- [ ] ✅ Wishlist heart toggles
- [ ] ✅ Swipe gestures work smoothly
- [ ] ✅ Like/Pass/SuperLike buttons work
- [ ] ✅ Photo carousel works
- [ ] ✅ All animations are smooth (60fps)
- [ ] ✅ Cart persists after close
- [ ] ✅ Wishlist persists after close
- [ ] ✅ Haptic feedback works
- [ ] ✅ No crashes or errors

---

## Next Steps After Testing

1. **If issues found:**
   - Check console for errors: Press 'j' in Expo terminal
   - Check network: Backend might not be responding
   - Try hard refresh: Press 'r' in Expo terminal

2. **If all working:**
   - Build production APK
   - Submit to Google Play Store
   - Deploy backend to production
   - Monitor crash reports

3. **Optimization:**
   - Profile performance with React Native Debugger
   - Optimize images
   - Test on low-end devices
   - Monitor bundle size

---

## Support

If you encounter any issues:
1. Check error messages in console
2. Try restarting Expo dev server
3. Clear cache and reinstall
4. Check backend API logs
5. Verify internet connection

Happy testing! 🎉
