# 🔧 TECHNICAL GUIDE: Update Backend URLs in Codebase
## Step-by-Step Instructions for Fixing Hardcoded URLs

**Last Updated:** June 3, 2026  
**Purpose:** Update all instances of the failing Render backend to production URL  
**Estimated Time:** 30 minutes  
**Prerequisites:** Have your new backend URL ready (from Railway/Heroku/AWS)

---

## BEFORE YOU START

### Have These Ready
```
✓ New Backend URL (e.g., https://marketplace-prod-xyz.railway.app)
✓ VS Code open with the project
✓ Git ready to commit
```

### Example
Throughout this guide, we'll use this example:
```
OLD (Render - BROKEN):     https://ecommerce-dating-app.onrender.com
NEW (Production - FIXED):  https://marketplace-prod-xyz.railway.app
REPLACE ALL INSTANCES
```

---

## PART 1: Update eas.json (Build Configuration)

### File Location
```
c:\dev\facebook-marketplace\Facebook Marketplace App\eas.json
```

### Step 1: Open File
```
1. Open eas.json in VS Code
2. Find all "build" sections
3. Look for EXPO_PUBLIC_BACKEND_URL environment variables
```

### Step 2: Locate Changes Needed
Search for: `ecommerce-dating-app.onrender.com`

Should find 3+ instances in different build configurations:
- `preview` build (line ~8-10)
- `preview2` build (line ~18-20)
- `preview3` build (line ~28-30)
- `production` build (if exists)

### Step 3: Update Each Instance
```json
BEFORE:
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://ecommerce-dating-app.onrender.com",
        "EXPO_PUBLIC_SERVER_URI": "https://ecommerce-dating-app.onrender.com"
      }
    }
  }
}

AFTER:
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://YOUR_NEW_BACKEND_URL",
        "EXPO_PUBLIC_SERVER_URI": "https://YOUR_NEW_BACKEND_URL"
      }
    }
  }
}
```

### Quick Edit in VS Code
```
1. Press Ctrl+H (Find and Replace)
2. Find:    https://ecommerce-dating-app.onrender.com
3. Replace: https://YOUR_NEW_BACKEND_URL
4. Click "Replace All"
5. Save (Ctrl+S)
```

### Verification
After update, eas.json should have:
```json
✓ preview → EXPO_PUBLIC_BACKEND_URL = new URL
✓ preview2 → EXPO_PUBLIC_BACKEND_URL = new URL
✓ preview3 → EXPO_PUBLIC_BACKEND_URL = new URL
✓ production → EXPO_PUBLIC_BACKEND_URL = new URL
✓ preview → EXPO_PUBLIC_SERVER_URI = new URL
✓ preview2 → EXPO_PUBLIC_SERVER_URI = new URL
✓ preview3 → EXPO_PUBLIC_SERVER_URI = new URL
✓ production → EXPO_PUBLIC_SERVER_URI = new URL
```

---

## PART 2: Update Signup Screen

### File Location
```
c:\dev\facebook-marketplace\Facebook Marketplace App\app\(routes)\signup\index.tsx
```

### Step 1: Open File
```
1. Open signup/index.tsx in VS Code
2. Search for "ecommerce-dating-app.onrender.com"
```

### Step 2: Locate Line (~24)
```typescript
const signupUser = async (data: SignupFormData) => {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ecommerce-dating-app.onrender.com';
  const endpoint = `${BACKEND_URL}/auth/api/user-registration`;
  // ...
};
```

### Step 3: Update
```typescript
// BEFORE:
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ecommerce-dating-app.onrender.com';

// AFTER:
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://YOUR_NEW_BACKEND_URL';
```

### Quick Edit
```
1. Ctrl+F Find: https://ecommerce-dating-app.onrender.com
2. Replace in this file only: https://YOUR_NEW_BACKEND_URL
3. Save (Ctrl+S)
```

---

## PART 3: Update Login Screen

### File Location
```
c:\dev\facebook-marketplace\Facebook Marketplace App\app\(routes)\login\index.tsx
```

### Step 1: Open File
```
1. Open login/index.tsx in VS Code
2. Search for "onrender.com"
```

### Step 2: Find All Instances
Login screen may have the backend URL in multiple places:
- Main login handler
- Google login handler
- Facebook login handler
- Social auth handlers

### Step 3: Update All Instances
Look for lines with:
```typescript
// Line ~23 (approximately)
axiosInstance.post('/auth/api/login', { email, password });

// Check if there's fallback URL:
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ecommerce-dating-app.onrender.com';
```

### Update
```typescript
// If found, update:
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://YOUR_NEW_BACKEND_URL';
```

### Quick Edit
```
1. Ctrl+F Find: https://ecommerce-dating-app.onrender.com
2. Replace: https://YOUR_NEW_BACKEND_URL
3. Save
```

---

## PART 4: Update Axios Instance (API Configuration)

### File Location
```
c:\dev\facebook-marketplace\Facebook Marketplace App\utils\axiosinstance.tsx
```

### Step 1: Open File
```
1. Open axiosinstance.tsx in VS Code
2. Search for "RENDER_URL"
```

