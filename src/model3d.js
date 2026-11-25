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
export const MODELS = {
  'aci-gercek-smash': '/models/hamburger-v1.glb',
  'haspresso-martini': '/models/haspresso-martini-v1.glb',
};
/* YÜKSEK DETAYLI sürümler (güçlü cihaz): renk dokusu 4096 px, yüzey ve pürüzlülük 2048 px, ~310 bin üçgen (~3,2-3,5 MB).
   Zayıf cihaz (app.js WEAK) hafif sürümü (yukarıdaki MODELS) alır: 4K doku ekran kartında ~85 MB yer kaplar. */
export const MODELS_HD = {
  'aci-gercek-smash': '/models/hamburger-hd-v1.glb',
  'haspresso-martini': '/models/haspresso-martini-hd-v1.glb',
};

/* "stüdyo sahnesi" olan modeller: altında krem tabla, tablada ve zeminde gölge, güçlü kenar ışığı.
   (arka plandaki sıcak ışık lekesi CSS'te: .m3d-bg). Martini kendi arka planıyla kalır. */
const STAGED = new Set(['/models/hamburger-v1.glb', '/models/hamburger-hd-v1.glb']);

/* dosya boyları (bayt): sunucu boyu bildirmezse (sıkıştırılmış aktarım) yükleme yüzdesi bununla hesaplanır.
   Model dosyası değişince burayı da güncelle: stat -c %s public/models/*.glb */
const MODEL_BYTES = {
  '/models/hamburger-v1.glb': 1249320,
  '/models/haspresso-martini-v1.glb': 1162856,
  '/models/hamburger-hd-v1.glb': 3545620,
  '/models/haspresso-martini-hd-v1.glb': 3248532,
};

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
    ld.load(url, (g) => res(g.scene), (e) => {
      if (!onProgress) return;
      const tot = e.total || MODEL_BYTES[url];
      if (tot) onProgress(Math.min(.98, e.loaded / tot));
    }, rej);
  }));
  return modelP[url];
}
/** Detay açılınca arka planda indirmeye başla (gösterme). */
export function prefetchModel(url) { loadModel(url).catch(() => { delete modelP[url]; }); }

