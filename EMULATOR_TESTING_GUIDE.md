# 🧪 PHASE 2 EMULATOR TESTING GUIDE
## Step-by-Step Instructions & Test Cases
**Duration:** 1-2 hours  
**Status:** Dev Server Running ✅

---

## 📱 STEP 1: LAUNCH ANDROID EMULATOR

### Option A: From Android Studio
1. Open **Android Studio**
2. Click **Device Manager** (right sidebar)
3. Find your Android Virtual Device (AVD)
4. Click the **Play button (▶️)** to launch
5. Wait for emulator to fully boot (~30-60 seconds)

### Option B: From PowerShell
```bash
# List available emulators
emulator -list-avds

# Launch emulator (replace with your device name)
emulator -avd Pixel_5_API_31
```

### What to Expect
- Android emulator window opens
- Google logo appears
- Home screen loads
- Ready in 30-60 seconds

---

## 📲 STEP 2: OPEN APP ON EMULATOR

### Once Emulator is Ready:

**In your terminal where Dev Server is running:**
```
Press 'a' to open Android emulator
```

Or manually:
1. **On Emulator:** Look for **Expo Go** app
2. **Tap Expo Go** app icon
3. **Tap "Scan QR code"**
4. **Point at the QR code** shown in your terminal
5. **App will load in 10-20 seconds**

### What to Expect
- Loading spinner appears
- "Metro is bundling..." message
- App loads and shows first screen
- If you see blank screen, wait 20 more seconds (still bundling)

---

## ✅ TEST CASE 1: NAVIGATION WORKS

### Objective: Verify screens connect properly

**Test Steps:**

1. **App loads → See Home/Tabs screen**
   - ✅ Verify: You see bottom tabs or main navigation
   - Time: ~5 seconds
   
2. **Navigate to Admin Dashboard (if available)**
   - Method: Look for Admin tab or navigation link
   - Expected: Admin dashboard screen appears
   - Time: Instant (cached in app)

3. **Click "View Pending Sellers" button**
   - Expected: Navigate to seller-approval screen
   - ✅ Verify: New screen appears with smooth transition
   - Time: Instant (no API call yet)

4. **Navigate back to dashboard**
   - Method: Tap back button or swipe left
   - Expected: Return to admin dashboard
   - ✅ Verify: State preserved (button still highlighted if clicked)

**Result:** ✅ PASS if all navigation works smoothly
**Result:** ❌ FAIL if screens don't appear or app crashes

---

## ✅ TEST CASE 2: ERROR HANDLING (Mock Errors)

### Objective: Verify error UI displays correctly

**Test Steps:**

1. **Turn Off Network (Simulate API Error)**
   - On emulator: Settings → Developer Options → Disable network
   - Or: Menu (three dots) → Settings → Network

2. **Navigate to Admin Dashboard**
   - Expected: Should eventually show error state
   - ✅ Verify: See error UI with:
     - ❌ Icon
     - "Failed to Load Dashboard" text
     - 🔄 Retry button

3. **Tap Retry Button (Network Still Off)**
   - Expected: Loading spinner → Error UI again
   - ✅ Verify: Retry mechanism works

4. **Turn Network Back On**
   - Settings → Network → Re-enable
   
5. **Tap Retry Button Again**
   - Expected: Loading spinner → Data loads
   - ✅ Verify: Dashboard KPI cards appear

**Result:** ✅ PASS if error handling is smooth
**Result:** ❌ FAIL if errors crash app or don't show retry

---

## ✅ TEST CASE 3: LOADING STATES

### Objective: Verify spinners and loading messages

**Test Steps:**

1. **Navigate to Seller Dashboard**
   - Expected: See loading spinner
   - ✅ Verify: Gray/transparent overlay with spinning icon
   - Time: Should show for 1-3 seconds

2. **Once Loaded**
   - ✅ Verify: Welcome card appears (e.g., "Welcome, Seller!")
   - ✅ Verify: 4 metric cards below (Orders, Revenue, Rating, Products)
   - ✅ Verify: Quick Actions section
   - ✅ Verify: No blank spaces

3. **Pull to Refresh (Swipe Down from Top)**
   - Expected: Refresh spinner appears
   - ✅ Verify: "Loading..." animation visible
   - Time: Should complete in 1-2 seconds

