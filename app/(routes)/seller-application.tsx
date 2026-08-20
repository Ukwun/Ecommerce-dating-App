import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import axiosInstance from '@/utils/axiosinstance';
import { useAuth } from '@/hooks/AuthContext';

const categories = ['electronics', 'fashion', 'home', 'beauty', 'books', 'sports', 'toys', 'groceries', 'other'];
const initial = { legalFullName: '', contactEmail: '', contactPhone: '', businessName: '', businessCategory: '', businessDescription: '', registrationNumber: '', addressLine1: '', city: '', state: '', country: 'Nigeria' };

export default function SellerApplicationScreen() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ ...initial, legalFullName: user?.name || '', contactEmail: user?.email || '' });
  const [status, setStatus] = useState<string | null>(user?.roles?.seller?.status || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosInstance.get('/seller/api/profile').then(async response => {
      const currentStatus = response.data?.data?.verificationStatus;
      setStatus(currentStatus);
      if (currentStatus === 'approved' && user && user.roles?.seller?.status !== 'approved') await updateUser({ roles: { ...user.roles, buyer: true, seller: { status: 'approved', businessName: response.data?.data?.businessName }, admin: user.roles?.admin || null } });
    }).catch(error => { if (error?.response?.status !== 404) Toast.show({ type: 'error', text1: 'Could not check application' }); }).finally(() => setLoading(false));
  }, [updateUser, user]);

  const set = (key: keyof typeof initial, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async () => {
    const required = ['legalFullName','contactEmail','contactPhone','businessName','businessCategory','addressLine1','city','state'] as const;
    if (required.some(key => !form[key].trim())) return Toast.show({ type: 'error', text1: 'Complete all required fields' });
    setSubmitting(true);
    try {
      await axiosInstance.post('/seller/api/apply', { ...form, businessAddress: { addressLine1: form.addressLine1, city: form.city, state: form.state, country: form.country } });
      setStatus('pending');
      if (user) await updateUser({ roles: { ...user.roles, buyer: true, seller: { status: 'pending', businessName: form.businessName }, admin: user.roles?.admin || null } });
      Toast.show({ type: 'success', text1: 'Application submitted', text2: 'You can list products after admin approval.' });
    } catch (error: any) { Toast.show({ type: 'error', text1: 'Application failed', text2: error?.response?.data?.error || 'Please try again.' }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#F97316" /></View>;
  if (status) return <SafeAreaView style={styles.screen}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.headerTitle}>Seller application</Text><View style={{ width: 24 }} /></View><View style={styles.statusCard}><View style={[styles.statusIcon, status === 'approved' && { backgroundColor: '#DCFCE7' }]}><Ionicons name={status === 'approved' ? 'checkmark-circle' : status === 'rejected' ? 'close-circle' : 'time'} size={34} color={status === 'approved' ? '#16A34A' : status === 'rejected' ? '#DC2626' : '#F97316'} /></View><Text style={styles.statusTitle}>{status === 'approved' ? 'You are approved to sell' : status === 'rejected' ? 'Application needs attention' : 'Application under review'}</Text><Text style={styles.statusText}>{status === 'approved' ? 'Your seller dashboard and product listing tools are now available.' : status === 'rejected' ? 'Contact support or review the administrator’s reason before applying again.' : 'An administrator is reviewing your identity, contact, address and business details.'}</Text>{status === 'approved' && <TouchableOpacity style={styles.submit} onPress={() => router.replace('/(seller)/seller-dashboard' as any)}><Text style={styles.submitText}>Open seller dashboard</Text></TouchableOpacity>}</View></SafeAreaView>;

  const input = (key: keyof typeof initial, label: string, placeholder: string, keyboardType: any = 'default', multiline = false) => <View style={styles.group}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.area]} value={form[key]} onChangeText={value => set(key, value)} placeholder={placeholder} placeholderTextColor="#9CA3AF" keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} /></View>;
  return <SafeAreaView style={styles.screen}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.headerTitle}>Become a seller</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Build your store on BizMingle</Text><Text style={styles.intro}>Tell us who you are and how customers can reach your business. Your application must be approved before you can publish products.</Text>{input('legalFullName','Full legal name','Your full name')}{input('contactEmail','Business email','you@business.com','email-address')}{input('contactPhone','Phone number','0800 000 0000','phone-pad')}{input('businessName','Store name','The name customers will see')}<Text style={styles.label}>Business category</Text><View style={styles.chips}>{categories.map(category => <TouchableOpacity key={category} onPress={() => set('businessCategory', category)} style={[styles.chip, form.businessCategory === category && styles.chipActive]}><Text style={[styles.chipText, form.businessCategory === category && styles.chipTextActive]}>{category}</Text></TouchableOpacity>)}</View>{input('businessDescription','Business description','What do you sell and who do you serve?','default',true)}{input('registrationNumber','Registration number (optional)','CAC or other registration number')}{input('addressLine1','Business address','Street and building')}{input('city','City','City')}{input('state','State','State')}{input('country','Country','Country')}<TouchableOpacity style={[styles.submit, submitting && { opacity: .6 }]} onPress={submit} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit for admin review</Text>}</TouchableOpacity></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:'#F6F7F9'},center:{flex:1,alignItems:'center',justifyContent:'center'},header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E5E7EB'},headerTitle:{fontSize:17,fontWeight:'800',color:'#111827'},content:{padding:20,paddingBottom:50},title:{fontSize:27,fontWeight:'900',color:'#111827'},intro:{fontSize:14,color:'#6B7280',lineHeight:21,marginTop:8,marginBottom:22},group:{marginBottom:16},label:{fontSize:13,fontWeight:'700',color:'#374151',marginBottom:7},input:{height:52,backgroundColor:'#FFF',borderWidth:1,borderColor:'#D1D5DB',borderRadius:13,paddingHorizontal:15,color:'#111827',fontSize:15},area:{height:110,paddingTop:14},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},chip:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#D1D5DB',borderRadius:20,paddingHorizontal:12,paddingVertical:8},chipActive:{backgroundColor:'#FFF1E7',borderColor:'#F97316'},chipText:{color:'#6B7280',fontSize:12,fontWeight:'600',textTransform:'capitalize'},chipTextActive:{color:'#C2410C'},submit:{height:54,borderRadius:15,backgroundColor:'#F97316',alignItems:'center',justifyContent:'center',marginTop:10},submitText:{color:'#FFF',fontSize:15,fontWeight:'800'},statusCard:{margin:20,backgroundColor:'#FFF',borderRadius:22,padding:28,alignItems:'center'},statusIcon:{width:68,height:68,borderRadius:24,backgroundColor:'#FFF1E7',alignItems:'center',justifyContent:'center'},statusTitle:{fontSize:21,fontWeight:'900',color:'#111827',marginTop:18},statusText:{fontSize:14,color:'#6B7280',lineHeight:21,textAlign:'center',marginTop:8} });
