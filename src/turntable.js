import * as THREE from 'three';
import { blobTexture, RM } from './stage.js';

export const GAP = 15;           // katlar arası dikey mesafe
const PLATE_R = 0.98;            // tabak yarıçapı
const SPACING = 2.45;            // tabaklar arası yay uzunluğu
const PLATE_TOP = 0.085;

const SAUCE = { 'bas-biber-sos': '#d8642a', 'bas-biber-recel-sos': '#9e1b14', 'dynamite-sos': '#f08a3c', 'truffle-sos': '#5b3b22', 'fake-mac-sos': '#f2a27a' };

/* ——— paylaşılan geometri / malzemeler ——— */
const plateGeo = (() => {
  const p = [[0, 0.03], [0.58, 0.03], [0.62, 0], [0.7, 0], [0.69, 0.035], [0.9, 0.12], [0.98, 0.155], [0.975, 0.17], [0.93, 0.165], [0.7, PLATE_TOP], [0, PLATE_TOP]]
    .map(([x, y]) => new THREE.Vector2(x * PLATE_R, y));
  const g = new THREE.LatheGeometry(p.reverse(), 56);
  g.computeVertexNormals();
  return g;
})();
const plateMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.22, metalness: 0, emissive: '#fffaf0', emissiveIntensity: 0.18 });
const rimGeo = new THREE.TorusGeometry(PLATE_R * 0.955, 0.012, 6, 64);
const shadowTex = blobTexture(0.0, 0.5);
const quad = new THREE.PlaneGeometry(1, 1);
const ramekinGeo = (() => {
  const p = [[0, 0], [0.3, 0], [0.34, 0.04], [0.36, 0.24], [0.33, 0.25], [0.31, 0.06], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(p.reverse(), 40);
})();

/* masa üstü dokusu: krem zemin + kavisli kategori adı */
function tableTexture(name, color, R, Rt) {
  const S = Rt > 5 ? 2048 : 1024, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), c = S / 2, px = c / Rt;
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, '#fffdf2'); gr.addColorStop(0.85, '#f8eed6'); gr.addColorStop(1, '#efe0bd');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = color; g.globalAlpha = 0.9;
  g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 10, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 26, 0, Math.PI * 2); g.stroke();
  // tabak yolunun iç halkası
  g.globalAlpha = 0.22; g.lineWidth = 2; g.setLineDash([6, 10]);
  g.beginPath(); g.arc(c, c, (R + PLATE_R + 0.12) * px, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  // kavisli yazı (tekrar eden)
  const rText = (Rt - 0.42) * px;
  const label = (name.toLocaleUpperCase('tr') + '  ✦  ');
  const fs = 0.36 * px;
  g.font = `800 ${fs}px Unbounded, "Arial Black", sans-serif`;
  g.fillStyle = color; g.globalAlpha = 0.95; g.textAlign = 'center'; g.textBaseline = 'middle';
  const circ = 2 * Math.PI * rText;
  const unit = g.measureText(label).width;
  const reps = Math.max(1, Math.floor(circ / unit));
  const full = label.repeat(reps);
  const scale = circ / (unit * reps);
  let a = -Math.PI / 2;
  for (const ch of full) {
    const w = g.measureText(ch).width * scale;
    a -= (w / 2) / rText;   // ters yönde dizilir: harflerin tabanı dışa bakar, önden okunur
    g.save(); g.translate(c + Math.cos(a) * rText, c + Math.sin(a) * rText); g.rotate(a - Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    a -= (w / 2) / rText;
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function badgeTexture(logoImg, color) {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = color; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,252,236,.25)'; g.lineWidth = 22; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 40, 0, Math.PI * 2); g.stroke();
  const draw = () => { const w = S * 0.66, h = w * logoImg.naturalHeight / logoImg.naturalWidth; g.drawImage(logoImg, (S - w) / 2, (S - h) / 2, w, h); t.needsUpdate = true; };
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  if (logoImg.complete && logoImg.naturalWidth) draw(); else logoImg.addEventListener('load', draw);
  return t;
}

/** Bütün katları (kategori = tabla) kurar. */
export function createTurntables(stage, menu, loader) {
  const { scene, camera } = stage;
  const root = new THREE.Group(); scene.add(root);
  const logoImg = new Image(); logoImg.src = '/img/logo.png';
  const tiers = [];
  let k = 0;
  for (const grp of menu.groups) for (const cat of grp.cats) {
    const n = cat.items.length;
    const ps = n > 10 ? 0.84 : 1;               // kalabalık tablada tabaklar biraz küçülür
    const R = Math.max(2.15, (n * SPACING * ps) / (2 * Math.PI));
    const Rt = R + PLATE_R * ps + 0.85;
    const y = -k * GAP;
    const tier = { k, grp, cat, n, R, Rt, ps, y, step: (Math.PI * 2) / n, rot: 0, rotV: 0, target: 0, dragging: false, items: [], loaded: false, group: new THREE.Group() };
    tier.group.position.y = y;
    root.add(tier.group);

    /* tabla */
    const table = new THREE.Group();
    tier.group.add(table);
    tier.table = table;
    const topTex = tableTexture(cat.name, cat.color, R, Rt);
    const top = new THREE.Mesh(new THREE.CircleGeometry(Rt, 96), new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.55, emissive: '#ffffff', emissiveMap: topTex, emissiveIntensity: 0.45 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.001;
    const sideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cat.color).lerp(new THREE.Color('#2a0a10'), 0.35), roughness: 0.45, metalness: 0.05 });
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(Rt, Rt * 0.97, 0.3, 96, 1, true), sideMat);
    edge.position.y = -0.15;
    const under = new THREE.Mesh(new THREE.CircleGeometry(Rt * 0.97, 64), sideMat);
    under.rotation.x = Math.PI / 2; under.position.y = -0.3;
    table.add(top, edge, under);

    /* tabaklar */
    cat.items.forEach((it, i) => {
      const th = i * tier.step;
      const slot = new THREE.Group();
      slot.position.set(Math.sin(th) * R, 0, Math.cos(th) * R);
      slot.scale.setScalar(ps);
      table.add(slot);
      const lift = new THREE.Group(); slot.add(lift);
      const sh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.scale.setScalar(PLATE_R * 2.5);
      slot.add(sh);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: cat.color, roughness: 0.4 }));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.162;
      lift.add(plate, rim);
      const csh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
      csh.rotation.x = -Math.PI / 2; csh.position.y = PLATE_TOP + 0.004;
      lift.add(csh);
      const bill = new THREE.Group(); bill.position.y = PLATE_TOP; lift.add(bill);
      let prod = null, w = 1, h = 1;
      if (it.img) {
        const asp = it.w / it.h, max = 1.62;
        w = asp >= 1 ? max * 1.08 : max * asp; h = asp >= 1 ? (max * 1.08) / asp : max;
        prod = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.02, depthWrite: true, fog: true, toneMapped: false, opacity: 1 }));
        prod.scale.set(w, h, 1); prod.position.y = h / 2 - 0.1;
        prod.userData.url = '/img/p/' + it.img;
        bill.add(prod);
        csh.scale.set(w * 0.9, 0.55, 1);
      } else if (cat.key === 'soslar') {
        const ram = new THREE.Mesh(ramekinGeo, plateMat);
        ram.scale.setScalar(1.25);
        const sauce = new THREE.Mesh(new THREE.CircleGeometry(0.32 * 1.25, 40), new THREE.MeshStandardMaterial({ color: SAUCE[it.id] || '#c0392b', roughness: 0.25 }));
        sauce.rotation.x = -Math.PI / 2; sauce.position.y = 0.2 * 1.25;
        bill.add(ram, sauce); w = 0.9; h = 0.3;
        csh.scale.set(1.2, 1.2, 1);
      } else {
        prod = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: badgeTexture(logoImg, cat.color), transparent: true, toneMapped: false }));
        prod.scale.set(1.15, 1.15, 1); prod.position.y = 0.62; w = h = 1.15;
        bill.add(prod);
        csh.scale.set(1.0, 0.5, 1);
      }
      tier.items.push({ data: it, i, th, slot, lift, plate, bill, prod, w, h, emph: 0, hit: plate });
    });
    tiers.push(tier);
    k++;
  }

  function ensure(t) {
    if (!t || t.loaded) return;
    t.loaded = true;
    for (const it of t.items) if (it.prod && it.prod.userData.url && !it.prod.material.map) {
      it.prod.material.map = loader.tex(it.prod.userData.url);
      it.prod.material.needsUpdate = true;
    }
  }

  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  /** k katı için kamera konumu (detay modunda öndeki tabağa yakın). */
  function camFor(kk, detail = false, out = { pos: new THREE.Vector3(), look: new THREE.Vector3() }) {
    const t = tiers[kk], port = stage.size.portrait, ex = Math.max(0, t.R - 2.6);
    if (detail) {
      out.pos.set(0, t.y + (port ? 2.0 : 1.7), t.R * 1 + (port ? 5.4 : 3.6));
      out.look.set(port ? 0 : 0.75, t.y + (port ? 0.3 : 0.75), t.R - 0.2);
    } else {
      out.pos.set(0, t.y + (port ? 4.6 : 3.6) - ex * 0.3, t.R + (port ? 7.4 : 5.6) + ex * 1.1);
      out.look.set(0, t.y + (port ? -0.95 : -0.2) + ex * 0.22, t.R - 1.35);
    }
    return out;
  }

  const wp = new THREE.Vector3();
  let active = 0, detailIdx = -1;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  function tick(dt, time) {
    const kk = 1 - Math.exp(-dt * 9);
    for (const t of tiers) {
      const vis = Math.abs(t.k - active) <= 1;
      t.group.visible = vis;
      if (!vis) continue;
      if (!t.dragging) {
        // yay: hedef açıya otur
        const f = RM ? 1 : 1 - Math.exp(-dt * 7.5);
        t.rot += (t.target - t.rot) * f;
      }
      t.table.rotation.y = t.rot;
      const front = indexOf(t);
      for (const it of t.items) {
        const isF = t.k === active && it.i === front;
        const det = isF && detailIdx === it.i;
        it.emph += ((isF ? 1 : 0) - it.emph) * kk;
        // billboard: ürün hep kameraya dönük
        it.slot.getWorldPosition(wp);
        const ang = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
        it.bill.rotation.y = ang - t.rot;
        const bob = RM ? 0 : Math.sin(time * 1.6 + it.i * 1.3) * 0.03;
        it.bill.position.y = PLATE_TOP + bob * it.emph + it.emph * 0.04;
        const s = 0.86 + 0.18 * it.emph;
        it.bill.scale.setScalar(s);
        // detay: tabak kalkar ve parmakla eğilir
        const L = det ? 0.35 : 0;
        it.lift.position.y += (L - it.lift.position.y) * kk;
        if (det) {
          tilt.x += (tilt.tx - tilt.x) * kk; tilt.y += (tilt.ty - tilt.y) * kk;
          it.lift.rotation.x = tilt.y * 0.35; it.lift.rotation.z = -tilt.x * 0.2;
          it.bill.rotation.y += tilt.x * 0.55;
        } else { it.lift.rotation.x *= 1 - kk; it.lift.rotation.z *= 1 - kk; }
      }
    }
  }

  function indexOf(t) { return ((Math.round(-t.rot / t.step) % t.n) + t.n) % t.n; }
  /** öndeki tabağı i yap (en kısa yoldan döner). */
  function goItem(t, i) {
    const cur = indexOf(t);
    let d = i - cur;
    if (d > t.n / 2) d -= t.n; if (d < -t.n / 2) d += t.n;
    t.target = Math.round(-t.rot / t.step) * t.step - d * t.step;
  }
  function nudge(t, dir) { t.target = Math.round(t.target / t.step) * t.step - dir * t.step; }
  function release(t, vel) {
    const proj = t.rot + vel * 0.22;
    t.target = Math.round(proj / t.step) * t.step;
    t.dragging = false;
  }

  const hitList = () => {
    const t = tiers[active];
    return t.items.flatMap(it => [it.plate, it.prod].filter(Boolean).map(m => (m.userData.item = it, m)));
  };
  function pick(ray) {
    const hits = ray.intersectObjects(hitList(), false);
    return hits.length ? hits[0].object.userData.item : null;
  }

  return {
    tiers, root, ensure, camFor, tick, indexOf, goItem, nudge, release, pick, tilt,
    get active() { return active; }, set active(v) { active = v; },
    set detail(v) { detailIdx = v; },
  };
}
