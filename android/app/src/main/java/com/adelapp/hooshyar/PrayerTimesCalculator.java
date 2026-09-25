package com.adelapp.hooshyar;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Astronomical Prayer Times Calculator based on University of Tehran Geophysics Institute standards.
 * Fajr: 17.7 degrees, Maghrib: 4.5 degrees.
 * Used for native recalculation on Android during boot, time set, timezone change, or date turnover.
 */
public class PrayerTimesCalculator {

    public static class DayPrayers {
        public int fajrMinutes;
        public int dhuhrMinutes;
        public int maghribMinutes;
    }

    private static double degToRad(double deg) {
        return (deg * Math.PI) / 180.0;
    }

    private static double radToDeg(double rad) {
        return (rad * 180.0) / Math.PI;
    }

    /**
     * Calculates prayer times in minutes from midnight for a given calendar day and geographic coordinate.
     *
     * @param cal Calendar instance set to the target day
     * @param lat Latitude in degrees
     * @param lng Longitude in degrees
     * @param tzOffsetHours Timezone offset in hours (e.g. 3.5 for Iran)
     */
    public static DayPrayers calculate(Calendar cal, double lat, double lng, double tzOffsetHours) {
        if (Double.isNaN(lat) || Double.isNaN(lng) || Double.isNaN(tzOffsetHours)) {
            DayPrayers prayers = new DayPrayers();
            prayers.fajrMinutes = 300;
            prayers.dhuhrMinutes = 720;
            prayers.maghribMinutes = 1140;
            return prayers;
        }

        double safeLat = Math.max(-90.0, Math.min(90.0, lat));
        double safeLng = Math.max(-180.0, Math.min(180.0, lng));
        double safeTz = tzOffsetHours;

        int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);

        // Solar declination & Equation of time
        double b = (2.0 * Math.PI * (dayOfYear - 81)) / 365.0;
        double eot = 9.87 * Math.sin(2.0 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
        double declination = 23.45 * Math.sin(degToRad((360.0 / 365.0) * (dayOfYear - 81)));

        // Solar noon
        double noonMinutes = 720.0 - (4.0 * safeLng) - eot + (safeTz * 60.0);

        // Sun angles (Tehran Geophysics Institute convention)
        double fajrAngle = 17.7;
        double maghribAngle = 4.5;

        double latRad = degToRad(safeLat);
        double decRad = degToRad(declination);

        double fajrHA = getHourAngle(fajrAngle, latRad, decRad);
        double maghribHA = getHourAngle(maghribAngle, latRad, decRad);

        DayPrayers prayers = new DayPrayers();
        int fajrRaw = (int) Math.round(noonMinutes - (fajrHA * 4.0));
        int dhuhrRaw = (int) Math.round(noonMinutes);
        int maghribRaw = (int) Math.round(noonMinutes + (maghribHA * 4.0));

        prayers.fajrMinutes = ((fajrRaw % 1440) + 1440) % 1440;
        prayers.dhuhrMinutes = ((dhuhrRaw % 1440) + 1440) % 1440;
        prayers.maghribMinutes = ((maghribRaw % 1440) + 1440) % 1440;

        return prayers;
    }

    private static double getHourAngle(double angle, double latRad, double decRad) {
        double denom = Math.cos(latRad) * Math.cos(decRad);
        if (Math.abs(denom) < 1e-10) {
            return 0.0;
        }
        double cosHA = (Math.sin(degToRad(-angle)) - Math.sin(latRad) * Math.sin(decRad)) / denom;
        if (Double.isNaN(cosHA)) return 0.0;
        if (cosHA > 1.0) return 0.0;
        if (cosHA < -1.0) return 180.0;
        return radToDeg(Math.acos(cosHA));
    }

    /**
     * Determines whether a given Gregorian year is a leap year.
     * Divisible by 4 and not 100, or divisible by 400.
     *
     * @param year Gregorian year (e.g. 2024, 2000, 1900)
     * @return true if leap year, false otherwise
     */
    public static boolean isGregorianLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}
