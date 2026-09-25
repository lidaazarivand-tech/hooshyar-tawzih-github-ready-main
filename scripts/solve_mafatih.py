#!/usr/bin/env python3
"""
solve_mafatih.py

Authoritative Persian translation solver for Mafatih al-Jinan in Hooshyar 1.8.8.
Authoritative source: scripts/source/mafatih_extracted.txt
Translator: Ayatollah Seyyed Hashem Rasouli Mahallati
"""

import json
import re
import time
from collections import defaultdict

def clean_norm(t):
    if not t:
        return ''
    s = re.sub(r'ا[أإآا]ل', 'الا', t)
    s = re.sub(r'[\u064B-\u065F\u0670\u0653\u0654\u0655ًٌٍَُِّّْـ\u200c\u200b]', '', s)
    s = re.sub(r'[آإأٱءئ]', 'ا', s)
    s = re.sub(r'[يى]', 'ی', s)
    s = re.sub(r'ك', 'ک', s)
    s = re.sub(r'[ةۀ]', 'ه', s)
    s = re.sub(r'ؤ', 'و', s)
    s = re.sub(r'[\s،؛؟\.\:\,\!\«\»\(\)\[\]\*\-\–\—\_\\\/\"\']+', '', s)
    s = re.sub(r'[^\u0600-\u06FF0-9]', '', s)
    return s

def clean_persian_line(l):
    if re.match(r'^\s*[\d\s\.\*\-\–\—\«\»\(\)]+$', l):
        return ''
    l = l.replace('\uFFFD', '')
    l = l.replace('â€¦', '')
    l = re.sub(r'صل\s*ى\s*اهلل', 'صلی الله', l)
    l = re.sub(r'صّلى\s*اهلل', 'صلی الله', l)
    l = re.sub(r'عّلیه\s*السالم', 'علیه السلام', l)
    l = re.sub(r'علیه\s*السالم', 'علیه السلام', l)
    l = re.sub(r'عّلیها\s*السالم', 'علیها السلام', l)
    l = re.sub(r'علیها\s*السالم', 'علیها السلام', l)
    l = re.sub(r'عّلیهم\s*السالم', 'علیهم السلام', l)
    l = re.sub(r'علیهم\s*السالم', 'علیهم السلام', l)
    l = re.sub(r'رسو\s*لاهلل', 'رسول الله', l)
    l = re.sub(r'\bاهلل\b', 'الله', l)
    l = re.sub(r'\bم\s+ى\s*', 'می ', l)
    l = re.sub(r'\bم\s+ی\s*', 'می ', l)
    l = re.sub(r'\bن\s+م\s+ى\s*', 'نمی ', l)
    l = re.sub(r'\bن\s+م\s+ی\s*', 'نمی ', l)
    l = re.sub(r'\bب\s+ى\s*', 'بی ', l)
    l = re.sub(r'\bب\s+ی\s*', 'بی ', l)
    l = re.sub(r'\s+ه\s*ا\b', '‌ها', l)
    l = re.sub(r'\s+ه\s*اى\b', '‌های', l)
    l = re.sub(r'\s+ه\s*ای\b', '‌های', l)
    l = re.sub(r'[ \t]+', ' ', l).strip()
    return l

def is_arabic_prayer_line(line):
    diacritics = len(re.findall(r'[\u064B-\u065F\u0670ًٌٍَُِّّْ]', line))
    letters = len(re.findall(r'[\u0600-\u06FF]', line))
    if letters == 0:
        return False
    # True Arabic prayer lines are heavily vocalized with Harakat (ratio > 0.15 or >= 6 diacritics)
    return (diacritics / letters > 0.15) or (diacritics >= 6 and diacritics / letters > 0.08)

