import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  SvgXml,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { MOCHI_VECTOR_TRACE_XML } from './mochiVectorTraceAssets';
import {
  MOCHI_POSE_CATALOG,
  MOCHI_VECTOR_LAYERS as VECTOR_LAYERS,
  type MochiExpressionKey,
  type MochiPoseAccessory,
  type MochiPoseKey,
  type MochiPoseMeta,
  type MochiRendererMode,
} from './mochiPoseCatalog';

export type MochiRigExpression =
  | MochiExpressionKey
  | 'wave'
  | 'pointing'
  | 'success'
  | 'reminder';

type MochiRigProps = {
  expression: MochiRigExpression;
  size: number;
  pose?: MochiPoseKey;
  rendererMode?: MochiRendererMode;
  animated?: boolean;
  activeAccessoryIds?: readonly string[];
  hasReminder?: boolean;
  testID?: string;
};

type ArmPose = {
  left: string;
  right: string;
  leftHand?: HandPose;
  rightHand?: HandPose;
};

type HandPose = 'open' | 'thumb' | 'hold' | 'write' | 'point' | 'fist';

type FaceExpression = MochiExpressionKey | 'reminder';

export const MOCHI_VECTOR_LAYERS = VECTOR_LAYERS;

const INK = '#2B160B';
const FUR = '#C98440';
const FUR_DARK = '#6B3514';
const FUR_LIGHT = '#D99A55';
const MUZZLE = '#C9823F';
const MUZZLE_LIGHT = '#E0A15A';
const WHITE = '#FFF8EC';
const PINK = '#F06F93';
const PINK_DARK = '#B73560';
const GREEN = '#50D86A';
const GOLD = '#F5B936';
const WATER = '#58C7F7';
const RED = '#E4535D';

const EXPRESSION_TO_POSE: Record<MochiRigExpression, MochiPoseKey> = {
  idle: 'idle',
  happy: 'happy',
  excited: 'excited',
  thinking: 'thinking',
  surprised: 'surprised',
  sleepy: 'sleepy',
  focused: 'notebook',
  eating: 'breakfastLog',
  drinkWater: 'drinkWater',
  celebrate: 'goalComplete',
  wave: 'hello',
  pointing: 'scanFood',
  success: 'goalComplete',
  reminder: 'reminder',
};

const hasAccessory = (
  activeAccessoryIds: readonly string[] | undefined,
  accessoryId: string,
): boolean => Boolean(activeAccessoryIds?.includes(accessoryId));

const getPoseMeta = (
  expression: MochiRigExpression,
  pose?: MochiPoseKey,
): MochiPoseMeta => MOCHI_POSE_CATALOG[pose ?? EXPRESSION_TO_POSE[expression]];

const getFaceExpression = (
  expression: MochiRigExpression,
  poseMeta: MochiPoseMeta,
  hasReminder: boolean,
): FaceExpression => {
  if (hasReminder || expression === 'reminder') return 'reminder';
  if (expression === 'wave') return 'happy';
  if (expression === 'pointing') return 'focused';
  if (expression === 'success') return 'celebrate';
  return poseMeta.expression;
};

const getPupilOffset = (expression: FaceExpression): number => {
  if (expression === 'thinking') return 8;
  if (expression === 'focused') return -4;
  if (expression === 'surprised' || expression === 'reminder') return 2;
  if (expression === 'sleepy') return -2;
  return 0;
};

const getArmPose = (pose: MochiPoseKey): ArmPose => {
  switch (pose) {
    case 'hello':
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 126 C187 104 190 78 176 57',
        rightHand: 'open',
      };
    case 'happy':
      return {
        left: 'M75 134 C64 123 62 106 73 97',
        right: 'M165 134 C176 123 178 106 167 97',
        leftHand: 'thumb',
        rightHand: 'thumb',
      };
    case 'excited':
    case 'goalComplete':
      return {
        left: 'M74 126 C54 98 52 73 67 55',
        right: 'M166 126 C186 98 188 73 173 55',
        leftHand: 'open',
        rightHand: 'open',
      };
    case 'thinking':
      return {
        left: 'M75 133 C62 128 58 116 68 106',
        right: 'M166 132 C182 144 189 163 185 181',
        leftHand: 'fist',
      };
    case 'surprised':
      return {
        left: 'M75 130 C61 115 58 98 66 87',
        right: 'M165 130 C179 115 182 98 174 87',
        leftHand: 'fist',
        rightHand: 'fist',
      };
    case 'sleepy':
      return {
        left: 'M75 132 C62 121 59 103 68 92',
        right: 'M166 133 C181 145 188 164 184 182',
        leftHand: 'fist',
      };
    case 'notebook':
    case 'logCalorieNote':
      return {
        left: 'M74 135 C58 139 50 153 54 168',
        right: 'M166 135 C180 137 188 150 185 166',
        leftHand: 'hold',
        rightHand: pose === 'logCalorieNote' ? 'write' : 'hold',
      };
    case 'holdPhone':
    case 'openApp':
    case 'showCalorie':
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 134 C178 131 188 122 195 108',
        rightHand: 'hold',
      };
    case 'scanFood':
    case 'analyzeResult':
      return {
        left: 'M74 134 C59 143 52 161 56 178',
        right: 'M166 132 C188 127 202 113 208 99',
        rightHand: 'point',
      };
    case 'breakfastLog':
      return {
        left: 'M74 134 C58 143 51 162 55 180',
        right: 'M166 133 C181 132 191 121 199 111',
        rightHand: 'hold',
      };
    case 'lunchLog':
      return {
        left: 'M74 133 C58 143 52 162 55 181',
        right: 'M166 134 C179 137 187 150 184 166',
        rightHand: 'write',
      };
    case 'dinnerLog':
      return {
        left: 'M74 133 C59 142 52 161 56 179',
        right: 'M166 134 C181 137 188 152 184 170',
        leftHand: 'hold',
        rightHand: 'hold',
      };
    case 'drinkWater':
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 132 C180 125 190 119 199 111',
        rightHand: 'hold',
      };
    case 'healthyFood':
    case 'smartChoice':
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 131 C181 119 187 103 184 88',
        rightHand: 'thumb',
      };
    case 'reminder':
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 130 C186 115 191 96 185 78',
        rightHand: 'point',
      };
    case 'exercise':
      return {
        left: 'M76 128 C58 112 53 93 61 76',
        right: 'M164 128 C182 112 187 93 179 76',
        leftHand: 'fist',
        rightHand: 'fist',
      };
    case 'streakTracking':
      return {
        left: 'M74 132 C62 135 57 146 61 160',
        right: 'M166 133 C181 143 188 161 184 180',
        leftHand: 'point',
      };
    case 'idle':
    default:
      return {
        left: 'M74 132 C58 144 51 163 55 181',
        right: 'M166 132 C182 144 189 163 185 181',
      };
  }
};

