// Enhanced animations for premium UX
// Includes durations, spring configs, and entry animation presets

export const animations = {
  // Duration presets (ms)
  fast: 150,
  normal: 300,
  slow: 500,

  // Spring configuration presets for react-native-reanimated
  spring: {
    // Gentle spring - for subtle movements
    gentle: { damping: 20, stiffness: 100, mass: 1 },
    // Bouncy spring - for playful interactions
    bouncy: { damping: 10, stiffness: 180, mass: 1 },
    // Snappy spring - for quick, responsive feedback
    snappy: { damping: 20, stiffness: 300, mass: 0.8 },
    // Soft spring - for smooth transitions
    soft: { damping: 15, stiffness: 120, mass: 1 },
  },
} as const;

export const easing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  // Additional easing curves
  easeOut: 'cubic-bezier(0.0, 0.0, 0.58, 1.0)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Entry animation presets for Reanimated
export const entryPresets = {
  fadeInUp: {
    initialValues: { opacity: 0, transform: [{ translateY: 20 }] },
    animations: { opacity: 1, transform: [{ translateY: 0 }] },
  },
  fadeInDown: {
    initialValues: { opacity: 0, transform: [{ translateY: -20 }] },
    animations: { opacity: 1, transform: [{ translateY: 0 }] },
  },
  fadeInLeft: {
    initialValues: { opacity: 0, transform: [{ translateX: -20 }] },
    animations: { opacity: 1, transform: [{ translateX: 0 }] },
  },
  fadeInRight: {
    initialValues: { opacity: 0, transform: [{ translateX: 20 }] },
    animations: { opacity: 1, transform: [{ translateX: 0 }] },
  },
  scaleIn: {
    initialValues: { opacity: 0, transform: [{ scale: 0.9 }] },
    animations: { opacity: 1, transform: [{ scale: 1 }] },
  },
  slideUp: {
    initialValues: { transform: [{ translateY: 100 }] },
    animations: { transform: [{ translateY: 0 }] },
  },
} as const;

// Stagger delay calculator for list animations
export const getStaggerDelay = (index: number, baseDelay = 50): number => {
  return Math.min(index * baseDelay, 300); // Cap at 300ms
};
