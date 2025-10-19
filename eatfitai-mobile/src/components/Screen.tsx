import type { ReactNode } from 'react';
import type { RefreshControlProps, ScrollViewProps, ViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeProvider';

type ScreenProps = {
  children: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  style?: ScrollViewProps['style'] & ViewProps['style'];
  refreshControl?: ReactNode | RefreshControlProps;
  scroll?: boolean;
};

export const Screen = ({
  children,
  contentContainerStyle,
  style,
  refreshControl,
  scroll = true,
}: ScreenProps): JSX.Element => {
  const { theme } = useAppTheme();

  if (scroll) {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl as any}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>{children}</View>;
};

export default Screen;

