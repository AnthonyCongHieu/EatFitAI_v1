// Component nhóm các settings menu items
// Hiển thị tiêu đề section và wrap children

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface SettingsSectionProps {
    // Tiêu đề section
    title: string;
    // Các menu items bên trong
    children: React.ReactNode;
    // Animation delay (để stagger animation)
    delay?: number;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
    title,
    children,
    delay = 0,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const styles = StyleSheet.create({
        container: {
            marginBottom: 20,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            paddingHorizontal: 4,
        },
        title: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        content: {
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            padding: 4,
        },
    });

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={styles.container}
        >
            <View style={styles.header}>
                <ThemedText style={styles.title}>{title}</ThemedText>
            </View>
            <View style={styles.content}>
                {children}
            </View>
        </Animated.View>
    );
};

export default SettingsSection;
