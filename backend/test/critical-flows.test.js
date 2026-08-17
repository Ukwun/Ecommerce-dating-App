const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-with-sufficient-length';
process.env.PAYSTACK_SECRET_KEY = 'paystack-integration-secret';
const mongoUri = process.env.TEST_MONGO_URI;
if (!mongoUri || !/test/i.test(new URL(mongoUri).pathname)) {
  throw new Error('TEST_MONGO_URI must point to a dedicated database whose name contains "test"');
}

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const AdminUser = require('../models/AdminUser');
const SellerProfile = require('../models/SellerProfile');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const userRoutes = require('../routes/userRoutes');
const adminRoutes = require('../routes/admin');
const sellerRoutes = require('../routes/seller');
const conversationRoutes = require('../routes/conversation');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payments');

const app = express();
app.set('io', null);
app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.use('/auth/api', userRoutes);
app.use('/admin/api', adminRoutes);
app.use('/seller/api', sellerRoutes);
app.use('/dating/api', conversationRoutes);
app.use('/marketplace/api', productRoutes);
app.use('/marketplace/api', orderRoutes);
app.use('/marketplace/api', paymentRoutes);

const accessToken = user => jwt.sign({ id: user._id, email: user.email, tokenType: 'access' }, process.env.JWT_SECRET, { expiresIn: '15m' });
const auth = token => ({ Authorization: `Bearer ${token}` });

test.before(async () => mongoose.connect(mongoUri));
test.beforeEach(async () => mongoose.connection.db.dropDatabase());
test.after(async () => mongoose.disconnect());

test('buyer registration, login, and refresh preserve authenticated identity', async () => {
  const registration = await request(app).post('/auth/api/user-registration').send({ name: 'Buyer One', email: 'buyer@example.com', password: 'BuyerPass1', acceptedTerms: true });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.roles.buyer, true);
  const login = await request(app).post('/auth/api/login').send({ email: 'buyer@example.com', password: 'BuyerPass1' });
  assert.equal(login.status, 200);
  const refresh = await request(app).post('/auth/api/refresh-token').send({ refreshToken: login.body.refreshToken });
  assert.equal(refresh.status, 200);
  assert.ok(refresh.body.accessToken);
});

test('password reset tokens expire and can be consumed only once', async () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({ name: 'Reset User', email: 'reset@example.com', password: await bcrypt.hash('OldPass123', 12), resetPasswordToken: crypto.createHash('sha256').update(rawToken).digest('hex'), resetPasswordExpire: new Date(Date.now() + 60_000) });
  const oldRefreshToken = jwt.sign({ id: user._id, tokenType: 'refresh', authVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const first = await request(app).put(`/auth/api/reset-password/${rawToken}`).send({ password: 'NewPass123' });
  assert.equal(first.status, 200);
  const replay = await request(app).put(`/auth/api/reset-password/${rawToken}`).send({ password: 'OtherPass123' });
  assert.equal(replay.status, 400);
  const updated = await User.findById(user._id).select('+password');
  assert.equal(await bcrypt.compare('NewPass123', updated.password), true);
  const revokedSession = await request(app).post('/auth/api/refresh-token').send({ refreshToken: oldRefreshToken });
  assert.equal(revokedSession.status, 403);
});

test('buyer cannot use seller or admin capabilities', async () => {
  const buyer = await User.create({ name: 'Buyer', email: 'roles@example.com', password: await bcrypt.hash('BuyerPass1', 12) });
  const token = accessToken(buyer);
  const sellerResponse = await request(app).get('/seller/api/dashboard').set(auth(token));
  const adminResponse = await request(app).get('/admin/api/sellers').set(auth(token));
  assert.equal(sellerResponse.status, 403);
  assert.equal(adminResponse.status, 403);
});

test('admin approval activates seller listing capability while buyers remain denied', async () => {
  const [adminUser, applicant, buyer] = await User.create([
    { name: 'Admin', email: 'admin@example.com', password: 'hash' },
    { name: 'Applicant', email: 'seller@example.com', password: 'hash' },
    { name: 'Buyer', email: 'buyer2@example.com', password: 'hash' },
  ]);
  await AdminUser.create({ userId: adminUser._id, role: 'seller_reviewer', permissions: ['approve_sellers', 'view_seller_details'] });
  const profile = await SellerProfile.create({ userId: applicant._id, businessName: 'Real Store', businessCategory: 'electronics' });
  const approval = await request(app).post(`/admin/api/sellers/${profile._id}/approve`).set(auth(accessToken(adminUser))).send({ notes: 'Identity checked' });
  assert.equal(approval.status, 200);
  const productPayload = { name: 'Real Phone', description: 'A real listed device', price: 250000, category: 'electronics', stock: 3, images: [{ url: 'https://images.example/product.jpg', fileId: 'image-1' }] };
  const denied = await request(app).post('/marketplace/api/products').set(auth(accessToken(buyer))).send(productPayload);
  assert.equal(denied.status, 403);
  const listed = await request(app).post('/marketplace/api/products').set(auth(accessToken(applicant))).send(productPayload);
  assert.equal(listed.status, 201);
  assert.equal(String(listed.body.product.seller), String(applicant._id));
});

test('checkout prices from the database and creates isolated multi-seller fulfillments', async () => {
  const [buyer, sellerOne, sellerTwo] = await User.create([
    { name: 'Buyer', email: 'checkout@example.com', password: 'hash' },
    { name: 'Seller One', email: 'seller1@example.com', password: 'hash' },
    { name: 'Seller Two', email: 'seller2@example.com', password: 'hash' },
  ]);
  await SellerProfile.create([
    { userId: sellerOne._id, businessName: 'Store One', businessCategory: 'electronics', verificationStatus: 'approved' },
    { userId: sellerTwo._id, businessName: 'Store Two', businessCategory: 'fashion', verificationStatus: 'approved' },
  ]);
  const products = await Product.create([
    { seller: sellerOne._id, name: 'Phone', description: 'Phone', price: 100000, category: 'electronics', stock: 5, images: [{ url: 'https://images.example/phone.jpg', fileId: 'phone' }] },
    { seller: sellerTwo._id, name: 'Shoes', description: 'Shoes', price: 20000, category: 'fashion', stock: 5, images: [{ url: 'https://images.example/shoes.jpg', fileId: 'shoes' }] },
  ]);
  const checkout = await request(app).post('/marketplace/api/orders').set(auth(accessToken(buyer))).send({
    products: products.map(product => ({ product: product._id, quantity: 1, price: 1 })),
    shippingAddress: { name: 'Buyer', addressLine1: '1 Test Road', city: 'Lagos', state: 'Lagos', country: 'NG' },
    shippingCost: 1000,
  });
  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.data.subtotal, 120000);
  assert.equal(checkout.body.data.fulfillments.length, 2);
  const fulfillmentUpdate = await request(app).put(`/marketplace/api/orders/${checkout.body.data._id}/fulfillments/status`).set(auth(accessToken(sellerOne))).send({ status: 'processing' });
  assert.equal(fulfillmentUpdate.status, 200);
  assert.equal(String(fulfillmentUpdate.body.data.seller), String(sellerOne._id));
});

