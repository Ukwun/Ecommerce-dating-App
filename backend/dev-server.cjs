const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
const app = express();
const PORT = process.env.PORT || 8082;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

app.use(express.json());
app.use(cors({ origin: true }));

const users = [];

app.get('/', (req, res) => res.json({ ok: true, message: 'Dev auth server (CJS) running' }));

app.post('/auth/api/user-registration', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  const existing = users.find((u) => u.email === email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const user = { id, name, email, password: hashed, createdAt: new Date() };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Registered (dev-cjs)', token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/auth/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Login (dev-cjs)', token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/auth/api/profile', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

const HOST = process.env.DEV_SERVER_HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Dev auth server (CJS) running on http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  const msg = err && err.message ? err.message : String(err);
  console.error('Dev server failed to start:', msg);
});

module.exports = app;
