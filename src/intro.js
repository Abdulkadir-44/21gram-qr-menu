import * as THREE from 'three';
import LOGO from './data/logo-shapes.json';
import FIGS from './data/figs.json';
import { RM } from './stage.js';

export const INTRO_Y = 14;

const SETS = {
  intro: ['burger', 'cocktail', 'cup', 'dj', 'fries', 'beer', 'dancerA', 'iced'],
  yiyecek: ['burger', 'fries', 'dancerA', 'burger', 'fries', 'dancerB'],
  'alkollu-icecek': ['cocktail', 'beer', 'dj', 'guitar', 'cocktail', 'runner'],
  icecek: ['cup', 'iced', 'dancerB', 'cup', 'iced', 'dancerA'],
};

/** 3D logo (dünyada, INTRO_Y yüksekliğinde) + kameraya bağlı süzülen figürler. */
export function createIntro(stage) {
  const { scene, camera, size } = stage;

  /* ——— logo ——— */
  const shapes = LOGO.shapes.map(s => {
    const sh = new THREE.Shape(s.o.map(p => new THREE.Vector2(p[0], p[1])));
    s.h.forEach(h => sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1])))));
    return sh;
  });
  const depth = 0.22;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.012, bevelSegments: 3, curveSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  const face = new THREE.MeshStandardMaterial({ color: '#FFFCEC', roughness: 0.38, metalness: 0.0, transparent: true, emissive: '#FFFCEC', emissiveIntensity: 0.32 });
  const side = new THREE.MeshStandardMaterial({ color: '#3a0812', roughness: 0.5, metalness: 0.15, transparent: true });
  const logoMesh = new THREE.Mesh(geo, [face, side]);
  const logo = new THREE.Group();
  logo.add(logoMesh);
  logo.position.set(0, INTRO_Y + 0.35, 0);
  scene.add(logo);

  /* ——— figürler ——— */
  const texCache = {};
  function figTex(name) {
    if (texCache[name]) return texCache[name];
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const im = new Image();
    im.onload = () => { cv.getContext('2d').drawImage(im, 0, 0, 512, 512); tx.needsUpdate = true; };
    im.src = 'data:image/svg+xml;base64,' + btoa(FIGS[name]);
    return (texCache[name] = tx);
  }
  const figRoot = new THREE.Group();
  camera.add(figRoot);
  const quad = new THREE.PlaneGeometry(1, 1);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
  const figs = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const mk = col => new THREE.MeshBasicMaterial({ map: figTex('burger'), color: col, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
    const front = new THREE.Mesh(quad, mk('#FFFCEC')), back = new THREE.Mesh(quad, mk('#45000f'));
    back.position.set(0.035, -0.04, -0.06);
    const g = new THREE.Group(); g.add(back, front); figRoot.add(g);
    figs.push({ g, front, back, z: -(30 + rnd() * 6), u: rnd(), v: rnd(), ph: rnd() * 6.28, sp: 0.5 + rnd() * 0.5, flip: rnd() < 0.5 ? -1 : 1, sz: 0.95 + rnd() * 0.35, a: 0, spin: 0, spinT: 0, kick: 0, name: '' });
  }
  /* yerleşim: ızgara + sapma, merkezi (logo / tabla) boş bırak */
  function layout(mode) {
    figs.forEach((f, i) => {
      const col = i % 4, row = (i / 4) | 0;
      f.u = (col + 0.2 + rnd() * 0.6) / 4;
      f.v = mode === 'intro' ? (row === 0 ? 0.06 + rnd() * 0.2 : 0.62 + rnd() * 0.3) : (row === 0 ? 0.08 + rnd() * 0.22 : 0.3 + rnd() * 0.2);
    });
  }
  let mode = 'intro', setKey = 'intro', fade = 1;
  function setFigs(key) {
    if (key === setKey) return;
    setKey = key; fade = -1; // sön → yeni doku → yan
  }
  function applySet() {
    const list = SETS[setKey] || SETS.intro;
    figs.forEach((f, i) => {
      const n = list[i % list.length];
      f.name = n; f.front.material.map = f.back.material.map = figTex(n);
      f.front.visible = f.back.visible = i < list.length;
    });
    layout(mode);
  }
  applySet();

  /* ——— etkileşim: sürükle / jiroskop / fare ——— */
  const aim = { x: 0, y: 0, tx: 0, ty: 0 }, drag = { x: 0, y: 0 };
  let yaw = 0, pit = 0, time = 0, P = 0; // P: 0 karşılama · 1 menü
  const st = { introVis: 1 };

  function tick(dt) {
    if (!RM) time += dt;
    const k = 1 - Math.exp(-dt * 7);
    aim.x += (aim.tx - aim.x) * k; aim.y += (aim.ty - aim.y) * k;
    drag.x *= Math.exp(-dt * 1.6); drag.y *= Math.exp(-dt * 1.6);

    /* logo boyutu: ekrana göre */
    const dist = 10, vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist, vw = vh * camera.aspect;
    const fit = Math.min(vw * (size.portrait ? 0.84 : 0.5), vh * 0.3 * LOGO.aspect) / LOGO.aspect;
    const ty = THREE.MathUtils.clamp(aim.x * 0.6 + drag.x, -1.3, 1.3), tx = THREE.MathUtils.clamp(aim.y * 0.3 + drag.y, -0.7, 0.7);
    yaw += (ty - yaw) * k; pit += (tx - pit) * k;
    logo.visible = st.introVis > 0.01;
    logo.scale.setScalar(fit * st.logoScale);
    logo.rotation.set(pit + 0.06 + Math.sin(time * 0.45) * 0.05, yaw - 0.18 + Math.sin(time * 0.6) * 0.14, 0);
    logo.position.y = INTRO_Y + 0.35 + Math.sin(time * 0.9) * 0.05 + st.logoLift;
    face.opacity = side.opacity = st.introVis;

    /* figürler */
    if (fade < 0) { fade += dt * 3; if (fade >= 0) { applySet(); fade = 0.001; } }
    else if (fade < 1) fade = Math.min(1, fade + dt * 1.6);
    const fa = Math.abs(fade);
    figs.forEach((f, i) => {
      if (!f.front.visible) return;
      const z = f.z, h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * -z, w = h * camera.aspect;
      f.kick *= Math.exp(-dt * 3);
      const x = (f.u - 0.5) * w * 0.98 + (Math.sin(time * f.sp * 0.5 + f.ph) * 0.35 + aim.x * 0.3) * (-z / 12.5);
      const y = (0.5 - f.v) * h + (Math.sin(time * f.sp * 0.4 + f.ph * 1.3) * 0.3 - aim.y * 0.25 + f.kick) * (-z / 12.5);
      f.g.position.set(x, y, z);
      f.spin += (f.spinT - f.spin) * (1 - Math.exp(-dt * 4));
      f.g.rotation.set(Math.sin(time * 0.37 + f.ph) * 0.15, Math.sin(time * 0.5 + f.ph) * 0.3, Math.sin(time * f.sp * 0.6 + f.ph) * 0.14 + f.spin);
      const s = f.sz * (size.portrait ? 1 : 1.25) * (-z / 12.5);
      f.g.scale.set(s * f.flip, s, 1);
      const base = P < 0.5 ? 0.55 : 0.22;
      f.front.material.opacity = base * fa;
      f.back.material.opacity = base * 0.45 * fa;
    });
  }
  st.logoScale = 1; st.logoLift = 0;

  return {
    logo, figs, aim, drag, st, tick,
    setMode(m) { mode = m; P = m === 'intro' ? 0 : 1; layout(m); },
    setFigs,
    kickFigs(v) { figs.forEach(f => { f.kick += v * (0.6 + Math.random() * 0.8); }); },
    /** dokunulan figür takla atar */
    hitFig(ray) {
      const hits = ray.intersectObjects(figs.filter(f => f.front.visible).map(f => f.front), false);
      if (!hits.length) return false;
      const f = figs.find(x => x.front === hits[0].object);
      f.spinT += Math.PI * 2 * (Math.random() < 0.5 ? -1 : 1); f.kick += 0.6;
      return true;
    },
  };
}