def main():
    print("Loading authoritative source and existing Mafatih items...")
    with open('scripts/source/mafatih_extracted.txt', 'r', encoding='utf-8') as f:
        # Note: raw lines in mafatih_extracted.txt are RTL character-reversed
        raw_lines = [l.strip()[::-1] for l in f]

    with open('src/data/mafatihFullData.json', 'r', encoding='utf-8') as f:
        items = json.load(f)

    print(f"Total raw lines: {len(raw_lines)}, total items: {len(items)}")

    # Prepare normalized lines and build 5-gram index for fast probe searches
    t0 = time.time()
    raw_clean = [clean_norm(l) for l in raw_lines]
    index = defaultdict(list)
    for line_idx, line in enumerate(raw_clean):
        for i in range(len(line) - 4):
            ngram = line[i:i+5]
            if not index[ngram] or index[ngram][-1] != line_idx:
                index[ngram].append(line_idx)
    print(f"Search index built in {time.time() - t0:.2f}s")

    def search_probe(p):
        if len(p) < 6:
            return []
        g1, g2 = p[:5], p[-5:]
        s1, s2 = set(index.get(g1, [])), set(index.get(g2, []))
        return [c for c in sorted(s1 & s2) if p in raw_clean[c]]

    # Step 1: Find candidate lines for each item
    item_candidates = []
    for idx, it in enumerate(items):
        ar_c = clean_norm(it['arabicText'])
        t_c = clean_norm(it['title'])
        cands = set()
        for offset in range(0, min(len(ar_c), 200), 10):
            p = ar_c[offset:offset+18]
            if len(p) < 14:
                continue
            hits = search_probe(p)
            if hits and len(hits) <= 15:
                for h in hits:
                    cands.add(h)
                if len(cands) >= 5:
                    break
        if not cands:
            for offset in range(0, min(len(t_c), 50), 6):
                p = t_c[offset:offset+14]
                if len(p) < 10:
                    continue
                hits = search_probe(p)
                if hits and len(hits) <= 15:
                    for h in hits:
                        cands.add(h)
                    if len(cands) >= 5:
                        break
        item_candidates.append(sorted(cands))

    # Step 2: Monotonic Longest Increasing Subsequence Alignment (DP)
    dp = []
    for i in range(len(items)):
        cands = item_candidates[i]
        if not cands:
            dp.append([])
            continue
        layer = []
        for c_idx, line in enumerate(cands):
            best_score = 1
            best_prev = None
            for prev_i in range(max(0, i - 40), i):
                if not dp[prev_i]:
                    continue
                for prev_cand_idx, (p_line, p_score, _) in enumerate(dp[prev_i]):
                    if p_line < line:
                        score = p_score + 1
                        if score > best_score:
                            best_score = score
                            best_prev = (prev_i, prev_cand_idx)
            layer.append((line, best_score, best_prev))
        dp.append(layer)

    best_score = 0
    best_end = None
    for i in range(len(items)):
        for c_idx, (line, score, prev) in enumerate(dp[i]):
            if score > best_score:
                best_score = score
                best_end = (i, c_idx)

    chain = {}
    curr = best_end
    while curr:
        i, c_idx = curr
        line, score, prev = dp[i][c_idx]
        chain[i] = line
        curr = prev

    print(f"Initial monotonic chain aligned: {len(chain)} / {len(items)} items")

    # Step 3: Verified explicit anchors for high-profile sections
    chain[79] = 3420   # #80 Dua Simat
    chain[80] = 3641   # #81 Dua Mashlool
    chain[114] = 6615  # #115 Munajat al-Muftaqirin
    chain[508] = 20894 # #509 Munajat Amir al-Mu'minin in Kufa Mosque
    chain[518] = 21536 # #519 Ziyarat Imam Hussein Adab
    chain[519] = 21571 # #520 Ziyarat Imam Hussein Adab
    chain[543] = 23656 # #544 Ziyarat Ashura
    chain[544] = 23851 # #545 Dua Alqamah
    chain[588] = 27870 # #589 Dua Ahd
    chain[589] = 27949 # #590 Dua Gheybat

    # Step 4: Fill missing anchors monotonically
    all_starts = dict(chain)
    known_keys = sorted(all_starts.keys())
    for k_idx in range(len(known_keys) - 1):
        k1 = known_keys[k_idx]
        k2 = known_keys[k_idx + 1]
        l1 = all_starts[k1]
        l2 = all_starts[k2]
        gap = k2 - k1
        for step in range(1, gap):
            all_starts[k1 + step] = int(l1 + (l2 - l1) * step / gap)

    # Extraction helper
    def extract_trans(i):
        s = all_starts[i]
        e = all_starts[i+1] if i+1 < len(items) else len(raw_lines)
        lines = []
        for l_idx in range(s, e):
            l = raw_lines[l_idx]
            if is_arabic_prayer_line(l):
                continue
            c = clean_persian_line(l)
            if c:
                lines.append(c)
        return ' '.join(lines)

    # Step 5: Identify items requiring update vs preservation
    # 18 Flagged problem items + displaced items (1-based numbers)
    flagged_set = {77, 80, 81, 102, 141, 166, 171, 172, 236, 377, 383, 389, 390, 416, 417, 509, 519, 576, 589, 596}

    # Overlapping groups (1-based ranges)
    overlap_ranges = [
        (137, 140),
        (142, 145),
        (166, 173),
        (248, 252),
        (254, 259),
        (294, 297),
        (299, 307),
        (309, 318),
        (319, 322),
        (383, 387),
        (388, 391),
        (404, 409),
        (451, 457),
        (459, 465),
        (574, 578)
    ]
    overlap_set = set()
    for start_num, end_num in overlap_ranges:
        for num in range(start_num, end_num + 1):
            overlap_set.add(num)

    updated_count = 0
    preserved_count = 0

    for idx, it in enumerate(items):
        num = it['num']
        current_trans = it.get('persianTranslation', '')
        extracted = extract_trans(idx)

        must_replace = False

        if num in flagged_set:
            must_replace = True
        elif num in overlap_set:
            must_replace = True
        elif not current_trans.strip() and extracted.strip():
            must_replace = True
        elif '\uFFFD' in current_trans or 'â€¦' in current_trans:
            must_replace = True

        if must_replace and extracted.strip():
            it['persianTranslation'] = extracted
            updated_count += 1
        else:
            # Preserve verified translation if already present
            if current_trans.strip():
                # Clean any lingering artifact while preserving authentic text
                cleaned = current_trans.replace('\uFFFD', '').replace('â€¦', '')
                it['persianTranslation'] = cleaned
                preserved_count += 1
            else:
                it['persianTranslation'] = extracted if extracted.strip() else ''

    print(f"Summary: {updated_count} items updated, {preserved_count} items preserved.")

    # Save to src/data/mafatihFullData.json
    print("Writing updated data to src/data/mafatihFullData.json...")
    with open('src/data/mafatihFullData.json', 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print("Done! Mafatih al-Jinan data successfully synchronized.")

if __name__ == '__main__':
    main()
