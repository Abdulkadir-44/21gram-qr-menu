/* ==========================================================
   21 Gram Gastrobar — 3D QR menü
   Mantık ve animasyonlar referans tasarımdan (reference/21gram-menu-3d.html) birebir alındı.
   Veri: public/menu.json · Tema: src/theme.css · 3D: Three.js r128 (public/vendor)
   ========================================================== */
import LOGO_SHAPES from './data/logo-shapes.json';
import FIGS_DATA from './data/figs.json';

const menu = await fetch('/menu.json').then(r => r.json());

/* menu.json → referanstaki düz ürün listesi biçimi */
const PRODUCTS = [];
/* kategori → kart türü (yemeğe göre farklı kart tasarımı). Listede olmayanlar klasik kartı kullanır. */
const KIND = { 'smash-burger': 'burger', 'tavuk-burger': 'burger' };
menu.groups.forEach(g => g.cats.forEach(c => c.items.forEach((it, n) => PRODUCTS.push({
  group: g.name, groupKey: g.key, category: c.name, catKey: c.key,
  id: it.id, price: it.price, desc: it.desc, name: it.name, size: it.size,
  img: it.img ? '/img/p/' + it.img : '', w: it.w, h: it.h,
  kind: KIND[c.key] || 'classic', no: n + 1,
}))));

/* burger kartı: açıklamadaki malzemeleri "kat" rengine eşle */
const LAYER_COLORS = [
  [/trüf|truffle/, '#3B2A1E'], [/tavuk|chicken|chick/, '#C9861A'], [/smash|köfte|dana|\bet\b/, '#6B3A22'],
  [/cheese|cheddar|peynir|parmesan/, '#F2B705'], [/mayo|ranch/, '#E6CF95'], [/ketçap|reçel|dynamite|acı|sos/, '#E4032D'],
  [/soğan/, '#8E3B7A'], [/gürkens|turşu|marul|jalapeno|biber|salata/, '#5E8C31'], [/patates/, '#E3A33A'],
];
const layerColor = s => { const t = s.toLocaleLowerCase('tr'); for (const [re, c] of LAYER_COLORS) if (re.test(t)) return c; return '#B08968'; };
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

/* ——— durum ——— */
var state={mode:'welcome',group:GROUPS[0].key,q:'',order:[],sheetId:null,pushed:false};
var aim={x:0,y:0},aimT={x:0,y:0},gyroOn=false,drag={x:0,y:0,on:false};
var scrolled=0;

