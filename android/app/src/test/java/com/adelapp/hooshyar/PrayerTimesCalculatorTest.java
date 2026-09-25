package com.adelapp.hooshyar;

import org.junit.Test;
import java.util.Calendar;
import java.util.TimeZone;
import static org.junit.Assert.*;

/**
 * Unit tests for PrayerTimesCalculator (Tehran Geophysics Institute astronomical calculation).
 */
public class PrayerTimesCalculatorTest {

    private static final double TEHRAN_LAT = 35.6892;
    private static final double TEHRAN_LNG = 51.3890;
    private static final double IRAN_TZ = 3.5;

    @Test
    public void testPrayerTimesChronologicalOrder() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        cal.set(2025, Calendar.MARCH, 21, 12, 0, 0);

        PrayerTimesCalculator.DayPrayers prayers = PrayerTimesCalculator.calculate(cal, TEHRAN_LAT, TEHRAN_LNG, IRAN_TZ);

        assertNotNull(prayers);
        assertTrue("Fajr must be non-negative", prayers.fajrMinutes >= 0);
        assertTrue("Dhuhr must be non-negative", prayers.dhuhrMinutes >= 0);
        assertTrue("Maghrib must be non-negative", prayers.maghribMinutes >= 0);

        // In 24-hour cycle: Fajr < Dhuhr < Maghrib
        assertTrue("Fajr must precede Dhuhr", prayers.fajrMinutes < prayers.dhuhrMinutes);
        assertTrue("Dhuhr must precede Maghrib", prayers.dhuhrMinutes < prayers.maghribMinutes);

        // Tehran Dhuhr is around 12:00 - 12:25 (720 - 745 min)
        assertTrue("Dhuhr should be between 11:45 and 12:35", prayers.dhuhrMinutes >= 705 && prayers.dhuhrMinutes <= 755);
    }

    @Test
    public void testLongitudeEffectOnSolarNoon() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        cal.set(2025, Calendar.MAY, 15, 12, 0, 0);

        // Mashhad (east: lng ~59.6) vs Tabriz (west: lng ~46.3)
        double mashhadLng = 59.6168;
        double mashhadLat = 36.2605;
        double tabrizLng = 46.2738;
        double tabrizLat = 38.0962;

        PrayerTimesCalculator.DayPrayers mashhad = PrayerTimesCalculator.calculate(cal, mashhadLat, mashhadLng, IRAN_TZ);
        PrayerTimesCalculator.DayPrayers tabriz = PrayerTimesCalculator.calculate(cal, tabrizLat, tabrizLng, IRAN_TZ);

        // Eastern cities reach solar noon earlier than western cities
        assertTrue("Mashhad Dhuhr must precede Tabriz Dhuhr", mashhad.dhuhrMinutes < tabriz.dhuhrMinutes);
        int diff = tabriz.dhuhrMinutes - mashhad.dhuhrMinutes;
        assertTrue("Difference between Mashhad and Tabriz should be around 45-60 min", diff >= 45 && diff <= 60);
    }

    @Test
    public void testSeasonalVariationInFajrAndMaghrib() {
        Calendar summer = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        summer.set(2025, Calendar.JUNE, 21, 12, 0, 0); // Summer Solstice

        Calendar winter = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        winter.set(2025, Calendar.DECEMBER, 21, 12, 0, 0); // Winter Solstice

        PrayerTimesCalculator.DayPrayers summerPrayers = PrayerTimesCalculator.calculate(summer, TEHRAN_LAT, TEHRAN_LNG, IRAN_TZ);
        PrayerTimesCalculator.DayPrayers winterPrayers = PrayerTimesCalculator.calculate(winter, TEHRAN_LAT, TEHRAN_LNG, IRAN_TZ);

        // In summer, days are longer: Fajr is earlier, Maghrib is later
        assertTrue("Summer Fajr is earlier than winter Fajr", summerPrayers.fajrMinutes < winterPrayers.fajrMinutes);
        assertTrue("Summer Maghrib is later than winter Maghrib", summerPrayers.maghribMinutes > winterPrayers.maghribMinutes);
    }

    @Test
    public void testEquatorCalculationsAtEquinox() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.set(2025, Calendar.MARCH, 21, 12, 0, 0);

        // Prime meridian and equator: lat 0, lng 0, tz 0
        PrayerTimesCalculator.DayPrayers equatorPrayers = PrayerTimesCalculator.calculate(cal, 0.0, 0.0, 0.0);

        assertNotNull(equatorPrayers);
        // Solar noon at 0° longitude and UTC timezone is ~12:00 UTC (720 min +- 15 min equation of time)
        assertTrue("Equator Dhuhr near 720 minutes", Math.abs(equatorPrayers.dhuhrMinutes - 720) <= 15);
        assertTrue("Fajr precedes Dhuhr at equator", equatorPrayers.fajrMinutes < equatorPrayers.dhuhrMinutes);
        assertTrue("Dhuhr precedes Maghrib at equator", equatorPrayers.dhuhrMinutes < equatorPrayers.maghribMinutes);
    }

    @Test
    public void testPrayerMinutesWithinDayBounds() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"));
        for (int month = 0; month < 12; month++) {
            cal.set(2025, month, 15, 12, 0, 0);
            PrayerTimesCalculator.DayPrayers prayers = PrayerTimesCalculator.calculate(cal, TEHRAN_LAT, TEHRAN_LNG, IRAN_TZ);

            assertTrue("Fajr must be between 0 and 1439", prayers.fajrMinutes >= 0 && prayers.fajrMinutes < 1440);
            assertTrue("Dhuhr must be between 0 and 1439", prayers.dhuhrMinutes >= 0 && prayers.dhuhrMinutes < 1440);
            assertTrue("Maghrib must be between 0 and 1439", prayers.maghribMinutes >= 0 && prayers.maghribMinutes < 1440);
        }
    }

    @Test
    public void testIsGregorianLeapYear() {
        assertTrue("2000 is divisible by 400 -> leap year", PrayerTimesCalculator.isGregorianLeapYear(2000));
        assertFalse("1900 is divisible by 100 but not 400 -> not leap year", PrayerTimesCalculator.isGregorianLeapYear(1900));
        assertTrue("2024 is divisible by 4 -> leap year", PrayerTimesCalculator.isGregorianLeapYear(2024));
        assertFalse("2025 is not divisible by 4 -> not leap year", PrayerTimesCalculator.isGregorianLeapYear(2025));
    }
}
