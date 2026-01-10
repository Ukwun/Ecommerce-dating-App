# 🧪 API Testing Guide - Postman Collection

## Import this into Postman

Save as `facebook-marketplace-api.postman_collection.json`:

```json
{
  "info": {
    "name": "Facebook Marketplace API",
    "description": "Complete API testing collection for Facebook Marketplace",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/auth/api/login", "path": ["auth", "api", "login"]}
          }
        },
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"role\": \"buyer\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/auth/api/register", "path": ["auth", "api", "register"]}
          }
        }
      ]
    },
    {
      "name": "Products",
      "item": [
        {
          "name": "Get All Products",
          "request": {
            "method": "GET",
            "url": {"raw": "{{baseUrl}}/marketplace/api/products?page=1&limit=10&category=Electronics&sortBy=newest", "path": ["marketplace", "api", "products"], "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "10"}, {"key": "category", "value": "Electronics"}, {"key": "sortBy", "value": "newest"}]}
          }
        },
        {
          "name": "Get Single Product",
          "request": {
            "method": "GET",
            "url": {"raw": "{{baseUrl}}/marketplace/api/products/{{productId}}", "path": ["marketplace", "api", "products", "{{productId}}"]}
          }
        },
        {
          "name": "Create Product",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"iPhone 13 Pro\",\n  \"description\": \"Latest iPhone with A15 Bionic chip\",\n  \"category\": \"Electronics\",\n  \"price\": 500000,\n  \"originalPrice\": 550000,\n  \"stock\": 50,\n  \"images\": [\"https://example.com/image1.jpg\"],\n  \"thumbnail\": \"https://example.com/thumb.jpg\",\n  \"specifications\": {\"color\": \"Black\", \"storage\": \"256GB\"},\n  \"tags\": [\"phone\", \"apple\", \"latest\"]\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/products", "path": ["marketplace", "api", "products"]}
          }
        },
        {
          "name": "Update Product",
          "request": {
            "method": "PUT",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"iPhone 13 Pro Max\",\n  \"price\": 550000,\n  \"stock\": 30\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/products/{{productId}}", "path": ["marketplace", "api", "products", "{{productId}}"]}
          }
        },
        {
          "name": "Delete Product",
          "request": {
            "method": "DELETE",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/products/{{productId}}", "path": ["marketplace", "api", "products", "{{productId}}"]}
          }
        },
        {
          "name": "Get Featured Products",
          "request": {
            "method": "GET",
            "url": {"raw": "{{baseUrl}}/marketplace/api/products/featured/all", "path": ["marketplace", "api", "products", "featured", "all"]}
          }
        }
      ]
    },
    {
      "name": "Shopping Cart",
      "item": [
        {
          "name": "Get Cart",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/cart", "path": ["marketplace", "api", "cart"]}
          }
        },
        {
          "name": "Add to Cart",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"productId\": \"{{productId}}\",\n  \"quantity\": 2\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/cart/items", "path": ["marketplace", "api", "cart", "items"]}
          }
        },
        {
          "name": "Update Cart Item",
          "request": {
            "method": "PUT",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"quantity\": 5\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/cart/items/{{productId}}", "path": ["marketplace", "api", "cart", "items", "{{productId}}"]}
          }
        },
        {
          "name": "Remove from Cart",
          "request": {
            "method": "DELETE",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/cart/items/{{productId}}", "path": ["marketplace", "api", "cart", "items", "{{productId}}"]}
          }
        },
        {
          "name": "Clear Cart",
          "request": {
            "method": "DELETE",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/cart", "path": ["marketplace", "api", "cart"]}
          }
        }
      ]
    },
    {
      "name": "Orders",
      "item": [
        {
          "name": "Create Order",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"products\": [\n    {\n      \"product\": \"{{productId}}\",\n      \"quantity\": 2\n    }\n  ],\n  \"shippingAddress\": {\n    \"name\": \"John Doe\",\n    \"addressLine1\": \"123 Main Street\",\n    \"city\": \"Lagos\",\n    \"state\": \"Lagos State\",\n    \"postalCode\": \"100001\",\n    \"country\": \"Nigeria\",\n    \"latitude\": 6.5244,\n    \"longitude\": 3.3792\n  },\n  \"shippingCost\": 1000\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/orders", "path": ["marketplace", "api", "orders"]}
          }
        },
        {
          "name": "Get My Orders",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/orders?page=1&limit=10", "path": ["marketplace", "api", "orders"], "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "10"}]}
          }
        },
        {
          "name": "Get Single Order",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/orders/{{orderId}}", "path": ["marketplace", "api", "orders", "{{orderId}}"]}
          }
        },
        {
          "name": "Update Order Status",
          "request": {
            "method": "PUT",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"status\": \"processing\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/orders/{{orderId}}/status", "path": ["marketplace", "api", "orders", "{{orderId}}", "status"]}
          }
        },
        {
          "name": "Cancel Order",
          "request": {
            "method": "PUT",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/orders/{{orderId}}/cancel", "path": ["marketplace", "api", "orders", "{{orderId}}", "cancel"]}
          }
        }
      ]
    },
    {
      "name": "Payments",
      "item": [
        {
          "name": "Initialize Payment",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"orderId\": \"{{orderId}}\",\n  \"email\": \"user@example.com\",\n  \"amount\": 1101000\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/payments/initialize", "path": ["marketplace", "api", "payments", "initialize"]}
          }
        },
        {
          "name": "Verify Payment",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"reference\": \"paystack_reference_code\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/payments/verify", "path": ["marketplace", "api", "payments", "verify"]}
          }
        },
        {
          "name": "Get Payment",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/payments/{{paymentId}}", "path": ["marketplace", "api", "payments", "{{paymentId}}"]}
          }
        },
        {
          "name": "Get All Payments",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/payments?page=1&limit=10", "path": ["marketplace", "api", "payments"], "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "10"}]}
          }
        }
      ]
    },
    {
      "name": "Wishlist",
      "item": [
        {
          "name": "Add to Wishlist",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"productId\": \"{{productId}}\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/wishlist", "path": ["marketplace", "api", "wishlist"]}
          }
        },
        {
          "name": "Get Wishlist",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/wishlist?page=1&limit=20", "path": ["marketplace", "api", "wishlist"], "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]}
          }
        },
        {
          "name": "Check if in Wishlist",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/wishlist/{{productId}}/check", "path": ["marketplace", "api", "wishlist", "{{productId}}", "check"]}
          }
        },
        {
          "name": "Remove from Wishlist",
          "request": {
            "method": "DELETE",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/wishlist/{{productId}}", "path": ["marketplace", "api", "wishlist", "{{productId}}"]}
          }
        }
      ]
    },
    {
      "name": "Messages",
      "item": [
        {
          "name": "Send Message",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}, {"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientId\": \"{{userId}}\",\n  \"content\": \"Hi, interested in this product\",\n  \"productId\": \"{{productId}}\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/marketplace/api/messages", "path": ["marketplace", "api", "messages"]}
          }
        },
        {
          "name": "Get Conversation",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/messages/{{userId}}?page=1&limit=50", "path": ["marketplace", "api", "messages", "{{userId}}"], "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "50"}]}
          }
        },
        {
          "name": "Get All Conversations",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/conversations", "path": ["marketplace", "api", "conversations"]}
          }
        },
        {
          "name": "Mark as Read",
          "request": {
            "method": "PUT",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": {"raw": "{{baseUrl}}/marketplace/api/messages/{{messageId}}/read", "path": ["marketplace", "api", "messages", "{{messageId}}", "read"]}
          }
        }
      ]
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:8082", "type": "string"},
    {"key": "token", "value": "", "type": "string"},
    {"key": "productId", "value": "", "type": "string"},
    {"key": "orderId", "value": "", "type": "string"},
    {"key": "paymentId", "value": "", "type": "string"},
    {"key": "userId", "value": "", "type": "string"},
    {"key": "messageId", "value": "", "type": "string"}
  ]
}
```

