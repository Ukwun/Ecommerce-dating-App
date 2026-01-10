import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
// Approximation based on numColumns=2 and horizontal padding of 14 on each side + column gap
const cardWidth = (width - 28 - 14) / 2;

const Skeleton = ({ width, height, style }: { width?: number | string; height?: number | string; style?: any }) => (
  <View style={[{ width, height, backgroundColor: '#E5E7EB', borderRadius: 4 }, style]} />
);

const Shimmer = () => (
  <MotiView
    from={{ translateX: -cardWidth }}
    animate={{ translateX: cardWidth * 2 }}
    transition={{
      type: 'timing',
      duration: 1200,
      loop: true,
      repeatReverse: false,
    }}
    style={StyleSheet.absoluteFill}
  >
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.05)', 'transparent']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    />
  </MotiView>
);

const ProductSkeleton = () => {
  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        <Skeleton width="100%" height={150} style={{ borderRadius: 0 }} />
      </View>
      <View style={styles.details}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={16} style={{ marginTop: 8 }} />
        <View style={styles.bottomRow}>
          <Skeleton width={60} height={14} />
          <Skeleton width={32} height={32} style={{ borderRadius: 16 }} />
        </View>
      </View>
      <Shimmer />
    </View>
  );
};

export default ProductSkeleton;

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 150,
  },
  details: {
    padding: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});