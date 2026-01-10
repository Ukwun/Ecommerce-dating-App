# ⚙️ Environment Configuration Guide

## Backend Configuration (.env file)

Create a `.env` file in the `backend/` folder with the following variables:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/facebook_marketplace_db

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_EXPIRE=7d

# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# Server
NODE_ENV=development
PORT=8082
CORS_ORIGIN=*

# Email Service (Optional - for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary (for image uploads)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Frontend Configuration

### Using Axios Instance

Update `utils/axiosinstance.tsx`:

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Add token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      SecureStore.deleteItemAsync('auth_token');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### Environment Variables (.env.local)

Create `.env.local` in the project root:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.100:8082
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key_here
EXPO_PUBLIC_SOCKET_URL=http://192.168.0.100:8082
EXPO_PUBLIC_APP_ENV=development
```

**Note**: For Android/iOS local testing, use your machine's IP address (not localhost)

## Configuration by Environment

### Development

**Backend .env:**
```bash
NODE_ENV=development
PORT=8082
MONGO_URI=mongodb://localhost:27017/facebook_marketplace
JWT_SECRET=dev_secret_key_12345678901234567890
PAYSTACK_SECRET_KEY=sk_test_your_test_key
CORS_ORIGIN=*
```

**Frontend .env.local:**
```bash
EXPO_PUBLIC_API_URL=http://192.168.0.100:8082
EXPO_PUBLIC_APP_ENV=development
```

### Production

**Backend .env:**
```bash
NODE_ENV=production
PORT=8082
MONGO_URI=mongodb+srv://prod_user:prod_pass@prod_cluster.mongodb.net/facebook_marketplace_prod
JWT_SECRET=prod_secret_key_min_32_characters_please
PAYSTACK_SECRET_KEY=sk_live_your_production_key
PAYSTACK_PUBLIC_KEY=pk_live_your_production_key
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

**Frontend .env.local:**
```bash
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_APP_ENV=production
```

---

## Database Setup

### MongoDB Atlas

1. **Create Account**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create Cluster**:
   - Choose free tier (M0)
   - Select region closest to your users
   - Create database named `facebook_marketplace_db`

3. **Add Database User**:
   - Go to Database Access
   - Create user with username and password
   - Grant read/write to any database

4. **Add IP Whitelist**:
   - Go to Network Access
   - Allow access from your IP (or 0.0.0.0/0 for development)

5. **Get Connection String**:
   - Click "Connect" on cluster
   - Choose "Drivers"
   - Copy connection string and add to .env as `MONGO_URI`

### MongoDB Local (Development)

```bash
# Windows - Use MongoDB Compass or:
mongod

# Connection string:
MONGO_URI=mongodb://localhost:27017/facebook_marketplace
```

---

## Paystack Setup

### Get API Keys

1. **Create Account**: [paystack.com](https://dashboard.paystack.com)

2. **Get Keys**:
   - Dashboard → Settings → API Keys
   - Copy `Secret Key` and `Public Key`
   - Add to .env files

3. **Set Webhook URL**:
   - Settings → Webhook
   - URL: `https://yourdomain.com/marketplace/api/payments/webhook`
   - Events: Charge successful

4. **Test Mode**:
   - Use test keys first
   - Test card: 4111 1111 1111 1111
   - Any expiry date in future
   - Any CVC

---

## Email Service Setup (Optional)

### Gmail Configuration

1. **Enable 2-Factor Authentication**:
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Security → App Passwords
   - Select "Mail" and "Windows Computer"
   - Generate and copy password

3. **Add to .env**:
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx  # App password from step 2
```

---

## Image Storage Setup (Optional)

### Cloudinary

1. **Create Account**: [cloudinary.com](https://cloudinary.com)

2. **Get Credentials**:
   - Dashboard → Account Details
   - Copy Cloud Name, API Key, API Secret

3. **Add to .env**:
```bash
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Start Development Servers

### Terminal 1: Backend

```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:8082
```

### Terminal 2: Frontend

```bash
npm install
npm run android  # or npm run ios
```

---

## Verification Checklist

After setting up configuration:

- [ ] MongoDB connected (check console logs)
- [ ] JWT secret configured (min 32 characters)
- [ ] Paystack keys set in .env
- [ ] Frontend .env.local created with API_URL
- [ ] Backend server starts without errors
- [ ] Frontend connects to backend API
- [ ] Can login successfully
- [ ] Can create product without errors
- [ ] Can add to cart and see real data
- [ ] Payment initialization works

---

## Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions**:
- Make sure MongoDB is running: `mongod`
- Check MongoDB Atlas IP whitelist includes your IP
- Verify MONGO_URI in .env is correct

### CORS Error

```
Access to XMLHttpRequest blocked by CORS
```

**Solutions**:
- Add frontend URL to backend CORS_ORIGIN in .env
- For development: `CORS_ORIGIN=*`
- For production: `CORS_ORIGIN=https://yourdomain.com`

### JWT Token Invalid

```
Error: jwt malformed
```

**Solutions**:
- Ensure JWT_SECRET is set in backend .env
- Check frontend includes "Bearer" in auth header
- Verify token is stored correctly in SecureStore

### Paystack Payment Fails

```
Error: Invalid Paystack Secret Key
```

**Solutions**:
- Double-check PAYSTACK_SECRET_KEY is from production/test environment matching
- Use test keys for development
- Use live keys for production

### Port Already in Use

```
Error: listen EADDRINUSE :::8082
```

**Solutions**:
- Change PORT in .env to 8083 or another port
- Kill process using port: `lsof -i :8082` then `kill -9 <PID>`

---

## Production Checklist

Before deploying to production:

- [ ] Change NODE_ENV to 'production'
- [ ] Use production MongoDB cluster
- [ ] Use production Paystack keys (not test keys)
- [ ] Set strong JWT_SECRET (min 32 random characters)
- [ ] Configure CORS_ORIGIN with your domain
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Test all API endpoints
- [ ] Load test the application
- [ ] Set up error tracking (Sentry)
- [ ] Configure rate limiting

---

## Helpful Commands

```bash
# Start backend in development
cd backend && npm run dev

# Start backend with nodemon (watch mode)
cd backend && npm install -g nodemon && nodemon server.js

# Check if MongoDB is running
mongostat

# Test API endpoint
curl http://localhost:8082/marketplace/api/products

# View environment variables
cat .env

# Restart Node process on port 8082
lsof -i :8082
kill -9 <PID>
```

---

**Configuration Status**: ✅ Complete
**Last Updated**: January 10, 2026