## Manual Testing Steps

### Step 1: Authentication
```
POST http://localhost:8082/auth/api/login
Body: {
  "email": "test@example.com",
  "password": "password123"
}

✅ Expected: Returns token in response
```

Save the token to use in subsequent requests.

### Step 2: Products
```
GET http://localhost:8082/marketplace/api/products

✅ Expected: Returns array of products
```

### Step 3: Create Product
```
POST http://localhost:8082/marketplace/api/products
Authorization: Bearer {token}
Body: {
  "title": "Test Product",
  "description": "Test description",
  "category": "Electronics",
  "price": 50000,
  "stock": 10
}

✅ Expected: Returns created product with _id
📝 Save the productId for next tests
```

### Step 4: Add to Cart
```
POST http://localhost:8082/marketplace/api/cart/items
Authorization: Bearer {token}
Body: {
  "productId": "{productId from step 3}",
  "quantity": 2
}

✅ Expected: Product added to cart
```

### Step 5: Get Cart
```
GET http://localhost:8082/marketplace/api/cart
Authorization: Bearer {token}

✅ Expected: Cart contains the product with calculated total
```

### Step 6: Create Order
```
POST http://localhost:8082/marketplace/api/orders
Authorization: Bearer {token}
Body: {
  "products": [{"product": "{productId}", "quantity": 2}],
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main",
    "city": "Lagos",
    "state": "Lagos",
    "postalCode": "100001",
    "country": "Nigeria"
  },
  "shippingCost": 1000
}

✅ Expected: Order created with orderNumber
📝 Save the orderId for next tests
```

