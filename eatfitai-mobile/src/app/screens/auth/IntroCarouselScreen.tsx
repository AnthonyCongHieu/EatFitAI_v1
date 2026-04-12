import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
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
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';

import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { TEST_IDS } from '../../../testing/testIds';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const phoBowlImage = require('../../../assets/pho-bowl.png');

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'IntroCarousel'>;

type IntroSlide = {
  key: 'calories' | 'progress' | 'roadmap';
  title: string;
  subtitle: string;
};

const SLIDES: IntroSlide[] = [
  {
    key: 'calories',
    title: 'Tính calo và dinh dưỡng\nmón Việt dễ dàng hơn',
    subtitle:
      'Ước tính theo món bạn chọn để việc ăn uống đúng mục tiêu trở nên đơn giản.',
  },
  {
    key: 'progress',
    title: 'Chinh phục mọi mục\ntiêu hình thể',
    subtitle:
      'Lên kế hoạch, theo dõi tiến độ và nhận tư vấn của chuyên gia AI trong suốt hành trình.',
  },
  {
    key: 'roadmap',
    title: 'Có lộ trình, gợi ý và\nđồng hành mỗi ngày',
    subtitle:
      'Nhận đề xuất phù hợp với mục tiêu để bắt đầu khỏe hơn từ những bước nhỏ.',
  },
];

// ======================== SLIDE 1: NUTRITION RING ========================

const RING_SIZE = width * 0.56;
const BOWL_SIZE = RING_SIZE * 0.52;

const NutritionRingSlide = (): React.ReactElement => {
  return (
    <View style={s1.wrap}>
      {/* The ring + labels compound */}
      <View style={s1.ringCompound}>
        {/* CALO pill – overlaps ring at upper-left */}
        <View style={s1.caloPill}>
          <View style={s1.pill}>
            <ThemedText style={s1.pillKey}>CALO</ThemedText>
            <ThemedText style={s1.pillVal}>  450 kcal</ThemedText>
          </View>
        </View>

        {/* Ring */}
        <View style={s1.ring}>
          {/* Green glow border */}
          <View style={s1.greenBorder} />
          {/* Dashed ring */}
          <View style={s1.dashed} />
          {/* Dark inner */}
          <View style={s1.innerDark}>
            {/* Phở bò image */}
            <View style={s1.bowlClip}>
              <Image
                source={phoBowlImage}
                style={s1.bowlImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* PROTEIN pill – overlaps ring at lower-right */}
        <View style={s1.proteinPill}>
          <View style={s1.pill}>
            <ThemedText style={s1.pillKey}>PROTEIN</ThemedText>
            <ThemedText style={s1.pillVal}>  35g</ThemedText>
          </View>
        </View>

        {/* CARBS pill – overlaps ring at lower-left */}
        <View style={s1.carbsPill}>
          <View style={s1.pill}>
            <ThemedText style={s1.pillKey}>CARBS</ThemedText>
            <ThemedText style={s1.pillVal}>  40g</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
};

const s1 = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCompound: {
    width: RING_SIZE + 80,
    height: RING_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenBorder: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
    borderColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 10,
  },
  dashed: {
    position: 'absolute',
    width: RING_SIZE * 0.88,
    height: RING_SIZE * 0.88,
    borderRadius: (RING_SIZE * 0.88) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.28)',
    borderStyle: 'dashed',
  },
  innerDark: {
    width: RING_SIZE * 0.78,
    height: RING_SIZE * 0.78,
    borderRadius: (RING_SIZE * 0.78) / 2,
    backgroundColor: '#0B1426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowlClip: {
    width: BOWL_SIZE * 1.3,
    height: BOWL_SIZE * 1.3,
    borderRadius: (BOWL_SIZE * 1.3) / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bowlImage: {
    width: BOWL_SIZE * 1.3,
    height: BOWL_SIZE * 1.3,
  },
  // --- Pills positioned around the ring ---
  caloPill: {
    position: 'absolute',
    top: -4,
    left: -20,
    zIndex: 10,
  },
  proteinPill: {
    position: 'absolute',
    bottom: 8,
    right: -30,
    zIndex: 10,
  },
  carbsPill: {
    position: 'absolute',
    bottom: -8,
    left: -20,
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,20,38,0.92)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.16)',
  },
  pillKey: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_600SemiBold',
    letterSpacing: 0.8,
  },
  pillVal: {
    color: '#22C55E',
    fontSize: 15,
    fontFamily: 'BeVietnamPro_700Bold',
  },
});

