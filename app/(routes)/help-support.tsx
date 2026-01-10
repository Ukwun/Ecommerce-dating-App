import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Collapsible } from '@/components/ui/collapsible';

const faqs = [
  {
    question: 'How do I sell an item?',
    answer: 'To sell an item, go to your profile, tap on "Sell a Product", and fill out the form with your product\'s details, including images, description, and price.',
  },
  {
    question: 'How can I track my order?',
    answer: 'You can track your order by navigating to "My Orders" from your profile. Each order will have a "Track Order" button that shows its current status.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept payments via credit/debit cards (Visa, Mastercard, Verve) and direct bank transfers through our secure Paystack integration.',
  },
  {
    question: 'How do I update my shipping address?',
    answer: 'You can manage your shipping addresses by going to your profile and selecting "Shipping Address". From there, you can add, edit, or remove addresses.',
  },
  {
    question: 'Is it safe to shop on this app?',
    answer: 'Yes! We prioritize your security. All payments are processed through a secure gateway, and we encourage you to interact with verified sellers for a safer experience.',
  },
];

export default function HelpSupportScreen() {
  return (
    <LinearGradient colors={['#FF8C00', '#4B2E05']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <Collapsible key={index} title={faq.question}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </Collapsible>
            ))}
          </View>

          <View style={styles.contactContainer}>
            <Text style={styles.sectionTitle}>Need More Help?</Text>
            <Text style={styles.contactText}>
              If you can't find the answer you're looking for, please don't hesitate to contact our support team.
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL('mailto:support@example.com')}
            >
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Contact Support</Text>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  faqContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
  },
  answerText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    paddingTop: 8,
  },
  contactContainer: {
    marginTop: 32,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  contactText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  contactButtonText: {
    color: '#111827',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});