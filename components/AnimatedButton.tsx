import React from 'react';
import { TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle | Animated.AnimatedStyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy';
  scaleOnPress?: number;
}

export const AnimatedButton = ({
  onPress,
  children,
  style,
  disabled = false,
  haptic = 'medium',
  scaleOnPress = 0.94,
}: AnimatedButtonProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(disabled ? 0.6 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(scaleOnPress, { damping: 10, mass: 0.5 });
    if (haptic === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (haptic === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (haptic === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, mass: 0.5 });
  };

  return (
    <AnimatedTouchable
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
};

interface AnimatedScreenProps {
  children: React.ReactNode;
  entering?: any;
  style?: ViewStyle | Animated.AnimatedStyleProp<ViewStyle>;
}

export const AnimatedScreen = ({
  children,
  entering = SlideInUp.springify(),
  style,
}: AnimatedScreenProps) => {
  return (
    <Animated.View
      entering={entering}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </Animated.View>
  );
};

export const ScreenAnimations = {
  slideUp: SlideInUp.springify(),
  fade: FadeIn.springify(),
  zoom: ZoomIn.springify(),
};
