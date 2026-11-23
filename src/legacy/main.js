import * as THREE from 'three';
import { gsap } from 'gsap';
import { createStage, createLoader, RM } from './stage.js';
import { createIntro, INTRO_Y } from './intro.js';
import { createTurntables } from './turntable.js';

const $ = s => document.querySelector(s);
const body = document.body;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = p => '₺' + new Intl.NumberFormat('tr-TR').format(p);
const norm = s => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const upper = s => s.toLocaleUpperCase('tr');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const menu = await fetch('/menu.json').then(r => r.json());
const ALL = []; // düz liste (arama)
menu.groups.forEach(g => g.cats.forEach(c => c.items.forEach(it => ALL.push({ it, g, c }))));

/* ============ ARAMA / DÜZ LİSTE (WebGL yoksa yedek görünüm) ============ */
const sList = $('#sList'), qEl = $('#q');
function renderList(q = '') {
  const nq = norm(q.trim());
  let html = '', any = false;
  for (const g of menu.groups) {
    let gh = '';
    for (const c of g.cats) {
      const items = c.items.filter(it => !nq || norm(`${it.name} ${it.desc} ${c.name} ${g.name}`).includes(nq));
      if (!items.length) continue;
      gh += `<p class="s-cat"><i style="background:${c.color}"></i>${esc(c.name)}</p>`;
      gh += items.map(it => `<button class="s-item" type="button" data-id="${it.id}">${it.img ? `<img src="/img/new/${it.img}" alt="" loading="lazy">` : '<span class="s-ph"></span>'}<div><b>${esc(upper(it.name))}${it.size ? ` <small>${esc(it.size)}</small>` : ''}</b>${it.desc ? `<span>${esc(it.desc)}</span>` : ''}</div><em>${money(it.price)}</em></button>`).join('');
    }
    if (gh) { any = true; html += `<h2 class="s-group">${esc(g.name)}</h2>` + gh; }
  }
  sList.innerHTML = any ? html : `<p class="s-empty">“${esc(q)}” için ürün bulunamadı.</p>`;
}
renderList();
let qT;
qEl.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => renderList(qEl.value), 120); });

/* ============ 3D ============ */
let stage;
try {
  stage = createStage($('#gl'));
} catch (e) {
  console.warn('WebGL yok, düz menüye geçildi', e);
  document.documentElement.classList.add('no-gl');
  $('#loader').classList.add('done');
  $('#search').inert = false;
  throw e; // geri kalan 3D kurulumunu durdur
}

await document.fonts.ready.catch(() => {});
await Promise.all([document.fonts.load('800 40px Unbounded'), document.fonts.load('600 16px "Schibsted Grotesk"')]).catch(() => {});

const fill = $('#ldFill');
const loader = createLoader(p => { fill.style.width = Math.round(p * 100) + '%'; });
const intro = createIntro(stage);
const tt = createTurntables(stage, menu, loader);
const { camera, look } = stage;
stage.onTick(intro.tick);
stage.onTick(tt.tick);

/* başlangıç kamerası: logo karşısında */
camera.position.set(0, INTRO_Y, 10);
look.set(0, INTRO_Y, 0);

/* doku yüklemesi: önce ilk iki kat, sonra kalanlar arka planda */
tt.ensure(tt.tiers[0]); tt.ensure(tt.tiers[1]);
let shown = false;
const showApp = () => { if (shown) return; shown = true; $('#loader').classList.add('done'); };
setTimeout(showApp, 3500);
(function waitFirst() {
  const t0 = tt.tiers[0].items.filter(i => i.prod && i.prod.material.map);
  if (t0.every(i => i.prod.material.map.image)) { setTimeout(showApp, 250); setTimeout(() => tt.tiers.forEach(t => tt.ensure(t)), 1200); }
  else setTimeout(waitFirst, 120);
})();

/* ============ DURUM ============ */
const S = { mode: 'intro', k: 0, front: -1 };
const tier = () => tt.tiers[S.k];

