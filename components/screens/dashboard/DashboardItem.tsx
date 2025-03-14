// components/screens/dashboard/DashboardItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../utils/ThemeContext';

// Obliczanie szerokości elementu (2 elementy w rzędzie z odstępem)
const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2; // 16 padding po obu stronach + 16 odstęp między elementami

interface DashboardItemProps {
  title: string;
  icon: any; // Używamy any, żeby obejść typowanie Ionicons
  color: string;
  onPress: () => void;
}

const DashboardItem: React.FC<DashboardItemProps> = ({ title, icon, color, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          width: itemWidth,
          ...theme.elevation.small,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${color}20`, // 20% przezroczystości
          },
        ]}
      >
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DashboardItem;