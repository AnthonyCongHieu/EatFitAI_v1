import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../theme/ThemeProvider';

const TypingText = ({ text, style }: { text: string; style?: any }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset khi text thay đổi
    indexRef.current = 0;
    setDisplayedText('');

    // Clear interval cũ nếu có
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text]);

  return <ThemedText style={style}>{displayedText}</ThemedText>;
};

export const WelcomeHeader = () => {
  const { user } = useAuthStore();
  const { theme } = useAppTheme();

  const getGreeting = (): { emoji: string; text: string } => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { emoji: '🌅', text: 'Chào buổi sáng' };
    if (hour >= 12 && hour < 17) return { emoji: '☀️', text: 'Chào buổi chiều' };
    if (hour >= 17 && hour < 22) return { emoji: '🌙', text: 'Chào buổi tối' };
    return { emoji: '🌃', text: 'Khuya rồi' }; // Late night
  };

  const getInsight = () => {
    // In a real app, this would be dynamic or fetched from AI
    const insights = [
      'Hôm nay hãy tập trung vào Protein nhé!',
      'Đừng quên uống đủ nước hôm nay.',
      'Bạn đã làm rất tốt trong tuần này!',
      'Sẵn sàng cho một bữa ăn ngon chưa?',
      'Cố gắng đạt mục tiêu calories nhé!',
    ];
    // Pick random insight based on day to keep it stable for the day
    const day = new Date().getDate();
    return insights[day % insights.length];
  };

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}
        >
          <ThemedText variant="body" style={{ fontSize: 20 }}>
            {greeting.emoji}
          </ThemedText>
          <ThemedText variant="body" style={{ color: theme.colors.textSecondary }}>
            {greeting.text},
          </ThemedText>
        </View>
        <TView style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <ThemedText
            variant="h2"
            style={{ color: theme.colors.text, fontWeight: '700' }}
            shrink
            ellipsis
          >
            {user?.name || 'Bạn mới'}
          </ThemedText>
          <ThemedText variant="h2" style={{ color: theme.colors.primary }}>
            {' '}
            !
          </ThemedText>
        </TView>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={[
          styles.insightContainer,
          { backgroundColor: theme.colors.primaryLight + '40' },
        ]}
      >
        <ThemedText style={{ marginRight: 8 }}>✨</ThemedText>
        <TypingText
          text={getInsight() || ''}
          style={{
            color: theme.colors.primaryDark,
            fontWeight: '600',
            fontSize: 14,
          }}
        />
      </Animated.View>
    </View>
  );
};

// Helper wrapper to fix TView potential issue
const TView = View;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  insightContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
