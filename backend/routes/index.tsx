import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axiosInstance from '@/utils/axiosinstance';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT;

export default function WhoLikedMeScreen() {
  const router = useRouter();
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = async () => {
    try {
      const response = await axiosInstance.get('/dating/api/swipes/received');
      setLikes(response.data.likes || []);
    } catch (error) {
      console.error('Failed to fetch likes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, []);

  const handleLikeBack = async (userId: string, name: string) => {
    try {
      await axiosInstance.post(`/dating/api/swipe/${userId}`, { action: 'like' });
      Alert.alert('It\'s a Match!', `You matched with ${name}`);
      setLikes(prev => prev.filter(l => l.from._id !== userId));
    } catch (error) {
      Alert.alert('Error', 'Failed to match');
    }
  };

  const handlePass = async (userId: string) => {
    try {
      await axiosInstance.post(`/dating/api/swipe/${userId}`, { action: 'dislike' });
      setLikes(prev => prev.filter(l => l.from._id !== userId));
    } catch (error) {
      Alert.alert('Error', 'Failed to pass');
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const user = item.from;
    const profile = item.profile;
    const photoUrl = profile?.profilePhotoUrl || 'https://via.placeholder.com/150';

    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
          {item.action === 'superlike' && (
            <View style={styles.superLikeBadge}>
              <Ionicons name="star" size={12} color="#fff" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <Text style={styles.name}>{user.name}, {profile?.age}</Text>
          </LinearGradient>
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handlePass(user._id)} style={[styles.actionButton, styles.passButton]}>
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLikeBack(user._id, user.name)} style={[styles.actionButton, styles.likeButton]}>
              <Ionicons name="heart" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Who Liked Me</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF006E" />
        </View>
      ) : (
        <FlatList
          data={likes}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="heart-broken" size={64} color="#FF006E" />
              <Text style={styles.emptyText}>No likes yet. Boost your profile to get more visibility!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  list: { padding: 16 },
  columnWrapper: { justifyContent: 'space-between' },
  cardContainer: { width: ITEM_WIDTH, marginBottom: 16 },
  card: { borderRadius: 16, overflow: 'hidden', height: ITEM_WIDTH * 1.4, backgroundColor: '#F3F4F6', position: 'relative' },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 40 },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  superLikeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#3B82F6', padding: 6, borderRadius: 20 },
  actions: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  passButton: { borderWidth: 1, borderColor: '#EF4444' },
  likeButton: { backgroundColor: '#FF006E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },
});