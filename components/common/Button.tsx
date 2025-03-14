// components/common/Button.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

type ButtonVariant = 'filled' | 'outlined' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  variant = 'filled',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  style = {},
  textStyle = {},
}) => {
  const { theme } = useTheme();
  
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'filled':
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
        };
    }
  };
  
  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.m,
          borderRadius: theme.borderRadius.m,
        };
      case 'large':
        return {
          paddingVertical: theme.spacing.m,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.borderRadius.l,
        };
      case 'medium':
      default:
        return {
          paddingVertical: theme.spacing.s,
          paddingHorizontal: theme.spacing.l,
          borderRadius: theme.borderRadius.m,
        };
    }
  };
  
  const getTextColor = (): string => {
    if (disabled) {
      return theme.colors.textSecondary;
    }
    
    switch (variant) {
      case 'outlined':
      case 'text':
        return theme.colors.primary;
      case 'filled':
      default:
        return '#FFFFFF';
    }
  };
  
  const buttonStyles = [
    styles.button,
    getVariantStyle(),
    getSizeStyle(),
    disabled && { opacity: 0.6 },
    style,
  ];
  
  const textStyles = [
    styles.text,
    { 
      color: getTextColor(), 
      fontSize: 
        size === 'small' 
          ? theme.typography.fontSize.s 
          : size === 'large' 
            ? theme.typography.fontSize.l 
            : theme.typography.fontSize.m,
    },
    textStyle,
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Button;