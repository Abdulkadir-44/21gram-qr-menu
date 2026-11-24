/* ==========================================================
   21 Gram Gastrobar — 3D QR menü
   Mantık ve animasyonlar referans tasarımdan (reference/21gram-menu-3d.html) birebir alındı.
   Veri: src/data/menu.json · Tema: src/theme.css · 3D: Three.js r128 (public/vendor)
   ========================================================== */
import LOGO_SHAPES from './data/logo-shapes.json';
import FIGS_DATA from './data/figs.json';
import { ARMY_SVG, ARMY_KIND } from './data/army-figs.js';
import { MODELS, createViewer, prefetchModel } from './model3d.js';

/* fotoğraflar yeniden kesildiğinde artır (tarayıcı önbelleğini kırar) */
const IMG_V = 10;
/* menü verisi pakete gömülü (ayrı istek ve bekleme yok); src/data/menu.json değişince build yeniden alır */
import menu from './data/menu.json';

/* menu.json → referanstaki düz ürün listesi biçimi */
const PRODUCTS = [];
/* kategori → kart türü (yemeğe göre farklı kart tasarımı). Listede olmayanlar klasik kartı kullanır. */
const KIND = { 'smash-burger': 'burger', 'tavuk-burger': 'burger', 'house-kokteyl': 'cocktail', 'klasik-kokteyl': 'cocktail',
  'bira': 'beer', 'yuksek-alkol': 'spirit', 'shot': 'shot',
  'soguk-icecek': 'soft', 'sicak-icecek': 'hot',
  'paylasimlik': 'share', 'soslar': 'sauce', 'tatli': 'dessert' };
menu.groups.forEach(g => g.cats.forEach(c => c.items.forEach((it, n) => PRODUCTS.push({
  group: g.name, groupKey: g.key, category: c.name, catKey: c.key,
  id: it.id, price: it.price, desc: it.desc, name: it.name, size: it.size,
  img: it.img ? '/img/new/' + it.img + '?v=' + IMG_V : '', w: it.w, h: it.h,
  kind: KIND[c.key] || 'classic', no: n + 1,
}))));

/* burger kartı: açıklamadaki malzemeleri "kat" rengine eşle */
const LAYER_COLORS = [
  [/trüf|truffle/, '#3B2A1E'], [/tavuk|chicken|chick/, '#C9861A'], [/smash|köfte|dana|\bet\b/, '#6B3A22'],
  [/cheese|cheddar|peynir|parmesan/, '#F2B705'], [/mayo|ranch/, '#E6CF95'], [/ketçap|reçel|dynamite|acı|sos/, '#E4032D'],
  [/soğan/, '#8E3B7A'], [/gürkens|turşu|marul|jalapeno|biber|salata/, '#5E8C31'], [/patates/, '#E3A33A'],
];
/* kokteyl kartı: isim + tariften baz içkiyi bul */
const SPIRITS = [
  [/long island/, 'KARIŞIK İÇKİ'], [/jäger|jager/, 'JÄGERMEISTER BAZLI'], [/mezcal/, 'MEZCAL BAZLI'], [/negroni|\bgin\b|\bcin\b|beefeat|hendrick|tanqueray|malfy/, 'CİN BAZLI'],
  [/vodka|votka|absolut/, 'VOTKA BAZLI'], [/whisky|viski|jack daniel|jameson|bourbon/, 'VİSKİ BAZLI'],
  [/tekila|tequila|margar|casamigos|olmeca/, 'TEKİLA BAZLI'], [/\brom\b|\brum\b|bacardi/, 'ROM BAZLI'],
];
const spiritOf = p => { const t = (p.name + ' ' + (p.desc || '')).toLocaleLowerCase('tr').replace(/ı/g, 'i'); for (const [re, s] of SPIRITS) if (re.test(t)) return s; return ''; };
const layerColor = s => { const t = s.toLocaleLowerCase('tr').replace(/ı/g, 'i'); for (const [re, c] of LAYER_COLORS) if (re.test(t)) return c; return '#B08968'; };
const LOGO_IMG = '/img/logo.png';

/* tema: renkler theme.css'ten okunur (3D sahne de aynı değerleri kullanır) */
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const T = { cream: cssVar('--cream') || '#FFFCEC', logoSide: cssVar('--logo-side') || '#2a0a12', figShadow: cssVar('--fig-shadow') || '#45000f' };
const groupColor = key => cssVar('--g-' + key) || cssVar('--red') || '#E4032D';

