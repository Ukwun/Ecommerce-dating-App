import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Background view for the bottom tab bar. Keep it non-interactive so it
// does not intercept touches (pointerEvents: 'none') and limit its height to
// the tab bar area so it doesn't dim the whole screen.
export function BlurTabBarBackground() {
  return <View pointerEvents="none" style={styles.blurBackground} />;
}

const TAB_HEIGHT = Platform.select({ ios: 78, default: 64 });

const styles = StyleSheet.create({
  blurBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.6)',
    // If you add expo-blur later, you can layer it here to get a blur effect.
  },
});
