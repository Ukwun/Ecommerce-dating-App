const Product = require('../models/Product');
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');

/**
 * Recommendation Engine - Generates personalized product recommendations
 * Based on user activity, viewing history, purchases, and browsing patterns
 */

class RecommendationEngine {
  /**
   * Get personalized products for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Array of recommended products
   */
  static async getPersonalizedProducts(userId, limit = 20) {
    try {
      // 1. Get user's recent activities (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const userActivities = await UserActivity.find({
        userId,
        timestamp: { $gte: thirtyDaysAgo }
      }).sort({ timestamp: -1 }).limit(200);

      // If user has no activity, return top-rated products (faster for new users)
      if (userActivities.length === 0) {
        console.log(`New user ${userId} - returning top-rated products`);
        return await Product.find({ stock: { $gt: 0 } })
          .select('name price oldPrice category images ratings numOfReviews seller')
          .populate('seller', 'name avatar')
          .sort({ ratings: -1, numOfReviews: -1 })
          .limit(limit);
      }

      // 2. Extract categories, sellers, and products user interacted with
      const interactedCategories = new Map(); // category -> weight
      const interactedSellers = new Map(); // sellerId -> weight
      const viewedProductIds = new Set();
      const searchQueries = [];

      userActivities.forEach(activity => {
        let weight = 1;
        
        // Give more weight to purchases and favorites
        if (activity.activityType === 'purchase') weight = 5;
        else if (activity.activityType === 'add_favorite') weight = 3;
        else if (activity.activityType === 'add_to_cart') weight = 2;
        else if (activity.activityType === 'product_view') weight = 1;
        else if (activity.activityType === 'product_search') weight = 0.5;

        // Track categories
        if (activity.category) {
          interactedCategories.set(
            activity.category,
            (interactedCategories.get(activity.category) || 0) + weight
          );
        }

        // Track sellers
        if (activity.sellerId) {
          interactedSellers.set(
            activity.sellerId.toString(),
            (interactedSellers.get(activity.sellerId.toString()) || 0) + weight
          );
        }

        // Track viewed products
        if (activity.productId) {
          viewedProductIds.add(activity.productId.toString());
        }

        // Track searches
        if (activity.searchQuery) {
          searchQueries.push(activity.searchQuery);
        }
      });

      // 3. Build recommendation query
      const topCategories = Array.from(interactedCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);

