import urllib.request
import urllib.parse
import json
import re
import sys

def fetch_wikitext(url):
    req = urllib.request.Request(url, headers={"User-Agent": "HooshyarBot/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return data.get("parse", {}).get("wikitext", {}).get("*", "")

def fetch_page_by_title(title):
    url = f"https://fa.wikisource.org/w/api.php?action=parse&page={urllib.parse.quote(title)}&prop=wikitext&format=json"
    return fetch_wikitext(url)

def clean_persian_wikitext(text):
    # Remove HTML tags & comments
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*/>', '', text)
    # Remove categories and interlanguage links
    text = re.sub(r'\[\[(?:Category|تصنيف|رده):[^\]]+\]\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[\[[a-z]{2,3}(?:-[a-z]+)?:[^\]]+\]\]', '', text)
    # Remove templates
    while "{{" in text:
        new_text = re.sub(r'\{\{[^{}]*\}\}', '', text, flags=re.DOTALL)
        if new_text == text:
            break
        text = new_text
    # Remove remaining curly braces if any
    text = re.sub(r'\{\|.*?\|\}', '', text, flags=re.DOTALL)
    # Wiki links
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)
    # Remove section headings like ==...==
    text = re.sub(r'=+\s*[^=\n]+?\s*=+', '', text)
    # Clean leading dashes, bullets, and normalize spaces
    lines = []
    for line in text.split('\n'):
        l = line.strip()
        l = re.sub(r'^[̶\-\*•]+\s*', '', l)
        l = l.strip()
        if l:
            lines.append(l)
    return '\n\n'.join(lines)

def clean_arabic_wikitext(text):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^>]*/>', '', text)
    # Remove categories and interlanguage links
    text = re.sub(r'\[\[(?:Category|تصنيف|رده):[^\]]+\]\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[\[[a-z]{2,3}(?:-[a-z]+)?:[^\]]+\]\]', '', text)
    while "{{" in text:
        new_text = re.sub(r'\{\{[^{}]*\}\}', '', text, flags=re.DOTALL)
        if new_text == text:
            break
        text = new_text
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'=+\s*[^=\n]+?\s*=+', '', text)
    lines = []
    for line in text.split('\n'):
        l = line.strip()
        l = re.sub(r'^[̶\-\*•]+\s*', '', l)
        l = l.strip()
        if l:
            lines.append(l)
    return '\n\n'.join(lines)

# Persian ordinal names
PERSIAN_ORDINALS = [
    'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم',
    'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم', 'شانزدهم', 'هفدهم', 'هجدهم', 'نوزدهم', 'بیستم',
    'بیست و یکم', 'بیست و دوم', 'بیست و سوم', 'بیست و چهارم', 'بیست و پنجم', 'بیست و ششم', 'بیست و هفتم', 'بیست و هشتم', 'بیست و نهم', 'سی‌ام',
    'سی و یکم', 'سی و دوم', 'سی و سوم', 'سی و چهارم', 'سی و پنجم', 'سی و ششم', 'سی و هفتم', 'سی و هشتم', 'سی و نهم', 'چهلم',
    'چهل و یکم', 'چهل و دوم', 'چهل و سوم', 'چهل و چهارم', 'چهل و پنجم', 'چهل و ششم', 'چهل و هفتم', 'چهل و هشتم', 'چهل و نهم', 'پنجاهم',
    'پنجاه و یکم', 'پنجاه و دوم', 'پنجاه و سوم', 'پنجاه و چهارم'
]

