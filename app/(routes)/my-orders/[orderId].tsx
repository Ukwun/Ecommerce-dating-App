import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import axiosInstance from '@/utils/axiosinstance';

const trackingData = [
  { status: 'Order Placed', date: 'Oct 22, 2023, 10:00 AM', icon: 'package-variant' as const, completed: true },
  { status: 'Processing', date: 'Oct 22, 2023, 11:30 AM', icon: 'cogs' as const, completed: true },
  { status: 'Shipped', date: 'Oct 24, 2023, 02:00 PM', icon: 'truck-fast' as const, completed: true },
  { status: 'Out for Delivery', date: 'Oct 26, 2023, 09:00 AM', icon: 'map-marker-path' as const, completed: false },
  { status: 'Delivered', date: '', icon: 'check-circle' as const, completed: false },
];

const TrackingItem = ({ item, isLast }: { item: typeof trackingData[0], isLast: boolean }) => (
  <View style={styles.trackingItem}>
    <View style={styles.iconColumn}>
      <View style={[styles.iconContainer, item.completed && styles.iconCompleted]}>
        <MaterialCommunityIcons name={item.icon} size={24} color={item.completed ? '#fff' : '#4B5563'} />
      </View>
      {!isLast && <View style={[styles.line, item.completed && styles.lineCompleted]} />}
    </View>
    <View style={styles.detailsColumn}>
      <Text style={[styles.statusText, item.completed && styles.statusCompleted]}>{item.status}</Text>
      <Text style={styles.dateText}>{item.date}</Text>
    </View>
  </View>
);

