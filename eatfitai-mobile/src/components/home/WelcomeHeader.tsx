import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../theme/ThemeProvider';

const TypingText = ({ text, style }: { text: string; style?: any }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let index = 0;
        setDisplayedText('');
        const intervalId = setInterval(() => {
            setDisplayedText((prev) => prev + text.charAt(index));
            index++;
            if (index === text.length) {
                clearInterval(intervalId);
            }
        }, 50); // Typing speed

        return () => clearInterval(intervalId);
    }, [text]);

    return <ThemedText style={style}>{displayedText}</ThemedText>;
};

export const WelcomeHeader = () => {
    const { user } = useAuthStore();
    const { theme } = useAppTheme();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    const getInsight = () => {
        // In a real app, this would be dynamic or fetched from AI
        const insights = [
            "Hôm nay hãy tập trung vào Protein nhé!",
            "Đừng quên uống đủ nước hôm nay.",
            "Bạn đã làm rất tốt trong tuần này!",
            "Sẵn sàng cho một bữa ăn ngon chưa?",
            "Cố gắng đạt mục tiêu calories nhé!"
        ];
        // Pick random insight based on day to keep it stable for the day
        const day = new Date().getDate();
        return insights[day % insights.length];
    };

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
                <ThemedText variant="body" style={{ color: theme.colors.textSecondary, marginBottom: 4 }}>
                    {getGreeting()},
                </ThemedText>
                <TView style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <ThemedText variant="h2" style={{ color: theme.colors.text, fontWeight: '700' }}>
                        {user?.name || 'Bạn mới'}
                    </ThemedText>
                    <ThemedText variant="h2" style={{ color: theme.colors.primary }}> !</ThemedText>
                </TView>
            </Animated.View>

            <Animated.View
                entering={FadeInDown.delay(300).springify()}
                style={[styles.insightContainer, { backgroundColor: theme.colors.primaryLight + '40' }]}
            >
                <ThemedText style={{ marginRight: 8 }}>✨</ThemedText>
                <TypingText
                    text={getInsight() || ''}
                    style={{
                        color: theme.colors.primaryDark,
                        fontWeight: '600',
                        fontSize: 14
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
    }
});
