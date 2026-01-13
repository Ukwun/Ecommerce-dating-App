# Next Steps After Downloading JSON Key

## Step 1: Place JSON Key in Project Root ✓ REQUIRED

Your JSON key file needs to be in the project root directory.

**Location:** `C:\dev\facebook-marketplace\Facebook Marketplace App\google-play-key.json`

If your JSON key is in Downloads or elsewhere, copy it to the project root:
```powershell
Copy-Item "C:\Users\LENOVO 1\Downloads\your-key.json" -Destination "c:\dev\facebook-marketplace\Facebook Marketplace App\google-play-key.json"
```

**Verify it's there:**
```powershell
Test-Path "c:\dev\facebook-marketplace\Facebook Marketplace App\google-play-key.json"
# Should return: True
```

---

## Step 2: Create Expo Account (if you don't have one)

Visit: https://expo.io

1. Sign up with email or GitHub
2. Verify email
3. Keep credentials handy for next step

---

## Step 3: Login to EAS (Expo Account)

Run this command:
```bash
cd "c:\dev\facebook-marketplace\Facebook Marketplace App"
eas login
```

When prompted:
- Enter your Expo username or email
- Enter your password
- Optionally save credentials

**Expected output:**
```
✓ Logged in as: your-username
```

---

## Step 4: Check Project Configuration

Verify `eas.json` is configured:

```bash
cat eas.json
```

It should show production build type as `aab` (Android App Bundle)

---

## Step 5: Create Expo App Project (First Time Only)

```bash
eas project:create
```

This creates the project on Expo's servers and generates a project ID.

---

## Step 6: Build the App with EAS (Cloud Build)

```bash
eas build --platform android --build-type production
```

**What happens:**
- EAS uploads your source code to cloud servers
- Builds the production AAB file (no local Android SDK needed!)
- Shows you build ID
- Provides download link
- Takes 10-30 minutes

**Save the BUILD_ID shown in output - you'll need it next**

---

## Step 7: Submit to Google Play

Once build is complete:

```bash
eas submit --platform android --build-id <YOUR_BUILD_ID> --track internal
```

Replace `<YOUR_BUILD_ID>` with the ID from Step 6.

**What happens:**
- Uses your google-play-key.json for authentication
- Uploads AAB to Google Play Console
- Creates internal testing release
- App ready for testing

---

## Troubleshooting

### "google-play-key.json not found"
- Verify file is in project root
- Run: `ls google-play-key.json` 
- Make sure filename is exactly: `google-play-key.json` (lowercase, with hyphen)

### "Not authenticated"
- Run: `eas logout`
- Then: `eas login`
- Check credentials are correct

### "Project not found"
- Run: `eas project:create`
- Link to existing project if asked

### Build fails
- Run with verbose: `eas build --platform android --build-type production --verbose`
- Check internet connection
- Check EAS status: https://status.expo.io

---

## Summary of Commands (In Order)

```bash
# 1. Verify JSON key
Test-Path "google-play-key.json"

# 2. Login to Expo
eas login

# 3. Create project (first time)
eas project:create

# 4. Build on cloud
eas build --platform android --build-type production

# 5. Submit to Google Play (after build complete)
eas submit --platform android --build-id <BUILD_ID> --track internal
```

---

## Next Actions

1. ✅ Download JSON key (DONE)
2. 📌 Place JSON key in project root (NEXT)
3. 📌 Login to EAS
4. 📌 Build with EAS
5. 📌 Submit to Google Play
6. 📌 Configure store listing
7. 📌 Test internal release
8. 📌 Submit for production review

You're at step 2! Let me know once JSON key is in place and we'll proceed.
