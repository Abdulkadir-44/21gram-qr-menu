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

# dosya adı menü adıyla uyuşmayanlar: gelen dosya adı → menüdeki ürün adı (kullanıcı onaylı)
ALIAS = {
    'Soslu çıtır tavuk ve patates tabağı': 'HOLY CHICK',
    'Çıtır tavuk ve patates sunumu': 'Golden Chıck',
    'Soslu peynirli patates kızartması tepsisi': 'Trüflü Parmesanlı Patates Kızartması',
    'Beyaz tabakta gerçekçi tiramisu dilimi': 'TİRAMİSU',
    'Mercan tonlu acılı sos kâsesi': 'DYNAMITE SOS',
    'Beyaz fincanda altın kremalı çift espresso': 'Double Espresso',
    'Beyaz fincanda geleneksel Türk kahvesi': 'TÜRK KAHVESİ',
    'Beyaz fincanda koyu Americano': 'Amerıcano',
    'Beyaz porselen kupada sıcak filtre kahve': 'Filtre Kahve',
    'Metal kapta pembe lahana ve karışık turşu': 'Turşu Tabağı',
    'Metal tepside çıtır patates ve dip sos': 'Patates Kızartması',
    'Çıtır ekmekli kremalı dip sunumu': 'Zahter Dıp',
}
ALIAS = {key(k): key(v) for k, v in ALIAS.items()}

menu = json.load(open(os.path.join(ROOT, 'src/data/menu.json'), encoding='utf-8'))
byname = {key(p['name']): p for p in walk(menu) if p.get('img')}

os.makedirs(BAK, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    if not f.lower().endswith('.png'): continue
    k = key(os.path.splitext(f)[0]); p = byname.get(ALIAS.get(k, k))
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

# menu.json'daki w/h değerlerini yeni görsellerin gerçek boyuna eşitle (kartlar ve sıcak içecek ortalaması bunu kullanır)
mp = os.path.join(ROOT, 'src/data/menu.json')
txt = open(mp, encoding='utf-8').read()
def _fix(m):
    f = os.path.join(NEW, m.group(2))
    if not os.path.exists(f): return m.group(0)
    W, H = Image.open(f).size
    return m.group(1) + m.group(2) + m.group(3) + str(W) + m.group(5) + str(H)
txt2 = re.sub(r'("img": ")([^"]+)(",\s*"w": )(\d+)(,\s*"h": )(\d+)', _fix, txt)
if txt2 != txt:
    open(mp, 'w', encoding='utf-8', newline='').write(txt2); print('menu.json w/h güncellendi')
