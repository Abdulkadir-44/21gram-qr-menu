import sharp from 'sharp'; import fs from 'node:fs';
const C = 'scripts/.cache/', OUT = 'public/img/p/';
fs.mkdirSync(OUT, { recursive: true });
const downloads = JSON.parse(fs.readFileSync(C + 'downloads.json', 'utf8'));
const STRICT = { 'americano': 251, 'filtre-kahve': 251 }; // id -> eşik (beyaz ürünler için)
async function cut(src, LO = 205) {
  const meta0 = await sharp(src).metadata();
  const { data, info } = await sharp(src).extract({ left: 6, top: 6, width: meta0.width - 12, height: meta0.height - 12 }).extend({ top: 4, bottom: 4, left: 4, right: 4, background: '#ffffff' }).resize(900, 900, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const out = Buffer.alloc(N * 4), seen = new Uint8Array(N), q = new Int32Array(N);
  const bgLike = i => { const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; const mn = Math.min(r,g,b), mx = Math.max(r,g,b); return mn > LO && mx - mn < 22; };
  let h = 0, t = 0;
  for (let x = 0; x < W; x++) for (const y of [0, H-1]) { const i = y*W+x; if (!seen[i] && bgLike(i)) { seen[i] = 1; q[t++] = i; } }
  for (let y = 0; y < H; y++) for (const x of [0, W-1]) { const i = y*W+x; if (!seen[i] && bgLike(i)) { seen[i] = 1; q[t++] = i; } }
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
    for (const j of [x>0?i-1:-1, x<W-1?i+1:-1, y>0?i-W:-1, y<H-1?i+W:-1]) if (j >= 0 && !seen[j] && bgLike(j)) { seen[j] = 1; q[t++] = j; } }
  // kenar bandı: arka plana 3px yakın açık pikseller de yumuşatılır (hale temizliği)
  const bg = new Float32Array(N); for (let i = 0; i < N; i++) bg[i] = seen[i] ? 1 : 0;
  let ring = seen.slice();
  for (let pass = 1; pass <= 3; pass++) {
    const nx = ring.slice();
    for (let i = 0; i < N; i++) if (!ring[i]) { const x = i % W, y = (i / W) | 0;
      if ((x>0&&ring[i-1])||(x<W-1&&ring[i+1])||(y>0&&ring[i-W])||(y<H-1&&ring[i+W])) { nx[i] = 1; bg[i] = 1 - pass * 0.3; } }
    ring = nx;
  }
  for (let i = 0; i < N; i++) {
    const r = data[i*3], g = data[i*3+1], b = data[i*3+2];
    let a = 255, R = r, G = g, B = b;
    if (bg[i] > 0) {
      const mn = Math.min(r, g, b), lo = bg[i] === 1 ? LO : 150;
      let af = (255 - mn) / (255 - lo); af = Math.max(0, Math.min(1, af)); af = bg[i] === 1 ? Math.pow(af, 1.6) * 0.85 : Math.pow(af, 1.4);
      a = Math.round(af * 255);
      if (af > 0.01) { const un = c => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - af)) / af))); R = un(r); G = un(g); B = un(b); } else R = G = B = 0;
    }
    out[i*4] = R; out[i*4+1] = G; out[i*4+2] = B; out[i*4+3] = a;
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 4 }).resize(640, 640, { fit: 'inside' }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
}
let n = 0;
for (const d of downloads) {
  const dst = OUT + d.id + '.webp';
  if (d.proto && fs.existsSync(C + 'proto/' + d.id + '.webp')) { fs.copyFileSync(C + 'proto/' + d.id + '.webp', dst); continue; }
  try { fs.writeFileSync(dst, await cut(C + 'raw/' + d.id + '.jpg', STRICT[d.id] || 205)); n++; } catch (e) { console.log('ERR', d.id, e.message); }
}
// fotoğrafı simprada olmayıp prototipte olan
const menu = JSON.parse(fs.readFileSync('public/menu.json', 'utf8'));
for (const g of menu.groups) for (const c of g.cats) for (const it of c.items) {
  if (!it.img) continue;
  const dst = OUT + it.img;
  if (!fs.existsSync(dst) && fs.existsSync(C + 'proto/' + it.img)) fs.copyFileSync(C + 'proto/' + it.img, dst);
  const m = await sharp(dst).metadata(); it.w = m.width; it.h = m.height;
}
fs.writeFileSync('public/menu.json', JSON.stringify(menu, null, 1));
console.log('cut', n, 'total', fs.readdirSync(OUT).length);
