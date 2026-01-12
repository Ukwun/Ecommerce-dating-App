import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axiosInstance from '@/utils/axiosinstance';

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        axiosInstance.get('/marketplace/api/wallet'),
        axiosInstance.get('/marketplace/api/wallet/history')
      ]);
      setBalance(balanceRes.data.balance);
      setTransactions(historyRes.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet data', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleWithdraw = async () => {
    if (!accountNumber || !bankName || !amount) {
      Alert.alert('Error', 'Please fill in all withdrawal details.');
      return;
    }
    if (Number(amount) > balance) {
      Alert.alert('Error', 'Insufficient funds.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/marketplace/api/wallet/withdraw', {
        amount,
        bankName,
        accountNumber
      });
      Alert.alert('Success', 'Withdrawal request submitted successfully!');
      setAmount('');
      setAccountNumber('');
      setBankName('');
      fetchData(); // Refresh balance and history
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Total Earnings</Text>
                <Text style={styles.statValue}>₦{balance.toLocaleString()}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>₦0</Text>
              </View>
            </View>
          </View>

          {/* Withdrawal Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Withdraw Funds</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GTBank, Zenith Bank"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="0123456789"
                keyboardType="numeric"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (₦)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <TouchableOpacity 
              style={styles.withdrawButton} 
              onPress={handleWithdraw}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.withdrawButtonText}>Withdraw Money</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent Transactions Mock */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.map((item) => (
              <View key={item._id} style={styles.transactionItem}>
                <View style={styles.transIcon}>
                  <MaterialCommunityIcons name={item.type === 'credit' ? "arrow-bottom-left" : "arrow-top-right"} size={24} color={item.type === 'credit' ? "#10B981" : "#EF4444"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transTitle}>{item.description || (item.type === 'credit' ? "Product Sold" : "Withdrawal")}</Text>
                  <Text style={styles.transDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.transAmount, { color: item.type === 'credit' ? "#10B981" : "#EF4444" }]}>
                  {item.type === 'credit' ? "+" : "-"}₦{item.amount.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  balanceCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  balanceLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  formContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 16 },
  withdrawButton: { backgroundColor: '#FF8C00', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  withdrawButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historyContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 20 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  transIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  transDate: { fontSize: 12, color: '#6B7280' },
  transAmount: { fontSize: 16, fontWeight: 'bold' },
});