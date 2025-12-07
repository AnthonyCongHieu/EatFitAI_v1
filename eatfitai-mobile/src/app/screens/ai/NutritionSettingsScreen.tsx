// Màn hình Cài đặt dinh dưỡng hợp nhất
// Cho phép xem, chỉnh sửa thủ công và sử dụng AI để gợi ý mục tiêu

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type NutritionTarget } from '../../../services/aiService';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { handleApiError, handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TargetSchema = z.object({
    calories: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 500 && Number(val) <= 10000, { message: t('nutrition_settings.validation_calories') }),
    protein: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, { message: t('nutrition_settings.validation_protein') }),
    carbs: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, { message: t('nutrition_settings.validation_carbs') }),
    fat: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, { message: t('nutrition_settings.validation_fat') }),
});

type TargetFormValues = z.infer<typeof TargetSchema>;

const NutritionSettingsScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation<NavigationProp>();
    const queryClient = useQueryClient();
    const refreshSummary = useDiaryStore((s) => s.refreshSummary);

    const [isEditing, setIsEditing] = useState(false);
    const [suggestedTarget, setSuggestedTarget] = useState<NutritionTarget | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<TargetFormValues>({
        resolver: zodResolver(TargetSchema),
        defaultValues: {
            calories: '2000',
            protein: '150',
            carbs: '200',
            fat: '60',
        },
    });

    // Fetch current target
    const {
        data: currentTarget,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['nutrition-target'],
        queryFn: aiService.getCurrentNutritionTarget,
    });

    // Update form when data loads
    useEffect(() => {
        if (currentTarget) {
            reset({
                calories: String(Math.round(currentTarget.calories)),
                protein: String(Math.round(currentTarget.protein)),
                carbs: String(Math.round(currentTarget.carbs)),
                fat: String(Math.round(currentTarget.fat)),
            });
        }
    }, [currentTarget, reset]);

    // Handle load error
    useEffect(() => {
        if (error) handleApiError(error);
    }, [error]);

    // AI Suggestion Mutation
    const suggestMutation = useMutation({
        mutationFn: aiService.recalculateNutritionTarget,
        onSuccess: (data) => {
            setSuggestedTarget(data);
        },
        onError: (err) => {
            handleApiErrorWithCustomMessage(err, {
                unknown: { text1: t('nutrition_settings.error_suggest'), text2: t('nutrition_settings.error_suggest_msg') },
            });
        },
    });

    // Apply Target Mutation
    const applyMutation = useMutation({
        mutationFn: aiService.applyNutritionTarget,
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ['nutrition-target'] });
            await refreshSummary();
            setIsEditing(false);
            setSuggestedTarget(null);

            // Update form values
            reset({
                calories: String(Math.round(variables.calories)),
                protein: String(Math.round(variables.protein)),
                carbs: String(Math.round(variables.carbs)),
                fat: String(Math.round(variables.fat)),
            });

            Alert.alert(t('nutrition_settings.success_title'), t('nutrition_settings.success_message'));
        },
        onError: (err) => handleApiError(err),
    });

    const onSaveManual = (values: TargetFormValues) => {
        applyMutation.mutate({
            calories: Number(values.calories),
            protein: Number(values.protein),
            carbs: Number(values.carbs),
            fat: Number(values.fat),
        } as NutritionTarget);
    };

    const onApplySuggestion = () => {
        if (suggestedTarget) {
            applyMutation.mutate(suggestedTarget);
        }
    };

    const styles = StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
            gap: theme.spacing.xl,
        },
        row: {
            flexDirection: 'row',
            gap: theme.spacing.md,
        },
        col: {
            flex: 1,
        },
        macroCard: {
            alignItems: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        divider: {
            height: 1,
            backgroundColor: theme.colors.border,
            marginVertical: theme.spacing.lg,
        },
        suggestionBox: {
            backgroundColor: theme.colors.primaryLight,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.card,
            borderWidth: 1,
            borderColor: theme.colors.primary,
        },
    });

    const renderMacroInput = (
        name: keyof TargetFormValues,
        label: string,
        placeholder: string
    ) => (
        <View style={styles.col}>
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, value, onBlur } }) => (
                    <ThemedTextInput
                        label={label}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        keyboardType="numeric"
                        editable={isEditing}
                        error={!!errors[name]}
                        style={{ backgroundColor: isEditing ? theme.colors.background : theme.colors.card }}
                    />
                )}
            />
        </View>
    );

    const renderMacroDisplay = (label: string, value: number, unit: string = 'g') => (
        <View style={styles.macroCard}>
            <ThemedText variant="caption" color="textSecondary" weight="600">
                {label}
            </ThemedText>
            <ThemedText variant="h4" color="primary">
                {Math.round(value)}
                <ThemedText variant="caption" color="textSecondary"> {unit}</ThemedText>
            </ThemedText>
        </View>
    );

    if (isLoading) {
        return (
            <Screen>
                <ScreenHeader title={t('nutrition_settings.title')} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </Screen>
        );
    }

    return (
        <Screen>
            <ScreenHeader title={t('nutrition_settings.title')} subtitle={t('nutrition_settings.subtitle')} />

            <ScrollView contentContainerStyle={styles.container}>
                {/* Current Target Section */}
                <AppCard>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: theme.spacing.md,
                    }}>
                        <View style={{ flex: 1 }}>
                            <SectionHeader title={t('nutrition_settings.current_target')} />
                        </View>
                        {!isEditing && (
                            <Button
                                variant="ghost"
                                title={t('nutrition_settings.edit')}
                                size="sm"
                                onPress={() => setIsEditing(true)}
                            />
                        )}
                    </View>

                    {isEditing ? (
                        <Animated.View entering={FadeIn} layout={Layout.springify()}>
                            <Controller
                                control={control}
                                name="calories"
                                render={({ field: { onChange, value, onBlur } }) => (
                                    <ThemedTextInput
                                        label={t('nutrition_settings.calories_label')}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="2000"
                                        keyboardType="numeric"
                                        error={!!errors.calories}
                                        helperText={errors.calories?.message}
                                    />
                                )}
                            />

                            <View style={[styles.row, { marginTop: theme.spacing.md }]}>
                                {renderMacroInput('protein', t('nutrition_settings.protein_label'), '150')}
                                {renderMacroInput('carbs', t('nutrition_settings.carbs_label'), '200')}
                                {renderMacroInput('fat', t('nutrition_settings.fat_label'), '60')}
                            </View>

                            <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
                                <Button
                                    variant="outline"
                                    title={t('nutrition_settings.cancel')}
                                    onPress={() => {
                                        setIsEditing(false);
                                        reset();
                                    }}
                                    style={styles.col}
                                />
                                <Button
                                    variant="primary"
                                    title={t('nutrition_settings.save')}
                                    onPress={handleSubmit(onSaveManual)}
                                    loading={applyMutation.isPending}
                                    disabled={applyMutation.isPending}
                                    style={styles.col}
                                />
                            </View>
                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeIn} layout={Layout.springify()}>
                            <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
                                <ThemedText variant="h1" color="primary">
                                    {Math.round(currentTarget?.calories ?? 0)}
                                </ThemedText>
                                <ThemedText variant="body" color="textSecondary">kcal / ngày</ThemedText>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.col}>{renderMacroDisplay('Protein', currentTarget?.protein ?? 0)}</View>
                                <View style={styles.col}>{renderMacroDisplay('Carbs', currentTarget?.carbs ?? 0)}</View>
                                <View style={styles.col}>{renderMacroDisplay('Fat', currentTarget?.fat ?? 0)}</View>
                            </View>
                        </Animated.View>
                    )}
                </AppCard>

                {/* AI Suggestion Section */}
                <AppCard>
                    <SectionHeader
                        title={t('nutrition_settings.ai_section_title')}
                        subtitle={t('nutrition_settings.ai_section_subtitle')}
                    />

                    {!suggestedTarget ? (
                        <View>
                            <ThemedText variant="body" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
                                {t('nutrition_settings.ai_desc')}
                            </ThemedText>
                            <Button
                                variant="secondary"
                                title={t('nutrition_settings.analyze_btn')}
                                onPress={() => suggestMutation.mutate()}
                                loading={suggestMutation.isPending}
                                disabled={suggestMutation.isPending}
                                icon={<ThemedText>✨</ThemedText>}
                            />
                        </View>
                    ) : (
                        <Animated.View entering={FadeInDown} style={styles.suggestionBox}>
                            <ThemedText variant="h3" color="primary" style={{ marginBottom: theme.spacing.sm }}>
                                {t('nutrition_settings.new_suggestion')}
                            </ThemedText>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                                <View>
                                    <ThemedText variant="caption" color="textSecondary">Calories</ThemedText>
                                    <ThemedText variant="h2">{Math.round(suggestedTarget.calories)}</ThemedText>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <ThemedText variant="caption" color="textSecondary">{t('nutrition_settings.change_label')}</ThemedText>
                                    <ThemedText variant="h3" color={suggestedTarget.calories > (currentTarget?.calories ?? 0) ? 'success' : 'warning'}>
                                        {suggestedTarget.calories > (currentTarget?.calories ?? 0) ? '+' : ''}
                                        {Math.round(suggestedTarget.calories - (currentTarget?.calories ?? 0))}
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <ThemedText variant="caption">Protein</ThemedText>
                                    <ThemedText variant="h4">{Math.round(suggestedTarget.protein)}g</ThemedText>
                                </View>
                                <View style={styles.col}>
                                    <ThemedText variant="caption">Carbs</ThemedText>
                                    <ThemedText variant="h4">{Math.round(suggestedTarget.carbs)}g</ThemedText>
                                </View>
                                <View style={styles.col}>
                                    <ThemedText variant="caption">Fat</ThemedText>
                                    <ThemedText variant="h4">{Math.round(suggestedTarget.fat)}g</ThemedText>
                                </View>
                            </View>

                            {suggestedTarget.explanation && (
                                <View style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, backgroundColor: theme.colors.background, borderRadius: 8 }}>
                                    <ThemedText variant="bodySmall" color="textSecondary">
                                        💡 {suggestedTarget.explanation}
                                    </ThemedText>
                                </View>
                            )}

                            <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
                                <Button
                                    variant="outline"
                                    title={t('nutrition_settings.skip')}
                                    onPress={() => setSuggestedTarget(null)}
                                    style={styles.col}
                                />
                                <Button
                                    variant="primary"
                                    title={t('nutrition_settings.apply')}
                                    onPress={onApplySuggestion}
                                    loading={applyMutation.isPending}
                                    style={styles.col}
                                />
                            </View>
                        </Animated.View>
                    )}
                </AppCard>
            </ScrollView>
        </Screen>
    );
};

export default NutritionSettingsScreen;
