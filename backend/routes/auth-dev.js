import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// In-memory users for dev fallback
const users = [];

router.post('/user-registration', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = users.find((u) => u.email === email);
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user = { id, name, email, password: hashed, createdAt: new Date() };
    users.push(user);
    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ message: 'Registered (dev)', accessToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Dev registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });
    const user = users.find((u) => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, message: 'Login (dev)', accessToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Dev login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', (req, res) => {
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

export default router;
