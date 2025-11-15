import React from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

import { Card } from '../Card';

type AppCardProps = {
  children: ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  shadow?: boolean;
  border?: boolean;
};

export const AppCard = ({
  children,
  title,
  style,
  shadow = true,
  border = false,
}: AppCardProps): JSX.Element => {
  return (
    <Card
      title={title}
      style={style}
      shadow={shadow ? 'md' : 'none'}
      variant={border ? 'outlined' : 'elevated'}
      padding="lg"
    >
      {children}
    </Card>
  );
};

export default AppCard;