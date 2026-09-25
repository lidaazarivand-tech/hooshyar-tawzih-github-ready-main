// Official Iranian Calendar Center (مرکز تقویم مؤسسه ژئوفیزیک دانشگاه تهران)
// Official start day of each Hijri month for Iran:

export interface IranHijriMonthStart {
  hy: number;
  hm: number;
  gy: number;
  gm: number;
  gd: number;
}

export const IRAN_OFFICIAL_HIJRI_MONTH_STARTS: IranHijriMonthStart[] = [
  // 1444 AH (1401-1402 AP)
  { hy: 1444, hm: 1, gy: 2022, gm: 7, gd: 30 },
  { hy: 1444, hm: 2, gy: 2022, gm: 8, gd: 29 },
  { hy: 1444, hm: 3, gy: 2022, gm: 9, gd: 27 },
  { hy: 1444, hm: 4, gy: 2022, gm: 10, gd: 27 },
  { hy: 1444, hm: 5, gy: 2022, gm: 11, gd: 25 },
  { hy: 1444, hm: 6, gy: 2022, gm: 12, gd: 25 },
  { hy: 1444, hm: 7, gy: 2023, gm: 1, gd: 23 },
  { hy: 1444, hm: 8, gy: 2023, gm: 2, gd: 22 },
  { hy: 1444, hm: 9, gy: 2023, gm: 3, gd: 23 },
  { hy: 1444, hm: 10, gy: 2023, gm: 4, gd: 22 },
  { hy: 1444, hm: 11, gy: 2023, gm: 5, gd: 21 },
  { hy: 1444, hm: 12, gy: 2023, gm: 6, gd: 20 },

  // 1445 AH (1402-1403 AP)
  { hy: 1445, hm: 1, gy: 2023, gm: 7, gd: 19 },
  { hy: 1445, hm: 2, gy: 2023, gm: 8, gd: 18 },
  { hy: 1445, hm: 3, gy: 2023, gm: 9, gd: 17 },
  { hy: 1445, hm: 4, gy: 2023, gm: 10, gd: 17 },
  { hy: 1445, hm: 5, gy: 2023, gm: 11, gd: 15 },
  { hy: 1445, hm: 6, gy: 2023, gm: 12, gd: 15 },
  { hy: 1445, hm: 7, gy: 2024, gm: 1, gd: 13 },
  { hy: 1445, hm: 8, gy: 2024, gm: 2, gd: 11 },
  { hy: 1445, hm: 9, gy: 2024, gm: 3, gd: 12 },
  { hy: 1445, hm: 10, gy: 2024, gm: 4, gd: 10 },
  { hy: 1445, hm: 11, gy: 2024, gm: 5, gd: 10 },
  { hy: 1445, hm: 12, gy: 2024, gm: 6, gd: 8 },

  // 1446 AH (1403-1404 AP)
  { hy: 1446, hm: 1, gy: 2024, gm: 7, gd: 7 },
  { hy: 1446, hm: 2, gy: 2024, gm: 8, gd: 6 },
  { hy: 1446, hm: 3, gy: 2024, gm: 9, gd: 5 },
  { hy: 1446, hm: 4, gy: 2024, gm: 10, gd: 5 },
  { hy: 1446, hm: 5, gy: 2024, gm: 11, gd: 3 },
  { hy: 1446, hm: 6, gy: 2024, gm: 12, gd: 3 },
  { hy: 1446, hm: 7, gy: 2025, gm: 1, gd: 2 },
  { hy: 1446, hm: 8, gy: 2025, gm: 1, gd: 31 },
  { hy: 1446, hm: 9, gy: 2025, gm: 3, gd: 2 },
  { hy: 1446, hm: 10, gy: 2025, gm: 3, gd: 31 },
  { hy: 1446, hm: 11, gy: 2025, gm: 4, gd: 29 },
  { hy: 1446, hm: 12, gy: 2025, gm: 5, gd: 28 },

  // 1447 AH (1404-1405 AP)
  { hy: 1447, hm: 1, gy: 2025, gm: 6, gd: 27 },
  { hy: 1447, hm: 2, gy: 2025, gm: 7, gd: 26 },
  { hy: 1447, hm: 3, gy: 2025, gm: 8, gd: 25 },
  { hy: 1447, hm: 4, gy: 2025, gm: 9, gd: 24 },
  { hy: 1447, hm: 5, gy: 2025, gm: 10, gd: 23 },
  { hy: 1447, hm: 6, gy: 2025, gm: 11, gd: 22 },
  { hy: 1447, hm: 7, gy: 2025, gm: 12, gd: 22 },
  { hy: 1447, hm: 8, gy: 2026, gm: 1, gd: 21 },
  { hy: 1447, hm: 9, gy: 2026, gm: 2, gd: 19 },
  { hy: 1447, hm: 10, gy: 2026, gm: 3, gd: 21 },
  { hy: 1447, hm: 11, gy: 2026, gm: 4, gd: 19 },
  { hy: 1447, hm: 12, gy: 2026, gm: 5, gd: 18 },

  // 1448 AH (1405-1406 AP)
  { hy: 1448, hm: 1, gy: 2026, gm: 6, gd: 17 },
  { hy: 1448, hm: 2, gy: 2026, gm: 7, gd: 16 },
  { hy: 1448, hm: 3, gy: 2026, gm: 8, gd: 15 },
  { hy: 1448, hm: 4, gy: 2026, gm: 9, gd: 13 },
  { hy: 1448, hm: 5, gy: 2026, gm: 10, gd: 13 },
  { hy: 1448, hm: 6, gy: 2026, gm: 11, gd: 11 },
  { hy: 1448, hm: 7, gy: 2026, gm: 12, gd: 11 },
  { hy: 1448, hm: 8, gy: 2027, gm: 1, gd: 10 },
  { hy: 1448, hm: 9, gy: 2027, gm: 2, gd: 8 },
  { hy: 1448, hm: 10, gy: 2027, gm: 3, gd: 10 },
  { hy: 1448, hm: 11, gy: 2027, gm: 4, gd: 8 },
  { hy: 1448, hm: 12, gy: 2027, gm: 5, gd: 8 },

  // 1449 AH (1406-1407 AP)
  { hy: 1449, hm: 1, gy: 2027, gm: 6, gd: 6 },
  { hy: 1449, hm: 2, gy: 2027, gm: 7, gd: 6 },
  { hy: 1449, hm: 3, gy: 2027, gm: 8, gd: 4 },
  { hy: 1449, hm: 4, gy: 2027, gm: 9, gd: 3 },
  { hy: 1449, hm: 5, gy: 2027, gm: 10, gd: 2 },
  { hy: 1449, hm: 6, gy: 2027, gm: 11, gd: 1 },
  { hy: 1449, hm: 7, gy: 2027, gm: 11, gd: 30 },
  { hy: 1449, hm: 8, gy: 2027, gm: 12, gd: 30 },
  { hy: 1449, hm: 9, gy: 2028, gm: 1, gd: 28 },
  { hy: 1449, hm: 10, gy: 2028, gm: 2, gd: 27 },
  { hy: 1449, hm: 11, gy: 2028, gm: 3, gd: 27 },
  { hy: 1449, hm: 12, gy: 2028, gm: 4, gd: 26 },

  // 1450 AH (1407-1408 AP)
  { hy: 1450, hm: 1, gy: 2028, gm: 5, gd: 25 },
  { hy: 1450, hm: 2, gy: 2028, gm: 6, gd: 24 },
  { hy: 1450, hm: 3, gy: 2028, gm: 7, gd: 24 },
  { hy: 1450, hm: 4, gy: 2028, gm: 8, gd: 22 },
  { hy: 1450, hm: 5, gy: 2028, gm: 9, gd: 21 },
  { hy: 1450, hm: 6, gy: 2028, gm: 10, gd: 20 },
  { hy: 1450, hm: 7, gy: 2028, gm: 11, gd: 19 },
  { hy: 1450, hm: 8, gy: 2028, gm: 12, gd: 18 },
  { hy: 1450, hm: 9, gy: 2029, gm: 1, gd: 17 },
  { hy: 1450, hm: 10, gy: 2029, gm: 2, gd: 15 },
  { hy: 1450, hm: 11, gy: 2029, gm: 3, gd: 17 },
  { hy: 1450, hm: 12, gy: 2029, gm: 4, gd: 15 }
];
