import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export type MochiRigExpression =
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'pointing'
  | 'success'
  | 'reminder'
  | 'surprised'
  | 'drinkWater'
  | 'celebrate';

type MochiRigProps = {
  expression: MochiRigExpression;
  size: number;
  activeAccessoryIds?: readonly string[];
  hasReminder?: boolean;
  testID?: string;
};

export const MOCHI_VECTOR_LAYERS = [
  'shadow',
  'arms',
  'body',
  'ears',
  'headband',
  'face',
  'expression',
  'accessories',
] as const;

const INK = '#2B160B';
const FUR = '#C47A37';
const FUR_DARK = '#713818';
const FUR_LIGHT = '#D9954A';
const MUZZLE = '#D08A43';
const MUZZLE_LIGHT = '#E7AA61';
const WHITE = '#FFF8EC';
const PINK = '#F06F93';
const PINK_DARK = '#B73560';
const GREEN = '#50D86A';
const GOLD = '#F5B936';
const WATER = '#58C7F7';

const hasAccessory = (
  activeAccessoryIds: readonly string[] | undefined,
  accessoryId: string,
): boolean => Boolean(activeAccessoryIds?.includes(accessoryId));

const getPupilOffset = (expression: MochiRigExpression): number => {
  if (expression === 'thinking') return 8;
  if (expression === 'pointing') return -6;
  if (expression === 'surprised' || expression === 'reminder') return 2;
  return 0;
};

const getLeftArmPath = (expression: MochiRigExpression): string => {
  if (expression === 'celebrate') return 'M74 126 C54 98 52 73 67 55';
  if (expression === 'thinking') return 'M75 133 C62 128 58 116 68 106';
  if (expression === 'wave') return 'M75 130 C60 116 53 98 57 81';
  return 'M74 132 C58 144 51 163 55 181';
};

const getRightArmPath = (expression: MochiRigExpression): string => {
  if (expression === 'wave' || expression === 'celebrate') {
    return 'M166 126 C186 98 188 73 173 55';
  }

  if (expression === 'pointing') {
    return 'M166 132 C188 127 202 113 208 99';
  }

  if (expression === 'drinkWater') return 'M166 132 C180 125 190 119 199 111';

  if (expression === 'reminder') return 'M166 130 C186 115 191 96 185 78';
  return 'M166 132 C182 144 189 163 185 181';
};

const getMouth = (expression: MochiRigExpression): React.ReactElement => {
  if (expression === 'drinkWater') {
    return (
      <Path
        d="M113 128 C118 132 124 132 129 128"
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeWidth="4.2"
      />
    );
  }

  if (expression === 'surprised' || expression === 'reminder') {
    return (
      <G>
        <Ellipse cx="120" cy="128" rx="9" ry="13" fill={INK} />
        <Ellipse cx="117" cy="124" rx="2.8" ry="3.8" fill="#7A3F1F" opacity="0.65" />
      </G>
    );
  }

  if (expression === 'thinking') {
    return (
      <Path
        d="M108 130 C114 135 124 135 131 128"
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeWidth="5"
      />
    );
  }

  return (
    <Path
      d="M103 128 C111 141 129 141 137 128"
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeWidth="5"
    />
  );
};

const renderEyes = (
  expression: MochiRigExpression,
  pupilOffset: number,
): React.ReactElement => {
  if (expression === 'drinkWater') {
    return (
      <G>
        <Path
          d="M83 88 C90 94 100 94 107 88"
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeWidth="5"
        />
        <Path
          d="M133 88 C140 94 150 94 157 88"
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeWidth="5"
        />
      </G>
    );
  }

  return (
    <G>
      <Ellipse cx="96" cy="88" rx="17" ry="21" fill={WHITE} stroke={INK} strokeWidth="3.6" />
      <Ellipse cx="144" cy="88" rx="17" ry="21" fill={WHITE} stroke={INK} strokeWidth="3.6" />
      <Circle cx={96 + pupilOffset} cy="89" r={expression === 'surprised' ? 6.6 : 5.8} fill={INK} />
      <Circle cx={144 + pupilOffset} cy="89" r={expression === 'surprised' ? 6.6 : 5.8} fill={INK} />
      <Circle cx={93 + pupilOffset} cy="85" r="2" fill={WHITE} />
      <Circle cx={141 + pupilOffset} cy="85" r="2" fill={WHITE} />
    </G>
  );
};

const renderArm = (path: string): React.ReactElement => (
  <G>
    <Path
      d={path}
      fill="none"
      stroke={INK}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="23"
    />
    <Path
      d={path}
      fill="none"
      stroke={FUR}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="17"
    />
    <Path
      d={path}
      fill="none"
      stroke="#F0B46F"
      strokeLinecap="round"
      strokeWidth="5"
      opacity="0.28"
    />
  </G>
);

