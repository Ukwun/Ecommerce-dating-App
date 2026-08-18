const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSettlement } = require('../services/sellerSettlement');

test('seller settlement deducts commission then reserve without losing cents', () => {
  assert.deepEqual(calculateSettlement(10000, 5, 10), {
    subtotal: 10000,
    commission: 500,
    reserve: 950,
    payableAfterReserve: 8550,
  });
});

test('seller settlement rounds currency values to two decimal places', () => {
  assert.deepEqual(calculateSettlement(999.99, 7.5, 12.5), {
    subtotal: 999.99,
    commission: 75,
    reserve: 115.62,
    payableAfterReserve: 809.37,
  });
});
