import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import axiosInstance from '@/utils/axiosinstance';
import useSocialAuth from '@/hooks/useSocialAuth';
import { useAuth } from '@/hooks/AuthContext';

export default function LoginScreen({ onSignUp, onForgotPassword }: { onSignUp?: () => void; onForgotPassword?: () => void } = {}) {
  const router = useRouter();
  const { login } = useAuth();
  const { promptFacebook, isFacebookLoading, availability } = useSocialAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.');
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/api/login', { email: email.trim().toLowerCase(), password });
      const { user, accessToken, refreshToken } = response.data || {};
      if (!user || !accessToken || !refreshToken) throw new Error('The server returned an incomplete session.');
      await login(user, accessToken, refreshToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/home' as any);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign in failed', error?.response?.data?.error || error?.message || 'Please check your details and try again.');
    } finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><View style={styles.content}>
    <Animated.View entering={FadeInDown.duration(450)}><Text style={styles.eyebrow}>BIZMINGLE</Text><Text style={styles.title}>Welcome back</Text><Text style={styles.subtitle}>Sign in to shop, connect and manage your account.</Text></Animated.View>
    <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.form}>
      <Text style={styles.label}>Email address</Text><View style={styles.inputWrap}><Ionicons name="mail-outline" size={20} color="#6B7280" /><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#9CA3AF" style={styles.input} /></View>
      <Text style={styles.label}>Password</Text><View style={styles.inputWrap}><Ionicons name="lock-closed-outline" size={20} color="#6B7280" /><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" placeholderTextColor="#9CA3AF" style={styles.input} /></View>
      <TouchableOpacity accessibilityRole="button" onPress={onForgotPassword || (() => router.push('/(routes)/forgot-password' as any))}><Text style={styles.forgot}>Forgot password?</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={[styles.primary, loading && styles.dim]} onPress={signIn} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Sign in</Text>}</TouchableOpacity>
    </Animated.View>
    <View style={styles.divider}><View style={styles.line}/><Text style={styles.or}>OR</Text><View style={styles.line}/></View>
    <TouchableOpacity accessibilityRole="button" style={[styles.facebook, (!availability.facebook || isFacebookLoading) && styles.dim]} onPress={promptFacebook} disabled={!availability.facebook || isFacebookLoading}>{isFacebookLoading ? <ActivityIndicator color="#FFF"/> : <><Ionicons name="logo-facebook" size={22} color="#FFF"/><Text style={styles.facebookText}>Continue with Facebook</Text></>}</TouchableOpacity>
    {!availability.facebook && <Text style={styles.availability}>Facebook sign-in is being configured. Email sign-in is available now.</Text>}
    <View style={styles.footer}><Text style={styles.footerText}>New to BizMingle? </Text><TouchableOpacity onPress={onSignUp || (() => router.push('/(routes)/signup' as any))}><Text style={styles.link}>Create an account</Text></TouchableOpacity></View>
  </View></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:'#FFF'},flex:{flex:1},content:{flex:1,justifyContent:'center',padding:24,maxWidth:520,width:'100%',alignSelf:'center'},eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1.4,color:'#F97316',marginBottom:10},title:{fontSize:34,fontWeight:'800',color:'#111827'},subtitle:{fontSize:16,lineHeight:24,color:'#6B7280',marginTop:8},form:{marginTop:38},label:{fontSize:14,fontWeight:'700',color:'#374151',marginBottom:8},inputWrap:{height:56,borderRadius:14,borderWidth:1,borderColor:'#E5E7EB',backgroundColor:'#FFF',paddingHorizontal:16,alignItems:'center',flexDirection:'row',marginBottom:18},input:{flex:1,fontSize:16,color:'#111827',marginLeft:10},forgot:{alignSelf:'flex-end',color:'#2563EB',fontWeight:'700',marginBottom:22},primary:{height:54,borderRadius:14,backgroundColor:'#F97316',alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontSize:16,fontWeight:'800'},divider:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:28},line:{height:1,backgroundColor:'#E5E7EB',flex:1},or:{fontSize:12,fontWeight:'700',color:'#9CA3AF'},facebook:{height:54,borderRadius:14,backgroundColor:'#1877F2',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10},facebookText:{color:'#FFF',fontSize:16,fontWeight:'800'},availability:{fontSize:12,color:'#6B7280',textAlign:'center',marginTop:12},footer:{marginTop:30,flexDirection:'row',justifyContent:'center'},footerText:{color:'#6B7280'},link:{color:'#2563EB',fontWeight:'800'},dim:{opacity:.55} });