### Step 2: Locate Lines (~19)
```typescript
const RENDER_URL = 'https://ecommerce-dating-app.onrender.com';

// Priority: Explicit Environment variable > Render URL.
let resolvedBase = process.env.EXPO_PUBLIC_BACKEND_URL || RENDER_URL;
```

### Step 3: Update
```typescript
// BEFORE:
const RENDER_URL = 'https://ecommerce-dating-app.onrender.com';

// AFTER:
const RENDER_URL = 'https://YOUR_NEW_BACKEND_URL';
```

### Quick Edit
```
1. Ctrl+F Find: https://ecommerce-dating-app.onrender.com
2. Replace: https://YOUR_NEW_BACKEND_URL
3. Save
```

---

## PART 5: Find & Update Other Hardcoded URLs

### Search Entire Project
```
Use VS Code Find in Files:
1. Press Ctrl+Shift+F (Find in Files)
2. Search: ecommerce-dating-app.onrender.com
3. Should find ~10-15 matches
```

### Expected Results
```
✓ eas.json (3-4 matches)
✓ app/(routes)/signup/index.tsx (1 match)
✓ app/(routes)/login/index.tsx (1-2 matches)
✓ utils/axiosinstance.tsx (1 match)
✓ app/(routes)/signup-otp/index.tsx (1 match - if exists)
✓ app/(seller)/dashboard.tsx (1-2 matches - if hardcoded)
✓ app/(admin)/dashboard.tsx (1-2 matches - if hardcoded)
✓ app/(routes)/products/detail.tsx (1 match - if hardcoded)
✓ Other screens (depends on implementation)
```

### Replace All
```
1. Ctrl+Shift+F to open Find in Files
2. Type: ecommerce-dating-app.onrender.com
3. Click "Replace All" (Replace icon on left)
4. Enter: https://YOUR_NEW_BACKEND_URL
5. Click "Replace All"
6. Verify count of replacements (should be 10-15)
```

### Manual Verification
After "Replace All", search again to verify all are replaced:
```
1. Ctrl+Shift+F
2. Search: ecommerce-dating-app.onrender.com
3. Should find: 0 matches ✓
```

---

## PART 6: Verify Changes

### Checklist
```
✓ eas.json has new URL (check all 3 build configs)
✓ signup/index.tsx has new URL
✓ login/index.tsx has new URL
✓ axiosinstance.tsx has new URL
✓ All hardcoded URLs replaced
✓ No remaining instances of old URL
```

### Quick Verification Script
```bash
# Search for any remaining old URL:
grep -r "ecommerce-dating-app.onrender.com" .

# Should return: 0 results (no output)
```

### Manual Check
```
1. Open each file mentioned above
2. Search (Ctrl+F): onrender.com
3. Should find 0 results in EACH file
```

---

## PART 7: Commit Changes to Git

### Step 1: Stage Changes
```bash
# From terminal in VS Code:
git add .

# Or select files manually in VS Code
```

### Step 2: Create Commit Message
```bash
git commit -m "Fix: Replace Render backend URL with production hosting

- Updated eas.json (all 3 build configs)
- Updated app/(routes)/signup/index.tsx
- Updated app/(routes)/login/index.tsx
- Updated utils/axiosinstance.tsx
- Updated all other hardcoded backend URLs

This fixes authentication failures for 6 clients by using production-grade backend instead of free-tier Render service.

Render free tier goes to sleep after 15 minutes inactivity, causing all auth requests to timeout. Production hosting ensures reliable uptime.

Closes: Authentication blocking issue
"
```

### Step 3: Push to Git
```bash
git push origin main

# Or if working on a branch:
git push origin your-branch-name
```

---

## PART 8: Build New APK

### Step 1: Make Sure All Changes Saved
```
1. Ctrl+S to save all files
2. No unsaved indicators (●) in tabs
```

### Step 2: Build APK
```bash
# Run from terminal:
eas build --platform android --build-type apk

# Output will show build ID (save this)
# Wait 10-15 minutes for build to complete
```

### Step 3: Monitor Build
```bash
# To see logs while building:
eas build --platform android --build-type apk --logs

# Or check status:
eas build:list --platform android

# When complete, download APK from EAS dashboard
```

### Step 4: Download APK
```bash
# After build completes, you'll get a link:
# https://expo.dev/artifacts/eas/...apk

# Download and save locally
```

---

## PART 9: Test Backend Health Before Sharing

### Test 1: Health Endpoint
```bash
# In browser or Terminal:
curl https://YOUR_NEW_BACKEND_URL/health

# Expected Response:
{
  "status": "ok",
  "message": "Backend server is running and accessible",
  "timestamp": "2026-06-03T10:30:00.000Z"
}
```

### Test 2: Authentication Endpoint
```bash
# In Terminal:
curl -X POST https://YOUR_NEW_BACKEND_URL/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Expected Response (non-existent user):
{
  "success": false,
  "error": "Invalid credentials"
}

# If you see timeout or 502 error:
# → Backend not deployed correctly
# → Try restarting backend service
# → Check backend logs for errors
```