**Result:** ✅ PASS if spinners show correctly
**Result:** ❌ FAIL if loading never shows or no spinner

---

## ✅ TEST CASE 4: FORM VALIDATION & PROGRESS

### Objective: Verify Return Request form works

**Test Steps:**

1. **Navigate to Return Request Screen**
   - Path: Customer Flows → Returns → Request
   - Expected: See Step 1/4 progress at top
   - ✅ Verify: Visual progress indicator visible

2. **Check Initial State**
   - Expected: Submit button is GRAY (disabled)
   - Expected: No order selected

3. **Select an Order (Step 1)**
   - ✅ Verify: Order card highlights when tapped
   - ✅ Verify: Progress updates to Step 2/4
   - ✅ Verify: Step indicator shows Step 2 (solid blue)

4. **Choose a Reason (Step 2)**
   - Tap: "Defective" or any reason
   - ✅ Verify: Radio button fills
   - ✅ Verify: Progress updates to Step 3/4
   - ✅ Verify: Submit button still GRAY

5. **Add Description (Step 3)**
   - Tap description field
   - Type: "This item arrived broken"
   - ✅ Verify: Text appears in field
   - ✅ Verify: Progress updates to Step 4/4
   - ✅ Verify: Submit button still GRAY (need images)

6. **Try Submit Without Images**
   - ✅ Verify: Submit button is GRAY
   - ✅ Verify: Clicking does nothing (button disabled)

7. **Tap "Add Images"**
   - Expected: Image picker opens
   - Choose: 1-2 photos from device
   - ✅ Verify: Images appear in grid below
   - ✅ Verify: Remove (✕) button on each image

8. **Now Try Submit**
   - ✅ Verify: Submit button turns BLUE (enabled!)
   - ✅ Verify: Text changes to "✓ Submit Return Request"
   - Tap submit
   - Expected: "⏳ Processing..." text appears
   - Time: 1-2 seconds

**Result:** ✅ PASS if form validation works perfectly
**Result:** ❌ FAIL if button doesn't disable or progress doesn't update

---

## ✅ TEST CASE 5: SELLER APPROVAL ADMIN FLOW

### Objective: Verify admin seller approval screen

**Test Steps:**

1. **Navigate to Seller Approval Screen**
   - Path: Admin → Seller Approval
   - Expected: Seller approval screen appears
   - ✅ Verify: Get request triggers (may show spinner)

2. **Mock Data (If No Backend)**
   - Expected: See heading "No pending sellers" OR list of sellers
   - ✅ Verify: At least placeholder content shown

3. **If Seller Cards Appear**
   - ✅ Verify: Card shows:
     - Business name
     - Category
     - "⏳ Pending" badge (yellow)
     - Seller personal info
     - Verification status (✅ or ❌)
   
4. **Click Approve Button**
   - Expected: Loading state on button
   - ✅ Verify: Button text changes to "Approving..."
   - Time: 1-2 seconds
   - Result: Success alert should appear

5. **View Reject Modal**
   - Click "❌ Reject" button
   - Expected: Modal appears with:
     - Title: "Reject Seller Application"
     - Business name shown
     - Text area for rejection reason
     - Cancel and Reject buttons
   - ✅ Verify: Close modal with Cancel button

**Result:** ✅ PASS if modals and buttons work
**Result:** ❌ FAIL if modals don't open or styling is broken

---

## ✅ TEST CASE 6: SUPPORT CHAT SCREEN

### Objective: Verify real-time messaging interface

**Test Steps:**

1. **Navigate to Support Chat**
   - Path: Customer → Support → Chat
   - Expected: Two-panel layout (list on left, chat on right)
   - OR: Single panel with ticket list

2. **Check Ticket List (Left Side)**
   - ✅ Verify: Shows "No support tickets" or ticket list
   - Each ticket shows:
     - Ticket number
     - Category
     - First message preview
     - Status badge

3. **Select a Ticket (Tap on One)**
   - Expected: Right panel updates with chat
   - ✅ Verify: Smooth transition