const renderFurTexture = (): React.ReactElement => (
  <G opacity="0.18">
    <Path d="M83 112 C77 125 76 138 81 149" stroke={FUR_DARK} strokeLinecap="round" strokeWidth="2" />
    <Path d="M157 112 C163 125 164 138 159 149" stroke={FUR_DARK} strokeLinecap="round" strokeWidth="2" />
    <Path d="M93 181 C105 187 135 187 147 180" stroke={FUR_DARK} strokeLinecap="round" strokeWidth="2" />
    <Path d="M94 58 C102 53 112 52 120 56" stroke="#F6BC7A" strokeLinecap="round" strokeWidth="2" />
    <Circle cx="80" cy="156" r="1.7" fill={FUR_DARK} />
    <Circle cx="164" cy="162" r="1.5" fill={FUR_DARK} />
    <Circle cx="142" cy="196" r="1.4" fill={FUR_DARK} />
    <Circle cx="101" cy="194" r="1.3" fill={FUR_DARK} />
  </G>
);

const renderThought = (): React.ReactElement => (
  <G>
    <Circle cx="181" cy="51" r="7" fill={WHITE} stroke={INK} strokeWidth="3" />
    <Circle cx="198" cy="35" r="10" fill={WHITE} stroke={INK} strokeWidth="3" />
    <Circle cx="213" cy="22" r="5" fill={WHITE} stroke={INK} strokeWidth="2.5" />
  </G>
);

const renderAlert = (): React.ReactElement => (
  <G>
    <Circle cx="195" cy="54" r="18" fill={WHITE} stroke={INK} strokeWidth="4" />
    <Path d="M195 41 L195 56" stroke="#F97316" strokeLinecap="round" strokeWidth="6" />
    <Circle cx="195" cy="66" r="3.6" fill="#F97316" />
  </G>
);

const renderBottle = (isSipping: boolean): React.ReactElement => {
  if (isSipping) {
    return (
      <G transform="translate(151 113) rotate(-8)">
        <Rect x="-6" y="-12" width="62" height="25" rx="9" fill={INK} />
        <Rect x="-2" y="-9" width="55" height="19" rx="8" fill="url(#mochiWaterBottle)" />
        <Rect x="-19" y="-8" width="17" height="16" rx="5" fill={WHITE} stroke={INK} strokeWidth="3" />
        <Path d="M11 2 C19 7 30 -3 41 3" stroke={WHITE} strokeLinecap="round" strokeWidth="3" opacity="0.82" />
      </G>
    );
  }

  return (
    <G transform="translate(190 130) rotate(-16)">
      <Rect x="-13" y="-31" width="26" height="55" rx="8" fill={INK} />
      <Rect x="-10" y="-28" width="20" height="49" rx="7" fill="url(#mochiWaterBottle)" />
      <Rect x="-7" y="-39" width="14" height="12" rx="4" fill={WHITE} stroke={INK} strokeWidth="3" />
      <Path d="M-5 -10 C0 -6 6 -11 10 -3" stroke={WHITE} strokeLinecap="round" strokeWidth="3" opacity="0.82" />
    </G>
  );
};

const renderTrophy = (): React.ReactElement => (
  <G transform="translate(53 139)">
    <Path
      d="M-15 -23 H15 V-4 C15 9 8 17 0 17 C-8 17 -15 9 -15 -4 Z"
      fill="url(#mochiGold)"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth="4"
    />
    <Path d="M-16 -15 C-30 -14 -29 3 -16 4 M16 -15 C30 -14 29 3 16 4" fill="none" stroke={INK} strokeWidth="4" />
    <Rect x="-8" y="17" width="16" height="13" rx="3" fill={FUR_DARK} stroke={INK} strokeWidth="3" />
    <Rect x="-20" y="29" width="40" height="9" rx="4" fill="#8F5C26" stroke={INK} strokeWidth="3" />
  </G>
);