const renderArm = (path: string): React.ReactElement => (
  <G>
    <Path
      d={path}
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={23}
    />
    <Path
      d={path}
      fill="none"
      stroke={FUR}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={17}
    />
    <Path
      d={path}
      fill="none"
      stroke="#F0B46F"
      strokeLinecap="round"
      strokeWidth={5}
      opacity={0.28}
    />
  </G>
);

const renderHand = (
  x: number,
  y: number,
  kind: ArmPose['leftHand'] | ArmPose['rightHand'],
  flip = false,
): React.ReactElement | null => {
  if (!kind) return null;

  const sign = flip ? -1 : 1;
  const thumbPath =
    kind === 'thumb'
      ? `M${x + sign * 2} ${y - 2} C${x + sign * 4} ${y - 15} ${x + sign * 15} ${y - 18} ${x + sign * 18} ${y - 7}`
      : '';
  const pointPath =
    kind === 'point'
      ? `M${x} ${y} C${x + sign * 12} ${y - 8} ${x + sign * 18} ${y - 17} ${x + sign * 22} ${y - 28}`
      : '';

  return (
    <G>
      <Circle cx={x} cy={y} r={9} fill={FUR} stroke={INK} strokeWidth={4} />
      {kind === 'open' && (
        <G stroke={INK} strokeLinecap="round" strokeWidth={3}>
          <Path d={`M${x - sign * 8} ${y - 4} L${x - sign * 15} ${y - 12}`} />
          <Path d={`M${x} ${y - 7} L${x} ${y - 18}`} />
          <Path d={`M${x + sign * 8} ${y - 4} L${x + sign * 14} ${y - 13}`} />
        </G>
      )}
      {kind === 'thumb' && (
        <Path
          d={thumbPath}
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={6}
        />
      )}
      {kind === 'point' && (
        <Path
          d={pointPath}
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeWidth={5}
        />
      )}
      {kind === 'write' && (
        <Path
          d={`M${x - 4} ${y - 2} L${x + 14} ${y - 19}`}
          stroke="#3A6E32"
          strokeLinecap="round"
          strokeWidth={5}
        />
      )}
    </G>
  );
};

const renderFurTexture = (): React.ReactElement => (
  <G opacity={0.18}>
    <Path d="M83 112 C77 125 76 138 81 149" stroke={FUR_DARK} strokeLinecap="round" strokeWidth={2} />
    <Path d="M157 112 C163 125 164 138 159 149" stroke={FUR_DARK} strokeLinecap="round" strokeWidth={2} />
    <Path d="M93 181 C105 187 135 187 147 180" stroke={FUR_DARK} strokeLinecap="round" strokeWidth={2} />
    <Path d="M94 58 C102 53 112 52 120 56" stroke="#F6BC7A" strokeLinecap="round" strokeWidth={2} />
    <Circle cx={80} cy={156} r={1.7} fill={FUR_DARK} />
    <Circle cx={164} cy={162} r={1.5} fill={FUR_DARK} />
    <Circle cx={142} cy={196} r={1.4} fill={FUR_DARK} />
    <Circle cx={101} cy={194} r={1.3} fill={FUR_DARK} />
  </G>
);

