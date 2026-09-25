import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  checkExactAlarmPermission, 
  openExactAlarmSettings, 
  isNativeAzanAvailable,
  NativeAzan
} from '../utils/nativeAzan';
import { Capacitor } from '@capacitor/core';

describe('Native Azan & Exact Alarm Permissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true for checkExactAlarmPermission when running on non-native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    
    const canExact = await checkExactAlarmPermission();
    expect(canExact).toBe(true);
  });

  it('correctly identifies native android vs other platforms', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(isNativeAzanAvailable()).toBe(false);

    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    expect(isNativeAzanAvailable()).toBe(false);

    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    expect(isNativeAzanAvailable()).toBe(true);
  });

  it('safely handles exact alarm check when plugin call throws', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    // Default proxy throws in jsdom/node, function catches safely and defaults to true
    const result = await checkExactAlarmPermission();
    expect(result).toBe(true);
  });

  it('safely handles open exact alarm settings when plugin call throws', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    // Default proxy throws in jsdom/node, function catches safely and returns false
    const result = await openExactAlarmSettings();
    expect(result).toBe(false);
  });

  it('safely returns false when openExactAlarmSettings is called on web platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    
    const opened = await openExactAlarmSettings();
    expect(opened).toBe(false);
  });
});
