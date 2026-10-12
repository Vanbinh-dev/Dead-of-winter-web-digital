#!/usr/bin/env python3
"""
Tách thẻ ITEM (Dead of Winter) từ ảnh chụp điện thoại -> ảnh từng lá + items.json.

Đặt file này trong thư mục raw/ cùng các ảnh. Chạy:   python extract_items.py
Tuỳ chọn:  --out DIR  --width N  --height N  --raw DIR  --lang eng  --tesseract PATH

Đầu ra (trong OUT_DIR):
  <location>/<tên-raw>_<stt>.png   ảnh từng lá đã tách (resize CARD_W x CARD_H)
  items.json                       dữ liệu thẻ, gom theo location (GỘP vào file cũ)
  done.txt                         ảnh raw đã xử lý thành công (lần sau bỏ qua)
  errors.txt                       ảnh raw lỗi: <tên><TAB><loại lỗi>  (tạo lại mỗi lần chạy)

Quy tắc: mỗi ảnh raw là "tất cả hoặc không có gì" -- chỉ cần 1 lá lỗi thì cả ảnh
bị ghi vào errors.txt, không lưu lá nào, không vào done.txt (lần sau thử lại).
"""
import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import pytesseract

# ═══════════════════════ CẤU HÌNH ═══════════════════════
RAW_DIR = Path(__file__).resolve().parent         # nơi chứa ảnh raw (mặc định: cạnh script)
OUT_DIR = RAW_DIR / "output"                      # nơi xuất
CARD_W, CARD_H = 630, 880                         # kích thước ảnh lá đã tách; đặt 0 để giữ nguyên
OCR_LANG = "eng"
TESSERACT_CMD = None                              # Windows: r"C:\Program Files\Tesseract-OCR\tesseract.exe"

JSON_NAME, ERRORS_NAME, DONE_NAME = "items.json", "errors.txt", "done.txt"
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}

# Giá trị mặc định theo yêu cầu
DEFAULT_SYMBOL = "food"
DEFAULT_NUMBER = 1

# Dò thẻ (xem ghi chú ở find_cards)
DETECT_MAX_SIDE = 1000      # thu nhỏ ảnh về cạnh dài này khi dò
MIN_AREA_RATIO = 0.02       # thẻ phải chiếm >= 2% diện tích ảnh
GROUP_GAP_RATIO = 0.06      # khe tối đa (theo cạnh ngắn ảnh) để gộp các mảnh thành 1 thẻ

# Nghi "chồng lấn" khi hình học vùng tìm được bất thường. LƯU Ý: trên các ảnh đã đo, hình học KHÔNG tách được
# lá đơn khỏi xấp bài (độ lấp đầy/độ đặc đều chồng lên nhau), nên xấp bài thường bị chặn ở bước đọc chữ
# (lỗi "không đọc được tên"/"không rõ địa điểm") chứ không phải ở đây.
ASPECT_RANGE = (0.60, 0.85)  # cạnh ngắn / cạnh dài của 1 lá
MAX_AREA_SPREAD = 1.6        # trong 1 ảnh, lá to hơn 1.6 lần trung vị -> nghi dính nhau

# Bố cục thẻ item: vùng cắt theo TỈ LỆ (y0, y1, x0, x1) của lá đã nắn thẳng, và chế độ đọc (psm).
# Đo từ MỘT lá starter -- cần kiểm tra lại với lá ở địa điểm khác.
LAYOUT = {
    "title":   {"box": (0.575, 0.650, 0.22, 0.66), "psm": 7},
    "ability": {"box": (0.670, 0.780, 0.22, 0.78), "psm": 6},
    "tag":     {"box": (0.905, 0.975, 0.30, 0.70), "psm": 7},
}

# Nhãn dưới thẻ (bỏ khoảng trắng, in hoa) -> location
LOCATIONS = {
    "STARTERITEM": "starter",
    "POLICESTATION": "policeStation",
    "GROCERYSTORE": "groceryStore",
    "SCHOOL": "school",
    "GASSTATION": "gasStation",
    "LIBRARY": "library",
    "HOSPITAL": "hospital",
}
LOCATION_ORDER = ["starter", "policeStation", "groceryStore", "school",
                  "gasStation", "library", "hospital"]