# Sahifah Catalog list from shiaBooksData.ts
SAHIFAH_CATALOG = [
  { "id": 'sahifah_1', "num": 1, "title": 'التحمید لله عزّ و جلّ', "desc": 'نیایش اول در ستایش و سپاس حضرت باری‌تعالی' },
  { "id": 'sahifah_2', "num": 2, "title": 'الصلاة علی رسول الله (ص)', "desc": 'نیایش دوم در درود و صلوات بر پیامبر اکرم و آل پاکش' },
  { "id": 'sahifah_3', "num": 3, "title": 'الصلاة علی حملة العرش', "desc": 'نیایش سوم در درود بر فرشتگان حامل عرش و جمیع ملائکه مقرب' },
  { "id": 'sahifah_4', "num": 4, "title": 'الصلاة علی أتباع الرسل و مصدّقیهم', "desc": 'نیایش چهارم در درود بر پیروان پیامبران الهی و مؤمنان راستین' },
  { "id": 'sahifah_5', "num": 5, "title": 'الدعاء لنفسه و لأهل ولایته', "desc": 'نیایش پنجم برای خود و اهل ولایت و دوستان خاندان عصمت' },
  { "id": 'sahifah_6', "num": 6, "title": 'الدعاء عند الصباح و المساء', "desc": 'نیایش ششم هنگام بامدادان و شامگاهان' },
  { "id": 'sahifah_7', "num": 7, "title": 'الدعاء فی المهمات و دفع البلاء', "desc": 'نیایش هفتم در دفع دشواری‌ها، بیماری‌ها، اندوه‌ها و سختی‌های روزگار' },
  { "id": 'sahifah_8', "num": 8, "title": 'الاستعاذة من المکاره و الأخلاق الذمیمة', "desc": 'نیایش هشتم در پناه‌بردن به خداوند از خصلت‌های ناپسند و زشتی‌ها' },
  { "id": 'sahifah_9', "num": 9, "title": 'الاشتیاق إلی طلب المغفرة', "desc": 'نیایش نهم در اشتیاق به آمرزش، توبه و مغفرت الهی' },
  { "id": 'sahifah_10', "num": 10, "title": 'اللجأ إلی الله عزّ و جلّ', "desc": 'نیایش دهم در پناه بردن به ساحت قدس ربوبی' },
  { "id": 'sahifah_11', "num": 11, "title": 'خواتیم الخیر', "desc": 'نیایش یازدهم در طلب فرجام نیک و عاقبت به خیری در دین و دنیا' },
  { "id": 'sahifah_12', "num": 12, "title": 'الاعتراف بالتقصیر', "desc": 'نیایش دوازدهم در اقرار به گناه و کوتاهی در بندگی' },
  { "id": 'sahifah_13', "num": 13, "title": 'طلب الحوائج إلی الله', "desc": 'نیایش سیزدهم در خواستن حاجت‌ها و نیازها تنها از ذات خداوند' },
  { "id": 'sahifah_14', "num": 14, "title": 'الدعاء عند الظلامة', "desc": 'نیایش چهاردهم هنگام ستم دیدن و شکایت بردن به داور دادگر' },
  { "id": 'sahifah_15', "num": 15, "title": 'الدعاء عند المرض و الشدة', "desc": 'نیایش پانزدهم هنگام بیماری و اندوه و رنج جسمانی' },
  { "id": 'sahifah_16', "num": 16, "title": 'طلب الإقالة من الذنوب', "desc": 'نیایش شانزدهم در طلب بخشش لغزش‌ها و گذشت از خطاها' },
  { "id": 'sahifah_17', "num": 17, "title": 'الدعاء بالاستعاذة من الشیطان', "desc": 'نیایش هفدهم در پناه بردن از وسوسه‌ها و نیرنگ‌های ابلیس' },
  { "id": 'sahifah_18', "num": 18, "title": 'الدعاء عند التحذیر أو مخافة المحذور', "desc": 'نیایش هجدهم هنگام بیم از بلا یا رهایی از آسیب‌ها' },
  { "id": 'sahifah_19', "num": 19, "title": 'طلب السقیا عند الجدب', "desc": 'نیایش نوزدهم در طلب باران رحمت در ایام خشکسالی' },
  { "id": 'sahifah_20', "num": 20, "title": 'مکارم الأخلاق و مرضیّ الأفعال', "desc": 'نیایش بیستم در فضایل اخلاقی، سلوک نفسانی و خشنودی خدا (دعای مکارم الاخلاق)' },
  { "id": 'sahifah_21', "num": 21, "title": 'الدعاء إذا حزنه أمر', "desc": 'نیایش بیست و یکم هنگامی که اندوه و غمی پیش آید' },
  { "id": 'sahifah_22', "num": 22, "title": 'الدعاء عند الشدة و الجهد و تعسّر الأمور', "desc": 'نیایش بیست و دوم هنگام سختی‌ها و گره افتادن در کارها' },
  { "id": 'sahifah_23', "num": 23, "title": 'طلب العافیة و شکرها', "desc": 'نیایش بیست و سوم در طلب عافیت تن و روان و شکرگزاری نعمت سلامتی' },
  { "id": 'sahifah_24', "num": 24, "title": 'الدعاء لأبویه (علیهما السلام)', "desc": 'نیایش بیست و چهارم در حق پدر و مادر و گرامی‌داشت حق والدین' },
  { "id": 'sahifah_25', "num": 25, "title": 'الدعاء لولده (علیهم السلام)', "desc": 'نیایش بیست و پنجم در حق فرزندان و نیک‌فرجامی نسل' },
  { "id": 'sahifah_26', "num": 26, "title": 'الدعاء لجیرانه و أولیائه', "desc": 'نیایش بیست و ششم در حق همسایگان، یاران و خویشاوندان' },
  { "id": 'sahifah_27', "num": 27, "title": 'الدعاء لأهل الثغور', "desc": 'نیایش بیست و هفتم در حق مرزداران و پاسداران مرزهای ایمان و کشور' },
  { "id": 'sahifah_28', "num": 28, "title": 'الرهبة و الخوف من عذاب الله', "desc": 'نیایش بیست و هشتم در خشوع و بیم از خشم الهی' },
  { "id": 'sahifah_29', "num": 29, "title": 'الدعاء إذا قتر علیه الرزق', "desc": 'نیایش بیست و نهم هنگام تنگی روزی و رسیدن گشایش اقتصادی' },
  { "id": 'sahifah_30', "num": 30, "title": 'المعونة علی قضاء الدین', "desc": 'نیایش سی‌ام در یاری جستن بر پرداخت وام و ادای قرض‌ها' },
  { "id": 'sahifah_31', "num": 31, "title": 'الدعاء بالتوبة و الإنابة', "desc": 'نیایش سی و یکم در توبه نصوح و بازگشت با اخلاص به سوی خداوند' },
  { "id": 'sahifah_32', "num": 32, "title": 'الدعاء فی صلاة اللیل', "desc": 'نیایش سی و دوم پس از نماز شب و سحرگاهان' },
  { "id": 'sahifah_33', "num": 33, "title": 'طلب الخیرة', "desc": 'نیایش سی و سوم در طلب خیر و راهنمایی در گزینش امور (استخاره)' },
  { "id": 'sahifah_34', "num": 34, "title": 'الدعاء إذا ابتلی أو رأی مبتلی', "desc": 'نیایش سی و چهارم هنگام گرفتاری یا دیدن شخص گرفتار' },
  { "id": 'sahifah_35', "num": 35, "title": 'الرضا بالقضاء', "desc": 'نیایش سی و پنجم در خشنودی به قضای الهی و تسلیم در برابر حکمت او' },
  { "id": 'sahifah_36', "num": 36, "title": 'الدعاء عند سماع الرعد', "desc": 'نیایش سی و ششم هنگام شنیدن غرش رعد و دیدن صاعقه' },
  { "id": 'sahifah_37', "num": 37, "title": 'الدعاء فی الشکر علی النعمة', "desc": 'نیایش سی و هفتم در شکرگزاری از عطایای بی‌کران پروردگار' },
  { "id": 'sahifah_38', "num": 38, "title": 'الاعتذار من تبعات العباد', "desc": 'نیایش سی و هشتم در عذرخواهی از کوتاهی در حق دیگران و ادای حقوق مردم' },
  { "id": 'sahifah_39', "num": 39, "title": 'طلب العفو و الرحمة', "desc": 'نیایش سی و نهم در طلب بخشش و گسترش رحمت الهی' },
  { "id": 'sahifah_40', "num": 40, "title": 'الدعاء عند ذکر الموت', "desc": 'نیایش چهلم هنگام یاد مرگ و آمادگی برای سرای ابدی' },
  { "id": 'sahifah_41', "num": 41, "title": 'طلب الستر و الوقایة', "desc": 'نیایش چهل و یکم در پرده‌پوشی عیوب و امان ماندن از رسوایی' },
  { "id": 'sahifah_42', "num": 42, "title": 'الدعاء عند ختم القرآن', "desc": 'نیایش چهل و دوم هنگام ختم قرآن مجید و تلاوت کتاب الله' },
  { "id": 'sahifah_43', "num": 43, "title": 'الدعاء إذا نظر إلی الهلال', "desc": 'نیایش چهل و سوم هنگام رؤیت هلال ماه نو' },
  { "id": 'sahifah_44', "num": 44, "title": 'الدعاء لدخول شهر رمضان', "desc": 'نیایش چهل و چهارم در پیشواز و ورود به ماه مبارک رمضان' },
  { "id": 'sahifah_45', "num": 45, "title": 'الدعاء لوداع شهر رمضان', "desc": 'نیایش چهل و پنجم در وداع با ماه پربرکت رمضان' },
  { "id": 'sahifah_46', "num": 46, "title": 'الدعاء فی عید الفطر و الجمعة', "desc": 'نیایش چهل و ششم در روز عید فطر و روزهای جمعه' },
  { "id": 'sahifah_47', "num": 47, "title": 'الدعاء فی یوم عرفة', "desc": 'نیایش چهل و هفتم در روز عرفه و مناجات در موقف بندگی' },
  { "id": 'sahifah_48', "num": 48, "title": 'الدعاء فی یوم الأضحی و الجمعة', "desc": 'نیایش چهل و هشتم در روز عید قربان و نماز جمعه' },
  { "id": 'sahifah_49', "num": 49, "title": 'دفع کید الأعداء و رد بأسهم', "desc": 'نیایش چهل و نهم در دفع مکر و شر دشمنان و بدخواهان' },
  { "id": 'sahifah_50', "num": 50, "title": 'الرهبة و التضرع', "desc": 'نیایش پنجاهم در خضوع و زاری در پیشگاه ربوبی' },
  { "id": 'sahifah_51', "num": 51, "title": 'التضرع و الاستکانة', "desc": 'نیایش پنجاه و یکم در فروتنی و شکسته‌نفسی در درگاه الهی' },
  { "id": 'sahifah_52', "num": 52, "title": 'الإلحاح فی المسألة', "desc": 'نیایش پنجاه و دوم در اصرار و پافشاری بر دعا و امیدواری به استجابت' },
  { "id": 'sahifah_53', "num": 53, "title": 'التذلل لله عزّ و جلّ', "desc": 'نیایش پنجاه و سوم در تسلیم محض و بندگی مطلق به درگاه حق' },
  { "id": 'sahifah_54', "num": 54, "title": 'استکشاف الهموم و دفع الأحزان', "desc": 'نیایش پنجاه و چهارم در برطرف شدن اندوه‌ها و گشایش سینه‌ها' }
]

