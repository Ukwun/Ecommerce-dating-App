const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// Get Wallet Balance
router.get('/', protect, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }
    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Get Transaction History
router.get('/history', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Request Withdrawal
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, bankName, accountNumber } = req.body;
    const withdrawalAmount = Number(amount);

    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet || wallet.balance < withdrawalAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }

    // Deduct balance immediately
    wallet.balance -= withdrawalAmount;
    await wallet.save();

    // Record Transaction
    await Transaction.create({
      user: req.user.id,
      type: 'debit',
      category: 'withdrawal',
      amount: withdrawalAmount,
      description: `Withdrawal to ${bankName} - ${accountNumber}`,
      status: 'pending' // Pending until admin processes it
    });

    res.json({ success: true, message: 'Withdrawal request submitted', balance: wallet.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;