# Loại lỗi ghi vào errors.txt
ERR_UNREADABLE = "không đọc được ảnh"
ERR_NO_CARD = "không thấy thẻ"
ERR_OVERLAP = "chồng lấn"
ERR_NO_NAME = "không đọc được tên"
ERR_NO_LOCATION = "không rõ địa điểm"
ERR_UNKNOWN = "lỗi không xác định"


class PhotoError(Exception):
    """Lỗi của cả một ảnh raw; .reason là nội dung cột 2 trong errors.txt."""
    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


# ═══════════════════════ ẢNH ═══════════════════════
def read_image(path: Path):
    # np.fromfile + imdecode để đọc được đường dẫn có dấu trên Windows
    data = np.fromfile(str(path)    , dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None


def save_image(path: Path, img) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode(path.suffix, img)
    if not ok:
        raise IOError(f"không ghi được {path}")
    buf.tofile(str(path))


def order_points(pts):
    """Sắp 4 điểm: trên-trái, trên-phải, dưới-phải, dưới-trái."""
    pts = np.array(pts, dtype="float32")
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)],
                     pts[np.argmax(s)], pts[np.argmax(d)]], dtype="float32")


def find_cards(img):
    """Tách thẻ theo màu nền (màu nền lấy từ rìa ảnh). Trả về list dict:
    box (4 điểm, toạ độ ảnh gốc), area, aspect (ngắn/dài), fill (độ lấp đầy hình chữ nhật)."""
    scale = min(1.0, DETECT_MAX_SIDE / max(img.shape[:2]))
    small = cv2.resize(img, None, fx=scale, fy=scale) if scale < 1.0 else img

    blur = cv2.GaussianBlur(small, (9, 9), 0)
    lab = cv2.cvtColor(blur, cv2.COLOR_BGR2LAB).astype(np.float32)
    h, w = lab.shape[:2]
    m = max(5, int(min(h, w) * 0.03))
    border = np.concatenate([lab[:m].reshape(-1, 3), lab[-m:].reshape(-1, 3),
                             lab[:, :m].reshape(-1, 3), lab[:, -m:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(lab - bg, axis=2)
    dist8 = np.clip(dist / max(dist.max(), 1e-6) * 255, 0, 255).astype(np.uint8)
    _, mask = cv2.threshold(dist8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 1) lấy các mảnh (tô kín bên trong)
    k_small = max(5, int(min(h, w) * 0.012)) | 1
    ks = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_small, k_small))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, ks)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, ks)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(mask)
    cv2.drawContours(filled, [c for c in contours if cv2.contourArea(c) > h * w * 0.001],
                     -1, 255, thickness=cv2.FILLED)

    # 2) gộp các mảnh ở gần nhau thành một thẻ
    k_big = max(9, int(min(h, w) * GROUP_GAP_RATIO)) | 1
    kb = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_big, k_big))
    groups, _ = cv2.findContours(cv2.dilate(filled, kb), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = h * w * MIN_AREA_RATIO
    found = []
    for g in groups:
        gm = np.zeros_like(mask)
        cv2.drawContours(gm, [g], -1, 255, thickness=cv2.FILLED)
        pts = cv2.findNonZero(cv2.bitwise_and(filled, gm))
        if pts is None or len(pts) < min_area:
            continue
        rect = cv2.minAreaRect(cv2.convexHull(pts))
        rw, rh = rect[1]
        if min(rw, rh) < 1:
            continue
        found.append({
            "box": cv2.boxPoints(rect) / scale,
            "area": float(rw * rh) / (scale * scale),
            "aspect": float(min(rw, rh) / max(rw, rh)),
            "fill": float(len(pts) / (rw * rh)),
        })
    return found


def looks_overlapped(found):
    """Nghi nhiều lá dính/chồng nhau (ước lượng, có thể báo nhầm hoặc bỏ sót)."""
    for c in found:
        if not (ASPECT_RANGE[0] <= c["aspect"] <= ASPECT_RANGE[1]):
            return True
    areas = [c["area"] for c in found]
    return len(areas) > 1 and max(areas) > MAX_AREA_SPREAD * float(np.median(areas))


def reading_order(found, img_h):
    def key(c):
        cx, cy = c["box"].mean(axis=0)
        return (round(cy / (img_h * 0.15)), cx)   # gom theo hàng, rồi trái -> phải
    return sorted(found, key=key)


def warp_card(img, box):
    tl, tr, br, bl = order_points(box)
    w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    m = cv2.getPerspectiveTransform(np.array([tl, tr, br, bl], dtype="float32"), dst)
    return cv2.warpPerspective(img, m, (w, h))


# ═══════════════════════ OCR ═══════════════════════
def orientation_score(card):
    """Tổng độ tin cậy các từ >= 3 chữ cái đọc được (ảnh thu nhỏ cho nhanh)."""
    s = 800 / max(card.shape[:2])
    small = cv2.resize(card, None, fx=s, fy=s) if s < 1 else card
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    d = pytesseract.image_to_data(gray, lang=OCR_LANG, config="--psm 11",
                                  output_type=pytesseract.Output.DICT)
    return sum(float(c) for t, c in zip(d["text"], d["conf"])
               if len(re.sub(r"[^A-Za-z]", "", t)) >= 3 and float(c) > 50)


def auto_orient(card):
    """Thử 4 hướng, chọn hướng đọc được nhiều chữ nhất."""
    cands = [card,
             cv2.rotate(card, cv2.ROTATE_90_CLOCKWISE),
             cv2.rotate(card, cv2.ROTATE_180),
             cv2.rotate(card, cv2.ROTATE_90_COUNTERCLOCKWISE)]
    return cands[int(np.argmax([orientation_score(c) for c in cands]))]


def read_region(card, name):
    spec = LAYOUT[name]
    h, w = card.shape[:2]
    y0, y1, x0, x1 = spec["box"]
    gray = cv2.cvtColor(card[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)], cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray, lang=OCR_LANG, config=f"--psm {spec['psm']}")
    return text.strip().replace("\n", " ")


