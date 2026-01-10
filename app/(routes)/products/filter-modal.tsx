import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/hooks/useTheme';

export type Filters = {
  category?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
};

type FilterModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  currentFilters: Filters;
};

// Mock data for filters
const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Books', 'Toys'];
const COLORS = ['#FF8C00', '#111827', '#FFFFFF', '#4B5563', '#DC2626', '#10B981'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SORT_OPTIONS = [
  { label: 'Newest', value: 'createdAt-desc' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'rating-desc' },
];

const FilterChip = ({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) => {
  const { isDark } = useTheme();
  const selectedBg = isDark ? '#FF8C00' : '#111827';
  const selectedText = '#FFFFFF';
  const defaultBg = isDark ? '#374151' : '#E5E7EB';
  const defaultText = isDark ? '#D1D5DB' : '#4B5563';

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: isSelected ? selectedBg : defaultBg }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: isSelected ? selectedText : defaultText }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const ColorChip = ({ color, isSelected, onPress }: { color: string; isSelected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.colorChip, { backgroundColor: color }, isSelected && styles.selectedColorChip]}
    onPress={onPress}
  >
    {isSelected && <Ionicons name="checkmark" size={18} color={color === '#FFFFFF' ? '#000' : '#fff'} />}
  </TouchableOpacity>
);

export default function FilterModal({ isVisible, onClose, onApply, currentFilters }: FilterModalProps) {
  const { isDark } = useTheme();
  const [localFilters, setLocalFilters] = useState<Filters>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters, isVisible]);

  const handleSelect = (key: keyof Filters, value: string | number) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    // Preserve the search query from the route params when resetting
    setLocalFilters({
      search: currentFilters.search,
    });
  };

  const modalBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Sort By</Text>
            <View style={styles.chipContainer}>
              {SORT_OPTIONS.map(opt => (
                <FilterChip key={opt.value} label={opt.label} isSelected={localFilters.sortBy === opt.value} onPress={() => handleSelect('sortBy', opt.value)} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>Category</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map(cat => (
                <FilterChip key={cat} label={cat} isSelected={localFilters.category === cat} onPress={() => handleSelect('category', cat)} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>Color</Text>
            <View style={styles.chipContainer}>
              {COLORS.map(col => (
                <ColorChip key={col} color={col} isSelected={localFilters.color === col} onPress={() => handleSelect('color', col)} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>Size</Text>
            <View style={styles.chipContainer}>
              {SIZES.map(size => (
                <FilterChip key={size} label={size} isSelected={localFilters.size === size} onPress={() => handleSelect('size', size)} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>Price Range</Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceText, { color: textColor }]}>
                Up to ₦{localFilters.maxPrice?.toLocaleString() || '100,000+'}
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100000}
                step={1000}
                value={localFilters.maxPrice}
                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, maxPrice: value }))}
                minimumTrackTintColor={isDark ? '#FFD700' : '#FF8C00'}
                maximumTrackTintColor={isDark ? '#4B5563' : '#D1D5DB'}
                thumbTintColor={isDark ? '#FFD700' : '#FF8C00'}
              />
            </View>

          </ScrollView>

          <View style={[styles.footer, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedColorChip: {
    borderWidth: 3,
    borderColor: '#FF8C00',
  },
  priceContainer: {
    marginBottom: 24,
  },
  priceText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF8C00',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});