      const topSellers = Array.from(interactedSellers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sellerId]) => sellerId);

      // 4. Fetch recommended products (optimized query)
      const query = {
        stock: { $gt: 0 },
        _id: { $nin: Array.from(viewedProductIds) }
      };

      // Only add $or if we have categories or sellers
      if (topCategories.length > 0 || topSellers.length > 0) {
        query.$or = [];
        if (topCategories.length > 0) {
          query.$or.push({ category: { $in: topCategories } });
        }
        if (topSellers.length > 0) {
          query.$or.push({ seller: { $in: topSellers } });
        }
      }

      const recommendedProducts = await Product.find(query)
        .select('name price oldPrice category images ratings numOfReviews seller')
        .populate('seller', 'name avatar')
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(limit);

      return recommendedProducts;
    } catch (error) {
      console.error('Error in getPersonalizedProducts:', error);
      // Return top products as fallback
      return await Product.find({ stock: { $gt: 0 } })
        .select('name price oldPrice category images ratings numOfReviews seller')
        .populate('seller', 'name avatar')
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(limit);
    }
  }

  /**
   * Get trending products (most viewed/purchased recently)
   */
  static async getTrendingProducts(limit = 20) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get most interacted product IDs
      const trendingActivities = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo },
            productId: { $exists: true, $ne: null },
            activityType: { $in: ['product_view', 'add_to_cart', 'purchase', 'add_favorite'] }
          }
        },
        {
          $group: {
            _id: '$productId',
            count: { $sum: 1 },
            weight: {
              $sum: {
                $cond: [
                  { $eq: ['$activityType', 'purchase'] }, 
                  5,
                  {
                    $cond: [
                      { $eq: ['$activityType', 'add_favorite'] }, 
                      3,
                      {
                        $cond: [
                          { $eq: ['$activityType', 'add_to_cart'] }, 
                          2, 
                          1
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          }
        },
        { $sort: { weight: -1 } },
        { $limit: limit }
      ]);

      const productIds = trendingActivities.map(a => a._id);
      const products = await Product.find({ _id: { $in: productIds } })
        .populate('seller', 'name avatar')
        .sort({ ratings: -1 });

      return products;
    } catch (error) {
      console.error('Error in getTrendingProducts:', error);
      throw error;
    }
  }

  /**
   * Get similar products to a given product
   */
  static async getSimilarProducts(productId, limit = 10) {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      const similarProducts = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        stock: { $gt: 0 },
        seller: { $ne: product.seller }
      })
        .populate('seller', 'name avatar')
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(limit);

      return similarProducts;
    } catch (error) {
      console.error('Error in getSimilarProducts:', error);
      throw error;
    }
  }

  /**
   * Get products based on location proximity (if applicable)
   */
  static async getLocalProducts(userId, limit = 20) {
    try {
      // TODO: Implement location-based product discovery
      // For now, return most popular products
      return await Product.find({ stock: { $gt: 0 } })
        .populate('seller', 'name avatar')
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error in getLocalProducts:', error);
      throw error;
    }
  }

  /**
   * Calculate user profile stats based on activity
   */
  static async getUserStats(userId) {
    try {
      const stats = await UserActivity.aggregate([
        {
          $match: { userId: require('mongoose').Types.ObjectId(userId) }
        },
        {
          $group: {
            _id: null,
            totalViews: {
              $sum: { $cond: [{ $eq: ['$activityType', 'product_view'] }, 1, 0] }
            },
            totalSearches: {
              $sum: { $cond: [{ $eq: ['$activityType', 'product_search'] }, 1, 0] }
            },
            totalFavorites: {
              $sum: { $cond: [{ $eq: ['$activityType', 'add_favorite'] }, 1, 0] }
            },
            totalPurchases: {
              $sum: { $cond: [{ $eq: ['$activityType', 'purchase'] }, 1, 0] }
            },
            avgSessionDuration: { $avg: '$metadata.duration' }
          }
        }
      ]);

      return stats.length > 0 ? stats[0] : {
        totalViews: 0,
        totalSearches: 0,
        totalFavorites: 0,
        totalPurchases: 0,
        avgSessionDuration: 0
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      throw error;
    }
  }

  /**
   * Get products similar to user's purchase history
   * For better recommendations based on what they've already bought
   */
  static async getProductsFromPurchaseHistory(userId, limit = 15) {
    try {
      const Order = require('../models/Order');
      
      // Get user's purchase history (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const userOrders = await Order.find({
        user: userId,
        createdAt: { $gte: sixMonthsAgo }
      }).populate('products.product');

      if (!userOrders || userOrders.length === 0) {
        return [];
      }

      // Extract product categories and IDs from purchases
      const purchasedCategories = new Set();
      const purchasedProductIds = new Set();

      userOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
          order.products.forEach(item => {
            if (item.product) {
              purchasedCategories.add(item.product.category);
              purchasedProductIds.add(item.product._id.toString());
            }
          });
        }
      });

      // Find similar products in same categories
      const similarProducts = await Product.find({
        _id: { $nin: Array.from(purchasedProductIds) },
        category: { $in: Array.from(purchasedCategories) },
        stock: { $gt: 0 }
      })
        .populate('seller', 'name avatar')
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(limit);

      return similarProducts;
    } catch (error) {
      console.error('Error in getProductsFromPurchaseHistory:', error);
      return [];
    }
  }

  /**
   * Get highly-rated sellers for user to discover
   */
  static async getTopRatedSellers(limit = 10) {
    try {
      const SellerRating = require('../models/SellerRating');
      
      // Aggregate seller ratings
      const topSellers = await SellerRating.aggregate([
        {
          $group: {
            _id: '$seller',
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            avgDelivery: { $avg: '$categories.delivery' },
            avgQuality: { $avg: '$categories.productQuality' },
            avgCommunication: { $avg: '$categories.communication' }
          }
        },
        { $match: { totalRatings: { $gte: 5 } } }, // Only sellers with 5+ ratings
        { $sort: { averageRating: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'sellerInfo'
          }
        }
      ]);

      return topSellers;
    } catch (error) {
      console.error('Error in getTopRatedSellers:', error);
      return [];
    }
  }

  /**
   * Get seller statistics and ratings
   */
  static async getSellerStats(sellerId) {
    try {
      const SellerRating = require('../models/SellerRating');
      const Order = require('../models/Order');

      // Get seller ratings
      const ratingStats = await SellerRating.aggregate([
        { $match: { seller: require('mongoose').Types.ObjectId(sellerId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            avgDelivery: { $avg: '$categories.delivery' },
            avgQuality: { $avg: '$categories.productQuality' },
            avgCommunication: { $avg: '$categories.communication' }
          }
        }
      ]);

      // Get order count
      const orderCount = await Order.countDocuments({ seller: sellerId });

      // Get total sales
      const totalSales = await Order.aggregate([
        { $match: { seller: require('mongoose').Types.ObjectId(sellerId) } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);

      return {
        ratings: ratingStats.length > 0 ? ratingStats[0] : {
          averageRating: 0,
          totalRatings: 0,
          avgDelivery: 0,
          avgQuality: 0,
          avgCommunication: 0
        },
        orderCount: orderCount,
        totalSales: totalSales.length > 0 ? totalSales[0].total : 0
      };
    } catch (error) {
      console.error('Error in getSellerStats:', error);
      throw error;
    }
  }
}

module.exports = RecommendationEngine;