### Step 7: Initialize Payment
```
POST http://localhost:8082/marketplace/api/payments/initialize
Authorization: Bearer {token}
Body: {
  "orderId": "{orderId from step 6}",
  "email": "test@example.com",
  "amount": 1101000
}

✅ Expected: Returns Paystack authorizationUrl
🔗 This URL is used to redirect user to Paystack checkout
```

### Step 8: Send Message
```
POST http://localhost:8082/marketplace/api/messages
Authorization: Bearer {token}
Body: {
  "recipientId": "{another user id}",
  "content": "Interested in your product",
  "productId": "{productId}"
}

✅ Expected: Message sent successfully
📝 Save messageId if needed for further tests
```

---

## Testing Checklist

- [ ] Can login and get token
- [ ] Can get list of products without token
- [ ] Can get single product details
- [ ] Can create product as seller (with token)
- [ ] Can add product to cart (cart auto-calculates total)
- [ ] Can remove from cart
- [ ] Can create order from cart items
- [ ] Cart clears after order is created
- [ ] Can initialize payment with Paystack
- [ ] Can add to wishlist
- [ ] Can send messages
- [ ] Stock decreases when order created
- [ ] Stock restores when order cancelled
- [ ] Order status changes correctly
- [ ] Payment status updates after verification

---

## Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET /products |
| 201 | Created | POST /orders |
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | User can't access resource |
| 404 | Not Found | Product doesn't exist |
| 500 | Server Error | Database connection failed |

---

## Common Issues & Solutions

### "Invalid token"
- Make sure to include `Authorization: Bearer {token}` header
- Token may have expired, login again
- Check .env JWT_SECRET matches

### "Product not found"
- Verify productId is correct
- Make sure product exists in database
- Check MongoDB is connected

### "Stock unavailable"
- Product stock may be exhausted
- Check product stock level
- Try ordering fewer quantity

### "Payment verification failed"
- Verify reference code is correct
- Ensure PAYSTACK_SECRET_KEY is set
- Check if payment was actually made in Paystack dashboard

---

**Testing Version**: 1.0
**Status**: Ready to Test ✅
**Last Updated**: January 10, 2026