const renderEyes = (
  expression: FaceExpression,
  pupilOffset: number,
): React.ReactElement => {
  if (expression === 'sleepy' || expression === 'drinkWater') {
    return (
      <G>
        <Path d="M83 88 C90 94 100 94 107 88" fill="none" stroke={INK} strokeLinecap="round" strokeWidth={5} />
        <Path d="M133 88 C140 94 150 94 157 88" fill="none" stroke={INK} strokeLinecap="round" strokeWidth={5} />
      </G>
    );
  }

  const eyeRx = expression === 'surprised' || expression === 'reminder' ? 18 : 17;
  const eyeRy = expression === 'surprised' || expression === 'reminder' ? 22 : 21;
  const pupilR = expression === 'surprised' || expression === 'reminder' ? 6.7 : 5.8;

  return (
    <G>
      <Ellipse cx={96} cy={88} rx={eyeRx} ry={eyeRy} fill={WHITE} stroke={INK} strokeWidth={3.6} />
      <Ellipse cx={144} cy={88} rx={eyeRx} ry={eyeRy} fill={WHITE} stroke={INK} strokeWidth={3.6} />
      <Circle cx={96 + pupilOffset} cy={89} r={pupilR} fill={INK} />
      <Circle cx={144 + pupilOffset} cy={89} r={pupilR} fill={INK} />
      <Circle cx={93 + pupilOffset} cy={85} r={2} fill={WHITE} />
      <Circle cx={141 + pupilOffset} cy={85} r={2} fill={WHITE} />
    </G>
  );
};

const renderMouth = (expression: FaceExpression): React.ReactElement => {
  if (expression === 'drinkWater') {
    return (
      <Path
        d="M113 128 C118 132 124 132 129 128"
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeWidth={4.2}
      />
    );
  }

  if (expression === 'surprised' || expression === 'reminder') {
    return (
      <G>
        <Ellipse cx={120} cy={128} rx={9} ry={13} fill={INK} />
        <Ellipse cx={117} cy={124} rx={2.8} ry={3.8} fill="#7A3F1F" opacity={0.65} />
      </G>
    );
  }

  if (expression === 'thinking' || expression === 'focused') {
    return (
      <Path
        d="M108 130 C114 135 124 135 131 128"
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeWidth={5}
      />
    );
  }

  if (expression === 'excited' || expression === 'celebrate') {
    return (
      <G>
        <Path d="M102 126 C109 146 131 146 138 126 Z" fill={INK} />
        <Path d="M110 137 C116 142 126 142 132 137" stroke="#F58A8A" strokeLinecap="round" strokeWidth={4} />
      </G>
    );
  }

  return (
    <Path
      d="M103 128 C111 141 129 141 137 128"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth={5}
    />
  );
};

const renderTeeth = (expression: FaceExpression): React.ReactElement | null => {
  if (expression === 'drinkWater' || expression === 'sleepy') return null;

  return (
    <G>
      <Rect x={112} y={135} width={7.5} height={16} rx={2.4} fill={WHITE} stroke={INK} strokeWidth={2.4} />
      <Rect x={121} y={135} width={7.5} height={16} rx={2.4} fill={WHITE} stroke={INK} strokeWidth={2.4} />
    </G>
  );
};

const renderDrinkWaterPose = (): React.ReactElement => (
  <G transform="translate(2 6) scale(1.34 1.48)">
    <Ellipse cx={82} cy={146} rx={62} ry={8} fill="url(#mochiShadow)" opacity={0.36} />

    <Path
      d="M18 143 C9 116 11 78 25 47 C38 18 62 4 91 8 C119 12 138 35 144 68 C151 104 133 138 101 151 C74 161 36 157 18 143 Z"
      fill="#D99A55"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={3.6}
    />
    <Path
      d="M13 143 C8 119 11 80 24 49 C29 78 28 116 22 143 Z"
      fill="#D08A46"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={3.1}
    />
    <Path
      d="M17 144 C16 151 20 155 29 156 L43 156 C40 150 32 147 24 147"
      fill={FUR_DARK}
      stroke={INK}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      opacity={0.56}
    />
    <Path
      d="M22 112 C48 126 96 126 123 109 C119 132 98 148 71 150 C47 151 29 137 22 112 Z"
      fill="#B66B2D"
      opacity={0.08}
    />

    <Circle cx={36} cy={20} r={8.4} fill={FUR_DARK} stroke={INK} strokeWidth={2.9} />
    <Circle cx={89} cy={15} r={8.7} fill={FUR_DARK} stroke={INK} strokeWidth={2.9} />
    <Circle cx={37} cy={21} r={4} fill={FUR_LIGHT} opacity={0.74} />
    <Circle cx={88} cy={17} r={4.1} fill={FUR_LIGHT} opacity={0.74} />

    <Path
      d="M12 42 C42 22 84 18 124 31"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth={12.8}
    />
    <Path
      d="M12 42 C42 22 84 18 124 31"
      fill="none"
      stroke="url(#mochiHeadbandPink)"
      strokeLinecap="round"
      strokeWidth={8.7}
    />
    <Path
      d="M16 37 C45 22 83 19 121 29"
      fill="none"
      stroke={WHITE}
      strokeLinecap="round"
      strokeWidth={2.2}
    />
    <Path
      d="M16 45 C45 31 82 28 121 36"
      fill="none"
      stroke={WHITE}
      strokeLinecap="round"
      strokeWidth={2.2}
    />

    <Path
      d="M51 61 C60 68 73 67 82 58"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth={3.8}
    />
    <Path
      d="M94 60 C106 52 122 57 128 72 C133 85 126 99 112 104 C101 100 93 88 91 75 C90 68 91 63 94 60 Z"
      fill="#B8793E"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={3}
    />
    <Path
      d="M96 62 C102 67 102 87 96 96"
      fill="none"
      stroke="#8D542B"
      strokeLinecap="round"
      strokeWidth={2.4}
      opacity={0.72}
    />
    <Ellipse cx={102} cy={71} rx={5.8} ry={4.1} fill={INK} />
    <Path
      d="M103 77 C103 85 101 91 97 96"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth={2.6}
    />
    <Path
      d="M98 96 C103 102 113 102 118 96"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth={2.8}
    />

    <G opacity={0.1}>
      <Path d="M30 78 C40 84 55 84 66 77" stroke={FUR_DARK} strokeLinecap="round" strokeWidth={1.5} />
      <Path d="M29 115 C50 124 88 123 110 111" stroke={FUR_DARK} strokeLinecap="round" strokeWidth={1.5} />
    </G>

    <Path
      d="M113 88 C128 78 148 83 158 99 C146 107 127 104 115 95 Z"
      fill="#D08A46"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={3}
    />
    <G transform="translate(108 81) rotate(2)">
      <Rect x={-8} y={-9} width={17} height={18} rx={5} fill={WHITE} stroke={INK} strokeWidth={2.6} />
      <Rect x={6} y={-14} width={72} height={29} rx={9} fill={INK} />
      <Rect x={10} y={-10} width={63} height={21} rx={7} fill="url(#mochiWaterBottle)" />
      <Ellipse cx={75} cy={0.5} rx={7.3} ry={13.8} fill="#BDEFFF" stroke={INK} strokeWidth={2.6} />
      <Path d="M19 -2 C31 5 43 -5 58 1" stroke={WHITE} strokeLinecap="round" strokeWidth={2.8} opacity={0.85} />
      <Path d="M62 -8 V9" stroke="#1686B8" strokeLinecap="round" strokeWidth={2} opacity={0.62} />
    </G>
    <G fill={FUR_LIGHT} stroke={INK} strokeWidth={2.3}>
      <Circle cx={129} cy={96} r={4.1} />
      <Circle cx={139} cy={94} r={4.1} />
      <Circle cx={149} cy={96} r={4.1} />
    </G>
  </G>
);

