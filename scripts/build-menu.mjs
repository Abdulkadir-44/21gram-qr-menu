import fs from 'node:fs';
const C = 'scripts/.cache/';
const groups = JSON.parse(fs.readFileSync(C + 'groups.json', 'utf8')).data;
const proto = JSON.parse(fs.readFileSync(C + 'proto/products.json', 'utf8'));
fs.mkdirSync(C + 'raw', { recursive: true });
const tr = s => s.toLocaleLowerCase('tr');
const title = s => tr(s).replace(/(^|\s|-)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('tr'));
const slug = s => tr(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// renk dünyaları
const COLORS = {
  'smash-burger': ['#E4032D', 'Kırmızı'], 'tavuk-burger': ['#D9930B', 'Hardal'], 'paylasimlik': ['#E2601C', 'Turuncu'],
  'soslar': ['#B8261A', 'Domates'], 'tatli': ['#5A2A1E', 'Kakao'],
  'house-kokteyl': ['#7B0A1F', 'Bordo'], 'klasik-kokteyl': ['#4B1D52', 'Mürdüm'], 'bira': ['#C27A0E', 'Amber'],
  'yuksek-alkol': ['#2D2440', 'Gece'], 'shot': ['#9C1238', 'Vişne'],
  'soguk-icecek': ['#1F8A84', 'Turkuaz'], 'sicak-icecek': ['#6B3A22', 'Kahve'],
};
const out = { groups: [] };
const downloads = [];
const sortO = (a, b) => (a.order ?? 99) - (b.order ?? 99);
for (const g of [...groups].sort(sortO)) {
  const G = { key: slug(g.name.tr), name: title(g.name.tr), cats: [] };
  for (const c of [...g.children].sort(sortO)) {
    const f = C + `cat-${c.id}.json`;
    const items = JSON.parse(fs.readFileSync(f, 'utf8')).data;
    const key = slug(c.name.tr);
    const C2 = { key, name: title(c.name.tr), color: COLORS[key]?.[0] || '#E4032D', items: [] };
    for (const it of items) {
      const raw = it.name.tr.trim();
      let name = raw, size = '';
      const m = raw.match(/^(.*?)\s+(\d+\s?(?:cl|CL|ml|ML|gr|GR|lt|LT))$/);
      if (m) { name = m[1]; size = m[2].toLowerCase().replace(/\s/, ' '); }
      const id = slug(raw);
      const p = proto.find(x => x.id === id);
      const item = { id, name: p?.name || title(name), size: p?.size || size, price: it.price, desc: (it.description?.tr || '').trim() };
      if (it.image_url) { item.img = id + '.webp'; downloads.push({ id, url: it.image_url, proto: !!p?.img }); }
      else if (p?.img) item.img = id + '.webp';
      C2.items.push(item);
    }
    G.cats.push(C2);
  }
  out.groups.push(G);
}
fs.writeFileSync('src/data/menu.json', JSON.stringify(out, null, 1));
fs.writeFileSync(C + 'downloads.json', JSON.stringify(downloads, null, 1));
let n = 0; for (const g of out.groups) for (const c of g.cats) { n += c.items.length; console.log(g.name, '/', c.name, c.items.length); }
console.log('TOTAL', n, 'images', downloads.length, 'proto-matched', downloads.filter(d => d.proto).length);
// download
await Promise.all(downloads.map(async d => {
  const fp = C + 'raw/' + d.id + '.jpg';
  if (fs.existsSync(fp)) return;
  const r = await fetch(d.url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) { console.log('FAIL', d.id, r.status); return; }
  fs.writeFileSync(fp, Buffer.from(await r.arrayBuffer()));
}));
console.log('downloaded', fs.readdirSync(C + 'raw').length);