4. **Check Chat View (Right Side)**
   - ✅ Verify: Shows:
     - Header with ticket number
     - Messages list (chat bubbles)
     - Customer messages on right (blue)
     - Admin messages on left (gray)
     - Input field at bottom

5. **Type a Message**
   - Tap message input field
   - Type: "Hello, I need help with this order"
   - ✅ Verify: Text appears in input
   - ✅ Verify: Send button (📤) appears

6. **Send Message**
   - Tap 📤 send button
   - Expected: Button shows loading state (⏳)
   - ✅ Verify: Message appears in chat
   - ✅ Verify: Input clears

7. **Close Ticket**
   - Scroll down to find Close Ticket button
   - Tap it
   - Expected: Confirmation alert appears
   - Tap "Close"
   - ✅ Verify: Input field disappears (read-only now)

**Result:** ✅ PASS if chat UI is clean and functional
**Result:** ❌ FAIL if input doesn't work or messages don't appear

---

## 🎨 TEST CASE 7: UI/UX & VISUAL IMPROVEMENTS

### Objective: Verify all UX enhancements are visible

**Test Steps:**

1. **Check Error States**
   - ✅ Verify: Error UI has:
     - Large icon (⚠️ or ❌)
     - Clear title
     - Helpful message
     - Retry button is visible
     - Good spacing and colors

2. **Check Loading States**
   - ✅ Verify: Loading spinners:
     - Centered on screen
     - Smooth animation
     - Not blocking entire screen (should see some UI)

3. **Check Button States**
   - Disabled button: Should be GRAY and not clickable
   - Enabled button: Should be BLUE and clickable
   - Loading button: Should show "⏳ Loading..." text
   - Success: Should show "✓" checkmark

4. **Check Modals**
   - ✅ Verify: Modals have:
     - Semi-transparent dark overlay
     - Clear content area
     - Proper button styling
     - Smooth appearance/disappearance

5. **Check Dark Mode (If Available)**
   - In app settings, toggle dark mode
   - ✅ Verify: All text readable (good contrast)
   - ✅ Verify: Backgrounds adjust properly
   - ✅ Verify: Colors still look good

6. **Check Spacing & Typography**
   - ✅ Verify: No overlapping text
   - ✅ Verify: Buttons are 44x44 minimum (touch-friendly)
   - ✅ Verify: Card spacing is consistent
   - ✅ Verify: Text sizes are readable (not too small)

**Result:** ✅ PASS if UX is professional and polished
**Result:** ❌ FAIL if UI looks broken or text is hard to read

---

## ✅ TEST CASE 8: PERFORMANCE

### Objective: Verify app loads quickly

**Metrics to Track:**

1. **Initial Load**
   - From clicking app to first screen visible
   - ✅ Target: < 10 seconds
   - ❌ Too slow if: > 20 seconds

2. **Screen Navigation**
   - From tap to navigation complete
   - ✅ Target: < 500ms
   - ❌ Too slow if: > 2 seconds

3. **Image Loading**
   - Profile pictures/product images
   - ✅ Target: Show placeholder, then load
   - ❌ Too slow if: blank for > 3 seconds

4. **Scroll Performance**
   - Scroll through long list
   - ✅ Target: Smooth 60fps
   - ❌ Too slow if: Stuttering or janky

5. **Pull to Refresh**
   - Swipe and refresh data
   - ✅ Target: Complete in 1-2 seconds
   - ❌ Too slow if: > 5 seconds

**Notes:**
- First load will be slowest (bundling)
- Subsequent loads are cached and faster
- Performance depends on emulator specs

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Blank White Screen
**Cause:** App is still bundling
**Fix:** Wait 20-30 seconds, should appear
**Or:** Restart Expo Go app

### Issue 2: App Crashes on Navigation
**Cause:** Missing import or code error
**Fix:** Check terminal for error message and report

### Issue 3: No Network Error (Even With WiFi)
**Cause:** Emulator network config
**Fix:** In terminal, press 'r' to reload app
**Or:** Restart Expo Go

### Issue 4: Images Won't Load
**Cause:** Path or permission issue
**Fix:** Check emulator has camera permissions
**Or:** Try using stock images first

### Issue 5: Extremely Slow
**Cause:** Emulator performance
**Fix:** Reduce emulator RAM allocation
**Or:** Use physical device instead