const renderBody = (
  poseMeta: MochiPoseMeta,
  faceExpression: FaceExpression,
): React.ReactElement => {
  const lean = poseMeta.bodyLean ?? 0;

  return (
    <G transform={`rotate(${lean} 120 132)`}>
      <Path
        d="M120 45 C86 45 61 73 57 120 C52 177 79 212 120 216 C161 212 188 177 183 120 C179 73 154 45 120 45 Z"
        fill="url(#mochiBodyFur)"
        stroke={INK}
        strokeLinejoin="round"
        strokeWidth={5}
      />
      <Path
        d="M82 150 C88 189 103 207 120 210 C137 207 152 189 158 150 C147 162 94 162 82 150 Z"
        fill="#E0A15A"
        opacity={0.16}
      />
      {renderFurTexture()}

      <Circle cx={82} cy={45} r={13} fill={FUR_DARK} stroke={INK} strokeWidth={4} />
      <Circle cx={158} cy={45} r={13} fill={FUR_DARK} stroke={INK} strokeWidth={4} />
      <Circle cx={83} cy={48} r={6} fill={FUR_LIGHT} opacity={0.72} />
      <Circle cx={157} cy={48} r={6} fill={FUR_LIGHT} opacity={0.72} />

      <Path
        d="M62 65 C80 53 101 49 121 51 C141 49 160 53 178 65"
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeWidth={19}
      />
      <Path
        d="M62 65 C80 53 101 49 121 51 C141 49 160 53 178 65"
        fill="none"
        stroke="url(#mochiHeadbandPink)"
        strokeLinecap="round"
        strokeWidth={13}
      />
      <Path
        d="M65 58 C84 48 103 44 121 46 C140 44 159 48 176 58"
        fill="none"
        stroke={WHITE}
        strokeLinecap="round"
        strokeWidth={4}
      />
      <Path
        d="M65 72 C84 62 103 59 121 60 C140 59 159 62 176 72"
        fill="none"
        stroke={WHITE}
        strokeLinecap="round"
        strokeWidth={4}
        opacity={0.95}
      />

      <Ellipse cx={120} cy={119} rx={26} ry={19} fill={MUZZLE} stroke={INK} strokeWidth={3.8} />
      <Ellipse cx={111} cy={113} rx={7} ry={9} fill={MUZZLE_LIGHT} opacity={0.36} />
      <Ellipse cx={120} cy={109} rx={8} ry={6} fill="url(#mochiInk)" />
      <Path d="M120 116 C119 120 119 123 120 126" stroke={INK} strokeLinecap="round" strokeWidth={3.1} />

      {renderEyes(faceExpression, getPupilOffset(faceExpression))}
      {renderMouth(faceExpression)}
      {renderTeeth(faceExpression)}

      <Path d="M91 215 C98 226 111 227 116 216" fill={FUR_DARK} stroke={INK} strokeWidth={3} opacity={0.42} />
      <Path d="M149 215 C142 226 129 227 124 216" fill={FUR_DARK} stroke={INK} strokeWidth={3} opacity={0.42} />
    </G>
  );
};