test('signed Paystack webhook confirms the exact payment once and commits inventory', async () => {
  const [buyer, seller] = await User.create([{ name: 'Buyer', email: 'pay@example.com', password: 'hash' }, { name: 'Seller', email: 'pay-seller@example.com', password: 'hash' }]);
  const product = await Product.create({ seller: seller._id, name: 'Paid item', description: 'Paid item', price: 5000, category: 'other', stock: 2, reservedStock: 1, images: [{ url: 'https://images.example/item.jpg', fileId: 'paid' }] });
  const order = await Order.create({ orderNumber: 'TEST-PAY-1', user: buyer._id, products: [{ product: product._id, quantity: 1, price: 5000, totalPrice: 5000 }], fulfillments: [{ seller: seller._id, products: [{ product: product._id, quantity: 1, totalPrice: 5000 }], subtotal: 5000 }], shippingAddress: {}, subtotal: 5000, total: 5000, inventoryReservationStatus: 'reserved' });
  await Payment.create({ user: buyer._id, order: order._id, amount: 5000, currency: 'NGN', method: 'paystack', status: 'pending', paystack: { reference: 'pay-ref-1' } });
  const payload = { event: 'charge.success', data: { reference: 'pay-ref-1', amount: 500000, currency: 'NGN' } };
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
  const response = await request(app).post('/marketplace/api/payments/webhook/paystack').set('Content-Type', 'application/json').set('x-paystack-signature', signature).send(body);
  assert.equal(response.status, 200);
  const [updatedOrder, updatedProduct] = await Promise.all([Order.findById(order._id), Product.findById(product._id)]);
  assert.equal(updatedOrder.payment.status, 'completed');
  assert.equal(updatedProduct.stock, 1);
  assert.equal(updatedProduct.reservedStock, 0);
});

test('conversation messages enforce participant identity', async () => {
  const users = await User.create([
    { name: 'One', email: 'one@example.com', password: 'hash' },
    { name: 'Two', email: 'two@example.com', password: 'hash' },
    { name: 'Outsider', email: 'outside@example.com', password: 'hash' },
  ]);
  const conversation = await Conversation.create({ participants: [users[0]._id, users[1]._id] });
  const denied = await request(app).post(`/dating/api/chat/send/${conversation._id}`).set(auth(accessToken(users[2]))).send({ content: 'Should not arrive' });
  assert.equal(denied.status, 403);
  const allowed = await request(app).post(`/dating/api/chat/send/${conversation._id}`).set(auth(accessToken(users[0]))).send({ content: 'Hello' });
  assert.equal(allowed.status, 201);
});

test('account deletion anonymizes identity and invalidates the existing token', async () => {
  const user = await User.create({ name: 'Delete Me', email: 'delete@example.com', password: await bcrypt.hash('DeletePass1', 12), pushToken: 'sensitive-device-token' });
  const token = accessToken(user);
  const deletion = await request(app).delete('/auth/api/account').set(auth(token)).send({ confirmation: 'DELETE' });
  assert.equal(deletion.status, 200);
  const afterDeletion = await request(app).put('/auth/api/update-details').set(auth(token)).send({ name: 'Still Here' });
  assert.equal(afterDeletion.status, 401);
  const deleted = await User.findById(user._id);
  assert.equal(deleted.accountStatus, 'deleted');
  assert.equal(deleted.pushToken, undefined);
  assert.match(deleted.email, /@deleted\.invalid$/);
});
