/**
 * OptionSelector - Component chọn options dạng button group
 * Dùng cho gender, activity level, goal selection trong Profile/Onboarding
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

export interface Option {
    value: string;
    label: string;
    icon?: string;
    desc?: string;
    color?: string;
}

interface OptionSelectorProps {
    options: readonly Option[];
    value: string | undefined;
    onChange: (value: string) => void;
    layout?: 'row' | 'column';
    showDescription?: boolean;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
    options,
    value,
    onChange,
    layout = 'row',
    showDescription = false,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    return (
        <View
            style={[
                styles.container,
                layout === 'row' ? styles.rowLayout : styles.columnLayout,
            ]}
        >
            {options.map((opt) => {
                const isSelected = value === opt.value;
                const optionColor = opt.color || theme.colors.primary;

                return (
                    <Pressable
                        key={opt.value}
                        style={[
                            styles.button,
                            {
                                backgroundColor: isSelected
                                    ? `${optionColor}20`
                                    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                borderColor: isSelected ? optionColor : 'transparent',
                                borderWidth: isSelected ? 1.5 : 1,
                                borderRadius: theme.borderRadius.button,
                                paddingVertical: showDescription ? theme.spacing.md : theme.spacing.sm,
                                paddingHorizontal: theme.spacing.md,
                            },
                            layout === 'column' && { width: '100%' },
                        ]}
                        onPress={() => onChange(opt.value)}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                        accessibilityState={{ selected: isSelected }}
                    >
                        {opt.icon && (
                            <ThemedText style={{ fontSize: showDescription ? 24 : 18 }}>
                                {opt.icon}
                            </ThemedText>
                        )}
                        <View style={showDescription ? { flex: 1 } : undefined}>
                            <ThemedText
                                weight={isSelected ? '600' : '400'}
                                color={isSelected ? 'primary' : undefined}
                            >
                                {opt.label}
                            </ThemedText>
                            {showDescription && opt.desc && (
                                <ThemedText variant="caption" color="textSecondary">
                                    {opt.desc}
                                </ThemedText>
                            )}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    rowLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    columnLayout: {
        flexDirection: 'column',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});

export default OptionSelector;