const renderPhone = (
  x: number,
  y: number,
  label?: string,
  chart = false,
): React.ReactElement => (
  <G transform={`translate(${x} ${y}) rotate(-8)`}>
    <Rect x={-17} y={-32} width={34} height={64} rx={8} fill={INK} />
    <Rect x={-13} y={-27} width={26} height={54} rx={6} fill="#E7F4ED" />
    {chart ? (
      <G>
        <Rect x={-7} y={2} width={5} height={12} rx={2} fill={GREEN} />
        <Rect x={1} y={-8} width={5} height={22} rx={2} fill={GOLD} />
        <Rect x={9} y={-16} width={5} height={30} rx={2} fill="#60A5FA" />
      </G>
    ) : (
      <G>
        <Circle cx={0} cy={-4} r={11} fill="#F8C95B" stroke="#75A843" strokeWidth={2} />
        <Path d="M-6 -2 C-1 -11 6 -10 8 -3 C4 6 -4 8 -6 -2 Z" fill="#F97316" />
        <Path d="M-2 -14 C3 -17 7 -17 10 -14" stroke={GREEN} strokeLinecap="round" strokeWidth={2.4} />
      </G>
    )}
    {label && (
      <SvgText
        x={0}
        y={19}
        fill="#2E7D32"
        fontSize={9}
        fontWeight="800"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    )}
  </G>
);

const renderNotebook = (): React.ReactElement => (
  <G transform="translate(75 158) rotate(-4)">
    <Rect x={-34} y={-32} width={68} height={58} rx={7} fill={WHITE} stroke={INK} strokeWidth={4} />
    <Path d="M-22 -22 H22 M-22 -9 H22 M-22 4 H12" stroke="#B9AA92" strokeLinecap="round" strokeWidth={2.5} />
    <Path d="M-27 -40 V-28 M-13 -40 V-28 M1 -40 V-28 M15 -40 V-28 M29 -40 V-28" stroke={INK} strokeLinecap="round" strokeWidth={4} />
  </G>
);

const renderPen = (): React.ReactElement => (
  <G transform="translate(106 151) rotate(32)">
    <Rect x={-4} y={-30} width={8} height={48} rx={4} fill="#64B96A" stroke={INK} strokeWidth={2.5} />
    <Path d="M-4 19 L0 31 L4 19" fill="#E8C68A" stroke={INK} strokeWidth={2.2} />
  </G>
);

const renderFoodPlate = (
  x: number,
  y: number,
  variant: 'scan' | 'lunch' | 'dinner' | 'healthy' | 'smart',
): React.ReactElement => (
  <G transform={`translate(${x} ${y})`}>
    <Ellipse cx={0} cy={22} rx={46} ry={12} fill="#D8C7A7" opacity={0.48} />
    <Ellipse cx={0} cy={12} rx={43} ry={17} fill={WHITE} stroke={INK} strokeWidth={3.5} />
    <Ellipse cx={0} cy={10} rx={31} ry={10} fill="#F7ECD7" />
    {(variant === 'scan' || variant === 'healthy') && (
      <G>
        <Circle cx={-23} cy={6} r={10} fill="#EF4444" stroke={INK} strokeWidth={2} />
        <Path d="M-25 -5 C-21 -10 -16 -10 -12 -6" stroke={GREEN} strokeLinecap="round" strokeWidth={3} />
        <Path d="M-5 16 C-1 -4 17 -4 22 16 Z" fill="#FACC15" stroke={INK} strokeWidth={2} />
        <Path d="M11 16 C14 2 29 1 35 14" fill="#A3E635" stroke={INK} strokeWidth={2} />
      </G>
    )}
    {(variant === 'lunch' || variant === 'dinner') && (
      <G>
        <Ellipse cx={-12} cy={8} rx={19} ry={10} fill="#F9D7A5" stroke={INK} strokeWidth={2.2} />
        <Path d="M-27 7 C-18 4 -7 4 2 8" stroke="#A16207" strokeLinecap="round" strokeWidth={3} />
        <Circle cx={20} cy={7} r={9} fill="#86C45A" stroke={INK} strokeWidth={2} />
        <Circle cx={29} cy={12} r={6} fill="#F97316" stroke={INK} strokeWidth={2} />
      </G>
    )}
    {variant === 'smart' && (
      <G>
        <Rect x={-30} y={-6} width={28} height={18} rx={5} fill="#E8A740" stroke={INK} strokeWidth={2.2} />
        <Path d="M-31 0 H-1" stroke="#7A3F1F" strokeWidth={3} />
        <Rect x={5} y={-10} width={7} height={28} rx={2} fill="#FACC15" stroke={INK} strokeWidth={1.5} />
        <Rect x={16} y={-8} width={7} height={26} rx={2} fill="#FACC15" stroke={INK} strokeWidth={1.5} />
        <Circle cx={33} cy={1} r={8} fill="#EF4444" stroke={INK} strokeWidth={2} />
      </G>
    )}
  </G>
);

