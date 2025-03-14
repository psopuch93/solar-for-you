// components/common/Input.tsx
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
  KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext'; // Poprawiona ścieżka importu

interface InputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: React.ReactNode;
  onIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  icon,
  onIconPress,
  multiline = false,
  numberOfLines = 1,
  style = {},
  inputStyle = {},
  labelStyle = {},
  ...rest
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  
  // Przygotowanie bazowych stylów
  const baseStyles: StyleProp<TextStyle> = {
    ...styles.input,
    borderColor: isFocused 
      ? theme.colors.primary 
      : error 
        ? theme.colors.error 
        : theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  };
  
  // Dodanie stylów dla multiline
  const multilineStyles: StyleProp<TextStyle> = multiline ? {
    textAlignVertical: 'top' as 'top',
    height: numberOfLines * 24,
  } : {};
  
  // Dodanie stylów dla ikon
  const iconLeftStyle: StyleProp<TextStyle> = icon ? styles.inputWithIconLeft : {};
  const iconRightStyle: StyleProp<TextStyle> = secureTextEntry ? styles.inputWithIconRight : {};
  
  // Złączenie wszystkich stylów
  const finalInputStyle: StyleProp<TextStyle> = [
    baseStyles,
    multilineStyles,
    iconLeftStyle,
    iconRightStyle,
    inputStyle
  ];
  
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[
          styles.label, 
          { color: theme.colors.text }, 
          labelStyle
        ]}>
          {label}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        {icon && (
          <TouchableOpacity 
            style={styles.iconLeft} 
            onPress={onIconPress}
            disabled={!onIconPress}
          >
            {icon}
          </TouchableOpacity>
        )}
        
        <TextInput
          style={finalInputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          {...rest}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.iconRight} 
            onPress={togglePasswordVisibility}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithIconLeft: {
    paddingLeft: 40,
  },
  inputWithIconRight: {
    paddingRight: 40,
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  iconRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});

export default Input;