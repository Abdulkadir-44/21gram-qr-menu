/* ==========================================================
   ÜRÜN 3D MODELİ — detay kartında "3D | Foto" görüntüleyici
   · Model ve okuyucu yalnız gerektiğinde iner (detay açılınca); açılışta hiçbir şey indirilmez.
   · Model kendi etrafında yavaşça döner; tek parmakla çevrilir, bırakınca ~3 sn sonra dönmeye devam eder;
     iki parmak / tekerlek ile sınırlı yakınlaştırma. Altında yumuşak gölge, sıcak ışık, şeffaf arka plan
     (detay kartının kendi rengi görünür).
   · Görüntüleyici yalnız görünürken çizer; kapanınca döngü durur.
   Three.js r128 (global THREE) + GLTFLoader + Meshopt (public/vendor, sürümlü adlar → 1 yıl önbellek)
   ========================================================== */

/* modeli olan ürünler (demo: yalnız Acı Gerçek Smash). Dosya değişirse adındaki -v1 artırılır (önbellek). */
export const MODELS = { 'aci-gercek-smash': '/models/hamburger-v1.glb' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error('yüklenemedi: ' + src));
    document.head.appendChild(s);
  });
}
function waitThree() {
  return new Promise((res) => { (function chk() { if (window.THREE) res(); else setTimeout(chk, 80); })(); });
}
let libP = null;
function ensureLib() {
  if (!libP) libP = waitThree()
    .then(() => loadScript('/vendor/gltfloader-r128.js'))
    .then(() => loadScript('/vendor/meshopt-decoder-r128.js'))
    .then(() => window.MeshoptDecoder && window.MeshoptDecoder.ready);
  return libP;
}
const modelP = {};
function loadModel(url, onProgress) {
  if (!modelP[url]) modelP[url] = ensureLib().then(() => new Promise((res, rej) => {
    const ld = new THREE.GLTFLoader();
    ld.setMeshoptDecoder(window.MeshoptDecoder);
    ld.load(url, (g) => res(g.scene), (e) => { if (e.total && onProgress) onProgress(e.loaded / e.total) }, rej);
  }));
  return modelP[url];
}
/** Detay açılınca arka planda indirmeye başla (gösterme). */
export function prefetchModel(url) { loadModel(url).catch(() => { delete modelP[url]; }); }

