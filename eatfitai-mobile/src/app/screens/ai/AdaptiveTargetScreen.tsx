// Adaptive Target Screen – hiển thị đề xuất mục tiêu dinh dưỡng tự động và cho phép áp dụng
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { AdaptiveTarget } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdaptiveTarget'>;

const AdaptiveTargetScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();
    const [target, setTarget] = useState<AdaptiveTarget | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);

    const styles = React.useMemo(() => StyleSheet.create({
        center: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.lg,
            gap: theme.spacing.xl,
        },
        box: {
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.card,
            backgroundColor: theme.colors.card,
            marginBottom: theme.spacing.xl,
            ...theme.shadows.sm,
        },
    }), [theme]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await aiService.getAdaptiveTarget({ analysisDays: 14 });
                setTarget(data);
            } catch (e) {
                // ignore, will show empty state
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const apply = async () => {
        if (!target) return;
        setApplying(true);
        try {
            await aiService.applyAdaptiveTarget(target.suggestedTarget);
            // thông báo thành công
            alert('Đã áp dụng mục tiêu mới!');
            navigation.goBack();
        } catch (e) {
            alert('Lỗi khi áp dụng mục tiêu');
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <Screen style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
                        Đang tải mục tiêu...
                    </ThemedText>
                </View>
            </Screen>
        );
    }

    if (!target) {
        return (
            <Screen style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <ScreenHeader title="Mục tiêu tự động" subtitle="Không có dữ liệu" />
                <View style={styles.center}>
                    <ThemedText variant="body" color="textSecondary">
                        Không tìm thấy đề xuất mục tiêu.
                    </ThemedText>
                </View>
            </Screen>
        );
    }

    const { suggestedTarget } = target;

    return (
        <Screen style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScreenHeader title="Mục tiêu tự động" subtitle="Đề xuất dựa trên lịch sử ăn uống" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.box}>
                    <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                        Đề xuất mới
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Calories: {suggestedTarget.targetCalories} kcal
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Protein: {suggestedTarget.targetProtein} g
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Carbs: {suggestedTarget.targetCarbs} g
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Fat: {suggestedTarget.targetFat} g
                    </ThemedText>
                </View>
                <Button
                    variant="primary"
                    loading={applying}
                    onPress={apply}
                    title={applying ? 'Đang áp dụng...' : 'Áp dụng mục tiêu'}
                />
            </ScrollView>
        </Screen>
    );
};

export default AdaptiveTargetScreen;
