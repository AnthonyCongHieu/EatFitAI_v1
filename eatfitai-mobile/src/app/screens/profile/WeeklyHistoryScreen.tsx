/**
 * WeeklyHistoryScreen - Displays history of all weekly check-ins
 * Shows weight progress chart and list of past check-ins
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { AppCard } from '../../../components/ui/AppCard';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { ProgressBar } from '../../../components/ProgressBar';
import { SkeletonList } from '../../../components/Skeleton';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useWeeklyStore } from '../../../store/useWeeklyStore';
import type { WeeklyCheckInData } from '../../../services/weeklyService';

const WeeklyHistoryScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const navigation = useNavigation();

    const { history, summary, isLoading, fetchHistory, fetchSummary } = useWeeklyStore();

    useEffect(() => {
        fetchHistory();
        fetchSummary();
    }, []);

    const handleRefresh = useCallback(() => {
        fetchHistory();
        fetchSummary();
    }, []);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        summaryCard: {
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
        },
        summaryGradient: {
            padding: theme.spacing.lg,
        },
        summaryRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.md,
        },
        summaryItem: {
            alignItems: 'center',
            flex: 1,
        },
        summaryValue: {
            color: '#FFFFFF',
            fontSize: theme.typography.h2.fontSize,
            fontWeight: '700',
        },
        summaryLabel: {
            color: 'rgba(255,255,255,0.7)',
            fontSize: theme.typography.caption.fontSize,
            marginTop: theme.spacing.xs,
        },
        listContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        checkInCard: {
            marginBottom: theme.spacing.md,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
        },
        weekBadge: {
            backgroundColor: theme.colors.primaryLight,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.sm,
        },
        cardBody: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
        },
        stat: {
            alignItems: 'center',
        },
        suggestionBox: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            marginTop: theme.spacing.sm,
        },
    });

    const renderSummaryCard = () => {
        if (!summary || summary.totalWeeks === 0) return null;

        const progressPercentage = summary.onTrackPercentage / 100;

        return (
            <Animated.View entering={FadeInUp.springify()} style={styles.summaryCard}>
                <LinearGradient
                    colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryGradient}
                >
                    {/* Header */}
                    <ThemedText style={{ color: '#FFFFFF', fontSize: theme.typography.h3.fontSize, fontWeight: '600', marginBottom: theme.spacing.md }}>
                        📊 Tổng Quan Tiến Độ
                    </ThemedText>

                    {/* Stats Row */}
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <ThemedText style={styles.summaryValue}>
                                {summary.totalWeeks}
                            </ThemedText>
                            <ThemedText style={styles.summaryLabel}>Tuần</ThemedText>
                        </View>
                        <View style={styles.summaryItem}>
                            <ThemedText style={styles.summaryValue}>
                                {summary.totalWeightChange != null
                                    ? `${summary.totalWeightChange > 0 ? '+' : ''}${summary.totalWeightChange.toFixed(1)}`
                                    : '--'}
                            </ThemedText>
                            <ThemedText style={styles.summaryLabel}>kg thay đổi</ThemedText>
                        </View>
                        <View style={styles.summaryItem}>
                            <ThemedText style={styles.summaryValue}>
                                {summary.streak}
                            </ThemedText>
                            <ThemedText style={styles.summaryLabel}>🔥 Streak</ThemedText>
                        </View>
                    </View>

                    {/* Progress */}
                    <View style={{ marginTop: theme.spacing.sm }}>
                        <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.typography.caption.fontSize, marginBottom: theme.spacing.xs }}>
                            Tỷ lệ đúng tiến độ: {summary.onTrackPercentage.toFixed(0)}%
                        </ThemedText>
                        <ProgressBar
                            progress={progressPercentage}
                            color="#4CAF50"
                            backgroundColor="rgba(255,255,255,0.2)"
                            height={8}
                        />
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    const renderCheckInItem = ({ item, index }: { item: WeeklyCheckInData; index: number }) => {
        const weightChangeColor = item.weightChange
            ? item.weightChange < 0 ? '#4CAF50' : item.weightChange > 0 ? '#FF5722' : theme.colors.text
            : theme.colors.textSecondary;

        return (
            <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
                <AppCard style={styles.checkInCard}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                        <View>
                            <ThemedText variant="h4" weight="600">
                                {item.weekStart} - {item.weekEnd}
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">
                                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </ThemedText>
                        </View>
                        <View style={styles.weekBadge}>
                            <ThemedText variant="caption" color="primary" weight="600">
                                Tuần {item.weekNumber}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Body - Stats */}
                    <View style={styles.cardBody}>
                        <View style={styles.stat}>
                            <ThemedText variant="h4" weight="700">
                                {item.weightKg.toFixed(1)} kg
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Cân nặng</ThemedText>
                            {item.weightChange != null && (
                                <ThemedText variant="caption" style={{ color: weightChangeColor }}>
                                    {item.weightChange > 0 ? '↑' : item.weightChange < 0 ? '↓' : '→'} {Math.abs(item.weightChange).toFixed(1)} kg
                                </ThemedText>
                            )}
                        </View>

                        <View style={styles.stat}>
                            <ThemedText variant="h4" weight="700">
                                {item.avgCalories?.toFixed(0) || '--'}
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">kcal/ngày</ThemedText>
                        </View>

                        <View style={styles.stat}>
                            <ThemedText variant="h4" weight="700">
                                {item.daysLogged}/7
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Ngày ghi</ThemedText>
                        </View>

                        <View style={styles.stat}>
                            <ThemedText style={{ fontSize: 24 }}>
                                {item.isOnTrack ? '✅' : '⚠️'}
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">
                                {item.isOnTrack ? 'Đúng' : 'Lệch'}
                            </ThemedText>
                        </View>
                    </View>

                    {/* AI Suggestion */}
                    {item.aiSuggestion && (
                        <View style={styles.suggestionBox}>
                            <ThemedText variant="caption" color="textSecondary">
                                💡 {item.aiSuggestion}
                            </ThemedText>
                        </View>
                    )}
                </AppCard>
            </Animated.View>
        );
    };

    return (
        <Screen scroll={false} style={styles.container}>
            <ScreenHeader
                title="Lịch Sử Check-in"
                subtitle="Theo dõi tiến độ hàng tuần"
            />
            {isLoading && history.length === 0 ? (
                <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <SkeletonList count={4} itemHeight={120} spacing={theme.spacing.md} />
                </View>
            ) : history.length === 0 ? (
                <AnimatedEmptyState
                    variant="no-food"
                    title="Chưa có lịch sử"
                    description="Bạn chưa có check-in nào. Quay lại Profile để check-in tuần này!"
                    primaryAction={{
                        label: 'Quay lại Profile',
                        onPress: () => navigation.goBack(),
                    }}
                />
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.weeklyCheckInId.toString()}
                    renderItem={renderCheckInItem}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderSummaryCard}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </Screen>
    );
};

export default WeeklyHistoryScreen;
