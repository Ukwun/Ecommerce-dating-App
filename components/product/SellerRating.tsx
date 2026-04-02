import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSellerStats, useSellerRatings, formatSellerRating, getStarColor } from '../../hooks/useSellerRatings';

interface SellerProfileProps {
  sellerId: string;
  onViewDetails?: () => void;
}

export const SellerProfile: React.FC<SellerProfileProps> = ({ sellerId, onViewDetails }) => {
  const { data: stats, isLoading: statsLoading } = useSellerStats(sellerId);

  if (statsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  const formatted = formatSellerRating(stats);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Seller Information</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>

      <View style={styles.ratingContainer}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.floor(stats.averageRating) ? 'star' : 'star-outline'}
              size={18}
              color={getStarColor(stats.averageRating)}
              style={styles.star}
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {formatted.stars} ({formatted.count} reviews)
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Delivery</Text>
          <Text style={styles.statValue}>
            {Math.round(stats.ratingBreakdown.delivery * 10) / 10}☆
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Quality</Text>
          <Text style={styles.statValue}>
            {Math.round(stats.ratingBreakdown.productQuality * 10) / 10}☆
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Service</Text>
          <Text style={styles.statValue}>
            {Math.round(stats.ratingBreakdown.communication * 10) / 10}☆
          </Text>
        </View>
      </View>

      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        <Text style={styles.badgeText}>Verified Seller</Text>
      </View>
    </TouchableOpacity>
  );
};

interface SellerReviewsProps {
  sellerId: string;
}

export const SellerReviews: React.FC<SellerReviewsProps> = ({ sellerId }) => {
  const { data: ratings, isLoading, error } = useSellerRatings(sellerId);

  if (isLoading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.centered} />;
  }

  if (error || !ratings || ratings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.reviewsContainer}>
      <Text style={styles.reviewsTitle}>Customer Reviews</Text>
      <FlatList
        data={ratings}
        scrollEnabled={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>
                {item.buyer.name}
              </Text>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating ? 'star' : 'star-outline'}
                    size={14}
                    color="#FFD700"
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
            </View>
            {item.comment && (
              <Text style={styles.reviewComment}>{item.comment}</Text>
            )}
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  centered: {
    paddingVertical: 40,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  reviewsContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  reviewItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
});
