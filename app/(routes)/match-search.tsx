import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function MatchSearchScreen() {
  const router = useRouter();

  useEffect(() => {
    // Simulate searching delay then navigate to Discover
    const timer = setTimeout(() => {
      router.replace('/(tabs)/discover');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FF006E', '#FF4785']} style={styles.background} />
      
      <View style={styles.content}>
        <View style={styles.radarContainer}>
          {[...Array(3)].map((_, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 4 }}
              transition={{
                type: 'timing',
                duration: 2000,
                loop: true,
                delay: index * 400,
                repeatReverse: false,
              }}
              style={[styles.ripple, { borderColor: 'rgba(255,255,255,0.5)' }]}
            />
          ))}
          
          <View style={styles.avatarContainer}>
             <Ionicons name="search" size={40} color="#FF006E" />
          </View>
        </View>

        <Text style={styles.title}>Finding People Nearby...</Text>
        <Text style={styles.subtitle}>Scanning your area for matches</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  content: { alignItems: 'center' },
  radarContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 50 },
  ripple: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    position: 'absolute',
  },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});