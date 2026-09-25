import os
import glob
import re
import json
import html

CACHE_DIR = "scripts/sistani_cache"
VOL_META = {
    1: ("26575", "توضیح المسائل جامع جلد ۱"),
    2: ("26576", "توضیح المسائل جامع جلد ۲"),
    3: ("26577", "توضیح المسائل جامع جلد ۳"),
    4: ("26578", "توضیح المسائل جامع جلد ۴"),
}
DIGITS_TRANS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")

def parse_footnotes(fn_html):
    if not fn_html:
        return {}
    fn_text = re.sub(r"<[^>]+>", " ", fn_html).strip()
    fn_text = html.unescape(re.sub(r"[ \t]+", " ", fn_text))
    matches = list(re.finditer(r"\[([0-9۰-۹]+)\][\.\:]?\s*", fn_text))
    footnotes = {}
    for i, m in enumerate(matches):
        fn_num = int(m.group(1).translate(DIGITS_TRANS))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(fn_text)
        content = fn_text[start:end].strip()
        footnotes[fn_num] = f"[{fn_num}]. {content}"
    return footnotes

def clean_html_text(raw):
    txt = re.sub(r"<\s*br\s*/?>", "\n", raw, flags=re.I)
    txt = re.sub(r"</\s*p\s*>", "\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = html.unescape(txt)
    lines = [l.strip() for l in txt.split("\n")]
    return "\n".join([l for l in lines if l]).strip()

def generate():
    items = []
    seen_ids = set()
    seen_text_signatures = set() # (volume, issueNumber, signature) to eliminate true duplicate issues

    by_vol = {
        1: {"entries": 0, "issues": 0},
        2: {"entries": 0, "issues": 0},
        3: {"entries": 0, "issues": 0},
        4: {"entries": 0, "issues": 0}
    }

    for vol in [1, 2, 3, 4]:
        bid, vol_title = VOL_META[vol]
        toc_path = os.path.join(CACHE_DIR, f"toc_{bid}.html")
        ordered_pids = []
        if os.path.exists(toc_path):
            with open(toc_path, "r", encoding="utf-8") as f:
                toc_html = f.read()
            raw_pids = re.findall(rf"/persian/book/{bid}/(\d+)/", toc_html)
            seen_pids = set()
            for p in raw_pids:
                if p not in seen_pids:
                    seen_pids.add(p)
                    ordered_pids.append(p)
        else:
            # Fallback to file globbing if TOC not present
            files = sorted(glob.glob(os.path.join(CACHE_DIR, f"{bid}_*.html")))
            ordered_pids = [os.path.basename(f).replace(".html", "").split("_")[1] for f in files]

        print(f"Processing Volume {vol} ({bid}): {len(ordered_pids)} pages in TOC...")

        for pid in ordered_pids:
            fpath = os.path.join(CACHE_DIR, f"{bid}_{pid}.html")
            if not os.path.exists(fpath):
                continue
            with open(fpath, "r", encoding="utf-8") as f:
                c = f.read()

            m_h1 = re.search(r"<h1 class=[\"']c[\"']>(.*?)</h1>", c, re.DOTALL)
            section_raw = re.sub(r"<[^>]+>", "", m_h1.group(1)).strip() if m_h1 else "احکام شرعی"
            sec_parts = [p.strip() for p in section_raw.split("/") if p.strip()]
            section = sec_parts[0] if sec_parts else section_raw
            subsection = " / ".join(sec_parts[1:]) if len(sec_parts) > 1 else None

            m_text = re.search(r"<div class=[\"']baz book-text[\"']>(.*?)</div>", c, re.DOTALL)
            if not m_text:
                continue
            raw_text = m_text.group(1)

            m_fn = re.search(r"<div class=[\"']baz book-footnote[\"']>(.*?)</div>", c, re.DOTALL)
            page_footnotes = parse_footnotes(m_fn.group(1) if m_fn else "")

            issue_matches = list(re.finditer(
                r"(?:<b>|<strong[^>]*>)?\s*مس(?:أله|ئله|اله)\s*([0-9۰-۹]+)[\.\:\،\s\)]*(?:</b>|</strong>)?",
                raw_text
            ))
            source_url = f"https://www.sistani.org/persian/book/{bid}/{pid}/"

            if issue_matches:
                # 1. Preamble if present before the first issue
                first_start = issue_matches[0].start()
                if first_start > 0:
                    preamble_raw = raw_text[:first_start].strip()
                    preamble_clean = clean_html_text(preamble_raw)
                    if len(preamble_clean) > 25:
                        pid_key = f"tawzih_{vol}_{pid}_preamble"
                        if pid_key not in seen_ids:
                            seen_ids.add(pid_key)
                            items.append({
                                "id": pid_key,
                                "volume": vol,
                                "volumeTitle": vol_title,
                                "section": section,
                                "subsection": subsection,
                                "issueNumber": None,
                                "title": f"مقدمه: {section}",
                                "text": preamble_clean,
                                "footnote": None,
                                "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی",
                                "sourceUrl": source_url
                            })
                            by_vol[vol]["entries"] += 1

                # 2. Numbered issues
                for idx, im in enumerate(issue_matches):
                    issue_num = int(im.group(1).translate(DIGITS_TRANS))
                    body_start = im.end()
                    body_end = issue_matches[idx + 1].start() if idx + 1 < len(issue_matches) else len(raw_text)
                    body_raw = raw_text[body_start:body_end]
                    body_clean = clean_html_text(body_raw)

                    # Deduplicate exact identical repeats
                    sig = (vol, issue_num, body_clean[:50])
                    if sig in seen_text_signatures:
                        continue
                    seen_text_signatures.add(sig)

                    # Specific footnotes cited in this issue body
                    ref_nums = [int(n.translate(DIGITS_TRANS)) for n in re.findall(r"\[([0-9۰-۹]+)\]", body_clean)]
                    fn_lines = [page_footnotes[n] for n in ref_nums if n in page_footnotes]
                    fn_str = "\n".join(fn_lines) if fn_lines else None

                    pid_key = f"tawzih_{vol}_{issue_num}"
                    if pid_key in seen_ids:
                        pid_key = f"tawzih_{vol}_{issue_num}_{pid}"
                    seen_ids.add(pid_key)

                    items.append({
                        "id": pid_key,
                        "volume": vol,
                        "volumeTitle": vol_title,
                        "section": section,
                        "subsection": subsection,
                        "issueNumber": issue_num,
                        "title": f"مسأله {issue_num}",
                        "text": body_clean,
                        "footnote": fn_str,
                        "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی",
                        "sourceUrl": source_url
                    })
                    by_vol[vol]["entries"] += 1
                    by_vol[vol]["issues"] += 1
            else:
                # 3. Chapters without numbered issues (introductory prefaces, virtues, principles)
                clean_text = clean_html_text(raw_text)
                if len(clean_text) > 15:
                    pid_key = f"tawzih_{vol}_{pid}"
                    if pid_key not in seen_ids:
                        seen_ids.add(pid_key)
                        all_fns = "\n".join(page_footnotes.values()) if page_footnotes else None
                        items.append({
                            "id": pid_key,
                            "volume": vol,
                            "volumeTitle": vol_title,
                            "section": section,
                            "subsection": subsection,
                            "issueNumber": None,
                            "title": section,
                            "text": clean_text,
                            "footnote": all_fns,
                            "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی",
                            "sourceUrl": source_url
                        })
                        by_vol[vol]["entries"] += 1

    # Validate integrity
    for it in items:
        for k, v in it.items():
            if isinstance(v, str):
                if "\ufffd" in v:
                    raise ValueError(f"Found replacement char in item {it['id']}")
                if "â€¦" in v:
                    raise ValueError(f"Found mojibake in item {it['id']}")

    out_path = "src/data/tawzihMasailFullData.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    file_size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"\nSuccessfully generated {out_path}:")
    print(f"Total entries: {len(items)}")
    print(f"File size: {file_size_mb:.2f} MB")
    for v in [1, 2, 3, 4]:
        print(f"  Volume {v}: {by_vol[v]['entries']} entries ({by_vol[v]['issues']} numbered issues)")

    report_path = "src/data/tawzihMasailFullData.report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "totalEntries": len(items),
            "byVolume": by_vol,
            "fileSizeMb": round(file_size_mb, 2)
        }, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    generate()