def clean_name(text):
    """Giữ nguyên nội dung; chỉ bỏ khoảng trắng thừa và ký tự lạ (|, ~, _ ...) ở hai đầu."""
    text = re.sub(r"\s+", " ", text)
    return re.sub(r"^[^A-Za-z0-9]+|[^A-Za-z0-9]+$", "", text)


def match_location(tag_text):
    key = re.sub(r"[^A-Z]", "", tag_text.upper())
    if not key:
        return None
    if key in LOCATIONS:
        return LOCATIONS[key]
    close = difflib.get_close_matches(key, list(LOCATIONS), n=1, cutoff=0.8)
    return LOCATIONS[close[0]] if close else None


def ability_prefix(ability_text):
    """Phần chữ trước dấu ':' đầu tiên (tối đa 15 ký tự), chỉ giữ chữ cái in hoa."""
    head = ability_text.split(":", 1)[0] if ":" in ability_text[:16] else ""
    return re.sub(r"[^A-Z]", "", head.upper())


def similar(a, b, cutoff=0.75):
    return bool(a) and difflib.SequenceMatcher(None, a, b).ratio() >= cutoff


def read_card(card):
    """Đọc 1 lá đã nắn thẳng + đúng hướng -> (location, name, usage, isEquip)."""
    name = clean_name(read_region(card, "title"))
    if not name:
        raise PhotoError(ERR_NO_NAME)
    location = match_location(read_region(card, "tag"))
    if location is None:
        raise PhotoError(ERR_NO_LOCATION)
    prefix = ability_prefix(read_region(card, "ability"))
    is_equip = similar(prefix, "EQUIP")
    usage = "waste" if similar(prefix, "WASTEPILE") else None
    return location, name, usage, is_equip


# ═══════════════════════ JSON / TXT ═══════════════════════
def load_json(path: Path):
    if not path.exists():
        return {"data": []}
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, doc):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)        # ghi nguyên tử: không để lại file JSON dở dang


def group_of(doc, location):
    for g in doc["data"]:
        if g["location"] == location:
            return g
    g = {"location": location, "data": []}
    doc["data"].append(g)
    return g


def next_number(group, location):
    nums = [int(m.group(1)) for c in group["data"]
            if (m := re.fullmatch(rf"{re.escape(location)}-(\d+)", str(c.get("id", ""))))]
    return max(nums, default=0) + 1


def read_lines(path: Path):
    return [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()] \
        if path.exists() else []


