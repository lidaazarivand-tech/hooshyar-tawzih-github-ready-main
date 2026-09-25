import urllib.request
import json
import re

def fetch_wikitext(url):
    req = urllib.request.Request(url, headers={"User-Agent": "HooshyarBot/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return data.get("parse", {}).get("wikitext", {}).get("*", "")

def clean_wikitext(text):
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*/>', '', text)
    text = re.sub(r'\{\{[^}]*\}\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        line = re.sub(r'^[̶\-\*•]+\s*', '', line)
        line = line.strip()
        if line:
            lines.append(line)
    return '\n'.join(lines)

def main():
    url_ar = "https://ar.wikisource.org/w/api.php?action=parse&page=%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D9%81%D8%A9_%D8%A7%D9%84%D8%B3%D8%AC%D8%A7%D8%AF%D9%8A%D8%A9&prop=wikitext&format=json"
    wikitext_ar = fetch_wikitext(url_ar)

    url_fa = "https://fa.wikisource.org/w/api.php?action=parse&page=%D8%B5%D8%AD%DB%8C%D9%81%D9%87_%D8%B3%D8%AC%D8%A7%D8%AF%DB%8C%D9%87&prop=wikitext&format=json"
    wikitext_fa = fetch_wikitext(url_fa)

    ar_splits = list(re.finditer(r"(==\s*(?:الدعاء\s*[^\n:=]+|[^=\n]+?)\s*==\s*)", wikitext_ar))
    ar_sections = []
    for i in range(len(ar_splits)):
        start = ar_splits[i].end()
        end = ar_splits[i+1].start() if i+1 < len(ar_splits) else len(wikitext_ar)
        ar_sections.append(clean_wikitext(wikitext_ar[start:end]))

    fa_splits = list(re.finditer(r"(={2,4}\s*نیایش\s*[^\n:=]+:[^\n=]*?\s*={2,4})", wikitext_fa))
    end_sources = re.search(r"={2,4}\s*منابع\s*={2,4}", wikitext_fa)
    sources_pos = end_sources.start() if end_sources else len(wikitext_fa)

    fa_sections = []
    for i in range(len(fa_splits)):
        start = fa_splits[i].end()
        end = fa_splits[i+1].start() if i+1 < len(fa_splits) else sources_pos
        fa_sections.append(clean_wikitext(wikitext_fa[start:end]))

    audit_indices = [1, 3, 7, 20, 24, 31, 42, 44, 45, 51, 53, 54]
    for num in audit_indices:
        idx = num - 1
        print(f"\n==================== DUA {num} ====================")
        print(f"AR ({len(ar_sections[idx])} chars):", ar_sections[idx][:150].replace('\n', ' '))
        print(f"FA ({len(fa_sections[idx])} chars):", fa_sections[idx][:150].replace('\n', ' '))

if __name__ == "__main__":
    main()
