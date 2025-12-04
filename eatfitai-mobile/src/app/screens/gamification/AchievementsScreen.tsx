import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { AppCard } from '../../../components/ui/AppCard';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useGamificationStore, Achievement } from '../../../store/useGamificationStore';
import { shareService } from '../../../services/shareService';
import { glassStyles } from '../../../components/ui/GlassCard';

const AchievementsScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();
    const { achievements, checkStreak } = useGamificationStore();
    const viewRef = useRef(null);

    useEffect(() => {
        checkStreak();
    }, [checkStreak]);

    const handleShare = async () => {
        await shareService.shareScreenshot(viewRef);
    };

    const renderItem = ({ item }: { item: Achievement }) => {
        const isUnlocked = !!item.unlockedAt;
        const progressPercent = Math.min(100, (item.progress / item.target) * 100);

        return (
            <AppCard style={[styles.card, !isUnlocked ? styles.lockedCard : {}]}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, isUnlocked ? styles.unlockedIcon : styles.lockedIcon]}>
                        <Ionicons
                            name={item.icon as any}
                            size={32}
                            color={isUnlocked ? '#FFF' : theme.colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    <ThemedText variant="h3" color={isUnlocked ? undefined : 'textSecondary'}>
                        {item.title}
                    </ThemedText>
                    <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 8 }}>
                        {item.description}
                    </ThemedText>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: isUnlocked ? theme.colors.success : theme.colors.primary }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <ThemedText variant="caption" color="textSecondary">
                            {Math.round(item.progress)} / {item.target}
                        </ThemedText>
                        {isUnlocked && (
                            <ThemedText variant="caption" color="success" weight="600">
                                Đã mở khóa!
                            </ThemedText>
                        )}
                    </View>
                </View>
            </AppCard>
        );
    };

    const styles = StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
        },
        lockedCard: {
            opacity: 0.7,
            backgroundColor: theme.colors.background,
        },
        iconContainer: {
            marginRight: theme.spacing.md,
        },
        iconCircle: {
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
        },
        unlockedIcon: {
            backgroundColor: theme.colors.warning, // Gold/Orange for achievement
            shadowColor: theme.colors.warning,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
        },
        lockedIcon: {
            backgroundColor: theme.colors.border,
        },
        contentContainer: {
            flex: 1,
        },
        progressContainer: {
            height: 6,
            backgroundColor: theme.colors.border,
            borderRadius: 3,
            overflow: 'hidden',
        },
        progressBar: {
            height: '100%',
            borderRadius: 3,
        },
    });

    return (
        <Screen>
            <ScreenHeader
                title="Thành tích"
                subtitle="Hành trình sức khỏe của bạn"
                onBackPress={() => navigation.goBack()}
                action={
                    <TouchableOpacity onPress={handleShare}>
                        <Ionicons name="share-social-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />
            <View ref={viewRef} collapsable={false} style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <FlatList
                    data={achievements}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </Screen>
    );
};

export default AchievementsScreen;
