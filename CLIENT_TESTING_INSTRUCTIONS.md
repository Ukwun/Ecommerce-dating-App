# 📱 CLIENT TESTING INSTRUCTIONS - Facebook Marketplace App

## ✅ Before You Start

- ✅ Your phone is connected to the **same WiFi network** as the developer's machine
- ✅ You have Android 6.0 or newer (check: Settings → About → Android version)
- ✅ You have stable internet connection

---

## 🚀 QUICK START (2 Minutes)

### **Step 1: Install Expo Go**
1. Open **Google Play Store** on your Android phone
2. Search for: **"Expo Go"** (by Expo)
3. Tap **Install**
4. Wait for installation to complete (~1-2 min)

### **Step 2: Get the Testing Link from Developer**
Ask the developer for **ONE of these**:
- A **QR Code** (easiest)
- A **URL** like `exp://192.168.0.xxx:19000`
- An **Email** with the link

### **Step 3: Open App in Expo Go**

**Option A: Scan QR Code (Easiest)**
1. Open **Expo Go** app
2. Point your phone camera at the QR code
3. Tap the notification that appears
4. App loads automatically (~10-20 seconds)
5. **Done!** Start testing

**Option B: Enter URL Manually**
1. Open **Expo Go** app
2. Tap **Scan QR Code** or search icon
3. Tap **"Enter URL manually"**
4. Paste the link the developer sent
5. Tap **Open**
6. App loads (~10-20 seconds)
7. **Done!** Start testing

**Option C: Search Projects**
1. Open **Expo Go** app
2. Tap **Projects** or search icon
3. Enter the URL/project name
4. Wait for app to load
5. **Done!** Start testing

---

## 📋 WHAT TO TEST

### **Create Account**
```
1. When app opens, you'll see Login or Sign Up screen
2. Tap "Sign Up" or "Create Account"
3. Fill in:
   - Name:     Your name (e.g., "John Doe")
   - Email:    Your email (e.g., "john@example.com")
   - Password: Any password (e.g., "Test123456")
4. Tap "Sign Up" button
5. You should be logged in automatically
6. If it fails, write down the error message
```

✅ **What success looks like:**
- No error message
- App shows marketplace/home screen
- You see products or dashboard

### **Login Test**
```
1. Tap your profile icon (top right) or menu
2. Tap "Logout"
3. You're back at Login screen
4. Use the email/password you just created
5. Tap "Login"
6. You should be logged in again
7. If it fails, write down the error message
```

✅ **What success looks like:**
- Logs in successfully
- Shows your profile/dashboard
- No errors

### **Browse Products**
```
1. Tap "Home" or "Marketplace" tab
2. Scroll down to see products
3. Try searching for "phone" or any word
4. Try filtering by category
5. Tap on a product to see details
6. Go back and try another product
```

✅ **What success looks like:**
- Products load with images, prices, ratings
- Search works instantly
- Tapping products shows details
- No loading delays

### **Shopping Cart**
```
1. Find a product and view details
2. Tap "Add to Cart" or shopping cart icon
3. Go to your Cart (usually bottom navigation)
4. You should see the product you added
5. Try:
   - Increase quantity
   - Remove item
   - Go back to browse
6. Add another product
```

✅ **What success looks like:**
- Products add to cart without errors
- Cart shows all items with prices
- Quantity changes work
- Remove button works

### **Checkout Flow**
```
1. In Cart, tap "Proceed to Checkout" or similar
2. Review order summary
3. Enter/select shipping address
4. Review total price
5. Tap "Place Order" or "Checkout"
6. You should see confirmation
```

✅ **What success looks like:**
- Form fields accept input smoothly
- No errors or crashes
- Shows order confirmation

### **Messaging (if available)**
```
1. Tap "Messages" or "Chat" tab
2. Start a conversation
3. Type a test message
4. Send it
5. Look for it to appear immediately
```

✅ **What success looks like:**
- Message appears immediately
- No "failed to send" errors
- Reply system works

### **Overall Performance**
- ⏱️ Does the app feel fast or slow?
- 🖼️ Do images load quickly?
- 🔍 Does text search work instantly?
- ❌ Does anything crash or freeze?

---

## 🐛 REPORTING BUGS

If you find a problem, tell the developer:

### **Required Info:**
```
1. What were you doing when it happened?
   Example: "I was trying to add a product to cart"

2. What happened instead?
   Example: "Button didn't work, nothing happened"

3. What error message (if any)?
   Example: "Connection timeout" or "Invalid response"

4. Your phone:
   - Brand/Model (e.g., Samsung Galaxy A12)
   - Android version (Settings → About → Android version)
   - WiFi network name (e.g., "MyNetwork")

5. Screenshots (if possible)
   - Tap volume down + power button together
   - Share with developer
```

### **Report Format:**
```
Bug: [Short title]
What I did: [Steps]
What happened: [Result]
Expected: [What should happen]
Error message: [Exact error text]
Phone: [Device + Android version]
Screenshot: [Yes/No]
```

---

## ⚠️ IF SOMETHING GOES WRONG

### **"App won't load" or "Connection timeout"**
✅ **Solution:**
1. Close Expo Go completely
2. Check WiFi: Are you on same network as developer?
3. Make sure you're in same room (or nearby)
4. Ask developer to restart the server
5. Reopen Expo Go and try again

### **"QR Code won't scan"**
✅ **Solution:**
1. Try entering URL manually instead
2. Ask developer for the URL
3. In Expo Go, tap search, tap "Enter URL manually"
4. Paste the URL they give you

### **"App crashes when I open it"**
✅ **Solution:**
1. Wait 30 seconds
2. Close Expo Go completely
3. Open it again
4. Tell developer the crash happened

### **"App installed but won't open"**
✅ **Solution:**
1. Uninstall the APK (Settings → Apps → Uninstall)
2. Ask developer to send new APK link
3. Reinstall and try again

### **"Everything is slow"**
✅ **Solution:**
1. Check your internet speed (download speed test app)
2. Restart your phone
3. Move closer to WiFi router
4. Ask others to reduce network usage
5. Wait a moment and retry

---

## 📞 CONTACTING THE DEVELOPER

If you find a critical bug or issue:

**Email:** [Developer email]  
**Phone:** [Developer phone]  
**Response time:** Usually within [X hours]

Please include:
- What went wrong (clear description)
- Error message (exact text)
- Steps to reproduce (so they can test)
- Your device info (phone model + Android version)

---

## 🎉 THANK YOU!

Your testing feedback helps us build a better app for everyone!

### Quick Reminder:
- ✅ Keep WiFi connected
- ✅ Keep app open while testing
- ✅ Test different features, not just one
- ✅ Report everything you find odd
- ✅ Be patient - this is early testing phase

---

## 📱 Expo Go Install Link

If you missed the Play Store link:
https://play.google.com/store/apps/details?id=host.exp.exponent

---

**Happy Testing! 🚀**
