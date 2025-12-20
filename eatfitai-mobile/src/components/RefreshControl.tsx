import { RefreshControl as RNRefreshControl } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type RefreshControlProps = {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
  titleColor?: string;
  progressBackgroundColor?: string;
  size?: 'small' | 'large';
};

export const RefreshControl = ({
  refreshing,
  onRefresh,
  tintColor,
  title,
  titleColor,
  progressBackgroundColor,
  size = 'large',
}: RefreshControlProps): React.ReactElement => {
  const { theme } = useAppTheme();

  const finalTintColor = tintColor || theme.colors.primary;
  const finalTitleColor = titleColor || theme.colors.muted;
  const finalProgressBackgroundColor = progressBackgroundColor || theme.colors.background;

  return (
    <RNRefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={finalTintColor}
      progressBackgroundColor={finalProgressBackgroundColor}
      size={size === 'large' ? 1 : 0}
      title={title}
      titleColor={finalTitleColor}
    />
  );
};

export default RefreshControl;
