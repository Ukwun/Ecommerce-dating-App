#!/usr/bin/env pwsh

<#
  .SYNOPSIS
  Automated APK Builder for Facebook Marketplace App
  
  .DESCRIPTION
  Builds APK automatically with backend URL configuration
  
  .PARAMETER BackendUrl
  Backend URL for the APK (default: http://192.168.70.160:8082)
  Use ngrok URL for remote clients (e.g., https://abc123-xyz789.ngrok.io)
  
  .EXAMPLE
  .\build-apk.ps1
  .\build-apk.ps1 -BackendUrl "https://abc123-xyz789.ngrok.io"
#>

param(
    [string]$BackendUrl = "http://192.168.70.160:8082"
)

$ErrorActionPreference = "Stop"
$WarningPreference = "SilentlyContinue"

Write-Host "`n" + "="*60
Write-Host "🚀 FACEBOOK MARKETPLACE APP - AUTOMATED APK BUILDER"
Write-Host "="*60 + "`n"

# Colors
$Success = "Green"
$Error_Color = "Red"
$Warning = "Yellow"
$Info = "Cyan"

# Step 1: Check Node.js
Write-Host "📋 Step 1: Verifying Prerequisites..." -ForegroundColor $Info
$nodeVersion = node -v 2>&1
if ($?) {
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor $Success
} else {
    Write-Host "  ❌ Node.js not found" -ForegroundColor $Error_Color
    exit 1
}

# Step 2: Check Backend
Write-Host "`n📋 Step 2: Checking Backend Server..." -ForegroundColor $Info
$backendCheck = Invoke-WebRequest -Uri "$BackendUrl/" -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($backendCheck.StatusCode -eq 200) {
    Write-Host "  ✅ Backend is online: $BackendUrl" -ForegroundColor $Success
} else {
    Write-Host "  ⚠️  Backend may not be running at $BackendUrl" -ForegroundColor $Warning
    Write-Host "     Make sure to run: cd backend && npm start" -ForegroundColor $Warning
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# Step 3: Update Environment
Write-Host "`n📋 Step 3: Configuring Environment Variables..." -ForegroundColor $Info
$envFile = ".env.local"
$envContent = @"
EXPO_PUBLIC_BACKEND_URL=$BackendUrl
EXPO_PUBLIC_SERVER_URI=$BackendUrl
"@

Set-Content -Path $envFile -Value $envContent
Write-Host "  ✅ Updated $envFile" -ForegroundColor $Success
Write-Host "     Backend URL: $BackendUrl" -ForegroundColor $Info

# Step 4: Install Dependencies
Write-Host "`n📋 Step 4: Installing Dependencies..." -ForegroundColor $Info
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm packages..." -ForegroundColor $Info
    npm install
    Write-Host "  ✅ Dependencies installed" -ForegroundColor $Success
} else {
    Write-Host "  ✅ Dependencies already installed" -ForegroundColor $Success
}

# Step 5: Cache Clean
Write-Host "`n📋 Step 5: Cleaning Cache..." -ForegroundColor $Info
expo-cache-clean 2>&1 | Out-Null
Write-Host "  ✅ Cache cleaned" -ForegroundColor $Success

# Step 6: Build APK
Write-Host "`n📋 Step 6: Building APK..." -ForegroundColor $Info
Write-Host "  This will take 3-5 minutes..." -ForegroundColor $Warning
Write-Host "  Backend: $BackendUrl`n" -ForegroundColor $Info

# Check if EAS credentials exist
$easLogin = eas whoami 2>&1
if (-not ($easLogin -like "*Error*")) {
    Write-Host "  Using EAS Cloud Build..." -ForegroundColor $Info
    eas build --platform android --local
} else {
    Write-Host "  ❌ EAS CLI not authenticated" -ForegroundColor $Error_Color
    Write-Host "  Please log in first: eas login" -ForegroundColor $Warning
    exit 1
}

Write-Host "`n" + "="*60
Write-Host "✅ APK BUILD COMPLETE!" -ForegroundColor $Success
Write-Host "="*60
Write-Host "`nAPK Location: ./build/output/app-release.apk"
Write-Host "Backend URL: $BackendUrl"
Write-Host "`nNext Steps:"
Write-Host "  1. Download APK from EAS"
Write-Host "  2. Install on device: adb install app-release.apk"
Write-Host "  3. Distribute to clients"
Write-Host "  4. Test signup/login`n"
