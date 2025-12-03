import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { DetectionHistory } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SectionData {
  title: string;
  data: DetectionHistory[];
}

const VisionHistoryScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const [sections, setSections] = useState<SectionData[]>([]);
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
      const grouped = groupHistoryByDate(data);
      setSections(grouped);
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tải lịch sử nhận diện');
    } finally {
      setLoading(false);
    }
  };

  const groupHistoryByDate = (history: DetectionHistory[]): SectionData[] => {
    const groups: { [key: string]: DetectionHistory[] } = {};

    history.forEach((item) => {
      const date = new Date(item.detectedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let title = date.toLocaleDateString('vi-VN');
      if (date.toDateString() === today.toDateString()) title = 'Hôm nay';
      else if (date.toDateString() === yesterday.toDateString()) title = 'Hôm qua';

      if (!groups[title]) groups[title] = [];
      groups[title]!.push(item);
    });

    return Object.keys(groups).map((title) => ({
      title,
      data: groups[title] || [],
    }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    sectionHeader: {
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    historyCard: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.secondaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    cardContent: {
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    time: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    confidenceBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const renderItem = ({ item, index }: { item: DetectionHistory; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <AppCard style={styles.historyCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="fast-food" size={24} color={theme.colors.primary} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.row}>
            <ThemedText variant="body" weight="600" numberOfLines={1}>
              {item.mappedFoodNames.length > 0
                ? item.mappedFoodNames[0]
                : item.detectedLabels[0]}
              {item.mappedFoodNames.length > 1 && ` +${item.mappedFoodNames.length - 1}`}
            </ThemedText>
            <ThemedText style={styles.time}>
              {new Date(item.detectedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={{ flex: 1, marginRight: 8 }}
            >
              {item.detectedLabels.join(', ')}
            </ThemedText>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    item.averageConfidence > 0.8
                      ? theme.colors.success + '20'
                      : theme.colors.warning + '20',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{
                  color:
                    item.averageConfidence > 0.8
                      ? theme.colors.success
                      : theme.colors.warning,
                  fontWeight: 'bold',
                  fontSize: 10,
                }}
              >
                {Math.round(item.averageConfidence * 100)}%
              </ThemedText>
            </View>
          </View>

          {item.unmappedCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons
                name="alert-circle-outline"
                size={12}
                color={theme.colors.warning}
                style={{ marginRight: 4 }}
              />
              <ThemedText variant="caption" color="warning">
                {item.unmappedCount} món chưa nhận diện được
              </ThemedText>
            </View>
          )}
        </View>
      </AppCard>
    </Animated.View>
  );

  const renderSectionHeader = ({
    section: { title },
  }: {
    section: { title: string };
  }) => (
    <View style={styles.sectionHeader}>
      <ThemedText
        variant="h4"
        color="textSecondary"
        style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 }}
      >
        {title}
      </ThemedText>
    </View>
  );

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        title="Lịch sử nhận diện"
        subtitle="Các món ăn bạn đã quét gần đây"
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText color="danger">{error}</ThemedText>
          <Button
            title="Thử lại"
            onPress={loadHistory}
            variant="secondary"
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.detectionId.toString()}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="images-outline" size={64} color={theme.colors.border} />
              <ThemedText color="textSecondary" style={{ marginTop: 16 }}>
                Chưa có lịch sử nhận diện nào
              </ThemedText>
            </View>
          }
        />
      )}
    </Screen>
  );
};

export default VisionHistoryScreen;
