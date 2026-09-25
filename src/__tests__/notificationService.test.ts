import { describe, it, expect } from 'vitest';
import {
  parseReminderTime,
  isValidReminderTime,
  calculateNextReminderDate,
  calculateReminderOccurrences
} from '../utils/notificationService';
import { UserReminder } from '../types/calendar';

describe('Notification Service — Reminder Time Validation (Bug #1)', () => {
  it('allows valid reminder times (09:30 and 23:59 remain schedulable)', () => {
    expect(parseReminderTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(isValidReminderTime('09:30')).toBe(true);

    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(isValidReminderTime('23:59')).toBe(true);

    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(isValidReminderTime('00:00')).toBe(true);
  });

  it('rejects invalid reminder times (25:90, 12:99, -1:30, 99:99)', () => {
    expect(parseReminderTime('25:90')).toBeNull();
    expect(isValidReminderTime('25:90')).toBe(false);

    expect(parseReminderTime('12:99')).toBeNull();
    expect(isValidReminderTime('12:99')).toBe(false);

    expect(parseReminderTime('-1:30')).toBeNull();
    expect(isValidReminderTime('-1:30')).toBe(false);

    expect(parseReminderTime('99:99')).toBeNull();
    expect(isValidReminderTime('99:99')).toBe(false);

    expect(parseReminderTime('abc:def')).toBeNull();
    expect(isValidReminderTime('abc:def')).toBe(false);

    expect(parseReminderTime('12:34:56')).toBeNull();
    expect(isValidReminderTime('12:34:56')).toBe(false);
  });

  it('preserves existing default behavior when reminder time is legitimately omitted', () => {
    expect(parseReminderTime(undefined)).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime(undefined)).toBe(true);

    expect(parseReminderTime(null)).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime(null)).toBe(true);

    expect(parseReminderTime('')).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime('')).toBe(true);

    expect(parseReminderTime('   ')).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime('   ')).toBe(true);
  });

  it('supports Persian digit inputs for valid times', () => {
    expect(parseReminderTime('۰۹:۳۰')).toEqual({ hour: 9, minute: 30 });
    expect(isValidReminderTime('۰۹:۳۰')).toBe(true);

    expect(parseReminderTime('۲۳:۵۹')).toEqual({ hour: 23, minute: 59 });
    expect(isValidReminderTime('۲۳:۵۹')).toBe(true);
  });
});

describe('Notification Service — Recurrence Calculation', () => {
  it('schedules one-time reminders only if in the future', () => {
    const fixedNow = new Date('2025-05-10T10:00:00Z');

    // Future reminder (1404-02-25 ~ 2025-05-15)
    const futureRem: UserReminder = {
      id: 'r1',
      title: 'یادآوری آینده',
      dateKey: '1404-02-25',
      time: '14:00',
      type: 'event',
      repeat: 'none',
      enabled: true
    };
    const resFuture = calculateNextReminderDate(futureRem, fixedNow);
    expect(resFuture).not.toBeNull();
    expect(resFuture!.nextDate.getTime()).toBeGreaterThan(fixedNow.getTime());

    // Past reminder (1404-02-15 ~ 2025-05-05)
    const pastRem: UserReminder = {
      id: 'r2',
      title: 'یادآوری گذشته',
      dateKey: '1404-02-15',
      time: '14:00',
      type: 'event',
      repeat: 'none',
      enabled: true
    };
    const resPast = calculateNextReminderDate(pastRem, fixedNow);
    expect(resPast).toBeNull();
  });

  it('calculates next occurrence for weekly recurring reminders', () => {
    const fixedNow = new Date('2025-05-10T10:00:00');

    const weeklyRem: UserReminder = {
      id: 'r_weekly',
      title: 'جلسه هفتگی',
      dateKey: '1404-01-10', // Date in the past
      time: '15:00',
      type: 'meeting',
      repeat: 'weekly',
      enabled: true
    };

    const res = calculateNextReminderDate(weeklyRem, fixedNow);
    expect(res).not.toBeNull();
    expect(res!.nextDate.getTime()).toBeGreaterThan(fixedNow.getTime());
    const occurrences = calculateReminderOccurrences(weeklyRem, fixedNow);
    expect(occurrences.length).toBeGreaterThan(1);
    expect(occurrences[1].getTime() - occurrences[0].getTime()).toBe(7 * 86400000);
  });

  it('calculates next occurrence for monthly reminders with Jalali day clamping', () => {
    // Current date: 1404-07-15 (Mehr 15, which has 30 days)
    const fixedNow = new Date('2025-10-07T10:00:00');

    // Reminder was set for 31st of Farvardin
    const monthlyRem: UserReminder = {
      id: 'r_monthly',
      title: 'پرداخت قسط ماهانه',
      dateKey: '1404-01-31',
      time: '10:00',
      type: 'bill',
      repeat: 'monthly',
      enabled: true
    };

    const res = calculateNextReminderDate(monthlyRem, fixedNow);
    expect(res).not.toBeNull();
    expect(res!.nextDate.getTime()).toBeGreaterThan(fixedNow.getTime());
    expect(calculateReminderOccurrences(monthlyRem, fixedNow).length).toBeGreaterThan(1);
  });

  it('calculates next occurrence for yearly recurring reminders (birthdays / anniversaries)', () => {
    // Current date: 1404-05-15
    const fixedNow = new Date('2025-08-06T10:00:00');

    // Birthday was on 1403-02-10 (already passed in 1404)
    const birthdayPassed: UserReminder = {
      id: 'r_bday_past',
      title: 'تولد علی',
      dateKey: '1403-02-10',
      time: '09:00',
      type: 'birthday',
      repeatYearly: true,
      enabled: true
    };

    const resPassed = calculateNextReminderDate(birthdayPassed, fixedNow);
    expect(resPassed).not.toBeNull();
    expect(resPassed!.nextDate.getTime()).toBeGreaterThan(fixedNow.getTime());

    // Birthday on 1403-08-20 (upcoming in 1404)
    const birthdayUpcoming: UserReminder = {
      id: 'r_bday_up',
      title: 'سالگرد ازدواج',
      dateKey: '1403-08-20',
      time: '18:00',
      type: 'event',
      repeat: 'yearly',
      enabled: true
    };

    const resUpcoming = calculateNextReminderDate(birthdayUpcoming, fixedNow);
    expect(resUpcoming).not.toBeNull();
    expect(resUpcoming!.nextDate.getTime()).toBeGreaterThan(fixedNow.getTime());
  });
});