const renderBreakfast = (): React.ReactElement => (
  <G transform="translate(151 168)">
    <Ellipse cx={0} cy={20} rx={33} ry={8} fill="#D8C7A7" opacity={0.45} />
    <Path d="M-31 0 H31 C28 24 -28 24 -31 0 Z" fill="#F7ECD7" stroke={INK} strokeWidth={3.5} />
    <Ellipse cx={0} cy={0} rx={32} ry={12} fill={WHITE} stroke={INK} strokeWidth={3} />
    <Circle cx={-11} cy={-3} r={7} fill="#EF4444" stroke={INK} strokeWidth={1.8} />
    <Circle cx={4} cy={-5} r={7} fill="#FDE68A" stroke={INK} strokeWidth={1.8} />
    <Circle cx={17} cy={-1} r={6} fill="#93C5FD" stroke={INK} strokeWidth={1.8} />
    <G transform="translate(43 -8)">
      <Rect x={-8} y={-18} width={16} height={31} rx={4} fill="#FDFBF5" stroke={INK} strokeWidth={2.5} />
      <Path d="M-5 -4 H5" stroke="#93C5FD" strokeLinecap="round" strokeWidth={3} />
    </G>
  </G>
);

const renderWaterBottle = (isSipping: boolean): React.ReactElement => {
  if (isSipping) {
    return (
      <G transform="translate(151 113) rotate(-8)">
        <Rect x={-6} y={-12} width={62} height={25} rx={9} fill={INK} />
        <Rect x={-2} y={-9} width={55} height={19} rx={8} fill="url(#mochiWaterBottle)" />
        <Rect x={-19} y={-8} width={17} height={16} rx={5} fill={WHITE} stroke={INK} strokeWidth={3} />
        <Path d="M11 2 C19 7 30 -3 41 3" stroke={WHITE} strokeLinecap="round" strokeWidth={3} opacity={0.82} />
      </G>
    );
  }

  return (
    <G transform="translate(190 130) rotate(-16)">
      <Rect x={-13} y={-31} width={26} height={55} rx={8} fill={INK} />
      <Rect x={-10} y={-28} width={20} height={49} rx={7} fill="url(#mochiWaterBottle)" />
      <Rect x={-7} y={-39} width={14} height={12} rx={4} fill={WHITE} stroke={INK} strokeWidth={3} />
      <Path d="M-5 -10 C0 -6 6 -11 10 -3" stroke={WHITE} strokeLinecap="round" strokeWidth={3} opacity={0.82} />
    </G>
  );
};

const renderTrophy = (x = 53, y = 139): React.ReactElement => (
  <G transform={`translate(${x} ${y})`}>
    <Path
      d="M-15 -23 H15 V-4 C15 9 8 17 0 17 C-8 17 -15 9 -15 -4 Z"
      fill="url(#mochiGold)"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={4}
    />
    <Path d="M-16 -15 C-30 -14 -29 3 -16 4 M16 -15 C30 -14 29 3 16 4" fill="none" stroke={INK} strokeWidth={4} />
    <Rect x={-8} y={17} width={16} height={13} rx={3} fill={FUR_DARK} stroke={INK} strokeWidth={3} />
    <Rect x={-20} y={29} width={40} height={9} rx={4} fill="#8F5C26" stroke={INK} strokeWidth={3} />
  </G>
);

const renderAnalysisCard = (): React.ReactElement => (
  <G transform="translate(193 68)">
    <Rect x={-22} y={-31} width={44} height={54} rx={6} fill="#EAF7DF" stroke={INK} strokeWidth={3} />
    <Rect x={-12} y={0} width={6} height={15} rx={2} fill={GREEN} />
    <Rect x={-2} y={-11} width={6} height={26} rx={2} fill="#60A5FA" />
    <Rect x={8} y={-20} width={6} height={35} rx={2} fill={GOLD} />
    <Circle cx={-9} cy={-19} r={6} fill="#EF4444" />
    <Path d="M-17 20 H16" stroke="#A7C796" strokeLinecap="round" strokeWidth={2} />
  </G>
);

const renderCaloriePhone = (): React.ReactElement => renderPhone(178, 139, '520', false);

const renderBellBubble = (): React.ReactElement => (
  <G transform="translate(195 55)">
    <Circle r={18} fill={WHITE} stroke={INK} strokeWidth={4} />
    <Path d="M187 57 C187 49 191 44 195 44 C199 44 203 49 203 57" fill={GOLD} stroke={INK} strokeWidth={3} />
    <Path d="M184 58 H206" stroke={INK} strokeLinecap="round" strokeWidth={3} />
    <Circle cx={195} cy={64} r={3} fill={INK} />
  </G>
);

const renderStreakBoard = (): React.ReactElement => (
  <G transform="translate(166 154) rotate(-8)">
    <Rect x={-35} y={-56} width={70} height={86} rx={6} fill="#F8F0DF" stroke={INK} strokeWidth={4} />
    <Path d="M-20 -64 V-51 M0 -64 V-51 M20 -64 V-51" stroke={INK} strokeLinecap="round" strokeWidth={4} />
    <SvgText x={0} y={-27} fill={INK} fontSize={13} fontWeight="900" textAnchor="middle">
      STREAK
    </SvgText>
    <SvgText x={0} y={0} fill={RED} fontSize={26} fontWeight="900" textAnchor="middle">
      30
    </SvgText>
    <SvgText x={0} y={18} fill={INK} fontSize={13} fontWeight="900" textAnchor="middle">
      NGÀY
    </SvgText>
    <Path d="M-9 31 L-1 39 L14 23" fill="none" stroke={GREEN} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} />
  </G>
);

