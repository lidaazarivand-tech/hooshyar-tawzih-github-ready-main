/**
 * Shared compass heading & Qibla angle utilities.
 * Used identically by both Home Qibla (QiblaModal) and Azan/Prayer Times (AzanModal)
 * to guarantee 100% consistent sensor, orientation, and heading calculations.
 */

/**
 * Adjusts a raw heading value based on screen orientation.
 *
 * NOTE: iOS WebKit compass heading (`webkitCompassHeading`) is ALREADY oriented to the screen's top.
 * It must NOT receive screen orientation compensation to avoid double-compensating.
 * Standard W3C `alpha` is relative to the device's portrait frame, so `screenAngle` is added.
 */
export function computeAdjustedHeading(
  rawHeading: number,
  isDirectCompassHeading: boolean,
  screenAngle: number = 0
): number {
  const angle = isDirectCompassHeading ? 0 : screenAngle;
  return (rawHeading + angle + 360) % 360;
}

/**
 * Exponential Moving Average (EMA) smoothing using the shortest angular distance across 0/360 boundary.
 *
 * @param prevHeading Previous smoothed heading in degrees [0, 360)
 * @param targetHeading Newly measured target heading in degrees [0, 360)
 * @param smoothingFactor Smoothing factor alpha (default 0.25)
 * @returns Smoothed heading in degrees [0, 360)
 */
export function smoothHeadingEMA(
  prevHeading: number,
  targetHeading: number,
  smoothingFactor: number = 0.25
): number {
  // Shortest angular difference in range [-180, 180]
  const diff = ((targetHeading - prevHeading + 540) % 360) - 180;
  return (prevHeading + smoothingFactor * diff + 360) % 360;
}

/**
 * Calculates clockwise relative angle from the top of the device to the Qibla (0..360).
 * 0° indicates the top of the phone is pointing directly towards Qibla.
 */
export function calculateRelativeQiblaAngle(
  qiblaAngle: number,
  currentHeading: number
): number {
  return (qiblaAngle - currentHeading + 360) % 360;
}

/**
 * Safely extracts current screen orientation angle in degrees (0, 90, 180, 270)
 * across various browser and mobile WebView implementations.
 */
export function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  if (typeof (window as any).orientation === 'number') {
    return (window as any).orientation;
  }
  return 0;
}
