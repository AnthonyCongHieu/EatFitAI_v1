import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme } from '../theme/ThemeProvider';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type IconColor = 'text' | 'textSecondary' | 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning' | 'info';

interface IconProps {
  name: string;
  size?: IconSize | number;
  color?: IconColor | string;
  style?: StyleProp<ViewStyle>;
  type?: 'ionicons' | 'material';
}

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'text',
  style,
  type = 'ionicons',
}) => {
  const { theme } = useAppTheme();

  const getIconColor = (): string => {
    if (typeof color === 'string' && !Object.keys(theme.colors).includes(color)) {
      return color; // Custom color
    }

    switch (color) {
      case 'textSecondary':
        return theme.colors.textSecondary;
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'muted':
        return theme.colors.muted;
      case 'danger':
        return theme.colors.danger;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      case 'text':
      default:
        return theme.colors.text;
    }
  };

  const iconSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const iconColor = getIconColor();

  if (type === 'material') {
    return (
      <MaterialIcons
        name={name as any}
        size={iconSize}
        color={iconColor}
        style={style}
      />
    );
  }

  return (
    <Ionicons
      name={name as any}
      size={iconSize}
      color={iconColor}
      style={style}
    />
  );
};

export default Icon;
