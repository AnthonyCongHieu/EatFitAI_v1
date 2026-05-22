import type { MoChiTutorialFrame } from './MoChiTutorialContext';
import type { MoChiTutorialHighlightProfile } from './mochiTutorialCatalog';

export type MoChiTutorialSpotlightLayout = {
  ring: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
    maskFeather?: number;
  };
  card: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type MoChiTutorialScrimRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const areMoChiTutorialFramesStable = (
  previous: MoChiTutorialFrame | null,
  next: MoChiTutorialFrame | null,
  tolerance = 2,
): boolean => {
  if (!previous || !next) {
    return false;
  }

  return (
    Math.abs(previous.x - next.x) <= tolerance &&
    Math.abs(previous.y - next.y) <= tolerance &&
    Math.abs(previous.width - next.width) <= tolerance &&
    Math.abs(previous.height - next.height) <= tolerance
  );
};

export const getMoChiTutorialScrimRects = ({
  ring,
  screenWidth,
  screenHeight,
}: {
  ring: MoChiTutorialSpotlightLayout['ring'];
  screenWidth: number;
  screenHeight: number;
}): MoChiTutorialScrimRect[] => {
  const ringRight = clamp(ring.left + ring.width, 0, screenWidth);
  const ringBottom = clamp(ring.top + ring.height, 0, screenHeight);
  const ringLeft = clamp(ring.left, 0, screenWidth);
  const ringTop = clamp(ring.top, 0, screenHeight);

  return [
    {
      left: 0,
      top: 0,
      width: screenWidth,
      height: ringTop,
    },
    {
      left: 0,
      top: ringTop,
      width: ringLeft,
      height: Math.max(0, ringBottom - ringTop),
    },
    {
      left: ringRight,
      top: ringTop,
      width: Math.max(0, screenWidth - ringRight),
      height: Math.max(0, ringBottom - ringTop),
    },
    {
      left: 0,
      top: ringBottom,
      width: screenWidth,
      height: Math.max(0, screenHeight - ringBottom),
    },
  ];
};

const SPOTLIGHT_PROFILES: Record<
  MoChiTutorialHighlightProfile,
  {
    radius: number;
    insets: Record<'top' | 'right' | 'bottom' | 'left', number>;
  }
> = {
  dock: {
    radius: 999,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  tab: {
    radius: 18,
    insets: { top: 5, right: 7, bottom: 5, left: 7 },
  },
  sheetAction: {
    radius: 20,
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  },
  homeWater: {
    radius: 22,
    insets: { top: 5, right: 5, bottom: 5, left: 5 },
  },
};

export const getMoChiTutorialSpotlightLayout = ({
  frame,
  screenWidth,
  screenHeight,
  topInset,
  bottomInset,
  highlightProfile,
  cardHeight,
}: {
  frame: MoChiTutorialFrame;
  screenWidth: number;
  screenHeight: number;
  topInset: number;
  bottomInset: number;
  highlightProfile?: MoChiTutorialHighlightProfile;
  cardHeight?: number;
}): MoChiTutorialSpotlightLayout => {
  const horizontalSafePadding = 12;
  const bubbleWidth = clamp(screenWidth - 56, 236, 336);
  const profile = highlightProfile ? SPOTLIGHT_PROFILES[highlightProfile] : null;

  const insetLeft = profile ? profile.insets.left : 8;
  const insetRight = profile ? profile.insets.right : 8;
  const insetTop = profile ? profile.insets.top : 8;
  const insetBottom = profile ? profile.insets.bottom : 8;

  const shouldUseCircularDock = highlightProfile === 'dock';
  const idealWidth = frame.width + insetLeft + insetRight;
  const idealHeight = frame.height + insetTop + insetBottom;
  const idealDockDiameter = Math.max(idealWidth, idealHeight);

  const targetCenterX = frame.x + frame.width / 2;
  const targetCenterY = frame.y + frame.height / 2;

  const minRingTop = topInset + 6;
  const maxRingWidth = screenWidth - 2 * horizontalSafePadding;
  const maxRingHeight = screenHeight - minRingTop - bottomInset - 10;

  const ringWidth = shouldUseCircularDock
    ? clamp(idealDockDiameter, 44, Math.max(44, maxRingWidth))
    : clamp(idealWidth, 44, Math.max(44, maxRingWidth));
  const ringHeight = shouldUseCircularDock
    ? ringWidth
    : clamp(idealHeight, 44, Math.max(44, maxRingHeight));

  let ringLeft = targetCenterX - ringWidth / 2;
  let ringTop = targetCenterY - ringHeight / 2;

  const minRingLeft = horizontalSafePadding;
  const maxRingLeft = Math.max(
    minRingLeft,
    screenWidth - horizontalSafePadding - ringWidth,
  );
  ringLeft = clamp(ringLeft, minRingLeft, maxRingLeft);

  const minRingTopVal = minRingTop;
  const dockBottomOverflow = highlightProfile === 'dock' ? 72 : 0;
  const maxRingTopVal = Math.max(
    minRingTopVal,
    screenHeight - bottomInset - 10 + dockBottomOverflow - ringHeight,
  );
  ringTop = clamp(ringTop, minRingTopVal, maxRingTopVal);

  const ringBorderRadius = shouldUseCircularDock
    ? ringHeight / 2
    : profile
    ? profile.radius
    : Math.min(28, Math.max(18, ringHeight / 2));

  const cardLeft = clamp(
    targetCenterX - bubbleWidth / 2,
    16,
    Math.max(16, screenWidth - bubbleWidth - 16),
  );
  const maxAvailableCardHeight = Math.max(96, screenHeight - topInset - bottomInset - 84);
  const resolvedCardHeight = clamp(cardHeight ?? 128, 96, maxAvailableCardHeight);
  const cardGap = 20;
  const cardLift = frame.y > screenHeight * 0.42 ? 24 : 12;
  const minCardTop = topInset + 54;
  const maxCardTop = Math.max(
    minCardTop,
    screenHeight - bottomInset - resolvedCardHeight - 12,
  );
  const belowTarget = ringTop + ringHeight + cardGap;
  const aboveTarget = ringTop - cardGap - resolvedCardHeight - cardLift;
  const canFitBelow = belowTarget <= maxCardTop;
  const canFitAbove = aboveTarget >= minCardTop;
  const prefersAbove = frame.y > screenHeight * 0.54;

  const preferredTop = prefersAbove
    ? canFitAbove
      ? aboveTarget
      : belowTarget
    : canFitBelow
      ? belowTarget
      : aboveTarget;

  return {
    ring: {
      left: ringLeft,
      top: ringTop,
      width: ringWidth,
      height: ringHeight,
      borderRadius: ringBorderRadius,
      maskFeather: shouldUseCircularDock ? 14 : undefined,
    },
    card: {
      left: cardLeft,
      top: clamp(preferredTop, minCardTop, maxCardTop),
      width: bubbleWidth,
      height: resolvedCardHeight,
    },
  };
};