(function(){
'use strict';
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s){return document.querySelector(s)};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var ss=function(a,b,x){x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
var ease=function(k){return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var money=function(p){return '₺'+new Intl.NumberFormat('tr-TR').format(p)};
var norm=function(s){return s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i')};

/* ——— veri ——— */
var GROUPS=[];
PRODUCTS.forEach(function(p){
  var g=GROUPS.find(function(x){return x.key===p.groupKey});
  if(!g){g={key:p.groupKey,name:p.group,cats:[]};GROUPS.push(g)}
  var c=g.cats.find(function(x){return x.key===p.catKey});
  if(!c){c={key:p.catKey,name:p.category,items:[]};g.cats.push(c)}
  c.items.push(p);
});
var BYID={};PRODUCTS.forEach(function(p){BYID[p.id]=p});
/* TASARIM V2 — burger, paylaşımlık, sos, kokteyl ve shot kartları */
function isV2(p){return p.kind==='burger'||p.kind==='share'||p.kind==='sauce'||p.kind==='cocktail'||p.kind==='shot'}
/* pop-up (kart çevrilerek açılan detay): v2 kartları + tatlı, bira, yüksek alkol, soğuk ve sıcak içecek */
function isPop(p){return isV2(p)||p.kind==='dessert'||p.kind==='beer'||p.kind==='spirit'||p.kind==='soft'||p.kind==='hot'}
/* "21GRAM" filigranı: kartın boş yerlerine rastgele dağılır.
   Yerleşim kart çizildikten sonra ölçülerek yapılır: ürün görseli, ad, fiyat bileti,
   malzemeler ve alt satırın kutuları engel sayılır; yazılar ne bunlara ne birbirine değer.
   Rastgelelik ürün kimliğinden tohumlanır → her açılışta aynı dağılım. */
/* kullanılmıyor: kartlardaki 21GRAM deseni artık kâğıt dokusundan (img/paper.png) geliyor */
function wmHTML(p){return '<span class="wm" aria-hidden="true" data-seed="'+esc(p.id)+'"></span>'}
function boxIn(el,root){var x=0,y=0,e=el;while(e&&e!==root){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent}return {x:x,y:y,w:el.offsetWidth,h:el.offsetHeight}}
function layoutWM(root){
  [].forEach.call(root.querySelectorAll('.wm[data-seed]'),function(wm){
    var paper=wm.parentNode,card=paper.closest('.card-in');if(!card||!paper.offsetWidth)return;
    var P=boxIn(paper,card),W=P.w,H=P.h,pad=5;
    var obs=[].map.call(card.querySelectorAll('.prod,.ph,.cat span,.name,.ticket,.layers li,.cta,.more,.mascot-lane'),function(el){
      var b=boxIn(el,card);return {x:b.x-P.x-pad,y:b.y-P.y-pad,w:b.w+pad*2,h:b.h+pad*2}});
    var id=wm.dataset.seed,h=0;for(var k=0;k<id.length;k++)h=(h*31+id.charCodeAt(k))>>>0;
    var rnd=function(){h=(h*1664525+1013904223)>>>0;return h/4294967296};
    var hit=function(a,b){return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h};
    wm.innerHTML='';var placed=0,logo=!!card.closest('.fit');
    var size=function(fs,rot){var rr=rot*Math.PI/180,tw=fs*(logo?7.2:6.4),th=logo?tw*105/500:fs;
      return {w:tw*Math.abs(Math.cos(rr))+th*Math.abs(Math.sin(rr)),h:tw*Math.abs(Math.sin(rr))+th*Math.abs(Math.cos(rr))}};
    var put=function(cx,cy,fs,rot){var z=size(fs,rot),b={x:cx-z.w/2,y:cy-z.h/2,w:z.w,h:z.h};
      if(obs.some(function(o){return hit(b,o)}))return false;
      obs.push({x:b.x-14,y:b.y-14,w:b.w+28,h:b.h+28});
      var i=document.createElement('i');
      if(logo){i.className='lg';i.style.cssText='left:'+cx.toFixed(1)+'px;top:'+cy.toFixed(1)+'px;--r:'+rot+'deg;width:'+(fs*7.2).toFixed(1)+'px;height:'+(fs*7.2*105/500).toFixed(1)+'px'}
      else{i.textContent='21GRAM';i.style.cssText='left:'+cx.toFixed(1)+'px;top:'+cy.toFixed(1)+'px;--r:'+rot+'deg;--s:'+fs+'px'}
      wm.appendChild(i);placed++;return true};
    /* logo modu: rastgele değil, görselin dört köşesinde birer eğik logo
       (sol üst, sağ üst, sol alt, sağ alt); eğim ±10–25° ürün kimliğinden tohumlanır */
    if(logo){
      var im=card.querySelector('.prod,.ph');if(!im)return;
      if(im.tagName==='IMG'&&!im.complete){im.addEventListener('load',function(){layoutWM(card)},{once:true});return}
      var I=boxIn(im,card),ix=I.x-P.x,iy=I.y-P.y,top=Math.max(20,iy),bot=Math.min(H-40,iy+I.h);
      var L=7.2*10,T=L*105/500,cx=function(x){return Math.max(L*.42,Math.min(W-L*.42,x))};
      var ang=function(sg){return Math.round(sg*(10+rnd()*15))};
      /* dar görselde (kokteyl bardağı) logolar görselin dış kenarına kayar, görselin arkasında kalmaz */
      var nar=I.w<W*.6,lx=nar?ix-L*.28:ix+14,rx=nar?ix+I.w+L*.28:ix+I.w-14,lx2=nar?lx:ix+18,rx2=nar?rx:ix+I.w-18;
      [[cx(lx),top+6,ang(-1)],[cx(rx),top+12,ang(1)],[cx(lx2),bot-12,ang(1)],[cx(rx2),bot-6,ang(-1)]].forEach(function(q){
        var e=document.createElement('i');e.className='lg';
        e.style.cssText='left:'+q[0].toFixed(1)+'px;top:'+q[1].toFixed(1)+'px;--r:'+q[2]+'deg;width:'+L.toFixed(1)+'px;height:'+T.toFixed(1)+'px';
        wm.appendChild(e);
      });
      return;
    }
    /* alt satırın ortası ("3D gör" ile ok düğmesi arası) sabit bir yer */
    var cta=card.querySelector('.cta'),mo=card.querySelector('.more');
    if(cta&&mo&&!card.querySelector('.mascot-lane')){ /* maskotun yürüdüğü satıra filigran koyma */var a=boxIn(cta,card),m=boxIn(mo,card);
      put((a.x+a.w+m.x)/2-P.x,m.y+m.h/2-P.y,13,Math.round(rnd()*16-8))}
    for(var t=0;t<500&&placed<7;t++){
      var fs=9+Math.round(rnd()*6),rot=Math.round(rnd()*50-25),z=size(fs,rot);
      put(10+z.w/2+rnd()*(W-20-z.w),12+z.h/2+rnd()*(H-30-z.h),fs,rot);
    }
  });
}
/* İÇİNDEKİLER 2 SATIR — tüm malzemeler çizilir, ölçülür; 3. satıra taşanlar gizlenir ve
   2. satırın sonuna "+N" eklenir ("+N" sığmazsa bir malzeme daha gizlenir). */
/* liste boyutu herhangi bir nedenle değişirse (yazı tipi geç yüklendi, ekran döndü…) yeniden kırp */
/* yalnız GENİŞLİK değişince yeniden kırp (kendi gizle/göster işlemimizin yarattığı yükseklik değişimi döngü yapmasın) */
var lastW=new WeakMap(),layersRO=window.ResizeObserver?new ResizeObserver(function(es){es.forEach(function(e){
  var w=Math.round(e.contentRect.width);if(lastW.get(e.target)===w)return;lastW.set(e.target,w);fitOne(e.target)})}):null;
/* Tüm listeler toplu işlenir: önce hepsine yaz (gizlileri aç, sona ölçüm için "+N" koy), sonra hepsini
   tek seferde ölç, kesim noktasını hesapla, en son hepsine yaz. Eskiden her deneme sayfayı yeniden ölçtürüyordu
   (23 kartta ~200 ms); şimdi tek ölçüm. Sonuç aynı: en fazla 2 satır, taşanlar 2. satırın sonunda "+N". */
function fitLayers(root){
  var uls=[].filter.call(root.querySelectorAll('.layers[data-max2]'),function(ul){if(layersRO&&!ul._ro){ul._ro=1;layersRO.observe(ul)}return true});
  fitBatch(uls);
}
function fitOne(ul){fitBatch([ul])}
function fitBatch(uls){
  /* 1) yaz: eski durumu sıfırla */
  var jobs=uls.map(function(ul){
    var lis=[].slice.call(ul.querySelectorAll('li:not(.more-l)'));
    var m=ul.querySelector('.more-l')||document.createElement('li');m.className='more-l';
    lis.forEach(function(li){li.hidden=false});
    m.textContent='+'+lis.length;ul.appendChild(m);              /* en geniş olası "+N" ile ölç */
    return {ul:ul,lis:lis,m:m};
  });
  /* 2) oku: tek düzen hesabı */
  jobs.forEach(function(j){
    if(!j.ul.offsetWidth){j.skip=1;return}
    var cs=getComputedStyle(j.ul),ur=j.ul.getBoundingClientRect();
    j.cw=ur.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    j.gap=parseFloat(cs.columnGap)||0;
    j.r=j.lis.map(function(li){return li.getBoundingClientRect()});
    j.mw=j.m.getBoundingClientRect().width;
  });
  /* 3) hesapla + yaz */
  jobs.forEach(function(j){
    if(j.skip){j.m.remove();return}
    var tops=[];j.r.forEach(function(r){var t=Math.round(r.top);if(tops.indexOf(t)<0)tops.push(t)});tops.sort(function(a,b){return a-b});
    if(tops.length<=2){j.m.remove();return}
    var row=function(i){return tops.indexOf(Math.round(j.r[i].top))};
    var cut=j.r.findIndex(function(r,i){return row(i)>1});
    var first2=j.r.findIndex(function(r,i){return row(i)===1});
    var k=cut;
    for(;k>0;k--){
      if(row(k-1)<1)break;                                        /* "+N" 2. satırın başına iner: sığar */
      if(j.r[k-1].right-j.r[first2].left+j.gap+j.mw<=j.cw+.5)break;
    }
    j.lis.forEach(function(li,i){li.hidden=i>=k});
    j.m.textContent='+'+(j.lis.length-k);
  });
}
function layoutCards(root){fitLayers(root);layoutWM(root)}
var wmT;window.addEventListener('resize',function(){clearTimeout(wmT);wmT=setTimeout(function(){layoutCards(grid)},150)});
/* FONT BEKLEME — font gelmeden telefonun kendi fontuyla hesaplanan "+N" font gelince değişiyordu
   (bir malzeme gelip gidiyordu). İçindekiler listeleri font hazır olana kadar görünmez; son hesaptan
   sonra yumuşakça belirir. Font 2,5 sn'de gelmezse yine de gösterilir. */
(function(){
  var H=document.documentElement,done=false;
  var show=function(){if(done)return;done=true;layoutCards(grid);requestAnimationFrame(function(){H.classList.add('fonts-ready')})};
  /* iki parça da (Latin + Türkçe karakterler) yüklensin: Türkçe harfli bir metinle açıkça iste */
  if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('600 14px "Bricolage Grotesque"','Aa şğıİ'),document.fonts.ready]).then(show,show);setTimeout(show,2500)}else show();
})();
/* yazı tipi menü çizildikten sonra yüklenirse etiket genişlikleri değişir → yeniden ölç */
if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',function(){layoutCards(grid)});

/* ——— TEST AYARLARI (geçici) — ?fx=golge,cam,urun,egim,maskot,arka,hepsi
   ilgili görsel efekti kapatır; telefonda ?perf göstergesiyle hangisinin kaydırmayı yavaşlattığını bulmak için */
var FX=(function(){var m=/[?&]fx=([^&#]*)/.exec(location.search),o={};if(m)decodeURIComponent(m[1]).split(',').forEach(function(k){if(k)o[k]=1});
  if(o.hepsi)['golge','cam','urun','egim','maskot','arka'].forEach(function(k){o[k]=1});
  /* hafif: ürün gölgesi yok, eğim yok, menüde arka plan figürleri yarıda + çözünürlük bir kademe düşük, daha az kar */
  if(o.hafif)['urun','egim','figur','kar'].forEach(function(k){o[k]=1});
  Object.keys(o).forEach(function(k){document.documentElement.classList.add('fx-'+k)});return o})();

/* ——— durum ——— */
var state={mode:'welcome',group:GROUPS[0].key,q:'',order:[],sheetId:null,pushed:false};
var aim={x:0,y:0},aimT={x:0,y:0},gyroOn=false,drag={x:0,y:0,on:false};
var scrolled=0;

/* ============ 3D SAHNE ============ */
var gl={ok:false};
function initGL(){
  try{
    var canvas=$('#gl');
    var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);
    renderer.outputEncoding=THREE.sRGBEncoding;
    var scene=new THREE.Scene();
    var camera=new THREE.PerspectiveCamera(32,1,.1,60);camera.position.z=10;
    var fogCol=new THREE.Color(groupColor(GROUPS[0].key)).convertSRGBToLinear();
    scene.fog=new THREE.Fog(fogCol,8.5,19);
    var c=function(h){return new THREE.Color(h).convertSRGBToLinear()};
    scene.add(new THREE.HemisphereLight(c(0xfff1e6),c(0x7a0016),.42));
    var key=new THREE.DirectionalLight(c(0xfff4e0),1.05);key.position.set(-3,5,7);scene.add(key);
    var rim=new THREE.DirectionalLight(c(0xff3350),1.3);rim.position.set(5,-2,-3);scene.add(rim);
    var fill=new THREE.PointLight(c(0xffd9c4),.28,30);fill.position.set(4,2,6);scene.add(fill);

    /* logo */
    var shapes=LOGO_SHAPES.shapes.map(function(s){
      var sh=new THREE.Shape(s.o.map(function(p){return new THREE.Vector2(p[0],p[1])}));
      s.h.forEach(function(h){sh.holes.push(new THREE.Path(h.map(function(p){return new THREE.Vector2(p[0],p[1])})))});
      return sh;
    });
    var depth=.2;
    var geo=new THREE.ExtrudeGeometry(shapes,{depth:depth,bevelEnabled:true,bevelThickness:.014,bevelSize:.011,bevelSegments:2,curveSegments:1});
    geo.translate(0,0,-depth/2);
    var face=new THREE.MeshStandardMaterial({color:c(T.cream),roughness:.5,metalness:.02,emissive:c(T.cream),emissiveIntensity:0});
    var side=new THREE.MeshStandardMaterial({color:c(T.logoSide),roughness:.55,metalness:.1});
    var logoMesh=new THREE.Mesh(geo,[face,side]);
    var logo=new THREE.Group();logo.add(logoMesh);scene.add(logo);
    var ASPECT=LOGO_SHAPES.aspect;

    /* atmosfer: videodaki gibi krem pikto karakterler (kendi çizimim). Her biri kendi yerinde süzülür, birbirine girmez;
       imleç yaklaşınca imlece döner, büyür, koyulaşır; üstüne gelince titrer, tıklayınca takla atar. */
    var FIGS=FIGS_DATA;
    var GK=['yiyecek','alkollu-icecek','icecek'],GI={'yiyecek':0,'alkollu-icecek':1,'icecek':2};
    var FIGSETS=[['burger','fries','dancerA','burger','fries','dancerB'],['cocktail','beer','dj','guitar','cocktail','runner'],['cup','iced','dancerB','cup','iced','dancerA']];
    var figTex={};
    /* AÇILIŞI RAHATLATMA — figür dokuları (SVG → 512px tuval → GPU) tek karede değil, sırayla ve
       tarayıcı boş kaldıkça hazırlanır; ucuz telefonlarda ilk saniyedeki takılmayı önler. */
    var texQueue=[],texBusy=false;
    var idle=window.requestIdleCallback?function(f){requestIdleCallback(f,{timeout:120})}:function(f){setTimeout(f,16)};
    function texQ(job){texQueue.push(job);if(!texBusy){texBusy=true;idle(texRun)}}
    /* doku hazır değilse 0 (figür hiç çizilmez → boş doku ekran kartına yüklenmez), hazır olunca 0,6 sn'de 1'e çıkar */
    function texA(tx){var t0=tx&&tx._t0;if(!t0)return 0;var k=Math.min(1,(performance.now()-t0)/600);return k*k*(3-2*k)}
    function texRun(){var job=texQueue.shift();if(job)job();if(texQueue.length)idle(texRun);else texBusy=false}
    function figTexture(name){
      if(figTex[name])return figTex[name];
      var cv=document.createElement('canvas');cv.width=cv.height=512;
      var tx=new THREE.CanvasTexture(cv);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=2;
      var im=new Image();
      im.onload=function(){texQ(function(){cv.getContext('2d').drawImage(im,0,0,512,512);tx.needsUpdate=true;tx._t0=performance.now()})};
      im.src='data:image/svg+xml;base64,'+btoa(FIGS[name]||ARMY_SVG[name]);
      figTex[name]=tx;return tx;
    }
    var seed=11;var rnd=function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
    var quad=new THREE.PlaneGeometry(1,1),figs=[],cream=c(T.cream),inkc=c(T.figShadow);
    /* HAYALET ORDUSU — açılışta Yiyecek (0) ve İçecek (1) takımları ekranı dolaşıp kapışır.
       İlk 6'sı telefonda (3'e 3), hepsi geniş ekranda (4'e 4). */
    var ARMY=[['burger',0],['cocktail',1],['fries',0],['beer',1],['burger',0],['cup',1],['fries',0],['iced',1]];
    var sets=FIGSETS.concat([ARMY.map(function(a){return a[0]})]);
    var mkMat=function(tex,col){return new THREE.MeshBasicMaterial({map:tex,color:col,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,fog:false})};
    sets.forEach(function(set,gi){
      set.forEach(function(name,i){
        var AK=gi===3?ARMY_KIND[name]:null;
        var z=-1.4-rnd()*3.0,near=1-(-z-1.4)/3.0,tex=figTexture(AK?AK.body:name);
        var mk=function(col){return mkMat(tex,col)};
        var front=new THREE.Mesh(quad,mk(cream)),back=new THREE.Mesh(quad,mk(inkc));
        back.position.set(.03,-.036,-.07);back.frustumCulled=false;front.frustumCulled=false;
        var grp=new THREE.Group();grp.add(back);grp.add(front);grp.visible=false;scene.add(grp);
        /* ordu: omuzdan dönen atış kolu (gövdenin önünde) */
        var pivot=null,armF=null,armB=null;
        if(AK){
          var at=figTexture('armT');pivot=new THREE.Group();pivot.position.set(AK.sh[0],AK.sh[1],.02);
          armF=new THREE.Mesh(quad,mkMat(at,cream));armB=new THREE.Mesh(quad,mkMat(at,inkc));
          armF.scale.set(.34,.34,1);armB.scale.set(.34,.34,1);armF.position.set(0,-.17,0);armB.position.set(.03,-.2,-.07);
          armF.frustumCulled=armB.frustumCulled=false;pivot.add(armB);pivot.add(armF);grp.add(pivot);
        }
        figs.push({g:gi,i:i,grp:grp,front:front,back:back,z:z,sz:.8+rnd()*.25,a0:.22+.2*near,par:.4+near*.8,
          ph:rnd()*6.283,fx:.35+rnd()*.3,fy:.3+rnd()*.3,fr:.3+rnd()*.3,r0:(rnd()-.5)*.36,flip:rnd()<.5?-1:1,
          px:0,py:0,vx:0,vy:0,th:rnd()*6.283,spd:22+rnd()*20,wfr:.2+rnd()*.3,r:60,welOn:false,cur:0,hov:0,inside:false,lx:0,ly:0,wob:0,wobV:0,bn:0,bnV:0,sp:0,spT:0,sx:-9999,sy:-9999,half:1,
          team:gi===3?ARMY[i][1]:-1,kind:name,pivot:pivot,armF:armF,armB:armB,hp:3,atkCd:1+rnd()*2.5,thr:null,hit:0,dead:-1,side:rnd()<.5?-1:1});
      });
    });
    /* çarpışma kıvılcımı: 8 köşeli krem yıldız, büyüyüp söner */
    var sparkTex=(function(){var cv=document.createElement('canvas');cv.width=cv.height=128;var x=cv.getContext('2d');x.fillStyle='#fff';x.beginPath();
      for(var k=0;k<16;k++){var a=k/16*Math.PI*2,r=k%2?22:62;x.lineTo(64+Math.cos(a)*r,64+Math.sin(a)*r)}x.closePath();x.fill();
      var t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t})();
    var sparks=[];for(var sk=0;sk<6;sk++){var sm=new THREE.Mesh(quad,new THREE.MeshBasicMaterial({map:sparkTex,color:cream,transparent:true,opacity:0,depthWrite:false,fog:false}));sm.visible=false;scene.add(sm);sparks.push({m:sm,t0:-9})}
    var sparkI=0;
    function stepSparks(){sparks.forEach(function(p){var k=(ptime-p.t0)/.42;if(k>=1){p.m.visible=false;return}
      var sc=figU*(.25+.55*Math.sqrt(k));p.m.scale.set(sc,sc,1);p.m.material.opacity=.8*(1-k)})}
    /* ——— ATIŞMA ———
       Her küçük insan en yakın canlı rakibine döner; arada atış mesafesi tutar, yan yan dolaşır.
       Sırası gelince kolunu geriye alıp kendi ürününü fırlatır (burger → mini burger, patates → kızartma,
       kokteyl → kiraz, bira → kapak, kahve → çekirdek, buzlu → buz). İsabet %65: rakip döne döne savrulur;
       ıska: rakip zıplayıp kaçar. 3 isabet alan solar ve takımının kenarından takviye olarak döner. */
    var V3=THREE.Vector3,vA=new V3(),vB=new V3();
    var projs=[];
    function getProj(kind){
      for(var q=0;q<projs.length;q++)if(!projs[q].busy&&projs[q].kind===kind)return projs[q];
      var m=new THREE.Mesh(quad,mkMat(figTexture(ARMY_KIND[kind].proj),cream));m.frustumCulled=false;m.visible=false;scene.add(m);
      var p={m:m,kind:kind,busy:false};projs.push(p);return p;
    }
    function sparkAt(pos){var p=sparks[sparkI++%sparks.length];p.m.position.copy(pos);p.m.position.z+=.25;p.m.rotation.z=rnd()*6.28;p.t0=ptime;p.m.visible=true}
    function release(f){
      var e=f.thr.tg;if(!e||e.dead>=0)return;
      f.pivot.localToWorld(vA.set(0,-.28,0));
      var p=getProj(f.kind),d=vA.distanceTo(e.grp.position);
      p.busy=true;p.p0=vA.clone();p.p1=e.grp.position.clone();p.t0=ptime;p.dur=.5+d*.05;p.h=.35+d*.12;
      p.hit=rnd()<.65;p.tg=e;p.from=f;p.dodged=false;p.spin=(rnd()<.5?-1:1)*(8+rnd()*6);
      p.sc=e.grp.scale.y*.17;p.m.visible=true;
    }
    function impact(p){
      var e=p.tg,f=p.from;if(e.dead>=0)return;
      var dir=e.px>=f.px?1:-1;
      e.vx+=dir*300;e.vy-=60;e.spT+=(rnd()<.5?-1:1)*Math.PI*2;e.wobV+=(rnd()<.5?-1:1)*9;e.hit=1;e.hp--;
      sparkAt(e.grp.position);f.bnV+=3;
      if(e.hp<=0)e.dead=ptime;
    }
    function stepProjs(){
      for(var q=0;q<projs.length;q++){var p=projs[q];if(!p.busy)continue;
        var k=(ptime-p.t0)/p.dur;
        if(!p.hit&&!p.dodged&&k>.45){p.dodged=true;p.tg.bnV+=6}
        if(p.hit&&k>=1){impact(p);p.busy=false;p.m.visible=false;continue}
        if(k>=1.35){p.busy=false;p.m.visible=false;continue}
        var end=p.p1;
        if(!p.hit){vB.copy(p.p1).sub(p.p0).multiplyScalar(.35);vB.add(p.p1);vB.y-=.3;end=vB}
        p.m.position.lerpVectors(p.p0,end,Math.min(k,1)+(k>1?(k-1):0));
        p.m.position.y+=Math.sin(Math.min(k,1)*Math.PI)*p.h;p.m.position.z+=.3;
        p.m.rotation.z=k*p.spin;p.m.scale.set(p.sc,p.sc,1);
        var pa=texA(p.m.material.map);p.m.visible=pa>0;
        p.m.material.opacity=.9*(k>1?Math.max(0,1-(k-1)/.35):1)*pa;
      }
    }
    /* kol açısı: 0 = aşağı sarkık, + öne (yüzü dönük taraf), − geriye */
    function armAngle(f){
      var idle=.25+Math.sin(ptime*3+f.ph)*.2;
      if(!f.thr)return idle;
      var k=ptime-f.thr.t0;
      if(k<.32)return idle+(-2.5-idle)*(1-Math.pow(1-k/.32,2));
      if(k<.5)return -2.5+3.7*((k-.32)/.18);
      if(k<.75)return 1.2+(idle-1.2)*((k-.5)/.25);
      return idle;
    }
    function armyAI(dt){
      var W=window.innerWidth,H=window.innerHeight;
      for(var i=0;i<figAct.length;i++){
        var f=figAct[i];if(f.g!==3)continue;
        f.hit=Math.max(0,f.hit-dt*2.5);f.atkCd-=dt;
        if(f.thr){var tk=ptime-f.thr.t0;if(!f.thr.rel&&tk>=.4){f.thr.rel=true;release(f)}if(tk>.75)f.thr=null}
        if(f.dead>=0){
          f.thr=null;
          if(ptime-f.dead>2.6&&f.cur<.05){ /* takviye: kendi takımının kenarından yeniden girer */
            f.dead=-1;f.hp=3;f.px=f.team===0?f.r:W-f.r;f.py=yMinOf(f,1,H)+rnd()*Math.max(1,yMaxOf(f,1,H)-yMinOf(f,1,H));
            f.vx=(f.team===0?1:-1)*f.spd;f.vy=0;f.th=Math.atan2(f.vy,f.vx);f.spT=f.sp;
          }
          continue;
        }
        var e=null,bd=1e9;
        for(var j=0;j<figAct.length;j++){var o=figAct[j];if(o.g!==3||o.team===f.team||o.dead>=0)continue;
          var dd=(o.px-f.px)*(o.px-f.px)+(o.py-f.py)*(o.py-f.py);if(dd<bd){bd=dd;e=o}}
        if(!e)continue;
        var dx=e.px-f.px,dy=e.py-f.py,d=Math.sqrt(dx*dx+dy*dy)||1,range=(f.r+e.r)*2.6,want=Math.atan2(dy,dx);
        f.flip=dx>=0?1:-1;
        if(f.thr){var dm=Math.exp(-dt*6);f.vx*=dm;f.vy*=dm;continue}
        if(f.atkCd<=0&&d<range*1.6){f.thr={t0:ptime,tg:e,rel:false};f.atkCd=1.8+rnd()*2.2;continue}
        var tgt=d>range*1.2?want:d<range*.7?want+Math.PI:want+f.side*Math.PI/2;
        var da=Math.atan2(Math.sin(tgt-f.th),Math.cos(tgt-f.th));f.th+=da*Math.min(1,dt*2.2);
      }
    }
    function layoutFigs(portrait){
      figs.forEach(function(fg){fg.welOn=fg.g===3&&(!portrait||fg.i<6)});
    }
    /* serbest dolaşım: her figür yavaşça yön değiştirerek süzülür; ekran kenarından ve birbirinden sekerek kaçınır */
    var figAct=[],figKey=-2,figW=0,figH=0;
    function figR(fg,wv,ppu){return figU*fg.sz*fMul*(isPort?1-.2*wv:1-.07*wv)*ppu*.5*.85}
    function yMaxOf(f,wv,H){return Math.min(H-f.r,wv>.5?H*(isPort?.76:.82):H)}
    function yMinOf(f,wv,H){return wv>.5?f.r:H*(isPort?.21:.2)+f.r*.35}
    function keepOut(){
      var W=window.innerWidth,H=window.innerHeight;
      return isPort?{L:W*.02,R:W*.98,T:H*.3,B:H*.47}:{L:W*.31,R:W*.75,T:H*.24,B:H*.6};
    }
    function respawn(key){
      var W=window.innerWidth,H=window.innerHeight,ppu=H/vis.h,wv=key===-1?1:0;
      var act=figs.filter(function(f){return key===-1?f.welOn:f.g===key});
      figAct=act;
      var placed=act.filter(function(f){return f.cur>=.3}),fresh=act.filter(function(f){return f.cur<.3}),ko=key===-1?keepOut():null;
      act.forEach(function(f){f.r=figR(f,wv,ppu)});
      fresh.forEach(function(f){
        var bx=W/2,by=H/2,bd=-1e9;
        for(var t=0;t<60;t++){
          var lo=f.r*1.05,x=lo+rnd()*(W-2*lo),y0=yMinOf(f,wv,H),y=y0+rnd()*Math.max(1,yMaxOf(f,wv,H)-y0),md=1e9;
          for(var q=0;q<placed.length;q++){var o=placed[q],dd=Math.sqrt((x-o.px)*(x-o.px)+(y-o.py)*(y-o.py))-o.r-f.r;if(dd<md)md=dd}
          if(ko){var qx=clamp(x,ko.L,ko.R),qy=clamp(y,ko.T,ko.B),dk=Math.sqrt((x-qx)*(x-qx)+(y-qy)*(y-qy))-f.r*.6;if(dk<md)md=dk}
          if(md>bd){bd=md;bx=x;by=y}
        }
        f.px=bx;f.py=by;f.th=rnd()*6.283;f.vx=Math.cos(f.th)*f.spd*.5;f.vy=Math.sin(f.th)*f.spd*.5;
        placed.push(f);
      });
    }
    function stepFigs(dt,wv){
      var W=window.innerWidth,H=window.innerHeight,ppu=H/vis.h,sp=clamp(Math.min(W,H)/800,.7,1.3);
      var ko=wv>.5?keepOut():null,boost=1+Math.min(2,Math.abs(scrollVel))*.5,i,f;
      if(wv>.5&&!RM)armyAI(dt);
      for(i=0;i<figs.length;i++){
        f=figs[i];f.r=figR(f,wv,ppu);
        if(!RM){
          f.th+=Math.sin(ptime*f.wfr+f.ph)*dt*.8;
          var s0=f.spd*sp*boost*(f.g===3?1.6:1),k=1-Math.exp(-dt*(f.g===3?1.4:.9));
          f.vx+=(Math.cos(f.th)*s0-f.vx)*k;f.vy+=(Math.sin(f.th)*s0-f.vy)*k;
          if(f.hov>.05){var dm=Math.exp(-dt*6*f.hov);f.vx*=dm;f.vy*=dm}
          f.px+=f.vx*dt;f.py+=f.vy*dt;
        }
        var lo=f.r;
        if(f.px<lo){f.px=lo;f.vx=Math.abs(f.vx);f.th=Math.atan2(f.vy,f.vx)}
        else if(f.px>W-lo){f.px=W-lo;f.vx=-Math.abs(f.vx);f.th=Math.atan2(f.vy,f.vx)}
        var ymn=yMinOf(f,wv,H);
        if(f.py<ymn){f.py=ymn;f.vy=Math.abs(f.vy);f.th=Math.atan2(f.vy,f.vx)}
        else if(f.py>yMaxOf(f,wv,H)){f.py=yMaxOf(f,wv,H);f.vy=-Math.abs(f.vy);f.th=Math.atan2(f.vy,f.vx)}
        if(ko&&figAct.indexOf(f)>=0){
          var qx=clamp(f.px,ko.L,ko.R),qy=clamp(f.py,ko.T,ko.B),ddx=f.px-qx,ddy=f.py-qy,dd=Math.sqrt(ddx*ddx+ddy*ddy),lim=f.r*.7;
          if(dd<lim){
            if(dd<1){ddx=0;ddy=f.py<(ko.T+ko.B)/2?-1:1;dd=1}
            var pu=(lim-dd)/lim;f.vx+=ddx/dd*pu*140*dt;f.vy+=ddy/dd*pu*140*dt;
            f.px+=ddx/dd*pu*60*dt;f.py+=ddy/dd*pu*60*dt;f.th=Math.atan2(f.vy,f.vx);
          }
        }
      }
      for(var it=0;it<2;it++)for(var a=0;a<figAct.length;a++)for(var b=a+1;b<figAct.length;b++){
        var A=figAct[a],B=figAct[b],dx=B.px-A.px,dy=B.py-A.py,d=Math.sqrt(dx*dx+dy*dy)||.01,md=A.r+B.r;
        if(d<md*1.12){
          var nx=dx/d,ny=dy/d;
          if(d<md){var ov=(md-d)*.5;A.px-=nx*ov;A.py-=ny*ov;B.px+=nx*ov;B.py+=ny*ov}
          if(it===0){
            var pu2=Math.min(1,(1.12*md-d)/(.12*md))*70*dt;
            A.vx-=nx*pu2;A.vy-=ny*pu2;B.vx+=nx*pu2;B.vy+=ny*pu2;
            var vn=(A.vx-B.vx)*nx+(A.vy-B.vy)*ny;
            if(vn>0){var j=vn*.85;A.vx-=j*nx;A.vy-=j*ny;B.vx+=j*nx;B.vy+=j*ny}
            A.th=Math.atan2(A.vy,A.vx);B.th=Math.atan2(B.vy,B.vx);
          }
        }
      }
    }
    /* imleç: yalnızca boş zeminde (kart, buton, panel üstünde değil) figürlere etki eder */
    if(/[?&]debug/.test(location.search))window.__g21={figs:figs,act:function(){return figAct}};
    var ptr={x:-9999,y:-9999,ok:false};
    function ptrBlocked(t){return !!(t&&t.closest&&t.closest('button,a,input,.card,.top-wrap,.nav,.searchrow,.sheet'))}
    window.addEventListener('pointermove',function(e){
      if(e.pointerType!=='mouse'||drag.on||state.sheetId){ptr.ok=false;return}
      ptr.x=e.clientX;ptr.y=e.clientY;ptr.ok=!ptrBlocked(e.target);
    },{passive:true});
    document.addEventListener('pointerleave',function(){ptr.ok=false});
    window.addEventListener('blur',function(){ptr.ok=false});
    window.addEventListener('pointerdown',function(e){
      if(state.sheetId||ptrBlocked(e.target))return;
      for(var q=0;q<figs.length;q++){
        var fg=figs[q];if(fg.cur<.4)continue;
        var dx=e.clientX-fg.sx,dy=e.clientY-fg.sy;
        var dl=Math.sqrt(dx*dx+dy*dy);
        if(dl<fg.half){fg.spT+=(dx>=0?-1:1)*Math.PI*2;fg.bnV+=5;fg.wobV+=(dx>=0?-1:1)*5;var ux=dl>1?-dx/dl:0,uy=dl>1?-dy/dl:-1;fg.vx+=ux*170;fg.vy+=uy*170;fg.th=Math.atan2(fg.vy,fg.vx);break}
      }
    },{passive:true});
    var groupKey=null;

    var vis={w:6,h:5.7},fit=1,baseY=.25,unit=1,figU=1,fMul=1,isPort=false;
    /* UYARLANABİLİR KALİTE — telefon modeline değil, gerçek kare sürelerine bakılır.
       1,5 sn'lik pencerede ortalama kare süresi 22 ms'yi (≈45 fps altı) geçerse kalite bir kademe düşer;
       art arda iki pencere 18 ms'nin altında (60 Hz ekranda tam akıcı) kalırsa bir kademe geri yükselir. Güçlü cihazda hiçbir şey değişmez.
       İlk 2,5 sn (gölgelendirici derleme, menü kurulumu) ölçülmez. Kademe 1+: 3D sahnenin çözünürlüğü (piksel oranı) düşer.
       Adres sonuna ?perf eklenirse konsola yazar. */
    var dMax=Math.min(window.devicePixelRatio||1,2);
    var DPRS=[dMax,1.5,1,.75].filter(function(d,i,a){return d<=dMax&&a.indexOf(d)===i});
    /* kademeler: 0…DPRS.length-1 çözünürlük adımları, DPRS.length = yarım hız (menüde 3D sahne 30 fps) */
    var acc=0,frameN=0;
    function halfOn(){return Q.lvl>=DPRS.length}
    /* kademe 3 (sade arka plan): menüde bölüm figürlerinin yarısı yumuşakça söner (karşılama ekranı etkilenmez) */
    function fewOn(){return Q.lvl>=DPRS.length+1}
    var Q={lvl:0,max:DPRS.length+1,sum:0,n:0,t0:0,good:0,hold:performance.now()+2500,get log(){return /[?&]perf/.test(location.search)}};
    gl.q=Q;
    if(Q.log&&window.console)console.info('[kalite] açık — piksel oranı kademeleri:',DPRS.join(' → '),'(ilk 2,5 sn ölçülmez)');
    /* ?perf ile ekranda küçük gösterge (telefonda konsol olmadığı için) */
    var hudEl=null;
    function perfHud(t){
      if(!hudEl){hudEl=document.createElement('pre');hudEl.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';document.body.appendChild(hudEl)}
      hudEl.textContent=t;
    }
    function dprNow(){return DPRS[Math.min(Q.lvl,DPRS.length-1)]}
    function setLvl(l){
      l=Math.max(0,Math.min(Q.max,l));if(l===Q.lvl)return;Q.lvl=l;
      renderer.setPixelRatio(dprNow());renderer.setSize(window.innerWidth,window.innerHeight,false);
      if(Q.log&&window.console)console.info('[kalite] kademe',l,'piksel oranı',dprNow(),halfOn()?'· menüde 3D yarım hız':'',fewOn()?'· menüde figürler yarıya indi':'');
    }
    function qualityTick(now,raw){
      if(raw>250||document.hidden||now<Q.hold){Q.sum=0;Q.n=0;Q.t0=now;return}  /* sekme dönüşü, açılış, kademe değişimi sonrası: ölçme */
      Q.sum+=raw;Q.n++;
      if(now-Q.t0<1500)return;
      var avg=Q.sum/Q.n;Q.sum=0;Q.n=0;Q.t0=now;
      if(Q.log&&window.console)console.info('[kalite] ölçüm: ortalama kare '+avg.toFixed(1)+' ms (≈'+Math.round(1000/avg)+' fps), kademe '+Q.lvl+', piksel oranı '+dprNow());
      if(Q.log)perfHud(['kademe '+Q.lvl+' / '+Q.max,Math.round(1000/avg)+' fps (kare '+avg.toFixed(1)+' ms)','çözünürlük '+dprNow()+'x',halfOn()?'menüde yarım hız':'',fewOn()?'figürler yarıda':''].filter(Boolean).join(String.fromCharCode(10)));
      if(avg>22){Q.good=0;if(P<.5||Q.lvl<1)setLvl(Q.lvl+1);Q.hold=now+800}   /* menüde en fazla 1. kademe */
      else if(avg<18&&Q.lvl>0){if(++Q.good>=2){Q.good=0;setLvl(Q.lvl-1);Q.hold=now+800}}
      else Q.good=0;
    }
    function resize(){
      var w=window.innerWidth,h=window.innerHeight;
      if(figW){figs.forEach(function(fg){fg.px*=w/figW;fg.py*=h/figH})}figW=w;figH=h;
      renderer.setPixelRatio(dprNow());
      renderer.setSize(w,h,false);
      camera.aspect=w/h;camera.updateProjectionMatrix();
      vis.h=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;vis.w=vis.h*camera.aspect;
      var portrait=h>w;
      var wantW=Math.min(vis.w*(portrait?.88:.54),vis.h*.34*ASPECT);
      fit=wantW/ASPECT;
      baseY=vis.h*(portrait?.1:.08);unit=Math.min(vis.w,vis.h)*.38;figU=Math.min(vis.w,vis.h)*(portrait?.46:.3);fMul=portrait?1:.86;isPort=portrait;layoutFigs(portrait);
    }
    resize();window.addEventListener('resize',resize);

    var P=0;           /* 0 karşılama · 1 menü */
    var yaw=0,pit=0,time=0,ptime=0,last=performance.now();
    var tgtFog=new THREE.Color().copy(fogCol);
    gl.setGroup=function(hex,key){tgtFog.set(hex).convertSRGBToLinear();if(key)groupKey=key};
    gl.setP=function(v){P=v};
    gl.visible=true;
    gl.render=true;

    function frame(now){
      requestAnimationFrame(frame);
      var raw=now-last,dt=Math.min(.05,raw/1000);last=now;
      if(document.hidden){return}
      if(gl.render)qualityTick(now,raw);
      tick(now,dt);
      if(gl.render){
        /* kademe 2 (yarım hız): menüdeyken 3D sahne iki karede bir çizilir; geçen süre biriktirilir,
           böylece figürler aynı hızda hareket eder (yalnız kare sayısı yarıya iner). Kartlar her karede çalışır. */
        if(FX.arka&&P>.99)return;                         /* test: menüde arka plan 3D hiç çizilmez */
        if(FX.figur&&P>.99&&Q.lvl<1)setLvl(1);            /* test: menüde çözünürlük bir kademe düşük */
        acc+=dt;
        if(halfOn()&&P>.99&&(++frameN&1))return;
        dt=Math.min(.1,acc);acc=0;
        if(!RM)time+=dt;
        var k=1-Math.exp(-dt*7);
        aim.x+=(aimT.x-aim.x)*k;aim.y+=(aimT.y-aim.y)*k;
        if(!drag.on&&!RM){drag.x*=Math.exp(-dt*2.2);drag.y*=Math.exp(-dt*2.2)}
        fogCol.lerp(tgtFog,1-Math.exp(-dt*5));scene.fog.color.copy(fogCol);

        var lp=ss(0,.75,P),f=Math.sin(Math.PI*P);
        logo.visible=P<.72;face.emissiveIntensity=.62*lp;
        var tY=clamp(aim.x*.7+drag.x,-1.2,1.2),tX=clamp(aim.y*.35+drag.y,-.7,.7);
        yaw+=(tY-yaw)*k;pit+=(tX-pit)*k;
        logo.scale.setScalar(fit*(1+5.5*lp));
        logo.position.set(0,baseY*(1-lp)+Math.sin(time*.9)*.05,5*lp);
        logo.rotation.set(pit+.07+Math.sin(time*.45)*.05,yaw-.2+Math.sin(time*.6)*.16,0);

        var gi=GI[groupKey],wv=1-ss(.5,.9,P);
        ptime+=dt*(RM?0:(1+Math.min(2,Math.abs(scrollVel))*1.2));
        var sc=(window.scrollY/window.innerHeight)*P,W=window.innerWidth,H=window.innerHeight,ppu=H/vis.h;
        var any=false,gk=gi>=0?gi:0,fkey=wv>.5?-1:gk;
        if(fkey!==figKey){figKey=fkey;respawn(fkey)}
        stepFigs(dt,wv);
        for(var fi=0;fi<figs.length;fi++){
          var fg=figs[fi],grp=fg.grp;
          var tg=wv*(fg.welOn&&fg.dead<0?.8:0)+(1-wv)*(gi===fg.g&&!((fewOn()||FX.figur)&&fi%2)?1:0);
          fg.cur+=(tg-fg.cur)*(1-Math.exp(-dt*3));
          var ra=Math.min(texA(fg.front.material.map),fg.pivot?texA(fg.armF.material.map):1);
          if(fg.cur<.01||ra<=0){grp.visible=false;fg.hov=0;fg.inside=false;fg.sx=-9999;continue}
          var fl=1+f*(.3+.5*fg.par),szf=fMul*(isPort?1-.2*wv:1-.07*wv);
          var nx=((fg.px/W*2-1)+Math.sin(ptime*fg.fx+fg.ph)*.012+aim.x*.06*fg.par+drag.x*.05*fg.par)*fl;
          var ny=((1-fg.py/H*2)+Math.sin(ptime*fg.fy+fg.ph*1.3)*.016-aim.y*.04*fg.par+Math.sin(sc*fg.par*.9+fg.ph)*.03+scrollVel*.02*fg.par)*fl;
          /* imleç etkisi */
          fg.sx=(nx+1)/2*W;fg.sy=(1-ny)/2*H;fg.half=figU*fg.sz*szf*ppu*.4;
          var dx=ptr.x-fg.sx,dy=ptr.y-fg.sy,d=Math.sqrt(dx*dx+dy*dy);
          var inside=ptr.ok&&d<fg.half;
          if(inside&&!fg.inside){var sg=dx>=0?-1:1;fg.wobV+=sg*4;fg.bnV+=2.4}
          fg.inside=inside;if(inside)any=true;
          fg.hov+=((inside?1:0)-fg.hov)*(1-Math.exp(-dt*9));
          var near=ptr.ok?clamp(1-d/(fg.half*2.4),0,1):0,kk=1-Math.exp(-dt*10);
          fg.lx+=(clamp(dx/fg.half,-1.2,1.2)*near-fg.lx)*kk;fg.ly+=(clamp(dy/fg.half,-1.2,1.2)*near-fg.ly)*kk;
          fg.wobV+=(-80*fg.wob-7*fg.wobV)*dt;fg.wob+=fg.wobV*dt;
          fg.bnV+=(-110*fg.bn-8*fg.bnV)*dt;fg.bn+=fg.bnV*dt;
          fg.sp+=(fg.spT-fg.sp)*(1-Math.exp(-dt*4.5));
          var zz=fg.z+fg.hov*1.1,kp=(10-zz)/10;
          grp.position.set(nx*vis.w/2*kp,ny*vis.h/2*kp,zz);
          var s=figU*fg.sz*szf*kp*fl*(.6+.4*ss(0,1,fg.cur))*(1+.18*fg.hov+.25*fg.bn);
          grp.scale.set(s*fg.flip,s,1);
          grp.rotation.set(Math.sin(ptime*.37+fg.ph*2)*.16-fg.ly*.55-scrollVel*.18*fg.par,
                           Math.sin(ptime*.5+fg.ph)*.3+fg.lx*.6*fg.flip,
                           fg.r0+Math.sin(ptime*fg.fr+fg.ph)*.14+fg.wob*.5+fg.sp);
          fg.front.material.opacity=Math.min(.95,(fg.a0+.5*fg.hov+.55*fg.hit)*fg.cur)*ra;
          fg.back.material.opacity=Math.min(.5,(.26+.2*fg.hov+.2*fg.hit)*fg.cur)*ra;
          if(fg.pivot){fg.pivot.rotation.z=RM?.25:armAngle(fg);fg.armF.material.opacity=fg.front.material.opacity;fg.armB.material.opacity=fg.back.material.opacity}
          grp.visible=true;
        }
        stepSparks();stepProjs();
        canvas.parentNode.classList.toggle('fig-hover',any);
        scrollVel*=.9;
        renderer.render(scene,camera);
      }
    }
    var scrollVel=0,lastY=0;
    window.addEventListener('scroll',function(){var y=window.scrollY;scrollVel=clamp(scrollVel+(y-lastY)*.004,-3,3);lastY=y},{passive:true});
    gl.ok=true;
    requestAnimationFrame(frame);
  }catch(e){
    gl.ok=false;document.documentElement.classList.add('no-gl');
    requestAnimationFrame(function loop(now){requestAnimationFrame(loop);tick(now,.016)});
    if(window.console)console.warn('WebGL kapalı, düz görünüme geçildi',e);
  }
}
/* 3D MOTORU BEKLENMEZ — three.js "async" iner. O gelene kadar:
   · karşılama ekranında düz 21GRAM logosu görünür (html.gl-wait), "Menüyü aç" hemen çalışır
   · geçişleri yürüten döngü (tick) yedek döngüde döner
   three.js gelince 3D sahne kurulur, o anki duruma (karşılama/menü, grup, detay açık mı) eşitlenir
   ve düz logo yerini 3D logoya yumuşakça bırakır. */
var fbLoop=0;
function fallbackLoop(now){fbLoop=requestAnimationFrame(fallbackLoop);tick(now,.016)}
function startGL(){
  if(gl.started)return;gl.started=true;
  cancelAnimationFrame(fbLoop);
  var H=document.documentElement;
  if(!window.THREE){H.classList.remove('gl-wait');H.classList.add('no-gl');requestAnimationFrame(fallbackLoop);return}
  initGL();
  if(gl.ok){
    gl.setP(Pv);gl.setGroup(groupColor(state.group),state.group);gl.render=!state.sheetId;
    /* ilk kare çizildikten sonra tuvali görünür yap (CSS 0,8 sn'lik geçişle belirtir) */
    requestAnimationFrame(function(){requestAnimationFrame(function(){H.classList.add('gl-on');if(H.classList.contains('gl-wait')){H.classList.add('gl-in');setTimeout(function(){H.classList.remove('gl-wait','gl-in')},800)}})});
  }else H.classList.remove('gl-wait');
}
(function bootGL(){
  if(window.THREE){startGL();return}
  document.documentElement.classList.add('gl-wait');
  fbLoop=requestAnimationFrame(fallbackLoop);
  var sc=document.getElementById('threeJs');
  if(!sc){startGL();return}
  sc.addEventListener('load',startGL);
  sc.addEventListener('error',startGL);
})();

/* ============ GEÇİŞ (karşılama ⇄ menü) ============ */
var welcome=$('#welcome'),app=$('#app'),tr={active:false,from:0,to:0,t0:0,dur:1150},Pv=0;
/* ÖN ISITMA — menü ilk kez görünürken tek karede tüm görselleri çözüp çizmek ~170 ms
   takılmaya yol açıyordu. Karşılama ekranındayken görseller arka planda çözülür ve
   menü 0.002 opaklıkla (gözle görülmez, animasyonları durdurulmuş) önceden çizilir. */
var WARM=.002,warmed=false;
function warmMenu(){
  if(warmed)return;warmed=true;
  var imgs=[].slice.call(grid.querySelectorAll('img'));
  Promise.all(imgs.map(function(i){return i.decode?i.decode().catch(function(){}):0})).then(function(){
    if(state.mode!=='welcome'||tr.active)return;
    app.classList.add('prewarm');app.classList.remove('is-hidden');app.style.opacity=String(WARM);
  });
}
function setP(v){
  Pv=v;if(gl.setP)gl.setP(v);
  welcome.style.opacity=String(1-ss(0,.32,v));
  app.style.opacity=String(Math.max(warmed?WARM:0,ss(.68,.96,v)));
}
function finishMode(){
  var m=Pv>=.5?'menu':'welcome';state.mode=m;
  welcome.classList.toggle('is-hidden',m==='menu');
  app.classList.toggle('is-hidden',m==='welcome');
  document.documentElement.classList.toggle('lock',m==='welcome');
  if(m==='welcome'){welcome.style.opacity='';app.style.opacity=warmed?String(WARM):'0';app.classList.toggle('is-hidden',!warmed);app.classList.toggle('prewarm',warmed)}
  else{welcome.style.opacity='0';app.style.opacity='1'}
  app.inert=m==='welcome';if(m==='welcome')app.setAttribute('aria-hidden','true');else app.removeAttribute('aria-hidden');
}
function goTo(m,instant){
  var to=m==='menu'?1:0;
  if(m==='menu'){if(chunkFlush)chunkFlush();warmMenu();if(!groupsPrefetched){clearTimeout(gpT);gpT=setTimeout(prefetchGroups,2500)}app.classList.remove('is-hidden','prewarm');welcome.classList.remove('is-hidden');window.scrollTo(0,0)}
  else{app.classList.remove('is-hidden');welcome.classList.remove('is-hidden')}
  document.documentElement.classList.toggle('lock',false);
  if(instant||RM){setP(to);finishMode();if(m==='menu')dealCards();return}
  tr={active:true,from:Pv,to:to,t0:performance.now(),dur:1150};
  if(m==='menu')setTimeout(dealCards,520);
}
function tick(now,dt){
  if(tr.active){
    var k=clamp((now-tr.t0)/tr.dur,0,1);
    setP(tr.from+(tr.to-tr.from)*ease(k));
    if(k>=1){tr.active=false;finishMode();if(tr.to===0)window.scrollTo(0,0)}
  }
  if(state.mode==='menu'||tr.active)tickCards(dt);
  if(state.sheetId)tickHero(dt);
}

/* karşılama etkileşimi */
var gyroAsked=false;
function onOri(e){
  if(e.gamma==null)return;gyroOn=true;
  aimT.x=clamp(e.gamma/26,-1,1);aimT.y=clamp(((e.beta||0)-45)/26,-1,1);
}
function enableGyro(){
  if(gyroAsked)return;gyroAsked=true;
  try{
    var DOE=window.DeviceOrientationEvent;
    if(DOE&&typeof DOE.requestPermission==='function'){
      DOE.requestPermission().then(function(r){if(r==='granted')window.addEventListener('deviceorientation',onOri,{passive:true})}).catch(function(){});
    }else if(DOE){window.addEventListener('deviceorientation',onOri,{passive:true})}
  }catch(e){}
}
if(!(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'))enableGyro();
var pd=null;
welcome.addEventListener('pointerdown',function(e){
  if(e.target.closest('.enter'))return;
  pd={x:e.clientX,y:e.clientY};drag.on=true;try{welcome.setPointerCapture(e.pointerId)}catch(_){}
  var h=$('#wHint');if(h)h.style.opacity='0';
});
welcome.addEventListener('pointermove',function(e){
  if(drag.on&&pd){
    drag.x=clamp(drag.x+(e.clientX-pd.x)/window.innerWidth*4.2,-1.4,1.4);
    drag.y=clamp(drag.y+(e.clientY-pd.y)/window.innerHeight*2.6,-.8,.8);
    pd={x:e.clientX,y:e.clientY};
  }else if(e.pointerType==='mouse'&&!gyroOn){
    aimT.x=(e.clientX/window.innerWidth-.5)*2;aimT.y=(e.clientY/window.innerHeight-.5)*2;
  }
});
var endDrag=function(){drag.on=false;pd=null};
welcome.addEventListener('pointerup',endDrag);welcome.addEventListener('pointercancel',endDrag);
window.addEventListener('pointermove',function(e){
  if(state.mode==='menu'&&e.pointerType==='mouse'&&!gyroOn){aimT.x=(e.clientX/window.innerWidth-.5)*2;aimT.y=(e.clientY/window.innerHeight-.5)*2}
},{passive:true});
$('#enter').addEventListener('click',function(){enableGyro();goTo('menu')});
$('#home').addEventListener('click',function(){
  if(state.sheetId)return;
  goTo('welcome');
});
$('#wHint').textContent=('ontouchstart' in window)?'Logoyu sürükle ya da telefonu eğ':'Logoyu sürükleyerek çevir';

/* ============ MENÜ ============ */
var tabsEl=$('#tabs'),ind=$('#ind'),chipsEl=$('#chips'),grid=$('#grid'),searchRow=$('#searchRow'),qEl=$('#q'),listTitle=$('#listTitle');
GROUPS.forEach(function(g){
  var b=document.createElement('button');b.type='button';b.className='tab';b.setAttribute('role','tab');b.dataset.key=g.key;b.textContent=g.name;
  tabsEl.appendChild(b);
});
function moveInd(){
  var b=tabsEl.querySelector('[aria-selected="true"]');
  if(!b){ind.style.opacity='0';return}
  ind.style.opacity='1';ind.style.width=b.offsetWidth+'px';ind.style.transform='translateX('+b.offsetLeft+'px)';
  var tb=tabsEl,l=b.offsetLeft-(tb.clientWidth-b.offsetWidth)/2;if(tb.scrollWidth>tb.clientWidth)tb.scrollTo({left:l,behavior:RM?'auto':'smooth'});
}
function cardHTML(p,i){
  var T={burger:burgerCardHTML,cocktail:cocktailCardHTML,beer:beerCardHTML,spirit:spiritCardHTML,shot:shotCardHTML,soft:softCardHTML,hot:hotCardHTML,share:shareCardHTML,sauce:sauceCardHTML,dessert:dessertCardHTML}[p.kind];
  return (T||classicCardHTML)(p,i);
}
/* ——— SOĞUK İÇECEK KARTI: "soğuk dolap" ———
   ikili ızgarada dolap camı · kırmızı başlık şeridi (❄ 4°C) · yoğuşma damlaları · tel raf
   · fotoğrafsız alkolsüz kokteyller: iki sütun genişliğinde, renkli bardak illüstrasyonu */
function softType(p){var t=(p.name+' '+(p.desc||'')).toLocaleLowerCase('tr').replace(/ı/g,'i');
  if(/alkolsüz kokteyl|alkolsuz kokteyl/.test(t))return 'ALKOLSÜZ KOKTEYL';
  if(/iced|buzlu/.test(t))return 'BUZLU KAHVE';
  if(/red bull|fuse tea/.test(t))return 'KUTU';
  if(/churchill/.test(t))return 'FERAHLATICI';
  return 'ŞİŞE';}
var SNOW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/></svg>';
function liquidColor(p){var t=(p.name+' '+(p.desc||'')).toLocaleLowerCase('tr');
  if(/yeşil elma|elma/.test(t))return '#7DBB3C';
  if(/orman|frambuaz|hibisk/.test(t))return '#C2185B';
  return '#E4032D';}
/* fotoğrafı olmayan alkolsüz kokteyl için çizim bardak */
function mocktailSVG(col){
  var bub='';for(var b=0;b<6;b++)bub+='<circle class="bb" style="--b:'+b+'" cx="'+(42+b*8)+'" cy="180" r="'+(2+b%3)+'"/>';
  return '<svg class="mock" viewBox="0 0 120 210" aria-hidden="true" style="--liq:'+col+'">'
   +'<defs><clipPath id="glassClip"><path d="M24 44 L96 44 L89 190 Q88 197 81 197 L39 197 Q32 197 31 190 Z"/></clipPath></defs>'
   +'<line x1="78" y1="8" x2="62" y2="150" class="straw"/>'
   +'<g clip-path="url(#glassClip)"><rect x="0" y="74" width="120" height="140" class="liq"/>'
   +'<rect x="38" y="84" width="22" height="22" rx="4" class="ice" transform="rotate(-12 49 95)"/><rect x="62" y="98" width="20" height="20" rx="4" class="ice" transform="rotate(14 72 108)"/>'
   +'<rect x="44" y="116" width="18" height="18" rx="4" class="ice" transform="rotate(8 53 125)"/>'+bub+'</g>'
   +'<path d="M24 44 L96 44 L89 190 Q88 197 81 197 L39 197 Q32 197 31 190 Z" class="glass"/>'
   +'<circle cx="30" cy="46" r="15" class="garnish"/><circle cx="30" cy="46" r="10" class="garnish-in"/>'
   +'</svg>';
}
/* tüm soğuk içeceklerde ürünün üstüne ve yanına kar yağar (.snow) */
/* KAR — her tane ayrı: rastgele yer, boy, hız, gecikme, yana kayma ve dönüş (ürün kimliğinden tohumlu, kartlar farklı yağar) */
function snowHTML(p){
  var h=0;for(var k=0;k<p.id.length;k++)h=(h*31+p.id.charCodeAt(k))>>>0;
  var rnd=function(){h=(h*1664525+1013904223)>>>0;return h/4294967296},out='';
  for(var n=0;n<7;n++){var d=6+rnd()*6;
    out+='<i style="--x:'+(4+rnd()*88).toFixed(1)+'%;--s:'+(7+rnd()*8).toFixed(1)+'px;--d:'+d.toFixed(1)+'s;--dl:'+(-rnd()*d).toFixed(1)+'s;--dx:'+(rnd()*40-20).toFixed(0)+'px;--r:'+(rnd()<.5?-1:1)*(90+rnd()*180|0)+'deg"></i>'}
  return '<span class="snow" aria-hidden="true">'+out+'</span>';
}
function softCardHTML(p,i){
  var type=softType(p),mock=!p.img;
  var vis=mock?mocktailSVG(liquidColor(p)):prodHTML(p);
  var desc=p.desc?p.desc.replace(/^[^(]*\(|\)\s*$/g,''):'';
  return cardOpen(p,i,'card--soft'+(mock?' card--mock':''))
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage"><span class="frost" aria-hidden="true"></span>'+vis+snowHTML(p)+'</div>'
   +'<div class="meta"><p class="cat">'+esc(type)+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +(desc?'<p class="desc">'+esc(desc)+'</p>':'')
   +'<div class="foot">'+ticketHTML(p)+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— SICAK İÇECEK KARTI: "kahvehane" ———
   kraft kâğıt · fincan izleri · tüten buhar · TAZE DEMLEME mührü · fotoğrafsız espresso için çizim fincan */
function hotType(p){var t=p.name.toLocaleLowerCase('tr').replace(/ı/g,'i');
  if(/türk|turk/.test(t))return 'GELENEKSEL';
  if(/filtre/.test(t))return 'DEMLEME';
  if(/double|doppio/.test(t))return 'ÇİFT SHOT';
  if(/americano/.test(t))return 'ESPRESSO + SU';
  return 'SICAK';}
function cupSVG(){
  return '<svg class="cup" viewBox="0 0 200 140" aria-hidden="true">'
   +'<ellipse cx="100" cy="122" rx="84" ry="14" class="saucer"/><ellipse cx="100" cy="118" rx="62" ry="9" class="saucer-in"/>'
   +'<path d="M54 52 L146 52 Q144 104 118 116 L82 116 Q56 104 54 52 Z" class="body"/>'
   +'<path d="M146 62 Q172 62 168 82 Q164 98 140 98" class="handle"/>'
   +'<ellipse cx="100" cy="52" rx="46" ry="9" class="rim"/><ellipse cx="100" cy="53" rx="40" ry="6.5" class="coffee"/>'
   +'</svg>';
}
function hotCardHTML(p,i){
  var steam='<svg class="steam" viewBox="0 0 120 90" aria-hidden="true">'
   +'<path d="M30 88 C18 70 42 58 30 40 C20 26 36 14 30 2"/><path d="M60 88 C48 70 72 58 60 40 C50 26 66 14 60 2"/><path d="M90 88 C78 70 102 58 90 40 C80 26 96 14 90 2"/></svg>';
  return cardOpen(p,i,'card--hot')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div><span class="ring r1" aria-hidden="true"></span><span class="ring r2" aria-hidden="true"></span></div>'
   +'<div class="stage">'+steam+(p.img?prodHTML(p):cupSVG())
   +'</div>'
   +'<div class="meta"><p class="cat">'+esc(hotType(p))+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<div class="foot">'+ticketHTML(p)+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— PAYLAŞIMLIK KARTI: "sipariş fişi" ———
   yırtık kenarlı çizgili fiş · kırmızı başlık · kesik çizgili tabakta ürün · ✓ işaretli içerik · noktalı TOPLAM satırı */
function shareCardHTML(p,i){
  if(isV2(p))return shareCardV2(p,i);
  var parts=(p.desc||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  var list=parts.length?'<ul class="checks">'+parts.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul>':'';
  return cardOpen(p,i,'card--share')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<p class="slip" aria-hidden="true"><span>SİPARİŞ FİŞİ</span><span>'+noHTML(p)+'</span></p>'
   +'<div class="stage"><span class="plate" aria-hidden="true"></span>'+prodHTML(p)+'<span class="tag-share" aria-hidden="true">PAYLAŞ</span></div>'
   +'<div class="meta"><p class="cat">'+esc(p.category)+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'+list
   +'<div class="foot"><span class="total">TOPLAM</span><span class="dots" aria-hidden="true"></span><span class="price">'+money(p.price)+'</span>'+ARROW+'</div>'
   +'</div></div></article>';
}

/* V2: düz krem kart, tabak karttan taşar · ad + bilet · açıklama · "3D gör" + kırmızı ok */
/* paylaşımlıkta burger kartı kuralları (görsel ölçüsü, sabit yükseklik, alt satır en altta, isim/açıklama 2 satır …) — tüm kartlar */
var SHARE_FIT=PRODUCTS.filter(function(p){return p.kind==='share'}).map(function(p){return p.id});
function shareCardV2(p,i){
  var si=SHARE_FIT.indexOf(p.id),fit=si>=0,mascot=fit&&!RM,mcd=-((si*3.1)%12).toFixed(1);
  return cardOpen(p,i,'card--plate v2'+(fit?' fit':'')+(mascot?' has-mascot':'')).replace('style="','style="--mcd:'+mcd+'s;')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="gingham" aria-hidden="true"></div><div class="sheen"></div></div>'
   +'<div class="stage">'+prodHTML(p)+'</div>'
   +'<div class="meta"><p class="cat">'+esc(p.category)+'</p>'
   +'<div class="name-row"><h3 class="name">'+esc(p.name)+'</h3>'+ticketHTML(p)+'</div>'
   +(p.desc?'<p class="desc">'+esc(p.desc)+'</p>':'')
   +'<div class="foot">'+(mascot?mascotLane(FRIES_SVG):'')+'<span class="cta">3D gör</span>'+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— SOS KARTI: "sos barı" ———
   yarım genişlikte küçük kart · sosun renginde üstten damlama · çizilmiş sos kâsesi */
var SAUCE_COLORS={'bas-biber-sos':'#D8642A','bas-biber-recel-sos':'#9E1B14','dynamite-sos':'#F08A3C','truffle-sos':'#5B3B22','fake-mac-sos':'#F2A27A'};
/* SOS GÖRSELLERİ — her sos kendi kâsesinde: kendi dokusu + yanında ne olduğunu anlatan malzeme.
   Seramik kâse ortak; sosun rengi, parlaklığı, kıvamı (akışkan / krema tepesi) ve içindeki parçalar sosa özel. */
var rkN=0;
function rkDots(n,seed,fn){ /* sos yüzeyine (elips içine) tohumlu dağılım */
  var h=seed,out='';for(var i=0;i<n;i++){h=(h*1664525+1013904223)>>>0;var a=h/4294967296*6.283;h=(h*1664525+1013904223)>>>0;var r=Math.sqrt(h/4294967296)*.86;
    out+=fn(80+Math.cos(a)*r*42,52+Math.sin(a)*r*7.5,i)}return out}
function chiliSVG(c1,c2){ /* yatan kırmızı biber */
  return '<g transform="translate(96 88) rotate(-14)"><path d="M4 12 C14 2 40 0 58 6 C50 12 30 20 8 20 C2 20 0 15 4 12Z" fill="'+c1+'"/>'
    +'<path d="M12 10 C26 5 40 5 52 7" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    +'<path d="M14 18 C30 18 44 13 54 8" stroke="'+c2+'" stroke-opacity=".5" stroke-width="2" fill="none"/>'
    +'<path d="M2 14 C-2 10 -4 6 -2 2 C0 0 3 1 3 4 C3 7 5 10 6 12Z" fill="#3F7A26"/><path d="M-2 3 C-5 -1 -4 -5 0 -6" stroke="#2E5E1A" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>'}
var SAUCE_ART={
  'bas-biber-sos':{l:'#EE7446',b:'#CF4420',d:'#8E2410',
    top:function(){return rkDots(14,7,function(x,y){return '<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="1.7" ry="1.1" fill="#F6D58C"/>'})
      +rkDots(6,3,function(x,y){return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="1.4" fill="#6E1608" opacity=".7"/>'})},
    side:function(){return chiliSVG('#D8321E','#7A1206')}},
  'bas-biber-recel-sos':{l:'#C42A1E',b:'#8E1410',d:'#3E0504',gloss:1,
    top:function(){return rkDots(11,21,function(x,y,i){return '<rect x="'+(x-3).toFixed(1)+'" y="'+(y-1.6).toFixed(1)+'" width="'+(5+i%3)+'" height="3.2" rx="1.2" fill="'+(i%2?'#E0402A':'#B3201A')+'" transform="rotate('+((i*37)%60-30)+' '+x.toFixed(1)+' '+y.toFixed(1)+')"/>'})},
    /* kâsenin kenarından akan reçel + yanında parlak biber */
    pot:'<path d="M118 52 C119 60 121 66 119 72 C118 76 114 76 114 71 C114 64 112 58 110 54Z" fill="#8E1410"/><ellipse cx="117" cy="62" rx="1.2" ry="4" fill="#fff" opacity=".35"/>',
    side:function(){return chiliSVG('#A3170F','#4E0806')}},
  'dynamite-sos':{l:'#FFC08A',b:'#F2894A',d:'#D2602A',dollop:1,
    top:function(){return rkDots(16,11,function(x,y,i){return i%3?'<rect x="'+(x-1.2).toFixed(1)+'" y="'+(y-.8).toFixed(1)+'" width="2.6" height="1.6" fill="#B3140C" transform="rotate('+(i*41%90)+' '+x.toFixed(1)+' '+y.toFixed(1)+')"/>'
        :'<ellipse cx="'+x.toFixed(1)+'" cy="'+(y-4).toFixed(1)+'" rx="1.8" ry="1" fill="'+(i%2?'#2A1A12':'#FFF6E0')+'"/>'})
      +'<g fill="none" stroke="#3E8A2C" stroke-width="1.8"><circle cx="72" cy="44" r="2.6"/><circle cx="90" cy="42" r="2.2"/><circle cx="82" cy="49" r="2.4"/></g>'},
    side:function(){return '<g transform="translate(112 92)"><path d="M0 8 C6 0 26 -2 36 4 C30 10 16 14 4 13Z" fill="#E5311D"/><path d="M-1 9 C-5 6 -6 2 -3 0" stroke="#3F7A26" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>'}},
  'truffle-sos':{l:'#F1E4C6',b:'#DCC79C',d:'#B39467',dollop:1,
    top:function(){return rkDots(34,5,function(x,y,i){return '<circle cx="'+x.toFixed(1)+'" cy="'+(y-(i%3)*1.5).toFixed(1)+'" r="'+(i%4?0.9:1.4)+'" fill="#2B1C12"/>'})},
    /* yanında siyah trüf ve ince dilimi */
    side:function(){var bumps='';for(var i=0;i<14;i++){var a=i/14*6.283;bumps+='<circle cx="'+(124+Math.cos(a)*15).toFixed(1)+'" cy="'+(96+Math.sin(a)*12).toFixed(1)+'" r="3.4" fill="#2A1C14"/>'}
      return '<g>'+bumps+'<ellipse cx="124" cy="96" rx="15" ry="12" fill="#33241A"/>'
        +'<g fill="#1C120C">'+rkDots(10,9,function(x,y){return '<circle cx="'+(124+(x-80)*.3).toFixed(1)+'" cy="'+(96+(y-52)*1.3).toFixed(1)+'" r="1.3"/>'})+'</g>'
        +'<ellipse cx="119" cy="91" rx="5" ry="3" fill="#fff" opacity=".12"/>'
        +'<g transform="translate(98 104) rotate(-8)"><ellipse rx="11" ry="5" fill="#5A4130"/><path d="M-8 -1 C-4 2 0 -2 4 1 C6 2 8 0 9 -1 M-6 2 C-2 0 2 3 6 1" stroke="#D9C3A2" stroke-width=".9" fill="none"/></g></g>'}},
  'fake-mac-sos':{l:'#FBCDB0',b:'#F0A37C',d:'#D7825A',dollop:1,
    top:function(){return rkDots(15,17,function(x,y,i){return i%3===2?'<rect x="'+(x-1.3).toFixed(1)+'" y="'+(y-4.5).toFixed(1)+'" width="2.4" height="2" rx=".6" fill="#FFF8EC"/>'
        :'<rect x="'+(x-1.6).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" width="3.2" height="2.4" rx=".8" fill="'+(i%2?'#5E7F22':'#86A63A')+'"/>'})},
    /* yanında turşu dilimi */
    side:function(){var seeds='';for(var i=0;i<7;i++){var a=i/7*6.283;seeds+='<ellipse cx="'+(126+Math.cos(a)*7).toFixed(1)+'" cy="'+(98+Math.sin(a)*5.6).toFixed(1)+'" rx="1.6" ry="1" fill="#E9E6B0" transform="rotate('+(i/7*360).toFixed(0)+' '+(126+Math.cos(a)*7).toFixed(1)+' '+(98+Math.sin(a)*5.6).toFixed(1)+')"/>'}
      return '<g><ellipse cx="126" cy="99" rx="17" ry="13" fill="#3F5E16"/><ellipse cx="126" cy="98" rx="15" ry="11.4" fill="#8FAF45"/><ellipse cx="126" cy="98" rx="11" ry="8.4" fill="#B6CB6A"/>'+seeds
        +'<path d="M114 92 C118 88 124 87 130 88" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none"/></g>'}}
};
function ramekinSVG(p){
  var A=SAUCE_ART[p&&p.id]||SAUCE_ART['bas-biber-sos'],u='rk'+(++rkN);
  var ridges='';for(var r=0;r<9;r++){var x=34+r*11.5;ridges+='<line x1="'+x+'" y1="58" x2="'+(x+(r-4)*0.8)+'" y2="98" stroke="#000" stroke-opacity=".06" stroke-width="2"/>';}
  var sauce='url(#'+u+'s)';
  return '<svg class="ramekin" viewBox="0 0 160 120" aria-hidden="true"><defs>'
   +'<linearGradient id="'+u+'p" x1="0" x2="1"><stop offset="0" stop-color="#E6E0D3"/><stop offset=".3" stop-color="#FFFFFF"/><stop offset=".75" stop-color="#F3EEE4"/><stop offset="1" stop-color="#D6CFC0"/></linearGradient>'
   +'<radialGradient id="'+u+'s" cx=".42" cy=".3" r=".75"><stop offset="0" stop-color="'+A.l+'"/><stop offset=".55" stop-color="'+A.b+'"/><stop offset="1" stop-color="'+A.d+'"/></radialGradient>'
   +'</defs>'
   +'<ellipse cx="80" cy="106" rx="62" ry="9" class="shadow"/>'
   +'<path d="M28 52 L132 52 L124 98 Q123 104 116 104 L44 104 Q37 104 36 98 Z" fill="url(#'+u+'p)" stroke="#000" stroke-opacity=".14" stroke-width="1.5"/>'
   +ridges
   +'<ellipse cx="80" cy="52" rx="52" ry="12" fill="#FBF8F2" stroke="#000" stroke-opacity=".14" stroke-width="1.5"/>'
   +'<ellipse cx="80" cy="53" rx="45.5" ry="9.2" fill="'+A.d+'"/>'
   +'<ellipse cx="80" cy="52.4" rx="44" ry="8.4" fill="'+sauce+'"/>'
   +(A.dollop?'<path d="M50 53 C52 44 64 37 78 36 C80 33 84 33 85 36 C98 37 108 44 110 53 C98 57 62 57 50 53Z" fill="'+sauce+'"/>'
      +'<path d="M58 48 C68 43 92 42 102 48 M66 42 C74 39 86 39 94 42" stroke="#fff" stroke-opacity=".45" stroke-width="1.8" fill="none" stroke-linecap="round"/>':'')
   +(A.top?A.top():'')
   +'<path d="M54 49 C62 46 74 45 84 46" stroke="#fff" stroke-opacity="'+(A.gloss?.7:.4)+'" stroke-width="'+(A.gloss?3:2)+'" fill="none" stroke-linecap="round"/>'
   +(A.gloss?'<ellipse cx="96" cy="50" rx="5" ry="1.4" fill="#fff" opacity=".5"/>':'')
   +(A.pot||'')
   +(A.side?A.side():'')
   +'</svg>';
}
function sauceCardHTML(p,i){
  var col=SAUCE_COLORS[p.id]||'#E4032D';
  var nm=p.name.replace(/\s*sos$/i,'');
  return cardOpen(p,i,'card--sauce').replace('style="','style="--sauce:'+col+';')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div>'
   +'<svg class="drip" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 H200 V22 Q192 22 190 30 Q188 46 182 46 Q176 46 175 30 Q174 20 164 22 Q150 24 146 34 Q143 54 135 54 Q127 54 126 36 Q125 22 112 22 Q98 22 96 28 Q94 38 88 38 Q82 38 81 28 Q80 20 66 22 Q52 24 50 36 Q48 58 39 58 Q30 58 29 38 Q28 22 16 22 Q4 22 0 26 Z"/></svg></div>'
   +'<div class="stage">'+ramekinSVG(p)+'</div>'
   +'<div class="meta"><p class="cat">EKSTRA SOS</p>'
   +'<h3 class="name">'+esc(nm)+'</h3>'
   +'<div class="foot">'+ticketHTML(p)+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— TATLI KARTI: "pastane kutusu" ———
   kurdele ile bağlı kutu + fiyonk · fotoğrafsız tatlı için katmanlı dilim çizimi */
function tiramisuSVG(){
  var dust='';for(var d=0;d<26;d++){dust+='<circle cx="'+(44+((d*37)%130))+'" cy="'+(50+((d*13)%18))+'" r="'+(1+d%2)+'"/>';}
  return '<svg class="slice" viewBox="0 0 220 170" aria-hidden="true">'
   +'<ellipse cx="110" cy="150" rx="100" ry="16" class="plate"/>'
   +'<path d="M40 70 L150 70 L182 46 L72 46 Z" class="top"/>'
   +'<clipPath id="tiraTop"><path d="M40 70 L150 70 L182 46 L72 46 Z"/></clipPath><g class="cocoa" clip-path="url(#tiraTop)">'+dust+'</g>'
   +'<path d="M150 70 L182 46 L182 128 L150 146 Z" class="side"/>'
   +'<rect x="40" y="70" width="110" height="18" class="l-cream"/>'
   +'<rect x="40" y="88" width="110" height="16" class="l-soak"/>'
   +'<rect x="40" y="104" width="110" height="16" class="l-cream"/>'
   +'<rect x="40" y="120" width="110" height="26" class="l-biscuit"/>'
   +'<path d="M40 70 H150 V146 H40 Z" class="edge"/>'
   +'<rect x="40" y="66" width="110" height="6" class="l-cocoa"/>'
   +'</svg>';
}
function dessertCardHTML(p,i){
  return cardOpen(p,i,'card--dessert')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div>'
   +'<span class="ribbon-v" aria-hidden="true"></span><span class="ribbon-h" aria-hidden="true"></span></div>'
   +'<span class="bow" aria-hidden="true"><i></i><i></i><b></b></span>'
   +'<div class="stage">'+(p.img?prodHTML(p):tiramisuSVG())+'</div>'
   +'<div class="meta"><p class="cat"><span>TATLI KÖŞESİ</span><span class="no">'+noHTML(p)+'</span></p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<p class="sub">Günün tatlı finali</p>'
   +'<div class="foot"><span class="price">'+money(p.price)+'</span>'+ARROW+'</div>'
   +'</div></div></article>';
}

/* ============ DETAY (açılır pencere) — türe özel ============ */
/* burger: malzemeyi kat tipine ayır */
function layerType(s){var t=s.toLocaleLowerCase('tr').replace(/ı/g,'i');
  if(/patates/.test(t))return 'side';
  if(/tavuk|chicken|chick/.test(t))return 'chicken';
  if(/smash|köfte|dana|\bet\b/.test(t))return 'patty';
  if(/cheese|cheddar|peynir|parmesan/.test(t))return 'cheese';
  if(/soğan/.test(t))return 'onion';
  if(/gürkens|turşu|marul|jalapeno|biber$|salata/.test(t))return 'veg';
  if(/mayo|ketçap|reçel|sos|dynamite|ranch/.test(t))return 'sauce';
  return 'other';}
var STACK_ORDER=['veg','onion','sauce','other','cheese','chicken','patty'];
function isLight(hex){var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>160}
/* öneri çipi: dokununca o ürüne geç */
function goChip(p){return '<button type="button" class="go" data-go="'+p.id+'">'+(p.img?'<img src="'+p.img+'" alt="" loading="lazy">':'<i class="go-ph" aria-hidden="true"></i>')+'<span>'+esc(p.name)+'</span><b>'+money(p.price)+'</b></button>'}
function sauceBase(p){return p.name.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/\s*sos$/,'').trim()}
var SPLIT={n:2};
/* iki hex rengi karıştır (t: b oranı) */
function mixHex(a,b,t){var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),c=function(sh){return Math.round(((x>>sh)&255)*(1-t)+((y>>sh)&255)*t)};return "#"+((1<<24)|(c(16)<<16)|(c(8)<<8)|c(0)).toString(16).slice(1)}
function splitHTML(p){var per=Math.ceil(p.price/SPLIT.n);
  return '<div class="split"><p class="split-q">Kaç kişi paylaşacaksınız?</p><div class="stepper"><button type="button" data-split="-1" aria-label="Azalt">−</button>'
   +'<output aria-live="polite">'+SPLIT.n+'</output><button type="button" data-split="1" aria-label="Artır">+</button></div>'
   +'<p class="per">Kişi başı <b>'+money(per)+'</b></p></div>'}
/* shot turu hesabı */
var ROUND={n:1};
function roundHTML(p){
  return '<div class="split round"><p class="split-q">Kaç shot?</p><div class="stepper"><button type="button" data-round="-1" aria-label="Azalt">−</button>'
   +'<output aria-live="polite">'+ROUND.n+'</output><button type="button" data-round="1" aria-label="Artır">+</button></div>'
   +'<p class="per">Tur toplamı <b>'+money(p.price*ROUND.n)+'</b></p></div>'}
/* bira bardağı: hacme göre dolar (50 cl = tam) */
function pintSVG(cl){
  var f=Math.max(.25,Math.min(1,(cl||33)/50)),top=26+(1-f)*128;
  return '<svg class="pint" viewBox="0 0 120 170" aria-hidden="true" style="--fill-top:'+top.toFixed(1)+'px">'
   +'<defs><clipPath id="pintClip"><path d="M18 14 L102 14 L92 160 Q91 166 85 166 L35 166 Q29 166 28 160 Z"/></clipPath></defs>'
   +'<g clip-path="url(#pintClip)"><rect class="beer" x="0" y="'+top.toFixed(1)+'" width="120" height="170"/>'
   +'<rect class="foam" x="0" y="'+(top-12).toFixed(1)+'" width="120" height="14" rx="7"/>'
   +'<circle class="bb" cx="40" cy="150" r="2.5"/><circle class="bb b2" cx="62" cy="158" r="2"/><circle class="bb b3" cx="80" cy="152" r="3"/></g>'
   +'<path class="glass" d="M18 14 L102 14 L92 160 Q91 166 85 166 L35 166 Q29 166 28 160 Z"/>'
   +'<line class="mark" x1="24" y1="26" x2="34" y2="26"/><text class="mk" x="38" y="30">50cl</text></svg>'}
/* BİRA V2 — hacmi sayı yerine bardak anlatır (50 cl = tam dolu).
   İçeride katman katman sıvı: köpük başlığı · köpük altı açık geçiş · açık kehribar gövde ·
   koyulaşan alt kısım · dipte tortu gölgesi; yükselen kabarcıklar ve cam parlaması.
   Kartta küçük, detayda büyük çizilir (aynı SVG, CSS genişliği farklı). */
var pintN=0;
function pintTop(cl){var f=Math.max(.25,Math.min(1,(cl||33)/50));return 26+(1-f)*128}
function pintLayersSVG(cl,big){
  var top=pintTop(cl),u='pl'+(++pintN);
  var glass='M18 14 L102 14 L92 160 Q91 166 85 166 L35 166 Q29 166 28 160 Z';
  var foamB='';for(var k=0;k<7;k++)foamB+='<circle cx="'+(14+k*16)+'" cy="'+(top+2).toFixed(1)+'" r="'+(6+(k%3))+'"/>';
  var bub='';if(big)for(var b=0;b<6;b++)bub+='<circle class="bb" style="animation-delay:'+(-b*.47).toFixed(2)+'s" cx="'+(36+b*9)+'" cy="'+(150+(b%3)*5)+'" r="'+(1.6+(b%3)*.6)+'"/>';
  return '<svg class="pint pint2'+(big?' big':'')+'" viewBox="0 0 120 170" aria-hidden="true">'
   +'<defs><clipPath id="'+u+'c"><path d="'+glass+'"/></clipPath>'
   +'<linearGradient id="'+u+'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8CB5A"/><stop offset=".45" stop-color="#E9A12A"/><stop offset="1" stop-color="#B9620E"/></linearGradient></defs>'
   +'<g clip-path="url(#'+u+'c)"><g class="liq">'
   +'<rect x="0" y="'+top.toFixed(1)+'" width="120" height="170" fill="url(#'+u+'g)"/>'
   +'<rect x="0" y="152" width="120" height="20" fill="#7A3A06" opacity=".28"/>'
   +'<rect x="0" y="'+(top+2).toFixed(1)+'" width="120" height="7" fill="#FFE3A0" opacity=".75"/>'
   +bub
   +'<rect x="0" y="'+(top-13).toFixed(1)+'" width="120" height="15" fill="#FFF8EA"/>'
   +'<g fill="#FFF8EA">'+foamB+'</g>'
   +'<g fill="#F1E6CF">'+'<circle cx="34" cy="'+(top-6).toFixed(1)+'" r="2"/><circle cx="58" cy="'+(top-8).toFixed(1)+'" r="1.6"/><circle cx="80" cy="'+(top-5).toFixed(1)+'" r="2.2"/></g>'
   +'</g><path d="M30 20 L38 20 L34 156 L30 156 Z" fill="#fff" opacity=".28"/></g>'
   +'<path class="glass" d="'+glass+'"/>'
   +(big?'<line class="mark" x1="24" y1="26" x2="34" y2="26"/>':'')
   +'</svg>'}
/* soğuk içecek: içindekiler (parantez içi ya da virgüllü açıklama) */
function softParts(p){var d=p.desc||'',m=d.match(/\(([^)]*)\)/);
  return (m?m[1]:(/,/.test(d)?d:'')).split(',').map(function(x){return x.trim()}).filter(Boolean)}
var PART_COL={'elma':'#7DBB3C','semiz':'#4E9A3A','limon':'#F2C200','frambuaz':'#C2185B','hibisk':'#9C1B4A','tuz':'#B9C4C9','soda':'#8FD3E8','nane':'#3FA66B','çilek':'#E53950','portakal':'#F28C1B','pomelo':'#F47C6B','sour':'#C9D84A','şeker':'#E8DCC4'};
function partCol(x){var t=x.toLocaleLowerCase('tr');for(var k in PART_COL)if(t.indexOf(k)>-1)return PART_COL[k];return 'var(--teal)'}
/* sıcak içecek: demleme bilgisi */
function brewOf(p){var t=p.name.toLocaleLowerCase('tr').replace(/ı/g,'i');
  if(/türk|turk/.test(t))return {m:'Cezvede pişirilir',s:4,sugar:true};
  if(/filtre/.test(t))return {m:'Filtreden damla damla demlenir',s:2};
  if(/double|doppio/.test(t))return {m:'Çift shot espresso',s:5};
  if(/americano/.test(t))return {m:'Espresso üzerine sıcak su',s:3};
  return {m:'Taze demlenir',s:3}}
var SUGAR={v:0},SUGARS=['Sade','Az şekerli','Orta','Şekerli'];
function sugarHTML(){return '<div class="sugar-d"><p class="pair-h">NASIL İÇERSİN?</p><div class="seg" role="radiogroup" aria-label="Şeker">'
  +SUGARS.map(function(x,k){return '<button type="button" role="radio" data-sugar="'+k+'" aria-checked="'+(k===SUGAR.v)+'">'+x+'</button>'}).join('')
  +'</div><p class="hint-d">Siparişte garsona söylemen yeterli.</p></div>'}
var BEAN='<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="7.5" ry="10" transform="rotate(30 12 12)"/><path d="M9 4.5c4 4 2 11 6 15" /></svg>';
var DETAIL={
  soft:{
    hero:function(p){
      var d='';for(var k=0;k<9;k++)d+='<i style="--d:'+k+'"></i>';
      return '<span class="d-frost"></span><span class="d-halo"></span><span class="d-drops">'+d+'</span>'
        +'<span class="d-cube c1"></span><span class="d-cube c2"></span><span class="d-cube c3"></span>';
    },
    art:function(p){return mocktailSVG(liquidColor(p))},
    extra:function(p){
      var parts=softParts(p),type=softType(p),lead=(p.desc||'').split('(')[0].trim(),h='';
      if(lead&&/\(/.test(p.desc))h+='<p class="lead-d">'+esc(lead.charAt(0).toLocaleUpperCase('tr')+lead.slice(1))+'</p>';
      if(parts.length)h+='<div class="parts-d"><p class="pair-h">İÇİNDE NE VAR?</p><ul>'+parts.map(function(x,k){
        return '<li style="--k:'+k+';--c:'+partCol(x)+'"><i aria-hidden="true"></i>'+esc(x)+'</li>'}).join('')+'</ul></div>';
      return h;
    }
  },
  hot:{
    hero:function(p){
      return '<span class="d-beans"></span><span class="d-ring r1"></span><span class="d-ring r2"></span>'
        +'<svg class="d-steam" viewBox="0 0 120 90"><path d="M30 88 C18 70 42 58 30 40 C20 26 36 14 30 2"/><path d="M60 88 C48 70 72 58 60 40 C50 26 66 14 60 2"/><path d="M90 88 C78 70 102 58 90 40 C80 26 96 14 90 2"/></svg>'
        +'<svg class="d-seal" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96"/><circle class="ring" cx="100" cy="100" r="64"/>'
        +'<text><textPath href="#coasterRing" textLength="482">TAZE DEMLEME ✦ 21 GRAM ✦ TAZE DEMLEME ✦ 21 GRAM ✦</textPath></text>'
        +'<path class="mid" d="M78 88 H118 V100 A20 20 0 0 1 78 100 Z"/><path class="mid-h" d="M118 92 H124 A7 7 0 0 1 124 106 H116"/><path class="mid-h" d="M88 82 q-4 -6 0 -12 M98 82 q-4 -6 0 -12 M108 82 q-4 -6 0 -12"/></svg>';
    },
    art:function(p){return cupSVG()},
    extra:function(p){
      var b=brewOf(p),beans='';
      for(var k=0;k<5;k++)beans+='<span class="'+(k<b.s?'on':'')+'" style="--k:'+k+'">'+BEAN+'</span>';
      SUGAR.v=0;
      var h='<p class="brew-d"><span>YÖNTEM</span>'+esc(b.m)+'</p>'
        +'<div class="str-d"><p class="pair-h">YOĞUNLUK</p><div class="beans" aria-label="Yoğunluk 5 üzerinden '+b.s+'">'+beans+'</div></div>'
        +(b.sugar?sugarHTML():'');
      return h;
    }
  },
  cocktail:{
    hero:function(p){
      return '<span class="d-glow2"></span><span class="d-rays"></span>'
        +(isV2(p)?'':'<span class="d-arch"></span><svg class="d-arc" viewBox="0 0 300 200"><text><textPath href="#cocktailArc" startOffset="50%" text-anchor="middle">'+esc(p.category.toLocaleUpperCase('tr'))+'</textPath></text></svg>')
        +'<span class="d-spark k1">✦</span><span class="d-spark k2">✦</span><span class="d-spark k3">✦</span>';
    },
    extra:function(p){
      var parts=(p.desc||'').split(',').map(function(x){return x.trim()}).filter(Boolean),sp=spiritOf(p);
      var h=sp?'<p class="spirit-d">'+esc(sp)+'</p>':'';
      if(!parts.length)return h+'<p class="classic-d">Klasik reçeteyle hazırlanır.</p>';
      return h+'<div class="recipe-d"><p class="pair-h">TARİF</p><ol>'+parts.map(function(x,k){
        return '<li style="--k:'+k+'"><span class="n">'+String(k+1).padStart(2,'0')+'</span><span class="t">'+esc(x)+'</span><span class="pour" aria-hidden="true"></span></li>'}).join('')+'</ol></div>';
    }
  },
  beer:{
    hero:function(p){
      var b='';for(var k=0;k<14;k++)b+='<i style="--b:'+k+'"></i>';
      return '<span class="d-bubbles">'+b+'</span><svg class="d-coaster" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96"/><circle class="ring" cx="100" cy="100" r="64"/>'
        +'<text><textPath href="#coasterRing" textLength="482">SOĞUK SERVİS ✦ 21 GRAM ✦ SOĞUK SERVİS ✦ 21 GRAM ✦</textPath></text></svg>';
    },
    extra:function(p){
      var sz=sizeParts(p.size)||sizeParts(p.desc),draft=/fıçı|fiçi|fici/.test((p.name+' '+p.desc).toLocaleLowerCase('tr'));
      if(p.kind==='beer'){
        if(!sz)return '<div class="beer-d v2"><p class="type-d">'+(draft?'FIÇI':'ŞİŞE')+'</p></div>';
        var cl=parseFloat(sz.n),t=pintTop(cl),pc=function(y){return (y/170*100).toFixed(1)+'%'};
        return '<div class="beer-d v2"><p class="type-d">'+(draft?'FIÇI':'ŞİŞE')+'</p>'
          +'<div class="pint-wrap">'+pintLayersSVG(cl,true)
          +'<span class="lbl tot" style="top:'+pc(t-13)+'"><b>'+esc(sz.n)+' '+esc(sz.u.toLocaleLowerCase('tr'))+'</b></span>'
          +'<span class="lbl" style="top:'+pc(t-5)+'">Köpük</span>'
          +'<span class="lbl" style="top:'+pc((t+160)/2)+'">Bira</span>'
          +'</div></div>';
      }
      return '<div class="beer-d"><div class="vol-d"><p class="type-d">'+(draft?'FIÇI':'ŞİŞE')+'</p>'
        +(sz?'<p class="big-vol"><b>'+esc(sz.n)+'</b><span>'+esc(sz.u)+'</span></p>':'')+'</div>'
        +(sz?pintSVG(parseFloat(sz.n)):'')+'</div>';
    }
  },
  spirit:{
    hero:function(p){return '<span class="d-spot"></span><span class="d-shelf"><span>TOP SHELF</span></span>'},
    extra:function(p){
      var sz=sizeParts(p.size),sp=spiritOf(p).replace(' BAZLI',''),cl=sz?parseFloat(sz.n):5;
      var ticks='';for(var t=1;t<=5;t++)ticks+='<span style="left:'+(t*20)+'%"><i>'+t+'</i></span>';
      return '<p class="meta-d">'+[sp,sz?sz.n+' '+sz.u:'','TEK SERVİS'].filter(Boolean).map(esc).join('<i>·</i>')+'</p>'
        +'<div class="jig-d"><p class="pair-h">SERVİS ÖLÇÜSÜ</p><div class="bar" style="--to:'+Math.min(100,cl*20)+'%">'+ticks+'<span class="fill"></span></div></div>';
    }
  },
  shot:{
    hero:function(p){return '<span class="d-neon"></span><span class="d-floor"></span><span class="d-sticker">SHOT!</span>'},
    extra:function(p){
      ROUND.n=1;var sp=spiritOf(p).replace(' BAZLI','');
      /* v2: kaç shot sayacı yok; fiyat bileti isim yerine bu satırda (isim sıkışmasın) */
      return '<div class="shot-row">'+(sp?'<p class="spirit-d neon">'+esc(sp)+'</p>':'<span></span>')+ticketHTML(p)+'</div>';
    }
  },
  share:{
    hero:function(p){return '<span class="d-dots"></span><span class="d-stamp">PAYLAŞ</span><span class="d-no">'+noHTML(p)+'</span>'},
    extra:function(p){
      SPLIT.n=2;
      var parts=(p.desc||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
      if(isV2(p))return parts.length?ingrHTML(parts):'';
      return '<div class="slip-d"><p class="slip-h"><span>SİPARİŞ FİŞİ</span>'+(isV2(p)?'':'<span>'+noHTML(p)+'</span>')+'</p>'
        +(parts.length?'<ul class="checks-d">'+parts.map(function(x,k){return '<li style="--k:'+k+'"><i aria-hidden="true"></i>'+esc(x)+'</li>'}).join('')+'</ul>':'')
        +splitHTML(p)
        +'<p class="total-d"><span>TOPLAM</span><span class="dots" aria-hidden="true"></span><b>'+money(p.price)+'</b></p></div>';
    }
  },
  sauce:{
    heroColor:function(p){return mixHex(SAUCE_COLORS[p.id]||'#E4032D','#FFFCEC',.78)},
    hero:function(p){return '<svg class="d-drip" style="fill:'+(SAUCE_COLORS[p.id]||'#E4032D')+'" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 0 H200 V22 Q192 22 190 30 Q188 46 182 46 Q176 46 175 30 Q174 20 164 22 Q150 24 146 34 Q143 54 135 54 Q127 54 126 36 Q125 22 112 22 Q98 22 96 28 Q94 38 88 38 Q82 38 81 28 Q80 20 66 22 Q52 24 50 36 Q48 58 39 58 Q30 58 29 38 Q28 22 16 22 Q4 22 0 26 Z"/></svg>'},
    art:function(p){return '<div style="--sauce:'+(SAUCE_COLORS[p.id]||'#E4032D')+'">'+ramekinSVG(p)+'</div>'},
    extra:function(p){
      var base=sauceBase(p);
      var used=PRODUCTS.filter(function(x){return x.kind!=='sauce'&&(x.desc||'').toLocaleLowerCase('tr').replace(/ı/g,'i').indexOf(base)>-1});
      return '<div class="pair"><p class="pair-h">'+(used.length?'BU SOS ŞUNLARDA VAR':'HER BURGERİN YANINA')+'</p>'
        +(used.length?'<div class="pair-l">'+used.map(goChip).join('')+'</div>':'')+'</div>';
    }
  },
  dessert:{
    hero:function(p){return '<span class="d-stripes"></span><span class="d-lid"><span class="lid-rb"></span><span class="bow"><i></i><i></i><b></b></span></span>'},
    art:function(p){return tiramisuSVG()},
    extra:function(p){
      var hot=PRODUCTS.filter(function(x){return x.kind==='hot'});
      return hot.length?'<div class="pair"><p class="pair-h">YANINA BİR KAHVE?</p><div class="pair-l">'+hot.map(goChip).join('')+'</div></div>':'';
    }
  },
  burger:{
    hero:function(p){
      return '<span class="d-gingham"></span><svg class="d-burst" viewBox="0 0 200 200"><use href="#burst"/></svg>'
        +(isV2(p)?'':'<span class="d-tag"><small>₺</small>'+new Intl.NumberFormat('tr-TR').format(p.price)+'</span>')
        +'<span class="d-no">'+noHTML(p)+'</span>';
    },
    extra:function(p){
      var parts=(p.desc||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
      if(!parts.length)return '';
      if(isV2(p))return ingrHTML(parts);
      var sides=parts.filter(function(x){return layerType(x)==='side'});
      var layers=parts.filter(function(x){return layerType(x)!=='side'})
        .map(function(x,i){return {t:x,type:layerType(x),i:i}})
        .sort(function(a,b){return STACK_ORDER.indexOf(a.type)-STACK_ORDER.indexOf(b.type)||a.i-b.i});
      var n=layers.length+2,li=function(cls,label,k,col){
        var st='--k:'+k+(col?';--c:'+col:'');
        return '<li class="ly '+cls+(col&&isLight(col)?' light':'')+'" style="'+st+'"><span>'+label+'</span></li>'};
      var html='<div class="stack"><p class="stack-h"><span>İÇİNDEKİLER</span><span>'+layers.length+' kat</span></p><ol class="stack-l">';
      html+=li('bun bun-top','',n-1);
      layers.forEach(function(l,idx){html+=li(l.type,esc(l.t),n-2-idx,layerColor(l.t))});
      html+=li('bun bun-bottom','',0)+'</ol>';
      if(sides.length)html+='<p class="stack-side"><b>Yanında</b> '+sides.map(esc).join(', ')+'</p>';
      return html+'</div>';
    }
  }
};

/* ——— ortak parçalar ——— */
/* yükleme silüeti: görselin hemen ardından gelir (img.ld + .sk ile söner) */
var SK_KINDS={burger:1,cocktail:1,beer:1,spirit:1,shot:1,soft:1,hot:1,share:1};
function skHTML(p){return '<span class="sk" data-k="'+(SK_KINDS[p.kind]?p.kind:'classic')+'" aria-hidden="true"></span>'}
/* yüklenme takibi: önbellekten anında gelen görsel efektsiz, geciken görsel yumuşakça belirir */
function armImgs(root){
  var now=performance.now();
  [].forEach.call(root.querySelectorAll('img.prod,#hp'),function(i){
    if(i.tagName!=='IMG')return;
    if(i.complete&&i.naturalWidth)i.classList.add('ld');else i._t0=now;
  });
}
document.addEventListener('load',function(e){var i=e.target;
  if(i.tagName!=='IMG'||!(i.classList.contains('prod')||i.id==='hp'))return;
  var cd=i.closest('.card');   /* ekran dışındaki kart: sessizce yerleşsin (animasyonu zaten duraklatılmış olurdu) */
  if(i._t0&&performance.now()-i._t0>150&&!RM&&(!cd||cd.classList.contains('in-view')))i.classList.add('fade');
  i.classList.add('ld');
},true);
document.addEventListener('error',function(e){var i=e.target;if(i.tagName==='IMG'&&i.classList.contains('prod'))i.classList.add('err')},true);
function prodHTML(p){return p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'+skHTML(p)
                :'<div class="ph" aria-hidden="true"><img src="'+LOGO_IMG+'" alt=""></div>'}
function cardOpen(p,i,cls){return '<article class="card '+cls+'" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+'" aria-label="'+esc(p.name+(p.size?' '+p.size:'')+', '+money(p.price)+'. Detayı aç')+'">'}
var ARROW='<span class="more" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
function noHTML(p){return 'No.'+String(p.no).padStart(2,'0')}
/* "33cl", "40 cl", "5cl" → {n:"33", u:"CL"} */
function sizeParts(s){var m=String(s||'').match(/(\d+[.,]?\d*)\s*(cl|ml|lt|l)\b/i);return m?{n:m[1],u:m[2].toLocaleUpperCase('tr')}:null}

/* ——— BİRA KARTI: "şişe etiketi" ———
   yatay kart · solda kırmızı panel + yükselen kabarcıklar + dönen bira altlığı · köpük ayraç
   · sağda iri hacim rozeti ve şişe/fıçı etiketi */
function beerCardHTML(p,i){
  var sz=sizeParts(p.size)||sizeParts(p.desc),draft=/fıçı|fiçi|fici/.test((p.name+' '+p.desc).toLocaleLowerCase('tr'));
  var bubbles='';for(var b=0;b<7;b++)bubbles+='<i style="--b:'+b+'"></i>';
  var v2=true; /* bira v2: tüm biralar */
  return cardOpen(p,i,'card--beer'+(v2?' v2':''))
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage"><span class="bubbles" aria-hidden="true">'+bubbles+'</span>'
   +'<svg class="coaster" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96"/><circle class="ring" cx="100" cy="100" r="64"/>'
   +'<text><textPath href="#coasterRing" textLength="482">SOĞUK SERVİS ✦ 21 GRAM ✦ SOĞUK SERVİS ✦ 21 GRAM ✦</textPath></text></svg>'
   +prodHTML(p)+'</div>'
   +'<div class="meta"><p class="cat">'+(v2?'':'<span class="no">'+noHTML(p)+'</span>')+'<span class="type">'+(draft?'FIÇI':'ŞİŞE')+'</span></p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +(sz&&!v2?'<p class="vol"><b>'+esc(sz.n)+'</b><span>'+esc(sz.u)+'</span></p>':'')
   +(p.desc?'<p class="desc">'+esc(p.desc)+'</p>':'')
   +(v2&&sz?'<div class="vol-g"><span class="cl">'+esc(sz.n)+'<small>'+esc(sz.u.toLocaleLowerCase('tr'))+'</small></span>'+pintLayersSVG(parseFloat(sz.n),false)+'</div>':'')
   +'<div class="foot">'+(v2?ticketHTML(p):'<span class="price">'+money(p.price)+'</span>')+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— YÜKSEK ALKOL KARTI: "mahzen etiketi" ———
   krem zemin + süslü çift çerçeve · kaide üstünde kadeh · 5cl'ye dolu ölçü cetveli · kurdele bayrakta isim */
/* V2: "sipariş fişi" — eski paylaşımlık fişinin tasarımı (card--share stilleri) yüksek alkolde.
   Açıklama olmadığından ✓ satırları yalnızca bilinenler: içki türü · ölçü · tek servis. */
/* deneme: ilk yüksek alkolde şişe fişin dışına taşar */
var SPIRIT_OUT=(PRODUCTS.find(function(p){return p.kind==='spirit'})||{}).id;
function spiritCardV2(p,i){
  var out=p.id===SPIRIT_OUT;
  var sz=sizeParts(p.size),sp=spiritOf(p).replace(' BAZLI','');
  var lines=[sp?sp.charAt(0)+sp.slice(1).toLocaleLowerCase('tr'):'',sz?sz.n+' '+sz.u.toLocaleLowerCase('tr')+' ölçü':'','Tek servis'].filter(Boolean);
  var slip='<p class="slip" aria-hidden="true"><span>SİPARİŞ FİŞİ</span>'+(sz?'<span>'+esc(sz.n+' '+sz.u)+'</span>':'')+'</p>';
  var stage='<div class="stage">'+prodHTML(p)+'<span class="tag-share" aria-hidden="true">TOP SHELF</span></div>';
  return cardOpen(p,i,'card--share card--fis'+(out?' out':''))
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +(out?stage+slip:slip+stage)
   +'<div class="meta"><p class="cat">'+esc(p.category)+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<ul class="checks">'+lines.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul>'
   +'<div class="foot"><span class="total">TOPLAM</span>'+ticketHTML(p)+ARROW+'</div>'
   +'</div></div></article>';
}
/* ——— YÜKSEK ALKOL V3: "arka bar rafı" ———
   krem kart · şişe pirinç raf çubuğunun üstünde durur, arkasında sıcak spot ışığı · köşelerde 21GRAM logosu
   · modern içki rozeti (tür + ölçü) · ortalı isim · "TOP SHELF" satırı · büyük bilet + ok · Şişe Adam maskotu */
var BOTTLE_SVG='<svg class="mc" viewBox="0 0 40 50" aria-hidden="true">'
 +'<g class="mc-legs"><path class="mc-l" d="M16 36 L15 46"/><path class="mc-r" d="M24 36 L25 46"/></g>'
 +'<ellipse cx="14" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/><ellipse cx="26" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/>'
 +'<rect x="16.5" y="1.5" width="7" height="4.5" rx="1.2" fill="#E4032D" stroke="#1D0A0E" stroke-width="1.2"/>'
 +'<path d="M17.5 6 H22.5 V11 Q29 13 29 19 V35 Q29 37.5 26.5 37.5 H13.5 Q11 37.5 11 35 V19 Q11 13 17.5 11 Z" fill="#3E7D5A" stroke="#1D0A0E" stroke-width="1.4" stroke-linejoin="round"/>'
 +'<path d="M14 15 Q15 13 17 12.4" stroke="#BFE3CC" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
 +'<rect x="11.8" y="18" width="16.4" height="13" rx="2" fill="#FFFCEC" stroke="#1D0A0E" stroke-width="1.1"/>'
 +'<circle cx="16.5" cy="23" r="2.2" fill="#fff" stroke="#1D0A0E" stroke-width="1"/><circle cx="23.5" cy="23" r="2.2" fill="#fff" stroke="#1D0A0E" stroke-width="1"/>'
 +'<circle cx="17.2" cy="23.3" r="1" fill="#1D0A0E"/><circle cx="24.2" cy="23.3" r="1" fill="#1D0A0E"/>'
 +'<path d="M17.5 27.5 q2.5 2 5 0" stroke="#1D0A0E" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
 +'<g class="mc-arm"><path d="M0 0 L0 9" stroke="#1D0A0E" stroke-width="2" stroke-linecap="round"/><circle cy="10" r="2.6" fill="#fff" stroke="#1D0A0E" stroke-width="1.2"/></g>'
 +'</svg>';
/* içindekiler: menüde açıklama yok → üreticilerin bilinen tarif notları (işletmeye teyit ettirilecek) */
var SPIRIT_NOTES={
  'tanqueray-5cl':[['Ardıç','#4E6B3A'],['Kişniş','#B8A04A'],['Melek otu','#7C9A5B'],['Meyan kökü','#5A3A22']],
  'hendrick-s-5cl':[['Ardıç','#4E6B3A'],['Salatalık','#6FA24A'],['Bulgar gülü','#D46A8C'],['Narenciye kabuğu','#E8A33A']],
  'beefeather-5cl':[['Ardıç','#4E6B3A'],['Sevilla portakalı','#E07A26'],['Limon kabuğu','#E8C93A'],['Kişniş','#B8A04A']],
  'malfy-5cl':[['İtalyan limonu','#E8C93A'],['Ardıç','#4E6B3A'],['Kişniş','#B8A04A']],
  'absolut-5cl':[['Kış buğdayı','#C99A4A'],['Saf kaynak suyu','#6AA8D0']]
};
/* tüm yüksek alkol kartları */
var SPIRIT_FIT=PRODUCTS.filter(function(p){return p.kind==='spirit'}).map(function(p){return p.id});
function spiritCardV3(p,i){
  var si=SPIRIT_FIT.indexOf(p.id),mascot=!RM,mcd=-((si*3.1)%12).toFixed(1);
  var sz=sizeParts(p.size),sp=spiritOf(p).replace(' BAZLI',''),notes=SPIRIT_NOTES[p.id]||[];
  var badge='<span class="spirit sp2"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5C8 1.5 3 7.2 3 10.2a5 5 0 0 0 10 0C13 7.2 8 1.5 8 1.5z"/></svg>'
   +'<b>'+esc(sp||p.category.toLocaleUpperCase('tr'))+'</b>'+(sz?'<span>'+esc(sz.n+' '+sz.u)+'</span>':'')+'</span>';
  return '<article class="card card--bar fit'+(mascot?' has-mascot':'')+'" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+';--mcd:'+mcd+'s" aria-label="'+esc(p.name+(p.size?' '+p.size:'')+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><span class="spot" aria-hidden="true"></span><div class="sheen"></div></div>'
   +'<div class="stage">'+prodHTML(p)+'</div>'
   +'<div class="meta"><p class="cat">'+badge+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<p class="top-shelf" aria-hidden="true">TOP SHELF</p>'
   +(notes.length?'<ul class="layers" aria-label="İçindekiler" data-max2>'+notes.map(function(n){return '<li style="--c:'+n[1]+'">'+esc(n[0])+'</li>'}).join('')+'</ul>':'')
   +'<div class="foot">'+(mascot?mascotLane(BOTTLE_SVG):'')+'<span class="cta tk">'+ticketHTML(p)+'</span>'+ARROW+'</div>'
   +'</div></div></article>';
}
function spiritCardHTML(p,i){return SPIRIT_FIT.indexOf(p.id)>=0?spiritCardV3(p,i):spiritCardV2(p,i)}
/* eski "mahzen etiketi" kartı — şimdilik kullanılmıyor */
function spiritCardV1(p,i){
  var sz=sizeParts(p.size),sp=spiritOf(p).replace(' BAZLI',''),cl=sz?parseFloat(sz.n):5;
  var ticks='';for(var t=5;t>=1;t--)ticks+='<li'+(t<=cl?' class="on"':'')+'><span>'+t+'</span></li>';
  return cardOpen(p,i,'card--spirit')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div>'
   +'<span class="orn o1">✦</span><span class="orn o2">✦</span><span class="orn o3">✦</span><span class="orn o4">✦</span></div>'
   +'<div class="stage"><p class="shelf" aria-hidden="true">— TOP SHELF —</p>'
   +'<ol class="jigger" aria-hidden="true">'+ticks+'</ol>'
   +prodHTML(p)+'<span class="plinth" aria-hidden="true"></span></div>'
   +'<div class="meta"><h3 class="name"><span class="ribbon">'+esc(p.name)+'</span></h3>'
   +'<p class="cat">'+[sp,sz?sz.n+' '+sz.u:'','TEK SERVİS'].filter(Boolean).map(esc).join('<i aria-hidden="true">·</i>')+'</p>'
   +'<div class="foot"><span class="no">'+noHTML(p)+'</span><span class="price">'+money(p.price)+'</span>'+ARROW+'</div>'
   +'</div></div></article>';
}

/* ——— SHOT KARTI: "neon tabela" ———
   siyah zemin + titreyen kırmızı neon çerçeve · neon isim · eğik SHOT! çıkartması · bilet koçanı fiyat */
function shotCardHTML(p,i){
  var sp=spiritOf(p).replace(' BAZLI','');
  var nm=p.name.replace(/\s*shot$/i,'');
  return cardOpen(p,i,'card--shot v2')
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage"><span class="floor" aria-hidden="true"></span>'+prodHTML(p)
   +'<span class="sticker" aria-hidden="true">SHOT!</span></div>'
   +'<div class="meta">'+(sp?'<p class="cat"><span class="type">'+esc(sp)+'</span></p>':'')
   +'<h3 class="name">'+esc(nm)+'</h3>'
   +'<div class="foot">'+ticketHTML(p)+ARROW+'</div>'
   +'</div></div></article>';
}
/* ——— KOKTEYL KARTI: "gece barı" ———
   koyu kart + art-deco çerçeve · ışık hüzmeli kemer pencerede bardak · kemer üstünde kavisli kategori adı
   · baz içki rozeti · bar menüsü gibi ortalı tarif satırı */
/* KOKTEYL ADAM — kokteyl maskotu: kupa bardak gövde (kırmızı içki), kenarda kiraz çubuğu, ayaklı sap.
   Burger Adam ile aynı iskelet (bacaklar 36–46, omuz 31,27) → aynı CSS sahnesi oynar. */
var COCKTAIL_SVG='<svg class="mc" viewBox="0 0 40 50" aria-hidden="true">'
 +'<g class="mc-legs"><path class="mc-l" d="M16 36 L15 46"/><path class="mc-r" d="M24 36 L25 46"/></g>'
 +'<ellipse cx="14" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/><ellipse cx="26" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/>'
 +'<path d="M13 4 L19 15" stroke="#1D0A0E" stroke-width="1.3" stroke-linecap="round"/><circle cx="12.5" cy="4.5" r="3.2" fill="#C8102E" stroke="#1D0A0E" stroke-width="1.1"/>'
 +'<path d="M20 30 V35" stroke="#1D0A0E" stroke-width="2.4"/><rect x="13" y="34.5" width="14" height="3" rx="1.5" fill="#FFFCEC" stroke="#1D0A0E" stroke-width="1.2"/>'
 +'<path d="M5 13 H35 Q35 31 20 31 Q5 31 5 13 Z" fill="#E4032D" stroke="#1D0A0E" stroke-width="1.4" stroke-linejoin="round"/>'
 +'<ellipse cx="20" cy="13" rx="15" ry="2.6" fill="#F7A3A8" stroke="#1D0A0E" stroke-width="1.2"/>'
 +'<circle cx="31" cy="9" r="4.4" fill="#F2C94C" stroke="#1D0A0E" stroke-width="1.1"/><path d="M31 5 V13 M27 9 H35" stroke="#FFF6C8" stroke-width=".9"/>'
 +'<circle cx="15.5" cy="20" r="2.4" fill="#fff" stroke="#1D0A0E" stroke-width="1"/><circle cx="24.5" cy="20" r="2.4" fill="#fff" stroke="#1D0A0E" stroke-width="1"/>'
 +'<circle cx="16.3" cy="20.3" r="1.1" fill="#1D0A0E"/><circle cx="25.3" cy="20.3" r="1.1" fill="#1D0A0E"/>'
 +'<path d="M17 25 q3 2.3 6 0" stroke="#1D0A0E" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
 +'<g class="mc-arm"><path d="M0 0 L0 9" stroke="#1D0A0E" stroke-width="2" stroke-linecap="round"/><circle cy="10" r="2.6" fill="#fff" stroke="#1D0A0E" stroke-width="1.2"/></g>'
 +'</svg>';
/* baz içki rozeti (modern): damla simgesi + kalın içki adı + ince "BAZLI" */
function spiritBadge(sp){var m=/^(.*)\s(BAZLI)$/.exec(sp);
  return '<span class="spirit sp2"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5C8 1.5 3 7.2 3 10.2a5 5 0 0 0 10 0C13 7.2 8 1.5 8 1.5z"/></svg><b>'+esc(m?m[1]:sp)+'</b>'+(m?'<span>'+m[2]+'</span>':'')+'</span>'}
/* kokteylde burger kartı kuralları (.fit) — tüm kokteyl kartları */
var COCKTAIL_FIT=PRODUCTS.filter(function(p){return p.kind==='cocktail'}).map(function(p){return p.id});
function cocktailCardFit(p,i){
  var ci=COCKTAIL_FIT.indexOf(p.id),mascot=!RM,mcd=-((ci*3.1)%12).toFixed(1),sp=spiritOf(p);
  var parts=(p.desc||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  var recipe=parts.length?parts.map(function(s){return '<span>'+esc(s)+'</span>'}).join('<i aria-hidden="true">✦</i>'):'<span class="classic">Klasik reçete</span>';
  return '<article class="card card--cocktail v2 fit'+(mascot?' has-mascot':'')+'" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+';--mcd:'+mcd+'s" aria-label="'+esc(p.name+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage">'+prodHTML(p)+'</div>'
   +'<div class="meta"><p class="cat">'+(sp?spiritBadge(sp):'')+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<p class="recipe">'+recipe+'</p>'
   +'<div class="foot">'+(mascot?mascotLane(COCKTAIL_SVG):'')+'<span class="cta tk">'+ticketHTML(p)+'</span>'+ARROW+'</div>'
   +'</div></div></article>';
}
function cocktailCardHTML(p,i){
  if(COCKTAIL_FIT.indexOf(p.id)>=0)return cocktailCardFit(p,i);
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'+skHTML(p)
                :'<div class="ph" aria-hidden="true"><img src="'+LOGO_IMG+'" alt=""></div>';
  var parts=(p.desc||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  var recipe=parts.length?parts.map(function(s){return '<span>'+esc(s)+'</span>'}).join('<i aria-hidden="true">✦</i>')
                         :'<span class="classic">Klasik reçete</span>';
  var sp=spiritOf(p),v2=isV2(p);
  return '<article class="card card--cocktail'+(v2?' v2':'')+'" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+'" aria-label="'+esc(p.name+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage">'+(v2?'':'<div class="arch" aria-hidden="true"><span class="rays"></span><span class="glow"></span></div>')
   +(v2?'':'<svg class="arc-title" viewBox="0 0 300 120" aria-hidden="true"><text><textPath href="#cocktailArc" startOffset="50%" text-anchor="middle">'+esc(p.category.toLocaleUpperCase('tr'))+'</textPath></text></svg>')
   +'<span class="spark s1" aria-hidden="true">✦</span><span class="spark s2" aria-hidden="true">✦</span>'
   +vis+(v2?'':'<span class="bar" aria-hidden="true"></span>')+'</div>'
   +'<div class="meta"><p class="cat">'+(sp?'<span class="spirit">'+esc(sp)+'</span>':'')+'</p>'
   +'<h3 class="name">'+esc(p.name)+'</h3>'
   +'<p class="recipe">'+recipe+'</p>'
   +'<div class="foot">'+(v2?ticketHTML(p):'<span class="price">'+money(p.price)+'</span>')+'<span class="more" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>'
   +'</div></div></article>';
}
/* ——— BURGER KARTI: "ambalaj kâğıdı" ———
   kareli tepsi kâğıdı şeridi · güneş patlaması rozeti üstünde taşan burger · eğik fiyat etiketi
   · malzemeler burger katları gibi renk kodlu · alt kenar tırtıklı ambalaj */
function burgerCardHTML(p,i){
  if(isV2(p))return burgerCardV2(p,i);
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'+skHTML(p)
                :'<div class="ph" aria-hidden="true"><img src="'+LOGO_IMG+'" alt=""></div>';
  var parts=(p.desc||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  var shown=parts.slice(0,5),rest=parts.length-shown.length;
  var layers=shown.map(function(s){return '<li style="--c:'+layerColor(s)+'">'+esc(s)+'</li>'}).join('')+(rest>0?'<li class="more-l">+'+rest+'</li>':'');
  return '<article class="card card--burger" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+'" aria-label="'+esc(p.name+(p.size?' '+p.size:'')+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="gingham" aria-hidden="true"></div><div class="sheen"></div></div>'
   +'<div class="stage"><svg class="burst" viewBox="0 0 200 200" aria-hidden="true"><use href="#burst"/></svg>'+vis
   +'<span class="tag" aria-hidden="true"><small>₺</small>'+new Intl.NumberFormat('tr-TR').format(p.price)+'</span></div>'
   +'<div class="meta"><p class="cat"><span>'+esc(p.category)+'</span><span class="no">No.'+String(p.no).padStart(2,'0')+'</span></p>'
   +'<h3 class="name">'+esc(p.name)+(p.size?' <small>'+esc(p.size)+'</small>':'')+'</h3>'
   +(layers?'<ul class="layers" aria-label="Malzemeler">'+layers+'</ul>':'')
   +'<div class="foot"><span class="cta">Yakından bak</span><span class="more" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>'
   +'</div></div></article>';
}
/* V2: sarı rozet ve kareli şerit yok · fiyat adın karşısında bilet · "3D gör" · dağınık 21GRAM filigranı */
/* detay: içindekiler — karttaki renkli malzeme düğmeleri (burger + paylaşımlık) */
function ingrHTML(parts){
  return '<div class="stack v2"><p class="stack-h"><span>İÇİNDEKİLER</span><span>'+parts.length+' malzeme</span></p>'
    +'<ul class="layers">'+parts.map(function(x){return '<li style="--c:'+layerColor(x)+'">'+esc(x)+'</li>'}).join('')+'</ul></div>';
}
function ticketHTML(p){return '<span class="ticket" aria-hidden="true"><small>₺</small>'+new Intl.NumberFormat('tr-TR').format(p.price)+'</span>'}
/* KART MASKOTU — küçük Burger Adam: '3D GÖR'ün üstünden belirir, oka yürür, 'bas!' der, geri döner.
   Tüm burger kartlarında, kartlar arası kaydırmalı. CSS ile oynar; kart ekranda değilse durur. */
/* yeni burger kartı düzeni (referans görsel ölçüsü, logo filigranı, sabit yükseklik, 2 satır içindekiler) — tüm burger kartları */
var FIT_IDS=PRODUCTS.filter(function(p){return p.kind==='burger'}).map(function(p){return p.id});
var MASCOT_SVG='<svg class="mc" viewBox="0 0 40 50" aria-hidden="true">'
 +'<g class="mc-legs"><path class="mc-l" d="M16 36 L15 46"/><path class="mc-r" d="M24 36 L25 46"/></g>'
 +'<ellipse cx="14" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/><ellipse cx="26" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/>'
 +'<path d="M9 30 h22 a2 2 0 0 1 2 2 v1 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 v-1 a2 2 0 0 1 2 -2z" fill="#E9A64F" stroke="#1D0A0E" stroke-width="1.4"/>'
 +'<rect x="7" y="25" width="26" height="5.5" rx="2.7" fill="#6B2E12" stroke="#1D0A0E" stroke-width="1.4"/>'
 +'<path d="M7 24.5 q3 -3 6 0 t6 0 t6 0 t6 0 t2 0" fill="none" stroke="#5FA83A" stroke-width="2.6" stroke-linecap="round"/>'
 +'<path d="M8 23 C8 8 32 8 32 23 z" fill="#F2B04A" stroke="#1D0A0E" stroke-width="1.4"/>'
 +'<circle cx="16" cy="17" r="2.4" fill="#fff" stroke="#1D0A0E" stroke-width="1"/><circle cx="24" cy="17" r="2.4" fill="#fff" stroke="#1D0A0E" stroke-width="1"/>'
 +'<circle cx="16.8" cy="17.3" r="1.1" fill="#1D0A0E"/><circle cx="24.8" cy="17.3" r="1.1" fill="#1D0A0E"/>'
 +'<path d="M16.5 33 q3.5 2.4 7 0" stroke="#1D0A0E" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
 +'<g class="mc-arm"><path d="M0 0 L0 9" stroke="#1D0A0E" stroke-width="2" stroke-linecap="round"/><circle cy="10" r="2.6" fill="#fff" stroke="#1D0A0E" stroke-width="1.2"/></g>'
 +'</svg>';
/* PATATES KUTUSU ADAM — paylaşımlık maskotu: kırmızı-krem çizgili kutu gövde, tepede saç gibi kızartmalar.
   Burger Adam ile aynı iskelet (bacaklar 36–46, omuz 31,27) → aynı CSS sahnesi oynar. */
var FRIES_SVG='<svg class="mc" viewBox="0 0 40 50" aria-hidden="true">'
 +'<g class="mc-legs"><path class="mc-l" d="M16 36 L15 46"/><path class="mc-r" d="M24 36 L25 46"/></g>'
 +'<ellipse cx="14" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/><ellipse cx="26" cy="47" rx="4.4" ry="2.4" fill="#1D0A0E"/>'
 +'<g fill="#FBD35E" stroke="#1D0A0E" stroke-width="1.2"><rect x="10.5" y="5" width="4" height="15" rx="1" transform="rotate(-12 12.5 18)"/><rect x="15.5" y="2" width="4" height="17" rx="1" transform="rotate(-4 17.5 18)"/>'
 +'<rect x="20.5" y="2.5" width="4" height="17" rx="1" transform="rotate(5 22.5 18)"/><rect x="25.5" y="5.5" width="4" height="14" rx="1" transform="rotate(14 27.5 18)"/></g>'
 +'<path d="M8 17 H32 L29.5 37 H10.5 Z" fill="#FFFCEC"/>'
 +'<path d="M13.5 17 L14.6 37 M20 17 V37 M26.5 17 L25.4 37" stroke="#E4032D" stroke-width="3"/>'
 +'<path d="M8 17 H32 L29.5 37 H10.5 Z" fill="none" stroke="#1D0A0E" stroke-width="1.4" stroke-linejoin="round"/>'
 +'<rect x="12.5" y="20" width="15" height="13" rx="4.5" fill="#FFFCEC"/>'
 +'<circle cx="16.5" cy="24" r="2.3" fill="#fff" stroke="#1D0A0E" stroke-width="1"/><circle cx="23.5" cy="24" r="2.3" fill="#fff" stroke="#1D0A0E" stroke-width="1"/>'
 +'<circle cx="17.3" cy="24.3" r="1.1" fill="#1D0A0E"/><circle cx="24.3" cy="24.3" r="1.1" fill="#1D0A0E"/>'
 +'<path d="M17 29.5 q3 2.2 6 0" stroke="#1D0A0E" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
 +'<g class="mc-arm"><path d="M0 0 L0 9" stroke="#1D0A0E" stroke-width="2" stroke-linecap="round"/><circle cy="10" r="2.6" fill="#fff" stroke="#1D0A0E" stroke-width="1.2"/></g>'
 +'</svg>';
function mascotLane(svgStr){return '<span class="mascot-lane" aria-hidden="true"><span class="mascot">'+svgStr+'<span class="mc-say">bas!</span></span></span>'}
function burgerCardV2(p,i){
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'+skHTML(p)
                :'<div class="ph" aria-hidden="true"><img src="'+LOGO_IMG+'" alt=""></div>';
  var parts=(p.desc||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
  /* maskot tüm burger kartlarında; kartlar aynı anda oynamasın diye her biri ~3,1 sn kaydırılır */
  var bi=FIT_IDS.indexOf(p.id),mascot=bi>=0&&!RM,fit=bi>=0,mcd=-((bi*3.1)%12).toFixed(1);
  var shown=fit?parts:parts.slice(0,5),rest=parts.length-shown.length;
  var layers=shown.map(function(s){return '<li style="--c:'+layerColor(s)+'">'+esc(s)+'</li>'}).join('')+(rest>0?'<li class="more-l">+'+rest+'</li>':'');
  return '<article class="card card--burger v2'+(mascot?' has-mascot':'')+(fit?' fit':'')+'" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+';--mcd:'+mcd+'s" aria-label="'+esc(p.name+(p.size?' '+p.size:'')+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="shade" aria-hidden="true"></div><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage">'+vis+'</div>'
   +'<div class="meta"><p class="cat"><span>'+esc(p.category)+'</span></p>'
   +'<div class="name-row"><h3 class="name">'+esc(p.name)+(p.size?' <small>'+esc(p.size)+'</small>':'')+'</h3>'
   +ticketHTML(p)+'</div>'
   +(layers?'<ul class="layers" aria-label="Malzemeler"'+(fit?' data-max2':'')+'>'+layers+'</ul>':'')
   +'<div class="foot">'+(mascot?mascotLane(MASCOT_SVG):'')+'<span class="cta">3D gör</span><span class="more" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>'
   +'</div></div></article>';
}
function classicCardHTML(p,i){
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'+skHTML(p)
                :'<div class="ph" aria-hidden="true"><img src="'+LOGO_IMG+'" alt=""></div>';
  return '<article class="card" role="button" tabindex="0" data-id="'+p.id+'" data-cat="'+p.catKey+'" style="--i:'+i+'" aria-label="'+esc(p.name+(p.size?' '+p.size:'')+', '+money(p.price)+'. Detayı aç')+'">'
   +'<div class="card-in"><div class="paper"><div class="sheen"></div></div>'
   +'<div class="stage">'+vis+'</div>'
   +'<div class="meta"><p class="cat">'+esc(p.category)+'</p>'
   +'<h3 class="name">'+esc(p.name)+(p.size?' <small>'+esc(p.size)+'</small>':'')+'</h3>'
   +(p.desc?'<p class="desc">'+esc(p.desc)+'</p>':'')
   +'<div class="foot"><span class="price">'+money(p.price)+'</span><span class="more" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span></div>'
   +'</div></div></article>';
}
var cards=[],io=null;
/* fotoğrafsız soğuk içecekler (Yok Yaa, Yok Öyle) listede birlikte, bölümün sonunda ve tek bir .mock-pair kutusunda:
   mobilde alt alta, geniş ekranda yan yana */
function pairMocks(items){
  var mocks=items.filter(function(p){return p.kind==='soft'&&!p.img});
  if(mocks.length<2)return items;
  return items.filter(function(p){return mocks.indexOf(p)<0}).concat(mocks); /* bölümün sonunda */
}
function render(opts){
  opts=opts||{};
  var g=GROUPS.find(function(x){return x.key===state.group});
  var html='',list=[],i=0;
  chipsEl.innerHTML='';
  if(state.q){
    var q=norm(state.q);
    PRODUCTS.forEach(function(p){if(norm(p.name+' '+p.desc+' '+p.category+' '+p.group).indexOf(q)>-1)list.push(p)});
    listTitle.textContent='Arama sonuçları';
    html=list.length?list.map(function(p){return cardHTML(p,i++)}).join(''):'<p class="empty">“'+esc(state.q)+'” için ürün bulunamadı. Başka bir kelimeyle dene.</p>';
    tabsEl.querySelectorAll('.tab').forEach(function(t){t.setAttribute('aria-selected','false');t.tabIndex=-1});
  }else{
    listTitle.textContent=g.name;
    g.cats.forEach(function(c){
      if(c.items.length>1)html+='<h3 class="cat-title" data-cat="'+c.key+'">'+esc(c.name)+'</h3>';
      var pm=pairMocks(c.items),inPair=false;
      pm.forEach(function(p,k){
        var mock=p.kind==='soft'&&!p.img&&pm.filter(function(x){return x.kind==='soft'&&!x.img}).length>1;
        if(mock&&!inPair){html+='<div class="mock-pair">';inPair=true}
        if(!mock&&inPair){html+='</div>';inPair=false}
        list.push(p);html+=cardHTML(p,i++);
      });
      if(inPair)html+='</div>';
      var ch=document.createElement('button');ch.type='button';ch.className='chip';ch.textContent=c.name;ch.dataset.cat=c.key;chipsEl.appendChild(ch);
    });
    tabsEl.querySelectorAll('.tab').forEach(function(t){var on=t.dataset.key===state.group;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1});
  }
  state.order=list.map(function(p){return p.id});state.gridOrder=state.order;
  /* LAZY LOADING — yalnız ilk ekrandaki kartların görseli (eagerCount: sütun × 2 satır) hemen (öncelikli) iner; diğerleri data-src'de bekler,
     kart ekrana ~1 ekran yaklaşınca lazyIO ile yüklenir (yükleme silüeti .sk o sırada görünür) */
  var nImg=0,nEager=eagerCount(state.group);
  html=html.replace(/<img class="prod" src="/g,function(){return nImg++<nEager?'<img class="prod" fetchpriority="high" decoding="async" src="':'<img class="prod" decoding="async" data-src="'});
  var seq=++renderSeq;chunkFlush=null;
  if(opts.chunk){
    /* PARÇA PARÇA KURULUM (açılışta) — kartlar her karede birkaç tane eklenir; 23 kartı tek seferde
       yerleştirmenin ~180 ms'lik donması, karşılama animasyonunu bozmayan küçük parçalara bölünür.
       "Menüyü aç"a erken basılırsa kalanlar o an eklenir (chunkFlush). */
    var tpl=document.createElement('template');tpl.innerHTML=html;
    var nodes=[].slice.call(tpl.content.childNodes);
    grid.textContent='';armLazy(grid);
    var addChunk=function(n){
      var part=nodes.splice(0,n);if(!part.length)return;
      var frag=document.createDocumentFragment();part.forEach(function(x){frag.appendChild(x)});grid.appendChild(frag);
      var els=part.filter(function(x){return x.nodeType===1}),uls=[];
      els.forEach(function(el){armImgs(el);[].push.apply(uls,el.querySelectorAll('.layers[data-max2]'))});
      uls.forEach(function(ul){if(layersRO&&!ul._ro){ul._ro=1;layersRO.observe(ul)}});
      fitBatch(uls);observeLazy(els);
    };
    var done=function(){chunkFlush=null;layoutWM(grid);collectCards();moveInd()};
    var step=function(){if(seq!==renderSeq)return;addChunk(3);if(nodes.length)afterPaint(step);else done()};
    chunkFlush=function(){if(seq!==renderSeq)return;addChunk(nodes.length);done()};
    addChunk(3);afterPaint(step);
  }else{
    grid.innerHTML=html;armImgs(grid);layoutCards(grid);armLazy(grid);
  }
  document.documentElement.dataset.group=state.group;
  var hex=groupColor(state.group);
  if(gl.setGroup)gl.setGroup(hex,state.group);
  var tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=hex;
  if(!opts.chunk){collectCards();moveInd()}
  if(opts.deal!==false)dealCards();
}
var renderSeq=0,chunkFlush=null;
function afterPaint(f){requestAnimationFrame(function(){setTimeout(f,0)})}
var lazyIO=null;
function loadLazy(el){[].forEach.call(el.querySelectorAll('img[data-src]'),function(im){im._t0=performance.now();im.src=im.getAttribute('data-src');im.removeAttribute('data-src')})}
function armLazy(root){
  if(lazyIO){lazyIO.disconnect();lazyIO=null}
  observeLazy([root]);
}
function observeLazy(els){
  if(!('IntersectionObserver' in window)){els.forEach(loadLazy);return}
  if(!lazyIO)lazyIO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){loadLazy(e.target);lazyIO.unobserve(e.target)}})},{rootMargin:'600px 0px'});
  els.forEach(function(el){
    var cs=el.matches&&el.matches('.card')?[el]:[].slice.call(el.querySelectorAll?el.querySelectorAll('.card'):[]);
    cs.forEach(function(c){if(c.querySelector('img[data-src]'))lazyIO.observe(c)});
  });
}
function collectCards(){
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){es.forEach(function(e){var c=cards.find(function(x){return x.el===e.target});if(c){c.vis=e.isIntersecting;c.el.classList.toggle('in-view',e.isIntersecting)}})},{rootMargin:'160px 0px'});
  cards=[].map.call(grid.querySelectorAll('.card'),function(el){
    var c={el:el,inner:el.querySelector('.card-in'),sheen:el.querySelector('.sheen'),px:0,py:0,on:false,rx:0,ry:0,vis:false};
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect();c.px=clamp((e.clientX-r.left)/r.width*2-1,-1,1);c.py=clamp((e.clientY-r.top)/r.height*2-1,-1,1);c.on=true;
      c.sheen.style.setProperty('--mx',((c.px+1)*50)+'%');c.sheen.style.setProperty('--my',((c.py+1)*50)+'%');c.sheen.style.setProperty('--so','1');
    });
    var off=function(){c.on=false;c.sheen.style.setProperty('--so','0')};
    el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerup',function(e){if(e.pointerType!=='mouse')off()});
    el.addEventListener('click',function(){openSheet(el.dataset.id,el)});
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openSheet(el.dataset.id,el)}});
    io.observe(el);return c;
  });
}
function dealCards(){
  if(RM)return;
  grid.querySelectorAll('.card').forEach(function(el){el.classList.remove('deal');void el.offsetWidth;el.classList.add('deal')});
  setTimeout(function(){grid.querySelectorAll('.card.deal').forEach(function(el){el.classList.remove('deal')})},1600);
}
function tickCards(dt){
  if(FX.egim)return;
  var vh=window.innerHeight,k=1-Math.exp(-dt*10),vis=[],i,c;
  /* 1) okuma: yalnız görünür kartlar (layout thrashing yok) */
  for(i=0;i<cards.length;i++){c=cards[i];if(c.vis){c.r=c.el.getBoundingClientRect();vis.push(c)}}
  /* 2) yazma */
  for(i=0;i<vis.length;i++){
    c=vis[i];var r=c.r;
    var s=RM?0:clamp(((r.top+r.height/2)-vh/2)/(vh*.6),-1,1);
    var trx=-s*6+(c.on?-c.py*12:-aim.y*2.5),try_=c.on?c.px*15:aim.x*4.5;
    c.rx+=(trx-c.rx)*k;c.ry+=(try_-c.ry)*k;
    var tf='perspective(1100px) rotateX('+c.rx.toFixed(2)+'deg) rotateY('+c.ry.toFixed(2)+'deg)';
    if(tf!==c.tf){c.tf=tf;c.inner.style.transform=tf}
  }
  /* aktif kategori çipi: 6 karede bir, görünür kartların ölçüsüyle */
  tickCards.n=(tickCards.n||0)+1;
  if(tickCards.n%6===0&&state.mode==='menu'&&!state.q&&chipsEl.children.length&&vis.length){
    var cur=null,line=vh*.42,bt=-1e9;
    for(i=0;i<vis.length;i++){var rr=vis[i].r;if(rr.top<line&&rr.top>bt+30){bt=rr.top;cur=vis[i].el.dataset.cat}}
    if(!cur)cur=vis[0].el.dataset.cat;
    if(cur!==tickCards.cur){tickCards.cur=cur;[].forEach.call(chipsEl.children,function(ch){ch.setAttribute('aria-current',ch.dataset.cat===cur)})}
  }
}
chipsEl.addEventListener('click',function(e){
  var b=e.target.closest('.chip');if(!b)return;
  var target=grid.querySelector('.cat-title[data-cat="'+b.dataset.cat+'"],.card[data-cat="'+b.dataset.cat+'"]');if(!target)return;
  var nav=$('.nav').offsetHeight;
  var y=target.getBoundingClientRect().top+window.scrollY-nav-(target.classList.contains('card')?96:18);
  window.scrollTo({top:Math.max(0,y),behavior:RM?'auto':'smooth'});
});
tabsEl.addEventListener('click',function(e){
  var b=e.target.closest('.tab');if(!b)return;
  if(b.dataset.key===state.group&&!state.q)return;
  state.q='';qEl.value='';state.group=b.dataset.key;tickCards.cur=null;
  window.scrollTo(0,0);render();
});
tabsEl.addEventListener('keydown',function(e){
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  var tabs=[].slice.call(tabsEl.querySelectorAll('.tab')),i=tabs.findIndex(function(t){return t.getAttribute('aria-selected')==='true'});
  i=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus();
});
$('#searchBtn').addEventListener('click',function(){
  var open=!searchRow.classList.contains('open');
  searchRow.classList.toggle('open',open);this.setAttribute('aria-expanded',open);
  if(open)setTimeout(function(){qEl.focus()},250);
  else if(state.q){state.q='';qEl.value='';render({deal:false})}
});
var qT=null;
qEl.addEventListener('input',function(){clearTimeout(qT);qT=setTimeout(function(){state.q=qEl.value.trim();window.scrollTo(0,0);render({deal:false})},140)});
qEl.addEventListener('keydown',function(e){if(e.key==='Escape')$('#searchBtn').click()});
window.addEventListener('resize',moveInd);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(moveInd);

/* ============ DETAY ============ */
var sheet=$('#sheet'),hpHost=$('#hpHost'),hero=$('#hero'),hp=null,hpT={rx:0,ry:0,x:0,y:0,on:false};
var lastFocus=null;
function fillSheet(p){
  var D0=DETAIL[p.kind];
  var vis=p.img?'<img id="hp" src="'+p.img+'" alt="'+esc(p.name)+'" draggable="false">'+skHTML(p)
    :(D0&&D0.art?'<div id="hp" class="art" role="img" aria-label="'+esc(p.name)+'">'+D0.art(p)+'</div>'
    :'<div id="hp" class="ph" role="img" aria-label="'+esc(p.name)+'"><img src="'+LOGO_IMG+'" alt=""></div>');
  hpHost.innerHTML=vis;hp=$('#hp');armImgs(hpHost);
  setup3D(p);
  $('#sCat').textContent=p.category;
  var nm0=p.kind==='shot'?p.name.replace(/\s*shot$/i,''):p.name;
  var nmH=esc(nm0)+(p.size&&p.kind!=='beer'?' <small>'+esc(p.size)+'</small>':'');
  $('#sName').innerHTML=((isV2(p)&&p.kind!=='shot')||p.kind==='spirit'||p.kind==='soft')?'<span class="nm">'+nmH+'</span>'+ticketHTML(p):nmH;
  var d=$('#sDesc');d.textContent=p.desc||'';d.style.display=p.desc?'':'none';
  $('#sPrice').textContent=money(p.price);
  /* sıcak içecek: fiyat aşağıdaki fiyat satırında bilet; soğuk içecek: bilet ismin sağında, alttaki satır gizli */
  if(p.kind==='hot')$('#sPrice').innerHTML=ticketHTML(p);
  $('#sPrice').style.display=p.kind==='soft'?'none':'';
  var heroC=(D0&&D0.heroColor&&D0.heroColor(p))||cssVar('--hero-'+p.kind)||groupColor(p.groupKey);
  $('#panel').style.setProperty('--hero',heroC);
  $('#panel').dataset.light=/^#[0-9a-f]{6}$/i.test(heroC)&&isLight(heroC)?'1':'';
  var D=DETAIL[p.kind];
  $('#panel').dataset.kind=D?p.kind:'';
  $('#panel').dataset.v2=isV2(p)?'1':'';
  /* sos: düğmelerdeki damla o sosun renginde */
  if(p.kind==='sauce')$('#panel').style.setProperty('--sauce',SAUCE_COLORS[p.id]||'#E4032D');else $('#panel').style.removeProperty('--sauce');
  sheet.classList.toggle('pop',isPop(p));
  $('#heroDeco').innerHTML=D&&D.hero?D.hero(p):'';
  $('#sExtra').innerHTML=D&&D.extra?D.extra(p):'';
  $('.info').scrollTop=0;
  /* yüksek alkol etiket çerçevesi kaydırılan içeriğin tamamını sarsın (görünen alanı değil) */
  var inf=$('.info');inf.style.removeProperty('--sh');
  if(p.kind==='spirit')requestAnimationFrame(function(){inf.style.setProperty('--sh',inf.scrollHeight+'px')});
  hpT.rx=hpT.ry=0;
  var i=state.order.indexOf(p.id),many=state.order.length>1;
  $('.pn').style.display=many?'':'none';
  if(many)prefetchNeighbors(i);
}
/* KOMŞU ÖN YÜKLEME — detay açıkken önceki ve sonraki ürünün görseli arka planda iner (düşük öncelik),
   böylece ‹ › ile geçişte görsel beklenmez. Aynı adres olduğu için tarayıcı önbelleğinden gelir. */
/* İLK EKRANDAKİ KART SAYISI — bölümün o ekrandaki sütun sayısı × 2 satır (CSS ızgara kırılımlarıyla aynı:
   İçecek 2/3/4 sütun, diğerleri 1/2/3 sütun; 700px ve 1040px). Yalnız pencere genişliği okunur, ölçüm yok. */
function eagerCount(gk){
  var w=window.innerWidth,cols=gk==='icecek'?(w>=1040?4:w>=700?3:2):(w>=1040?3:w>=700?2:1);
  return cols*2;
}
var prefetched={};
function prefetchImg(src){
  if(!src||prefetched[src])return;prefetched[src]=1;
  var im=new Image();im.decoding='async';try{im.fetchPriority='low'}catch(e){}
  im.src=src;
}
/* DİĞER BÖLÜMLER — menüde ilk kaydırmada ya da menüye girdikten 2,5 sn sonra, açık olmayan bölümlerin
   ilk ekranlık kart görseli (eagerCount) arka planda iner; bölüm değişince ilk kartlar beklemeden görünür. Bir kez yapılır. */
var groupsPrefetched=false,gpT=0;
function prefetchGroups(){
  if(groupsPrefetched)return;groupsPrefetched=true;clearTimeout(gpT);
  window.removeEventListener('scroll',onFirstScroll);
  (window.requestIdleCallback||function(f){setTimeout(f,1)})(function(){
    GROUPS.forEach(function(g){
      if(g.key===state.group)return;
      var n=0,lim=eagerCount(g.key);
      g.cats.forEach(function(c){pairMocks(c.items).forEach(function(p){if(n<lim&&p.img){prefetchImg(p.img);n++}})});
    });
  },{timeout:2000});
}
function onFirstScroll(){if(state.mode==='menu')prefetchGroups()}
window.addEventListener('scroll',onFirstScroll,{passive:true});
function prefetchNeighbors(i){
  var n=state.order.length;
  [1,-1].forEach(function(d){
    var q=BYID[state.order[(i+d+n)%n]];
    if(q)prefetchImg(q.img);
  });
}
/* ——— KART ÇEVİRME (v2 pop-up) ———
   Tıklanan kart ekranın ortasına doğru giderken 90° döner (kenar kameraya dönük → görünmez),
   o anda kartın "arka yüzü" olan detay paneli -90°'den 0°'a dönerek tam boyuta büyür.
   Kapanışta aynı hareket tersine oynar ve kart yerine geri döner. */
var popCard=null,FLIP_P='perspective(1400px) ';
function flipGeom(card){
  var r=card.getBoundingClientRect(),f=$('#panel').getBoundingClientRect();
  var c0={x:r.left+r.width/2,y:r.top+r.height/2},c1={x:f.left+f.width/2,y:f.top+f.height/2};
  var m={x:(c0.x+c1.x)/2,y:(c0.y+c1.y)/2},wm=(r.width+f.width)/2;
  return {r:r,f:f,
    cardMid:FLIP_P+'translate('+(m.x-c0.x)+'px,'+(m.y-c0.y)+'px) scale('+(wm/r.width)+')',
    panelMid:FLIP_P+'translate('+(m.x-c1.x)+'px,'+(m.y-c1.y)+'px) scale('+(wm/f.width)+')'};
}
function flipClone(card,r){
  var cl=card.cloneNode(true);cl.classList.remove('deal');cl.removeAttribute('tabindex');cl.removeAttribute('role');cl.setAttribute('aria-hidden','true');
  /* += : kartın kendi satır içi değişkenleri (ör. sosun rengi --sauce) korunur */
  cl.style.cssText+=';position:fixed;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;margin:0;z-index:61;pointer-events:none;backface-visibility:hidden;visibility:visible';
  /* (kart detay açıkken gizli tutulur; kopyası o gizliliği devralmamalı) */
  document.body.appendChild(cl);return cl;
}
function onScreen(r){return r.bottom>0&&r.top<innerHeight&&r.width>0}
/* 90°'de yüz kenarı kameraya döner ama perspektif yüzünden ince bir dilim olarak görünür kalır
   (ekranın ortasında dikey "kesik"). Bu yüzden kenar anına yaklaşırken opaklık sıfıra iner. */
function flipKF(from,to,edgeAtEnd,win){
  win=win||.18;
  return edgeAtEnd?[{transform:from,opacity:1},{offset:1-win,opacity:1},{transform:to,opacity:0}]
                  :[{transform:from,opacity:0},{offset:win,opacity:1},{transform:to,opacity:1}];
}
function popFlipIn(card){
  var g=flipGeom(card);if(!onScreen(g.r))return;
  var cl=flipClone(card,g.r),T1=330,T2=460;
  card.style.visibility='hidden';popCard=card;
  cl.animate(flipKF(FLIP_P+'rotateY(0deg)',g.cardMid+' rotateY(90deg)',true),
    {duration:T1,easing:'cubic-bezier(.45,0,.85,.55)',fill:'forwards'}).onfinish=function(){cl.remove()};
  $('#panel').animate(flipKF(g.panelMid+' rotateY(-90deg)',FLIP_P+'rotateY(0deg)',false),
    {duration:T2,delay:T1,easing:'cubic-bezier(.2,.65,.25,1)',fill:'backwards'});
}
function popFlipOut(card){
  var pn=$('#panel'),g=flipGeom(card),T1=260,T2=380;
  if(!onScreen(g.r)){pn.animate([{opacity:1,transform:'none'},{opacity:0,transform:'scale(.9)'}],{duration:240,easing:'ease-in',fill:'forwards'});return}
  var cl=flipClone(card,g.r);card.style.visibility='hidden';
  /* kapanışta iki yüz üst üste biner: kart, panel tamamen sönmeden belirmeye başlar →
     90° anında ekranda "hiçbir şey yok" boşluğu (kartın bir anlık kaybolması) oluşmaz */
  var LAP=90;
  pn.animate(flipKF(FLIP_P+'rotateY(0deg)',g.panelMid+' rotateY(-90deg)',true,.1),
    {duration:T1,easing:'cubic-bezier(.45,0,.85,.55)',fill:'forwards'});
  cl.animate(flipKF(g.cardMid+' rotateY(90deg)',FLIP_P+'rotateY(0deg)',false,.1),
    {duration:T2,delay:T1-LAP,easing:'cubic-bezier(.2,.65,.25,1)',fill:'backwards'})
    .onfinish=function(){cl.remove();card.style.visibility=''};
}
function openSheet(id,fromEl,fromHash){
  var p=BYID[id];if(!p)return;
  lastFocus=fromEl||document.activeElement;
  $('#panel').getAnimations().forEach(function(a){a.cancel()});
  if(popCard){popCard.style.visibility='';popCard=null}
  var r0=null,pop=isPop(p)&&!RM&&fromEl&&fromEl.classList.contains('card');
  if(fromEl&&!pop){var im=fromEl.querySelector('.prod,.ph,.ramekin,.slice');if(im)r0=im.getBoundingClientRect()}
  state.sheetId=id;fillSheet(p);
  sheet.classList.add('open');document.documentElement.classList.add('lock');
  if(pop)popFlipIn(fromEl);
  app.inert=true;app.setAttribute('aria-hidden','true');gl.render=false;
  if(!fromHash){try{history.pushState({sheet:id},'','#'+id);state.pushed=true}catch(e){}}
  $('#close').focus({preventScroll:true});
  if(r0&&!RM){
    /* panel hâlâ giriş geçişinin başında: son konumu geri hesapla */
    var pn=$('#panel'),m=new DOMMatrix(getComputedStyle(pn).transform),pr=pn.getBoundingClientRect(),hr=hp.getBoundingClientRect();
    if(hr.width){
      var sp=m.a||1,pcx=pr.left+pr.width/2,pcy=pr.top+pr.height/2;
      var fcx=pcx-m.e+((hr.left+hr.width/2)-pcx)/sp,fcy=pcy-m.f+((hr.top+hr.height/2)-pcy)/sp,fw=hr.width/sp;
      var dx=r0.left+r0.width/2-fcx,dy=r0.top+r0.height/2-fcy,sc=r0.width/fw;
      hp.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+sc+')'},{transform:'none'}],{duration:640,easing:'cubic-bezier(.2,.9,.2,1)'});
    }
  }
}
function closeSheet(fromPop){
  if(!state.sheetId)return;
  var back=sheet.classList.contains('pop')&&!RM&&cards.find(function(x){return x.el.dataset.id===state.sheetId});
  if(popCard&&(!back||popCard!==back.el)){popCard.style.visibility=''}
  popCard=null;
  if(back)popFlipOut(back.el);
  if(state.gridOrder)state.order=state.gridOrder;
  sheet.classList.remove('open');state.sheetId=null;stop3D(true);
  document.documentElement.classList.toggle('lock',state.mode==='welcome');
  app.inert=false;app.removeAttribute('aria-hidden');gl.render=true;
  if(!fromPop){
    try{if(state.pushed){state.pushed=false;history.back()}
    else history.replaceState(null,'',location.pathname+location.search)}catch(e){state.pushed=false}
  }else state.pushed=false;
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});
}
function step(dir){
  var i=state.order.indexOf(state.sheetId);if(i<0)return;
  var id=state.order[(i+dir+state.order.length)%state.order.length];
  state.sheetId=id;fillSheet(BYID[id]);try{history.replaceState({sheet:id},'','#'+id)}catch(e){}
  if(!RM){
    hp.animate([{opacity:0,transform:'translateX('+(dir*60)+'px) scale(.9)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.9,.2,1)'});
    /* "translate" ayrı özellik: süslerin kendi transform'unu (ör. ortalama translate(-50%,-50%)) ezmez */
    [].forEach.call(document.querySelectorAll('.info>*:not(.pn),#heroDeco>*'),function(el,n){
      el.animate([{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:360,delay:n*35,easing:'cubic-bezier(.2,.9,.2,1)',fill:'backwards'});
    });
  }
  var c=cards.find(function(x){return x.el.dataset.id===id});if(c)lastFocus=c.el;
}
$('#sExtra').addEventListener('click',function(e){
  var sb=e.target.closest('[data-sugar]');
  if(sb){SUGAR.v=+sb.dataset.sugar;[].forEach.call(sb.parentNode.children,function(x){x.setAttribute('aria-checked',x===sb)});return}
  var rb=e.target.closest('[data-round]');
  if(rb){var pr=BYID[state.sheetId];ROUND.n=clamp(ROUND.n+(+rb.dataset.round),1,20);
    var rd=$('#sExtra .round');if(rd){rd.outerHTML=roundHTML(pr);var ob=$('#sExtra .round .per b');if(ob&&!RM)ob.animate([{transform:'scale(1.25)'},{transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.9,.2,1.4)'})}
    return}
  var b=e.target.closest('[data-split]');
  if(b){var p=BYID[state.sheetId];SPLIT.n=clamp(SPLIT.n+(+b.dataset.split),1,12);
    var sp=$('#sExtra .split');if(sp){sp.outerHTML=splitHTML(p);var o=$('#sExtra .per b');if(o&&!RM)o.animate([{transform:'scale(1.25)'},{transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.9,.2,1.4)'})}
    return}
  var g=e.target.closest('[data-go]');
  if(g){var q=BYID[g.dataset.go];if(!q)return;
    state.order=PRODUCTS.filter(function(x){return x.catKey===q.catKey}).map(function(x){return x.id});
    state.sheetId=q.id;fillSheet(q);try{history.replaceState({sheet:q.id},'','#'+q.id)}catch(_){}
    if(!RM)hp.animate([{opacity:0,transform:'translateY(30px) scale(.85)'},{opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.2,.9,.2,1)'});
    $('.info').scrollTop=0}
});
$('#close').addEventListener('click',function(){closeSheet(false)});
$('#scrim').addEventListener('click',function(){closeSheet(false)});
$('#prev').addEventListener('click',function(){step(-1)});
$('#next').addEventListener('click',function(){step(1)});
document.addEventListener('keydown',function(e){
  if(!state.sheetId)return;
  if(e.key==='Escape')closeSheet(false);
  else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);
  else if(e.key==='Tab'){
    var f=[].filter.call(sheet.querySelectorAll('button'),function(b){return b.offsetParent!==null});
    if(!f.length)return;var a=document.activeElement,i=f.indexOf(a);
    if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}
  }
});
window.addEventListener('popstate',function(){
  var id=location.hash.slice(1);
  if(id&&BYID[id]){if(!state.sheetId){goToMenuForHash(id)}}
  else closeSheet(true);
});
hero.addEventListener('pointermove',function(e){
  var r=hero.getBoundingClientRect();hpT.x=clamp((e.clientX-r.left)/r.width*2-1,-1,1);hpT.y=clamp((e.clientY-r.top)/r.height*2-1,-1,1);hpT.on=true;
});
hero.addEventListener('pointerleave',function(){hpT.on=false});
hero.addEventListener('pointerup',function(e){if(e.pointerType!=='mouse')hpT.on=false});
/* ——— 3D MODEL (detay) ———
   Modeli olan üründe detay 3D ile açılır; üstte "3D | Foto" anahtarı. Model inerken fotoğraf görünür,
   anahtarda yüzde yazar; hazır olunca 3D yumuşakça fotoğrafın yerini alır. */
var viewer3d=createViewer({
  getDpr:function(){var d=Math.min(window.devicePixelRatio||1,2);return gl.q&&gl.q.lvl>0?Math.min(d,1):d},
  fitRect:function(){return hp&&hp.tagName==='IMG'&&hp.offsetWidth?{w:hp.offsetWidth,h:hp.offsetHeight}:null}
});
var m3d={mode:'3d',url:null};
var m3dBar=document.createElement('div');m3dBar.className='m3d-toggle';m3dBar.setAttribute('role','group');m3dBar.setAttribute('aria-label','Görünüm');
m3dBar.innerHTML='<button type="button" data-m="3d" aria-pressed="true">3D<small></small></button><button type="button" data-m="foto" aria-pressed="false">Foto</button>';
hero.appendChild(m3dBar);
m3dBar.addEventListener('pointerdown',function(e){e.stopPropagation()});
m3dBar.addEventListener('click',function(e){var b=e.target.closest('[data-m]');if(!b||!m3d.url)return;setMode3D(b.dataset.m)});
function setMode3D(m){
  m3d.mode=m;
  [].forEach.call(m3dBar.querySelectorAll('[data-m]'),function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});
  if(m==='3d'){
    var my=m3d.url,pct=m3dBar.querySelector('small');
    viewer3d.show(hero,my,function(st,f){
      if(m3d.url!==my||m3d.mode!=='3d')return;
      if(st==='loading'){hero.classList.add('m3d-loading');pct.textContent=f>0&&f<1?' %'+Math.round(f*100):''}
      else if(st==='ready'){hero.classList.remove('m3d-loading');pct.textContent='';hero.classList.add('is-3d')}
      else{hero.classList.remove('m3d-loading','is-3d');pct.textContent='';setMode3D('foto')}
    });
  }else{viewer3d.hide();hero.classList.remove('is-3d','m3d-loading')}
}
function setup3D(p){
  var u=MODELS[p.id]||null;
  if(u===m3d.url&&u)return;            /* aynı ürün: durumu koru */
  stop3D();m3d.url=u;
  hero.classList.toggle('has-3d',!!u);
  if(u){prefetchModel(u);setMode3D('3d');
    /* fotoğraf sonradan yüklenirse model boyunu ona göre yeniden ayarla */
    if(hp&&hp.tagName==='IMG'&&!hp.complete)hp.addEventListener('load',function(){viewer3d.resize()},{once:true})}
}
/* keepLook: detay kapanırken model son karesinde donar ve kart kapanana kadar görünür kalır
   (fotoğraf araya girmez); görünüm kart kapandıktan sonra sıfırlanır */
function stop3D(keepLook){
  viewer3d.hide();m3d.url=null;clearTimeout(m3d.t);
  var reset=function(){hero.classList.remove('is-3d','m3d-loading','has-3d')};
  if(keepLook)m3d.t=setTimeout(function(){if(!state.sheetId)reset()},900);else reset();
}
window.addEventListener('resize',function(){viewer3d.resize()});
function tickHero(dt){
  if(!hp||hp.classList.contains('ph'))return;
  var k=1-Math.exp(-dt*9),t=performance.now()/1000;
  var tx=hpT.on?-hpT.y*16:Math.sin(t*.9)*3.5,ty=hpT.on?hpT.x*24:Math.cos(t*.7)*5;
  if(RM){tx=hpT.on?tx:0;ty=hpT.on?ty:0}
  hpT.rx+=(tx-hpT.rx)*k;hpT.ry+=(ty-hpT.ry)*k;
  hp.style.transform='rotateX('+hpT.rx.toFixed(2)+'deg) rotateY('+hpT.ry.toFixed(2)+'deg) translateZ(30px)';
}

/* ——— açılış: bağlantıdan doğrudan ürün ——— */
function goToMenuForHash(id){
  var p=BYID[id];state.group=p.groupKey;state.q='';
  goTo('menu',true);render({deal:false});
  openSheet(id,null,true);
}
render({deal:false,chunk:true});setP(0);finishMode();
setTimeout(function(){(window.requestIdleCallback||function(f){setTimeout(f,1)})(warmMenu,{timeout:1500})},900);
var h0=location.hash.slice(1);
if(h0&&BYID[h0])goToMenuForHash(h0);
})();
