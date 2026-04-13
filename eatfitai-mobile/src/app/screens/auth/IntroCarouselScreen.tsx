import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
      'Lên kế hoạch, theo dõi tiến độ và nhận tư vấn của chuyên gia AI.',
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

const CHART_W = width * 0.85;
const CHART_H = 280;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressChartSlide = (): React.ReactElement => {
  const pulseAnimRef = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimRef, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimRef, {
          toValue: 0.2,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimRef]);

  // viewBox expanded to prevent SVG clipping at right/bottom edge
  const curvePath = "M0 140 C 40 135, 80 145, 120 120 C 160 95, 200 130, 240 100 C 280 70, 320 110, 400 20";
  const areaPath = "M0 140 C 40 135, 80 145, 120 120 C 160 95, 200 130, 240 100 C 280 70, 320 110, 400 20 L 400 160 L 0 160 Z";

  return (
    <View style={s2.wrap}>
      <View style={s2.heroWrapper}>
        {/* Main Glass Card */}
        <View style={s2.glassCard}>
          {/* Header */}
          <View style={s2.headerRow}>
            <View style={s2.colLeft}>
              <ThemedText style={s2.weekLabel}>TIẾN ĐỘ HÀNG TUẦN</ThemedText>
              <ThemedText style={s2.percentText}>+8.5% Cơ bắp</ThemedText>
            </View>

            {/* Trophy */}
            <View style={s2.trophyWrap}>
              <View style={s2.trophyGlow} />
              <Ionicons name="trophy" size={26} color="#22C55E" style={s2.trophyIcon} />
            </View>
          </View>

          {/* SVG Line Graph Area */}
          <View style={s2.graphArea}>
            <Svg width="100%" height="100%" viewBox="-10 -10 420 180" preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#10B981" />
                  <Stop offset="1" stopColor="#2DD4BF" />
                </SvgLinearGradient>
                <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#10B981" stopOpacity="0.4" />
                  <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Path d={areaPath} fill="url(#areaGrad)" />
              <Path
                d={curvePath}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Glowing animated dot at current progress */}
              <AnimatedCircle cx="400" cy="20" r="10" fill="#2DD4BF" opacity={pulseAnimRef} />
              <Circle cx="400" cy="20" r="4" fill="#FFFFFF" />
            </Svg>

            {/* Target Badge Floating Top-Right */}
            <View style={s2.targetBadge}>
              <View style={s2.targetDot} />
              <ThemedText style={s2.targetText}>ĐẠT MỤC TIÊU</ThemedText>
            </View>
          </View>
        </View>

        {/* Floating Stats Bubbles (Bottom Left) */}
        <View style={s2.floatingStats}>
          <LinearGradient colors={['#059669', '#4BE277']} style={s2.boltCircle}>
            <Ionicons name="flash" size={20} color="#002109" />
          </LinearGradient>
          <View style={s2.statsCol}>
            <ThemedText style={s2.statsLabel}>TIÊU THỤ HÀNG NGÀY</ThemedText>
            <View style={s2.statsValRow}>
              <ThemedText style={s2.statsVal}>2,480 </ThemedText>
              <ThemedText style={s2.statsUnit}>kcal</ThemedText>
            </View>
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
    paddingHorizontal: 16,
  },
  heroWrapper: {
    width: CHART_W,
    paddingBottom: 48, // Allow overlap area for floating stats
    alignItems: 'center',
    position: 'relative',
    marginTop: -20,
  },
  glassCard: {
    width: '100%',
    height: CHART_H,
    backgroundColor: 'rgba(26, 34, 53, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1, // subtle top border for 3D metallic sheen
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  colLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  weekLabel: {
    color: 'rgba(188,203,185,0.8)', // Text on surface variant approx
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  percentText: {
    color: '#DEE1F7',
    fontSize: 26,
    fontFamily: 'BeVietnamPro_800ExtraBold',
    letterSpacing: -0.5,
    marginTop: -2,
    lineHeight: 34,
    paddingTop: 4,
    paddingBottom: 4,
    includeFontPadding: true,
  },
  trophyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 4,
  },
  trophyGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    backgroundColor: '#22C55E',
    opacity: 0.25,
    borderRadius: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  trophyIcon: {
    textShadowColor: 'rgba(75, 226, 119, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  graphArea: {
    flex: 1,
    width: '100%',
    marginTop: 16,
    position: 'relative',
  },
  targetBadge: {
    position: 'absolute',
    top: -16,
    right: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  targetText: {
    color: '#22C55E',
    fontSize: 9,
    fontFamily: 'BeVietnamPro_700Bold',
    textTransform: 'uppercase',
  },
  floatingStats: {
    position: 'absolute',
    bottom: -40,
    left: -12,
    backgroundColor: 'rgba(26, 34, 53, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  statsCol: {
    justifyContent: 'center',
  },
  boltCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    marginRight: 14,
  },
  statsLabel: {
    color: 'rgba(52, 211, 153, 0.8)',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statsValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsVal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'BeVietnamPro_800ExtraBold',
    letterSpacing: -0.5,
  },
  statsUnit: {
    color: 'rgba(188,203,185,0.8)',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
    marginLeft: 4,
  },
});

