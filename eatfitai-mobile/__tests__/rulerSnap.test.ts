import { snapRulerOffset } from '../src/utils/rulerSnap';

describe('ruler snapping', () => {
  it('snaps height offsets to whole-centimeter stops', () => {
    expect(
      snapRulerOffset({
        offset: 25.8,
        minValue: 100,
        maxValue: 250,
        pixelsPerUnit: 12,
        precision: 0,
      }),
    ).toEqual({ value: 102, offset: 24 });
  });

  it('snaps weight offsets to one-decimal stops', () => {
    expect(
      snapRulerOffset({
        offset: 11685,
        minValue: 30,
        maxValue: 200,
        pixelsPerUnit: 100,
        precision: 1,
      }),
    ).toEqual({ value: 146.9, offset: 11690 });
  });

  it('clamps out-of-range inertial scroll offsets', () => {
    expect(
      snapRulerOffset({
        offset: -240,
        minValue: 30,
        maxValue: 200,
        pixelsPerUnit: 100,
        precision: 1,
      }),
    ).toEqual({ value: 30, offset: 0 });

    expect(
      snapRulerOffset({
        offset: 99999,
        minValue: 100,
        maxValue: 250,
        pixelsPerUnit: 12,
        precision: 0,
      }),
    ).toEqual({ value: 250, offset: 1800 });
  });
});
