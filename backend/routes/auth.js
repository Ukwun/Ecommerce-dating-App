import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ✅ Registration Route
router.post("/user-registration", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    console.log('🧠 Login request received:', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const user = await User.findOne({ email }).select('+password').lean();
    if (!user) {
      console.log('❌ No user found with that email:', email);
      return res.status(404).json({ error: "User not found" });
    }

    console.log('✅ User found, comparing password for:', email);
    // It's good practice to ensure both values are strings before comparing
    const requestPassword = String(password);
    const dbPassword = String(user.password);

    const isMatch = await bcrypt.compare(requestPassword, dbPassword);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log('🎉 Login successful for:', user.email);
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET not set in environment variables, using default');
    }
    const accessToken = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    res.json({ success: true, message: 'Login successful', accessToken, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("💥 Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get User Profile (Protected Route)
router.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied, token missing or malformed" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token, but exclude the password from the result
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Update User Profile (Protected Route)
router.put("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied, token missing or malformed" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, password } = req.body;

    // Prepare an object with the fields to update
    const updateData = {};
    if (name) {
      updateData.name = name;
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update information provided" });
    }

    // Find user by ID and update, returning the new document
    const updatedUser = await User.findByIdAndUpdate(decoded.id, updateData, { new: true }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
