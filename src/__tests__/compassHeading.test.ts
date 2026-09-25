import { describe, it, expect } from 'vitest';
import {
  computeAdjustedHeading,
  smoothHeadingEMA,
  calculateRelativeQiblaAngle
} from '../utils/compassHeading';

describe('Qibla Compass Heading Logic', () => {
  // 1. North heading
  describe('North heading (0 degrees)', () => {
    it('computes 0° heading correctly without screen rotation', () => {
      const heading = computeAdjustedHeading(0, false, 0);
      expect(heading).toBe(0);
    });

    it('smoothes heading pointing exactly North', () => {
      const smoothed = smoothHeadingEMA(0, 0, 0.25);
      expect(smoothed).toBe(0);
    });

    it('calculates relative Qibla angle when facing North', () => {
      // Mecca bearing from Tehran is approx 215°
      const qiblaTehran = 215;
      const relAngle = calculateRelativeQiblaAngle(qiblaTehran, 0);
      expect(relAngle).toBe(215);
    });
  });

  // 2. A non-zero heading
  describe('Non-zero heading', () => {
    it('computes heading with standard alpha and screen angle compensation', () => {
      // Device rotated 90° clockwise, screen in portrait (0°)
      const headingPortrait = computeAdjustedHeading(90, false, 0);
      expect(headingPortrait).toBe(90);

      // Device in landscape (90° screen orientation)
      const headingLandscape = computeAdjustedHeading(90, false, 90);
      expect(headingLandscape).toBe(180);
    });

    it('does NOT apply screen angle compensation to direct iOS webkitCompassHeading', () => {
      // iOS webkitCompassHeading is already aligned to screen top
      const headingIOS = computeAdjustedHeading(90, true, 90);
      expect(headingIOS).toBe(90);
    });

    it('applies EMA smoothing towards target heading', () => {
      const prev = 0;
      const target = 100;
      const smoothed = smoothHeadingEMA(prev, target, 0.25);
      expect(smoothed).toBe(25);
    });

    it('calculates non-zero relative Qibla angle', () => {
      const qiblaAngle = 215;
      const currentHeading = 90;
      const relAngle = calculateRelativeQiblaAngle(qiblaAngle, currentHeading);
      expect(relAngle).toBe(125);
    });
  });

  // 3. Wrap-around near 0/360
  describe('Wrap-around near 0/360 degrees', () => {
    it('handles wrap-around across 360/0 in computeAdjustedHeading', () => {
      expect(computeAdjustedHeading(350, false, 20)).toBe(10);
      expect(computeAdjustedHeading(10, false, -20)).toBe(350);
    });

    it('takes shortest angular path clockwise across 360/0 boundary in EMA smoothing', () => {
      // From 359° to 1°, shortest angular diff is +2°, not -358°
      const prev = 359;
      const target = 1;
      const smoothed = smoothHeadingEMA(prev, target, 0.25);
      expect(smoothed).toBeCloseTo(359.5, 5);
    });

    it('takes shortest angular path counter-clockwise across 0/360 boundary in EMA smoothing', () => {
      // From 1° to 359°, shortest angular diff is -2°, not +358°
      const prev = 1;
      const target = 359;
      const smoothed = smoothHeadingEMA(prev, target, 0.25);
      expect(smoothed).toBeCloseTo(0.5, 5);
    });
  });

  // 4. Relative Qibla angle consistency
  describe('Relative Qibla angle consistency', () => {
    it('returns 0° when device points directly at Qibla', () => {
      const qibla = 215;
      expect(calculateRelativeQiblaAngle(qibla, 215)).toBe(0);
    });

    it('maintains consistent clockwise rotation relationship', () => {
      const qibla = 215;
      // Phone pointing North (0°) -> Qibla is 215° clockwise
      expect(calculateRelativeQiblaAngle(qibla, 0)).toBe(215);
      // Phone pointing East (90°) -> Qibla is 125° clockwise
      expect(calculateRelativeQiblaAngle(qibla, 90)).toBe(125);
      // Phone pointing South (180°) -> Qibla is 35° clockwise
      expect(calculateRelativeQiblaAngle(qibla, 180)).toBe(35);
      // Phone pointing West (270°) -> Qibla is 305° clockwise
      expect(calculateRelativeQiblaAngle(qibla, 270)).toBe(305);
    });

    it('handles boundary wrap-around in relative Qibla calculation', () => {
      expect(calculateRelativeQiblaAngle(5, 355)).toBe(10);
      expect(calculateRelativeQiblaAngle(355, 5)).toBe(350);
    });
  });
});
