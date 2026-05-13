type SnapRulerOffsetInput = {
  offset: number;
  minValue: number;
  maxValue: number;
  pixelsPerUnit: number;
  precision: number;
};

const roundToPrecision = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

export const snapRulerOffset = ({
  offset,
  minValue,
  maxValue,
  pixelsPerUnit,
  precision,
}: SnapRulerOffsetInput): { value: number; offset: number } => {
  const rawValue = offset / pixelsPerUnit + minValue;
  const roundedValue = roundToPrecision(rawValue, precision);
  const value = Math.max(minValue, Math.min(maxValue, roundedValue));
  const snappedOffset = roundToPrecision((value - minValue) * pixelsPerUnit, 2);

  return {
    value,
    offset: snappedOffset,
  };
};
