"""Hazır şeffaf PNG'leri siteye hazırlar (arka plan kesimi YOK, ürün piksellerine dokunulmaz).
  1) toz: neredeyse tam saydam kenar noktaları (alfa <= 12) silinir
  2) gövde: %99 opak pikseller (alfa >= 245) tam opak yapılır
  3) kırpma: yalnız ürünün etrafındaki boş şeffaf alan atılır
  4) 640x640 kutuya sığdırılır (kenar kararmasın diye önceden çarpılmış alfa ile), WebP (kalite 82, alfa 90)
Dosya adı menüdeki ürün adıyla eşleştirilir; mevcut img/new görseli img/old/onceki/ altına yedeklenir.
Çalıştır: python scripts/prep-realistic.py public/img/new-realistic
"""
import json, os, re, shutil, sys, unicodedata
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
NEW = os.path.join(ROOT, 'public/img/new')
BAK = os.path.join(ROOT, 'public/img/old/onceki')

def key(s):
    s = s.replace('ı', 'i').replace('İ', 'i').lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', s)

def walk(o):
    if isinstance(o, dict):
        if 'name' in o and 'img' in o: yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)

menu = json.load(open(os.path.join(ROOT, 'src/data/menu.json'), encoding='utf-8'))
byname = {key(p['name']): p for p in walk(menu) if p.get('img')}

os.makedirs(BAK, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    if not f.lower().endswith('.png'): continue
    p = byname.get(key(os.path.splitext(f)[0]))
    if not p: print('EŞLEŞMEDİ:', f); continue
    im = Image.open(os.path.join(SRC, f)).convert('RGBA')
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= 12 else (255 if v >= 245 else v))
    im = Image.merge('RGBA', (r, g, b, a))
    im = im.crop(a.point(lambda v: 255 if v > 40 else 0).getbbox())
    im = im.convert('RGBa')                      # önceden çarpılmış alfa: küçültürken kenarda koyu hale çıkmaz
    im.thumbnail((640, 640), Image.LANCZOS)
    im = im.convert('RGBA')
    out = os.path.join(NEW, p['img'])
    if os.path.exists(out) and not os.path.exists(os.path.join(BAK, p['img'])):
        shutil.copy2(out, os.path.join(BAK, p['img']))
    im.save(out, 'WEBP', quality=82, alpha_quality=90, method=6)
    print(f'{f:32} -> {p["img"]:34} {im.size} {os.path.getsize(out)//1024} KB')
