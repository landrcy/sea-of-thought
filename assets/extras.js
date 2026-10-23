/* Sea of Thought — living extras: day/night cycle, weather, fish food, sea birds.
   Everything here is delta-time based (no per-frame increments) and drawn into the ocean canvas through a few hooks. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, RM = px.RM, rng = px.rng, hash = px.hash, disc = px.disc, line = px.line, mk = px.mkCanvas, spr = px.sprCanvas, sky = SOT.sky;
  var qs = new URLSearchParams(location.search);
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); }, ez = function (dt, k) { return 1 - Math.exp(-k * dt); }, sm = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var FX = SOT.fx = { night: 0, storm: 0, rain: 0, chop: 1, flash: 0 }, A = {}, G = null;

  /* ---------- day / night cycle (visual only; stays in the blue family) ---------- */
  var CYC = 420, phase = 0, tq = qs.get('time') || (qs.get('sky') === 'night' ? 'night' : ''), fixedD = tq === 'night' ? 0 : tq === 'day' ? 1 : tq === 'dusk' ? .5 : null;
  function dayAt(p) { return p < .40 ? 1 : p < .54 ? 1 - sm((p - .40) / .14) : p < .80 ? 0 : p < .94 ? sm((p - .80) / .14) : 1; }
  FX.cycleSeconds = CYC; FX.setPhase = function (p) { phase = p % 1; };
  function updateCycle(dt) {
    if (fixedD == null && !RM) phase = (phase + dt / CYC) % 1;
    var d = fixedD != null ? fixedD : RM ? 1 : dayAt(phase); sky.d = d; sky.target = d; FX.night = 1 - d;
  }

  /* ---------- weather: rain + lightning storms at random intervals ---------- */
  var wf = qs.get('weather'), wx = { next: 50 + Math.random() * 70, dur: 0, kind: 'clear', rT: 0, sT: 0 }, rainI = 0, stormI = 0, bolt = null, boltNext = 3, rainAcc = 0;
  if (wf === 'storm') { wx.kind = 'storm'; wx.rT = 1; wx.sT = 1; wx.dur = 1e9; } else if (wf === 'rain') { wx.kind = 'rain'; wx.rT = 1; wx.dur = 1e9; } else if (wf === 'clear') wx.next = 1e9;
  function updateWeather(dt) {
    if (!RM || wf) { if (wx.kind === 'clear') { wx.next -= dt; if (wx.next <= 0) { wx.kind = Math.random() < .5 ? 'storm' : 'rain'; wx.dur = 20 + Math.random() * 20; wx.rT = 1; wx.sT = wx.kind === 'storm' ? 1 : 0; boltNext = 2 + Math.random() * 3; } } else { wx.dur -= dt; if (wx.dur <= 0) { wx.kind = 'clear'; wx.rT = 0; wx.sT = 0; wx.next = 60 + Math.random() * 120; } } }
    rainI += (wx.rT - rainI) * ez(dt, .55); stormI += (wx.sT - stormI) * ez(dt, .5); if (rainI < .003) rainI = 0; if (stormI < .003) stormI = 0;
    FX.rain = rainI; FX.storm = stormI; FX.chop = 1 + .45 * rainI + .95 * stormI;
    if (stormI > .5 && !RM) { boltNext -= dt; if (boltNext <= 0) { boltNext = 3 + Math.random() * 6; makeBolt(); } }
    if (bolt) { bolt.t += dt; FX.flash = bolt.t < .07 ? 1 : bolt.t < .12 ? .25 : bolt.t < .17 ? .8 : Math.max(0, 1 - (bolt.t - .17) / .3); if (bolt.t > .5) { bolt = null; FX.flash = 0; } }
  }
  function makeBolt() {
    var x = A.W * (.12 + Math.random() * .76), y0 = A.HZ * .1, y1 = A.SY, pts = [[x, y0]], cx = x, y = y0, br = [];
    while (y < y1) { y += 4 + Math.random() * 4; cx += (Math.random() - .5) * 11; pts.push([cx, Math.min(y, y1)]); if (Math.random() < .22 && y > y0 + 12) { var bp = [[cx, y]], bx = cx, by = y, dir = Math.random() < .5 ? -1 : 1; for (var k = 0; k < 4; k++) { by += 3 + Math.random() * 3; bx += dir * (2 + Math.random() * 5); bp.push([bx, by]); } br.push(bp); } }
    bolt = { t: 0, pts: pts, br: br };
  }
  var CLS = null;
  function cloudSprites() { if (CLS) return CLS; CLS = []; var r = rng(77); for (var i = 0; i < 4; i++) { var w = 60 + (r() * 40 | 0), h = 18, c = mk(w, h), g = c.getContext('2d'), n = 5 + (r() * 3 | 0), ds = []; for (var j = 0; j < n; j++) ds.push([6 + (w - 12) * (j + r() * .5) / n, h - 7 - r() * 4, 4 + r() * 5]);
      ds.forEach(function (d) { disc(g, d[0] | 0, (d[1] + 1) | 0, d[2] | 0, '#03206a'); }); ds.forEach(function (d) { disc(g, d[0] | 0, (d[1] - 1) | 0, (d[2] - 1) | 0, '#04307a'); }); ds.forEach(function (d) { disc(g, (d[0] - 1) | 0, (d[1] - 3) | 0, Math.max(1, d[2] - 3) | 0, '#0a4a9a'); }); CLS.push(c); } return CLS; }
  /* drawn once the water + sky are down: night wash, storm darkening, storm clouds, flash */
  FX.sky = function (g, camI, t, depthF) {
    var W = A.W, H = A.H, SY = A.SY;
    if (FX.night > .01) { g.fillStyle = 'rgba(3,6,72,' + (.58 * FX.night * (1 - depthF * .75)).toFixed(3) + ')'; g.fillRect(0, camI, W, H); }
    var dk = .3 * rainI + .32 * stormI; if (dk > .01 && camI < SY + 40) { var hh = Math.min(H, SY + 4 - camI); g.fillStyle = 'rgba(2,28,86,' + dk.toFixed(3) + ')'; g.fillRect(0, camI, W, hh); g.fillStyle = 'rgba(2,36,96,' + (dk * .45 * (1 - depthF)).toFixed(3) + ')'; g.fillRect(0, camI, W, H); }
    if ((rainI > .02 || stormI > .02) && camI < SY) { var cl = cloudSprites(), n = Math.ceil(W / 46) + 1; for (var i = 0; i < n; i++) { var s = cl[i & 3], x = ((i * 53 + t * (2 + (i % 3))) % (W + 90)) - 70, y = Math.round(A.HZ * (.02 + .45 * hash(i, 3, 1))); g.globalAlpha = clamp(rainI * 1.1, 0, .95); g.drawImage(s, Math.round(x), y); } g.globalAlpha = 1; }
    if (FX.flash > .01 && camI < SY + 200) { g.fillStyle = 'rgba(202,240,248,' + (.2 * FX.flash).toFixed(3) + ')'; g.fillRect(0, camI, W, Math.min(H, SY + 160 - camI)); }
  };

  /* ---------- fish food ---------- */
  var flakes = [], foodCool = 0, FCAP = 90, FCOL = ['#F0C060', '#E8945A', '#D8E8A0', '#F4D9A0'];
  FX.dropFood = function () {
    if (RM && false) return false; var now = performance.now(); if (now < foodCool || flakes.length > FCAP - 8 || !A.W) return false; foodCool = now + 900;
    var cx = A.W * (.22 + Math.random() * .56), y0 = Math.max(A.SY - 16, A.cam + 3);
    for (var i = 0; i < 9; i++) flakes.push({ x: cx + (Math.random() - .5) * 46, y: y0 - Math.random() * 10, vy: 7 + Math.random() * 5, ph: Math.random() * 6, hp: .8 + Math.random() * .5, age: 0, c: FCOL[i & 3], w: i % 3 === 0 ? 2 : 1 });
    return true;
  };
  function updateFood(dt, t, camI) {
    for (var i = flakes.length - 1; i >= 0; i--) { var f = flakes[i]; f.age += dt; var inAir = f.y < A.surfY(Math.round(f.x), t); f.y += (inAir ? 46 : f.vy) * dt; f.x += Math.sin(t * 1.7 + f.ph) * (inAir ? 2 : 6) * dt;
      if (f.eaten || f.age > 50 || f.y > camI + A.H + 70 || f.y > A.BT - 2 || f.x < -6 || f.x > A.W + 6) flakes.splice(i, 1); }
  }
  FX.food = function (g, camI, t) {
    for (var i = 0; i < flakes.length; i++) { var f = flakes[i]; if (f.y < camI - 4 || f.y > camI + A.H + 4) continue; g.fillStyle = f.c; g.fillRect(Math.round(f.x), Math.round(f.y), f.w + 1, 2); if (f.w === 2 && ((t * 3 + i) | 0) % 2) g.fillRect(Math.round(f.x) + 1, Math.round(f.y) + 2, 1, 1); }
  };
  /* creatures call this: steer a shoal / single toward the nearest flake, nibble it, and drift home afterwards */
  FX.steer = function (s, dt, t) {
    var n = flakes.length;
    if (!n) { if (s.y0 != null) { s.y += (s.y0 - s.y) * ez(dt, .6); s.vx += (s.vx0 - s.vx) * ez(dt, .9); if (Math.abs(s.y - s.y0) < .3 && Math.abs(s.vx - s.vx0) < .2) { s.y = s.y0; s.vx = s.vx0; s.y0 = null; } } return; }
    var best = null, bd = 1e9, cx = s.x + (s.cw || 14), i, f, d; for (i = 0; i < n; i++) { f = flakes[i]; if (f.y < A.SY + 1) continue; var dx = f.x - cx, dy = f.y - (s.y0 != null ? s.y0 : s.y); if (Math.abs(dx) > 120 || Math.abs(dy) > 70) continue; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = f; } }
    if (!best) { if (s.y0 != null) { s.y += (s.y0 - s.y) * ez(dt, .6); s.vx += (s.vx0 - s.vx) * ez(dt, .9); } return; }
    if (s.y0 == null) { s.y0 = s.y; s.vx0 = s.vx; }
    var dir = best.x > cx ? 1 : -1, sp = Math.max(8, Math.abs(s.vx0)) * 1.5; s.vx += (dir * sp - s.vx) * ez(dt, 2.2); s.y += (best.y - (s.cy || 3) - s.y) * ez(dt, 1.1);
    if (Math.abs(best.x - cx) < 12 && Math.abs(best.y - (s.y + (s.cy || 3))) < 12) { best.hp -= dt; if (best.hp <= 0) { best.eaten = true; for (i = 0; i < 2; i++) A.parts.push({ x: best.x + (i ? 2 : -1), y: best.y - 1, vx: 0, vy: -10, l: 1.1, k: 2, b: 0 }); A.parts.push({ x: best.x, y: best.y, vx: 0, vy: -8, l: 1.4, k: 2, b: 1 }); } }
  };

  /* ---------- sea birds ---------- */
  var birds = [], lost = [], BS = null;
  /* gulls are painted procedurally on the scene's own pixel grid (1 sprite px = 1 scene px): parts are rasterised at pixel centres,
     shaded with a checker dither, outlined, and mirrored for the other facing; the dive/rise poses are rasterised rotated, never rotated afterwards. */
  var GPAL={O:[11,61,117],k:[11,61,117],g:[84,134,180],G:[140,186,216],W:[244,251,254],w:[202,240,248],s:[144,224,239],b:[240,160,48],e:[3,4,94],y:[232,144,72]};
  function gullFrame(o){ // o: {w:wing pose -1..1 (1 up), rot:radians (0 level, +down), fold:0..1, float:bool, sw:0|1 swim}
    var N=24,C=N/2,cell=[],i,j;for(i=0;i<N*N;i++)cell.push('');
    var cr=Math.cos(o.rot||0),sr=Math.sin(o.rot||0);
    function tp(x,y){return [C+x*cr-y*sr, C+x*sr+y*cr];}
    function inPoly(P,x,y){var c=false;for(var a=0,b=P.length-1;a<P.length;b=a++){if(((P[a][1]>y)!==(P[b][1]>y))&&(x<(P[b][0]-P[a][0])*(y-P[a][1])/(P[b][1]-P[a][1])+P[a][0]))c=!c;}return c;}
    function poly(L,fn){var P=L.map(function(p){return tp(p[0],p[1]);});for(var y=0;y<N;y++)for(var x=0;x<N;x++)if(inPoly(P,x+.5,y+.5)){var ch=fn(x,y,tp);if(ch)cell[y*N+x]=ch;}}
    function ell(cx,cy,rx,ry,fn){var c=tp(cx,cy);for(var y=0;y<N;y++)for(var x=0;x<N;x++){var px=x+.5-c[0],py=y+.5-c[1],ux=px*cr+py*sr,uy=-px*sr+py*cr;if(ux*ux/(rx*rx)+uy*uy/(ry*ry)<=1){var ch=fn(x,y,ux,uy);if(ch)cell[y*N+x]=ch;}}}
    var w=o.w,fold=o.fold||0;
    function lerp(a,b,t){return a+(b-a)*t;}
    function wingPts(v){ var K=[[ -3,2.4,-6.5,7.4 ],[ -4.5,-2.8,-12.5,-3.8 ],[ -2.6,-6.6,-5,-12 ]]; // elbow x,y, tip x,y for down, mid, up
      var i=v<0?0:1,t=v<0?v+1:v;var a=K[i],b=K[i+1];var r=[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t)];
      if(fold>.5)r=[-5,-2,-11.5,-.5-1.5*Math.max(0,v)];return r;}
    function wing(far){
      var q=wingPts(far?Math.min(1,w*.8+.12):w), ex=q[0],ey=q[1],tx=q[2],ty=q[3], wd=far?4.2:6.4, rf=[3.4,-1.9],rb=[-5.2,-.9];
      var n=Math.hypot(tx-ex,ty-ey)||1,nx=-(ty-ey)/n,ny=(tx-ex)/n,e1=[ex-nx*wd*.7+1.6,ey-ny*wd*.7],e2=[ex+nx*wd*.7-.6,ey+ny*wd*.7];
      poly([rf,e2,[tx,ty],e1,rb],function(x,y,tpf){var T=tp(tx,ty),d=Math.hypot(x+.5-T[0],y+.5-T[1]);if(d<3)return 'k';if(far)return 's';return (((x+y)&1)&&d<5)?'G':(d>5&&((x+y)&1)?'G':'g');});
    }
    if(!o.float){ if(!o.noFar){ // far wing, shifted a bit up/forward
        var sv=w; w=Math.min(1,w*.8+.15); wing(true); w=sv; } }
    // tail
    poly([[-4,-.8],[-9.6,-1.9],[-9.8,.6],[-5,1.6]],function(x,y){return 'w';});
    // body
    ell(0,0,6.4,2.7,function(x,y,ux,uy){return uy>1.15?((x+y)&1?'s':'w'):uy>.2?'w':'W';});
    // near wing / folded wing
    if(o.float){ poly([[2.5,-1.6],[-1,-3.1],[-7.5,-2.6],[-9.5,-.8],[-4,.4],[1,.1]],function(){return 'g';}); }
    else { wing(false); }
    // head + beak + eye
    ell(6.6,-1.7,2.3,2.1,function(x,y,ux,uy){return uy>.7?'w':'W';});
    var bp=tp(9.6,-1.3);poly([[8.4,-2.1],[10.8,-1.2],[8.4,-.3]],function(){return 'b';});
    var ep=tp(7.2,-2.2);cell[Math.floor(ep[1])*N+Math.floor(ep[0])]='e';
    if(o.carry){var cp=tp(10.4,.2);}
    // outline
    var out=cell.slice();for(var y=0;y<N;y++)for(var x=0;x<N;x++){if(cell[y*N+x])continue;var nb=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var X=x+d[0],Y=y+d[1];if(X>=0&&Y>=0&&X<N&&Y<N&&cell[Y*N+X])nb=1;});if(nb)out[y*N+x]='O';}
    // wing tips dark: far end of wing pixels that are 'g'
    return out;
  }

  function gullCanvas(o) { var f = gullFrame(o), c = mk(24, 24), g = c.getContext('2d'), i; for (i = 0; i < 576; i++) { var ch = f[i]; if (ch) { var k = GPAL[ch]; g.fillStyle = 'rgb(' + k[0] + ',' + k[1] + ',' + k[2] + ')'; g.fillRect(i % 24, (i / 24) | 0, 1, 1); } } return [c, fp(c)]; }
  function fp(c) { var o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
  function birdSprites() {
    if (BS) return BS;
    return BS = { fly: [1, .1, -1, .1].map(function (w) { return gullCanvas({ w: w }); }), fl: gullCanvas({ w: 0, float: true }), dv: [.8, 1.15, 1.55].map(function (r) { return gullCanvas({ w: .5, fold: 1, rot: r }); }), rs: gullCanvas({ w: .5, fold: 1, rot: -1.5 }), fish: spr(['.hh.', 'hhhh', '.hh.'], { h: '#9ad0f0' }) };
  }
  function initBirds() { birds = []; var n = A.W < 200 ? 2 : A.W < 300 ? 3 : 4; for (var i = 0; i < n; i++) birds.push({ m: i < 2 ? 'float' : 'fly', x: A.W * (.18 + .64 * ((i * .37 + .11) % 1)), y: 0, dir: i & 1 ? -1 : 1, vx: 0, ph: i * 1.7, cd: 10 + i * 6, dc: 6 + i * 5, carry: 0, tg: null, ut: 0, tr: 0 }); }
  function laneY(b) { return A.HZ * .74 + (A.SY - 10 - A.HZ * .74) * (.2 + .6 * hash(b.ph * 10 | 0, 2, 5)); }
  function updateBirds(dt, t, camI) {
    if (!birds.length || birds.length !== (A.W < 200 ? 2 : A.W < 300 ? 3 : 4)) initBirds(); var SY = A.SY, i, b;
    for (i = 0; i < birds.length; i++) { b = birds[i]; b.cd -= dt; b.dc -= dt; if (b.carry > 0) b.carry -= dt; if (!RM || true) { /* motion below is dt based */ }
      if (b.m === 'float') { b.x += Math.sin(t * .13 + b.ph) * 1.1 * dt; b.y = A.surfY(Math.round(b.x), t) - 4 + Math.sin(t * 1.5 + b.ph) * .6; if (b.cd <= 0) { b.m = 'fly'; b.cd = 22 + Math.random() * 25; b.dir = Math.random() < .5 ? -1 : 1; b.vy = -40; b.dc = 4 + Math.random() * 6; } }
      else if (b.m === 'fly') { var ly = laneY(b) + Math.sin(t * .8 + b.ph) * 3; b.y += ((b.vy != null ? 0 : 0) + (ly - b.y)) * ez(dt, 1.4); b.x += b.dir * (15 + 5 * hash(i, 1, 1)) * dt; if (b.x > A.W + 16) { b.x = -14; } if (b.x < -16) { b.x = A.W + 14; }
        if (b.cd <= 0 && b.carry <= 0) { b.m = 'land'; b.lx = A.W * (.15 + Math.random() * .7); }
        else if (b.dc <= 0 && b.x > 10 && b.x < A.W - 10) { var sh = A.shoals, k, pick = null; for (k = 0; k < sh.length; k++) { var s = sh[k]; if (s.far || s.fs.length < 5 || s.y > SY + 150) continue; if (Math.abs(s.x + 17 - b.x) < 34) { pick = s; break; } } if (pick) { b.m = 'dive'; b.tg = pick; b.tr = 0; b.dc = 25 + Math.random() * 25; } else b.dc = 3 + Math.random() * 4; } }
      else if (b.m === 'land') { var dx = b.lx - b.x; b.dir = dx > 0 ? 1 : -1; b.x += clamp(dx, -1, 1) * 18 * dt; var sy = A.surfY(Math.round(b.x), t) - 4; b.y += (sy - b.y) * ez(dt, 1.3); if (Math.abs(dx) < 3 && Math.abs(b.y - sy) < 2) { b.m = 'float'; b.cd = 14 + Math.random() * 25; } }
      else if (b.m === 'dive') { var s2 = b.tg, tx = s2.x + 17 + s2.vx * .5, sy2 = A.surfY(Math.round(b.x), t); b.tr += dt; var ddx = tx - b.x, ddy = sy2 - b.y, L = Math.hypot(ddx, ddy) || 1, sp = 62; b.dir = ddx > 0 ? 1 : -1; b.x += clamp(ddx, -1, 1) * Math.min(26, Math.abs(ddx) / Math.max(.2, ddy / sp)) * dt; b.y += sp * dt; b.ang = Math.atan2(sp, clamp(ddx, -26, 26) * .6) ; if (b.y >= sy2) { A.splash(b.x, sy2, false); b.m = 'under'; b.ut = 0; b.bt = 0; } else if (b.tr > 4) b.m = 'fly'; }
      else if (b.m === 'under') { var s3 = b.tg, tyy = Math.min(s3.y + 6, SY + 120); b.ut += dt; b.bt -= dt; b.dir = (s3.x + 17 > b.x) ? 1 : -1; b.x += clamp(s3.x + 17 - b.x, -1, 1) * 14 * dt; b.y += 40 * dt; b.ang = 1.4; if (b.bt <= 0) { b.bt = .09; A.parts.push({ x: b.x - b.dir * 3, y: b.y - 2, vx: 0, vy: -8, l: 1.1, k: 2, b: Math.random() < .3 ? 1 : 0 }); }
        if (b.y >= tyy || b.ut > 2.6) { if (Math.random() < .7 && s3.fs.length > 4) { var fish = s3.fs.pop(); lost.push({ s: s3, f: fish, t: 35 + Math.random() * 20 }); b.carry = 12; for (var q = 0; q < 4; q++) A.parts.push({ x: b.x + (q - 1.5) * 2, y: b.y, vx: 0, vy: -10 - q, l: 1.2, k: 2, b: q & 1 }); } b.m = 'rise'; } }
      else if (b.m === 'rise') { b.y -= 38 * dt; b.x += b.dir * 6 * dt; b.ang = -1.4; b.bt -= dt; if (b.bt <= 0) { b.bt = .12; A.parts.push({ x: b.x, y: b.y + 3, vx: 0, vy: -8, l: .9, k: 2, b: 0 }); } var sy3 = A.surfY(Math.round(b.x), t); if (b.y <= sy3 - 3) { A.splash(b.x, sy3, false); b.m = 'fly'; b.cd = 18 + Math.random() * 20; b.dc = 20 + Math.random() * 25; b.y = sy3 - 4; } }
    }
    for (i = lost.length - 1; i >= 0; i--) { lost[i].t -= dt; if (lost[i].t <= 0) { lost[i].s.fs.push(lost[i].f); lost.splice(i, 1); } }
  }
  FX.birds = function (g, camI, t) {
    var B = birdSprites(), SY = A.SY; if (camI > SY + 200) return;
    for (var i = 0; i < birds.length; i++) { var b = birds[i]; if (b.y < camI - 16 || b.y > camI + A.H + 16) continue; var fi = b.dir > 0 ? 0 : 1, x = Math.round(b.x), y = Math.round(b.y), s, al = 1;
      if (b.m === 'float') s = B.fl[fi], y += 1;
      else if (b.m === 'fly' || b.m === 'land') { s = B.fly[((t * (b.m === 'land' ? 7 : 5) + b.ph) | 0) & 3][fi]; if (b.carry > 0) g.drawImage(B.fish, x + (b.dir > 0 ? 8 : -12), y + 1); }
      else if (b.m === 'rise') { s = B.rs[fi]; if (b.carry > 0) g.drawImage(B.fish, x + (b.dir > 0 ? 3 : -7), y - 6); }
      else { var dx = b.m === 'dive' && b.tg ? Math.abs(b.tg.x + 17 - b.x) : 0; s = B.dv[b.m === 'under' ? 2 : dx > 22 ? 0 : dx > 8 ? 1 : 2][fi]; if (b.m !== 'dive') al = .78; }
      if (al < 1) g.globalAlpha = al; g.drawImage(s, x - 12, y - 12); if (al < 1) g.globalAlpha = 1; }
  };

  /* ---------- rain + lightning, drawn over the surface ---------- */
  FX.top = function (g, dt, t, camI) {
    var W = A.W, SY = A.SY, H = A.H;
    if (camI < SY + 6) {
      var ri = Math.max(rainI, stormI); if (ri > .01) { var N = Math.round(W * .6 * ri * (1 + stormI)), lean = 8 + stormI * 14; g.fillStyle = 'rgba(202,240,248,' + (.35 + .3 * ri).toFixed(2) + ')';
        for (var i = 0; i < N; i++) { var sp = 150 + 70 * hash(i, 4, 2), yy = (hash(i, 2, 3) * (SY + 20) + t * sp) % (SY + 20), xx = (hash(i, 1, 7) * (W + 40) + yy * lean / sp * 1.3 - 20 + W * 4) % (W + 40) - 10; if (yy > SY - 1 || yy < camI - 4 || yy > camI + H) continue; g.fillRect(Math.round(xx), Math.round(yy), 1, 2); g.fillRect(Math.round(xx - 1), Math.round(yy) + 2, 1, 1); }
        rainAcc += dt * 26 * ri; while (rainAcc >= 1) { rainAcc -= 1; A.ripples.push({ x: Math.random() * W, y: SY, r: 1, a: .55 }); } }
      if (bolt) { var a = clamp(1 - bolt.t / .5, 0, 1); [[bolt.pts, 1]].concat(bolt.br.map(function (p) { return [p, 0]; })).forEach(function (bp) { var p = bp[0]; for (var k = 1; k < p.length; k++) { g.fillStyle = 'rgba(144,224,239,' + (.55 * a).toFixed(2) + ')'; line(g, p[k - 1][0] - 1, p[k - 1][1], p[k][0] - 1, p[k][1], 3); g.fillStyle = 'rgba(244,252,255,' + (.95 * a).toFixed(2) + ')'; line(g, p[k - 1][0], p[k - 1][1], p[k][0], p[k][1], bp[1] ? 2 : 1); } });
        if (bolt.t < .25) { var e = bolt.pts[bolt.pts.length - 1]; g.fillStyle = 'rgba(244,252,255,.8)'; g.fillRect(Math.round(e[0]) - 4, SY, 9, 1); g.fillRect(Math.round(e[0]) - 2, SY - 1, 5, 1); } }
    }
    FX.birds(g, camI, t);
  };

  /* ---------- hookup ---------- */
  FX.init = function (api) { A = api; };
  FX.update = function (dt, t, camI) { updateCycle(dt); updateWeather(dt); updateFood(dt, t, camI); updateBirds(dt, t, camI); };
  FX.probe = function () { return { phase: phase, d: sky.d, rain: rainI, storm: stormI, flakes: flakes.length, birds: birds.map(function (b) { return b.m; }) }; };
  FX.debug = { forceBolt: makeBolt, fx: function () { return { flakes: flakes, birds: birds }; } };
  /* DOM: food button */
  function foodIcon(c) { var rows = ['...nnnnnn...', '...tttttt...', '..nnnnnnnn..', '..bbbbbbbb..', '..bwwwwwwb..', '..bbbbbbbb..', '..bwwwwwwb..', '..bbbbbbbb..', '...bbbbbb...', '..o..y..r...', '.y..o..y..o.', '...r..y..o..'], pal = { n: '#CAF0F8', t: '#90E0EF', b: '#0096C7', w: '#ADE8F4', o: '#F0A050', y: '#F0D070', r: '#E8845A' }, s = spr(rows, pal); c.width = 12; c.height = 12; c.getContext('2d').drawImage(s, 0, 0); }
  FX.bindDom = function () {
    var fb = document.getElementById('food-btn'); if (fb) { foodIcon(fb.firstChild); fb.addEventListener('click', function () { if (FX.dropFood()) { fb.classList.remove('pulse'); void fb.offsetWidth; fb.classList.add('pulse'); fb.setAttribute('aria-disabled', 'true'); setTimeout(function () { fb.removeAttribute('aria-disabled'); }, 900); var lv = document.getElementById('live'); if (lv) lv.textContent = 'You sprinkled fish food into the water.'; } }); }
    if (qs.has('food')) { setTimeout(FX.dropFood, 900); setInterval(function () { foodCool = 0; FX.dropFood(); }, 4500); }
  };
})();
