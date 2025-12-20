import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import { AppHeader } from '../../../components/ui/AppHeader';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useUserPreferenceStore } from '../../../store/useUserPreferenceStore';
import { t } from '../../../i18n/vi';
import { SelectionChip } from '../../../components/ui/SelectionChip';

const DIETARY_OPTIONS = [
    { id: 'vegetarian', label: 'Ăn chay' },
    { id: 'vegan', label: 'Thuần chay' },
    { id: 'halal', label: 'Halal (Không heo)' },
    { id: 'no-pork', label: 'Không ăn heo' },
    { id: 'no-beef', label: 'Không ăn bò' },
    { id: 'low-carb', label: 'Low carb' },
    { id: 'high-protein', label: 'High protein' },
];

const ALLERGY_OPTIONS = [
    { id: 'seafood', label: 'Hải sản' },
    { id: 'peanut', label: 'Đậu phộng' },
    { id: 'dairy', label: 'Sữa/Phô mai' },
    { id: 'egg', label: 'Trứng' },
    { id: 'wheat', label: 'Lúa mì (Gluten)' },
    { id: 'soy', label: 'Đậu nành' },
];

export const DietaryRestrictionsScreen = () => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    const { preferences, fetchPreferences, updatePreferences, isLoading } = useUserPreferenceStore();

    const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    useEffect(() => {
        if (preferences) {
            setSelectedDiet(preferences.dietaryRestrictions || []);
            setSelectedAllergies(preferences.allergies || []);
        }
    }, [preferences]);

    const handleSave = async () => {
        try {
            await updatePreferences({
                ...preferences,
                dietaryRestrictions: selectedDiet,
                allergies: selectedAllergies,
                preferredMealsPerDay: preferences?.preferredMealsPerDay || 3,
                preferredCuisine: preferences?.preferredCuisine || null,
            });
            Alert.alert('Thành công', 'Đã lưu thay đổi');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lưu thay đổi');
        }
    };

    const toggleSelection = (id: string, list: string[], setList: (val: string[]) => void) => {
        if (list.includes(id)) {
            setList(list.filter((i) => i !== id));
        } else {
            setList([...list, id]);
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        content: { padding: 20, gap: 24, paddingBottom: 100 },
        section: { gap: 12 },
        title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
        subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 },
        chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    });

    if (isLoading && !preferences) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader title="Chế độ ăn & Dị ứng" onBackPress={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.content}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
                    <ThemedText style={styles.title}>🥗 Chế độ ăn</ThemedText>
                    <ThemedText style={styles.subtitle}>Chọn các hạn chế hoặc chế độ ăn bạn đang theo đuổi.</ThemedText>
                    <View style={styles.chipsContainer}>
                        {DIETARY_OPTIONS.map((opt) => (
                            <SelectionChip
                                key={opt.id}
                                label={opt.label}
                                selected={selectedDiet.includes(opt.id)}
                                onPress={() => toggleSelection(opt.id, selectedDiet, setSelectedDiet)}
                            />
                        ))}
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                    <ThemedText style={styles.title}>🚫 Dị ứng thực phẩm</ThemedText>
                    <ThemedText style={styles.subtitle}>Chúng tôi sẽ cảnh báo hoặc loại bỏ các món chứa thành phần này.</ThemedText>
                    <View style={styles.chipsContainer}>
                        {ALLERGY_OPTIONS.map((opt) => (
                            <SelectionChip
                                key={opt.id}
                                label={opt.label}
                                selected={selectedAllergies.includes(opt.id)}
                                onPress={() => toggleSelection(opt.id, selectedAllergies, setSelectedAllergies)}
                            />
                        ))}
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300)}>
                    <Button
                        title="Lưu thay đổi"
                        onPress={handleSave}
                        loading={isLoading}
                        variant="primary"
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
};

export default DietaryRestrictionsScreen;
