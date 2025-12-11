/**
 * WeeklyCheckInCard - Card component for weekly progress tracking
 * Shows current week status, weight change, and AI suggestions
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { ProgressBar } from '../ProgressBar';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useWeeklyStore } from '../../store/useWeeklyStore';

interface WeeklyCheckInCardProps {
    onCheckIn: () => void;
    onViewHistory: () => void;
}

export const WeeklyCheckInCard = ({
    onCheckIn,
    onViewHistory,
}: WeeklyCheckInCardProps): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const { currentWeek, isLoading, fetchCurrentWeek, summary, fetchSummary } = useWeeklyStore();

    useEffect(() => {
        fetchCurrentWeek();
        fetchSummary();
    }, []);

    const styles = StyleSheet.create({
        container: {
            marginVertical: theme.spacing.md,
        },
        card: {
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
        },
        gradient: {
            padding: theme.spacing.lg,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
        },
        weekBadge: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.full,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
        },
        statItem: {
            alignItems: 'center',
            flex: 1,
        },
        statValue: {
            color: '#FFFFFF',
            fontSize: theme.typography.h2.fontSize,
            fontWeight: '700',
        },
        statLabel: {
            color: 'rgba(255,255,255,0.8)',
            fontSize: theme.typography.caption.fontSize,
            marginTop: theme.spacing.xs,
        },
        changeIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            marginTop: theme.spacing.xs,
        },
        suggestionBox: {
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        suggestionText: {
            color: '#FFFFFF',
            fontSize: theme.typography.bodySmall.fontSize,
            lineHeight: 20,
        },
        progressSection: {
            marginBottom: theme.spacing.lg,
        },
        progressLabel: {
            color: 'rgba(255,255,255,0.8)',
            fontSize: theme.typography.caption.fontSize,
            marginBottom: theme.spacing.xs,
        },
        actionsRow: {
            flexDirection: 'row',
            gap: theme.spacing.md,
        },
        checkInRequired: {
            backgroundColor: 'rgba(255,193,7,0.2)',
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
    });

    if (isLoading && !currentWeek) {
        return (
            <View style={styles.container}>
                <View style={[styles.card, { backgroundColor: theme.colors.card, padding: theme.spacing.xl }]}>
                    <ThemedText color="textSecondary">Đang tải...</ThemedText>
                </View>
            </View>
        );
    }

    const gradientColors: readonly [string, string, ...string[]] = isDark
        ? ['#1a1a2e', '#16213e']
        : ['#667eea', '#764ba2'];

    const weightChange = currentWeek?.checkIn?.weightChange;
    const isPositive = weightChange && weightChange > 0;
    const isNegative = weightChange && weightChange < 0;

    const formatWeight = (w?: number) => (w ? `${w.toFixed(1)} kg` : '--');
    const formatChange = (c?: number) => {
        if (!c) return '--';
        const sign = c > 0 ? '+' : '';
        return `${sign}${c.toFixed(1)} kg`;
    };

    // Calculate progress towards goal (simplified)
    const progressPercentage = summary?.onTrackPercentage
        ? summary.onTrackPercentage / 100
        : 0;

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.container}>
            <View style={styles.card}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <ThemedText style={{ color: '#FFFFFF', fontSize: theme.typography.h3.fontSize, fontWeight: '600' }}>
                                📅 Weekly Check-in
                            </ThemedText>
                            <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: theme.typography.caption.fontSize }}>
                                {currentWeek?.weekStart} - {currentWeek?.weekEnd}
                            </ThemedText>
                        </View>
                        <View style={styles.weekBadge}>
                            <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                                Tuần {currentWeek?.weekNumber || 1}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Check-in Required Banner */}
                    {!currentWeek?.hasCheckedIn && (
                        <View style={styles.checkInRequired}>
                            <ThemedText style={{ fontSize: 20 }}>⏰</ThemedText>
                            <ThemedText style={{ color: '#FFC107', fontWeight: '500', flex: 1 }}>
                                Đã đến lúc check-in tuần này!
                            </ThemedText>
                        </View>
                    )}

                    {/* Stats Row */}
                    {currentWeek?.hasCheckedIn && currentWeek.checkIn && (
                        <>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <ThemedText style={styles.statValue}>
                                        {formatWeight(currentWeek.checkIn.weightKg)}
                                    </ThemedText>
                                    <ThemedText style={styles.statLabel}>Cân nặng</ThemedText>
                                    {weightChange !== undefined && weightChange !== null && (
                                        <View style={styles.changeIndicator}>
                                            <ThemedText style={{ color: isNegative ? '#4CAF50' : isPositive ? '#FF5722' : '#FFFFFF' }}>
                                                {isNegative ? '↓' : isPositive ? '↑' : '→'} {formatChange(weightChange)}
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.statItem}>
                                    <ThemedText style={styles.statValue}>
                                        {currentWeek.checkIn.avgCalories?.toFixed(0) || '--'}
                                    </ThemedText>
                                    <ThemedText style={styles.statLabel}>kcal/ngày</ThemedText>
                                    <View style={styles.changeIndicator}>
                                        <ThemedText style={{ color: 'rgba(255,255,255,0.9)' }}>
                                            Mục tiêu: {currentWeek.checkIn.targetCalories?.toFixed(0) || '--'}
                                        </ThemedText>
                                    </View>
                                </View>

                                <View style={styles.statItem}>
                                    <ThemedText style={styles.statValue}>
                                        {currentWeek.checkIn.daysLogged}/7
                                    </ThemedText>
                                    <ThemedText style={styles.statLabel}>Ngày ghi nhận</ThemedText>
                                    <View style={styles.changeIndicator}>
                                        <ThemedText style={{ color: currentWeek.checkIn.isOnTrack ? '#4CAF50' : '#FF9800' }}>
                                            {currentWeek.checkIn.isOnTrack ? '✓ Đúng tiến độ' : '⚠️ Cần điều chỉnh'}
                                        </ThemedText>
                                    </View>
                                </View>
                            </View>

                            {/* AI Suggestion */}
                            {currentWeek.checkIn.aiSuggestion && (
                                <View style={styles.suggestionBox}>
                                    <ThemedText style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: theme.spacing.xs }}>
                                        💡 Gợi ý AI
                                    </ThemedText>
                                    <ThemedText style={styles.suggestionText}>
                                        {currentWeek.checkIn.aiSuggestion}
                                    </ThemedText>
                                </View>
                            )}

                            {/* Progress Bar */}
                            {summary && summary.totalWeeks > 0 && (
                                <View style={styles.progressSection}>
                                    <ThemedText style={styles.progressLabel}>
                                        Tỷ lệ đúng tiến độ: {summary.onTrackPercentage.toFixed(0)}% ({summary.streak} tuần liên tiếp)
                                    </ThemedText>
                                    <ProgressBar
                                        progress={progressPercentage}
                                        color="#4CAF50"
                                        backgroundColor="rgba(255,255,255,0.2)"
                                        height={8}
                                    />
                                </View>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                        {!currentWeek?.hasCheckedIn ? (
                            <Button
                                title="Check-in ngay"
                                onPress={onCheckIn}
                                variant="secondary"
                                icon="checkmark-circle-outline"
                                fullWidth
                                style={{ flex: 1 }}
                            />
                        ) : (
                            <Button
                                title="Xem lịch sử"
                                onPress={onViewHistory}
                                variant="ghost"
                                icon="time-outline"
                                fullWidth
                                style={{ flex: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                            />
                        )}
                    </View>
                </LinearGradient>
            </View>
        </Animated.View>
    );
};

export default WeeklyCheckInCard;
