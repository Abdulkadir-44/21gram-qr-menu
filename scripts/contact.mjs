import sharp from 'sharp'; import fs from 'node:fs';
const [dir, out, bg = '#888'] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => /\.(jpg|webp|png)$/.test(f)).sort();
const S = 160, cols = 10, rows = Math.ceil(files.length / cols);
const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(dir + '/' + f).resize(S, S, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: (i % cols) * S, top: Math.floor(i / cols) * S })));
await sharp({ create: { width: cols * S, height: rows * S, channels: 4, background: bg } }).composite(comps).png().toFile(out);
console.log(files.length, out);
