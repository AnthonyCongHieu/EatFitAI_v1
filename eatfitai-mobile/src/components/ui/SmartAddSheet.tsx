import React, { useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    SlideInDown,
    SlideOutDown,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../app/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SmartAddSheetProps {
    visible: boolean;
    onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SmartAddSheet: React.FC<SmartAddSheetProps> = ({ visible, onClose }) => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();

    const handleOption = (route: keyof RootStackParamList | 'QuickAdd', params?: any) => {
        onClose();
        // Small delay to allow sheet to close first
        setTimeout(() => {
            if (route === 'QuickAdd') {
                // Handle quick add specific logic if needed, or navigate to a specific quick add screen
                // For now, let's go to FoodSearch with a focus or specific tab
                navigation.navigate('FoodSearch');
            } else {
                navigation.navigate(route as any, params);
            }
        }, 300);
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    entering={SlideInDown.springify().damping(15)}
                    exiting={SlideOutDown}
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: theme.colors.card,
                            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                        }
                    ]}
                >
                    <View style={styles.handle} />

                    <ThemedText variant="h3" style={styles.title}>Thêm món ăn</ThemedText>

                    <View style={styles.grid}>
                        {/* Tìm kiếm - Primary option */}
                        <Pressable
                            style={[styles.option, { backgroundColor: theme.colors.primary + '15' }]}
                            onPress={() => handleOption('FoodSearch')}
                        >
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary }]}>
                                <Icon name="search" size="lg" color="card" />
                            </View>
                            <ThemedText variant="body" weight="600">Tìm kiếm</ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Nhập tên món ăn</ThemedText>
                        </Pressable>

                        {/* Yêu thích */}
                        <Pressable
                            style={[styles.option, { backgroundColor: theme.colors.warning + '15' }]}
                            onPress={() => handleOption('FoodSearch' as any)} // Could pass params to open favorites tab
                        >
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.warning }]}>
                                <Icon name="heart" size="lg" color="card" />
                            </View>
                            <ThemedText variant="body" weight="600">Yêu thích</ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Món đã lưu</ThemedText>
                        </Pressable>

                        {/* Thêm nhanh */}
                        <Pressable
                            style={[styles.option, { backgroundColor: theme.colors.success + '15' }]}
                            onPress={() => handleOption('CustomDish')}
                        >
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.success }]}>
                                <Icon name="flash" size="lg" color="card" />
                            </View>
                            <ThemedText variant="body" weight="600">Thêm nhanh</ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Nhập calo thủ công</ThemedText>
                        </Pressable>

                        {/* Scan nguyên liệu - cho công thức */}
                        <Pressable
                            style={[styles.option, { backgroundColor: theme.colors.secondary + '15' }]}
                            onPress={() => handleOption('AiCamera')}
                        >
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.secondary }]}>
                                <Icon name="camera" size="lg" color="card" />
                            </View>
                            <ThemedText variant="body" weight="600">Scan nguyên liệu</ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Gợi ý công thức</ThemedText>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        width: '100%',
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        textAlign: 'center',
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    option: {
        width: '47%', // roughly half minus gap
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
});
