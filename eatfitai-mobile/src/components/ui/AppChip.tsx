import React from 'react';

import { Chip } from '../Chip';

type AppChipProps = {
  label: string;
  selected?: boolean;
  variant?: 'solid' | 'outline';
  onPress?: () => void;
};

export const AppChip = ({
  label,
  selected = false,
  variant = 'solid',
  onPress,
}: AppChipProps): JSX.Element => {
  return (
    <Chip
      label={label}
      selected={selected}
      variant={variant === 'solid' ? 'filled' : 'outlined'}
      onPress={onPress}
      size="md"
      animated={false}
    />
  );
};

export default AppChip;