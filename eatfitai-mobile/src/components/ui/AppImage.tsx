import { Image, ImageProps } from 'expo-image';
import { StyleSheet, ImageStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';

interface AppImageProps extends ImageProps {
  style?: ImageStyle;
}

export const AppImage = ({ style, ...props }: AppImageProps) => {
  const { theme } = useAppTheme();

  return (
    <Image
      style={style}
      transition={200}
      contentFit="cover"
      cachePolicy="memory-disk"
      {...props}
    />
  );
};
