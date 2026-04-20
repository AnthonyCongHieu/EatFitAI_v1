/**
 * SubScreenLayout — Unified layout wrapper for all push-navigated sub-screens.
 *
 * Header pattern matched EXACTLY with ProfileScreen:
 * • flexDirection: 'row', justifyContent: 'space-between'
 * • 40×40 circular buttons on both sides
 * • Centered title in P.primaryContainer (#22c55e)
 * • backgroundColor: rgba(14, 19, 34, 0.8)
 * • height: 56
 *
 * Body:
 * • ScrollView with paddingHorizontal: 24 (matching ProfileScreen)
 * • Proper SafeArea + keyboard-avoiding support
 */

import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import { EN } from '../../theme/emeraldNebula';

interface SubScreenLayoutProps {
  /** Screen title displayed in the center of the header */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Screen content */
  children: React.ReactNode;
  /** Optional element rendered on the right side of the header */
  headerRight?: React.ReactNode;
  /** Enable scrolling (default: true) */
  scroll?: boolean;
  /** Enable keyboard avoiding behavior for form screens */
  keyboardAvoiding?: boolean;
  /** Show a centered loading spinner instead of children */
  loading?: boolean;
  /** Test automation ID */
  testID?: string;
  /** Content container style override */
  contentContainerStyle?: ViewStyle;
  /** Enable pull-to-refresh */
  onRefresh?: () => void;
  /** Whether the refresh indicator is spinning */
  refreshing?: boolean;
}

const SubScreenLayout: React.FC<SubScreenLayoutProps> = ({
  title,
  subtitle,
  children,
  headerRight,
  scroll = true,
  keyboardAvoiding = false,
  loading = false,
  testID,
  contentContainerStyle,
  onRefresh,
  refreshing = false,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const paddingTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  );

  /* ─── Header — mirrors ProfileScreen S.header exactly ─── */
  const header = (
    <View style={[styles.headerOuter, { paddingTop }]}>
      <View style={styles.header}>
        {/* Back button — same 40×40 circle as ProfileScreen S.headerBtn */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.headerBtn,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={22} color={EN.onSurface} />
        </Pressable>

        {/* Title — same font/size/color as ProfileScreen S.headerTitle */}
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {title}
        </ThemedText>

        {/* Right slot — same 40×40 placeholder for centering */}
        <View style={styles.headerBtn}>
          {headerRight}
        </View>
      </View>

      {subtitle && (
        <ThemedText style={styles.subtitleText}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );

  /* ─── Content ─── */
  const content = loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={EN.primary} />
    </View>
  ) : scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={EN.primary}
            colors={[EN.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentContainerStyle]}>
      {children}
    </View>
  );

  /* ─── Render ─── */
  return (
    <View style={styles.container} testID={testID}>
      {header}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Matched EXACTLY with ProfileScreen
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EN.bg, // P.surface (#0e1322)
  },

  /* ── Header (matches ProfileScreen S.header) ── */
  headerOuter: {
    backgroundColor: 'rgba(14, 19, 34, 0.8)', // ProfileScreen exact value
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // ← ProfileScreen pattern
    paddingHorizontal: 16,           // ← ProfileScreen exact
    height: 56,                      // ← ProfileScreen exact
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // ProfileScreen has no bg on headerBtn — the back button is just a
    // transparent circle. We add subtle bg for sub-screens to hint "back".
    backgroundColor: EN.surfaceHighest + '60', // semi-transparent
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: EN.primaryContainer, // #22c55e — ProfileScreen exact
    letterSpacing: -0.3,        // ProfileScreen exact
  },
  subtitleText: {
    fontSize: 13,
    color: EN.textMuted,
    textAlign: 'center',
    paddingBottom: 8,
  },

  /* ── Content (matches ProfileScreen S.scrollContent) ── */
  scrollContent: {
    paddingHorizontal: 24,     // ← ProfileScreen exact (not 20)
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 24,    // ← ProfileScreen exact
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SubScreenLayout;
