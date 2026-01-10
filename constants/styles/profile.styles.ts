import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#2563EB',
  secondary: '#64748B',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const Metrics = {
  padding: 16,
  paddingSmall: 8,
  paddingLarge: 24,
  borderRadius: 12,
  borderRadiusLarge: 16,
};

export const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: Metrics.borderRadiusLarge,
    marginBottom: 12,
  },
});
