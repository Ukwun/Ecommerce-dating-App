const crypto = require('crypto');
const axios = require('axios');
const SellerProfile = require('../models/SellerProfile');
const SellerLedgerEntry = require('../models/SellerLedgerEntry');
const SellerPayout = require('../models/SellerPayout');
const Order = require('../models/Order');

const paystack = axios.create({ baseURL: 'https://api.paystack.co', timeout: 20000 });
const money = value => Math.round(Number(value || 0) * 100) / 100;
const fingerprint = profile => crypto.createHash('sha256').update(`${profile.bankCode}:${profile.accountNumber}`).digest('hex');
const auth = () => {
  if (!process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET) throw new Error('Paystack transfers are not configured');
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET}` };
};
const calculateSettlement = (subtotal, commissionRate, reserveRate) => {
  const gross = money(subtotal);
  const commission = money(gross * Number(commissionRate || 0) / 100);
  const reserve = money((gross - commission) * Number(reserveRate || 0) / 100);
  return { subtotal: gross, commission, reserve, payableAfterReserve: money(gross - commission - reserve) };
};

async function createSettlementEntries({ orderId, sellerId }) {
  const order = await Order.findById(orderId);
  if (!order || order.payment.status !== 'completed') throw new Error('Only paid orders can be settled');
  const fulfillment = order.fulfillments.find(item => String(item.seller) === String(sellerId));
  if (!fulfillment || fulfillment.status !== 'delivered' || !fulfillment.deliveredAt) throw new Error('Fulfilment is not delivered');
  const profile = await SellerProfile.findOne({ userId: sellerId, verificationStatus: 'approved' });
  if (!profile) throw new Error('Approved seller profile not found');
  const { subtotal, commission, reserve } = calculateSettlement(fulfillment.subtotal, profile.commissionRate, profile.payoutReserveRate);
  const availableAt = new Date(fulfillment.deliveredAt.getTime() + Number(process.env.PAYOUT_SETTLEMENT_DAYS || 7) * 86400000);
  const rows = [
    { kind: 'sale', direction: 'credit', amount: subtotal, status: 'pending', availableAt },
    { kind: 'commission', direction: 'debit', amount: commission, status: 'pending', availableAt },
    { kind: 'reserve', direction: 'debit', amount: reserve, status: 'pending', availableAt },
    { kind: 'reserve_release', direction: 'credit', amount: reserve, status: 'pending', availableAt: new Date(fulfillment.deliveredAt.getTime() + Number(process.env.PAYOUT_RESERVE_DAYS || 30) * 86400000) },
  ];
  for (const row of rows) {
    await SellerLedgerEntry.updateOne(
      { idempotencyKey: `${order._id}:${sellerId}:${row.kind}` },
      { $setOnInsert: { seller: sellerId, order: order._id, currency: 'NGN', ...row, idempotencyKey: `${order._id}:${sellerId}:${row.kind}` } },
      { upsert: true }
    );
  }
  return { subtotal, commission, reserve, availableAt };
}

async function releaseMaturedEntries(sellerId) {
  await SellerLedgerEntry.updateMany({ seller: sellerId, status: 'pending', availableAt: { $lte: new Date() } }, { $set: { status: 'available' } });
}

async function ensureRecipient(profile) {
  if (!profile.bankVerified || !profile.bankCode || !profile.accountNumber || !profile.accountName) throw new Error('Verified bank details are required');
  const currentFingerprint = fingerprint(profile);
  if (profile.paystackRecipientCode && profile.paystackRecipientAccountFingerprint === currentFingerprint) return profile.paystackRecipientCode;
  const response = await paystack.post('/transferrecipient', { type: 'nuban', name: profile.accountName, account_number: profile.accountNumber, bank_code: profile.bankCode, currency: 'NGN' }, { headers: auth() });
  profile.paystackRecipientCode = response.data.data.recipient_code;
  profile.paystackRecipientAccountFingerprint = currentFingerprint;
  await profile.save();
  return profile.paystackRecipientCode;
}

async function createPayout(sellerId) {
  await releaseMaturedEntries(sellerId);
  const entries = await SellerLedgerEntry.find({ seller: sellerId, status: 'available', payout: { $exists: false } });
  const amount = money(entries.reduce((sum, row) => sum + (row.direction === 'credit' ? row.amount : -row.amount), 0));
  if (amount < Number(process.env.PAYOUT_MINIMUM_NGN || 1000)) throw new Error('Available balance is below the payout minimum');
  const profile = await SellerProfile.findOne({ userId: sellerId, verificationStatus: 'approved' });
  if (!profile) throw new Error('Approved seller profile not found');
  const recipientCode = await ensureRecipient(profile);
  const payout = await SellerPayout.create({ seller: sellerId, amount, recipientCode, activeKey: String(sellerId), reference: `PO-${sellerId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}` });
  await SellerLedgerEntry.updateMany({ _id: { $in: entries.map(row => row._id) }, payout: { $exists: false } }, { $set: { payout: payout._id, status: 'held' } });
  return payout;
}

async function submitPayout(payoutId) {
  const payout = await SellerPayout.findOneAndUpdate({ _id: payoutId, status: 'queued' }, { $set: { status: 'processing' } }, { new: true });
  if (!payout) return SellerPayout.findById(payoutId);
  try {
    const response = await paystack.post('/transfer', { source: 'balance', amount: Math.round(payout.amount * 100), recipient: payout.recipientCode, reason: 'Marketplace seller settlement', reference: payout.reference }, { headers: auth() });
    payout.transferCode = response.data.data.transfer_code;
    await payout.save();
    return payout;
  } catch (error) {
    payout.status = 'failed';
    payout.activeKey = undefined;
    payout.failureReason = error.response?.data?.message || error.message;
    await payout.save();
    await SellerLedgerEntry.updateMany({ payout: payout._id }, { $unset: { payout: 1 }, $set: { status: 'available' } });
    throw error;
  }
}

async function reconcileTransfer(event, data) {
  const status = event === 'transfer.success' ? 'success' : event === 'transfer.reversed' ? 'reversed' : 'failed';
  const payout = await SellerPayout.findOne({ reference: data.reference });
  if (!payout || ['success', 'reversed'].includes(payout.status)) return payout;
  payout.status = status;
  payout.activeKey = undefined;
  payout.transferCode = data.transfer_code || payout.transferCode;
  payout.failureReason = status === 'failed' ? (data.reason || 'Transfer failed') : undefined;
  payout.processedAt = new Date();
  payout.reconciledAt = new Date();
  await payout.save();
  if (status === 'success') {
    await SellerLedgerEntry.updateMany({ payout: payout._id }, { $set: { status: 'paid' } });
    await SellerLedgerEntry.updateOne({ idempotencyKey: `payout:${payout.reference}` }, { $setOnInsert: { seller: payout.seller, payout: payout._id, kind: 'payout', direction: 'debit', amount: payout.amount, currency: payout.currency, status: 'paid', idempotencyKey: `payout:${payout.reference}` } }, { upsert: true });
    await SellerProfile.updateOne({ userId: payout.seller }, { $set: { lastPayout: new Date() } });
  } else {
    await SellerLedgerEntry.updateMany({ payout: payout._id }, { $unset: { payout: 1 }, $set: { status: 'available' } });
  }
  return payout;
}

async function recordOrderRefund(orderId, amount) {
  const order = await Order.findById(orderId);
  if (!order) return;
  const totalFulfilmentValue = order.fulfillments.reduce((sum, row) => sum + Number(row.subtotal || 0), 0);
  for (const fulfillment of order.fulfillments) {
    const sellerAmount = money(Number(amount || order.total) * (Number(fulfillment.subtotal || 0) / totalFulfilmentValue));
    await SellerLedgerEntry.updateOne(
      { idempotencyKey: `refund:${order._id}:${fulfillment.seller}` },
      { $setOnInsert: { seller: fulfillment.seller, order: order._id, kind: 'refund', direction: 'debit', amount: sellerAmount, currency: 'NGN', status: 'available', availableAt: new Date(), idempotencyKey: `refund:${order._id}:${fulfillment.seller}` } },
      { upsert: true }
    );
  }
}

module.exports = { calculateSettlement, createSettlementEntries, releaseMaturedEntries, createPayout, submitPayout, reconcileTransfer, recordOrderRefund };
