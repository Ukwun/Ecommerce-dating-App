# Android Device Testing Checklist (May 12, 2026)

## **Pre-Testing Setup**
- ✅ Backend running on: **192.168.70.160:8082**
- ✅ Expo dev server running on your PC
- ✅ Android device connected via USB
- ✅ Android & PC on **same WiFi network**
- ✅ USB Debugging enabled on Android

---

## **Critical Flows to Test**

### **1. Authentication Flows** 🔐
- [ ] **Signup with Email**
  - Tap "Don't have an account? Sign up"
  - Enter email, password, confirm password
  - Verify OTP sent (check terminal for logs)
  - Should see success → Redirected to home

- [ ] **Login with Email**
  - Enter credentials
  - Should login successfully
  - Check user profile is loaded

- [ ] **Social Auth (Optional)**
  - Tap "Sign up with Google" or "Facebook"
  - Should open native auth flow
  - Verify callback works

### **2. Marketplace Flows** 🛒
- [ ] **Browse Products**
  - Scroll product list
  - Tap product → See details
  - Check images load correctly

- [ ] **Add to Cart**
  - Tap "Add to Cart" on product
  - Verify item appears in cart
  - Check cart count updates

- [ ] **Checkout with Payment**
  - Go to cart
  - Proceed to checkout
  - Enter shipping address (or add new)
  - Apply coupon (if available)
  - Tap "Pay Now"
  - Should open Paystack payment modal
  - Use test card: **4111 1111 1111 1111** / **12/25** / **123**

- [ ] **Coupon Validation**
  - Enter a valid coupon code
  - Verify discount applied
  - Check total price updates

### **3. Shipping Address Management** 📍
- [ ] **Add Shipping Address**
  - Tap "Add Address"
  - Fill form: name, address, city, state, zip
  - Tap "Save"
  - Verify address appears in list
  - Check API call in terminal logs

- [ ] **Edit Address**
  - Tap edit icon on saved address
  - Modify details
  - Tap "Save"
  - Verify changes reflected

- [ ] **Select Address at Checkout**
  - Go to checkout
  - Ensure address is selectable
  - Proceed with payment

### **4. Product Listing (Seller)** 📸
- [ ] **List New Product**
  - Tap "Sell" tab
  - Fill product details (name, description, price, category, stock)
  - Tap "Upload Images"
  - Select image from device
  - Image should be uploaded to ImageKit
  - Tap "List Product"
  - Should see success → Product appears in marketplace

- [ ] **Edit Product**
  - Go to Seller Dashboard → Your Products
  - Tap edit icon
  - Modify details
  - Tap "Save"
  - Verify changes live in marketplace

### **5. Profile & File Uploads** 👤
- [ ] **Update Profile Picture**
  - Go to Profile
  - Tap "Edit Profile" or photo icon
  - Select image
  - Should upload to ImageKit
  - New photo displays immediately

- [ ] **Profile Information**
  - Edit name, bio, phone
  - Verify updates saved
  - Check backend reflects changes

### **6. Dating/Social Features** 💕
- [ ] **Create Dating Profile**
  - Go to Dating section
  - Tap "Create Profile"
  - Add bio, interests, photos
  - Upload profile photo
  - Verify location access prompt (allow it)
  - Should see "Profile saved"

- [ ] **Browse Matches**
  - See list of potential matches
  - Tap match to view profile
  - Like/pass on match
  - Verify action updates UI

- [ ] **View Matches**
  - Go to "Matches" section
  - Should see list of people who liked you
  - Tap to message a match

### **7. Messaging/Chat** 💬
- [ ] **Start New Chat**
  - Find a seller or match
  - Tap "Message" button
  - Send text message
  - Verify message appears in chat
  - Check backend socket.io logs

- [ ] **Send Images in Chat**
  - Tap attachment/image icon
  - Select photo from gallery
  - Image should upload to Cloudinary
  - Verify image displays in chat

### **8. Orders & Returns** 📦
- [ ] **View Orders**
  - Go to "My Orders"
  - Should see all orders
  - Tap order → See details, tracking, status

