#!/bin/bash

# Production Build Setup Script
# This script sets up the environment for Play Store production build

echo "🚀 Facebook Marketplace - Production Build Setup"
echo "=================================================="

# Check Node version
echo "📌 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node version: $NODE_VERSION"

# Check if Android SDK is installed
echo "📌 Checking Android SDK..."
if [ -n "$ANDROID_SDK_ROOT" ]; then
    echo "   ✅ Android SDK found: $ANDROID_SDK_ROOT"
else
    echo "   ⚠️  ANDROID_SDK_ROOT not set. Android Studio required."
fi

# Install dependencies
echo ""
echo "📌 Installing dependencies..."
npm install --legacy-peer-deps

# Install backend dependencies
echo "📌 Installing backend dependencies..."
cd backend && npm install --legacy-peer-deps && cd ..

# Clear cache
echo ""
echo "📌 Clearing cache..."
npm cache clean --force

# Prebuild for Android
echo ""
echo "📌 Prebuilding for Android..."
npx expo prebuild --platform android --clean

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
    echo ""
    echo "📌 Creating .env.production file..."
    cat > .env.production << 'EOF'
# Production Configuration
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_LOG_LEVEL=error
EOF
    echo "   ⚠️  Update EXPO_PUBLIC_API_URL in .env.production"
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📌 Creating .env file..."
    cat > .env << 'EOF'
# Development Configuration
EXPO_PUBLIC_API_URL=http://192.168.1.100:8082
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_LOG_LEVEL=debug
EOF
    echo "   Update 192.168.1.100 with your development server IP"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update API URLs in .env and .env.production"
echo "2. Ensure Android Keystore is created (if first time)"
echo "3. Run: npm run build:android"
echo "4. Upload AAB to Play Console"
echo ""
echo "For detailed instructions, see: PLAY_STORE_BUILD_GUIDE.md"
