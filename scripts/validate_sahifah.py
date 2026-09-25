import json

with open("src/data/sahifahFullData.json", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total items: {len(data)}")
assert len(data) == 54, f"Expected 54 items, got {len(data)}"

for idx, item in enumerate(data):
    num = idx + 1
    item_num = item["num"]
    item_id = item["id"]
    ar_len = len(item["arabicText"].strip())
    fa_len = len(item["persianTranslation"].strip())
    assert item_num == num, f"Item {idx} num mismatch: {item_num} != {num}"
    assert item_id == f"sahifah_{num}", f"Item {idx} id mismatch: {item_id}"
    assert item["title"], f"Item {num} missing title"
    assert ar_len > 100, f"Item {num} arabicText too short: {ar_len}"
    assert fa_len > 100, f"Item {num} persianTranslation too short: {fa_len}"
    assert "{{" not in item["arabicText"], f"Item {num} arabicText contains {{"
    assert "{{" not in item["persianTranslation"], f"Item {num} persianTranslation contains {{"
    assert "<ref" not in item["arabicText"], f"Item {num} arabicText contains <ref"
    assert "<ref" not in item["persianTranslation"], f"Item {num} persianTranslation contains <ref"

print("All 54 items passed all validation assertions!")
print("\nSample lengths:")
for i in [1, 7, 20, 24, 31, 44, 47, 54]:
    it = data[i-1]
    title = it["title"]
    print(f"Dua {i:2d}: AR = {len(it['arabicText'])} chars, FA = {len(it['persianTranslation'])} chars | Title: {title}")
