/* Sea of Thought — pixel scenes (hero, sea, deep-water backdrop, footer seabed) drawn procedurally on low-res canvases. */
(function () {
  'use strict';
  var SOT = window.SOT = window.SOT || {};
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sky = SOT.sky = { d: 0, target: 0 };            // d: 0 = dusk, 1 = day
  SOT.setSky = function (m) { sky.target = m === 'day' ? 1 : 0; if (RM) sky.d = sky.target; };

  /* ---------- helpers ---------- */
  function parse(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { var r = c[0] | 0, g = c[1] | 0, b = c[2] | 0; return a == null || a >= 1 ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
  function P(dusk, day) { return { a: parse(dusk), b: parse(day) }; }
  function pc(p, a) { return css(mix3(p.a, p.b, sky.d), a); }
  var BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(function (r) { return r.map(function (v) { return (v + .5) / 16; }); });
  function rng(seed) { var s = seed >>> 0; return function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(x, y, t) { var h = (x * 374761393 + y * 668265263 + t * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function gradCanvas(w, h, stops, y0, y1) {          // vertical dithered gradient
    var c = mkCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(c.width, c.height), S = stops.map(parse), d = img.data;
    for (var y = 0; y < c.height; y++) {
      var p = Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0))) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(p)), f = p - i;
      for (var x = 0; x < c.width; x++) { var col = f > BAY[y & 3][x & 3] ? S[i + 1] : S[i], k = (y * c.width + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; }
    }
    g.putImageData(img, 0, 0); return c;
  }
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r - y * y + .5)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
  function line(g, x0, y0, x1, y1, w) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy; for (;;) { g.fillRect(x0, y0, w || 1, w || 1); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
  function sprCanvas(rows, pal) { var c = mkCanvas(rows[0].length, rows.length), g = c.getContext('2d'); rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x]; if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } }); return c; }
  SOT.px = { parse: parse, mix3: mix3, css: css, P: P, pc: pc, BAY: BAY, rng: rng, hash: hash, mkCanvas: mkCanvas, gradCanvas: gradCanvas, disc: disc, line: line, sprCanvas: sprCanvas };

  /* ---------- bottle sprite (28x11, lying on its side like the reference photo) ---------- */
  var TINTS = [[190, 236, 238], [168, 228, 184], [150, 226, 222], [160, 202, 240], [132, 206, 168]];
  SOT.TINT_COUNT = TINTS.length;
  var BW = 28, BH = 11;
  function inside(x, y) {
    if (x < 0 || x > 23) return false;
    if (x <= 15) { if (y < 1 || y > 9) return false; if (x < 2 && (y < 2 || y > 8)) return false; if (x === 0 && (y < 3 || y > 7)) return false; if (x === 1 && (y < 2 || y > 8)) return false; if (x === 2 && (y < 1 || y > 9)) return false; return true; }
    if (x === 16) return y >= 2 && y <= 8;
    if (x === 17) return y >= 3 && y <= 7;
    return y >= 3 && y <= 7;
  }
  var bottleCache = {};
  function bottleSprite(tint, opt) {
    opt = opt || {}; var key = tint + '|' + (opt.noScroll ? 1 : 0) + (opt.noCork ? 1 : 0) + (opt.hl ? 'h' : '');
    if (bottleCache[key]) return bottleCache[key];
    var c = mkCanvas(BW, BH), g = c.getContext('2d'), T = TINTS[tint % TINTS.length];
    var glass = 'rgba(' + T.join(',') + ',.42)', deep = 'rgba(' + T.map(function (v) { return v * .62 | 0; }).join(',') + ',.58)',
      out = 'rgba(' + T.map(function (v) { return v * .28 | 0; }).join(',') + ',.95)';
    function at(x, y) { return x >= 0 && y >= 0 && x < BW && y < BH && inside(x, y); }
    for (var y = 0; y < BH; y++) for (var x = 0; x < BW; x++) {
      if (!inside(x, y)) continue;
      var edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (opt.hl) { // highlight-only layer (drawn over the scroll so glass looks glassy)
        if (edge) continue;
        var topInner = !at(x, y - 1) ? false : !at(x, y - 2);
        if (topInner && x >= 3 && x <= 14) { g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(x, y, 1, 1); }
        else if (x === 1 && y >= 3 && y <= 7) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, y, 1, 1); }
        else if (y === 3 && x >= 4 && x <= 9) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, y, 1, 1); }
        else if (y === 3 && x >= 18 && x <= 22) { g.fillStyle = 'rgba(224,252,255,.9)'; g.fillRect(x, y, 1, 1); }
        continue;
      }
      g.fillStyle = edge ? out : (!at(x, y + 1) || !at(x, y + 2) && y > 6 ? deep : glass);
      g.fillRect(x, y, 1, 1);
    }
    if (opt.hl) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(12, 4, 1, 1); g.fillRect(10, 8, 1, 1); }
    if (!opt.hl) {
      // lip ring
      g.fillStyle = 'rgba(' + T.map(function (v) { return v * .45 | 0; }).join(',') + ',.95)'; g.fillRect(22, 2, 2, 7);
      if (!opt.noScroll) {   // rolled parchment scroll with twine + tiny handwriting
        g.fillStyle = '#c9a46a'; g.fillRect(3, 6, 12, 1);
        g.fillStyle = '#f3dfae'; g.fillRect(3, 5, 12, 1);
        g.fillStyle = '#fff1cf'; g.fillRect(3, 4, 12, 1);
        g.fillStyle = '#b08a4e'; g.fillRect(3, 4, 1, 3); g.fillRect(14, 4, 1, 3);
        g.fillStyle = '#5b3d22'; [5, 7, 8, 11, 12].forEach(function (x) { g.fillRect(x, 5, 1, 1); }); g.fillRect(6, 4, 1, 1); g.fillRect(12, 4, 1, 1);
        g.fillStyle = '#7a5230'; g.fillRect(9, 3, 1, 5); g.fillRect(8, 2 + 1, 1, 1); g.fillRect(10, 3, 1, 1);
      }
    }
    if (!opt.hl && !opt.noCork) {
      g.fillStyle = '#6d3f1a'; g.fillRect(24, 3, 4, 5);
      g.fillStyle = '#a8672e'; g.fillRect(24, 3, 4, 3);
      g.fillStyle = '#d19a58'; g.fillRect(25, 3, 2, 1); g.fillRect(26, 5, 1, 1);
      g.fillStyle = '#4a2a10'; g.fillRect(27, 4, 1, 3);
    }
    return bottleCache[key] = c;
  }
  var deepCache = {};
  function deepBottle(tint) {   // submerged variant: cooler, dimmer
    if (deepCache[tint]) return deepCache[tint];
    var c = mkCanvas(BW, BH), g = c.getContext('2d');
    g.drawImage(bottleSprite(tint), 0, 0); g.drawImage(bottleSprite(tint, { hl: true }), 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(14,64,128,.42)'; g.fillRect(0, 0, BW, BH);
    return deepCache[tint] = c;
  }
  // draw a bottle with column shear to tilt it (keeps hard pixel edges). x,y = top-left.
  function drawBottle(g, tint, x, y, slope, deep) {
    var base = deep ? deepBottle(tint) : bottleSprite(tint), hl = deep ? null : bottleSprite(tint, { hl: true });
    for (var i = 0; i < BW; i++) {
      var dy = Math.round((i - 14) * slope);
      g.drawImage(base, i, 0, 1, BH, x + i, y + dy, 1, BH);
      if (hl) g.drawImage(hl, i, 0, 1, BH, x + i, y + dy, 1, BH);
    }
  }
  SOT.bottle = { W: BW, H: BH, sprite: bottleSprite, draw: drawBottle, tints: TINTS };

  /* ---------- sky kit: gradient, stars, sun, clouds, shooting star ---------- */
  var SKY_DUSK = ['#030a1c', '#061230', '#0a1a40', '#0e2250', '#122a5c', '#173468', '#1c3e74', '#224880', '#2a528a', '#335c94'];
  var SKY_DAY = ['#2f80d8', '#4a96e0', '#66aae8', '#82bcee', '#9ccaf2', '#b4d8f5', '#cbe5f8', '#ddeffb', '#eaf6fd', '#f5fbff'];
  var CL = { top: P('#5a7aa8', '#ffffff'), body: P('#33507e', '#f0f7fd'), shade: P('#1c3260', '#c4d8ea') };
  var CLOUD_SHAPES = [[[4, 8], [1, 14], [0, 18], [2, 14]], [[2, 6], [0, 10], [1, 8]], [[5, 7], [2, 13], [0, 20], [1, 17], [4, 10]]];
  function SkyKit(W, HZ, seed) {
    var r = rng(seed || 5), self = this;
    this.W = W; this.HZ = HZ;
    this.dusk = gradCanvas(W, HZ + 1, SKY_DUSK, 0, HZ); this.day = gradCanvas(W, HZ + 1, SKY_DAY, 0, HZ);
    this.stars = []; for (var i = 0; i < Math.round(W * HZ / 70); i++) this.stars.push({ x: (r() * W) | 0, y: (r() * HZ * .78) | 0, ph: r() * 6, big: r() > .86 });
    this.clouds = []; for (i = 0; i < Math.max(3, Math.round(W / 70)); i++) this.clouds.push({ x: r() * W, y: HZ * (.14 + r() * .5) | 0, sh: CLOUD_SHAPES[i % 3], sp: 1.5 + r() * 3.5 });
    this.shoot = { on: false, t: 0, next: 3 + r() * 4, x: 0, y: 0 };
    this.sunX = function () { return W * .7; };
    this.sunY = function () { return Math.round(HZ * .3); };
    this.draw = function (g, T, dt) {
      var d = sky.d; g.drawImage(self.dusk, 0, 0); if (d > .01) { g.globalAlpha = d; g.drawImage(self.day, 0, 0); g.globalAlpha = 1; }
      if (d < .98) { // stars
        for (var i = 0; i < self.stars.length; i++) { var s = self.stars[i], tw = .5 + .5 * Math.sin(T * 1.6 + s.ph), a = (1 - d) * (.25 + .75 * tw) * Math.min(1, (HZ * .9 - s.y) / (HZ * .45));
          if (a < .05) continue; g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; g.fillRect(s.x, s.y, 1, 1); if (s.big && tw > .6) { g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); } }
        // shooting star
        var ss = self.shoot; ss.next -= dt;
        if (!ss.on && ss.next <= 0 && !RM) { ss.on = true; ss.t = 0; ss.x = W * (.35 + Math.random() * .6); ss.y = HZ * (.04 + Math.random() * .25); }
        if (ss.on) { ss.t += dt; var k = ss.t / .9; if (k >= 1) { ss.on = false; ss.next = 5 + Math.random() * 7; } else {
          var hx = ss.x - k * W * .42, hy = ss.y + k * HZ * .5, fade = (1 - d) * Math.sin(k * Math.PI);
          for (var j = 0; j < 14; j++) { g.fillStyle = 'rgba(235,245,255,' + (fade * (1 - j / 14)).toFixed(2) + ')'; g.fillRect(Math.round(hx + j * 1.7), Math.round(hy - j * .85), 1, 1); }
          g.fillStyle = 'rgba(255,255,255,' + fade.toFixed(2) + ')'; g.fillRect(Math.round(hx) - 1, Math.round(hy), 2, 2); } }
      }
      // sun + glow
      var sx = Math.round(self.sunX()), sy = Math.round(self.sunY()), rr = Math.round(5 + 0 * d);
      var gl = [[rr + 26, .08], [rr + 17, .13], [rr + 10, .2], [rr + 4, .32]]; for (i = 0; i < gl.length; i++) disc(g, sx, sy, gl[i][0], pc(P('#9cc0e8', '#ffffff'), gl[i][1] * (1 - d * .45)));
      disc(g, sx, sy, rr, pc(P('#dfe9f5', '#ffffff'))); disc(g, sx, sy, rr - 2, pc(P('#c8d8ec', '#f4fbff'))); if (d < .5) { g.fillStyle = 'rgba(150,170,200,' + (1 - d * 2).toFixed(2) + ')'; g.fillRect(sx - 2, sy - 1, 1, 1); g.fillRect(sx + 1, sy + 1, 2, 1); g.fillRect(sx, sy - 3, 1, 1); }
      // clouds
      for (i = 0; i < self.clouds.length; i++) { var c = self.clouds[i]; c.x += c.sp * dt; if (c.x > W + 24) c.x = -26;
        for (var row = 0; row < c.sh.length; row++) { var rw = c.sh[row]; g.fillStyle = pc(row === 0 ? CL.top : row === c.sh.length - 1 ? CL.shade : CL.body, .93); g.fillRect(Math.round(c.x) + rw[0], c.y + row, rw[1], 1); } }
    };
  }
  SOT.SkyKit = SkyKit;

  /* ---------- fish, bubbles, rays, seabed ---------- */
  var BIGFISH = ['.........dddd...........', '.......dddddddd.....d...', '......dddddddddd...dd...', '..d..ddddddddddddddddd..', '.dd.ddddddddddddddddde..', 'ddd.dmmmmmmmmmmmmmmdddd.', '.dd..lllllllllllllldd...', '..d....lllllllll..d.....', '.........ll..l..........'];
  var MIDFISH = ['.......dddd.....', '.....dddddddd...', '..d.dddddddddd..', '.dddddddddddde..', '.dd.dmmmmmmmdd..', '..d..llllllll...', '......ll..l.....'];
  var ORFISH = ['....aaaa..', '.a.aaaaaa.', 'aaabaaaae.', '.a.bbbbaa.', '....a..a..'];
  var FISHC = { d: '#0b2450', m: '#17407c', l: '#3a6aa4', e: '#cfe8ff', a: '#f0884a', b: '#d6e2ee' };
  function flipCanvas(c) { var o = mkCanvas(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
  var fishSpr = null;
  function fishSprites() { if (fishSpr) return fishSpr; var b = sprCanvas(BIGFISH, FISHC), m = sprCanvas(MIDFISH, FISHC), o = sprCanvas(ORFISH, FISHC); return fishSpr = { big: [b, flipCanvas(b)], mid: [m, flipCanvas(m)], or: [o, flipCanvas(o)] }; }
  function makeFish(W, y0, y1, r) {
    var L = []; function add(k, dep, sp, a) { L.push({ k: k, x: r() * (W + 60) - 30, y: y0 + (y1 - y0) * dep, sp: sp * (r() > .5 ? 1 : -1), ph: r() * 6, a: a }); }
    add('big', .55, 7, .9); add('mid', .22, 5, .7); add('or', .75, 11, 1); add('or', .8, 10, 1); if (W > 250) { add('mid', .9, 6, .6); add('or', .4, 9, 1); }
    return L;
  }
  function drawFish(g, L, W, dt, T) {
    var fs = fishSprites(); for (var i = 0; i < L.length; i++) { var f = L[i]; f.x += f.sp * dt; if (f.sp > 0 && f.x > W + 30) f.x = -30; if (f.sp < 0 && f.x < -30) f.x = W + 30;
      var s = fs[f.k][f.sp > 0 ? 0 : 1]; g.globalAlpha = f.a; g.drawImage(s, Math.round(f.x), Math.round(f.y + Math.sin(T * .8 + f.ph) * 2)); g.globalAlpha = 1; }
  }
  var bubSpr = null;
  function bubbleSprites() { if (bubSpr) return bubSpr; var out = []; [[['.'], ['#']], [['.#.', '#.#', '.#.']], [['.##.', '#..#', '#..#', '.##.']]].forEach(function (_, i) {}); 
    var one = mkCanvas(1, 1); one.getContext('2d').fillStyle = 'rgba(220,245,255,.85)'; one.getContext('2d').fillRect(0, 0, 1, 1);
    out.push(one);
    out.push(sprCanvas(['.a.', 'a.a', '.a.'], { a: 'rgba(214,242,255,.8)' }));
    out.push(sprCanvas(['.aa.', 'a..a', 'a.ba', '.aa.'], { a: 'rgba(214,242,255,.8)', b: '#ffffff' }));
    out.push(sprCanvas(['..aaa..', '.a...a.', 'a.....a', 'a....ba', 'a.....a', '.a...a.', '..aaa..'], { a: 'rgba(214,242,255,.75)', b: '#ffffff' }));
    return bubSpr = out; }
  function makeBubbles(W, y0, y1, n, r) { var L = []; for (var i = 0; i < n; i++) L.push({ x: r() * W, y: y0 + r() * (y1 - y0), k: r() < .6 ? 0 : r() < .6 ? 1 : r() < .75 ? 2 : 3, sp: 5 + r() * 9, ph: r() * 6, x0: 0 }); L.forEach(function (b) { b.x0 = b.x; }); return L; }
  function drawBubbles(g, L, W, top, bottom, dt, T) { var s = bubbleSprites(); for (var i = 0; i < L.length; i++) { var b = L[i]; b.y -= b.sp * dt; if (b.y < top) { b.y = bottom - Math.random() * 6; b.x0 = Math.random() * W; } b.x = b.x0 + Math.sin(T * 1.3 + b.ph) * 2; g.drawImage(s[b.k], Math.round(b.x), Math.round(b.y)); } }
  function drawRays(g, W, top, bottom, T, n, col, boost) {
    var r = rng(11), h = bottom - top;
    for (var i = 0; i < n; i++) {
      var x0 = -W * .15 + (i + .5) * (W * 1.3 / n) + (r() - .5) * 10, w0 = 3 + r() * 5, slope = .55 + r() * .25, ph = r() * 6, sway = Math.sin(T * .25 + ph) * 4;
      for (var y = 0; y < h; y += 2) {
        var k = y / h, a = (boost || .15) * Math.pow(1 - k, 1.25) * (.7 + .3 * Math.sin(T * .6 + ph + k * 3)), x = x0 + sway * (1 - k * .5) + y * slope * .6, w = w0 + y * .06;
        g.fillStyle = 'rgba(' + col + ',' + (a * .55).toFixed(3) + ')'; g.fillRect(Math.round(x - 2), top + y, Math.round(w + 4), 2);
        g.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; g.fillRect(Math.round(x), top + y, Math.round(w), 2);
      }
    }
  }
  // ---- seabed: static layers (hazy mounds, rocks, corals) + animated kelp ----
  function tree(g, r, x, y, len, ang, depth, spread, shrink, col, hi) {
    if (depth < 0 || len < 1.5) return; var x1 = x + Math.cos(ang) * len, y1 = y - Math.sin(ang) * len;
    g.fillStyle = col; line(g, x, y, x1, y1, depth > 1 ? 2 : 1); if (hi && depth < 2) { g.fillStyle = hi; g.fillRect(Math.round(x1), Math.round(y1) - 1, 1, 1); }
    tree(g, r, x1, y1, len * shrink, ang + spread * (.5 + r() * .7), depth - 1, spread, shrink, col, hi);
    tree(g, r, x1, y1, len * shrink, ang - spread * (.5 + r() * .7), depth - 1, spread, shrink, col, hi);
    if (depth > 1 && r() > .5) tree(g, r, x1, y1, len * shrink * .8, ang + (r() - .5) * .5, depth - 1, spread, shrink, col, hi);
  }
  function mound(g, cx, cy, rad, base, rim) { disc(g, cx, cy, rad, base); g.fillStyle = rim; for (var x = -rad; x <= rad; x++) { var yy = Math.floor(Math.sqrt(Math.max(0, rad * rad - x * x))); g.fillRect(cx + x, cy - yy, 1, 1); if (x % 3 === 0) g.fillRect(cx + x, cy - yy + 1, 1, 1); } }
  function buildSeabed(W, H, top, seed, dense) {
    var c = mkCanvas(W, H), g = c.getContext('2d'), r = rng(seed), n, i, x;
    // hazy far mounds (reference: soft teal-green bushes)
    n = Math.round(W / 14 * (dense || 1)); for (i = 0; i < n; i++) mound(g, Math.round(r() * W), top + 8 + Math.round(r() * 7), 8 + Math.round(r() * 10), 'rgba(48,120,138,.7)', 'rgba(110,180,172,.8)');
    n = Math.round(W / 16 * (dense || 1)); for (i = 0; i < n; i++) mound(g, Math.round(r() * W), top + 14 + Math.round(r() * 8), 7 + Math.round(r() * 9), '#2f6f86', '#6aa9a6');
    // dark branching coral (left), orange coral, green fronds (right)
    var darkN = Math.max(1, Math.round(W / 150)); for (i = 0; i < darkN; i++) tree(g, r, W * (.04 + .12 * i) + 6, H - 12, 15, Math.PI / 2 + (r() - .5) * .3, 4, .55, .76, '#09243a', '#1a4a60');
    var rock = ['#143a7e', '#0e2c66'], rimc = '#3a74b8';
    n = Math.round(W / 24); for (i = 0; i < n; i++) mound(g, Math.round(r() * W), H - 4 + Math.round(r() * 3), 9 + Math.round(r() * 12), rock[i & 1], rimc);
    var orn = Math.max(3, Math.round(W / 55)); for (i = 0; i < orn; i++) tree(g, r, Math.round(W * (i + .3 + r() * .4) / orn), H - 5 - Math.round(r() * 5), 6 + r() * 5, Math.PI / 2 + (r() - .5) * .5, 3, .65, .78, i & 1 ? '#e8553a' : '#f0764a', '#ffb070');
    var grn = Math.max(2, Math.round(W / 90)); for (i = 0; i < grn; i++) tree(g, r, Math.round(W * (.55 + .4 * (i + r() * .6) / grn)), H - 8 - Math.round(r() * 4), 9 + r() * 4, Math.PI / 2 + (r() - .5) * .6, 3, .5, .8, '#5fa84a', '#a6dc6a');
    g.fillStyle = '#0a1d4a'; g.fillRect(0, H - 3, W, 3);   // sediment floor
    for (x = 0; x < W; x++) { if (hash(x, 1, 3) > .6) { g.fillStyle = '#16346e'; g.fillRect(x, H - 3, 1, 1); } }
    return c;
  }
  function makeKelp(W, H, n, seed) { var r = rng(seed), L = []; for (var i = 0; i < n; i++) L.push({ x: Math.round(W * (i + .2 + r() * .6) / n), h: 14 + Math.round(r() * 22), ph: r() * 6, c: r() > .4 ? 0 : 1 }); return L; }
  function drawKelp(g, L, H, T) { for (var i = 0; i < L.length; i++) { var k = L[i]; for (var j = 0; j < k.h; j += 2) { var f = j / k.h, x = k.x + Math.round(Math.sin(T * 1.1 + k.ph + j * .18) * (1 + f * 3)); g.fillStyle = k.c ? (j % 6 ? '#3b8a46' : '#5fb35a') : (j % 6 ? '#2a6a48' : '#4c9a58'); g.fillRect(x, H - 4 - j, 2, 2); if (j % 6 === 2) g.fillRect(x + (j % 12 === 2 ? 2 : -1), H - 5 - j, 2, 1); } } }

  /* ---------- scene base: fixed-step ticker, sizing ---------- */
  var scenes = [], last = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    var dt = Math.min(.1, (t - last) / 1000); last = t;
    if (sky.d !== sky.target) { var s = dt * 1.4; sky.d = Math.abs(sky.target - sky.d) < s ? sky.target : sky.d + Math.sign(sky.target - sky.d) * s; }
    if (document.hidden) return;
    for (var i = 0; i < scenes.length; i++) { var sc = scenes[i]; if (!sc.vis) continue; sc.acc += dt; var step = 1 / sc.fps; if (sc.acc < step && sky.d === sky.target && !sc.dirty) continue; var d = RM ? 0 : sc.acc; sc.acc = 0; sc.dirty = false; sc.T += d; sc.render(d, sc.T); }
  }
  function register(sc, el) {
    sc.vis = true; sc.acc = 0; sc.T = sc.T || 0; scenes.push(sc);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { sc.vis = es[0].isIntersecting; if (sc.vis) sc.dirty = true; }, { rootMargin: '120px' }).observe(el);
    var ro = new ResizeObserver(function () { clearTimeout(sc._rt); sc._rt = setTimeout(function () { sc.layout(); sc.dirty = true; }, 60); }); ro.observe(el);
    sc.layout(); sc.render(0, 0);
    if (scenes.length === 1) requestAnimationFrame(function (t) { last = t; tick(t); });
    return sc;
  }
  SOT.register = register;
  function pxScale(w, kind) { if (kind === 'hero') return w >= 1000 ? 5 : w >= 600 ? 4 : 3; return w >= 1000 ? 4 : w >= 600 ? 3 : 2; }
  SOT.pxScale = pxScale;

  /* ---------- HERO: daylight looking out over the sea (perspective waves) ---------- */
  SOT.createHero = function (cv) {
    var host = cv.parentNode, g, W, H, HZ, S, kit, seaDusk, seaDay, glow = [];
    var sc = {
      fps: 30, T: 0,
      layout: function () {
        var cw = host.clientWidth || 800, ch = host.clientHeight || 600; S = pxScale(cw, 'hero'); W = Math.ceil(cw / S); H = Math.ceil(ch / S); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        HZ = Math.round(H * .52); kit = new SkyKit(W, HZ, 3);
        seaDusk = gradCanvas(W, H - HZ, ['#0e3a58', '#0a2c4c', '#082240', '#061a34', '#04122a', '#030c1e'], 0, H - HZ); seaDay = gradCanvas(W, H - HZ, ['#5ad0e0', '#2fb0d0', '#1f8cc0', '#1668a8', '#0f4a88', '#0a3568'], 0, H - HZ);
      },
      render: function (dt, T) {
        kit.draw(g, T, dt);
        g.drawImage(seaDusk, 0, HZ); if (sky.d > .01) { g.globalAlpha = sky.d; g.drawImage(seaDay, 0, HZ); g.globalAlpha = 1; }
        var sunX = kit.sunX(), K = 16, sh = H - HZ, i, x;
        // sun path glitter
        for (i = 0; i < 90; i++) { var z = hash(i, 7, 1), y = HZ + 1 + Math.pow(z, 1.5) * sh, wd = 6 + z * W * .22, px = Math.round(sunX + (hash(i, 9, 2) - .5) * wd); if (hash(i, Math.floor(T * 3), 5) > .55) { g.fillStyle = pc(P('#9cc4e4', '#ffffff'), .85); g.fillRect(px, Math.round(y), 1 + (z > .6 ? 1 : 0), 1); } }
        // perspective wave rows (parallax: far slow & thin, near big & fast)
        for (i = 0; i < K; i++) {
          var zz = ((i + T * .22) % K) / K, yy = Math.round(HZ + 2 + Math.pow(zz, 2.1) * (sh - 3)), thick = zz > .55 ? 2 : 1, seg = Math.round(3 + zz * 22), gap = Math.round(2 + zz * 10), off = Math.round(Math.sin(i * 2.3 + T * .5 * (.3 + zz)) * seg + T * (4 + zz * 18)) % (seg + gap);
          var near = P('#2a5a8c', '#e8fbff'), far = P('#3a6a98', '#9fe6f0'), col = mix3(mix3(far.a, near.a, zz), mix3(far.b, near.b, zz), sky.d);
          for (x = -off; x < W; x += seg + gap) { var lit = Math.abs(x + seg / 2 - sunX) < 6 + zz * W * .16; g.fillStyle = lit ? pc(P('#9cc4e4', '#ffffff'), .95) : css(col, .55 + zz * .3); g.fillRect(x, yy, seg, thick); if (zz > .6 && hash(x, i, Math.floor(T * 2)) > .6) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x + 1, yy - 1, Math.max(2, seg >> 1), 1); } }
        }
        // the big bobbing bottle (decorative)
        var bx = Math.round(W * (W < 200 ? .62 : .7) - 14), by = Math.round(HZ + sh * .5 + Math.sin(T * 1.1) * 1.5), slope = Math.sin(T * .9) * .14 - .08;
        disc(g, bx + 14, by + 6, 17, 'rgba(255,255,255,.1)'); disc(g, bx + 14, by + 6, 11, 'rgba(255,255,255,.14)');
        drawBottle(g, 0, bx, by - 3, slope, false);
        for (x = 0; x < 28; x++) { if (hash(x, 3, Math.floor(T * 3)) > .5) { g.fillStyle = 'rgba(220,245,255,.8)'; g.fillRect(bx + x, by + 10 + (x & 1), 1, 1); } }
        g.fillStyle = 'rgba(255,255,255,.7)'; for (x = -3; x < 32; x += 3) if (hash(x, 11, Math.floor(T * 2)) > .4) g.fillRect(bx + x, by + 8, 2, 1);
        // dark fade into the dive
        for (i = 0; i < 18; i++) { g.fillStyle = 'rgba(8,24,64,' + (i / 18 * .7).toFixed(3) + ')'; g.fillRect(0, H - 18 + i, W, 1); }
      }
    };
    return register(sc, host);
  };

  /* ---------- SEA: cross-section — daylight sky, parallax waves, bottles, underwater, seabed ---------- */
  SOT.createSea = function (cv, overlay, opts) {
    var host = cv.parentNode, g, W, H, S, HZ, SY, BT, kit, wg, wgDusk, wgDay, seabed, fish, bubbles, kelp, items = [], splashes = [], ripples = [], cssW = 800, onPick = opts && opts.onPick, hoverId = null;
    function surfY(x, T) { return SY + Math.round(1.7 * Math.sin(x * .07 + T * .9) + .9 * Math.sin(x * .13 - T * 1.3)); }
    function drawWaterCols(x0, x1, yOff, rows, T, useTop) {
      for (var x = x0; x < x1; x++) { var yt = useTop ? surfY(x, T) : surfY(x, T) + yOff; if (yt - (SY - 4) < 0) yt = SY - 4; var h = useTop ? H - yt : rows; if (h <= 0) continue;
        g.drawImage(wgDusk, x, yt - (SY - 4), 1, h, x, yt, 1, h); if (sky.d > .01) { g.globalAlpha = sky.d; g.drawImage(wgDay, x, yt - (SY - 4), 1, h, x, yt, 1, h); g.globalAlpha = 1; } }
    }
    var sc = {
      fps: 30, T: 0, items: items,
      layout: function () {
        var cw = host.clientWidth || 800, ch = host.clientHeight || 700; cssW = cw; S = pxScale(cw, 'sea'); W = Math.ceil(cw / S); H = Math.ceil(ch / S); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        HZ = Math.round((cw >= 700 ? 285 : 245) / S); SY = HZ + 9; BT = H - Math.round(150 / S); kit = new SkyKit(W, HZ, 9);
        var wh = H - (SY - 4), stopsD = ['#0e4a68', '#0a3a5a', '#082c4c', '#061f3a', '#041530', '#030e24'], stopsY = ['#58d6e0', '#34b4d6', '#2090c4', '#1670a8', '#105488', '#0a3c6c'];
        wgDusk = gradCanvas(W, wh, stopsD, 0, wh * .95); wgDay = gradCanvas(W, wh, stopsY, 0, wh * .95);
        seabed = buildSeabed(W, H, BT - 6, 21, S === 2 ? .8 : 1); kelp = makeKelp(W, H, Math.max(5, Math.round(W / 38)), 4);
        var r = rng(17); fish = makeFish(W, SY + 26, BT - 14, r); bubbles = makeBubbles(W, SY, H, Math.max(14, Math.round(W / 9)), r);
        sc.place();
      },
      /* items: {id, deep, tint, x,tx,y,vy, ph, el, dropping} */
      place: function () {
        var surf = items.filter(function (b) { return !b.deep; }), deep = items.filter(function (b) { return b.deep; }), m = Math.round(78 / S) + 6;
        function slots(list, shift) { var n = list.length, span = W - m * 2; list.forEach(function (b, i) { b.tx = Math.round(m + (i + .5 + shift * ((i % 2) ? .5 : -.5) * .25) * span / n - 14); }); }
        surf.sort(function (a, b) { return hash(a.n, 1, 1) - hash(b.n, 1, 1); }); deep.sort(function (a, b) { return hash(a.n, 2, 2) - hash(b.n, 2, 2); });
        slots(surf, 0); slots(deep, 1);
        var dTop = SY + Math.round(150 / S), dBot = BT - 22; deep.forEach(function (b, i) { b.dy = Math.round(dTop + ((i * 0.61803) % 1) * Math.max(8, dBot - dTop)); });
        items.forEach(function (b) { if (b.x == null) { b.x = b.tx; } });
      },
      setItems: function (list, newId) {          // list: [{id,n,ts,deep,tint,el}]
        var old = {}; items.forEach(function (b) { old[b.id] = b; });
        items.length = 0; list.forEach(function (it) { var o = old[it.id]; if (o) { o.deep = it.deep; o.el = it.el; o.n = it.n; items.push(o); } else { it.ph = Math.random() * 6; it.x = null; it.y = null; it.vy = 0; it.dropping = it.id === newId; it.fresh = true; items.push(it); } });
        sc.place(); items.forEach(function (b) { if (b.dropping && b.y == null) { b.x = b.tx; b.y = -14; b.vy = 0; } });
        sc.dirty = true;
      },
      hover: function (id) { hoverId = id; },
      splash: function (x, y, big) { var n = big ? 22 : 12; for (var i = 0; i < n; i++) splashes.push({ x: x, y: y, vx: (Math.random() - .5) * (big ? 46 : 30), vy: -(18 + Math.random() * (big ? 46 : 28)), l: .7 + Math.random() * .4, w: Math.random() > .35 }); ripples.push({ x: x, y: y, r: 1, a: 1 }); },
      render: function (dt, T) {
        var i, x, b;
        kit.draw(g, T, dt);
        // distant sea bands (parallax: slow far, faster near)
        [[HZ, 2.0, .35, P('#1a4a78', '#5ab8e0'), 0], [HZ + 4, 1.6, .55, P('#143c68', '#3aa6d8'), 2]].forEach(function (L, li) {
          var yb = L[0]; for (x = 0; x < W; x++) { var yy = yb + Math.round(Math.sin(x * (.05 + li * .03) + T * L[2] * (li ? -1.2 : 1) + li) * L[1]); g.fillStyle = pc(L[3]); g.fillRect(x, yy, 1, SY - yy + 2);
            if (hash(x + li * 7, yy, Math.floor(T * 1.5)) > .93) { g.fillStyle = pc(P('#9cc4e4', '#ffffff'), .8); g.fillRect(x, yy, 1, 1); } } });
        // sunlit glints on far sea
        var sx = kit.sunX(); for (i = 0; i < 26; i++) { var gx = Math.round(sx + (hash(i, 5, 1) - .5) * 40), gy = HZ + 1 + ((hash(i, 6, 1) * 8) | 0); if (hash(i, Math.floor(T * 3), 9) > .5) { g.fillStyle = pc(P('#9cc4e4', '#ffffff'), .9); g.fillRect(gx, gy, 1 + (i & 1), 1); } }
        // main water body + surface
        drawWaterCols(0, W, 0, 0, T, true);
        for (x = 0; x < W; x++) { var ys = surfY(x, T); g.fillStyle = pc(P('#7ac0d8', '#e4fbff'), .95); g.fillRect(x, ys, 1, 1);
          var cr = ys < surfY(x - 1, T) + 1 && ys <= surfY(x + 1, T) && ys < SY - 1; if (cr || (hash(x, Math.floor(T * 1.2), 4) > .96)) { g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(x - 1, ys - 1, 3, 1); g.fillRect(x, ys, 1, 1); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, ys + 1, 2, 1); }
          if (Math.abs(x - sx) < 34 && hash(x, Math.floor(T * 4), 8) > .6) { g.fillStyle = pc(P('#bcd8f0', '#ffffff'), .9 - sky.d * .4); g.fillRect(x, ys + 1, 1, 1); } }
        // god-rays + deep layers
        drawRays(g, W, SY + 1, BT, T, Math.max(5, Math.round(W / 40)), sky.d > .5 ? '230,250,255' : '140,190,230', .16);
        // submerged bottles
        for (i = 0; i < items.length; i++) { b = items[i]; if (!b.deep) continue; sc.step(b, dt, T);
          var by = Math.round(b.dy + Math.sin(T * .7 + b.ph) * 2.5), bxx = Math.round(b.x + Math.sin(T * .35 + b.ph) * 5); b.cx = bxx + 14; b.cy = by + 5; b.top = by; b.left = bxx; drawBottle(g, b.tint, bxx, by, Math.sin(T * .5 + b.ph) * .12, true); if (hoverId === b.id) sc.outline(bxx, by); }
        drawFish(g, fish, W, dt, T);
        drawBubbles(g, bubbles, W, SY + 2, H - 6, dt, T);
        // surface bottles (partly submerged: water lip drawn over the bottom rows)
        for (i = 0; i < items.length; i++) { b = items[i]; if (b.deep) continue; sc.step(b, dt, T);
          var cx = Math.round(b.x + 14), sY = surfY(cx, T), slope = (surfY(cx + 7, T) - surfY(cx - 7, T)) / 14, bob = Math.sin(T * 1.3 + b.ph) * .8; var yy2 = b.dropping ? Math.round(b.y) : Math.round(sY - 7 + bob);
          b.cx = cx; b.cy = yy2 + 5; b.top = yy2; b.left = Math.round(b.x);
          if (!b.dropping) { disc(g, cx, yy2 + 6, 15, 'rgba(255,255,255,' + (.07 * (1 - sky.d * .4)).toFixed(3) + ')'); }
          drawBottle(g, b.tint, Math.round(b.x), yy2, slope * .9 + Math.sin(T * .8 + b.ph) * .05, false);
          if (hoverId === b.id) sc.outline(Math.round(b.x), yy2);
          if (!b.dropping) { drawWaterCols(Math.round(b.x), Math.round(b.x) + 28, 3, 8, T, false); for (x = 0; x < 28; x++) { var wy = surfY(Math.round(b.x) + x, T) + 3; g.fillStyle = 'rgba(255,255,255,.55)'; if (hash(x, b.n, Math.floor(T * 2)) > .5) g.fillRect(Math.round(b.x) + x, wy, 1, 1); if (hash(x, b.n, Math.floor(T * 3) + 3) > .55) { g.fillStyle = pc(P('#9ad0f0', '#ffffff'), .8); g.fillRect(Math.round(b.x) + x, wy + 2 + (x & 1), 1, 1); } } }
        }
        // ripples + splashes
        for (i = ripples.length - 1; i >= 0; i--) { var rp = ripples[i]; rp.r += dt * 26; rp.a -= dt * 1.1; if (rp.a <= 0) { ripples.splice(i, 1); continue; } g.fillStyle = 'rgba(255,255,255,' + (rp.a * .7).toFixed(2) + ')'; g.fillRect(Math.round(rp.x - rp.r), surfY(Math.round(rp.x), T) + 1, 2, 1); g.fillRect(Math.round(rp.x + rp.r), surfY(Math.round(rp.x), T) + 1, 2, 1); g.fillRect(Math.round(rp.x - rp.r * .6), surfY(Math.round(rp.x), T) + 2, Math.round(rp.r * 1.2), 1); }
        for (i = splashes.length - 1; i >= 0; i--) { var s = splashes[i]; s.l -= dt; if (s.l <= 0) { splashes.splice(i, 1); continue; } s.vy += 120 * dt; s.x += s.vx * dt; s.y += s.vy * dt; g.fillStyle = s.w ? '#ffffff' : '#bfeaff'; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); if (s.l > .5) g.fillRect(Math.round(s.x), Math.round(s.y) + 1, 1, 1); }
        // seabed + kelp
        g.drawImage(seabed, 0, 0); drawKelp(g, kelp, H, T);
        // underwater vignette
        for (i = 0; i < 10; i++) { g.fillStyle = 'rgba(4,14,40,' + (i / 10 * .5).toFixed(2) + ')'; g.fillRect(0, H - 10 + i, W, 1); }
        // overlay positions
        sc.syncOverlay();
      },
      outline: function (x, y) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 1, y + 1, 30, 1); g.fillRect(x - 1, y + 11, 30, 1); },
      step: function (b, dt, T) {
        if (b.x == null) b.x = b.tx; b.x += (b.tx - b.x) * Math.min(1, dt * 2.5);
        if (b.dropping) { if (b.y == null) b.y = -14; b.vy += 150 * dt; b.y += b.vy * dt; var sY = surfY(Math.round(b.x + 14), T) - 7; if (b.y >= sY) { b.dropping = false; b.y = sY; sc.splash(b.x + 14, sY + 7, true); } }
      },
      syncOverlay: function () {
        if (!overlay) return; for (var i = 0; i < items.length; i++) { var b = items[i]; if (!b.el || b.top == null) continue; b.el.style.transform = 'translate(' + (Math.round((b.left - 4) * S)) + 'px,' + (Math.round((b.top - 4) * S)) + 'px)'; }
      },
      get S() { return S; }, get W() { return W; }, get H() { return H; }
    };
    return register(sc, host);
  };

  /* ---------- DEEP: fixed full-page underwater backdrop (rays, bubbles, fish) ---------- */
  SOT.createDeep = function (cv) {
    var g, W, H, S, wg, wd, fish, bub;
    var sc = {
      fps: 20, T: 0,
      layout: function () { var cw = window.innerWidth, ch = window.innerHeight; S = cw >= 1000 ? 5 : cw >= 600 ? 4 : 3; W = Math.ceil(cw / S); H = Math.ceil(ch / S); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        wd = gradCanvas(W, H, ['#0a2a4a', '#082240', '#061a34', '#04122a', '#030c1e'], 0, H); wg = gradCanvas(W, H, ['#1e8ab8', '#1670a4', '#105a8c', '#0b4474', '#07305a'], 0, H);
        var r = rng(31); fish = makeFish(W, H * .2, H * .8, r).slice(0, 4); bub = makeBubbles(W, 0, H, Math.round(W / 8), r); },
      render: function (dt, T) {
        g.drawImage(wd, 0, 0); if (sky.d > .01) { g.globalAlpha = sky.d * .9; g.drawImage(wg, 0, 0); g.globalAlpha = 1; }
        drawRays(g, W, 0, H, T, Math.max(5, Math.round(W / 36)), sky.d > .5 ? '220,250,255' : '130,180,220', .1);
        g.globalAlpha = .45; drawFish(g, fish, W, dt, T); g.globalAlpha = 1; drawBubbles(g, bub, W, -4, H + 4, dt, T);
      }
    };
    return register(sc, cv);
  };

  /* ---------- FOOT: seabed strip for the footer ---------- */
  SOT.createFoot = function (cv) {
    var host = cv.parentNode, g, W, H, S, seabed, kelp, bub;
    var sc = {
      fps: 24, T: 0,
      layout: function () { var cw = host.clientWidth || 800, ch = host.clientHeight || 180; S = pxScale(cw, 'sea'); W = Math.ceil(cw / S); H = Math.ceil(ch / S); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false; seabed = buildSeabed(W, H, 6, 44, .9); kelp = makeKelp(W, H, Math.max(5, Math.round(W / 30)), 8); bub = makeBubbles(W, 0, H, Math.round(W / 14), rng(5)); },
      render: function (dt, T) { g.clearRect(0, 0, W, H); drawBubbles(g, bub, W, 0, H, dt, T); g.drawImage(seabed, 0, 0); drawKelp(g, kelp, H, T); }
    };
    return register(sc, host);
  };

  SOT.makeFish = makeFish; SOT.drawFish = drawFish;
})();
(function(){ /* expose register for the workshop */ })();