export default function TrackOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [showIssueInput, setShowIssueInput] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Mock coordinates for demo (Lagos, Nigeria)
  const warehouseLoc = { latitude: 6.5244, longitude: 3.3792 };
  const deliveryLoc = { latitude: 6.4281, longitude: 3.4219 }; 
  const [driverLoc, setDriverLoc] = useState({ latitude: 6.4800, longitude: 3.4000 });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axiosInstance.get(`/marketplace/api/orders/${orderId}`);
        setOrder(response.data.data);
      } catch (error) {
        console.error('Failed to fetch order', error);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  // Simulate driver movement
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverLoc(prev => {
        // Simple linear interpolation towards delivery
        const latDiff = deliveryLoc.latitude - prev.latitude;
        const lngDiff = deliveryLoc.longitude - prev.longitude;
        
        if (Math.abs(latDiff) < 0.001 && Math.abs(lngDiff) < 0.001) {
            return prev; // Arrived
        }

        return {
            latitude: prev.latitude + latDiff * 0.05,
            longitude: prev.longitude + lngDiff * 0.05
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a star rating');
      return;
    }
    try {
      setSubmittingRating(true);
      const response = await axiosInstance.post(`/marketplace/api/orders/${order._id}/rate-driver`, { rating, feedback });
      setOrder(response.data.data);
      Alert.alert('Success', 'Thank you for rating the driver!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleTipDriver = async () => {
    if (!tipAmount || isNaN(Number(tipAmount)) || Number(tipAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid tip amount');
      return;
    }
    try {
      setSubmittingTip(true);
      const response = await axiosInstance.post(`/marketplace/api/orders/${order._id}/tip-driver`, { amount: Number(tipAmount) });
      setOrder(response.data.data);
      Alert.alert('Success', 'Tip added successfully!');
      setTipAmount('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add tip');
    } finally {
      setSubmittingTip(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueText.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    try {
      setSubmittingIssue(true);
      const response = await axiosInstance.post(`/marketplace/api/orders/${order._id}/report-issue`, { issue: issueText });
      setOrder(response.data.data);
      Alert.alert('Success', 'Issue reported. Support will contact you shortly.');
      setIssueText('');
      setShowIssueInput(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to report issue');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const response = await axiosInstance.put(`/marketplace/api/orders/${order._id}/cancel`);
              setOrder(response.data.data);
              Alert.alert('Success', 'Order cancelled successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel order');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* QR Code for Pickup */}
          {order?.deliveryOption === 'station' && (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Pickup QR Code</Text>
              <Text style={styles.qrSubtitle}>Scan this code at the station to collect your order</Text>
              <View style={styles.qrContainer}>
                <QRCode value={order._id} size={180} />
              </View>
              <Text style={styles.orderRef}>Order ID: {order.orderNumber || order._id}</Text>
            </View>
          )}

          {/* Map View */}
          <View style={styles.mapContainer}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: (warehouseLoc.latitude + deliveryLoc.latitude) / 2,
                    longitude: (warehouseLoc.longitude + deliveryLoc.longitude) / 2,
                    latitudeDelta: 0.2,
                    longitudeDelta: 0.2,
                }}
            >
                <Marker coordinate={warehouseLoc} title="Warehouse">
                    <View style={[styles.markerIcon, { backgroundColor: '#6B7280' }]}>
                        <MaterialCommunityIcons name="warehouse" size={16} color="white" />
                    </View>
                </Marker>
                
                <Marker coordinate={deliveryLoc} title="Delivery Location">
                    <View style={[styles.markerIcon, { backgroundColor: '#10B981' }]}>
                        <Ionicons name="home" size={16} color="white" />
                    </View>
                </Marker>

                <Marker coordinate={driverLoc} title="Driver">
                    <View style={[styles.markerIcon, { backgroundColor: '#FF8C00' }]}>
                        <MaterialCommunityIcons name="truck-delivery" size={16} color="white" />
                    </View>
                </Marker>

                <Polyline 
                    coordinates={[warehouseLoc, driverLoc, deliveryLoc]} 
                    strokeColor="#FF8C00" 
                    strokeWidth={3} 
                />
            </MapView>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryOrderId}>Order ID: {orderId}</Text>
            <Text style={styles.summaryText}>Estimated Delivery: Oct 27, 2023</Text>
          </View>

          {/* Tip Driver Section - Show if delivered */}
          {order?.status === 'delivered' && (
            <View style={styles.ratingCard}>
              <Text style={styles.ratingTitle}>Tip Your Driver</Text>
              {order.driverTip > 0 ? (
                <View style={styles.ratedContainer}>
                  <Ionicons name="cash" size={32} color="#10B981" />
                  <Text style={styles.ratedText}>You tipped ₦{order.driverTip.toLocaleString()}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.qrSubtitle}>Appreciate the service? Add a tip.</Text>
                  <TextInput style={styles.tipInput} placeholder="Amount (₦)" value={tipAmount} onChangeText={setTipAmount} keyboardType="numeric" />
                  <TouchableOpacity style={styles.submitButton} onPress={handleTipDriver} disabled={submittingTip}>
                    {submittingTip ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add Tip</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Driver Rating Section - Show only if delivered */}
          {order?.status === 'delivered' && (
            <View style={styles.ratingCard}>
              <Text style={styles.ratingTitle}>Rate Delivery Driver</Text>
              {order.driverRating ? (
                <View style={styles.ratedContainer}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons key={star} name="star" size={24} color={star <= order.driverRating ? "#FFD700" : "#E5E7EB"} />
                    ))}
                  </View>
                  <Text style={styles.ratedText}>You rated this delivery</Text>
                </View>
              ) : (
                <>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.feedbackInput} placeholder="Optional feedback..." value={feedback} onChangeText={setFeedback} multiline />
                  <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRating} disabled={submittingRating}>
                    {submittingRating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View style={styles.trackingContainer}>
            {trackingData.map((item, index) => (
              <TrackingItem key={index} item={item} isLast={index === trackingData.length - 1} />
            ))}
          </View>

          {/* Cancel Order Button */}
          {order && !['shipped', 'delivered', 'cancelled'].includes(order.status) && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Report Issue Section */}
          <View style={styles.issueContainer}>
            {order?.issueReported ? (
              <View style={styles.issueReportedCard}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={styles.issueReportedText}>Issue Reported: {order.issueDescription}</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.reportButton} onPress={() => setShowIssueInput(!showIssueInput)}>
                  <Text style={styles.reportButtonText}>{showIssueInput ? 'Cancel Report' : 'Report an Issue'}</Text>
                </TouchableOpacity>
                
                {showIssueInput && (
                  <View style={styles.issueInputContainer}>
                    <TextInput
                      style={styles.issueInput}
                      placeholder="Describe the problem..."
                      value={issueText}
                      onChangeText={setIssueText}
                      multiline
                    />
                    <TouchableOpacity 
                      style={styles.submitIssueButton} 
                      onPress={handleReportIssue}
                      disabled={submittingIssue}
                    >
                      {submittingIssue ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitIssueButtonText}>Submit Report</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            
            <TouchableOpacity 
              style={styles.contactSupportButton} 
              onPress={() => router.push({ pathname: '/(routes)/support-chat', params: { orderId } } as any)}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#111827" />
              <Text style={styles.contactSupportText}>Chat with Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scrollContainer: { padding: 16 },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerIcon: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#FF8C00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  orderRef: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryOrderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4B5563',
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  tipInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  submitButton: { backgroundColor: '#FF8C00', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  ratedContainer: { alignItems: 'center' },
  ratedText: { color: '#10B981', fontWeight: '600', marginTop: 8 },
  trackingContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 20,
  },
  trackingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconColumn: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCompleted: {
    backgroundColor: '#FF8C00',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  lineCompleted: {
    backgroundColor: '#FF8C00',
  },
  detailsColumn: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 32,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusCompleted: {
    color: '#111827',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  issueContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  reportButton: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECaca',
  },
  reportButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 16,
  },
  issueInputContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  issueInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitIssueButton: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitIssueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  issueReportedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  issueReportedText: {
    color: '#B91C1C',
    fontSize: 14,
    flex: 1,
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactSupportText: {
    marginLeft: 8,
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});