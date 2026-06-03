import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Section title="1. Acceptance of Terms">
          By accessing and using this Marketplace App, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </Section>

        <Section title="2. Use License">
          Permission is granted to temporarily download one copy of the materials (information or software) on the Marketplace App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          <Bullet text="Modify or copy the materials" />
          <Bullet text="Use the materials for any commercial purpose or for any public display" />
          <Bullet text="Attempt to decompile or reverse engineer any software contained on the app" />
          <Bullet text="Remove any copyright or other proprietary notations from the materials" />
          <Bullet text="Transfer the materials to another person or 'mirror' the materials on any other server" />
        </Section>

        <Section title="3. Disclaimer">
          The materials on the Marketplace App are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </Section>

        <Section title="4. Limitations">
          In no event shall the Marketplace App or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Marketplace App.
        </Section>

        <Section title="5. User Accounts">
          Users are responsible for maintaining the confidentiality of their account information and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized uses of your account.
        </Section>

        <Section title="6. Selling Guidelines">
          Sellers agree to:
          <Bullet text="Provide accurate product descriptions and images" />
          <Bullet text="Ensure products comply with all laws" />
          <Bullet text="Not list prohibited items (counterfeit, stolen, dangerous goods)" />
          <Bullet text="Comply with all platform policies" />
          <Bullet text="Deliver items as promised" />
          <Bullet text="Respond to buyer inquiries within 24 hours" />
        </Section>

        <Section title="7. Prohibited Conduct">
          You may not:
          <Bullet text="Engage in fraud, harassment, or abusive behavior" />
          <Bullet text="Post false or misleading information" />
          <Bullet text="Attempt to gain unauthorized access to the platform" />
          <Bullet text="Violate intellectual property rights" />
          <Bullet text="Circumvent payment or security measures" />
          <Bullet text="Spam or post inappropriate content" />
        </Section>

        <Section title="8. Payment Terms">
          <Bullet text="All payments must be made through our secure payment gateway" />
          <Bullet text="Payment is due before order processing" />
          <Bullet text="We use Paystack for payment processing" />
          <Bullet text="Refunds are issued per our return policy" />
          <Bullet text="We reserve the right to cancel orders with invalid payment" />
        </Section>

        <Section title="9. Disputes and Resolution">
          In case of disputes between buyers and sellers:
          <Bullet text="Users should first attempt to resolve via direct communication" />
          <Bullet text="Contact our support team for mediation" />
          <Bullet text="We will review evidence from both parties" />
          <Bullet text="Our decision is final on platform disputes" />
          <Bullet text="Users agree to binding arbitration as a final resolution method" />
        </Section>

        <Section title="10. Dating Features">
          Our dating features are for connecting compatible individuals:
          <Bullet text="Profiles must be truthful and current" />
          <Bullet text="You must be 18 or older to access dating features" />
          <Bullet text="Respect all users regardless of their choices" />
          <Bullet text="Report harassment or inappropriate behavior immediately" />
          <Bullet text="We reserve the right to suspend or remove accounts violating these terms" />
        </Section>

        <Section title="11. Intellectual Property">
          The content, features, and functionality of the Marketplace App, including but not limited to all information, software, text, displays, images, video, and audio, is owned by us, our licensors, or other providers of such material and is protected by international copyright laws.
        </Section>

        <Section title="12. Limitation of Liability">
          Some jurisdictions do not allow the limitation of implied warranties, so some of the above limitations may not apply to you. Our total liability for direct damages is limited to the amount you paid in the last 30 days.
        </Section>

        <Section title="13. Modifications">
          We may modify these terms at any time. Your continued use of the service following changes constitutes your acceptance of the modified terms.
        </Section>

        <Section title="14. Governing Law">
          These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which our service is provided, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
        </Section>

        <Section title="15. Contact Information">
          If you have any questions about these Terms of Service, please contact us at: support@marketplace-app.com
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
