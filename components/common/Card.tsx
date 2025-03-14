// components/common/Card.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevation?: 'small' | 'medium' | 'large';
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style = {},
  elevation = 'medium',
  noPadding = false,
}) => {
  const { theme } = useTheme();
  
  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.m,
      ...theme.elevation[elevation],
      padding: noPadding ? 0 : theme.spacing.m,
    },
    style,
  ];
  
  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginVertical: 8,
  },
});

export default Card;