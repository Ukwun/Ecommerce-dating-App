import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  interpolateColor,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | React.ReactNode;
}

/**
 * A modern, high-fidelity animated checkbox for the Signup experience.
 * Implements spring-based micro-interactions and haptic feedback to provide
 * a realistic, premium feel.
 */
export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({ checked, onChange, label }) => {
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { 
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1)
    });
  }, [checked, progress]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(progress.value, [0, 1], ['#F2F2F7', '#007AFF']);
    const borderColor = interpolateColor(progress.value, [0, 1], ['#E5E5EA', '#007AFF']);
    
    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: scale.value }]
    };
  });

  const animatedCheckStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: withSpring(progress.value, { damping: 12, stiffness: 200 }) }]
    };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    onChange(!checked);
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      activeOpacity={0.8} 
      style={styles.container}
    >
      <Animated.View style={[styles.checkbox, animatedContainerStyle]}>
        <Animated.View style={animatedCheckStyle}>
          <Ionicons name="checkmark" size={16} color="white" />
        </Animated.View>
      </Animated.View>
      {typeof label === 'string' ? <Text style={styles.label}>{label}</Text> : label}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: '#3A3A3C',
    flex: 1,
    lineHeight: 20,
  },
});
