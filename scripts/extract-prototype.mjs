import fs from 'node:fs';
const html = fs.readFileSync('reference/21gram-menu-3d.html', 'utf8');
const lines = html.split('\n');
fs.mkdirSync('public/fonts', { recursive: true });
fs.mkdirSync('src/data', { recursive: true });
fs.mkdirSync('scripts/.cache/proto', { recursive: true });
// fonts
for (const [name, file] of [['Unbounded', 'unbounded.woff2'], ['Schibsted Grotesk', 'schibsted.woff2']]) {
  const l = lines.find(x => x.includes(`font-family:"${name}";src:url(data:font/woff2;base64,`));
  const b64 = l.match(/base64,([^)]+)\)/)[1];
  fs.writeFileSync('public/fonts/' + file, Buffer.from(b64, 'base64'));
  const meta = l.slice(l.indexOf(')', l.indexOf('base64,')) + 1, l.indexOf('}'));
  console.log(name, 'font', meta);
}
const grab = (prefix) => { const l = lines.find(x => x.trimStart().startsWith(prefix)); return l.trim().slice(prefix.length).replace(/;\s*$/, ''); };
fs.writeFileSync('src/data/logo-shapes.json', grab('var LOGO_SHAPES='));
const logoImg = JSON.parse(grab('var LOGO_IMG='));
fs.writeFileSync('public/img/logo.png', Buffer.from(logoImg.split(',')[1], 'base64'));
fs.writeFileSync('src/data/figs.json', grab('var FIGS='));
const products = JSON.parse(grab('var PRODUCTS='));
for (const p of products) {
  if (p.img) { fs.writeFileSync(`scripts/.cache/proto/${p.id}.webp`, Buffer.from(p.img.split(',')[1], 'base64')); p.img = `${p.id}.webp`; }
}
fs.writeFileSync('scripts/.cache/proto/products.json', JSON.stringify(products, null, 1));
// paper texture
const paper = html.match(/\.paper\{[^}]*url\(data:image\/png;base64,([^)]+)\)/);
if (paper) fs.writeFileSync('public/img/paper.png', Buffer.from(paper[1], 'base64'));
console.log('products', products.length, 'figs', Object.keys(JSON.parse(grab('var FIGS='))));