// ======================== SLIDE 2: PROGRESS CHART ========================

const CHART_W = width * 0.82;
const SVG_W = CHART_W - 44;
const SVG_H = 120;

const ProgressChartSlide = (): React.ReactElement => {
  const curvePath = `M 0 ${SVG_H * 0.92} C ${SVG_W * 0.15} ${SVG_H * 0.85}, ${SVG_W * 0.25} ${SVG_H * 0.72}, ${SVG_W * 0.35} ${SVG_H * 0.58} S ${SVG_W * 0.5} ${SVG_H * 0.42}, ${SVG_W * 0.6} ${SVG_H * 0.32} S ${SVG_W * 0.78} ${SVG_H * 0.18}, ${SVG_W * 0.88} ${SVG_H * 0.12} L ${SVG_W} ${SVG_H * 0.06}`;
  const areaPath = `${curvePath} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`;

  return (
    <View style={s2.wrap}>
      {/* Main card */}
      <View style={s2.card}>
        {/* Header */}
        <ThemedText style={s2.weekLabel}>TIẾN ĐỘ HÀNG TUẦN</ThemedText>
        <View style={s2.headerRow}>
          <View style={s2.percentWrap}>
            <ThemedText 
              style={s2.percentText} 
              numberOfLines={1} 
              adjustsFontSizeToFit
              allowFontScaling={false}
            >
              +8.5% Cơ bắp
            </ThemedText>
          </View>
          <View style={s2.trophyCircle}>
            <Ionicons name="trophy" size={20} color="#22C55E" />
          </View>
        </View>

        {/* Goal badge */}
        <View style={s2.goalRow}>
          <View style={s2.goalBadge}>
            <View style={s2.goalDot} />
            <ThemedText style={s2.goalText}>ĐẠT MỤC TIÊU</ThemedText>
          </View>
        </View>

        {/* Chart */}
        <View style={s2.chartBox}>
          <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
            <Defs>
              <SvgLinearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#22C55E" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#22C55E" stopOpacity="0.02" />
              </SvgLinearGradient>
              <SvgLinearGradient id="lGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#16A34A" stopOpacity="0.5" />
                <Stop offset="0.5" stopColor="#22C55E" stopOpacity="1" />
                <Stop offset="1" stopColor="#4ADE80" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#aGrad)" />
            <Path
              d={curvePath}
              stroke="url(#lGrad)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            <Circle
              cx={SVG_W}
              cy={SVG_H * 0.06}
              r={5}
              fill="#4ADE80"
            />
            <Circle
              cx={SVG_W}
              cy={SVG_H * 0.06}
              r={9}
              fill="rgba(74,222,128,0.2)"
            />
          </Svg>
        </View>
      </View>

      {/* Daily badge */}
      <View style={s2.dailyBadge}>
        <View style={s2.flashCircle}>
          <Ionicons name="flash" size={18} color="#FFFFFF" />
        </View>
        <View>
          <ThemedText style={s2.dailyLabel}>TIÊU THỤ HÀNG NGÀY</ThemedText>
          <View style={s2.dailyRow}>
            <ThemedText style={s2.dailyVal}>2,480 </ThemedText>
            <ThemedText style={s2.dailyUnit}>kcal</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
};

const s2 = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CHART_W,
    backgroundColor: 'rgba(14,24,42,0.92)',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  weekLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    letterSpacing: 1,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  percentWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  percentText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: -0.5,
    paddingRight: 4,
    paddingTop: 8,
    paddingBottom: 4,
    includeFontPadding: true,
  },
  trophyCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  goalRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  goalText: {
    color: '#22C55E',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_600SemiBold',
    letterSpacing: 0.5,
  },
  chartBox: {
    marginTop: 4,
    overflow: 'hidden',
    borderRadius: 8,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,24,42,0.92)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  flashCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dailyLabel: {
    color: '#22C55E',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dailyVal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  dailyUnit: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});