# ═══════════════════════ XỬ LÝ ═══════════════════════
def process_photo(path: Path):
    """Đọc cả ảnh; trả về list (location, name, usage, is_equip, ảnh lá). Lỗi -> PhotoError."""
    img = read_image(path)
    if img is None:
        raise PhotoError(ERR_UNREADABLE)
    found = find_cards(img)
    if not found:
        raise PhotoError(ERR_NO_CARD)
    if looks_overlapped(found):
        raise PhotoError(ERR_OVERLAP)
    cards = []
    for c in reading_order(found, img.shape[0]):
        card = auto_orient(warp_card(img, c["box"]))
        cards.append((*read_card(card), card))
    return cards


def commit_photo(path: Path, cards, doc, out_dir: Path):
    """Ghi ảnh lá và thêm bản ghi vào doc (chỉ gọi khi cả ảnh đã đọc thành công)."""
    for i, (location, name, usage, is_equip, card) in enumerate(cards, start=1):
        out_name = f"{path.stem}_{i}.png"
        out_img = cv2.resize(card, (CARD_W, CARD_H), interpolation=cv2.INTER_AREA) \
            if CARD_W > 0 and CARD_H > 0 else card
        save_image(out_dir / location / out_name, out_img)

        link = f"{location}/{out_name}"
        group = group_of(doc, location)
        if any(c.get("linkImage") == link for c in group["data"]):
            continue                                   # đã có (vd lần trước chạy dở) -> không thêm trùng
        group["data"].append({
            "type": "item",
            "id": f"{location}-{next_number(group, location):03d}",
            "name": name,
            "symbol": DEFAULT_SYMBOL,
            "usage": usage,
            "isEquip": is_equip,
            "effect": {"condition": [], "cost": [], "activeEffect": [], "passiveEffect": []},
            "number": DEFAULT_NUMBER,
            "linkImage": link,
        })


def main():
    global RAW_DIR, OUT_DIR, CARD_W, CARD_H, OCR_LANG, TESSERACT_CMD
    ap = argparse.ArgumentParser(description="Tách thẻ item từ ảnh raw và sinh items.json")
    ap.add_argument("--raw", type=Path, default=RAW_DIR)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--width", type=int, default=CARD_W)
    ap.add_argument("--height", type=int, default=CARD_H)
    ap.add_argument("--lang", default=OCR_LANG)
    ap.add_argument("--tesseract", default=TESSERACT_CMD)
    a = ap.parse_args()
    RAW_DIR = a.raw.resolve()
    OUT_DIR = (a.out or (RAW_DIR / "output")).resolve()
    CARD_W, CARD_H, OCR_LANG = a.width, a.height, a.lang
    if a.tesseract:
        pytesseract.pytesseract.tesseract_cmd = a.tesseract

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path, done_path, err_path = OUT_DIR / JSON_NAME, OUT_DIR / DONE_NAME, OUT_DIR / ERRORS_NAME

    done = set(read_lines(done_path))
    doc = load_json(json_path)
    photos = sorted(p for p in RAW_DIR.iterdir()          # chỉ quét ngay trong raw/, không quét thư mục con
                    if p.is_file() and p.suffix.lower() in IMAGE_EXTS)

    errors, n_ok, n_skip = [], 0, 0
    for p in photos:
        if p.name in done:
            n_skip += 1
            continue
        try:
            cards = process_photo(p)
            commit_photo(p, cards, doc, OUT_DIR)
            save_json(json_path, doc)                     # JSON trước, done.txt sau
            with done_path.open("a", encoding="utf-8") as f:
                f.write(p.name + "\n")
            n_ok += 1
            print(f"[OK ] {p.name}: {len(cards)} lá")
        except PhotoError as e:
            errors.append((p.name, e.reason))
            print(f"[ERR] {p.name}: {e.reason}")
        except Exception as e:                            # mọi lỗi còn lại
            errors.append((p.name, ERR_UNKNOWN))
            print(f"[ERR] {p.name}: {ERR_UNKNOWN} ({type(e).__name__}: {e})", file=sys.stderr)

    err_path.write_text("".join(f"{n}\t{r}\n" for n, r in errors), encoding="utf-8")
    print(f"\nXong: {n_ok} ảnh thành công, {len(errors)} ảnh lỗi, {n_skip} ảnh đã xử lý từ trước.")
    print(f"Kết quả: {OUT_DIR}")


if __name__ == "__main__":
    main()
