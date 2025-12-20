// StatsNavigator - Now just renders the unified StatsScreen
// The tabs are built into StatsScreen itself
import React from 'react';
import StatsScreen from '../screens/stats/StatsScreen';

/**
 * StatsNavigator - Wrapper for unified Stats screen
 * The new StatsScreen contains built-in tabs for Today/Week/Month
 */
const StatsNavigator = (): React.ReactElement => {
  return <StatsScreen />;
};

export default StatsNavigator;