### Issue 6: QR Code Won't Scan
**Cause:** Camera angle or lighting
**Fix:** Move terminal screen closer to camera
**Or:** Type URL manually (shown in terminal)

---

## 📊 TESTING CHECKLIST

Print this out and check off as you test:

### Navigation (TEST CASE 1)
- [ ] App loads on emulator
- [ ] All screens accessible via navigation
- [ ] Back button works
- [ ] No crashes during navigation

### Error Handling (TEST CASE 2)
- [ ] Error UI displays when network off
- [ ] Retry button functional
- [ ] Data loads after retry

### Loading States (TEST CASE 3)
- [ ] Loading spinner shows
- [ ] Smooth appearance/disappearance
- [ ] Pull-to-refresh works

### Form Validation (TEST CASE 4)
- [ ] Step progress indicator visible
- [ ] Submit disabled when form incomplete
- [ ] Submit enabled when form complete
- [ ] Button color changes appropriately

### Admin Screens (TEST CASE 5)
- [ ] Seller approval screen loads
- [ ] Approve/Reject buttons functional
- [ ] Modal displays for rejection

### Chat Screen (TEST CASE 6)
- [ ] Ticket list displays
- [ ] Chat view opens on selection
- [ ] Can type and send messages
- [ ] Messages appear in chat

### Visual Design (TEST CASE 7)
- [ ] Error states look professional
- [ ] Loading states clear
- [ ] Button states obvious
- [ ] Modal design clean
- [ ] Dark mode works (if applicable)
- [ ] Spacing and typography consistent

### Performance (TEST CASE 8)
- [ ] Initial load < 10 seconds
- [ ] Navigation < 500ms
- [ ] Scrolling smooth (no stutter)
- [ ] Pull-to-refresh < 2 seconds

---

## 📈 EXPECTED RESULTS SUMMARY

### If All Tests Pass ✅
- App is production-ready for Phase 3
- Can proceed to connect real backend APIs
- Ready for user acceptance testing
- Can deploy to Google Play with confidence

### If Some Tests Fail ⚠️
- Note down specific failures
- Check error messages in terminal
- Most issues are minor styling fixes
- User experience still good overall

### If Many Tests Fail ❌
- Check TypeScript errors in terminal
- Review recent code changes
- Might need to rebuild app
- Contact support if critical

---

## 🎯 WHAT YOU'RE VALIDATING

**After This Testing, You'll Know:**

1. ✅ **All 13 screens work on real device**
2. ✅ **Navigation between screens is smooth**
3. ✅ **Error handling shows professional UI**
4. ✅ **Form validation prevents bad data**
5. ✅ **Loading states are clear to users**
6. ✅ **Visual design matches requirements**
7. ✅ **App performs well (not laggy)**
8. ✅ **Ready for backend integration**

---

## 🔄 TROUBLESHOOTING TERMINAL COMMANDS

While testing, if you need to:

**Reload the app:**
```
Press 'r' in terminal
```

**See more details:**
```
Press 'j' to open debugger
```

**Go to web preview:**
```
Press 'w' to switch to web
```

**Show all commands:**
```
Press '?' in terminal
```

**Stop dev server:**
```
Press Ctrl+C in terminal
```

---

## ✅ NEXT STEPS AFTER TESTING

### If All Tests Pass:
**Next:** Connect to Phase 1 backend APIs
- Update backend URL in screens
- Test real data loading
- Verify API mutations work

### If Tests Show Issues:
**Next:** Fix identified issues
- Review error messages
- Update code as needed
- Re-test affected screens

### Once Testing Complete:
**Phase 3:** Optimization & Deployment
- Performance tuning
- Security review
- Google Play submission

---

**Testing Guide Generated:** February 28, 2026  
**Estimated Duration:** 1-2 hours  
**Difficulty Level:** Easy - Just tap and observe  
**No Coding:** All testing is UI interaction

---

## 🚀 YOU'RE READY TO BEGIN!

**Status:** Dev Server Running ✅  
**Emulator:** Ready to launch  
**App:** Ready to test  

**Next Action:** Launch Android emulator and follow TEST CASE 1

Good luck! 🎮