const renderDumbbells = (): React.ReactElement => (
  <G>
    <G transform="translate(62 79) rotate(-18)">
      <Rect x={-24} y={-6} width={48} height={12} rx={5} fill="#F4A3B7" stroke={INK} strokeWidth={3} />
      <Rect x={-34} y={-12} width={12} height={24} rx={5} fill={PINK} stroke={INK} strokeWidth={3} />
      <Rect x={22} y={-12} width={12} height={24} rx={5} fill={PINK} stroke={INK} strokeWidth={3} />
    </G>
    <G transform="translate(178 79) rotate(18)">
      <Rect x={-24} y={-6} width={48} height={12} rx={5} fill="#F4A3B7" stroke={INK} strokeWidth={3} />
      <Rect x={-34} y={-12} width={12} height={24} rx={5} fill={PINK} stroke={INK} strokeWidth={3} />
      <Rect x={22} y={-12} width={12} height={24} rx={5} fill={PINK} stroke={INK} strokeWidth={3} />
    </G>
  </G>
);

const renderScanFrame = (): React.ReactElement => (
  <G stroke={GREEN} strokeLinecap="round" strokeWidth={3.5} opacity={0.86}>
    <Path d="M169 128 H184 V143" />
    <Path d="M217 128 H202 V143" />
    <Path d="M169 187 H184 V172" />
    <Path d="M217 187 H202 V172" />
  </G>
);

const renderConfetti = (): React.ReactElement => (
  <G>
    <Circle cx={47} cy={58} r={4} fill={GREEN} />
    <Circle cx={198} cy={86} r={4} fill={GOLD} />
    <Rect x={197} y={111} width={8} height={8} rx={2} fill={PINK} />
    <Rect x={39} y={104} width={8} height={8} rx={2} fill="#7DD3FC" />
    <Path d="M45 91 L55 84 M188 51 L198 44" stroke={WHITE} strokeLinecap="round" strokeWidth={3} />
    <Path d="M32 74 L38 70 M205 121 L214 116" stroke={RED} strokeLinecap="round" strokeWidth={3} />
  </G>
);

const renderAccessory = (
  accessoryId: MochiPoseAccessory,
  isDrinking: boolean,
): React.ReactElement | null => {
  switch (accessoryId) {
    case 'notebook':
      return renderNotebook();
    case 'pen':
      return renderPen();
    case 'phone':
      return renderPhone(184, 142);
    case 'appPhone':
      return renderPhone(178, 139, undefined, false);
    case 'caloriePhone':
      return renderCaloriePhone();
    case 'scanFrame':
      return renderScanFrame();
    case 'foodPlate':
      return renderFoodPlate(193, 173, 'scan');
    case 'analysisCard':
      return renderAnalysisCard();
    case 'breakfastBowl':
      return renderBreakfast();
    case 'lunchPlate':
      return renderFoodPlate(118, 181, 'lunch');
    case 'dinnerPlate':
      return renderFoodPlate(120, 181, 'dinner');
    case 'waterBottle':
      return renderWaterBottle(isDrinking);
    case 'fruitBowl':
      return renderFoodPlate(76, 172, 'healthy');
    case 'smartChoicePlate':
      return renderFoodPlate(73, 172, 'smart');
    case 'bellBubble':
      return renderBellBubble();
    case 'dumbbells':
      return renderDumbbells();
    case 'streakBoard':
      return renderStreakBoard();
    case 'trophy':
      return renderTrophy(62, 148);
    case 'confetti':
      return renderConfetti();
    default:
      return null;
  }
};

const renderCompanionAccessories = (
  activeAccessoryIds: readonly string[] | undefined,
): React.ReactElement | null => {
  const showBottle = hasAccessory(activeAccessoryIds, 'water_bottle');
  const showTrophy = hasAccessory(activeAccessoryIds, 'trophy');
  const showMedal = hasAccessory(activeAccessoryIds, 'medal');
  const showStreakBadge = hasAccessory(activeAccessoryIds, 'streak_badge');

  if (!showBottle && !showTrophy && !showMedal && !showStreakBadge) {
    return null;
  }

  return (
    <G>
      {showStreakBadge && (
        <G transform="translate(86 164)">
          <Circle r={17} fill={GREEN} stroke={INK} strokeWidth={4} />
          <Path d="M-8 0 L-2 7 L9 -8" fill="none" stroke={WHITE} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
        </G>
      )}
      {showMedal && (
        <G transform="translate(137 169)">
          <Path d="M-14 -31 L0 -8 L14 -31" fill="none" stroke={PINK} strokeLinecap="round" strokeWidth={7} />
          <Circle r={16} fill="url(#mochiGold)" stroke={INK} strokeWidth={4} />
          <Path d="M0 -8 L4 1 L13 2 L6 8 L8 17 L0 12 L-8 17 L-6 8 L-13 2 L-4 1 Z" fill="#FFF2A0" />
        </G>
      )}
      {showBottle && renderWaterBottle(false)}
      {showTrophy && renderTrophy()}
    </G>
  );
};