def main():
    print("1. Fetching Arabic Sahifah wikitext...")
    url_ar = "https://ar.wikisource.org/w/api.php?action=parse&page=%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D9%81%D8%A9_%D8%A7%D9%84%D8%B3%D8%AC%D8%A7%D8%AF%D9%8A%D8%A9&prop=wikitext&format=json"
    wikitext_ar = fetch_wikitext(url_ar)

    print("2. Fetching Persian Sahifah wikitext (Mahdi Elahi Ghomshei)...")
    url_fa = "https://fa.wikisource.org/w/api.php?action=parse&page=%D8%B5%D8%AD%DB%8C%D9%81%D9%87_%D8%B3%D8%AC%D8%A7%D8%AF%DB%8C%D9%87&prop=wikitext&format=json"
    wikitext_fa = fetch_wikitext(url_fa)

    print("3. Fetching subpages for Dua 20 and Dua 47...")
    wikitext_dua20 = fetch_page_by_title("دعای مکارم الاخلاق")
    wikitext_dua47 = fetch_page_by_title("دعای روز عرفه امام سجاد علیه السلام")

    # Split Arabic sections
    ar_splits = list(re.finditer(r"(==\s*(?:الدعاء\s*[^\n:=]+|[^=\n]+?)\s*==\s*)", wikitext_ar))
    if len(ar_splits) != 54:
        raise ValueError(f"Expected 54 Arabic sections, found {len(ar_splits)}")

    ar_texts = []
    for i in range(len(ar_splits)):
        start = ar_splits[i].end()
        end = ar_splits[i+1].start() if i+1 < len(ar_splits) else len(wikitext_ar)
        clean_ar = clean_arabic_wikitext(wikitext_ar[start:end])
        ar_texts.append(clean_ar)

    # Split Persian sections
    fa_splits = list(re.finditer(r"(={2,4}\s*نیایش\s*[^\n:=]+:[^\n=]*?\s*={2,4})", wikitext_fa))
    if len(fa_splits) != 54:
        raise ValueError(f"Expected 54 Persian sections, found {len(fa_splits)}")

    end_sources = re.search(r"={2,4}\s*منابع\s*={2,4}", wikitext_fa)
    sources_pos = end_sources.start() if end_sources else len(wikitext_fa)

    fa_texts = []
    for i in range(len(fa_splits)):
        if i == 19: # Dua 20: use full subpage
            clean_fa = clean_persian_wikitext(wikitext_dua20)
        elif i == 46: # Dua 47: use full subpage
            clean_fa = clean_persian_wikitext(wikitext_dua47)
        else:
            start = fa_splits[i].end()
            end = fa_splits[i+1].start() if i+1 < len(fa_splits) else sources_pos
            clean_fa = clean_persian_wikitext(wikitext_fa[start:end])
        fa_texts.append(clean_fa)

    # Build 54 ShiaBookItem objects
    dataset = []
    for idx in range(54):
        num = idx + 1
        cat_info = SAHIFAH_CATALOG[idx]
        ordinal = PERSIAN_ORDINALS[idx]
        title = f"دعای {ordinal}: {cat_info['title']}"
        short_title = cat_info['title']
        desc = cat_info['desc']
        ar_text = ar_texts[idx]
        fa_text = fa_texts[idx]

        item = {
            "id": f"sahifah_{num}",
            "num": num,
            "title": title,
            "shortTitle": short_title,
            "category": "صحیفه سجادیه",
            "description": desc,
            "arabicText": ar_text,
            "persianTranslation": fa_text,
            "virtueOrOccasion": f"نیایش شماره {num} از صحیفه سجادیه حضرت زین‌العابدین (ع)",
            "sourceCitation": f"صحیفه کامله سجادیه، دعای {num} — ترجمه مهدی الهی قمشه‌ای",
            "licenseInfo": "ترجمه: مهدی الهی قمشه‌ای",
            "sourceUrl": "https://fa.wikisource.org/wiki/%D8%B5%D8%AD%DB%8C%D9%81%D9%87_%D8%B3%D8%AC%D8%A7%D8%AF%DB%8C%D9%87"
        }
        dataset.append(item)

    print(f"Generated {len(dataset)} items.")
    out_path = "src/data/sahifahFullData.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    print(f"Saved dataset to {out_path} successfully!")

if __name__ == "__main__":
    main()
