# Birleşik kesim v2: saf beyaz zemin + ona bağlı, içe doğru koyulaşan stüdyo gölgesi zemine katılır
# (kâğıt gibi tekrar açılan beyazlara sızmaz); sınır 1 px içeri alınır → beyaz hale kalmaz
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
d, T, MODE = sys.argv[1], int(sys.argv[2]), sys.argv[3]  # MODE: bowl (gölge silinir) | bowl! (BiRefNet'in ürün sandığı gölge de silinir) | paper (kâğıt korunur)
K = np.ones((3, 3), bool)
for id in sys.argv[4:]:
    rgb = np.asarray(Image.open(f'{d}/src/{id}.png').convert('RGB')).astype(np.int16)
    bir = np.asarray(Image.open(f'{d}/raw/{id}.png'))[..., 3].astype(np.float32)
    mn, mx = rgb.min(2), rgb.max(2); lum = rgb.mean(2).astype(np.float32)
    white = (mn >= T) & (mx - mn <= 14)
    lab, _ = nd.label(white)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    cand = (mx - mn <= 18) & (lum >= 165) & ((bir < 128) | (MODE == 'bowl!'))          # gri-beyaz, BiRefNet'e göre de arkaplan
    it = 0
    for it in range(400 if MODE.startswith('bowl') else 0):
        nb = nd.grey_dilation(np.where(bg, lum, -1), footprint=K)  # komşu zemin pikselinin parlaklığı
        add = cand & ~bg & (nb >= 0) & (lum <= nb + 2.5)           # yalnız aynı/daha koyu ise (gölge) ilerle
        if not add.any(): break
        bg |= add
    bg = nd.binary_dilation(bg, K, iterations=1)                   # 1 px içeri
    soft = nd.gaussian_filter(bg.astype(np.float32), 0.8)
    a = (1 - soft) * 255
    out = np.dstack([rgb.astype(np.uint8), np.clip(a, 0, 255).astype(np.uint8)])
    Image.fromarray(out, 'RGBA').save(f'{d}/hyb/{id}_v2.png'); print('ok', id, it)
