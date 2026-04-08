import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { TEST_IDS } from '../../../testing/testIds';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'IntroCarousel'>;

type IntroSlide = {
  key: 'rank' | 'calories' | 'experts';
  title: string;
  subtitle: string;
};

type MascotHeadProps = {
  size: number;
  bodyColor: string;
};

type MascotProps = {
  size: number;
  bodyColor: string;
  showAppleBadge?: boolean;
};

type FoodChip = {
  label: string;
  backgroundColor: string;
  position: {
    top: number;
    left?: number;
    right?: number;
  };
};

const SLIDES: IntroSlide[] = [
  {
    key: 'rank',
    title: 'Ứng dụng dinh dưỡng\ndành cho người Việt',
    subtitle: 'Theo dõi bữa ăn, hiểu dinh dưỡng và xây thói quen sống khỏe mỗi ngày.',
  },
  {
    key: 'calories',
    title: 'Tính calo và dinh dưỡng\nmón Việt dễ dàng hơn',
    subtitle: 'Ước tính theo món bạn chọn để việc ăn uống đúng mục tiêu trở nên đơn giản.',
  },
  {
    key: 'experts',
    title: 'Có lộ trình, gợi ý và\nđồng hành mỗi ngày',
    subtitle: 'Nhận đề xuất phù hợp với mục tiêu để bắt đầu khỏe hơn từ những bước nhỏ.',
  },
];

