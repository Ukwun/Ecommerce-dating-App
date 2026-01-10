# 🔗 Frontend-Backend Integration Guide

## Backend Endpoints Summary

### Base URL
```
Development: http://localhost:8082
Production: https://your-api-domain.com
```

All endpoints prefixed with `/marketplace/api` except auth and dating endpoints.

---

## 1. Products API

### Get All Products
```typescript
GET /marketplace/api/products?category=Electronics&sortBy=newest&page=1&limit=20

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Product Name",
      "price": 50000,
      "discount": 10,
      "rating": 4.5,
      "reviews": 125,
      "thumbnail": "url",
      "images": ["url1", "url2"],
      "stock": 45,
      "seller": { "name": "Seller Name", "avatar": "url" }
    }
  ],
  "pagination": { "total": 100, "page": 1, "limit": 20, "pages": 5 }
}
```

### Get Single Product
```typescript
GET /marketplace/api/products/:id

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "iPhone 13",
    "description": "Latest model...",
    "category": "Electronics",
    "price": 500000,
    "rating": 4.8,
    "reviews": 2500,
    "views": 15000,
    "stock": 45,
    "seller": { /* seller data */ },
    "specifications": { "color": "Black", "storage": "256GB" },
    "images": ["url1", "url2", "url3"],
    "tags": ["phone", "apple", "latest"]
  }
}
```

### Create Product (Seller)
```typescript
POST /marketplace/api/products
Headers: Authorization: Bearer {token}

Body:
{
  "title": "iPhone 13",
  "description": "Latest iPhone model",
  "category": "Electronics",
  "price": 500000,
  "originalPrice": 550000,
  "stock": 10,
  "images": ["url1", "url2"],
  "thumbnail": "url1",
  "specifications": { "color": "Black", "storage": "256GB" },
  "tags": ["phone", "apple"]
}
```

---

## 2. Shopping Cart API

### Get Cart
```typescript
GET /marketplace/api/cart
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "user": "...",
    "items": [
      {
        "product": { /* product data */ },
        "quantity": 2,
        "price": 500000,
        "addedAt": "2026-01-10T..."
      }
    ],
    "subtotal": 1000000,
    "tax": 100000,
    "shippingCost": 1000,
    "discount": 0,
    "total": 1101000
  }
}
```

### Add to Cart
```typescript
POST /marketplace/api/cart/items
Headers: Authorization: Bearer {token}

Body:
{
  "productId": "60d5f3c3b3c3c3c3c3c3c3c3",
  "quantity": 2
}
```

### Update Cart Item
```typescript
PUT /marketplace/api/cart/items/:productId
Headers: Authorization: Bearer {token}

Body:
{
  "quantity": 5
}
```

### Remove from Cart
```typescript
DELETE /marketplace/api/cart/items/:productId
Headers: Authorization: Bearer {token}
```

### Clear Cart
```typescript
DELETE /marketplace/api/cart
Headers: Authorization: Bearer {token}
```

---

## 3. Orders API

### Create Order
```typescript
POST /marketplace/api/orders
Headers: Authorization: Bearer {token}

Body:
{
  "products": [
    {
      "product": "60d5f3c3b3c3c3c3c3c3c3c3",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos State",
    "postalCode": "100001",
    "country": "Nigeria",
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "shippingCost": 1000
}

Response:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "...",
    "orderNumber": "ORD-1673356800000-1",
    "user": "...",
    "products": [ /* product array */ ],
    "status": "pending",
    "subtotal": 1000000,
    "shippingCost": 1000,
    "tax": 100000,
    "total": 1101000,
    "payment": {
      "status": "pending",
      "method": "paystack"
    },
    "createdAt": "2026-01-10T..."
  }
}
```

### Get User Orders
```typescript
GET /marketplace/api/orders?status=pending&page=1&limit=10
Headers: Authorization: Bearer {token}

Response includes pagination and order list
```

### Get Single Order
```typescript
GET /marketplace/api/orders/:id
Headers: Authorization: Bearer {token}
```

### Cancel Order
```typescript
PUT /marketplace/api/orders/:id/cancel
Headers: Authorization: Bearer {token}
```

---

## 4. Payments API (Paystack Integration)

### Initialize Payment
```typescript
POST /marketplace/api/payments/initialize
Headers: Authorization: Bearer {token}

Body:
{
  "orderId": "60d5f3c3b3c3c3c3c3c3c3c3",
  "email": "user@example.com",
  "amount": 1101000
}

Response:
{
  "success": true,
  "message": "Payment initialized",
  "data": {
    "accessCode": "...",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "paystack_ref_code"
  }
}

// Frontend then redirects to authorizationUrl
```

### Verify Payment
```typescript
POST /marketplace/api/payments/verify
Headers: Authorization: Bearer {token}

Body:
{
  "reference": "paystack_reference_code"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "status": "success",
    "amount": 1101000,
    "reference": "paystack_ref_code"
  }
}
```

