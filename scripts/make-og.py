"""OG (paylaşım önizlemesi) resmi: public/og-v1.png, 1200x630.
Logo, 3D logonun vektör çiziminden (src/data/logo-shapes.json) büyük ve net çizilir; arkasında koyu yan yüz (3D his).
Çalıştır: python scripts/make-og.py
"""
import io, json, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, S = 1200, 630, 3                      # S: süper örnekleme (kenarlar pürüzsüz)
RED, WINE, CREAM, SIDE = (228, 3, 45), (123, 10, 31), (255, 252, 236), (42, 10, 18)

def font(size, wght):
    f = TTFont(os.path.join(ROOT, 'public/fonts/bricolage-latin.woff2'))
    f.flavor = None
    b = io.BytesIO(); f.save(b); b.seek(0)
    ft = ImageFont.truetype(b, size)
    try:   # değişken font: kalınlık ekseni wght, diğer eksenler varsayılan
        ax = ft.get_variation_axes()
        ft.set_variation_by_axes([wght if a.get('name') in (b'Weight', 'Weight') else a['default'] for a in ax])
    except Exception as e: print('font ekseni:', e)
    return ft

# zemin: kırmızı, kenarlara doğru bordo
bg = Image.new('RGB', (W, H), RED)
vig = Image.new('L', (W, H), 0); d = ImageDraw.Draw(vig)
d.ellipse((-W*.25, -H*.45, W*1.25, H*1.45), fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(160))
bg = Image.composite(bg, Image.new('RGB', (W, H), WINE), vig)

# logo
data = json.load(open(os.path.join(ROOT, 'src/data/logo-shapes.json'), encoding='utf-8'))
pts = [p for s in data['shapes'] for p in s['o']]
minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
LW = 570; sc = LW / (maxx - minx); LH = (maxy - miny) * sc
ox, oy = (W - LW) / 2, (H - LH) / 2 - 30

def logo_layer(fill, dx=0, dy=0):
    im = Image.new('L', (W*S, H*S), 0); g = ImageDraw.Draw(im)
    tr = lambda p: ((ox + (p[0]-minx)*sc + dx) * S, (oy + (maxy-p[1])*sc + dy) * S)   # y yukarı → aşağı
    for s in data['shapes']:
        g.polygon([tr(p) for p in s['o']], fill=255)
        for h in s['h']: g.polygon([tr(p) for p in h], fill=0)
    return im.resize((W, H), Image.LANCZOS)

# yumuşak gölge, koyu yan yüz (katman katman), krem ön yüz
sh = logo_layer(255, 10, 26).filter(ImageFilter.GaussianBlur(18))
bg.paste(Image.new('RGB', (W, H), (40, 0, 8)), (0, 0), sh.point(lambda v: v * .55))
for k in range(8, 0, -1):
    bg.paste(Image.new('RGB', (W, H), SIDE), (0, 0), logo_layer(255, k*.6, k))
bg.paste(Image.new('RGB', (W, H), CREAM), (0, 0), logo_layer(255))

# alt yazı
d = ImageDraw.Draw(bg)
txt = 'GASTROBAR  ·  MENÜ'
f = font(28, 700)
sp = 8   # harf aralığı
widths = [d.textlength(c, font=f) for c in txt]
tw = sum(widths) + sp * (len(txt) - 1)
x, y = (W - tw) / 2, oy + LH + 46
for c, w in zip(txt, widths):
    d.text((x, y), c, font=f, fill=CREAM); x += w + sp

out = os.path.join(ROOT, 'public/og-v1.png')
bg.save(out, optimize=True)
print(out, os.path.getsize(out) // 1024, 'KB')
