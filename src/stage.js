import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Renderer, kamera, ışık, sis ve render döngüsü. */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const bg = new THREE.Color('#E4032D');
  scene.background = bg.clone();
  scene.fog = new THREE.Fog(bg.clone(), 13, 30);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, 0, 10);
  const look = new THREE.Vector3();
  scene.add(camera);

  const hemi = new THREE.HemisphereLight('#fff4e6', '#5a0012', 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff2df', 2.1);
  key.position.set(-4, 9, 6);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#ffd2c4', 1.0);
  rim.position.set(6, 3, -6);
  scene.add(rim, rim.target);

  /* hedef renk: arka plan + sis + hemisfer zemin ışığı yumuşakça akar */
  const tgt = bg.clone();
  const tmp = new THREE.Color();
  function setTint(hex) { tgt.set(hex); document.body.style.setProperty('--tier', hex); const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = hex; }

  const tickers = new Set();
  let last = performance.now();
  const size = { w: 1, h: 1, portrait: true };
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.6 ? 50 : w / h < 0.8 ? 46 : 34;
    camera.updateProjectionMatrix();
    size.w = w; size.h = h; size.portrait = h > w;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 3.2);
    scene.background.lerp(tgt, k);
    scene.fog.color.copy(scene.background);
    tmp.copy(scene.background).multiplyScalar(0.55);
    hemi.groundColor.copy(tmp);
    for (const fn of tickers) fn(dt, now / 1000);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return { THREE, renderer, scene, camera, look, size, setTint, onTick: fn => tickers.add(fn), offTick: fn => tickers.delete(fn), key };
}

/** Basit doku yükleyici (ilerleme takibi ile). */
export function createLoader(onProgress) {
  const mgr = new THREE.LoadingManager();
  mgr.onProgress = (_, done, total) => onProgress && onProgress(done / total);
  const tl = new THREE.TextureLoader(mgr);
  const cache = new Map();
  return {
    tex(url) {
      if (cache.has(url)) return cache.get(url);
      const t = tl.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      cache.set(url, t);
      return t;
    },
  };
}

/** Yumuşak yuvarlak gölge dokusu (contact shadow). */
export function blobTexture(inner = 0.0, alpha = 0.55) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 64 * inner, 64, 64, 64);
  gr.addColorStop(0, `rgba(20,0,6,${alpha})`);
  gr.addColorStop(0.55, `rgba(20,0,6,${alpha * 0.45})`);
  gr.addColorStop(1, 'rgba(20,0,6,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
