const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

// Sample products for Nigerian marketplace (Konga/Jumia style)
const SAMPLE_PRODUCTS = [
  // Electronics
  {
    name: 'Samsung Galaxy A15 Android Phone',
    description: 'Powerful 5G-ready smartphone with 50MP camera and all-day battery life',
    category: 'Electronics',
    price: 189999,
    oldPrice: 249999,
    stock: 45,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Samsung+Galaxy+A15', fileId: 'samsung-a15-001' }],
    ratings: 4.5,
    numOfReviews: 128
  },
  {
    name: 'Apple iPhone 15 Pro Max',
    description: 'Latest iPhone with A17 Pro chip, titanium frame, and advanced camera system',
    category: 'Electronics',
    price: 799999,
    oldPrice: 899999,
    stock: 15,
    images: [{ url: 'https://via.placeholder.com/400x400?text=iPhone+15+Pro', fileId: 'iphone-15-001' }],
    ratings: 4.8,
    numOfReviews: 342
  },
  {
    name: 'OnePlus 12 5G Smartphone',
    description: 'Flagship killer with Snapdragon 8 Gen 3 and super fast charging',
    category: 'Electronics',
    price: 449999,
    oldPrice: 549999,
    stock: 28,
    images: [{ url: 'https://via.placeholder.com/400x400?text=OnePlus+12', fileId: 'oneplus-12-001' }],
    ratings: 4.6,
    numOfReviews: 215
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'Industry-leading noise cancellation with 30-hour battery life',
    category: 'Electronics',
    price: 129999,
    oldPrice: 179999,
    stock: 62,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Sony+Headphones', fileId: 'sony-headphones-001' }],
    ratings: 4.7,
    numOfReviews: 502
  },
  {
    name: 'iPad Pro 12.9 inch M2',
    description: 'Ultra-powerful tablet perfect for work and creativity',
    category: 'Electronics',
    price: 649999,
    oldPrice: 749999,
    stock: 12,
    images: [{ url: 'https://via.placeholder.com/400x400?text=iPad+Pro', fileId: 'ipad-pro-001' }],
    ratings: 4.4,
    numOfReviews: 189
  },
  
  // Fashion
  {
    name: 'Nike Air Max 90 Sneakers',
    description: 'Classic Air Max with modern comfort technology',
    category: 'Fashion',
    price: 34999,
    oldPrice: 49999,
    stock: 156,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Nike+Air+Max', fileId: 'nike-airmax-001' }],
    ratings: 4.6,
    numOfReviews: 1204
  },
  {
    name: 'Gucci Marmont Leather Bag',
    description: 'Authentic luxury leather shoulder bag with gold hardware',
    category: 'Fashion',
    price: 289999,
    oldPrice: 399999,
    stock: 8,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Gucci+Bag', fileId: 'gucci-bag-001' }],
    ratings: 4.8,
    numOfReviews: 342
  },
  {
    name: 'Adidas Ultraboost 23 Running Shoes',
    description: 'Next-gen cushioning for premium running experience',
    category: 'Fashion',
    price: 44999,
    oldPrice: 59999,
    stock: 89,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Adidas+Ultraboost', fileId: 'adidas-ultraboost-001' }],
    ratings: 4.7,
    numOfReviews: 876
  },
  {
    name: 'Tommy Hilfiger Polo Shirt (Blue)',
    description: 'Classic men\'s polo shirt in premium cotton',
    category: 'Fashion',
    price: 12999,
    oldPrice: 19999,
    stock: 203,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Tommy+Polo', fileId: 'tommy-polo-001' }],
    ratings: 4.3,
    numOfReviews: 567
  },
  {
    name: 'Levi\'s 501 Original Fit Jeans',
    description: 'Timeless denim jeans that never go out of style',
    category: 'Fashion',
    price: 16999,
    oldPrice: 24999,
    stock: 178,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Levis+Jeans', fileId: 'levis-jeans-001' }],
    ratings: 4.5,
    numOfReviews: 2341
  },

  // Home & Kitchen
  {
    name: 'Samsung Digital Rice Cooker',
    description: 'Multi-function rice cooker with 10 cooking menus',
    category: 'Home & Kitchen',
    price: 24999,
    oldPrice: 34999,
    stock: 76,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Samsung+Rice+Cooker', fileId: 'samsung-rice-001' }],
    ratings: 4.4,
    numOfReviews: 643
  },
  {
    name: 'LG Side by Side Refrigerator',
    description: 'Inverter technology refrigerator with freezer',
    category: 'Home & Kitchen',
    price: 289999,
    oldPrice: 399999,
    stock: 5,
    images: [{ url: 'https://via.placeholder.com/400x400?text=LG+Fridge', fileId: 'lg-fridge-001' }],
    ratings: 4.6,
    numOfReviews: 212
  },
  {
    name: 'Philips Electric Kettle (3L)',
    description: 'Fast boiling electric kettle with auto shut-off',
    category: 'Home & Kitchen',
    price: 8999,
    oldPrice: 12999,
    stock: 142,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Philips+Kettle', fileId: 'philips-kettle-001' }],
    ratings: 4.2,
    numOfReviews: 1087
  },
  {
    name: 'Ceramic Non-Stick Frying Pan Set (3-piece)',
    description: 'Durable non-stick cookware set for everyday cooking',
    category: 'Home & Kitchen',
    price: 14999,
    oldPrice: 22999,
    stock: 89,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Pan+Set', fileId: 'pan-set-001' }],
    ratings: 4.3,
    numOfReviews: 756
  },
  {
    name: 'Dyson Cordless Vacuum Cleaner',
    description: 'Powerful wireless vacuum with 60-minute runtime',
    category: 'Home & Kitchen',
    price: 199999,
    oldPrice: 279999,
    stock: 11,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Dyson+Vacuum', fileId: 'dyson-vacuum-001' }],
    ratings: 4.7,
    numOfReviews: 434
  },

  // Sports & Outdoors
  {
    name: 'Yamaha Stationary Bike',
    description: 'Home fitness bike with digital display and resistance levels',
    category: 'Sports & Outdoors',
    price: 79999,
    oldPrice: 119999,
    stock: 22,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Stationary+Bike', fileId: 'yamaha-bike-001' }],
    ratings: 4.5,
    numOfReviews: 287
  },
  {
    name: 'Decathlon Running Treadmill',
    description: 'Compact motorized treadmill for home gym',
    category: 'Sports & Outdoors',
    price: 99999,
    oldPrice: 149999,
    stock: 15,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Treadmill', fileId: 'decathlon-treadmill-001' }],
    ratings: 4.4,
    numOfReviews: 198
  },
  {
    name: 'Wilson Professional Tennis Racket',
    description: 'Professional-grade tennis racket with carbon frame',
    category: 'Sports & Outdoors',
    price: 34999,
    oldPrice: 49999,
    stock: 31,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Tennis+Racket', fileId: 'wilson-tennis-001' }],
    ratings: 4.6,
    numOfReviews: 145
  },
  {
    name: 'Dumbbell Set (20kg)',
    description: 'Adjustable dumbbells for complete home workout',
    category: 'Sports & Outdoors',
    price: 28999,
    oldPrice: 39999,
    stock: 56,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Dumbbells', fileId: 'dumbbell-set-001' }],
    ratings: 4.3,
    numOfReviews: 412
  },
  {
    name: 'Badminton/Volleyball Racket Set',
    description: 'Complete outdoor game set with net and rackets',
    category: 'Sports & Outdoors',
    price: 12999,
    oldPrice: 18999,
    stock: 74,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Game+Set', fileId: 'badminton-set-001' }],
    ratings: 4.2,
    numOfReviews: 298
  },

  // Books & Media
  {
    name: 'Atomic Habits by James Clear',
    description: 'International bestseller on building better habits',
    category: 'Books & Media',
    price: 5999,
    oldPrice: 8999,
    stock: 203,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Atomic+Habits', fileId: 'atomic-habits-001' }],
    ratings: 4.8,
    numOfReviews: 3421
  },
  {
    name: 'Think Like a Millionaire by Brian Tracy',
    description: 'Personal development book on wealth building',
    category: 'Books & Media',
    price: 4999,
    oldPrice: 7999,
    stock: 156,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Think+Like+Millionaire', fileId: 'think-millionaire-001' }],
    ratings: 4.6,
    numOfReviews: 892
  },
  {
    name: 'The 7 Habits of Highly Effective People',
    description: 'Classic business and personal development book',
    category: 'Books & Media',
    price: 5999,
    oldPrice: 8999,
    stock: 89,
    images: [{ url: 'https://via.placeholder.com/400x400?text=7+Habits', fileId: '7habits-001' }],
    ratings: 4.7,
    numOfReviews: 1567
  },
  {
    name: 'Master Your Emotions by Thibaut Meurisse',
    description: 'Guide to emotional intelligence and self-mastery',
    category: 'Books & Media',
    price: 4999,
    oldPrice: 7999,
    stock: 67,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Master+Emotions', fileId: 'master-emotions-001' }],
    ratings: 4.5,
    numOfReviews: 534
  },
  {
    name: 'Man\'s Search for Meaning by Viktor Frankl',
    description: 'Philosophical must-read about finding purpose',
    category: 'Books & Media',
    price: 4999,
    oldPrice: 7999,
    stock: 112,
    images: [{ url: 'https://via.placeholder.com/400x400?text=Search+Meaning', fileId: 'search-meaning-001' }],
    ratings: 4.9,
    numOfReviews: 2103
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create a system seller account if it doesn't exist
    let systemSeller = await User.findOne({ email: 'system-seller@marketplace.com' });
    if (!systemSeller) {
      systemSeller = await User.create({
        name: 'System Marketplace',
        email: 'system-seller@marketplace.com',
        password: 'SellerPassword123!', // This will be hashed by the model
        userType: 'seller',
        avatar: 'https://via.placeholder.com/100x100?text=System'
      });
      console.log('✅ Created system seller account');
    }

    // Assign seller ID to all products
    const productsWithSeller = SAMPLE_PRODUCTS.map(product => ({
      ...product,
      seller: systemSeller._id
    }));

    // Delete existing products (optional, for clean slate)
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing products`);

    // Insert all products
    const createdProducts = await Product.insertMany(productsWithSeller);
    console.log(`✅ Seeded ${createdProducts.length} products successfully!`);

    // Display sample of created products
    console.log('\n📦 Sample products created:');
    createdProducts.slice(0, 5).forEach(product => {
      console.log(`  - ${product.name} (₦${product.price.toLocaleString()}) [Stock: ${product.stock}]`);
    });

    console.log(`\n✅ Database seeding complete!`);
    console.log(`   Total products: ${createdProducts.length}`);
    console.log(`   Total value: ₦${createdProducts.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}`);
    console.log(`   Categories: ${[...new Set(createdProducts.map(p => p.category))].join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