/* ——— HUD: sekmeler, çipler, ray ——— */
const tabsEl = $('#tabs'), chipsEl = $('#chips'), rail = $('#rail');
menu.groups.forEach((g, gi) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.dataset.g = gi; b.textContent = g.name.replace('Alkollü İçecek', 'Alkollü');
  tabsEl.appendChild(b);
});
let lastG = null;
tt.tiers.forEach((t, i) => { const d = document.createElement('i'); if (i && tt.tiers[i - 1].grp !== t.grp) d.className = 'gap'; rail.appendChild(d); });

function renderNav() {
  const t = tier();
  const gi = menu.groups.indexOf(t.grp);
  [...tabsEl.children].forEach((b, i) => { b.setAttribute('aria-selected', i === gi); b.tabIndex = i === gi ? 0 : -1; });
  if (lastG !== gi) {
    lastG = gi;
    chipsEl.innerHTML = t.grp.cats.map(c => `<button type="button" class="chip" data-k="${tt.tiers.findIndex(x => x.cat === c)}">${esc(c.name)}</button>`).join('');
  }
  [...chipsEl.children].forEach(ch => {
    const on = +ch.dataset.k === S.k; ch.setAttribute('aria-current', on);
    if (on) chipsEl.scrollTo({ left: ch.offsetLeft - (chipsEl.clientWidth - ch.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
  });
  [...rail.children].forEach((d, i) => d.classList.toggle('on', i === S.k));
  const up = tt.tiers[S.k - 1], dn = tt.tiers[S.k + 1];
  $('#tierUp').hidden = !up; $('#tierUpName').textContent = up ? up.cat.name : '';
  $('#tierDown').hidden = !dn; $('#tierDownName').textContent = dn ? dn.cat.name : '';
}

/* ——— ürün bilgi kartı ——— */
const infoTxt = $('#infoTxt');
let swapT;
function renderInfo(instant) {
  const t = tier(), i = tt.indexOf(t), it = t.cat.items[i];
  S.front = i;
  const put = () => {
    $('#iCat').textContent = t.cat.name;
    $('#iCount').textContent = t.n > 1 ? `${i + 1} / ${t.n}` : '';
    $('#iName').innerHTML = esc(upper(it.name)) + (it.size ? ` <small>${esc(it.size)}</small>` : '');
    $('#iPrice').textContent = money(it.price);
    $('#iDesc').textContent = it.desc || '';
    infoTxt.classList.remove('swap');
  };
  clearTimeout(swapT);
  if (instant || RM) put(); else { infoTxt.classList.add('swap'); swapT = setTimeout(put, 160); }
  $('#prev').style.visibility = $('#next').style.visibility = t.n > 1 ? '' : 'hidden';
  if (S.mode === 'detail') renderDetail();
}
function renderDetail() {
  const t = tier(), it = t.cat.items[tt.indexOf(t)];
  $('#dCat').textContent = `${t.grp.name} · ${t.cat.name}`;
  $('#dName').innerHTML = esc(upper(it.name)) + (it.size ? ` <small>${esc(it.size)}</small>` : '');
  $('#dDesc').textContent = it.desc || '';
  $('#dPrice').textContent = money(it.price);
  $('#dPrev').style.visibility = $('#dNext').style.visibility = t.n > 1 ? '' : 'hidden';
  try { history.replaceState(null, '', '#' + it.id); } catch (e) {}
}

/* ——— kamera uçuşu ——— */
let camTw = null;
function flyCam(pos, lk, dur = 1.1, ease = 'power3.inOut') {
  camTw && camTw.kill();
  if (RM) { camera.position.copy(pos); look.copy(lk); return; }
  const from = { px: camera.position.x, py: camera.position.y, pz: camera.position.z, lx: look.x, ly: look.y, lz: look.z };
  camTw = gsap.to(from, {
    px: pos.x, py: pos.y, pz: pos.z, lx: lk.x, ly: lk.y, lz: lk.z, duration: dur, ease,
    onUpdate: () => { camera.position.set(from.px, from.py, from.pz); look.set(from.lx, from.ly, from.lz); },
  });
  return camTw;
}
const camNow = (detail = S.mode === 'detail') => tt.camFor(S.k, detail);

/* ——— kat (kategori) değiştir ——— */
function goTier(k, opts = {}) {
  k = clamp(k, 0, tt.tiers.length - 1);
  if (k === S.k && !opts.force) return false;
  const dir = Math.sign(k - S.k) || 1;
  S.k = k; tt.active = k;
  tt.ensure(tt.tiers[k]); tt.ensure(tt.tiers[k + 1]); tt.ensure(tt.tiers[k - 1]);
  const t = tier();
  stage.setTint(t.cat.color);
  intro.setFigs(t.grp.key);
  intro.kickFigs(dir * 1.2);
  if (!opts.noCam) { const c = camNow(false); flyCam(c.pos, c.look, Math.min(1.4, 0.8 + Math.abs(opts.jump || 1) * 0.05)); }
  renderNav(); renderInfo();
  return true;
}

/* ============ GEÇİŞ: karşılama ⇄ menü ============ */
function setMode(m) {
  S.mode = m;
  body.classList.toggle('is-intro', m === 'intro');
  body.classList.toggle('is-menu', m === 'menu' || m === 'detail');
  body.classList.toggle('is-detail', m === 'detail');
  body.classList.toggle('is-search', m === 'search');
  $('#intro').inert = m !== 'intro';
  $('#hud').inert = m !== 'menu';
  $('#detail').inert = m !== 'detail';
  $('#search').inert = m !== 'search';
  tt.detail = m === 'detail' ? tt.indexOf(tier()) : -1;
  intro.setMode(m === 'intro' ? 'intro' : 'menu');
}

let gestureShown = false;
function enterMenu(instant) {
  const t = tier();
  stage.setTint(t.cat.color);
  intro.setFigs(t.grp.key);
  renderNav(); renderInfo(true);
  setMode('menu');
  const c = camNow(false);
  if (instant || RM) {
    camera.position.copy(c.pos); look.copy(c.look); intro.st.introVis = 0;
  } else {
    gsap.to(intro.st, { logoScale: 3.2, logoLift: 1.2, duration: 1.2, ease: 'power2.in' });
    gsap.to(intro.st, { introVis: 0, duration: 0.6, delay: 0.55, ease: 'power1.out' });
    flyCam(c.pos, c.look, 1.9, 'power3.inOut');
  }
  if (!gestureShown) {
    gestureShown = true;
    setTimeout(() => body.classList.add('show-gesture'), 1600);
    setTimeout(() => body.classList.remove('show-gesture'), 5200);
  }
}
function goIntro() {
  setMode('intro');
  stage.setTint('#E4032D');
  intro.setFigs('intro');
  gsap.to(intro.st, { logoScale: 1, logoLift: 0, introVis: 1, duration: 1.2, delay: 0.5, ease: 'power3.out' });
  flyCam(new THREE.Vector3(0, INTRO_Y, 10), new THREE.Vector3(0, INTRO_Y, 0), 1.6);
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
}

/* ——— detay ——— */
function openDetail() {
  if (S.mode !== 'menu') return;
  setMode('detail');
  renderDetail();
  const c = camNow(true); flyCam(c.pos, c.look, 0.9);
  setTimeout(() => $('#dClose').focus({ preventScroll: true }), 50);
}
function closeDetail() {
  if (S.mode !== 'detail') return;
  setMode('menu');
  tt.tilt.tx = tt.tilt.ty = 0;
  const c = camNow(false); flyCam(c.pos, c.look, 0.9);
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
}
function step(dir) { tt.nudge(tier(), dir); }

/* ——— arama ——— */
function openSearch() { setMode('search'); setTimeout(() => qEl.focus(), 350); }
function closeSearch() { setMode('menu'); }
sList.addEventListener('click', e => {
  const b = e.target.closest('.s-item'); if (!b) return;
  if (document.documentElement.classList.contains('no-gl')) return;
  const id = b.dataset.id;
  const k = tt.tiers.findIndex(t => t.cat.items.some(it => it.id === id));
  const t = tt.tiers[k], i = t.cat.items.findIndex(it => it.id === id);
  setMode('menu');
  const jump = k - S.k;
  if (!goTier(k, { jump })) renderInfo();
  tt.goItem(t, i);
});

/* ============ GİRDİ ============ */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function castAt(x, y) { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray; }
const canvas = $('#gl');
const P = { id: null, x0: 0, y0: 0, x: 0, y: 0, t0: 0, axis: null, rot0: 0, vx: 0, lastX: 0, lastT: 0 };
function ppuAtFront() {
  const d = camera.position.distanceTo(look);
  return innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d);
}
canvas.addEventListener('pointerdown', e => {
  if (P.id !== null) return;
  P.id = e.pointerId; P.x0 = P.x = P.lastX = e.clientX; P.y0 = P.y = e.clientY; P.t0 = P.lastT = performance.now(); P.axis = null; P.vx = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (S.mode === 'menu') { P.rot0 = tier().rot; body.classList.add('grabbing'); }
  if (S.mode === 'intro') $('#inHint').style.opacity = '0';
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && P.id === null) {
    intro.aim.tx = (e.clientX / innerWidth - 0.5) * 2; intro.aim.ty = (e.clientY / innerHeight - 0.5) * 2;
    if (S.mode === 'menu') { const it = tt.pick(castAt(e.clientX, e.clientY)); body.classList.toggle('pointer', !!it); }
  }
  if (e.pointerId !== P.id) return;
  const dx = e.clientX - P.x, dy = e.clientY - P.y; P.x = e.clientX; P.y = e.clientY;
  const tx = P.x - P.x0, ty = P.y - P.y0;
  if (!P.axis && Math.hypot(tx, ty) > 9) P.axis = Math.abs(tx) > Math.abs(ty) ? 'x' : 'y';
  if (S.mode === 'intro') {
    intro.drag.x = clamp(intro.drag.x + dx / innerWidth * 4.2, -1.4, 1.4);
    intro.drag.y = clamp(intro.drag.y + dy / innerHeight * 2.6, -0.8, 0.8);
  } else if (S.mode === 'menu') {
    const t = tier();
    if (P.axis === 'x') {
      t.dragging = true;
      t.rot = P.rot0 + tx / (t.R * ppuAtFront()) * 1.05;
      const now = performance.now(), ddt = Math.max(1, now - P.lastT);
      P.vx = P.vx * 0.6 + ((e.clientX - P.lastX) / ddt) * 0.4; P.lastX = e.clientX; P.lastT = now;
    } else if (P.axis === 'y') {
      // lastik etkisi: kamera parmağı biraz izler
      const c = camNow(false), off = clamp(ty * 0.006, -1.2, 1.2);
      camTw && camTw.kill();
      camera.position.set(c.pos.x, c.pos.y + off, c.pos.z); look.set(c.look.x, c.look.y + off, c.look.z);
    }
  } else if (S.mode === 'detail') {
    tt.tilt.tx = clamp(tx / (innerWidth * 0.4), -1, 1); tt.tilt.ty = clamp(ty / (innerHeight * 0.3), -1, 1);
  }
});
function endPointer(e) {
  if (e.pointerId !== P.id) return;
  P.id = null; body.classList.remove('grabbing');
  const tx = P.x - P.x0, ty = P.y - P.y0, dt = performance.now() - P.t0;
  const tap = Math.hypot(tx, ty) < 9 && dt < 450;
  if (S.mode === 'intro') { if (tap) intro.hitFig(castAt(P.x, P.y)); return; }
  if (S.mode === 'detail') { tt.tilt.tx = tt.tilt.ty = 0; return; }
  if (S.mode !== 'menu') return;
  const t = tier();
  if (tap) {
    const it = tt.pick(castAt(P.x, P.y));
    if (it) { if (it.i === tt.indexOf(t)) openDetail(); else tt.goItem(t, it.i); }
    else intro.hitFig(castAt(P.x, P.y));
    return;
  }
  if (P.axis === 'x') {
    const radPerMs = P.vx / (t.R * ppuAtFront()) * 1.05;
    tt.release(t, radPerMs * 1000 * 0.35);
  } else if (P.axis === 'y') {
    const v = ty / Math.max(1, dt);
    if (ty < -60 || v < -0.5) { if (!goTier(S.k + 1)) bounce(); }
    else if (ty > 60 || v > 0.5) { if (!goTier(S.k - 1)) bounce(); }
    else bounce();
  }
}
function bounce() { const c = camNow(false); flyCam(c.pos, c.look, 0.6, 'back.out(2)'); }
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

/* tekerlek / trackpad */
let wheelLock = 0, wheelAcc = 0;
window.addEventListener('wheel', e => {
  if (S.mode !== 'menu') return;
  e.preventDefault();
  const now = performance.now();
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    if (now > wheelLock) { tt.nudge(tier(), Math.sign(e.deltaX)); wheelLock = now + 320; }
    return;
  }
  wheelAcc += e.deltaY;
  if (now > wheelLock && Math.abs(wheelAcc) > 40) {
    goTier(S.k + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 750;
  }
}, { passive: false });

/* klavye */
document.addEventListener('keydown', e => {
  if (S.mode === 'search') { if (e.key === 'Escape') closeSearch(); return; }
  if (S.mode === 'intro') { if (e.key === 'Enter' && document.activeElement === document.body) enterMenu(); return; }
  if (e.target.closest && e.target.closest('input')) return;
  if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  else if (S.mode === 'menu' && e.key === 'ArrowDown') { goTier(S.k + 1); e.preventDefault(); }
  else if (S.mode === 'menu' && e.key === 'ArrowUp') { goTier(S.k - 1); e.preventDefault(); }
  else if (e.key === 'Escape' && S.mode === 'detail') closeDetail();
  else if (e.key === 'Enter' && S.mode === 'menu' && document.activeElement === document.body) openDetail();
});

/* jiroskop (telefonu eğince logo ve figürler) */
function onOri(e) { if (e.gamma == null) return; intro.aim.tx = clamp(e.gamma / 26, -1, 1); intro.aim.ty = clamp(((e.beta || 0) - 45) / 26, -1, 1); }
let gyroAsked = false;
function enableGyro() {
  if (gyroAsked) return; gyroAsked = true;
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') DOE.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOri, { passive: true }); }).catch(() => {});
    else if (DOE) addEventListener('deviceorientation', onOri, { passive: true });
  } catch (e) {}
}
if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) enableGyro();
$('#inHint').textContent = ('ontouchstart' in window) ? 'Logoyu sürükle ya da telefonu eğ' : 'Logoyu sürükleyerek çevir';

