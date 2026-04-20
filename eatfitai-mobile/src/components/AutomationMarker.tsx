import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

type AutomationMarkerProps = {
  marker: string;
};

const AutomationMarker = ({ marker }: AutomationMarkerProps): ReactElement => (
  <View
    testID={marker}
    nativeID={marker}
    accessibilityLabel={marker}
    accessible
    collapsable={false}
    importantForAccessibility="yes"
    pointerEvents="none"
    style={styles.marker}
  />
);

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
  },
});

export default AutomationMarker;
