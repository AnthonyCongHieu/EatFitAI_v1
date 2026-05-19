import type { MoChiTutorialFrame } from './MoChiTutorialContext';

export type MoChiTutorialSpotlightLayout = {
  ring: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
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
    Math.abs(previous.x - next.x) <= tolerance
    && Math.abs(previous.y - next.y) <= tolerance
    && Math.abs(previous.width - next.width) <= tolerance
    && Math.abs(previous.height - next.height) <= tolerance
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

export const getMoChiTutorialSpotlightLayout = ({
  frame,
  screenWidth,
  screenHeight,
  topInset,
  bottomInset,
}: {
  frame: MoChiTutorialFrame;
  screenWidth: number;
  screenHeight: number;
  topInset: number;
  bottomInset: number;
}): MoChiTutorialSpotlightLayout => {
  const horizontalSafePadding = 12;
  const bubbleWidth = clamp(screenWidth - 56, 236, 336);
  const ringPadding = 8;
  const maxRingLeft = Math.max(horizontalSafePadding, screenWidth - 56);
  const ringLeft = clamp(frame.x - ringPadding, horizontalSafePadding, maxRingLeft);
  const availableRingWidth = Math.max(44, screenWidth - ringLeft - horizontalSafePadding);
  const ringWidth = clamp(frame.width + ringPadding * 2, 44, availableRingWidth);
  const minRingTop = topInset + 6;
  const maxRingTop = Math.max(minRingTop, screenHeight - bottomInset - 56);
  const ringTop = clamp(frame.y - ringPadding, minRingTop, maxRingTop);
  const availableRingHeight = Math.max(44, screenHeight - ringTop - bottomInset - 10);
  const ringHeight = clamp(frame.height + ringPadding * 2, 44, availableRingHeight);
  const targetCenterX = frame.x + frame.width / 2;
  const cardLeft = clamp(
    targetCenterX - bubbleWidth / 2,
    16,
    Math.max(16, screenWidth - bubbleWidth - 16),
  );
  const cardHeight = 108;
  const cardGap = 20;
  const cardLift = frame.y > screenHeight * 0.42 ? 24 : 12;
  const minCardTop = topInset + 54;
  const maxCardTop = Math.max(minCardTop, screenHeight - bottomInset - cardHeight - 12);
  const belowTarget = ringTop + ringHeight + cardGap;
  const aboveTarget = ringTop - cardGap - cardHeight - cardLift;
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
      borderRadius: Math.min(28, Math.max(18, ringHeight / 2)),
    },
    card: {
      left: cardLeft,
      top: clamp(preferredTop, minCardTop, maxCardTop),
      width: bubbleWidth,
      height: cardHeight,
    },
  };
};