const MochiRig = ({
  expression,
  size,
  pose,
  rendererMode = 'vector',
  animated = true,
  activeAccessoryIds,
  hasReminder = false,
  testID,
}: MochiRigProps): React.ReactElement => {
  const poseMeta = getPoseMeta(expression, pose);
  const faceExpression = getFaceExpression(expression, poseMeta, hasReminder);
  const armPose = getArmPose(poseMeta.key);
  const isDrinking = poseMeta.key === 'drinkWater' || expression === 'drinkWater';
  const tracedXml = MOCHI_VECTOR_TRACE_XML[poseMeta.key];
  const canRenderTrace = false;
  const shouldAnimate = animated && rendererMode !== 'pngFallback';
  const lift = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(lift);
    cancelAnimation(rotate);
    cancelAnimation(scale);
    cancelAnimation(opacity);

    lift.value = 0;
    rotate.value = 0;
    scale.value = 1;
    opacity.value = 1;

    if (!shouldAnimate) {
      return;
    }

    if (poseMeta.animationPreset === 'wave' || poseMeta.animationPreset === 'reminder') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 180, easing: Easing.out(Easing.ease) }),
          withTiming(4, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (poseMeta.animationPreset === 'celebrate' || poseMeta.animationPreset === 'goal') {
      lift.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 220, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 180, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 260, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (poseMeta.animationPreset === 'thinking' || poseMeta.animationPreset === 'analysis') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-2.2, { duration: 820, easing: Easing.inOut(Easing.ease) }),
          withTiming(2.2, { duration: 820, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (poseMeta.animationPreset === 'scan' || poseMeta.animationPreset === 'phone') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.025, { duration: 640, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 640, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (poseMeta.animationPreset === 'sleepy') {
      lift.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.88, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (poseMeta.animationPreset === 'drink' || poseMeta.animationPreset === 'mealLog') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-1.6, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.6, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      lift.value = withRepeat(
        withSequence(
          withTiming(-3.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [expression, lift, opacity, poseMeta.animationPreset, rotate, scale, shouldAnimate]);

  const rigMotionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: lift.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={poseMeta.accessibilityLabel}
      style={[styles.root, { width: size, height: size }]}
    >
      <Animated.View style={[styles.rigMotion, rigMotionStyle]}>
        {canRenderTrace && tracedXml ? (
          <SvgXml xml={tracedXml} width="100%" height="100%" />
        ) : (
          <Svg width="100%" height="100%" viewBox="0 0 240 240">
            <Defs>
              <RadialGradient id="mochiBodyFur" cx="34%" cy="20%" rx="75%" ry="80%">
                <Stop offset="0" stopColor="#DD9952" />
                <Stop offset="0.44" stopColor={FUR} />
                <Stop offset="1" stopColor="#935020" />
              </RadialGradient>
              <LinearGradient id="mochiHeadbandPink" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFF3F7" />
                <Stop offset="0.28" stopColor={PINK} />
                <Stop offset="1" stopColor={PINK_DARK} />
              </LinearGradient>
              <LinearGradient id="mochiGold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFF2A0" />
                <Stop offset="0.55" stopColor={GOLD} />
                <Stop offset="1" stopColor="#B87818" />
              </LinearGradient>
              <LinearGradient id="mochiWaterBottle" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#DFF7FF" />
                <Stop offset="0.5" stopColor={WATER} />
                <Stop offset="1" stopColor="#0C85BD" />
              </LinearGradient>
              <RadialGradient id="mochiShadow" cx="50%" cy="50%" rx="52%" ry="42%">
                <Stop offset="0" stopColor="#111827" stopOpacity={0.34} />
                <Stop offset="1" stopColor="#111827" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id="mochiInk" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={INK} />
                <Stop offset="1" stopColor="#4B2815" />
              </LinearGradient>
            </Defs>

            {poseMeta.key === 'drinkWater' ? (
              renderDrinkWaterPose()
            ) : (
              <>
                <Ellipse cx={120} cy={224} rx={59} ry={14} fill="url(#mochiShadow)" />
                {renderAccessoryLayers(poseMeta, isDrinking, 'behind')}

                {renderArm(armPose.left)}
                {renderArm(armPose.right)}
                {renderHand(60, 178, armPose.leftHand)}
                {renderHand(180, 178, armPose.rightHand, true)}

                {renderBody(poseMeta, faceExpression)}
                {renderAccessoryLayers(poseMeta, isDrinking, 'front')}
                {renderCompanionAccessories(activeAccessoryIds)}
                {hasReminder && !poseMeta.accessoryIds.includes('bellBubble') && renderBellBubble()}
              </>
            )}
          </Svg>
        )}
      </Animated.View>
    </View>
  );
};

const renderAccessoryLayers = (
  poseMeta: MochiPoseMeta,
  isDrinking: boolean,
  layer: 'behind' | 'front',
): React.ReactElement | null => {
  const behind = new Set<MochiPoseAccessory>(['dumbbells', 'confetti']);
  const elements = poseMeta.accessoryIds
    .filter((accessoryId) => (layer === 'behind' ? behind.has(accessoryId) : !behind.has(accessoryId)))
    .map((accessoryId) => (
      <G key={`${poseMeta.key}-${accessoryId}`}>
        {renderAccessory(accessoryId, isDrinking)}
      </G>
    ));

  return elements.length > 0 ? <G>{elements}</G> : null;
};

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
  rigMotion: {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
});

export default MochiRig;