// ======================== SLIDE 3: ROADMAP ========================

// Design reference layout:
// - Step 1 (Đạt mục tiêu): top, lock icon on right, opacity 50%
// - Step 2 (Theo dõi bữa ăn): middle, shifted left, pulsing fork icon on far-left
// - Step 3 (Đặt mục tiêu): bottom, shifted right, green checkmark on right
// - S-curve connecting all three steps


const RoadmapSlide = (): React.ReactElement => {
  const pulseAnimRef = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimRef, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimRef, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimRef]);

  // Heights and Coordinates
  const SVG_HEIGHT = 440;
  
  // Icon radiuses
  const topRadius = 22;
  const midRadius = 28;
  const botRadius = 20;

  // Node Y Centers
  const node1Y = 70;
  const node2Y = 220;
  const node3Y = 370;

  // X Layout Calculation
  // Tinh chỉnh trục X về sát tâm màn hình để đường cong mềm mại tự nhiên
  const centerX = (width - 48) / 2; // Căn giữa container (trừ padding slide)
  const SWEEP = 38; // Khoảng lệch của S-Curve so với tâm (vừa đủ mượt mà)

  const rightX = centerX + SWEEP;
  const leftX = centerX - SWEEP;
  const botX = rightX;

  // Nội suy Bezier Curve mượt mà với 2 control points quy về trung điểm Y
  const yMid1 = (node1Y + node2Y) / 2;
  const yMid2 = (node2Y + node3Y) / 2;

  const dashedPath = `
    M ${rightX} 0
    L ${rightX} ${node1Y}
    C ${rightX} ${yMid1}, ${leftX} ${yMid1}, ${leftX} ${node2Y}
    C ${leftX} ${yMid2}, ${botX} ${yMid2}, ${botX} ${node3Y}
    L ${botX} ${SVG_HEIGHT}
  `;

  return (
    <View style={s3.wrap}>
      {/* Background Winding Line */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={width} height={SVG_HEIGHT}>
          <Path
            d={dashedPath}
            stroke="#22C55E"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="6,6"
            strokeOpacity={0.6}
            strokeLinecap="round" // Góc cắt nét đứt mềm
          />
        </Svg>
      </View>

      {/* NODE 1: Đạt mục tiêu (Future) */}
      <View style={[s3.glassCard, { position: 'absolute', opacity: 0.5, right: width - 48 - rightX + topRadius + 8, top: node1Y - 24 }]}>
        <View style={s3.iconBox}>
          <Ionicons name="trophy" size={18} color="#F59E0B" />
        </View>
        <ThemedText style={s3.cardTitle} numberOfLines={1}>Đạt mục tiêu</ThemedText>
      </View>
      <View style={[s3.lockCircle, { position: 'absolute', left: rightX - topRadius, top: node1Y - topRadius, opacity: 0.5 }]}>
        <Ionicons name="lock-closed" size={18} color="#94A3B8" />
      </View>

      {/* NODE 2: Theo dõi bữa ăn (Active) */}
      <View style={[s3.activePulseWrap, { position: 'absolute', left: leftX - midRadius, top: node2Y - midRadius }]}>
        <Animated.View style={[s3.pulseRing, { opacity: pulseAnimRef }]} />
        <View style={s3.activeCircle}>
          <Ionicons name="restaurant" size={16} color="#FFFFFF" />
        </View>
      </View>
      <View style={[s3.glassCard, s3.activeCard, { position: 'absolute', left: leftX + midRadius + 6, top: node2Y - 24 }]}>
        <View style={[s3.iconBox, s3.iconBoxActive]}>
          <ThemedText style={{ fontSize: 16 }}>🥗</ThemedText>
        </View>
        <ThemedText style={s3.cardTitle} numberOfLines={1}>Theo dõi bữa ăn</ThemedText>
      </View>

      {/* NODE 3: Đặt mục tiêu (Completed) */}
      <View style={[s3.glassCard, { position: 'absolute', right: width - 48 - botX + botRadius + 8, top: node3Y - 24 }]}>
        <View style={s3.iconBox}>
          <Ionicons name="flag" size={18} color="#EF4444" />
        </View>
        <ThemedText style={s3.cardTitle} numberOfLines={1}>Đặt mục tiêu</ThemedText>
      </View>
      <View style={[s3.checkCircle, { position: 'absolute', left: botX - botRadius, top: node3Y - botRadius }]}>
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      </View>
    </View>
  );
};

const s3 = StyleSheet.create({
  wrap: {
    flex: 1,
    height: 480,
    width: '100%',
    position: 'relative',
    marginTop: 20,
    overflow: 'hidden',
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 41, 58, 0.5)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  activeCard: {
    borderColor: 'rgba(34, 197, 94, 0.25)',
    backgroundColor: 'rgba(37, 41, 58, 0.8)',
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: -0.2,
  },
  lockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F3445',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#475569',
  },
  activePulseWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  activeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          borderRadius: 999,
        },
        buttonText: {
          color: '#FFFFFF',
          fontSize: 17,
          lineHeight: 22,
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