// ======================== SLIDE 3: ROADMAP ========================

// Design reference layout:
// - Step 1 (Đạt mục tiêu): top-center, lock icon on right
// - Step 2 (Theo dõi bữa ăn): middle, shifted left, fork icon on far-left
// - Step 3 (Đặt mục tiêu): bottom, shifted right, green checkmark on right
// - Dashed curved path connecting all three steps

const RM_CARD_W = width * 0.55;
const RM_SVG_W = width - 48; // leave some padding
  const RM_SVG_H = height * 0.46; // Extended height for better curve

  const RoadmapSlide = (): React.ReactElement => {
    // S-curve winding dashed path
    const step1Y = RM_SVG_H * 0.15;
    const step2Y = RM_SVG_H * 0.50;
    const step3Y = RM_SVG_H * 0.85;
    const leftX = RM_SVG_W * 0.28;
    const rightX = RM_SVG_W * 0.72; 

    // S-Shape: start at right, curve to left, curve back to right
    const dashedPath = `M ${rightX} 0
      L ${rightX} ${step1Y}
      C ${rightX} ${step1Y + 40}, ${leftX} ${step2Y - 40}, ${leftX} ${step2Y}
      C ${leftX} ${step2Y + 40}, ${rightX} ${step3Y - 40}, ${rightX} ${step3Y}
      L ${rightX} ${RM_SVG_H}`;

    return (
      <View style={s3.wrap}>
        {/* SVG dashed winding path */}
        <View style={s3.svgLayer}>
          <Svg width={RM_SVG_W} height={RM_SVG_H}>
            <Defs>
              <SvgLinearGradient id="rmGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#22C55E" stopOpacity="0.5" />
                <Stop offset="0.5" stopColor="#22C55E" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#22C55E" stopOpacity="0.0" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d={dashedPath}
              stroke="url(#rmGrad)"
              strokeWidth={2}
              fill="none"
              strokeDasharray="8,6"
              strokeLinecap="round"
            />
            {/* Glow dots at each step */}
            <Circle cx={rightX} cy={step1Y} r={4} fill="rgba(34,197,94,0.4)" />
            <Circle cx={leftX} cy={step2Y} r={4} fill="rgba(34,197,94,0.3)" />
            <Circle cx={rightX} cy={step3Y} r={4} fill="rgba(34,197,94,0.25)" />
          </Svg>
        </View>

        {/* Step 1: Đạt mục tiêu - Shifted Right */}
        <View style={[s3.stepRow, { justifyContent: 'flex-end', paddingRight: width * 0.04 }]}>
          <View style={s3.card}>
            <View style={s3.iconBox}>
              <Ionicons name="trophy" size={20} color="#F59E0B" />
            </View>
            <View style={s3.txts}>
              <ThemedText style={s3.cardTitle}>Đạt mục tiêu</ThemedText>
              <ThemedText style={s3.cardSub}>Khỏe mạnh bền vững</ThemedText>
            </View>
          </View>
          <View style={s3.lockCircle}>
            <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.45)" />
          </View>
        </View>

        {/* Step 2: Theo dõi bữa ăn - Shifted left */}
        <View style={[s3.stepRow, { justifyContent: 'flex-start', paddingLeft: width * 0.04 }]}>
          <View style={s3.sideCircle}>
            <Ionicons name="restaurant" size={18} color="#22C55E" />
          </View>
          <View style={s3.card}>
            <View style={s3.iconBox}>
              <ThemedText style={{ fontSize: 20 }}>🥗</ThemedText>
            </View>
            <View style={s3.txts}>
              <ThemedText style={s3.cardTitle}>Theo dõi bữa ăn</ThemedText>
              <ThemedText style={s3.cardSub}>Ghi lại bữa ăn hàng ngày</ThemedText>
            </View>
          </View>
        </View>

        {/* Step 3: Đặt mục tiêu - Shifted Right */}
        <View style={[s3.stepRow, { justifyContent: 'flex-end', paddingRight: width * 0.04 }]}>
          <View style={s3.card}>
            <View style={s3.iconBox}>
              <Ionicons name="flag" size={18} color="#EF4444" />
            </View>
            <View style={s3.txts}>
              <ThemedText style={s3.cardTitle}>Đặt mục tiêu</ThemedText>
              <ThemedText style={s3.cardSub}>Chọn mục tiêu sức khỏe</ThemedText>
            </View>
          </View>
          <View style={s3.checkCircle}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  };