### Get Payments
```typescript
GET /marketplace/api/payments?status=success&page=1
Headers: Authorization: Bearer {token}
```

---

## 5. Wishlist API

### Add to Wishlist
```typescript
POST /marketplace/api/wishlist
Headers: Authorization: Bearer {token}

Body:
{
  "productId": "60d5f3c3b3c3c3c3c3c3c3c3"
}
```

### Get Wishlist
```typescript
GET /marketplace/api/wishlist?page=1&limit=20
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "product": { /* product data */ },
      "addedAt": "2026-01-10T..."
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 20, "pages": 1 }
}
```

### Check if in Wishlist
```typescript
GET /marketplace/api/wishlist/:productId/check
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "inWishlist": true
}
```

### Remove from Wishlist
```typescript
DELETE /marketplace/api/wishlist/:productId
Headers: Authorization: Bearer {token}
```

---

## 6. Messages API (Real-time Chat)

### Send Message
```typescript
POST /marketplace/api/messages
Headers: Authorization: Bearer {token}

Body:
{
  "recipientId": "60d5f3c3b3c3c3c3c3c3c3c3",
  "content": "Hi, interested in this product",
  "productId": "optional_product_id",
  "orderId": "optional_order_id"
}

Response:
{
  "success": true,
  "message": "Message sent",
  "data": {
    "_id": "...",
    "sender": { "name": "...", "avatar": "..." },
    "recipient": { "name": "...", "avatar": "..." },
    "content": "Hi, interested in this product",
    "read": false,
    "createdAt": "2026-01-10T..."
  }
}
```

### Get Conversation
```typescript
GET /marketplace/api/messages/:userId?page=1&limit=50
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "sender": { "name": "...", "avatar": "..." },
      "recipient": { "name": "...", "avatar": "..." },
      "content": "Message content",
      "read": true,
      "createdAt": "2026-01-10T..."
    }
  ]
}

// Note: All messages with this user are automatically marked as read
```

### Get All Conversations
```typescript
GET /marketplace/api/conversations
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "user": { "name": "...", "avatar": "..." },
      "lastMessage": "Last message text",
      "lastMessageTime": "2026-01-10T...",
      "unreadCount": 3
    }
  ]
}
```

### Mark Message as Read
```typescript
PUT /marketplace/api/messages/:messageId/read
Headers: Authorization: Bearer {token}
```

---

## Socket.io Events (Real-time)

Connect to WebSocket on same server:

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:8082');

// Join user room on connect
socket.on('connect', () => {
  socket.emit('join_user', { userId: 'user_id' });
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message from:', data.from);
  console.log('Message:', data.message);
});

// Listen for typing indicators
socket.on('user_typing', (data) => {
  console.log(data.userId, 'is typing');
});
```

---

## Error Handling

All endpoints return errors in this format:

```typescript
{
  "error": "Error message here"
}

// Common errors:
// 400: Bad Request (missing fields, validation errors)
// 401: Unauthorized (missing/invalid token)
// 403: Forbidden (permission denied)
// 404: Not Found (resource doesn't exist)
// 500: Server Error
```

---

## Authentication

All endpoints marked with `(auth required)` need:

```typescript
Headers: {
  Authorization: `Bearer ${authToken}`
}
```

Get token from login endpoint:
```typescript
POST /auth/api/login
Body: {
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "user": { /* user data */ }
}
```

---

## Integration Checklist

- [ ] Update Products screen to use Products API
- [ ] Update Cart screen to use Cart API
- [ ] Update Checkout to use Orders API
- [ ] Update Payment to use Payments API
- [ ] Update Wishlist to use Wishlist API
- [ ] Update Messaging to use Messages API
- [ ] Add Socket.io for real-time updates
- [ ] Add error handling for all endpoints
- [ ] Add loading states
- [ ] Add success notifications
- [ ] Test all flows end-to-end

---

## Testing Endpoints with Curl

```bash
# Get products
curl http://localhost:8082/marketplace/api/products

# Get single product
curl http://localhost:8082/marketplace/api/products/60d5f3c3b3c3c3c3c3c3c3c3

# Get cart (auth required)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8082/marketplace/api/cart

# Create order
curl -X POST http://localhost:8082/marketplace/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"products": [...], "shippingAddress": {...}, "shippingCost": 1000}'
```

---

## Production Deployment

1. Update `API_BASE_URL` to production URL
2. Update `.env` with production credentials
3. Set `PAYSTACK_SECRET_KEY` to production key
4. Configure MongoDB Atlas for production
5. Enable HTTPS on all API calls
6. Set up rate limiting
7. Enable CORS with specific origins
8. Monitor API performance and errors

---

**API Version**: 1.0
**Status**: Production Ready ✅
**Last Updated**: January 10, 2026