/* ——— butonlar ——— */
$('#enter').addEventListener('click', () => { enableGyro(); enterMenu(); });
$('#home').addEventListener('click', goIntro);
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#iOpen').addEventListener('click', openDetail);
$('#tierUp').addEventListener('click', () => goTier(S.k - 1));
$('#tierDown').addEventListener('click', () => goTier(S.k + 1));
$('#dClose').addEventListener('click', closeDetail);
$('#dPrev').addEventListener('click', () => step(-1));
$('#dNext').addEventListener('click', () => step(1));
$('#searchBtn').addEventListener('click', openSearch);
$('#sClose').addEventListener('click', closeSearch);
tabsEl.addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  const g = menu.groups[+b.dataset.g];
  const k = tt.tiers.findIndex(t => t.grp === g);
  goTier(k, { jump: k - S.k });
});
chipsEl.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { const k = +b.dataset.k; goTier(k, { jump: k - S.k }); } });

/* öndeki ürün değişince bilgi kartını güncelle */
stage.onTick(() => {
  if (S.mode !== 'menu' && S.mode !== 'detail') return;
  const i = tt.indexOf(tier());
  if (i !== S.front) renderInfo();
});

/* ekran boyutu değişince kamerayı yeniden oturt */
addEventListener('resize', () => {
  if (S.mode === 'intro') return;
  const c = camNow(); camTw && camTw.kill(); camera.position.copy(c.pos); look.copy(c.look);
});

/* ——— açılış: bağlantıdan doğrudan ürün (#id) ——— */
setMode('intro');
const h0 = decodeURIComponent(location.hash.slice(1));
if (h0) {
  const k = tt.tiers.findIndex(t => t.cat.items.some(it => it.id === h0));
  if (k >= 0) {
    S.k = k; tt.active = k; tt.ensure(tt.tiers[k]);
    const t = tt.tiers[k]; tt.goItem(t, t.cat.items.findIndex(it => it.id === h0)); t.rot = t.target;
    enterMenu(true);
  }
}

/* hata ayıklama */
if (/[?&]debug/.test(location.search)) window.__m = { S, tt, stage, intro, goTier, openDetail, enterMenu };