const MochiRig = ({
  expression,
  size,
  activeAccessoryIds,
  hasReminder = false,
  testID,
}: MochiRigProps): React.ReactElement => {
  const pupilOffset = getPupilOffset(expression);
  const isDrinking = expression === 'drinkWater';
  const showBottle =
    isDrinking || hasAccessory(activeAccessoryIds, 'water_bottle');
  const showTrophy =
    expression === 'celebrate' || hasAccessory(activeAccessoryIds, 'trophy');
  const showMedal = hasAccessory(activeAccessoryIds, 'medal');
  const showStreakBadge = hasAccessory(activeAccessoryIds, 'streak_badge');
  const showAlert = hasReminder || expression === 'reminder';
  const isCelebrating = expression === 'celebrate' || expression === 'success';

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="Mochi"
      style={[styles.root, { width: size, height: size }]}
    >
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
            <Stop offset="0" stopColor="#111827" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#111827" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="mochiInk" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={INK} />
            <Stop offset="1" stopColor="#4B2815" />
          </LinearGradient>
        </Defs>

        <Ellipse cx="120" cy="224" rx="59" ry="14" fill="url(#mochiShadow)" />

        {renderArm(getLeftArmPath(expression))}
        {renderArm(getRightArmPath(expression))}

        <Path
          d="M120 45 C86 45 61 73 57 120 C52 177 79 212 120 216 C161 212 188 177 183 120 C179 73 154 45 120 45 Z"
          fill="url(#mochiBodyFur)"
          stroke={INK}
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <Path
          d="M82 150 C88 189 103 207 120 210 C137 207 152 189 158 150 C147 162 94 162 82 150 Z"
          fill="#E0A15A"
          opacity="0.16"
        />
        {renderFurTexture()}

        <Circle cx="82" cy="45" r="13" fill={FUR_DARK} stroke={INK} strokeWidth="4" />
        <Circle cx="158" cy="45" r="13" fill={FUR_DARK} stroke={INK} strokeWidth="4" />
        <Circle cx="83" cy="48" r="6" fill={FUR_LIGHT} opacity="0.72" />
        <Circle cx="157" cy="48" r="6" fill={FUR_LIGHT} opacity="0.72" />

        <Path
          d="M62 65 C80 53 101 49 121 51 C141 49 160 53 178 65"
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeWidth="19"
        />
        <Path
          d="M62 65 C80 53 101 49 121 51 C141 49 160 53 178 65"
          fill="none"
          stroke="url(#mochiHeadbandPink)"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <Path
          d="M65 58 C84 48 103 44 121 46 C140 44 159 48 176 58"
          fill="none"
          stroke={WHITE}
          strokeLinecap="round"
          strokeWidth="4"
        />
        <Path
          d="M65 72 C84 62 103 59 121 60 C140 59 159 62 176 72"
          fill="none"
          stroke={WHITE}
          strokeLinecap="round"
          strokeWidth="4"
          opacity="0.95"
        />

        <Ellipse cx="120" cy="119" rx="26" ry="19" fill={MUZZLE} stroke={INK} strokeWidth="3.8" />
        <Ellipse cx="111" cy="113" rx="7" ry="9" fill={MUZZLE_LIGHT} opacity="0.36" />
        <Ellipse cx="120" cy="109" rx="8" ry="6" fill="url(#mochiInk)" />
        <Path d="M120 116 C119 120 119 123 120 126" stroke={INK} strokeLinecap="round" strokeWidth="3.1" />

        {renderEyes(expression, pupilOffset)}

        {getMouth(expression)}
        {!isDrinking && (
          <G>
            <Rect x="112" y="135" width="7.5" height="16" rx="2.4" fill={WHITE} stroke={INK} strokeWidth="2.4" />
            <Rect x="121" y="135" width="7.5" height="16" rx="2.4" fill={WHITE} stroke={INK} strokeWidth="2.4" />
          </G>
        )}

        {showStreakBadge && (
          <G transform="translate(86 164)">
            <Circle r="17" fill={GREEN} stroke={INK} strokeWidth="4" />
            <Path d="M-8 0 L-2 7 L9 -8" fill="none" stroke={WHITE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          </G>
        )}

        {showMedal && (
          <G transform="translate(137 169)">
            <Path d="M-14 -31 L0 -8 L14 -31" fill="none" stroke={PINK} strokeLinecap="round" strokeWidth="7" />
            <Circle r="16" fill="url(#mochiGold)" stroke={INK} strokeWidth="4" />
            <Path d="M0 -8 L4 1 L13 2 L6 8 L8 17 L0 12 L-8 17 L-6 8 L-13 2 L-4 1 Z" fill="#FFF2A0" />
          </G>
        )}

        {showBottle && renderBottle(isDrinking)}
        {showTrophy && renderTrophy()}

        {expression === 'thinking' && renderThought()}
        {showAlert && renderAlert()}

        {isCelebrating && (
          <G>
            <Circle cx="47" cy="58" r="4" fill={GREEN} />
            <Circle cx="198" cy="86" r="4" fill={GOLD} />
            <Rect x="197" y="111" width="8" height="8" rx="2" fill={PINK} />
            <Rect x="39" y="104" width="8" height="8" rx="2" fill="#7DD3FC" />
            <Path d="M45 91 L55 84 M188 51 L198 44" stroke={WHITE} strokeLinecap="round" strokeWidth="3" />
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
});

export default MochiRig;
