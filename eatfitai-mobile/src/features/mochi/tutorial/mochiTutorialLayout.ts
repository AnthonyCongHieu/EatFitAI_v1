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
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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
  const bubbleWidth = clamp(screenWidth - 32, 240, 356);
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
  const minCardTop = topInset + 54;
  const maxCardTop = Math.max(minCardTop, screenHeight - bottomInset - 218);
  const belowTarget = frame.y + frame.height + 20;
  const aboveTarget = frame.y - 184;
  const preferredTop = frame.y > screenHeight * 0.54 ? aboveTarget : belowTarget;

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
    },
  };
};
