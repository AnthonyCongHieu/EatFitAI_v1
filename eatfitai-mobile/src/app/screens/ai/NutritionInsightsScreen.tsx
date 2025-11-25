import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { NutritionInsight, NutritionRecommendation, AdaptiveTarget } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NutritionInsightsScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();

    const [insights, setInsights] = useState<NutritionInsight | null>(null);
    const [adaptiveTarget, setAdaptiveTarget] = useState<AdaptiveTarget | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [insightsData, adaptiveData] = await Promise.all([
                aiService.getNutritionInsights({ analysisDays: 30 }),
                aiService.getAdaptiveTarget({ analysisDays: 14 })
            ]);
            setInsights(insightsData);
            setAdaptiveTarget(adaptiveData);
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi tải dữ liệu phân tích');
        } finally {
            setLoading(false);
        }
    };

    const applyAdaptiveTarget = async () => {
        if (!adaptiveTarget) return;
        setApplying(true);
        try {
            await aiService.applyAdaptiveTarget(adaptiveTarget.suggestedTarget);
            alert('Đã áp dụng mục tiêu mới thành công!');
            navigation.goBack();
        } catch (err: any) {
            alert('Lỗi khi áp dụng mục tiêu: ' + err?.message);
        } finally {
            setApplying(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.md,
        },
        scoreCard: {
            alignItems: 'center',
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            backgroundColor: theme.colors.primaryLight,
            borderRadius: theme.borderRadius.card,
        },
        scoreValue: {
            fontSize: 48,
            fontWeight: 'bold',
            color: theme.colors.primaryDark,
        },
        sectionTitle: {
            marginBottom: theme.spacing.md,
            marginTop: theme.spacing.lg,
        },
        recommendationCard: {
            marginBottom: theme.spacing.md,
            borderLeftWidth: 4,
        },
        recHigh: { borderLeftColor: theme.colors.danger },
        recMedium: { borderLeftColor: theme.colors.warning },
        recLow: { borderLeftColor: theme.colors.info },
        targetComparison: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.md,
        },
        targetCol: {
            flex: 1,
            alignItems: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.card,
            marginHorizontal: theme.spacing.xs,
        },
        center: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return theme.colors.danger;
            case 'medium': return theme.colors.warning;
            case 'low': return theme.colors.info;
            default: return theme.colors.text;
        }
    };

    const renderRecommendation = (rec: NutritionRecommendation, index: number) => (
        <Card
            key={index}
            style={[
                styles.recommendationCard,
                rec.priority === 'high' ? styles.recHigh :
                    rec.priority === 'medium' ? styles.recMedium : styles.recLow
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                <Ionicons name="bulb-outline" size={20} color={getPriorityColor(rec.priority)} style={{ marginRight: theme.spacing.sm }} />
                <ThemedText variant="h4" style={{ flex: 1 }}>{rec.type.replace('_', ' ').toUpperCase()}</ThemedText>
            </View>
            <ThemedText variant="body" style={{ marginBottom: theme.spacing.sm }}>{rec.message}</ThemedText>
            <ThemedText variant="caption" color="textSecondary">{rec.reasoning}</ThemedText>
        </Card>
    );

    if (loading) {
        return (
            <Screen style={styles.container}>
                <ScreenHeader title="Phân tích dinh dưỡng" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <ThemedText style={{ marginTop: theme.spacing.md }}>Đang phân tích dữ liệu...</ThemedText>
                </View>
            </Screen>
        );
    }

    if (error) {
        return (
            <Screen style={styles.container}>
                <ScreenHeader title="Phân tích dinh dưỡng" />
                <View style={styles.center}>
                    <ThemedText color="danger">{error}</ThemedText>
                    <View style={{ marginTop: theme.spacing.md }}>
                        <Button title="Thử lại" onPress={loadData} variant="secondary" />
                    </View>
                </View>
            </Screen>
        );
    }

    return (
        <Screen style={styles.container}>
            <ScreenHeader
                title="Phân tích dinh dưỡng"
                subtitle="Thông tin chi tiết và đề xuất cá nhân hóa"
            />

            <ScrollView contentContainerStyle={styles.content}>
                {insights && (
                    <>
                        <View style={styles.scoreCard}>
                            <ThemedText variant="h3" style={{ color: theme.colors.primaryDark }}>Điểm tuân thủ</ThemedText>
                            <ThemedText style={styles.scoreValue}>{Math.round(insights.adherenceScore)}</ThemedText>
                            <ThemedText variant="bodySmall" style={{ color: theme.colors.primaryDark }}>
                                Xu hướng: {insights.progressTrend === 'improving' ? '↗️ Đang cải thiện' :
                                    insights.progressTrend === 'declining' ? '↘️ Đang giảm' : '➡️ Ổn định'}
                            </ThemedText>
                        </View>

                        <ThemedText variant="h3" style={styles.sectionTitle}>Đề xuất cho bạn</ThemedText>
                        {insights.recommendations.length > 0 ? (
                            insights.recommendations.map(renderRecommendation)
                        ) : (
                            <ThemedText variant="body" color="textSecondary" style={{ fontStyle: 'italic' }}>
                                Bạn đang làm rất tốt! Chưa có đề xuất nào cần thiết lúc này.
                            </ThemedText>
                        )}

                        {insights.mealTimingInsight && (
                            <>
                                <ThemedText variant="h3" style={styles.sectionTitle}>Thời gian ăn uống</ThemedText>
                                <Card>
                                    <ThemedText variant="body">Trung bình: {insights.mealTimingInsight.averageMealsPerDay.toFixed(1)} bữa/ngày</ThemedText>
                                    {insights.mealTimingInsight.insights.map((insight, idx) => (
                                        <ThemedText key={idx} variant="caption" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
                                            • {insight}
                                        </ThemedText>
                                    ))}
                                </Card>
                            </>
                        )}
                    </>
                )}

                {adaptiveTarget && adaptiveTarget.confidenceScore > 50 && (
                    <>
                        <ThemedText variant="h3" style={styles.sectionTitle}>Gợi ý điều chỉnh mục tiêu</ThemedText>
                        <Card>
                            <View style={styles.targetComparison}>
                                <View style={styles.targetCol}>
                                    <ThemedText variant="caption" color="textSecondary">Hiện tại</ThemedText>
                                    <ThemedText variant="h3">{adaptiveTarget.currentTarget.targetCalories}</ThemedText>
                                    <ThemedText variant="caption">kcal</ThemedText>
                                </View>
                                <View style={{ justifyContent: 'center' }}>
                                    <Ionicons name="arrow-forward" size={24} color={theme.colors.textSecondary} />
                                </View>
                                <View style={[styles.targetCol, { backgroundColor: theme.colors.primaryLight }]}>
                                    <ThemedText variant="caption" style={{ color: theme.colors.primaryDark }}>Đề xuất</ThemedText>
                                    <ThemedText variant="h3" style={{ color: theme.colors.primaryDark }}>{adaptiveTarget.suggestedTarget.targetCalories}</ThemedText>
                                    <ThemedText variant="caption" style={{ color: theme.colors.primaryDark }}>kcal</ThemedText>
                                </View>
                            </View>

                            <ThemedText variant="bodySmall" style={{ marginBottom: theme.spacing.md }}>
                                Lý do: {adaptiveTarget.adjustmentReasons.join('. ')}
                            </ThemedText>

                            <Button
                                title={`Áp dụng thay đổi (Độ tin cậy: ${Math.round(adaptiveTarget.confidenceScore)}%)`}
                                onPress={applyAdaptiveTarget}
                                loading={applying}
                                variant="primary"
                            />
                        </Card>
                    </>
                )}
            </ScrollView>
        </Screen>
    );
};

export default NutritionInsightsScreen;
