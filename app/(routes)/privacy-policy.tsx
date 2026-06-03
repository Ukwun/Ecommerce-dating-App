import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Section title="1. Introduction">
          Our Marketplace App ("Service") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Section>

        <Section title="2. Information We Collect">
          <Bullet text="Account Information: Name, email, phone number, profile picture, shipping address" />
          <Bullet text="Transaction Data: Purchase history, product listings, payment methods, order details" />
          <Bullet text="Dating Profile Data: Age, bio, photos, interests, location, verified status" />
          <Bullet text="Communication Data: Messages, support tickets, feedback" />
          <Bullet text="Device Information: Device type, OS, app version, unique identifiers" />
          <Bullet text="Location Data: Optional GPS location for local marketplace features" />
          <Bullet text="Automatically Collected: Log data, usage patterns, IP address" />
        </Section>

        <Section title="3. How We Use Your Information">
          <Bullet text="Provide and improve our services" />
          <Bullet text="Process transactions and send confirmations" />
          <Bullet text="Send notifications and marketing communications (with consent)" />
          <Bullet text="Verify identity and prevent fraud" />
          <Bullet text="Comply with legal obligations" />
          <Bullet text="Generate analytics to improve user experience" />
        </Section>

        <Section title="4. Data Security">
          We implement industry-standard security measures including:
          <Bullet text="Encryption for data transmission (HTTPS/TLS)" />
          <Bullet text="Secure storage of sensitive information" />
          <Bullet text="Regular security audits and updates" />
          <Bullet text="Access controls and authentication" />
        </Section>

        <Section title="5. Third-Party Sharing">
          We may share data with:
          <Bullet text="Payment processors (Paystack)" />
          <Bullet text="Image hosting services (ImageKit)" />
          <Bullet text="Analytics providers" />
          <Bullet text="Law enforcement when required by law" />
          We do NOT sell your personal data to third parties.
        </Section>

        <Section title="6. Your Rights">
          <Bullet text="Access your personal data" />
          <Bullet text="Request data correction or deletion" />
          <Bullet text="Opt-out of marketing communications" />
          <Bullet text="Export your data in portable format" />
          <Bullet text="Withdraw consent at any time" />
        </Section>

        <Section title="7. Data Retention">
          We retain personal data as long as necessary for service provision and legal compliance. You can request deletion anytime, except where legally required to maintain records.
        </Section>

        <Section title="8. Children's Privacy">
          Our Service is not intended for children under 13. We do not knowingly collect data from children. If we discover such collection, we immediately delete it.
        </Section>

        <Section title="9. International Users">
          If you're outside the country where our servers are located, your data will be transferred and processed in accordance with this policy and applicable laws.
        </Section>

        <Section title="10. Contact Us">
          For privacy concerns or data requests, contact: privacy@marketplace-app.com
        </Section>

        <Text style={styles.footer}>© 2025 Marketplace App. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof children === 'string' ? (
        <Text style={styles.sectionText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function Bullet({ text }: any) {
  return (
    <View style={styles.bulletContainer}>
      <Text style={styles.bulletPoint}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { padding: 16, paddingBottom: 32 },
  lastUpdated: { fontSize: 12, color: '#9CA3AF', marginBottom: 20, fontStyle: 'italic' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  sectionText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  bulletContainer: { flexDirection: 'row', marginBottom: 8 },
  bulletPoint: { fontSize: 16, color: '#111827', marginRight: 8, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 22 },
  footer: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
});
