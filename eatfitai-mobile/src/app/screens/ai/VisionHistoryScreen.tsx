import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import Card from '../../../components/Card';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { DetectionHistory } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const VisionHistoryScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();

    const [history, setHistory] = useState<DetectionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await aiService.getDetectionHistory({ days: 30, maxResults: 50 });
            setHistory(data);
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi tải lịch sử nhận diện');
        } finally {
            setLoading(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        listContent: {
            padding: theme.spacing.md,
        },
        historyCard: {
            marginBottom: theme.spacing.md,
            padding: theme.spacing.md,
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xs,
        },
        date: {
            color: theme.colors.textSecondary,
        },
        center: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });

    const renderItem = ({ item }: { item: DetectionHistory }) => (
        <Card style={styles.historyCard}>
            <View style={styles.row}>
                <ThemedText variant="caption" style={styles.date}>
                    {new Date(item.detectedAt).toLocaleString('vi-VN')}
                </ThemedText>
                <ThemedText variant="caption" color="primary">
                    {Math.round(item.averageConfidence * 100)}% tin cậy
                </ThemedText>
            </View>

            <ThemedText variant="body" style={{ fontWeight: 'bold', marginBottom: theme.spacing.xs }}>
                Đã nhận diện:
            </ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">
                {item.detectedLabels.join(', ')}
            </ThemedText>

            {item.mappedFoodNames.length > 0 && (
                <>
                    <ThemedText variant="body" style={{ fontWeight: 'bold', marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                        Món ăn tương ứng:
                    </ThemedText>
                    <ThemedText variant="bodySmall" color="success">
                        {item.mappedFoodNames.join(', ')}
                    </ThemedText>
                </>
            )}

            {item.unmappedCount > 0 && (
                <ThemedText variant="caption" color="warning" style={{ marginTop: theme.spacing.sm }}>
                    ⚠️ {item.unmappedCount} nhãn chưa được map
                </ThemedText>
            )}
        </Card>
    );

    return (
        <Screen style={styles.container}>
            <ScreenHeader
                title="Lịch sử nhận diện"
                subtitle="Các lần nhận diện món ăn gần đây"
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <ThemedText color="danger">{error}</ThemedText>
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.detectionId.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <ThemedText color="textSecondary">Chưa có lịch sử nhận diện nào</ThemedText>
                        </View>
                    }
                />
            )}
        </Screen>
    );
};

export default VisionHistoryScreen;
