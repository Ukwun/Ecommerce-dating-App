const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const productImageBaseUrl = process.env.PUBLIC_API_URL || 'https://ecommerce-dating-app.onrender.com';
const imageFileIds = [
  'samsung-a15-001', 'iphone-15-001', 'oneplus-12-001', 'sony-headphones-001', 'ipad-pro-001',
  'nike-airmax-001', 'gucci-bag-001', 'adidas-ultraboost-001', 'tommy-polo-001', 'levis-jeans-001',
  'samsung-rice-001', 'lg-fridge-001', 'philips-kettle-001', 'pan-set-001', 'dyson-vacuum-001',
  'yamaha-bike-001', 'decathlon-treadmill-001', 'wilson-tennis-001', 'dumbbell-set-001', 'badminton-set-001',
  'atomic-habits-001', 'think-millionaire-001', '7habits-001', 'master-emotions-001', 'search-meaning-001',
];

async function migrateProductImages() {
  await mongoose.connect(process.env.MONGO_URI);
  let updated = 0;

  for (const fileId of imageFileIds) {
    const result = await Product.updateMany(
      { 'images.fileId': fileId },
      { $set: { 'images.$.url': `${productImageBaseUrl}/assets/products/${fileId}.jpg` } },
    );
    updated += result.modifiedCount;
  }

  console.log(`Updated ${updated} product image records.`);
  await mongoose.disconnect();
}

migrateProductImages().catch(async error => {
  console.error('Product image migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