const s3 = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  svgLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,24,42,0.92)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.14)',
    gap: 10,
    width: RM_CARD_W,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txts: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    marginBottom: 2,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
    lineHeight: 15,
  },
  lockCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sideCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.14)',
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});

// ======================== MAIN SCREEN ========================

const IntroCarouselScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#080E1A',
        },
        backgroundFill: {
          ...StyleSheet.absoluteFillObject,
        },
        topGlow: {
          position: 'absolute',
          top: -height * 0.12,
          alignSelf: 'center',
          width: width * 1.1,
          height: width * 1.1,
          borderRadius: width * 0.55,
          backgroundColor: 'rgba(34,197,94,0.05)',
        },
        shell: {
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 18),
        },
        brand: {
          alignItems: 'center',
          marginBottom: 4,
        },
        brandText: {
          color: '#22C55E',
          fontSize: 24,
          lineHeight: 30,
          fontFamily: 'BeVietnamPro_700Bold',
          letterSpacing: 4,
          textTransform: 'uppercase',
        },
        carousel: {
          flex: 1,
        },
        slide: {
          width,
          paddingHorizontal: 24,
        },
        heroBlock: {
          flex: 1,
          justifyContent: 'center',
        },
        content: {
          paddingBottom: 4,
          alignItems: 'center',
        },
        title: {
          color: '#FFFFFF',
          textAlign: 'center',
          fontSize: 26,
          lineHeight: 37,
          fontFamily: 'BeVietnamPro_700Bold',
          letterSpacing: -0.3,
          marginBottom: 10,
        },
        subtitle: {
          maxWidth: 310,
          textAlign: 'center',
          color: 'rgba(228,236,249,0.55)',
          fontSize: 15,
          lineHeight: 24,
          fontFamily: 'BeVietnamPro_400Regular',
        },
        footer: {
          paddingHorizontal: 24,
          paddingTop: 8,
        },
        dotsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.22)',
        },
        dotActive: {
          width: 28,
          height: 8,
          borderRadius: 999,
          backgroundColor: '#FFFFFF',
        },
        buttonShell: {
          borderRadius: 999,
          overflow: 'hidden',
          shadowColor: '#22C55E',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 8,
        },
        buttonGradient: {
          minHeight: 58,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          borderRadius: 999,
        },
        buttonText: {
          color: '#FFFFFF',
          fontSize: 18,
          lineHeight: 24,
          fontFamily: 'BeVietnamPro_700Bold',
        },
        buttonArrow: {
          color: '#FFFFFF',
          fontSize: 20,
          fontFamily: 'BeVietnamPro_400Regular',
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
    if (slide.key === 'calories') return <NutritionRingSlide />;
    if (slide.key === 'progress') return <ProgressChartSlide />;
    return <RoadmapSlide />;
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
        colors={['#080E1A', '#0F1B2E', '#080E1A']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.backgroundFill}
      />
      <View style={styles.topGlow} />

      <View style={styles.shell}>
        <View style={styles.brand}>
          <ThemedText style={styles.brandText}>EATFIT AI</ThemedText>
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
                colors={['#22C55E', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <ThemedText style={styles.buttonText}>Bắt đầu ngay</ThemedText>
                <ThemedText style={styles.buttonArrow}>→</ThemedText>
              </LinearGradient>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default IntroCarouselScreen;
