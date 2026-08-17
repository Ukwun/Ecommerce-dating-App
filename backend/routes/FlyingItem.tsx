import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withSpring,
  runOnJS,
  Easing
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FlyingItemProps {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  onComplete: () => void;
  imageUri?: string;
}

export const FlyingItem = ({ startPos, endPos, onComplete, imageUri }: FlyingItemProps) => {
  const translateX = useSharedValue(startPos.x);
  const translateY = useSharedValue(startPos.y);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));

  useEffect(() => {
    // Animate X and Y separately to create a parabolic arc effect
    translateX.value = withTiming(endPos.x, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });

    // Add a realistic "tumble" rotation as it flies
    rotate.value = withTiming(360, { duration: 800 });

    translateY.value = withSequence(
      // Realistic "pop" out of the button before the arc
      withTiming(startPos.y - 50, { duration: 200 }),
      withTiming(endPos.y, { 
        duration: 600,
        easing: Easing.in(Easing.sin)
      }, () => {
        runOnJS(onComplete)();
      })
    );

    scale.value = withTiming(0.2, { duration: 800 });
    opacity.value = withTiming(0, { duration: 900 });
  }, []);

  return (
    <Animated.Image
      source={{ uri: imageUri || 'https://via.placeholder.com/100' }}
      style={[styles.flyingImage, animatedStyle]}
    />
  );
};

const styles = StyleSheet.create({
  flyingImage: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 9999,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
});
