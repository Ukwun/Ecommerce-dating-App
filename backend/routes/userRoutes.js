const express = require('express');
const { registerUser, loginUser } = require('../controllers/userController.js');

const router = express.Router();

// ✅ Register route
router.post('/user-registration', registerUser);

// ✅ Login route
router.post('/login', loginUser);

module.exports = router;
