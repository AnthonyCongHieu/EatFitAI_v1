import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import AppImage from '../ui/AppImage';
import {
  resolveRecipeVisual,
  type RecipeVisualCategory,
  type RecipeVisualInput,
} from './recipeVisuals';

type RecipeVisualProps = {
  recipe: RecipeVisualInput;
  style?: ViewStyle;
  size?: 'thumb' | 'medium';
  allowGenericFallback?: boolean;
};

type CategoryConfig = {
  colors: [string, string];
  accent: string;
  highlight: string;
  shadow: string;
};

const CATEGORY_CONFIG: Record<RecipeVisualCategory, CategoryConfig> = {
  noodle_soup: {
    colors: ['#233047', '#151b2a'],
    accent: '#f0c27b',
    highlight: '#f7e2b7',
    shadow: '#7dd3fc',
  },
  rice_plate: {
    colors: ['#24352d', '#141d1a'],
    accent: '#f8fafc',
    highlight: '#86efac',
    shadow: '#34d399',
  },
  chicken: {
    colors: ['#34283a', '#191622'],
    accent: '#f6ad55',
    highlight: '#fbd38d',
    shadow: '#fb7185',
  },
  fish: {
    colors: ['#173447', '#0d1b28'],
    accent: '#67e8f9',
    highlight: '#cffafe',
    shadow: '#38bdf8',
  },
  egg: {
    colors: ['#382f1c', '#19170f'],
    accent: '#f8fafc',
    highlight: '#facc15',
    shadow: '#f59e0b',
  },
  salad: {
    colors: ['#18372b', '#101d18'],
    accent: '#86efac',
    highlight: '#f9a8d4',
    shadow: '#22c55e',
  },
  soup: {
    colors: ['#293044', '#141927'],
    accent: '#fca5a5',
    highlight: '#fde68a',
    shadow: '#a78bfa',
  },
  stir_fry: {
    colors: ['#362b22', '#171511'],
    accent: '#fb923c',
    highlight: '#bef264',
    shadow: '#f97316',
  },
  braised: {
    colors: ['#352424', '#181313'],
    accent: '#c08457',
    highlight: '#fbbf24',
    shadow: '#ef4444',
  },
  steamed: {
    colors: ['#20313a', '#111a1e'],
    accent: '#cbd5e1',
    highlight: '#a7f3d0',
    shadow: '#5eead4',
  },
  drink: {
    colors: ['#1e3145', '#101923'],
    accent: '#93c5fd',
    highlight: '#f0f9ff',
    shadow: '#60a5fa',
  },
  snack: {
    colors: ['#342838', '#17131d'],
    accent: '#f9a8d4',
    highlight: '#fde68a',
    shadow: '#c084fc',
  },
  generic: {
    colors: ['#263246', '#141a28'],
    accent: '#94a3b8',
    highlight: '#dbeafe',
    shadow: '#4ade80',
  },
};

const BowlVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="108" rx="68" ry="16" fill="#05070d" opacity="0.24" />
    <Path
      d="M54 78 C62 128 178 128 186 78 Z"
      fill={config.accent}
      opacity="0.95"
    />
    <Ellipse cx="120" cy="78" rx="70" ry="20" fill={config.highlight} opacity="0.95" />
    <Path d="M74 76 C88 62 100 94 114 76 S144 62 160 76" stroke={config.shadow} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />
    <Path d="M86 88 C104 80 136 80 154 88" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" opacity="0.22" />
  </G>
);

const PlateVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="112" rx="72" ry="18" fill="#05070d" opacity="0.24" />
    <Ellipse cx="120" cy="88" rx="74" ry="42" fill={config.accent} opacity="0.96" />
    <Circle cx="104" cy="82" r="22" fill={config.highlight} />
    <Path d="M128 72 C150 60 166 75 162 92 C144 96 130 90 128 72Z" fill={config.shadow} />
    <Circle cx="142" cy="100" r="9" fill="#22c55e" opacity="0.9" />
  </G>
);

const FishVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="118" cy="111" rx="62" ry="13" fill="#05070d" opacity="0.22" />
    <Path d="M68 82 C96 46 148 48 174 82 C146 116 96 116 68 82Z" fill={config.accent} />
    <Path d="M172 82 L204 58 L198 82 L204 106Z" fill={config.shadow} />
    <Circle cx="94" cy="76" r="5" fill="#0f172a" opacity="0.65" />
    <Path d="M118 57 C110 75 110 90 120 107" stroke={config.highlight} strokeWidth="7" strokeLinecap="round" opacity="0.8" />
  </G>
);

const EggVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="112" rx="58" ry="14" fill="#05070d" opacity="0.22" />
    <Path d="M72 82 C72 52 96 36 120 36 C148 36 174 58 174 88 C174 116 150 128 120 128 C90 128 72 110 72 82Z" fill={config.accent} />
    <Circle cx="124" cy="86" r="24" fill={config.highlight} />
  </G>
);

const SaladVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="116" rx="58" ry="14" fill="#05070d" opacity="0.22" />
    <Path d="M62 82 C70 126 170 126 178 82Z" fill={config.accent} />
    <Circle cx="94" cy="74" r="18" fill={config.shadow} />
    <Circle cx="124" cy="66" r="20" fill={config.highlight} />
    <Circle cx="150" cy="78" r="16" fill="#fb7185" opacity="0.9" />
  </G>
);

const PotVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="116" rx="66" ry="15" fill="#05070d" opacity="0.24" />
    <Rect x="62" y="68" width="116" height="54" rx="18" fill={config.accent} />
    <Path d="M78 68 C84 50 156 50 162 68" stroke={config.highlight} strokeWidth="10" strokeLinecap="round" fill="none" />
    <Path d="M56 84 H42 M184 84 H198" stroke={config.shadow} strokeWidth="12" strokeLinecap="round" />
    <Circle cx="120" cy="54" r="7" fill={config.shadow} />
  </G>
);

const CupVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="118" rx="48" ry="12" fill="#05070d" opacity="0.22" />
    <Path d="M86 52 H154 L146 124 H94Z" fill={config.accent} />
    <Path d="M94 72 H146 L142 116 H98Z" fill={config.shadow} opacity="0.72" />
    <Path d="M132 32 L116 84" stroke={config.highlight} strokeWidth="6" strokeLinecap="round" />
  </G>
);

const SnackVisual = ({ config }: { config: CategoryConfig }) => (
  <G>
    <Ellipse cx="120" cy="118" rx="60" ry="14" fill="#05070d" opacity="0.22" />
    <Rect x="70" y="60" width="42" height="42" rx="10" fill={config.accent} />
    <Rect x="116" y="48" width="50" height="50" rx="12" fill={config.highlight} />
    <Rect x="108" y="88" width="44" height="34" rx="10" fill={config.shadow} />
  </G>
);

const renderCategorySvg = (category: RecipeVisualCategory, config: CategoryConfig) => {
  if (category === 'rice_plate') return <PlateVisual config={config} />;
  if (category === 'fish') return <FishVisual config={config} />;
  if (category === 'egg') return <EggVisual config={config} />;
  if (category === 'salad') return <SaladVisual config={config} />;
  if (category === 'braised' || category === 'steamed' || category === 'soup') {
    return <PotVisual config={config} />;
  }
  if (category === 'drink') return <CupVisual config={config} />;
  if (category === 'snack') return <SnackVisual config={config} />;
  if (category === 'stir_fry' || category === 'chicken') return <PlateVisual config={config} />;
  return <BowlVisual config={config} />;
};

const CategoryRecipeVisual = ({
  category,
  style,
}: {
  category: RecipeVisualCategory;
  style?: ViewStyle;
}) => {
  const config = CATEGORY_CONFIG[category];

  return (
    <View style={[S.fallbackFrame, style]}>
      <LinearGradient colors={config.colors} style={StyleSheet.absoluteFillObject} />
      <View style={S.glowOne} />
      <View style={S.glowTwo} />
      <Svg width="100%" height="100%" viewBox="0 0 240 160">
        {renderCategorySvg(category, config)}
      </Svg>
    </View>
  );
};

export const RecipeVisual = ({
  recipe,
  style,
  size = 'medium',
  allowGenericFallback = true,
}: RecipeVisualProps): React.ReactElement | null => {
  const visual = useMemo(
    () => resolveRecipeVisual(recipe, { size, allowGenericFallback }),
    [allowGenericFallback, recipe, size],
  );
  const urls = visual.urls ?? (visual.url ? [visual.url] : []);
  const [urlIndex, setUrlIndex] = useState(0);
  const activeUrl = urls[urlIndex];

  useEffect(() => {
    setUrlIndex(0);
  }, [urls.join('|')]);

  if ((visual.status === 'remote' || visual.status === 'category_fallback') && activeUrl) {
    return (
      <AppImage
        key={activeUrl}
        source={{ uri: activeUrl }}
        style={style}
        showPlaceholder
        onError={() => setUrlIndex((current) => current + 1)}
      />
    );
  }

  if (visual.status === 'none') {
    return null;
  }

  if (visual.category === 'generic' && !allowGenericFallback) {
    return null;
  }

  return <CategoryRecipeVisual category={visual.category} style={style} />;
};

export default RecipeVisual;

const S = StyleSheet.create({
  fallbackFrame: {
    overflow: 'hidden',
    backgroundColor: '#151b2a',
  },
  glowOne: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -26,
    top: -24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  glowTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    left: -26,
    bottom: -24,
    backgroundColor: 'rgba(75,226,119,0.12)',
  },
});
