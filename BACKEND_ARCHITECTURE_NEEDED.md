# 🏗️ BACKEND ARCHITECTURE NEEDED FOR PRODUCTION

## Current Backend Structure
```
backend/
├── server.js (✅ Basic, needs full routing)
├── package.json (✅ Good)
├── .env (⚠️ Credentials exposed)
├── config/
│   └── db.js (✅ Works)
├── controllers/
│   └── userController.js (✅ Auth only)
├── models/
│   └── User.js (✅ Exists)
└── routes/
    ├── userRoutes.js (✅ Auth only - 2 endpoints)
    ├── auth.js (⭐ Has extra auth functions - 4 endpoints)
    └── ❌ MISSING: products.js, orders.js, payments.js, addresses.js, chat.js, wishlist.js
```

---

## 📋 REQUIRED FILES TO CREATE

### 1️⃣ **backend/models/Product.js** (NEW)
```javascript
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    images: [{
      url: String,
      fileId: String
    }],
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    seller: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      verified: Boolean
    },
    rating: { type: Number, default: 0 },
    reviews: [{
      userId: mongoose.Schema.Types.ObjectId,
      rating: Number,
      comment: String,
      createdAt: Date
    }],
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
```

### 2️⃣ **backend/models/Order.js** (NEW)
```javascript
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      id: mongoose.Schema.Types.ObjectId,
      email: String
    },
    items: [{
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }],
    shippingAddress: {
      name: String,
      addressLine1: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    paymentMethod: {
      cardType: String,
      last4: String
    },
    subtotal: Number,
    shipping: Number,
    total: Number,
    status: {
      type: String,
      enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Processing'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending'
    },
    paystack: {
      transactionId: String,
      authorizationUrl: String,
      accessCode: String,
      reference: String
    },
    trackingNumber: String,
    estimatedDelivery: Date,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
```

### 3️⃣ **backend/models/Address.js** (NEW)
```javascript
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: String,
    isDefault: { type: Boolean, default: false },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;
```

### 4️⃣ **backend/models/Message.js** (NEW)
```javascript
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: mongoose.Schema.Types.ObjectId,
    sender: {
      id: mongoose.Schema.Types.ObjectId,
      name: String
    },
    content: { type: String, required: true },
    attachments: [String],
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [mongoose.Schema.Types.ObjectId],
    lastMessage: String,
    lastMessageTime: Date,
    messages: [messageSchema]
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);

export { Message, Conversation };
```

### 5️⃣ **backend/models/Wishlist.js** (NEW)
```javascript
import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: mongoose.Schema.Types.ObjectId,
    products: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
```

### 6️⃣ **backend/models/Cart.js** (NEW)
```javascript
import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    user: mongoose.Schema.Types.ObjectId,
    items: [{
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      price: Number
    }],
    total: Number,
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
```

---

## 🔌 REQUIRED ROUTE FILES

### 7️⃣ **backend/routes/products.js** (NEW)
```javascript
import express from "express";
import Product from "../models/Product.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get all products with pagination
router.get("/get-all-products", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = search 
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const products = await Product.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(query);

    res.json({ products, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get("/get-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (seller only)
router.post("/create-product", authMiddleware, async (req, res) => {
  try {
    const { name, description, price, oldPrice, images, category, stock } = req.body;
    
    const product = new Product({
      name,
      description,
      price,
      oldPrice,
      images,
      category,
      stock,
      seller: {
        id: req.user.id,
        name: req.user.name
      }
    });
    
    await product.save();
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate product
router.post("/rate-product", authMiddleware, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    
    product.reviews.push({
      userId: req.user.id,
      rating,
      comment,
      createdAt: new Date()
    });
    
    await product.save();
    res.json({ message: "Review added" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 8️⃣ **backend/routes/orders.js** (NEW)
```javascript
import express from "express";
import Order from "../models/Order.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Create order
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, total, paystack } = req.body;
    
    const order = new Order({
      user: { id: req.user.id, email: req.user.email },
      items,
      shippingAddress,
      paymentMethod,
      total,
      paystack
    });
    
    await order.save();
    res.status(201).json({ orderId: order._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get("/get-orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ "user.id": req.user.id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order details
router.get("/get-order/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin only)
router.put("/update-order/:id", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 9️⃣ **backend/routes/addresses.js** (NEW)
```javascript
import express from "express";
import Address from "../models/Address.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get user addresses
router.get("/addresses", authMiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add address
router.post("/add-address", authMiddleware, async (req, res) => {
  try {
    const address = new Address({
      user: req.user.id,
      ...req.body
    });
    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update address
router.put("/update-address/:id", authMiddleware, async (req, res) => {
  try {
    const address = await Address.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete address
router.delete("/delete-address/:id", authMiddleware, async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.id);
    res.json({ message: "Address deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 🔟 **backend/routes/payments.js** (NEW)
```javascript
import express from "express";
import authMiddleware from "../middleware/auth.js";
import Order from "../models/Order.js";

const router = express.Router();

// Verify Paystack payment
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const { reference } = req.body;
    
    // Verify with Paystack API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${paystackSecret}` }
      }
    );
    
    const data = await response.json();
    
    if (!data.status) {
      return res.status(400).json({ error: "Payment verification failed" });
    }
    
    // Update order payment status
    await Order.findByIdAndUpdate(
      data.data.metadata.orderId,
      { paymentStatus: "Completed" }
    );
    
    res.json({ success: true, message: "Payment verified" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle Paystack webhook
router.post("/webhook", async (req, res) => {
  try {
    const { reference } = req.body;
    
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash === req.headers['x-paystack-signature']) {
      // Update order
      console.log("Payment webhook received:", reference);
    }
    
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🔐 REQUIRED MIDDLEWARE

### **backend/middleware/auth.js** (NEW)
```javascript
import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export default authMiddleware;
```

---

## 🔧 SERVER.JS UPDATES NEEDED

Current server.js only has:
```javascript
app.use('/auth/api', userRoutes);
```

Needs to add:
```javascript
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';
import paymentRoutes from './routes/payments.js';

// Add these routes
app.use('/product/api', productRoutes);
app.use('/order/api', orderRoutes);
app.use('/user/api', addressRoutes);
app.use('/payment/api', paymentRoutes);

// Add input validation middleware
import express from 'express';
app.use(express.json({ limit: '10mb' }));
```

---

## 📊 IMPLEMENTATION SUMMARY

| File | Type | Status | Priority |
|------|------|--------|----------|
| Product.js | Model | ❌ Create | 🔴 |
| Order.js | Model | ❌ Create | 🔴 |
| Address.js | Model | ❌ Create | 🔴 |
| Message.js | Model | ❌ Create | 🔴 |
| Wishlist.js | Model | ❌ Create | 🔴 |
| Cart.js | Model | ❌ Create | 🔴 |
| products.js | Route | ❌ Create | 🔴 |
| orders.js | Route | ❌ Create | 🔴 |
| addresses.js | Route | ❌ Create | 🔴 |
| payments.js | Route | ❌ Create | 🔴 |
| auth.js | Middleware | ❌ Create | 🔴 |
| server.js | Server | ⚠️ Update | 🔴 |

---

## ⏱️ ESTIMATED COMPLETION

- Models (6 files): **1 day**
- Routes (4 files): **2 days**
- Middleware: **0.5 day**
- Testing & Bug Fixes: **1.5 days**
- **TOTAL: 5 days**

Then add 2 days for security fixes = **7 days total** to production-ready backend.