/* yumuşak temas gölgesi (radyal degrade doku) */
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(30,4,10,.55)'); g.addColorStop(.55, 'rgba(30,4,10,.22)'); g.addColorStop(1, 'rgba(30,4,10,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createViewer(opts) {
  const getDpr = (opts && opts.getDpr) || (() => Math.min(window.devicePixelRatio || 1, 2));
  /* fotoğrafın kartta kapladığı kutu (piksel); model aynı büyüklükte görünsün diye */
  const fitRect = (opts && opts.fitRect) || (() => null);
  let renderer = null, scene, camera, pivot, shadow, canvas, host = null, url = null, raf = 0, active = false;
  const v = { yaw: .5, pitch: .32, dist: 2, base: 2, auto: true, idleAt: 0, spin: 0 };
  const ptrs = new Map(); let pinch0 = 0, dist0 = 0;

  function init() {
    canvas = document.createElement('canvas'); canvas.className = 'm3d-canvas'; canvas.setAttribute('aria-hidden', 'true');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, .01, 50);
    /* sıcak, iştah açıcı ışık */
    scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a0e0a, .8));
    const key = new THREE.DirectionalLight(0xffeedd, 1.2); key.position.set(1.6, 2.6, 2.2); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc4b0, .45); rim.position.set(-2.2, 1.2, -1.8); scene.add(rim);
    pivot = new THREE.Group(); scene.add(pivot);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

    /* etkileşim: tek parmak çevir, iki parmak/tekerlek yakınlaştır. Detay kartının eğme etkisine geçmesin. */
    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); v.auto = false;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = v.dist; }
    });
    canvas.addEventListener('pointermove', (e) => {
      e.stopPropagation(); const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1) {
        v.yaw -= (e.clientX - p.x) * .012; v.pitch = clamp(v.pitch + (e.clientY - p.y) * .008, -.15, 1.05);
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; v.dist = clamp(dist0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), v.base * .55, v.base * 1.35); }
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (!ptrs.size) v.idleAt = performance.now(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); v.dist = clamp(v.dist * (1 + e.deltaY * .0012), v.base * .55, v.base * 1.35); v.auto = false; v.idleAt = performance.now(); }, { passive: false });
  }

  function size() {
    if (!host) return;
    const r = host.getBoundingClientRect(); if (!r.width) return;
    renderer.setPixelRatio(getDpr()); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    /* dar ekranda modeli sığdır (yatay görüş açısı dikeyden darsa uzaklaş) */
    v.fitMul = camera.aspect < 1 ? 1 / Math.max(.55, camera.aspect) : 1;
    /* FOTOĞRAFLA AYNI BOY — fotoğrafın genişliği/yüksekliği kadar yer kaplayacak kamera uzaklığı
       (dönerken taşmasın diye %8 pay). Fotoğraf ölçülemezse varsayılan sığdırma kalır. */
    const f = fitRect();
    if (f && f.w > 20 && f.h > 20 && v.mw) {
      const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dW = v.mw / (t * camera.aspect * (f.w * .92 / r.width));
      const dH = v.mh / (t * (f.h * .92 / r.height));
      v.base = Math.max(dW, dH, v.rad * 1.9); v.fitMul = 1;
    }
    v.dist = v.base;
  }

  function place(model) {
    pivot.clear(); pivot.add(model);
    const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);                  /* tabana otur, ortala */
    const rad = Math.max(s.x, s.y, s.z) * .5;
    v.mw = Math.max(s.x, s.z); v.mh = s.y;
    v.rad = rad; v.base = rad / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.52; v.dist = v.base;
    v.target = new THREE.Vector3(0, s.y * .5, 0);           /* fotoğrafla aynı merkez */
    shadow.scale.set(Math.max(s.x, s.z) * 1.35, Math.max(s.x, s.z) * 1.35, 1); shadow.position.y = .002;
  }

  function frame(now) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (v.last || now)) / 1000); v.last = now;
    if (!v.auto && !ptrs.size && now - v.idleAt > 3000) v.auto = true;   /* bırakınca ~3 sn sonra yine döner */
    v.spin += ((v.auto ? .45 : 0) - v.spin) * (1 - Math.exp(-dt * 2.5));
    v.yaw += v.spin * dt;
    const d = v.dist * (v.fitMul || 1);
    camera.position.set(Math.sin(v.yaw) * Math.cos(v.pitch) * d, v.target.y + Math.sin(v.pitch) * d, Math.cos(v.yaw) * Math.cos(v.pitch) * d);
    camera.lookAt(v.target);
    renderer.render(scene, camera);
  }

  return {
    /** 3D görünümü göster. onState('loading', oran) · ('ready') · ('error', hata) */
    show(hostEl, modelUrl, onState) {
      host = hostEl; const my = (url = modelUrl);
      onState && onState('loading', 0);
      loadModel(modelUrl, (f) => { if (url === my) onState && onState('loading', f); }).then((scn) => {
        if (url !== my || !host) return;
        if (!renderer) init();
        if (canvas.parentNode !== host) host.appendChild(canvas);
        if (!scn.parent || scn.parent !== pivot) place(scn);
        v.yaw = .5; v.pitch = .32; v.auto = true; v.spin = .45; v.last = 0;
        size(); active = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
        requestAnimationFrame(() => onState && onState('ready'));
      }).catch((err) => { delete modelP[modelUrl]; if (url === my) onState && onState('error', err); });
    },
    hide() { url = null; active = false; cancelAnimationFrame(raf); },
    resize() { if (active) size(); },
  };
}
