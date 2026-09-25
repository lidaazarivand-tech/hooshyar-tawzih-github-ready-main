import os
import re
import ssl
import time
import http.client
import threading
import concurrent.futures

CACHE_DIR = "scripts/sistani_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

ctx = ssl.create_default_context()

VOLUMES = [
    (1, "26575", "توضیح المسائل جامع جلد ۱"),
    (2, "26576", "توضیح المسائل جامع جلد ۲"),
    (3, "26577", "توضیح المسائل جامع جلد ۳"),
    (4, "26578", "توضیح المسائل جامع جلد ۴"),
]

thread_local = threading.local()

def get_connection():
    if not hasattr(thread_local, "conn") or thread_local.conn is None:
        thread_local.conn = http.client.HTTPSConnection("www.sistani.org", context=ctx, timeout=15)
    return thread_local.conn

def fetch_path(path, retries=4):
    for attempt in range(retries):
        try:
            conn = get_connection()
            conn.request("GET", path, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Connection": "keep-alive"
            })
            resp = conn.getresponse()
            if resp.status == 200:
                data = resp.read()
                return data.decode("utf-8", errors="replace")
            else:
                resp.read()
                # If error, close connection and retry
                try:
                    conn.close()
                except Exception:
                    pass
                thread_local.conn = None
        except Exception as e:
            try:
                if hasattr(thread_local, "conn") and thread_local.conn:
                    thread_local.conn.close()
            except Exception:
                pass
            thread_local.conn = None
            if attempt == retries - 1:
                print(f"Error fetching {path}: {e}")
                return None
            time.sleep(0.5 + attempt * 0.5)
    return None

def get_toc(vol_num, book_id):
    toc_cache_path = os.path.join(CACHE_DIR, f"toc_{book_id}.html")
    if os.path.exists(toc_cache_path):
        with open(toc_cache_path, "r", encoding="utf-8") as f:
            html = f.read()
    else:
        path = f"/persian/book/{book_id}/"
        print(f"Fetching TOC for volume {vol_num} ({book_id})...")
        html = fetch_path(path)
        if html:
            with open(toc_cache_path, "w", encoding="utf-8") as f:
                f.write(html)
        else:
            raise RuntimeError(f"Could not load TOC for {book_id}")
    
    links = re.findall(rf"href=[\x22\x27](/persian/book/{book_id}/([0-9]+)/)[\x22\x27]>([^<]+)<", html)
    seen = set()
    ordered_links = []
    for full_path, page_id, title in links:
        if page_id not in seen:
            seen.add(page_id)
            ordered_links.append((page_id, title.strip(), full_path))
    print(f"Volume {vol_num} ({book_id}): {len(ordered_links)} unique pages in TOC")
    return ordered_links

def download_page(item):
    vol_num, book_id, page_id, title, path = item
    cache_path = os.path.join(CACHE_DIR, f"{book_id}_{page_id}.html")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        return True
    
    html = fetch_path(path)
    if html and len(html) > 500:
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(html)
        return True
    return False

def main():
    all_pages = []
    for vol_num, book_id, vol_title in VOLUMES:
        links = get_toc(vol_num, book_id)
        for page_id, title, path in links:
            all_pages.append((vol_num, book_id, page_id, title, path))
    
    total = len(all_pages)
    print(f"Total pages across all 4 volumes: {total}")
    
    t0 = time.time()
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        for res in executor.map(download_page, all_pages):
            completed += 1
            if completed % 200 == 0 or completed == total:
                elapsed = time.time() - t0
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"Progress: {completed}/{total} ({completed/total*100:.1f}%) in {elapsed:.1f}s ({rate:.1f} pages/s)", flush=True)

    # Retry any failed or empty pages
    missing = [item for item in all_pages if not (os.path.exists(os.path.join(CACHE_DIR, f"{item[1]}_{item[2]}.html")) and os.path.getsize(os.path.join(CACHE_DIR, f"{item[1]}_{item[2]}.html")) > 500)]
    if missing:
        print(f"Retrying {len(missing)} missing or failed pages...", flush=True)
        time.sleep(2)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            for _ in executor.map(download_page, missing):
                pass

    final_cached = len([f for f in os.listdir(CACHE_DIR) if f.endswith(".html") and not f.startswith("toc_")])
    print(f"Finished! Total cached HTML pages: {final_cached}/{total}", flush=True)

if __name__ == "__main__":
    main()
