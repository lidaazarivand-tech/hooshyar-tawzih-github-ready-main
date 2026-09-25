import urllib.request
import json
import re

def fetch_wikitext(url):
    req = urllib.request.Request(url, headers={"User-Agent": "HooshyarBot/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return data.get("parse", {}).get("wikitext", {}).get("*", "")

def clean_wikitext(text):
    # Remove ref tags
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*/>', '', text)
    # Remove templates like {{...}}
    text = re.sub(r'\{\{[^}]*\}\}', '', text, flags=re.DOTALL)
    # Clean wiki links [[link|display]] -> display, [[link]] -> link
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove leading dashes / bullets often used in wikisource (̶, -, *, •)
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        line = re.sub(r'^[̶\-\*•]+\s*', '', line)
        line = line.strip()
        if line:
            lines.append(line)
    return '\n'.join(lines)

def main():
    print("Fetching Arabic wikitext...")
    url_ar = "https://ar.wikisource.org/w/api.php?action=parse&page=%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D9%81%D8%A9_%D8%A7%D9%84%D8%B3%D8%AC%D8%A7%D8%AF%D9%8A%D8%A9&prop=wikitext&format=json"
    wikitext_ar = fetch_wikitext(url_ar)

    print("Fetching Persian wikitext...")
    url_fa = "https://fa.wikisource.org/w/api.php?action=parse&page=%D8%B5%D8%AD%DB%8C%D9%81%D9%87_%D8%B3%D8%AC%D8%A7%D8%AF%DB%8C%D9%87&prop=wikitext&format=json"
    wikitext_fa = fetch_wikitext(url_fa)

    # Arabic sections: headers are ==الدعاء ...==
    ar_pattern = r"(==\s*(?:الدعاء\s*[^\n:=]+|[^=\n]+?)\s*==\s*)"
    ar_splits = list(re.finditer(ar_pattern, wikitext_ar))
    print(f"Found {len(ar_splits)} Arabic section headers")

    ar_sections = []
    for i in range(len(ar_splits)):
        start = ar_splits[i].end()
        end = ar_splits[i+1].start() if i+1 < len(ar_splits) else len(wikitext_ar)
        header = ar_splits[i].group(0)
        content = wikitext_ar[start:end]
        ar_sections.append((header, content))

    # Persian sections: headers are ===? نیایش ... ===?
    fa_pattern = r"(={2,4}\s*نیایش\s*[^\n:=]+:[^\n=]*?\s*={2,4})"
    fa_splits = list(re.finditer(fa_pattern, wikitext_fa))
    print(f"Found {len(fa_splits)} Persian section headers")

    # Find the end of 54th section in Persian wikitext (usually ==== منابع == or similar)
    end_sources = re.search(r"={2,4}\s*منابع\s*={2,4}", wikitext_fa)
    sources_pos = end_sources.start() if end_sources else len(wikitext_fa)

    fa_sections = []
    for i in range(len(fa_splits)):
        start = fa_splits[i].end()
        end = fa_splits[i+1].start() if i+1 < len(fa_splits) else sources_pos
        header = fa_splits[i].group(0)
        content = wikitext_fa[start:end]
        fa_sections.append((header, content))

    print(f"Processed {len(ar_sections)} AR and {len(fa_sections)} FA sections.")

    # Inspect first and last
    print("--- Dua 1 AR sample ---")
    print(clean_wikitext(ar_sections[0][1])[:300])
    print("--- Dua 1 FA sample ---")
    print(clean_wikitext(fa_sections[0][1])[:300])

    print("--- Dua 54 AR sample ---")
    print(clean_wikitext(ar_sections[53][1])[:300])
    print("--- Dua 54 FA sample ---")
    print(clean_wikitext(fa_sections[53][1])[:300])

if __name__ == "__main__":
    main()