/* ============ 3D SAHNE ============ */
var gl={ok:false};
(function initGL(){
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
    function figTexture(name){
      if(figTex[name])return figTex[name];
      var cv=document.createElement('canvas');cv.width=cv.height=512;
      var tx=new THREE.CanvasTexture(cv);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=2;
      var im=new Image();
      im.onload=function(){cv.getContext('2d').drawImage(im,0,0,512,512);tx.needsUpdate=true};
      im.src='data:image/svg+xml;base64,'+btoa(FIGS[name]);
      figTex[name]=tx;return tx;
    }
    var seed=11;var rnd=function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
    var quad=new THREE.PlaneGeometry(1,1),figs=[],cream=c(T.cream),inkc=c(T.figShadow);
    FIGSETS.forEach(function(set,gi){
      set.forEach(function(name,i){
        var z=-1.4-rnd()*3.0,near=1-(-z-1.4)/3.0,tex=figTexture(name);
        var mk=function(col){return new THREE.MeshBasicMaterial({map:tex,color:col,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,fog:false})};
        var front=new THREE.Mesh(quad,mk(cream)),back=new THREE.Mesh(quad,mk(inkc));
        back.position.set(.03,-.036,-.07);back.frustumCulled=false;front.frustumCulled=false;
        var grp=new THREE.Group();grp.add(back);grp.add(front);grp.visible=false;scene.add(grp);
        figs.push({g:gi,i:i,grp:grp,front:front,back:back,z:z,sz:.8+rnd()*.25,a0:.22+.2*near,par:.4+near*.8,
          ph:rnd()*6.283,fx:.35+rnd()*.3,fy:.3+rnd()*.3,fr:.3+rnd()*.3,r0:(rnd()-.5)*.36,flip:rnd()<.5?-1:1,
          px:0,py:0,vx:0,vy:0,th:rnd()*6.283,spd:22+rnd()*20,wfr:.2+rnd()*.3,r:60,welOn:false,cur:0,hov:0,inside:false,lx:0,ly:0,wob:0,wobV:0,bn:0,bnV:0,sp:0,spT:0,sx:-9999,sy:-9999,half:1});
      });
    });
    function layoutFigs(portrait){
      figs.forEach(function(fg){fg.welOn=fg.i<2&&!(portrait&&fg.g*2+fg.i===5)});
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
      for(i=0;i<figs.length;i++){
        f=figs[i];f.r=figR(f,wv,ppu);
        if(!RM){
          f.th+=Math.sin(ptime*f.wfr+f.ph)*dt*.8;
          var s0=f.spd*sp*boost,k=1-Math.exp(-dt*.9);
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
    function resize(){
      var w=window.innerWidth,h=window.innerHeight;
      if(figW){figs.forEach(function(fg){fg.px*=w/figW;fg.py*=h/figH})}figW=w;figH=h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
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
      var dt=Math.min(.05,(now-last)/1000);last=now;
      if(document.hidden){return}
      tick(now,dt);
      if(gl.render){
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
          var tg=wv*(fg.welOn?.8:0)+(1-wv)*(gi===fg.g?1:0);
          fg.cur+=(tg-fg.cur)*(1-Math.exp(-dt*3));
          if(fg.cur<.01){grp.visible=false;fg.hov=0;fg.inside=false;fg.sx=-9999;continue}
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
          fg.front.material.opacity=Math.min(.92,(fg.a0+.5*fg.hov)*fg.cur);
          fg.back.material.opacity=Math.min(.45,(.26+.2*fg.hov)*fg.cur);
          grp.visible=true;
        }
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
})();

/* ============ GEÇİŞ (karşılama ⇄ menü) ============ */
var welcome=$('#welcome'),app=$('#app'),tr={active:false,from:0,to:0,t0:0,dur:1150},Pv=0;
function setP(v){
  Pv=v;if(gl.setP)gl.setP(v);
  welcome.style.opacity=String(1-ss(0,.32,v));
  app.style.opacity=String(ss(.68,.96,v));
}
function finishMode(){
  var m=Pv>=.5?'menu':'welcome';state.mode=m;
  welcome.classList.toggle('is-hidden',m==='menu');
  app.classList.toggle('is-hidden',m==='welcome');
  document.documentElement.classList.toggle('lock',m==='welcome');
  if(m==='welcome'){welcome.style.opacity='';app.style.opacity='0'}
  else{welcome.style.opacity='0';app.style.opacity='1'}
}
function goTo(m,instant){
  var to=m==='menu'?1:0;
  if(m==='menu'){app.classList.remove('is-hidden');welcome.classList.remove('is-hidden');window.scrollTo(0,0)}
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
  return p.kind==='burger'?burgerCardHTML(p,i):classicCardHTML(p,i);
}
/* ——— BURGER KARTI: "ambalaj kâğıdı" ———
   kareli tepsi kâğıdı şeridi · güneş patlaması rozeti üstünde taşan burger · eğik fiyat etiketi
   · malzemeler burger katları gibi renk kodlu · alt kenar tırtıklı ambalaj */
function burgerCardHTML(p,i){
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'
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
function classicCardHTML(p,i){
  var vis=p.img?'<img class="prod" src="'+p.img+'" alt="" width="'+p.w+'" height="'+p.h+'" draggable="false">'
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
      c.items.forEach(function(p){list.push(p);html+=cardHTML(p,i++)});
      var ch=document.createElement('button');ch.type='button';ch.className='chip';ch.textContent=c.name;ch.dataset.cat=c.key;chipsEl.appendChild(ch);
    });
    tabsEl.querySelectorAll('.tab').forEach(function(t){var on=t.dataset.key===state.group;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1});
  }
  state.order=list.map(function(p){return p.id});
  grid.innerHTML=html;
  document.documentElement.dataset.group=state.group;
  var hex=groupColor(state.group);
  if(gl.setGroup)gl.setGroup(hex,state.group);
  var tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=hex;
  collectCards();moveInd();
  if(opts.deal!==false)dealCards();
}
function collectCards(){
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){es.forEach(function(e){var c=cards.find(function(x){return x.el===e.target});if(c)c.vis=e.isIntersecting})},{rootMargin:'160px 0px'});
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
  var vh=window.innerHeight,k=1-Math.exp(-dt*10);
  for(var i=0;i<cards.length;i++){
    var c=cards[i];if(!c.vis)continue;
    var r=c.el.getBoundingClientRect();
    var s=RM?0:clamp(((r.top+r.height/2)-vh/2)/(vh*.6),-1,1);
    var trx=-s*6+(c.on?-c.py*12:-aim.y*2.5),try_=c.on?c.px*15:aim.x*4.5;
    c.rx+=(trx-c.rx)*k;c.ry+=(try_-c.ry)*k;
    c.inner.style.transform='perspective(1100px) rotateX('+c.rx.toFixed(2)+'deg) rotateY('+c.ry.toFixed(2)+'deg)';
  }
  /* aktif kategori çipi */
  if(state.mode==='menu'&&!state.q&&chipsEl.children.length){
    var cur=null,line=window.innerHeight*.42,bt=-1e9;
    for(var j=0;j<cards.length;j++){var rr=cards[j].el.getBoundingClientRect();if(rr.top<line&&rr.top>bt+30){bt=rr.top;cur=cards[j].el.dataset.cat}}
    if(!cur&&cards[0])cur=cards[0].el.dataset.cat;
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
  var vis=p.img?'<img id="hp" src="'+p.img+'" alt="'+esc(p.name)+'" draggable="false">':'<div id="hp" class="ph" role="img" aria-label="'+esc(p.name)+'"><img src="'+LOGO_IMG+'" alt=""></div>';
  hpHost.innerHTML=vis;hp=$('#hp');
  $('#sCat').textContent=p.category;
  $('#sName').innerHTML=esc(p.name)+(p.size?' <small>'+esc(p.size)+'</small>':'');
  var d=$('#sDesc');d.textContent=p.desc||'';d.style.display=p.desc?'':'none';
  $('#sPrice').textContent=money(p.price);
  $('#panel').style.setProperty('--hero',groupColor(p.groupKey));
  hpT.rx=hpT.ry=0;
  var i=state.order.indexOf(p.id),many=state.order.length>1;
  $('.pn').style.display=many?'':'none';
}
function openSheet(id,fromEl,fromHash){
  var p=BYID[id];if(!p)return;
  lastFocus=fromEl||document.activeElement;
  var r0=null;
  if(fromEl){var im=fromEl.querySelector('.prod,.ph');if(im)r0=im.getBoundingClientRect()}
  state.sheetId=id;fillSheet(p);
  sheet.classList.add('open');document.documentElement.classList.add('lock');
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
  sheet.classList.remove('open');state.sheetId=null;
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
  if(!RM)hp.animate([{opacity:0,transform:'translateX('+(dir*60)+'px) scale(.9)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.9,.2,1)'});
  var c=cards.find(function(x){return x.el.dataset.id===id});if(c)lastFocus=c.el;
}
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
render({deal:false});setP(0);finishMode();
var h0=location.hash.slice(1);
if(h0&&BYID[h0])goToMenuForHash(h0);
})();
