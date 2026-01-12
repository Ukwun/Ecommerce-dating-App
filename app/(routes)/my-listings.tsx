import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosinstance';
import { useAuth } from '@/hooks/AuthContext';

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/marketplace/api/products?seller=${user?.id}`);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch my products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyProducts();
    }
  }, [user]);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await axiosInstance.delete(`/marketplace/api/products/${id}`);
              setProducts(prev => prev.filter(p => p._id !== id));
            } catch (error) {
              Alert.alert("Error", "Failed to delete product");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
      />
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
        <Text style={styles.stock}>Stock: {item.stock}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => router.push({ pathname: '/(routes)/sell', params: { id: item._id } })}
        >
          <Feather name="edit-2" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDelete(item._id)}
        >
          <Feather name="trash-2" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => router.push('/(routes)/sell')} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FF8C00" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>You haven't listed any products yet.</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(routes)/sell')}>
                <Text style={styles.createButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  addButton: { padding: 4 },
  list: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  details: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#FF8C00', marginBottom: 2 },
  stock: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#3B82F6' },
  deleteButton: { backgroundColor: '#EF4444' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  createButton: { backgroundColor: '#FF8C00', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  createButtonText: { color: '#fff', fontWeight: 'bold' },
});
