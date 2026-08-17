import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

/**
 * MICRO-ANIMATIONS LIBRARY
 * Collection of smooth, modern animations for realistic user experience
 */

// 1. PULSE ANIMATION - Heart beat effect
export const PulseAnimation = ({ children, intensity = 1 }: any) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1 + 0.1 * intensity, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1
    );
  }, [intensity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 2. BOUNCE ANIMATION - Item appears with bounce
export const BounceAnimation = ({ children, delay = 0 }: any) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withSpring(1, { damping: 12, mass: 1, stiffness: 100 });
    }, delay);
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 3. SHAKE ANIMATION - Error feedback
export const ShakeAnimation = ({ children, trigger = 0 }: any) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (trigger > 0) {
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [translateX, trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 4. SLIDE IN ANIMATION - Smooth slide from sides
export const SlideInAnimation = ({ children, direction = 'left', delay = 0 }: any) => {
  const translateX = useSharedValue(direction === 'left' ? -100 : 100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      translateX.value = withSpring(0, { damping: 10 });
      opacity.value = withTiming(1, { duration: 300 });
    }, delay);
  }, [delay, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 5. FADE IN UP ANIMATION - Subtle entrance
export const FadeInUpAnimation = ({ children, delay = 0 }: any) => {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    }, delay);
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 6. FLIP CARD ANIMATION - Card flip effect
export const FlipAnimation = ({ children, isFlipped = false }: any) => {
  const rotateY = useSharedValue(0);

  useEffect(() => {
    rotateY.value = withSpring(isFlipped ? 180 : 0, { damping: 12 });
  }, [isFlipped, rotateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        perspective: 1000
      },
      {
        rotateY: interpolate(
          rotateY.value,
          [0, 180],
          [0, 180],
          Extrapolation.CLAMP
        ) + 'deg'
      }
    ]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 7. PROGRESS BAR ANIMATION - Smooth progress animation
export const ProgressAnimation = ({ progress = 0 }: any) => {
  const width = useSharedValue(progress * 100);

  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as `${number}%`
  }));

  return (
    <View style={styles.progressContainer}>
      <Animated.View style={[styles.progressBar as any, animatedStyle]} />
    </View>
  );
};

// 8. LOADING SPINNER - Rotating spinner
export const SpinnerAnimation = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rotation.value + 'deg' }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.spinner} />
    </Animated.View>
  );
};

// 9. SCALE BUTTON PRESS - Interactive button feedback
export const ScaleButtonAnimation = ({ onPress, children }: any) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View
      style={animatedStyle}
      onTouchStart={handlePressIn}
      onTouchEnd={() => {
        handlePressOut();
        onPress?.();
      }}
    >
      {children}
    </Animated.View>
  );
};

// 10. FLOATING ACTION - Subtle float up and down
export const FloatingAnimation = ({ children }: any) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 11. GRADIENT SHIMMER - Loading skeleton effect
export const ShimmerAnimation = () => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View style={[styles.shimmer, animatedStyle]} />
  );
};

// 12. MORPH ANIMATION - Shape morphing
export const MorphAnimation = ({ fromScale = 0, toScale = 1 }: any) => {
  const scale = useSharedValue(fromScale);

  useEffect(() => {
    scale.value = withSpring(toScale, { damping: 15, mass: 1.2 });
  }, [scale, toScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.morphShape} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    borderTopColor: '#2563EB',
    borderRightColor: '#2563EB'
  },
  shimmer: {
    width: '100%',
    height: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 8
  },
  morphShape: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB'
  }
});