/* tabak: krem sır üstünde çok ince, seyrek benekler (el yapımı taş seramik); kodla üretilir */
function speckleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  let h = 7; const rnd = () => ((h = (h * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const r = rnd() < .8 ? .7 + rnd() * .8 : 1.4 + rnd() * 1.2;
    x.fillStyle = 'rgba(' + (110 + rnd() * 40 | 0) + ',' + (80 + rnd() * 30 | 0) + ',50,' + (.3 + rnd() * .35).toFixed(2) + ')';
    x.beginPath(); x.arc(rnd() * 256, rnd() * 256, r, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 40; i++) {                       /* sırda hafif ton dalgası */
    x.fillStyle = 'rgba(214,190,150,' + (.03 + rnd() * .04).toFixed(3) + ')';
    x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 18 + rnd() * 30, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1.5);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
/* tabağın sırında görünen sıcak ortam: üstte yumuşak krem ışık, ufukta bir ışık şeridi, altta koyu bordo */
let envTex = null;
function glazeEnv() {
  return envTex || (envTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#e2c08c'); g.addColorStop(.38, '#d9a565'); g.addColorStop(.5, '#e07a3c'); g.addColorStop(.62, '#8e2a1e'); g.addColorStop(1, '#2a0a0e');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(255,246,225,.7)'; x.fillRect(150, 30, 40, 12);   /* pencere ışığı: kenarda parlama */
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    return t;
  })());
}
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
  const look = (opts && opts.look) || 'a';
  let renderer = null, scene, camera, pivot, shadow, canvas, host = null, url = null, raf = 0, active = false;
  let rim, key, hemi, stage, floorShadow;
  const v = { yaw: .5, pitch: .32, dist: 2, base: 2, auto: true, idleAt: 0, spin: 0 };
  /* giriş: model hafif aşağıdan yükselir, %94'ten tam boya gelir ve yarım tur dönerek yerine oturur */
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTRO_MS = 1100, INTRO_TURN = Math.PI;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const ptrs = new Map(); let pinch0 = 0, dist0 = 0;

  function init() {
    canvas = document.createElement('canvas'); canvas.className = 'm3d-canvas'; canvas.setAttribute('aria-hidden', 'true');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene = new THREE.Scene();
    /* tabak yansıması: düz ortam dokusu pürüzlülüğe göre bulanıklaşsın diye PMREM'den geçirilir (bir kez, çok küçük) */
    try { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromEquirectangular(glazeEnv()).texture; pm.dispose(); } catch (e) { /* olmazsa düz doku kalır */ }
    camera = new THREE.PerspectiveCamera(32, 1, .01, 50);
    /* sıcak, iştah açıcı ışık */
    hemi = new THREE.HemisphereLight(0xfff3e4, 0x3a0e0a, .8); scene.add(hemi);
    key = new THREE.DirectionalLight(0xffeedd, 1.2); key.position.set(1.6, 2.6, 2.2); scene.add(key);
    rim = new THREE.DirectionalLight(0xffc4b0, .45); rim.position.set(-2.2, 1.2, -1.8); scene.add(rim);
    pivot = new THREE.Group(); scene.add(pivot);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    /* tabla: krem üst yüz + biraz koyu kenar şeridi; altında zemine düşen geniş yumuşak gölge */
    stage = new THREE.Group();
    /* SERAMİK TABAK — gerçek tabak kesiti etrafında döndürülür (LatheGeometry, yarıçap 1):
       ortada burgerin oturduğu sığ çukur, yükselen yuvarlak kenar, altta ince ayak. Krem sır, hafif benekli
       taş seramik dokusu ve yalnız tabağa uygulanan sıcak ortam yansıması (burger etkilenmez). Dosya inmez. */
    const prof = [[0, 0], [.4, 0], [.58, .004], [.66, .016], [.74, .045], [.82, .082], [.89, .108], [.94, .12],
      [.975, .121], [.997, .112], [1.004, .096], [.995, .082], [.96, .074], [.86, .05], [.74, .016], [.62, -.008],
      [.575, -.022], [.56, -.044], [.53, -.05], [.505, -.042], [.49, -.022], [.3, -.022], [0, -.022]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const plateGeo = new THREE.LatheGeometry(prof, 128);
    plateGeo.computeVertexNormals();
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({
      color: 0xDDC79F, roughness: .55, metalness: 0, map: speckleTexture(), envMap: glazeEnv(), envMapIntensity: .2, side: THREE.DoubleSide,
    }));
    plate.name = 'plate'; stage.add(plate);
    floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: .9 }));
    floorShadow.rotation.x = -Math.PI / 2; stage.add(floorShadow);
    stage.visible = false; scene.add(stage);

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
    /* offsetWidth/Height: detay kartı açılırken küçükten büyür (transform); getBoundingClientRect o anki
       küçük boyu verir ve model aşırı yakın kalırdı. offset* dönüşümden etkilenmez → gerçek boy. */
    const r = { width: host.offsetWidth, height: host.offsetHeight }; if (!r.width) return;
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
    v.sw = Math.max(s.x, s.z); v.sh = s.y;
    v.rad = rad;
  }

  /* sahne ayarı (her gösterimde; aynı görüntüleyici iki modelde de kullanılıyor) */
  function applyStage(staged) {
    const w = v.sw, h = v.sh;
    stage.visible = staged; v.staged = staged;
    if (staged) {
      const R = w * .66, T = R * .17;                    /* tabak yarıçapı; T: kenar yüksekliği + ayak (kesitten) */
      stage.getObjectByName('plate').scale.set(R, R, R);   /* çukurun tabanı y=0: burger tam oturur */
      floorShadow.scale.set(R * 3, R * 3, 1); floorShadow.position.y = -R * .05 - .002;
      shadow.scale.set(w * 1.2, w * 1.2, 1); shadow.material.opacity = 1;
      v.mw = R * 2; v.mh = h + T;                         /* sığdırma: tabla dahil */
      v.target = new THREE.Vector3(0, (h - T) * .5, 0);
      /* ışık: A sıcak stüdyo (varsayılan) · B marka sahnesi (kırmızı zemin) — biraz kısık, ekmek parlamasın */
      hemi.intensity = look === 'b' ? .6 : .52; key.intensity = look === 'b' ? .72 : .66; key.position.set(1.6, 2.6, 2.2);
      rim.intensity = look === 'b' ? .42 : .55; rim.color.set(0xffd2a8); rim.position.set(-2.4, 1.6, -2.2);
    } else {
      shadow.scale.set(w * 1.35, w * 1.35, 1); shadow.material.opacity = 1;
      v.mw = w; v.mh = h;
      v.target = new THREE.Vector3(0, h * .5, 0);          /* fotoğrafla aynı merkez */
      hemi.intensity = .8; key.intensity = 1.2; key.position.set(1.6, 2.6, 2.2); rim.intensity = .45; rim.color.set(0xffc4b0); rim.position.set(-2.2, 1.2, -1.8);
    }
    shadow.position.y = .002;
    v.base = Math.max(v.mw, v.mh) * .5 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.52; v.dist = v.base;
  }

  function frame(now) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (v.last || now)) / 1000); v.last = now;
    if (!v.auto && !ptrs.size && now - v.idleAt > 3000) v.auto = true;   /* bırakınca ~3 sn sonra yine döner */
    v.spin += ((v.auto ? .45 : 0) - v.spin) * (1 - Math.exp(-dt * 2.5));
    v.yaw += v.spin * dt;
    /* giriş animasyonu (dokununca hemen biter) */
    let yawOff = 0;
    if (v.introAt) {
      if (!v.introStart) v.introStart = now;
      const k = Math.min(1, (now - v.introStart) / INTRO_MS), e = easeOut(k);
      yawOff = -INTRO_TURN * (1 - e);
      pivot.position.y = (v.staged ? 1 : -1) * v.sh * .06 * (1 - e);   /* tablada: yukarıdan tablaya iner */ pivot.scale.setScalar(.94 + .06 * e);
      if (k >= 1 || ptrs.size) { v.introAt = 0; pivot.position.y = 0; pivot.scale.setScalar(1); yawOff = 0; }
    }
    const d = v.dist * (v.fitMul || 1), yw = v.yaw + yawOff;
    camera.position.set(Math.sin(yw) * Math.cos(v.pitch) * d, v.target.y + Math.sin(v.pitch) * d, Math.cos(yw) * Math.cos(v.pitch) * d);
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
        applyStage(STAGED.has(modelUrl));
        v.yaw = .5; v.pitch = .32; v.auto = true; v.spin = .45; v.last = 0;
        v.introAt = RM ? 0 : 1; v.introStart = 0; pivot.position.y = 0; pivot.scale.setScalar(RM ? 1 : .94);
        size(); active = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
        requestAnimationFrame(() => onState && onState('ready'));
      }).catch((err) => { delete modelP[modelUrl]; if (url === my) onState && onState('error', err); });
    },
    /** yükleme göstergesi bittikten sonra girişi baştan oynat (model gizliyken giriş boşa geçmesin) */
    replay() { if (!RM && pivot) { v.introAt = 1; v.introStart = 0; pivot.scale.setScalar(.94); } },
    hide() { url = null; active = false; cancelAnimationFrame(raf); },
    resize() { if (active) size(); },
  };
}
