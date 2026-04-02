# 🚀 ENTERPRISE FEATURES API DOCUMENTATION
## Admin, Seller Dashboard, Returns & Support APIs
**Version:** 2.0  
**Status:** Production Ready  
**Last Updated:** February 28, 2026

---

## 📋 TABLE OF CONTENTS
1. [Admin Routes](#admin-routes)
2. [Seller Routes](#seller-routes)
3. [Returns/Refund Routes](#returnsrefund-routes)
4. [Support Ticket Routes](#support-ticket-routes)
5. [Security & Rate Limiting](#security--rate-limiting)
6. [Error Handling](#error-handling)

---

## ADMIN ROUTES

### Base URL: `/admin/api`

**Required:** All routes require `Authorization: Bearer <token>` header + Admin access

---

### Sellers Management

#### Get All Sellers
```
GET /admin/api/sellers?status=pending&page=1&limit=10
Query Parameters:
  - status: pending | approved | rejected | suspended (optional)
  - page: Page number (default: 1)
  - limit: Results per page (default: 10)
  - category: business category filter (optional)

Response:
{
  "success": true,
  "count": 5,
  "total": 25,
  "page": 1,
  "pages": 3,
  "data": [
    {
      "_id": "seller_id",
      "userId": { "name", "email", "avatar" },
      "businessName": "John's Electronics",
      "businessCategory": "electronics",
      "verificationStatus": "pending",
      "totalEarnings": 50000,
      "averageRating": 4.8,
      "createdAt": "2026-02-20T10:30:00"
    }
  ]
}
```

#### Get Single Seller
```
GET /admin/api/sellers/:sellerId

Response:
{
  "success": true,
  "data": { seller object }
}
```

#### Approve Seller
```
POST /admin/api/sellers/:sellerId/approve
Content-Type: application/json

Body:
{
  "notes": "Seller information verified successfully"
}

Response:
{
  "success": true,
  "message": "Seller approved successfully",
  "data": { updated seller object }
}
```

#### Reject Seller
```
POST /admin/api/sellers/:sellerId/reject
Content-Type: application/json

Body:
{
  "reason": "Incomplete business registration documents"
}

Response:
{
  "success": true,
  "message": "Seller application rejected",
  "data": { updated seller object }
}
```

#### Suspend Seller
```
POST /admin/api/sellers/:sellerId/suspend
Content-Type: application/json

Body:
{
  "reason": "Violation of platform policies",
  "durationDays": 30
}

Response:
{
  "success": true,
  "message": "Seller suspended successfully",
  "data": { updated seller object }
}
```

---

### Returns Management

#### Get All Returns
```
GET /admin/api/returns?status=requested&page=1&limit=10
Query Parameters:
  - status: requested | approved_by_seller | rejected | refund_completed
  - page: Page number
  - limit: Results per page

Response:
{
  "success": true,
  "count": 10,
  "total": 45,
  "data": [
    {
      "returnNumber": "RET-1234567890",
      "orderId": { "orderNumber" },
      "buyerId": { "name", "email" },
      "sellerId": { "businessName" },
      "status": "requested",
      "reason": "defective",
      "refundAmount": 25000,
      "createdAt": "2026-02-28T10:00:00"
    }
  ]
}
```

#### Get Return Details
```
GET /admin/api/returns/:returnId

Response:
{
  "success": true,
  "data": { return object with all details }
}
```

#### Approve Return
```
POST /admin/api/returns/:returnId/approve
Content-Type: application/json

Body:
{
  "notes": "Return approved - items appear to be defective"
}

Response:
{
  "success": true,
  "message": "Return approved",
  "data": { updated return object }
}
```

#### Reject Return
```
POST /admin/api/returns/:returnId/reject
Content-Type: application/json

Body:
{
  "reason": "Items were not damaged during shipping"
}

Response:
{
  "success": true,
  "message": "Return rejected",
  "data": { updated return object }
}
```

#### Approve & Process Refund
```
POST /admin/api/returns/:returnId/refund-approve
Content-Type: application/json

Response:
{
  "success": true,
  "message": "Refund approved and initiated",
  "data": { updated return object with refund amounts }
}
```

---

### Support Tickets

#### Get All Support Tickets
```
GET /admin/api/support-tickets?status=open&priority=high&page=1&limit=10
Query Parameters:
  - status: open | in-progress | resolved | closed
  - priority: low | medium | high | urgent
  - page: Page number
  - limit: Results per page

Response:
{
  "success": true,
  "count": 15,
  "total": 68,
  "data": [
    {
      "ticketNumber": "TKT-1234567890",
      "userId": { "name", "email" },
      "subject": "Order delivery issue",
      "category": "shipping_delivery",
      "status": "open",
      "priority": "high",
      "assignedTo": null,
      "createdAt": "2026-02-28T09:00:00"
    }
  ]
}
```

#### Assign Ticket to Admin
```
PUT /admin/api/support-tickets/:ticketId/assign
Content-Type: application/json

Response:
{
  "success": true,
  "message": "Ticket assigned",
  "data": { updated ticket object }
}
```

#### Reply to Support Ticket
```
POST /admin/api/support-tickets/:ticketId/reply
Content-Type: application/json

Body:
{
  "message": "We have initiated a replacement shipment for the damaged item..."
}

Response:
{
  "success": true,
  "message": "Reply added",
  "data": { updated ticket with new message }
}
```

#### Close Support Ticket
```
PUT /admin/api/support-tickets/:ticketId/close
Content-Type: application/json

Body:
{
  "resolution": "Refund processed successfully to customer account"
}

Response:
{
  "success": true,
  "message": "Ticket closed",
  "data": { closed ticket object }
}
```

---

### Analytics & Dashboard

#### Get Platform Analytics
```
GET /admin/api/analytics/dashboard

Response:
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalSellers": 45,
    "totalOrders": 3420,
    "totalRevenue": 1250000,
    "pendingReturns": 12,
    "openTickets": 8
  }
}
```

---

## SELLER ROUTES

### Base URL: `/seller/api`

**Required:** Must be an approved seller

---

### Seller Profile

#### Get My Profile
```
GET /seller/api/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "_id": "seller_id",
    "businessName": "John's Electronics",
    "businessCategory": "electronics",
    "verificationStatus": "approved",
    "totalEarnings": 150000,
    "pendingEarnings": 25000,
    "averageRating": 4.8,
    "totalRatings": 245
  }
}
```

#### Apply as Seller
```
POST /auth/api/seller/apply
Authorization: Bearer <token>

Body:
{
  "businessName": "John's Electronics",
  "businessCategory": "electronics",
  "businessDescription": "Selling high-quality electronics",
  "registrationNumber": "RC/BN/2024/001"
}

Response:
{
  "success": true,
  "message": "Seller application submitted. Please wait for admin approval.",
  "data": { seller profile object }
}

Status Codes:
- 201: Seller application created successfully
- 400: Already applied as seller
- 400: Missing required fields
```

#### Update Seller Profile
```
PUT /seller/api/profile
Authorization: Bearer <token>

Body:
{
  "businessDescription": "New description",
  "contactEmail": "john@example.com",
  "contactPhone": "+234901234567",
  "businessWebsite": "https://johnelectronics.com",
  "storeDescription": "Official store description"
}

Response:
{
  "success": true,
  "data": { updated seller profile }
}
```

#### Update Bank Details
```
PUT /seller/api/bank-details
Authorization: Bearer <token>

Body:
{
  "bankName": "Access Bank",
  "accountNumber": "1234567890",
  "accountName": "John's Electronics Ltd",
  "bankCode": "044"
}

Response:
{
  "success": true,
  "message": "Bank details updated. Will be verified before first payout.",
  "data": { updated seller profile }
}
```

---

### Seller Orders & Products

#### Get My Orders
```
GET /seller/api/orders?status=shipped&page=1&limit=10
Authorization: Bearer <token>
Query Parameters:
  - status: filter by order status
  - page: page number
  - limit: results per page

Response:
{
  "success": true,
  "count": 10,
  "total": 45,
  "data": [
    {
      "orderNumber": "ORD-001",
      "user": { "name", "email", "avatar" },
      "products": [{ "product": { "title", "price" }, "quantity": 2 }],
      "status": "shipped",
      "total": 150000,
      "createdAt": "2026-02-20T10:00:00"
    }
  ]
}
```

#### Get My Products
```
GET /seller/api/products?page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 10,
  "total": 32,
  "data": [ product objects ]
}
```

#### Get My Returns
```
GET /seller/api/returns?page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 3,
  "total": 5,
  "data": [
    {
      "returnNumber": "RET-001",
      "buyerId": { "name", "email" },
      "orderId": { "orderNumber" },
      "status": "requested",
      "reason": "defective",
      "products": [ product array ],
      "createdAt": "2026-02-28T10:00:00"
    }
  ]
}
```

#### Approve Return (Seller Action)
```
POST /seller/api/returns/:returnId/approve
Authorization: Bearer <token>

Body:
{
  "notes": "Return approved - will process refund"
}

Response:
{
  "success": true,
  "message": "Return approved",
  "data": { updated return object }
}
```

---

### Seller Dashboard

#### Get Dashboard Stats
```
GET /seller/api/dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "profile": {
      "businessName": "John's Electronics",
      "totalEarnings": 1250000,
      "pendingEarnings": 125000,
      "averageRating": 4.8,
      "totalRatings": 245
    },
    "currentMonth": {
      "orders": 45,
      "revenue": 2250000,
      "averageOrderValue": 50000
    },
    "lifetime": {
      "totalOrders": 450,
      "totalSales": 22500000,
      "totalEarnings": 1250000
    },
    "analytics": { analytics object }
  }
}
```

#### Get Analytics
```
GET /seller/api/analytics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalOrders": 450,
    "totalSales": 22500000,
    "totalProducts": 32,
    "activeProducts": 28,
    "conversionRate": 8.5,
    "averageOrderValue": 50000,
    "averageProductRating": 4.8,
    "returnRate": 2.5,
    "monthlyRevenue": [ monthly breakdown array ]
  }
}
```

---

## RETURNS/REFUND ROUTES

### Base URL: `/marketplace/api/returns`

---

### Request Return

#### Request a Return for Order
```
POST /marketplace/api/returns/requests
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "orderId": "order_id",
  "products": [
    {
      "productId": "product_id",
      "quantity": 2,
      "condition": "unopened"
    }
  ],
  "reason": "defective",
  "detailedReason": "The item stopped working after 2 days"
}

Response:
{
  "success": true,
  "message": "Return request submitted. Waiting for seller approval.",
  "data": {
    "returnNumber": "RET-1234567890",
    "status": "requested",
    "refundAmount": 50000,
    "createdAt": "2026-02-28T10:00:00"
  }
}

Status Codes:
- 201: Return created successfully
- 400: Can only return delivered orders
- 400: Return window has closed (30 days)
- 403: Order doesn't belong to user
```

#### Get My Returns
```
GET /marketplace/api/returns/my-returns?status=requested&page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "total": 8,
  "data": [ return objects ]
}
```

#### Get Return Details
```
GET /marketplace/api/returns/:returnId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "returnNumber": "RET-001",
    "orderId": { order details },
    "products": [ product details ],
    "status": "requested",
    "reason": "defective",
    "refundAmount": 50000,
    "createdAt": "2026-02-28T10:00:00"
  }
}
```

#### Upload Return Proof
```
POST /marketplace/api/returns/:returnId/upload-proof
Authorization: Bearer <token>

Body:
{
  "images": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "video": "https://cloudinary.com/video.mp4"
}

Response:
{
  "success": true,
  "message": "Proof uploaded",
  "data": { updated return object }
}
```

#### Ship Back Items
```
POST /marketplace/api/returns/:returnId/ship-back
Authorization: Bearer <token>

Body:
{
  "trackingNumber": "TRK123456789"
}

Response:
{
  "success": true,
  "message": "Return marked as shipped back",
  "data": { updated return object }
}
```

#### Cancel Return
```
POST /marketplace/api/returns/:returnId/cancel
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Return cancelled",
  "data": { updated return object }
}
```

#### Get Return Timeline
```
GET /marketplace/api/returns/:returnId/timeline
Authorization: Bearer <token>

Response:
{
  "success": true,
  "currentStatus": "in_progress",
  "timeline": [
    {
      "status": "Requested",
      "timestamp": "2026-02-28T10:00:00",
      "completed": true,
      "description": "Return request submitted"
    },
    {
      "status": "Seller Review",
      "timestamp": null,
      "completed": false,
      "description": "Waiting for seller to review"
    }
  ]
}
```

---

## SUPPORT TICKET ROUTES

### Base URL: `/support/api`

---

### Create & Manage Tickets

#### Create Support Ticket
```
POST /support/api/tickets
Authorization: Bearer <token>

Body:
{
  "subject": "Order not delivered yet",
  "description": "My order ID ORD-001 was supposed to be delivered 2 days ago",
  "category": "shipping_delivery",
  "orderId": "order_id (optional)",
  "productId": "product_id (optional)",
  "priority": "high"
}

Response:
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticketNumber": "TKT-1234567890",
    "status": "open",
    "priority": "high",
    "createdAt": "2026-02-28T10:00:00"
  }
}
```

#### Get My Tickets
```
GET /support/api/tickets?status=open&page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "total": 8,
  "data": [
    {
      "ticketNumber": "TKT-001",
      "subject": "Order issue",
      "category": "shippping_delivery",
      "status": "open",
      "priority": "high",
      "assignedTo": { "name", "email" },
      "createdAt": "2026-02-28T10:00:00"
    }
  ]
}
```

#### Get Ticket Details
```
GET /support/api/tickets/:ticketId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "ticketNumber": "TKT-001",
    "subject": "Order issue",
    "description": "My order hasn't been delivered",
    "status": "in-progress",
    "messages": [
      {
        "sender": { "name", "email", "avatar" },
        "senderType": "customer",
        "message": "Original ticket message",
        "createdAt": "2026-02-28T10:00:00"
      },
      {
        "sender": { "name", "email", "avatar" },
        "senderType": "admin",
        "message": "We are investigating the issue",
        "createdAt": "2026-02-28T10:30:00"
      }
    ]
  }
}
```

#### Add Message to Ticket
```
POST /support/api/tickets/:ticketId/messages
Authorization: Bearer <token>

Body:
{
  "message": "Thank you for checking. The package arrived!",
  "attachments": ["url1", "url2"]
}

Response:
{
  "success": true,
  "message": "Message added",
  "data": { updated ticket with all messages }
}
```

#### Close Ticket
```
PUT /support/api/tickets/:ticketId/close
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Ticket closed",
  "data": { closed ticket object }
}
```

#### Rate Support Response
```
POST /support/api/tickets/:ticketId/rate
Authorization: Bearer <token>

Body:
{
  "rating": 5,
  "feedback": "Great support team! Very helpful and quick response"
}

Response:
{
  "success": true,
  "message": "Thank you for your feedback",
  "data": { updated ticket with rating }
}
```

#### Get Support Stats
```
GET /support/api/stats/overview
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalTickets": 12,
    "openTickets": 2,
    "inProgressTickets": 3,
    "resolvedTickets": 5,
    "closedTickets": 2,
    "avgResolutionTimeHours": 4.5
  }
}
```

---

## SECURITY & RATE LIMITING

### Rate Limits

```
Endpoint Type              Limit              Window
─────────────────────────────────────────────────────
General API               100 requests       15 minutes
Authentication           5 requests         15 minutes
Create Product           10 requests        1 hour
Support Tickets          5 requests         1 hour
Payment                  3 requests         1 minute
```

### Headers

All requests should include:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Security Features

1. **JWT Authentication** - All protected routes require valid token
2. **Role-Based Access Control** - Admin/Seller/Customer roles
3. **Rate Limiting** - Prevent abuse and DDoS
4. **Input Validation** - All inputs sanitized
5. **Audit Logging** - All actions logged for security
6. **HTTPS Enforced** - All production APIs use HTTPS

---

## ERROR HANDLING

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

### HTTP Status Codes

```
200  - OK (successful request)
201  - Created (resource created)
400  - Bad Request (invalid input)
401  - Unauthorized (no token)
403  - Forbidden (no permission)
404  - Not Found (resource doesn't exist)
429  - Too Many Requests (rate limit exceeded)
500  - Server Error (internal error)
```

### Common Errors

```
{
  "error": "No token provided"
  // Status: 401 - Add Authorization header

  "error": "Invalid token"
  // Status: 401 - Token expired or malformed

  "error": "Admin access required"
  // Status: 403 - User is not an admin

  "error": "Seller profile not found"
  // Status: 403 - User needs to apply as seller first

  "error": "Can only return delivered orders"
  // Status: 400 - Order must be in delivered status

  "error": "Too many requests from this IP"
  // Status: 429 - Rate limit exceeded, wait and retry
}
```

---

## TESTING WITH POSTMAN

1. **Get Authentication Token**
   ```
   POST /auth/api/login
   Body: { "email": "admin@test.com", "password": "password" }
   ```

2. **Use Token in Headers**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

3. **Test Admin Endpoints**
   ```
   GET /admin/api/sellers
   GET /admin/api/analytics/dashboard
   POST /admin/api/sellers/:id/approve
   ```

4. **Test Seller Endpoints**
   ```
   GET /seller/api/profile
   GET /seller/api/orders
   GET /seller/api/analytics
   ```

5. **Test Customer Endpoints**
   ```
   POST /marketplace/api/returns/requests
   POST /support/api/tickets
   GET /support/api/tickets
   ```

---

**API Documentation Complete**  
For more details on schemas and data structures, refer to the backend models.
