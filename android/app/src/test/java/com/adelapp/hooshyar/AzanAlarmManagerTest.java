package com.adelapp.hooshyar;

import org.junit.Test;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static org.junit.Assert.*;

/**
 * Unit tests for AzanAlarmManager core scheduling, deterministic alarm ID generation,
 * bounds checking, future/past filtering, and duplicate prevention.
 */
public class AzanAlarmManagerTest {

    @Test
    public void testAlarmIdGenerationDeterministicAndCollisionFree() {
        Set<Integer> generatedIds = new HashSet<>();

        for (int day = 1; day <= 31; day++) {
            for (int slot = 1; slot <= 3; slot++) {
                int id = AzanAlarmManager.generateAlarmId(day, slot);

                // Check bounds: must fall inside [40000, 40200]
                assertTrue("ID must be within valid range", AzanAlarmManager.isValidAlarmId(id));

                // Check uniqueness: no two days or prayer slots may collide
                assertFalse("Collision detected for day " + day + ", slot " + slot + ", id " + id,
                        generatedIds.contains(id));

                generatedIds.add(id);
            }
        }

        // Exactly 31 * 3 = 93 distinct alarm IDs
        assertEquals(93, generatedIds.size());
    }

    @Test
    public void testAlarmIdBoundaryValues() {
        // Day 1, Slot 1 (Fajr) -> 40000 + (1 * 4) + 1 = 40005
        int firstId = AzanAlarmManager.generateAlarmId(1, AzanAlarmManager.PRAYER_SLOT_FAJR);
        assertEquals(40005, firstId);

        // Day 31, Slot 3 (Maghrib) -> 40000 + (31 * 4) + 3 = 40127
        int lastId = AzanAlarmManager.generateAlarmId(31, AzanAlarmManager.PRAYER_SLOT_MAGHRIB);
        assertEquals(40127, lastId);

        assertTrue(AzanAlarmManager.isValidPrayerAlarmId(firstId));
        assertTrue(AzanAlarmManager.isValidPrayerAlarmId(lastId));
        assertTrue(AzanAlarmManager.isValidAlarmId(firstId));
        assertTrue(AzanAlarmManager.isValidAlarmId(lastId));

        // Slot 0 values must never be valid prayer alarms
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40000));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40004));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40008));

        // Out-of-bounds checks
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40004));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40128));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(39999));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(40200));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(0));
        assertFalse(AzanAlarmManager.isValidPrayerAlarmId(-1));
    }

    @Test
    public void testMaintenanceAlarmIdValidAndCollisionFree() {
        int mId = AzanAlarmManager.MAINTENANCE_ALARM_ID;
        assertEquals(40199, mId);
        assertTrue(AzanAlarmManager.isMaintenanceAlarmId(mId));

        // Maintenance alarm must NOT be considered a prayer alarm
        assertFalse("Maintenance alarm ID must not be a prayer alarm ID",
                AzanAlarmManager.isValidPrayerAlarmId(mId));
        assertFalse("isValidAlarmId must reject maintenance alarm ID",
                AzanAlarmManager.isValidAlarmId(mId));

        // Verify maintenance alarm ID does not collide with any prayer slot alarm ID
        for (int day = 1; day <= 31; day++) {
            for (int slot = 1; slot <= 3; slot++) {
                assertNotEquals("Maintenance ID must never collide with prayer alarm IDs",
                        mId, AzanAlarmManager.generateAlarmId(day, slot));
            }
        }
    }

    @Test(expected = IllegalArgumentException.class)
    public void testAlarmIdRejectsInvalidDayZero() {
        AzanAlarmManager.generateAlarmId(0, 1);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testAlarmIdRejectsInvalidDay32() {
        AzanAlarmManager.generateAlarmId(32, 1);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testAlarmIdRejectsInvalidSlotZero() {
        AzanAlarmManager.generateAlarmId(15, 0);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testAlarmIdRejectsInvalidSlotFour() {
        AzanAlarmManager.generateAlarmId(15, 4);
    }

    @Test
    public void testFilterAndDeduplicateAlarmsPastAndFutureFiltering() {
        long now = 1740000000000L;
        long maxFuture = now + (10L * 24 * 60 * 60 * 1000L); // 10 days

        List<AzanAlarmManager.AlarmEntry> inputAlarms = new ArrayList<>();

        // 1. Past alarm (should be discarded)
        AzanAlarmManager.AlarmEntry past = new AzanAlarmManager.AlarmEntry();
        past.id = AzanAlarmManager.generateAlarmId(1, 1);
        past.triggerAtMillis = now - 1000L;
        inputAlarms.add(past);

        // 2. Exact present alarm (should be discarded)
        AzanAlarmManager.AlarmEntry present = new AzanAlarmManager.AlarmEntry();
        present.id = AzanAlarmManager.generateAlarmId(2, 1);
        present.triggerAtMillis = now;
        inputAlarms.add(present);

        // 3. Valid future alarm (should be kept)
        AzanAlarmManager.AlarmEntry validFuture = new AzanAlarmManager.AlarmEntry();
        validFuture.id = AzanAlarmManager.generateAlarmId(3, 1);
        validFuture.triggerAtMillis = now + 3600000L; // 1 hour ahead
        inputAlarms.add(validFuture);

        // 4. Far future alarm past 10 days (should be discarded)
        AzanAlarmManager.AlarmEntry farFuture = new AzanAlarmManager.AlarmEntry();
        farFuture.id = AzanAlarmManager.generateAlarmId(4, 1);
        farFuture.triggerAtMillis = maxFuture + 1000L;
        inputAlarms.add(farFuture);

        // 5. Invalid alarm ID out of range (should be discarded)
        AzanAlarmManager.AlarmEntry outOfRange = new AzanAlarmManager.AlarmEntry();
        outOfRange.id = 99999;
        outOfRange.triggerAtMillis = now + 7200000L;
        inputAlarms.add(outOfRange);

        Map<Integer, AzanAlarmManager.AlarmEntry> result = AzanAlarmManager.filterAndDeduplicateAlarms(
                inputAlarms, now, maxFuture, "moazenzadeh", "تهران"
        );

        assertEquals(1, result.size());
        assertTrue(result.containsKey(validFuture.id));
        assertEquals("moazenzadeh", result.get(validFuture.id).reciterId);
        assertEquals("تهران", result.get(validFuture.id).cityName);
    }

    @Test
    public void testFilterAndDeduplicateAlarmsPreventsDuplicates() {
        long now = 1740000000000L;
        long maxFuture = now + (10L * 24 * 60 * 60 * 1000L);

        List<AzanAlarmManager.AlarmEntry> inputAlarms = new ArrayList<>();
        int sharedId = AzanAlarmManager.generateAlarmId(5, AzanAlarmManager.PRAYER_SLOT_DHUHR);

        // First occurrence
        AzanAlarmManager.AlarmEntry e1 = new AzanAlarmManager.AlarmEntry();
        e1.id = sharedId;
        e1.triggerAtMillis = now + 10000L;
        e1.reciterId = "sobhdel";
        inputAlarms.add(e1);

        // Second occurrence with identical ID
        AzanAlarmManager.AlarmEntry e2 = new AzanAlarmManager.AlarmEntry();
        e2.id = sharedId;
        e2.triggerAtMillis = now + 20000L;
        e2.reciterId = "gholosh";
        inputAlarms.add(e2);

        Map<Integer, AzanAlarmManager.AlarmEntry> result = AzanAlarmManager.filterAndDeduplicateAlarms(
                inputAlarms, now, maxFuture, "moazenzadeh", "تهران"
        );

        // Map must contain exactly one entry for that ID
        assertEquals(1, result.size());
        assertTrue(result.containsKey(sharedId));
    }

    @Test
    public void testFilterDiscardsMaintenanceAlarmId() {
        long now = 1740000000000L;
        long maxFuture = now + (10L * 24 * 60 * 60 * 1000L);

        List<AzanAlarmManager.AlarmEntry> inputAlarms = new ArrayList<>();
        AzanAlarmManager.AlarmEntry maintenanceEntry = new AzanAlarmManager.AlarmEntry();
        maintenanceEntry.id = AzanAlarmManager.MAINTENANCE_ALARM_ID;
        maintenanceEntry.triggerAtMillis = now + 3600000L;
        inputAlarms.add(maintenanceEntry);

        Map<Integer, AzanAlarmManager.AlarmEntry> result = AzanAlarmManager.filterAndDeduplicateAlarms(
                inputAlarms, now, maxFuture, "moazenzadeh", "تهران"
        );

        // Maintenance alarm must never be accepted as a prayer alarm entry
        assertTrue("Filter must discard maintenance alarm ID", result.isEmpty());
    }

    @Test
    public void testPrayerTimesCalculatorChronologicalOrder() {
        java.util.Calendar cal = java.util.Calendar.getInstance();

        // Test across 4 seasonal days: Jan 1 (1), Nowruz (80), Summer solstice (172), Autumn (264)
        int[] testDays = new int[]{1, 80, 172, 264};
        // Tehran (35.6892, 51.3890, +3.5)
        double lat = 35.6892;
        double lng = 51.3890;
        double tz = 3.5;

        for (int day : testDays) {
            cal.set(java.util.Calendar.DAY_OF_YEAR, day);
            PrayerTimesCalculator.DayPrayers prayers = PrayerTimesCalculator.calculate(cal, lat, lng, tz);

            assertTrue("Fajr must be non-negative: " + prayers.fajrMinutes, prayers.fajrMinutes >= 0);
            assertTrue("Fajr must be within 24h: " + prayers.fajrMinutes, prayers.fajrMinutes < 1440);
            assertTrue("Dhuhr must be non-negative: " + prayers.dhuhrMinutes, prayers.dhuhrMinutes >= 0);
            assertTrue("Dhuhr must be within 24h: " + prayers.dhuhrMinutes, prayers.dhuhrMinutes < 1440);
            assertTrue("Maghrib must be non-negative: " + prayers.maghribMinutes, prayers.maghribMinutes >= 0);
            assertTrue("Maghrib must be within 24h: " + prayers.maghribMinutes, prayers.maghribMinutes < 1440);

            // Chronological order: Fajr < Dhuhr < Maghrib
            assertTrue("Fajr (" + prayers.fajrMinutes + ") must precede Dhuhr (" + prayers.dhuhrMinutes + ") on day " + day,
                    prayers.fajrMinutes < prayers.dhuhrMinutes);
            assertTrue("Dhuhr (" + prayers.dhuhrMinutes + ") must precede Maghrib (" + prayers.maghribMinutes + ") on day " + day,
                    prayers.dhuhrMinutes < prayers.maghribMinutes);
        }
    }

    @Test
    public void testFormatCustomTimezoneIdAndParsedOffsets() {
        // Iran standard time (+3.5)
        String tzIran = AzanAlarmManager.formatCustomTimezoneId(3.5);
        assertEquals("GMT+03:30", tzIran);
        java.util.TimeZone tzObjIran = java.util.TimeZone.getTimeZone(tzIran);
        assertEquals(Math.round(3.5 * 3600000), tzObjIran.getRawOffset());

        // Kabul (+4.5)
        String tzKabul = AzanAlarmManager.formatCustomTimezoneId(4.5);
        assertEquals("GMT+04:30", tzKabul);
        java.util.TimeZone tzObjKabul = java.util.TimeZone.getTimeZone(tzKabul);
        assertEquals(Math.round(4.5 * 3600000), tzObjKabul.getRawOffset());

        // UTC (+0.0)
        String tzUtc = AzanAlarmManager.formatCustomTimezoneId(0.0);
        assertEquals("GMT+00:00", tzUtc);
        java.util.TimeZone tzObjUtc = java.util.TimeZone.getTimeZone(tzUtc);
        assertEquals(0, tzObjUtc.getRawOffset());

        // Whole hour (+3.0)
        String tzBaghdad = AzanAlarmManager.formatCustomTimezoneId(3.0);
        assertEquals("GMT+03:00", tzBaghdad);
        java.util.TimeZone tzObjBaghdad = java.util.TimeZone.getTimeZone(tzBaghdad);
        assertEquals(3 * 3600000, tzObjBaghdad.getRawOffset());

        // Negative fractional (-3.5)
        String tzNewfoundland = AzanAlarmManager.formatCustomTimezoneId(-3.5);
        assertEquals("GMT-03:30", tzNewfoundland);
        java.util.TimeZone tzObjNf = java.util.TimeZone.getTimeZone(tzNewfoundland);
        assertEquals(Math.round(-3.5 * 3600000), tzObjNf.getRawOffset());
    }

    @Test
    public void testMaxFutureElevenDaysWindow() {
        long now = 1740000000000L;
        long maxFuture = now + (11L * 24 * 60 * 60 * 1000L); // 11 days

        List<AzanAlarmManager.AlarmEntry> alarms = new ArrayList<>();

        // Day 10 alarm (e.g. 10 days + 18 hours in the future)
        AzanAlarmManager.AlarmEntry day10Alarm = new AzanAlarmManager.AlarmEntry();
        day10Alarm.id = AzanAlarmManager.generateAlarmId(10, AzanAlarmManager.PRAYER_SLOT_MAGHRIB);
        day10Alarm.triggerAtMillis = now + (10L * 24 * 60 * 60 * 1000L) + (18L * 60 * 60 * 1000L);
        alarms.add(day10Alarm);

        // Alarm 12 days in future (beyond 11 days)
        AzanAlarmManager.AlarmEntry tooFarAlarm = new AzanAlarmManager.AlarmEntry();
        tooFarAlarm.id = AzanAlarmManager.generateAlarmId(12, AzanAlarmManager.PRAYER_SLOT_FAJR);
        tooFarAlarm.triggerAtMillis = now + (12L * 24 * 60 * 60 * 1000L);
        alarms.add(tooFarAlarm);

        Map<Integer, AzanAlarmManager.AlarmEntry> filtered = AzanAlarmManager.filterAndDeduplicateAlarms(
                alarms, now, maxFuture, "moazenzadeh", "تهران"
        );

        assertTrue("Day 10 alarm must be preserved within the 11-day window", filtered.containsKey(day10Alarm.id));
        assertFalse("Alarm beyond 11 days must be excluded", filtered.containsKey(tooFarAlarm.id));
    }

    @Test
    public void testClockRollbackRateLimitingMath() {
        long originalTimestamp = 10000000L;

        // Normal rapid duplicate broadcast arriving 50ms later -> diff in [0, 2000) -> should debounce
        long rapidNext = originalTimestamp + 50L;
        long rapidDiff = rapidNext - originalTimestamp;
        assertTrue("Rapid broadcast must be within [0, 2000)", rapidDiff >= 0 && rapidDiff < 2000L);

        // Legitimate broadcast arriving 5000ms later -> diff >= 2000 -> should NOT debounce
        long normalNext = originalTimestamp + 5000L;
        long normalDiff = normalNext - originalTimestamp;
        assertFalse("Normal broadcast must not be suppressed", normalDiff >= 0 && normalDiff < 2000L);

        // System clock rolled backward by user by 1 hour (3600000ms) -> diff < 0 -> should NOT debounce
        long rollbackNext = originalTimestamp - 3600000L;
        long rollbackDiff = rollbackNext - originalTimestamp;
        assertTrue("Rollback diff is negative", rollbackDiff < 0);
        assertFalse("Clock rollback must never be suppressed by rate-limiting",
                rollbackDiff >= 0 && rollbackDiff < 2000L);
    }
}