### Test 3: Signup Endpoint
```bash
curl -X POST https://YOUR_NEW_BACKEND_URL/auth/api/user-registration \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@test.com",
    "password":"test123",
    "acceptedTerms":true
  }'

# Expected Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": { "id": "...", "name": "Test User", "email": "test@test.com" }
}
```

### If Tests Fail
```
❌ Timeout (60 seconds)
   → Backend not running
   → Check backend server status
   → Restart if needed

❌ 502 Bad Gateway
   → Backend crashed
   → Check backend logs
   → Redeploy if needed

❌ Connection refused
   → Wrong URL
   → URL typo
   → Backend service down

✓ Tests pass → Backend is ready
```

---

## PART 10: Share APK with Clients

### Prepare Testing Package
```
1. Download new APK
2. Get APK file size (should be ~50-100MB)
3. Document build info:
   - Build ID: [from EAS]
   - Build date: June 3, 2026
   - Backend URL: [your production URL]
   - Changes: Fixed authentication timeouts
```

### Share Instructions
```
Give each client:
1. APK file link (or download from EAS)
2. Installation instructions (if needed)
3. Testing instructions:
   - Install on real device
   - Test email signup
   - Test email login
   - Test Google signup
   - Test Facebook signup
   - Report any errors
4. Your contact info for issues
```

### Testing Checklist for Clients
```
CLIENT TESTING CHECKLIST:

□ APK installed successfully
□ App opens without crashes
□ Can tap "Sign Up"
□ Can enter email
□ Can enter password
□ Can click "Create Account"
□ See success message (not timeout)
□ Get logged in to home screen

□ Can log out
□ Can tap "Log In"
□ Can enter credentials
□ Can click "Login"
□ See home screen (not timeout)

□ Can tap "Sign Up with Google"
□ Google auth works (not timeout)

□ Can tap "Sign Up with Facebook"
□ Facebook auth works (not timeout)

REPORT ANY ERRORS:
- Screenshot of error
- Error message (exact text)
- Device model & Android version
- Network type (WiFi, 4G, 5G)
- Time when error occurred
```

---

## TROUBLESHOOTING

### Issue: "Could not reach backend" timeout
```
✗ Problem: Still seeing timeout errors
✓ Solution:
  1. Verify eas.json was updated (3 places)
  2. Verify new APK was built (not using old cached version)
  3. Test backend health: curl https://URL/health
  4. Check backend logs for errors
  5. Verify new URL is correct (no typos)
```

### Issue: APK built but auth still fails
```
✗ Problem: New APK built, but still timeout
✓ Solution:
  1. Delete old APK from device
  2. Uninstall old app from device
  3. Restart device
  4. Install new APK from EAS
  5. Clear app cache
  6. Try again
```

### Issue: Some changes not applied
```
✗ Problem: Find still shows old URL in some files
✓ Solution:
  1. Check those specific files
  2. Manually update if needed
  3. Save all files
  4. Commit to git
  5. Rebuild APK
```

### Issue: Build fails in EAS
```
✗ Problem: eas build fails or stuck
✓ Solution:
  1. Check build logs: eas build:list
  2. If "Dependencies error": Run npm install
  3. If "Type error": Run npx tsc --noEmit
  4. Commit fixes to git
  5. Try building again
```

---

## SUMMARY

### Changes Made
✓ Updated eas.json (3+ instances)  
✓ Updated signup/index.tsx (1 instance)  
✓ Updated login/index.tsx (1-2 instances)  
✓ Updated axiosinstance.tsx (1 instance)  
✓ Updated other hardcoded URLs (~5-10 instances)  
✓ Total: ~12-18 changes across codebase  

### Files Modified
```
✓ eas.json
✓ app/(routes)/signup/index.tsx
✓ app/(routes)/login/index.tsx
✓ utils/axiosinstance.tsx
✓ app/(routes)/signup-otp/index.tsx (if hardcoded)
✓ Other seller/admin screens (if hardcoded)
```

### Expected Results
- APK built with new backend URL
- Authentication no longer times out
- Users in different cities can sign up
- Users in different cities can log in
- Google/Facebook auth works
- No more "Could not reach backend" errors

### Time Investment
```
URL replacement: 15-20 minutes
Build new APK: 15-20 minutes (waiting)
Test backend: 5-10 minutes
Share with clients: 10 minutes
Total: ~40-60 minutes
```

---

## QUICK REFERENCE

### Find & Replace Shortcuts
```bash
# VS Code
Ctrl+H              # Find and Replace
Ctrl+Shift+F        # Find in Files
Ctrl+Shift+H        # Replace in Files
```

### Git Shortcuts
```bash
git add .           # Stage all changes
git commit -m ""    # Commit with message
git push origin main # Push to main branch
```

### EAS Commands
```bash
eas build --platform android --build-type apk   # Build APK
eas build:list                                    # List builds
eas build --platform android --build-type apk --logs  # Watch logs
```

---

**Completed:** ✓ Ready to proceed with build  
**Next Step:** Build new APK with eas build command  
**Time Estimate:** 1 hour total (including wait time for build)

