import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  onPress: (x: number, y: number) => void;
  isFavorite?: boolean;
  onFavoritePress: () => void;
}

export const InteractiveAddToCart = ({ onPress, isFavorite, onFavoritePress }: Props) => {
  const scale = useSharedValue(1);
  const btnRef = React.useRef<TouchableOpacity>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Measure location to tell the "FlyingItem" where to start
    btnRef.current?.measureInWindow((x, y, width, height) => {
      onPress(x + width / 2, y + height / 2);
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity 
        style={styles.favBtn} 
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onFavoritePress();
        }}
      >
        {/* FIX: Using 'heart' and 'heart-outline' to avoid question marks */}
        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#ff4757" : "#2f3542"} />
      </TouchableOpacity>

      <TouchableOpacity ref={btnRef} style={styles.addBtn} onPress={handlePress}>
        <Ionicons name="cart-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  favBtn: { padding: 8 },
  addBtn: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  }
});