const CALORIE_CHIPS: FoodChip[] = [
  {
    label: 'cơm tấm',
    backgroundColor: '#22C55E',
    position: { left: 10, top: 26 },
  },
  {
    label: 'phở gà',
    backgroundColor: '#22C55E',
    position: { right: 10, top: 26 },
  },
  {
    label: 'bún bò',
    backgroundColor: '#22C55E',
    position: { left: 10, top: 220 },
  },
  {
    label: 'gỏi cuốn',
    backgroundColor: '#22C55E',
    position: { right: 10, top: 220 },
  },
];
const MascotHead = ({ size, bodyColor }: MascotHeadProps): React.ReactElement => {
  const faceWidth = size * 0.74;
  const faceHeight = size * 0.6;

  return (
    <View style={{ width: size, height: size * 0.94, alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.82,
          borderRadius: size * 0.34,
          backgroundColor: bodyColor,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: bodyColor,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: size * 0.08,
            left: size * 0.14,
            width: size * 0.14,
            height: size * 0.14,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <View
          style={{
            width: faceWidth,
            height: faceHeight,
            borderRadius: size * 0.3,
            backgroundColor: '#F8FBFF',
            marginTop: size * 0.13,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', gap: size * 0.08, marginTop: size * 0.01 }}>
            <View
              style={{
                width: size * 0.08,
                height: size * 0.13,
                borderRadius: 999,
                backgroundColor: bodyColor,
              }}
            />
            <View
              style={{
                width: size * 0.08,
                height: size * 0.13,
                borderRadius: 999,
                backgroundColor: bodyColor,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: faceHeight * 0.53,
              left: faceWidth * 0.14,
              width: size * 0.085,
              height: size * 0.042,
              borderRadius: 999,
              backgroundColor: 'rgba(244, 114, 182, 0.32)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: faceHeight * 0.53,
              right: faceWidth * 0.14,
              width: size * 0.085,
              height: size * 0.042,
              borderRadius: 999,
              backgroundColor: 'rgba(244, 114, 182, 0.32)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: faceHeight * 0.16,
              width: size * 0.11,
              height: size * 0.056,
              borderBottomLeftRadius: 999,
              borderBottomRightRadius: 999,
              borderWidth: size * 0.01,
              borderTopWidth: 0,
              borderColor: 'rgba(15, 23, 42, 0.28)',
            }}
          />
        </View>
      </View>
    </View>
  );
};
const CuteMascot = ({ size, bodyColor, showAppleBadge = false }: MascotProps): React.ReactElement => {
  const bodyWidth = size * 0.56;
  const bodyHeight = size * 0.46;

  return (
    <View style={{ width: size * 1.18, alignItems: 'center' }}>
      <MascotHead size={size} bodyColor={bodyColor} />
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          borderRadius: bodyWidth * 0.38,
          backgroundColor: bodyColor,
          marginTop: -size * 0.08,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: bodyColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.14,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <View
          style={{
            width: bodyWidth * 0.5,
            height: bodyHeight * 0.42,
            borderRadius: bodyWidth * 0.22,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showAppleBadge ? <Ionicons name="nutrition" size={size * 0.17} color="#FFFFFF" /> : null}
        </View>
      </View>
    </View>
  );
};

const IntroCarouselScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        backgroundFill: {
          ...StyleSheet.absoluteFillObject,
        },
        topGlow: {
          position: 'absolute',
          top: -height * 0.16,
          alignSelf: 'center',
          width: width * 1.18,
          height: width * 1.18,
          borderRadius: width * 0.59,
          backgroundColor: theme.colors.primary + '26',
        },
        bottomGlow: {
          position: 'absolute',
          bottom: -height * 0.1,
          left: -width * 0.1,
          width: width * 0.78,
          height: width * 0.78,
          borderRadius: width * 0.39,
          backgroundColor: theme.colors.primary + '12',
        },
        shell: {
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 18),
        },
        brand: {
          alignItems: 'center',
          marginBottom: 8,
        },
        brandText: {
          color: '#FFFFFF',
          fontSize: 28,
          lineHeight: 34,
          fontFamily: 'BeVietnamPro_700Bold',
          letterSpacing: -0.4,
        },
        carousel: {
          flex: 1,
        },
        slide: {
          width,
          paddingHorizontal: 28,
          justifyContent: 'space-between',
        },
        heroBlock: {
          flex: 1,
          justifyContent: 'center',
        },
        artworkWrap: {
          height: height * 0.42,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 8,
        },
        artworkGlow: {
          position: 'absolute',
          width: width * 0.7,
          height: width * 0.7,
          borderRadius: width * 0.35,
          backgroundColor: theme.colors.primary + '18',
        },
        artworkHalo: {
          position: 'absolute',
          width: width * 0.48,
          height: width * 0.48,
          borderRadius: width * 0.24,
          backgroundColor: theme.colors.primary + '10',
          borderWidth: 1,
          borderColor: theme.colors.primary + '18',
        },
        mascotShadow: {
          position: 'absolute',
          bottom: 34,
          width: width * 0.28,
          height: 18,
          borderRadius: 999,
          backgroundColor: 'rgba(4, 12, 24, 0.28)',
        },
        chip: {
          position: 'absolute',
          width: 104,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        },
        chipText: {
          color: '#052E16',
          fontSize: 15,
          lineHeight: 20,
          fontFamily: 'BeVietnamPro_700Bold',
        },
        chartScene: {
          width: width,
          height: width * 0.72,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        deviceStack: {
          width: width * 0.56,
          alignItems: 'center',
          justifyContent: 'center',
        },
        deviceScreen: {
          width: width * 0.48,
          borderRadius: 24,
          backgroundColor: '#152033',
          borderWidth: 4,
          borderColor: theme.colors.primary,
          paddingHorizontal: 14,
          paddingTop: 16,
          paddingBottom: 14,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.16,
          shadowRadius: 22,
          elevation: 10,
        },
        deviceTopLine: {
          width: '42%',
          height: 10,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.12)',
          marginBottom: 16,
          alignSelf: 'flex-start',
        },
        deviceBarsRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        },
        deviceBar: {
          flex: 1,
          minWidth: 16,
          borderRadius: 8,
          backgroundColor: '#4D8FE3',
        },
        deviceBarAccent: {
          backgroundColor: '#22C55E',
        },
        deviceBottomLine: {
          width: '84%',
          height: 8,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignSelf: 'center',
        },
        deviceBase: {
          width: width * 0.48,
          height: 18,
          borderRadius: 999,
          backgroundColor: theme.colors.primary,
          marginTop: 10,
        },
        cardStage: {
          width: width * 0.84,
          height: width * 0.62,
          alignItems: 'center',
          justifyContent: 'center',
        },
        lightRay: {
          position: 'absolute',
          width: 86,
          height: 220,
          borderRadius: 999,
          backgroundColor: theme.colors.primary + '16',
        },
        profileFrame: {
          width: width * 0.89,
          borderRadius: 40,
          padding: 5,
          backgroundColor: 'rgba(111, 176, 255, 0.95)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.22)',
          transform: [{ rotate: '-6deg' }],
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.22,
          shadowRadius: 26,
          elevation: 12,
        },
        profileCard: {
          width: '100%',
          minHeight: width * 0.36,
          borderRadius: 35,
          backgroundColor: '#F7FBFF',
          borderWidth: 1,
          borderColor: 'rgba(126, 166, 220, 0.35)',
          paddingHorizontal: 20,
          paddingVertical: 18,
        },
        profileInner: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        avatarCard: {
          width: 80,
          height: 88,
          borderRadius: 28,
          backgroundColor: '#DCEBFF',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        },
        profileContent: {
          flex: 1,
        },
        profileLabel: {
          color: '#5C6D87',
          fontSize: 13,
          lineHeight: 18,
          fontFamily: 'BeVietnamPro_500Medium',
          marginBottom: 3,
        },
        profileValue: {
          color: '#0F172A',
          fontSize: 17,
          lineHeight: 22,
          fontFamily: 'BeVietnamPro_700Bold',
          marginBottom: 8,
        },
        profileRole: {
          color: '#0F172A',
          fontSize: 13,
          lineHeight: 17,
          fontFamily: 'BeVietnamPro_700Bold',
          letterSpacing: 0.2,
        },
        starsRow: {
          flexDirection: 'row',
          gap: 4,
          marginTop: 12,
        },
        content: {
          alignItems: 'center',
          paddingBottom: 12,
        },
        title: {
          color: '#FFFFFF',
          textAlign: 'center',
          fontSize: 28,
          lineHeight: 38,
          fontFamily: 'BeVietnamPro_700Bold',
          letterSpacing: -0.4,
          marginBottom: 14,
        },
        subtitle: {
          maxWidth: 330,
          textAlign: 'center',
          color: 'rgba(228, 236, 249, 0.76)',
          fontSize: 17,
          lineHeight: 28,
          fontFamily: 'BeVietnamPro_400Regular',
        },
        footer: {
          paddingHorizontal: 24,
          paddingTop: 12,
        },
        dotsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 22,
        },
        dot: {
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.28)',
        },
        dotActive: {
          width: 12,
          height: 12,
          backgroundColor: '#FFFFFF',
        },
        buttonShell: {
          borderRadius: 999,
          overflow: 'hidden',
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 8,
        },
        buttonGradient: {
          minHeight: 62,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
        },
        buttonText: {
          color: '#FFFFFF',
          fontSize: 18,
          lineHeight: 24,
          fontFamily: 'Inter_700Bold',
        },
      }),
    [insets.bottom, insets.top, theme],
  );

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(nextIndex);
  };

  const handleStart = () => {
    navigation.replace('Welcome');
  };

  const renderArtwork = (slide: IntroSlide) => {
    if (slide.key === 'rank') {
      return (
        <View style={styles.artworkWrap}>
          <View style={styles.artworkGlow} />
          <View style={styles.artworkHalo} />
          <View style={styles.mascotShadow} />
          <CuteMascot size={154} bodyColor={theme.colors.primary} showAppleBadge />
        </View>
      );
    }

    if (slide.key === 'calories') {
      return (
        <View style={styles.artworkWrap}>
          <View style={styles.artworkGlow} />
          <View style={styles.artworkHalo} />
          <View style={styles.chartScene}>
            {CALORIE_CHIPS.map((chip) => (
              <View
                key={chip.label}
                style={[styles.chip, chip.position, { backgroundColor: chip.backgroundColor }]}
              >
                <ThemedText style={styles.chipText}>{chip.label}</ThemedText>
              </View>
            ))}

            <View style={styles.deviceStack}>
              <View style={styles.deviceScreen}>
                <View style={styles.deviceTopLine} />
                <View style={styles.deviceBarsRow}>
                  <View style={[styles.deviceBar, { height: 30 }]} />
                  <View style={[styles.deviceBar, { height: 54 }]} />
                  <View style={[styles.deviceBar, { height: 40 }]} />
                  <View style={[styles.deviceBar, styles.deviceBarAccent, { height: 68 }]} />
                  <View style={[styles.deviceBar, { height: 48 }]} />
                </View>
                <View style={styles.deviceBottomLine} />
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.artworkWrap}>
        <View style={styles.artworkGlow} />
        <View style={styles.cardStage}>
          <View style={[styles.lightRay, { transform: [{ rotate: '-24deg' }] }]} />
          <View style={[styles.lightRay, { transform: [{ rotate: '24deg' }] }]} />
          <View style={styles.profileFrame}>
            <View style={styles.profileCard}>
              <View style={styles.profileInner}>
                <View style={styles.avatarCard}>
                  <MascotHead size={56} bodyColor={theme.colors.primary} />
                </View>
                <View style={styles.profileContent}>
                  <ThemedText style={styles.profileLabel}>Họ tên:</ThemedText>
                  <ThemedText style={styles.profileValue}>EatFit</ThemedText>
                  <ThemedText style={styles.profileLabel}>Chức vụ:</ThemedText>
                  <ThemedText style={styles.profileRole} lines={1}>
                    CHUYÊN GIA DINH DƯỠNG
                  </ThemedText>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Ionicons key={index} name="star" size={20} color="#22C55E" />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSlide = ({ item }: ListRenderItemInfo<IntroSlide>) => (
    <View style={styles.slide}>
      <View style={styles.heroBlock}>{renderArtwork(item)}</View>
      <View style={styles.content}>
        <ThemedText style={styles.title}>{item.title}</ThemedText>
        <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
      </View>
    </View>
  );

  return (
    <View style={styles.container} testID={TEST_IDS.auth.introScreen}>
      <LinearGradient
        colors={['#09111F', '#132844', '#08101C']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.backgroundFill}
      />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.shell}>
        <View style={styles.brand}>
          <ThemedText style={styles.brandText}>EatFit AI</ThemedText>
        </View>

        <FlatList
          data={SLIDES}
          keyExtractor={(item) => item.key}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
        />

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, index) => (
              <View
                key={slide.key}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu ngay"
            testID={TEST_IDS.auth.introStartButton}
          >
            <View style={styles.buttonShell}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <ThemedText style={styles.buttonText}>Bắt đầu ngay</ThemedText>
              </LinearGradient>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default IntroCarouselScreen;
