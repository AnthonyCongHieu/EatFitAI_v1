import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

type TabOption = 'today' | 'week' | 'month';

interface TabSwitcherProps {
    activeTab: TabOption;
    onTabChange: (tab: TabOption) => void;
}

const TABS: { key: TabOption; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
];

/**
 * Tab Switcher - Segmented control cho Stats screen
 * 2026 trend: Smooth sliding indicator, haptic feedback
 */
export const TabSwitcher: React.FC<TabSwitcherProps> = ({
    activeTab,
    onTabChange,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Container width for calculating indicator position
    const [containerWidth, setContainerWidth] = useState(0);
    const tabWidth = containerWidth > 0 ? (containerWidth - 8) / TABS.length : 0;

    // Animated indicator position (in pixels)
    const indicatorX = useSharedValue(0);

    // Update indicator position when activeTab changes
    useEffect(() => {
        const index = TABS.findIndex(t => t.key === activeTab);
        if (tabWidth > 0) {
            indicatorX.value = withSpring(index * tabWidth, {
                damping: 18,
                stiffness: 200
            });
        }
    }, [activeTab, tabWidth]);

    const handleContainerLayout = (event: LayoutChangeEvent) => {
        setContainerWidth(event.nativeEvent.layout.width);
    };

    const handleTabPress = (tab: TabOption, index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        indicatorX.value = withSpring(index * tabWidth, {
            damping: 18,
            stiffness: 200
        });
        onTabChange(tab);
    };

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
    }));

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            backgroundColor: isDark
                ? 'rgba(60, 60, 80, 0.6)'
                : 'rgba(0, 0, 0, 0.05)',
            borderRadius: theme.radius.lg,
            padding: 4,
            position: 'relative',
        },
        indicator: {
            position: 'absolute',
            top: 4,
            left: 4,
            width: tabWidth > 0 ? tabWidth : '31%',
            height: 36,
            backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.15)'
                : '#fff',
            borderRadius: theme.radius.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.1,
            shadowRadius: 4,
            elevation: isDark ? 0 : 2,
        },
        tab: {
            flex: 1,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
        },
    });

    return (
        <View style={styles.container} onLayout={handleContainerLayout}>
            {/* Sliding indicator */}
            <Animated.View style={[styles.indicator, indicatorStyle]} />

            {/* Tab buttons */}
            {TABS.map((tab, index) => (
                <Pressable
                    key={tab.key}
                    style={({ pressed }) => [
                        styles.tab,
                        pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleTabPress(tab.key, index)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === tab.key }}
                >
                    <ThemedText
                        variant="bodySmall"
                        weight={activeTab === tab.key ? '600' : '400'}
                        color={activeTab === tab.key ? undefined : 'textSecondary'}
                    >
                        {tab.label}
                    </ThemedText>
                </Pressable>
            ))}
        </View>
    );
};

export default TabSwitcher;

