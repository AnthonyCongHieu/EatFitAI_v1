import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type Tab = {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
  disabled?: boolean;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: 'underline' | 'filled' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  animated?: boolean;
  disabled?: boolean;
};

export const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  size = 'md',
  scrollable = false,
  animated = true,
  disabled = false
}: TabsProps): JSX.Element => {
  const { theme } = useAppTheme();

  const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
  const indicatorPosition = useSharedValue(activeIndex);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingVertical: 6, paddingHorizontal: 12, fontSize: 12 };
      case 'lg':
        return { height: 52, paddingVertical: 12, paddingHorizontal: 20, fontSize: 16 };
      case 'md':
      default:
        return { height: 44, paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 };
    }
  };

  const sizeConfig = getSizeConfig();

  const handleTabPress = (tab: Tab) => {
    if (!tab.disabled && !disabled) {
      const newIndex = tabs.findIndex(t => t.key === tab.key);
      if (animated) {
        indicatorPosition.value = withSpring(newIndex, { damping: 20, stiffness: 200 });
      } else {
        indicatorPosition.value = newIndex;
      }
      onTabChange(tab.key);
    }
  };

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    if (variant === 'underline') {
      const translateX = interpolate(
        indicatorPosition.value,
        tabs.map((_, index) => index),
        tabs.map((_, index) => (100 / tabs.length) * index)
      );

      return {
        transform: [{ translateX: `${translateX}%` }],
        width: `${100 / tabs.length}%`,
      };
    }

    return {};
  });

  const renderTab = (tab: Tab, index: number) => {
    const isActive = tab.key === activeTab;
    const isDisabled = tab.disabled || disabled;

    const tabStyle = {
      opacity: isDisabled ? 0.5 : 1,
      backgroundColor: variant === 'filled' && isActive ? theme.colors.primary : 'transparent',
      borderRadius: variant === 'pills' ? sizeConfig.height / 2 : 0,
    };

    const textColor = isActive
      ? (variant === 'filled' ? '#fff' : theme.colors.primary)
      : theme.colors.muted;

    return (
      <Pressable
        key={tab.key}
        onPress={() => handleTabPress(tab)}
        disabled={isDisabled}
        style={[
          styles.tab,
          {
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            minHeight: sizeConfig.height,
          },
          tabStyle,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={tab.label}
      >
        <View style={styles.tabContent}>
          {tab.icon && (
            <View style={styles.tabIcon}>
              {tab.icon}
            </View>
          )}

          <ThemedText
            style={[
              styles.tabLabel,
              {
                fontSize: sizeConfig.fontSize,
                color: textColor,
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
              },
            ]}
          >
            {tab.label}
          </ThemedText>

          {tab.badge && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.danger,
                  minWidth: sizeConfig.fontSize + 4,
                  height: sizeConfig.fontSize + 4,
                  borderRadius: (sizeConfig.fontSize + 4) / 2,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.badgeText,
                  {
                    fontSize: sizeConfig.fontSize - 2,
                    color: '#fff',
                    fontFamily: 'Inter_600SemiBold',
                  },
                ]}
              >
                {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const tabsContent = (
    <View style={styles.tabsContainer}>
      {tabs.map(renderTab)}

      {/* Indicator */}
      {variant === 'underline' && (
        <Animated.View
          style={[
            styles.indicator,
            {
              height: 2,
              backgroundColor: theme.colors.primary,
              bottom: 0,
            },
            indicatorAnimatedStyle,
          ]}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tabsContent}
        </ScrollView>
      ) : (
        tabsContent
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabIcon: {
    marginRight: 2,
  },
  tabLabel: {
    fontWeight: '500',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
  },
});

export default Tabs;
