# Client-Safe Testing Package (3 Clients)

Use this package exactly as written for reliable client testing.

## Recommended Distribution Method

Use the EAS APK link as the primary method.

Reason:
- Works for remote clients anywhere.
- Does not require same Wi-Fi as your laptop.
- Does not depend on your laptop being online during testing.

Primary APK link:
https://expo.dev/artifacts/eas/a9pZd8UPDBXuraXGF3xhk4.apk

Build page:
https://expo.dev/accounts/ukwun1/projects/marketplace/builds/4a0efaef-eb66-4ff5-80a7-f600d82f6d69

## Optional Backup Method (Expo Go)

Use this only if you want live debugging sessions while you are online.

Requirements:
- You must run the app with tunnel mode.
- Your laptop must stay online.
- Expo server must remain running.

Command:

npx expo start --tunnel -c

Then share the tunnel QR or tunnel URL shown by Expo.

## Copy-Paste Message To Send To All 3 Clients

Subject: Marketplace App Test Access

Hi, please use this link to install the test app on your Android phone:
https://expo.dev/artifacts/eas/a9pZd8UPDBXuraXGF3xhk4.apk

Steps:
1. Open the link in Chrome.
2. Download the APK.
3. Tap the APK file and allow install from unknown apps.
4. Open the app and sign up with your email.
5. Test for 20 to 30 minutes.

Please test these flows:
1. Sign up and login.
2. Browse products and open product details.
3. Add and remove items from cart.
4. Open favorites and add/remove favorites.
5. Open notifications.
6. Checkout flow (test mode only).

If anything fails, send me:
1. A screenshot.
2. What you tapped.
3. Exact error text.
4. Your phone model and Android version.

Important:
- This APK method is preferred over Expo Go for reliable access.

## Your Operator Checklist (Before Sending)

1. Confirm backend is live:
https://ecommerce-dating-app.onrender.com/health

2. Confirm latest build is intended for clients (if you created a newer build, send the newer link).

3. Send same APK link and same instructions to all 3 clients.

4. Track responses in this format:
- Client name
- Installed (Yes/No)
- Signed up (Yes/No)
- Cart test (Pass/Fail)
- Favorites test (Pass/Fail)
- Notifications (Pass/Fail)
- Checkout (Pass/Fail)
- Bug notes

## If Client Says "Link Not Opening"

1. Tell them to open link in Chrome (not inside some messaging app webview).
2. Ask them to disable data saver and retry.
3. Ask them to try the build page link instead:
https://expo.dev/accounts/ukwun1/projects/marketplace/builds/4a0efaef-eb66-4ff5-80a7-f600d82f6d69
4. As backup, use Expo Go tunnel while you are online:
- Start: npx expo start --tunnel -c
- Share tunnel URL/QR.