- [ ] **Create Return Request**
  - Tap "Return" on order
  - Select reason, add description
  - Upload photos as proof
  - Tap "Submit Return"
  - Should see return number

- [ ] **Track Return Status**
  - Go to Returns section
  - Verify return status updates

### **9. Admin/Seller Verification** ✅
- [ ] **Verify Seller Account**
  - Go to admin panel (if admin)
  - View pending sellers
  - Check verification documents
  - Approve/reject seller
  - Verify email notification sent (check terminal)

### **10. Real-Time Updates** ⚡
- [ ] **Real-Time Notifications**
  - Have another user buy your product
  - Should see notification on device
  - Check backend for socket.io messages

- [ ] **Cart Updates**
  - Add item from one session
  - Add same item from another browser tab
  - Verify cart count updates in real-time

---

## **Error Handling & Edge Cases**

### **Network Issues** 🌐
- [ ] Disconnect WiFi → App shows offline message
- [ ] Reconnect WiFi → Auto-retry failed requests
- [ ] Verify backend error responses are handled gracefully

### **Form Validation** ✔️
- [ ] Try submitting empty form → Error message appears
- [ ] Enter invalid email → Error shown
- [ ] Enter mismatched passwords → Error shown
- [ ] Enter non-numeric quantity → Blocked or converted

### **Image Upload Errors** 🖼️
- [ ] Try uploading very large image → Error shown
- [ ] Try uploading non-image file → Error shown
- [ ] Upload fails (network issue) → Retry button appears

### **Payment Errors** 💳
- [ ] Use invalid card → Paystack shows error
- [ ] Cancel payment midway → App returns to checkout
- [ ] Network fails during payment → Graceful error handling

---

## **Performance Checks** 🚀
- [ ] App starts in < 5 seconds
- [ ] Product list scrolls smoothly
- [ ] Images load without jank
- [ ] No lag when typing in forms
- [ ] Chat messages send within 2 seconds

---

## **Device-Specific Tests** 📱
- [ ] **Portrait Mode** - All screens display correctly
- [ ] **Landscape Mode** - UI adjusts properly
- [ ] **Keyboard** - Forms are usable, no input overlap
- [ ] **Notifications** - Sound/vibration works (if enabled)
- [ ] **Back Button** - Navigation stack works correctly

---

## **Terminal Logs to Monitor** 📋

### **Backend (Running on Port 8082)**
- Look for API request logs: `POST /auth/api/signup`, `POST /marketplace/api/products`, etc.
- Look for database operations: `✅ MongoDB connected`
- Look for error logs if requests fail

### **Expo (Metro Bundler)**
- Look for compilation errors: Red warnings/errors in terminal
- Look for module resolution issues

---

## **If Something Breaks** 🔧

### **App Crashes or Won't Load**
1. Check **terminal for error messages** (backend & Expo)
2. Restart Expo: Press `Ctrl+C` in Expo terminal, then `npm start` again
3. Force refresh in Expo Go: Shake device → "Reload" button

### **Backend Not Reachable ("Could not reach backend")**
1. Verify backend is still running: Check terminal at port 8082
2. Verify Android & PC are on **same WiFi**
3. Check firewall: Windows Firewall might be blocking port 8082
4. Restart backend server

### **Image Upload Fails**
1. Check ImageKit API key is correct in `.env.local`
2. Check Cloudinary credentials if using dating chat
3. Check internet connection on device

### **Payment Won't Process**
1. Verify Paystack public key in `.env.local`
2. Use test card: `4111 1111 1111 1111`
3. Check browser console for Paystack errors

---

## **Notes & Observations**
- **Add notes here as you test**
- What works well?
- What's slow or broken?
- UI/UX improvements?

---

## **Ready to Test?**

1. ✅ Scan QR code in Expo Go
2. ✅ Wait for app to load (may take 30-60 seconds first time)
3. ✅ Follow checklist above
4. ✅ Report findings!

**Good luck! 🚀**
