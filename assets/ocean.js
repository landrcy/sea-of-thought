/* Sea of Thought — the ocean: one full-viewport pixel scene. Page scroll = a smooth dive: surface → sunlit shallows → midwater → deep → abyss/seabed. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, P = px.P, pc = px.pc, rng = px.rng, hash = px.hash, mk = px.mkCanvas, disc = px.disc, line = px.line, gradCanvas = px.gradCanvas, RM = px.RM, sky = SOT.sky;
  var WDAY = ['#ADE8F4', '#90E0EF', '#90E0EF', '#48CAE4', '#00B4D8', '#0096C7', '#0077B6', '#023E8A', '#023E8A', '#03045E', '#03045E', '#020348'];
  function dim(h, t) { var c = px.parse(h), d = [1, 2, 58]; return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(c[i] + (d[i] - c[i]) * t).toString(16)).slice(-2); }).join(''); }
  var WNIGHT = WDAY.map(function (c) { return dim(c, .55); });
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var BUB = null;
  function bubSprites() { if (BUB) return BUB; var a = 'rgba(214,242,255,.85)'; return BUB = [px.sprCanvas(['#'], { '#': a }), px.sprCanvas(['.a.', 'a.a', '.a.'], { a: a }), px.sprCanvas(['.aa.', 'a..a', 'a.ba', '.aa.'], { a: a, b: '#fff' }), px.sprCanvas(['..aaa..', '.a...a.', 'a.....a', 'a....ba', 'a.....a', '.a...a.', '..aaa..'], { a: 'rgba(214,242,255,.75)', b: '#fff' })]; }
  function tree(g, r, x, y, len, ang, depth, spread, shrink, col, hi) {
    if (depth < 0 || len < 1.5) return; var x1 = x + Math.cos(ang) * len, y1 = y - Math.sin(ang) * len;
    g.fillStyle = col; line(g, x, y, x1, y1, depth > 1 ? 2 : 1); if (hi && depth < 2) { g.fillStyle = hi; g.fillRect(Math.round(x1), Math.round(y1) - 1, 1, 1); }
    tree(g, r, x1, y1, len * shrink, ang + spread * (.5 + r() * .7), depth - 1, spread, shrink, col, hi); tree(g, r, x1, y1, len * shrink, ang - spread * (.5 + r() * .7), depth - 1, spread, shrink, col, hi);
    if (depth > 1 && r() > .5) tree(g, r, x1, y1, len * shrink * .8, ang + (r() - .5) * .5, depth - 1, spread, shrink, col, hi);
  }
  function mound(g, cx, cy, rad, base, rim) { disc(g, cx, cy, rad, base); g.fillStyle = rim; for (var x = -rad; x <= rad; x++) { var yy = Math.floor(Math.sqrt(Math.max(0, rad * rad - x * x))); g.fillRect(cx + x, cy - yy, 1, 1); if (x % 3 === 0) g.fillRect(cx + x, cy - yy + 1, 1, 1); } }
  function brain(g, cx, cy, rad, c1, c2) { for (var y = -rad; y <= 0; y++) for (var x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) { g.fillStyle = ((x + y * 2 + 100) % 4 < 1) ? c2 : c1; g.fillRect(cx + x, cy + y, 1, 1); } }
  function fan(g, cx, cy, h, col, hi) { for (var i = 0; i < h; i++) { var w = Math.round(i * .8) + 1; for (var x = -w; x <= w; x += 2) { g.fillStyle = (x + i) % 4 === 0 ? hi : col; g.fillRect(cx + x, cy - i, 1, 1); } } g.fillStyle = col; g.fillRect(cx, cy, 1, 3); }

  SOT.createOcean = function (cv, overlay, spacer) {
    var g, W, H, S, HZ, SY, BT, worldH, SBH, camMax, cam = 0, camT = 0, kit, wg, items = [], hoverId = null, picking = false, cssW = 800, cssH = 600, DD = 1, T = 0;
    var far, mid, near, kelpB, kelpF, vign, caus, causG, causData, shoals = [], singles = [], snow = [], bubs = [], parts = [], ripples = [], plumes = [];
    function surfY(x, t) { return SY + Math.round(1.7 * Math.sin(x * .07 + t * .9) + .9 * Math.sin(x * .13 - t * 1.3) + .5 * Math.sin(x * .31 + t * 2.1)); }
    function camFor(f, anchorBottom) { return anchorBottom ? cam * f + camMax * (1 - f) : cam * f; }

    /* ---------- build static art ---------- */
    function buildSeabed() {
      var r = rng(21), n, i, x, Hh;
      // far: hazy navy ridges, parallax .55
      Hh = SBH + 44; far = mk(W, Hh); var gf = far.getContext('2d'), x0;
      for (var layer = 0; layer < 2; layer++) for (x0 = 0; x0 < W; x0++) { var hh = Math.round(30 + layer * 12 + 11 * Math.sin(x0 * (.021 + layer * .013) + layer * 2) + 7 * Math.sin(x0 * .06 + layer * 5) + 3 * Math.sin(x0 * .17)); gf.fillStyle = layer ? 'rgba(6,46,118,.9)' : 'rgba(10,70,150,.72)'; gf.fillRect(x0, Hh - hh, 1, hh); gf.fillStyle = layer ? 'rgba(46,110,190,.7)' : 'rgba(72,150,210,.5)'; gf.fillRect(x0, Hh - hh, 1, 1); if (x0 % 3 === layer) gf.fillRect(x0, Hh - hh + 1, 1, 1); }
      SOT.seabed.farCoral(gf, W, Hh, r);
      // mid: floor, rocks, reef, wreck, chest
      Hh = SBH; mid = mk(W, Hh); var gm = mid.getContext('2d');
      n = Math.round(W / 14); for (i = 0; i < n; i++) mound(gm, Math.round(r() * W), Hh - 14 + Math.round(r() * 6), 7 + Math.round(r() * 10), '#144a98', '#3a7ac4');
      for (x = 0; x < W; x++) { var dy = Math.round(5 + 2.5 * Math.sin(x * .05) + 1.5 * Math.sin(x * .13 + 2)); gm.fillStyle = '#1a58a8'; gm.fillRect(x, Hh - dy, 1, dy); gm.fillStyle = '#4a8ad4'; gm.fillRect(x, Hh - dy, 1, 1); if (hash(x, 5, 7) > .8) { gm.fillStyle = '#7ab4e8'; gm.fillRect(x, Hh - dy + 1 + (x & 1), 1, 1); } if (hash(x, 9, 2) > .93) { gm.fillStyle = '#071e60'; gm.fillRect(x, Hh - 3, 2, 1); } }
      var rk = ['#143a7e', '#0e2c66', '#1b4a92']; n = Math.round(W / 26); for (i = 0; i < n; i++) mound(gm, Math.round(r() * W), Hh - 5 + Math.round(r() * 3), 8 + Math.round(r() * 11), rk[i % 3], '#3a74b8');
      // coral reef, ruins, wreck, chest (see seabed.js)
      var sb = SOT.seabed.paint(gm, W, Hh, r, S);
      // anemones / sea stars
      var L = SOT.life.get(); for (i = 0; i < Math.max(2, Math.round(W / 90)); i++) gm.drawImage(L.stars[i & 1], Math.round(r() * (W - 10)), Hh - 9 - Math.round(r() * 2));
      gm.globalCompositeOperation = 'source-atop'; gm.fillStyle = 'rgba(3,4,94,.1)'; gm.fillRect(0, 0, W, Hh); gm.globalCompositeOperation = 'source-over';
      mid._wx = sb.wx; mid._chest = sb.chest; mid._glows = sb.glows; mid._vents = sb.vents; mid._avoid = sb.avoid;
      // near: dark foreground silhouettes, parallax 1.25
      near = mk(W, SBH * .6 | 0); var gn = near.getContext('2d'), nh = near.height; n = Math.round(W / 30); for (i = 0; i < n; i++) mound(gn, Math.round(r() * W), nh + 3, 5 + Math.round(r() * 7), '#030a50', '#0e3a8c');
      SOT.seabed.nearCoral(gn, W, nh, r);
    }
    function buildKelp() { var r = rng(4), mkK = function (n, hmin, hmax) { var a = []; for (var i = 0; i < n; i++) a.push({ x: Math.round(W * (i + .1 + r() * .8) / n), h: hmin + Math.round(r() * (hmax - hmin)), ph: r() * 6, c: r() }); return a; }; kelpB = mkK(Math.round(W / 22), 40, 100); kelpF = mkK(Math.round(W / 60), 24, 60).filter(function (k) { return !mid._avoid.some(function (a) { return k.x > a[0] - 8 && k.x < a[1] + 8; }); }); }
    function buildLife() {
      var r = rng(31), Dd = BT - SY, fy = function (f) { return SY + f * Dd; }, i, j; shoals = []; singles = []; var Lf = SOT.life.get();
      var shNum = clamp(Math.round(Dd * .16 / (H * .38)) + 3, 3, 9);
      for (i = 0; i < shNum; i++) { var f = .008 + (.15 - .008) * (i + r() * .6) / shNum, kind = Lf.small[i % 4], fs = []; for (j = 0; j < 8 + (r() * 8 | 0); j++) fs.push({ ox: (r() - .5) * 34, oy: (r() - .5) * 18, ph: r() * 6, k: .5 + r() * .5 }); shoals.push({ x: r() * W, y: fy(f) + 20, vx: (6 + r() * 9) * (r() > .5 ? 1 : -1), kind: kind, fs: fs, ph: r() * 6, far: i % 3 === 0 }); }
      var mdN = clamp(Math.round(Dd * .45 / (H * .8)) + 2, 2, 8); for (i = 0; i < mdN; i++) { var fs2 = []; for (j = 0; j < 6 + (r() * 6 | 0); j++) fs2.push({ ox: (r() - .5) * 40, oy: (r() - .5) * 22, ph: r() * 6, k: 1 }); shoals.push({ x: r() * W, y: fy(.2 + .3 * (i + r() * .5) / mdN), vx: (8 + r() * 6) * (r() > .5 ? 1 : -1), kind: i % 2 ? Lf.mid[i % 3] : Lf.deepFish[0], fs: fs2, ph: r() * 6, far: false }); }
      singles.push({ t: 'turtle', x: r() * W, y: fy(.075), vx: 7, ph: 1 }); if (Dd > H * 4) singles.push({ t: 'turtle', x: r() * W, y: fy(.13), vx: -5, ph: 3 });
      var tn = clamp(Math.round(Dd / (H * .7)), 3, 9); for (i = 0; i < tn; i++) singles.push({ t: 'tuna', x: r() * W, y: fy(.17 + .35 * (i + r() * .4) / tn), vx: (10 + r() * 9) * (i & 1 ? -1 : 1), ph: r() * 6, spr: Lf.mid[i % 3] });
      var jn = clamp(Math.round(Dd / (H * .45)), 4, 15); for (i = 0; i < jn; i++) singles.push({ t: 'jelly', x: r() * W, y: fy(.2 + .38 * (i + r() * .6) / jn), vx: (r() - .5) * 3, ph: r() * 6, big: i % 3 === 0, base: 0 });
      var mn = clamp(Math.round(Dd / (H * 2.5)), 1, 3); for (i = 0; i < mn; i++) singles.push({ t: 'manta', x: r() * W, y: fy(.3 + .12 * i + r() * .04), vx: (9 + r() * 4) * (i & 1 ? -1 : 1), ph: r() * 6 });
      singles.push({ t: 'whale', x: W * .3, y: fy(.68), vx: -5, ph: 0 });
      singles.push({ t: 'angler', x: r() * W, y: fy(.78), vx: -6, ph: 1 }); singles.push({ t: 'angler', x: r() * W, y: fy(.88), vx: 5, ph: 4 });
      for (i = 0; i < 5; i++) { var fs3 = []; for (j = 0; j < 9; j++) fs3.push({ ox: (r() - .5) * 40, oy: (r() - .5) * 24, ph: r() * 6, k: 1 }); shoals.push({ x: r() * W, y: fy(.58 + .34 * i / 5), vx: (4 + r() * 4) * (i & 1 ? -1 : 1), kind: Lf.deepFish[1], fs: fs3, ph: r() * 6, far: true, glow: true }); }
      // particles (screen-space layers, parallax)
      snow = []; var ns = Math.round(W * H / 700); for (i = 0; i < ns; i++) snow.push({ x: r() * W, y: r() * H, sp: 1.5 + r() * 4, ph: r() * 6, f: [.45, .8, 1.3][i % 3], z: i % 3 });
      bubs = []; var nb = Math.round(W / 6); for (i = 0; i < nb; i++) bubs.push({ x: r() * W, y: r() * (H + 20), k: r() < .55 ? 0 : r() < .6 ? 1 : r() < .7 ? 2 : 3, sp: 6 + r() * 12, ph: r() * 6, f: [.6, 1, 1.25][i % 3], q: i / nb });
    }
    var bedGlow;
    function buildGrad() {
      bedGlow = mk(4, 150); var bg2 = bedGlow.getContext('2d'), gg = bg2.createLinearGradient(0, 0, 0, 150); gg.addColorStop(0, 'rgba(0,119,182,0)'); gg.addColorStop(.6, 'rgba(0,150,199,.5)'); gg.addColorStop(1, 'rgba(72,202,228,.6)'); bg2.fillStyle = gg; bg2.fillRect(0, 0, 4, 150);
      var stops = sky.target === 1 ? WDAY : WNIGHT; wg = gradCanvas(W, worldH, stops, SY - 4, worldH + SBH * .3);
      var vc = mk(W, H), vg = vc.getContext('2d'), gr = vg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .75); gr.addColorStop(0, 'rgba(1,2,58,0)'); gr.addColorStop(1, 'rgba(1,2,58,.62)'); vg.fillStyle = gr; vg.fillRect(0, 0, W, H); vign = vc;
      var cr = Math.min(Math.round(H * 1.15), BT - SY); caus = mk(Math.ceil(W / 2), Math.ceil(cr / 2)); causG = caus.getContext('2d'); causData = causG.createImageData(caus.width, caus.height); caus._cr = cr;
    }

    /* ---------- layout / arrange ---------- */
    var sc = {
      fps: 120, T: 0, items: items,
      layout: function () {
        cssW = document.documentElement.clientWidth; cssH = window.innerHeight; S = cssW >= 1700 ? 5 : cssW >= 1000 ? 4 : cssW >= 600 ? 3 : 2; W = Math.ceil(cssW / S); H = Math.ceil(cssH / S);
        cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false; HZ = Math.round(cssH * .33 / S); SY = HZ + 9; kit = new SOT.SkyKit(W, HZ, 9); SBH = Math.min(Math.round(H * .8), 210);
        sc.arrange(true);
      },
      arrange: function (rebuild) {
        var n = items.length, k = clamp(Math.floor(cssW / 190), 2, 6), rows = Math.max(1, Math.ceil(n / k)), V = clamp(6 + Math.floor(n / 30), 6, 10), maxRocks = 0; items.forEach(function (b) { if (b.rocks > maxRocks) maxRocks = b.rocks; });
        var rockDrop = Math.max(210, cssH * .28), sbCss = SBH * S, first = 190, minGap = 96, deepRows = Math.max(0, rows - 1), SYc = SY * S;
        var worldCss = V * cssH, usable = worldCss - SYc - sbCss - 110, need = first + Math.max(0, deepRows - 1) * minGap + maxRocks * rockDrop;
        if (need > usable) { worldCss += need - usable; usable = need; }
        var gap = deepRows > 1 ? clamp((usable - first - maxRocks * rockDrop) / (deepRows - 1), minGap, Math.max(420, cssH * .7)) : 300;
        worldH = Math.ceil(worldCss / S); BT = worldH - SBH; camMax = Math.max(0, worldH - H); DD = Math.max(1, BT - SY); spacer.style.height = Math.round(worldH * S) + 'px';
        var m = Math.round(60 / S) + 8, span = W - m * 2;
        items.forEach(function (b, i) {
          var r = Math.floor(i / k), c = i % k, inRow = r === rows - 1 ? n - r * k : k, slot = span / inRow, jx = (hash(b.n, 3, 1) - .5) * slot * .3, jy = (hash(b.n, 4, 2) - .5) * 26;
          b.tx = clamp(Math.round(m + (c + .5) * slot + jx + (b.rocks ? slot * .14 * b.rocks : 0)), m, W - m);
          b.row = r; b.float = r === 0 && !b.rocks; var dc = r === 0 ? 0 : first + (r - 1) * gap + jy; dc += (b.rocks || 0) * rockDrop;
          b.ty = r === 0 && !b.rocks ? SY : SY + Math.min(dc, usable) / S; b.ph = b.ph == null ? hash(b.n, 5, 3) * 6 : b.ph;
          var pk = SOT.bottles.pick(b.n); b.shape = pk.shape; b.tint = pk.tint; b.wax = pk.wax; var sz = SOT.bottles.size(b.shape); b.bw = sz.w; b.bh = sz.h;
          if (b.x == null) { b.x = b.tx; b.y = b.ty; b.ang = 0; b.vxS = 0; b.vyS = 0; }
          if (b.el) { b.el.style.setProperty('--S', S); b.dom = true; }
        });
        if (rebuild) { buildGrad(); buildSeabed(); buildKelp(); buildLife(); } else { buildGrad(); buildLife(); }
      },
      /* list: newest-first [{id,n,ts,rocks,el}] */
      setBottles: function (list, newId) {
        var old = {}; items.forEach(function (b) { old[b.id] = b; }); items.length = 0;
        list.forEach(function (it) { var o = old[it.id]; if (o) { o.el = it.el; o.rocks = it.rocks; items.push(o); } else { it.x = null; it.drop = it.id === newId; items.push(it); } });
        sc.arrange(false);
        items.forEach(function (b) { if (b.drop) { b.x = b.tx; b.y = SY - 70; b.vy = 0; b.ang = -.9; b.spin = 5; b.vyS = 0; } });
      },
      hover: function (id) { hoverId = id; },
      pick: function (on) { picking = !!on; },
      reveal: function (b) { var y = Math.max(0, Math.min(camMax, b.ty - H / 2)) * S; if (Math.abs(y - window.scrollY) > cssH * .3) window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }); },
      splash: function (x, y, big, rocks) { var n = big ? 34 : 14, i; for (i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 4, y: y, vx: (Math.random() - .5) * (big ? 56 : 30), vy: -(24 + Math.random() * (big ? 56 : 28)), l: .8 + Math.random() * .6, k: Math.random() > .3 ? 0 : 1 });
        for (i = 0; i < (big ? 12 : 4); i++) parts.push({ x: x + (Math.random() - .5) * 12, y: y + 3 + Math.random() * 4, vx: (Math.random() - .5) * 8, vy: 10 + Math.random() * 14, l: 1.2 + Math.random(), k: 2, b: Math.floor(Math.random() * 3) });
        ripples.push({ x: x, y: y, r: 1, a: 1 }); if (big) ripples.push({ x: x, y: y, r: -5, a: .8 }); },
      get S() { return S; }, get W() { return W; }, get H() { return H; }, get camMax() { return camMax; },
      render: function (dt, t) {
        T = t; var i, x, b, camI;
        camT = (window.scrollY || 0) / S; if (RM) cam = camT; else { cam += (camT - cam) * (1 - Math.exp(-dt * 7.5)); if (Math.abs(camT - cam) < .04) cam = camT; }
        camI = Math.round(cam); var depthF = clamp((camI + H / 2 - SY) / DD, 0, 1);
        /* --- sky + far sea + water --- */
        g.setTransform(1, 0, 0, 1, 0, -camI);
        if (camI > SY + 8) g.drawImage(wg, 0, camI, W, H, 0, camI, W, H);
        else {
          g.fillStyle = '#03045E'; g.fillRect(0, camI, W, H);
          kit.draw(g, t, dt);
          g.fillStyle = pc(P('#0a3a78', '#90E0EF')); g.fillRect(0, HZ - 3, W, SY - HZ + 6);
          [[HZ, 2.0, .35, P('#0a3a78', '#90E0EF'), 0], [HZ + 4, 1.6, .55, P('#06306a', '#48CAE4'), 2]].forEach(function (Lr, li) {
            for (x = 0; x < W; x++) { var yy = Lr[0] + Math.round(Math.sin(x * (.05 + li * .03) + t * Lr[2] * (li ? -1.2 : 1) + li) * Lr[1]); g.fillStyle = pc(Lr[3]); g.fillRect(x, yy, 1, SY - yy + 2); if (hash(x + li * 7, yy, Math.floor(t * 1.5)) > .93) { g.fillStyle = pc(P('#9cc4e4', '#ffffff'), .8); g.fillRect(x, yy, 1, 1); } } });
          var sx = kit.sunX(); for (i = 0; i < 26; i++) { var gx = Math.round(sx + (hash(i, 5, 1) - .5) * 40), gy = HZ + 1 + ((hash(i, 6, 1) * 8) | 0); if (hash(i, Math.floor(t * 3), 9) > .5) { g.fillStyle = pc(P('#9cc4e4', '#ffffff'), .9); g.fillRect(gx, gy, 1 + (i & 1), 1); } }
          for (x = 0; x < W; x++) { var ys = surfY(x, t), y1 = camI + H; if (y1 > ys) g.drawImage(wg, x, ys, 1, Math.min(y1 - ys, worldH - ys), x, ys, 1, Math.min(y1 - ys, worldH - ys)); }
        }
        /* --- sunlit shafts + caustics --- */
        if (camI < SY + 520) {
          var shaftA = .2 * (sky.d > .5 ? 1 : .6); this._rays(g, camI, t, shaftA);
          this._caustics(g, camI, t);
        }
        /* --- far parallax: dim shoals, ridges --- */
        var Lf = SOT.life.get(), lv, s, f;
        if (camI + H > worldH - 160) g.drawImage(bedGlow, 0, 0, 4, 150, 0, worldH - 150 - 6, W, 156);
        var cf = camFor(.55, true); if (cf + H > BT - 60 - 44) { g.setTransform(1, 0, 0, 1, 0, -Math.round(cf)); g.drawImage(far, 0, worldH - far.height); }
        g.setTransform(1, 0, 0, 1, 0, -camI);
        /* --- back kelp forest (f .8) --- */
        var ck = Math.round(camFor(.8, true)); if (ck + H > worldH - 140) { g.setTransform(1, 0, 0, 1, 0, -ck); this._kelp(g, kelpB, t, 0); g.setTransform(1, 0, 0, 1, 0, -camI); }
        /* --- life --- */
        this._life(g, dt, t, camI, Lf);
        /* --- seabed (mid) --- */
        if (camI + H > worldH - SBH - 8) {
          var by0 = worldH - SBH; g.drawImage(mid, 0, by0); this._seabedFx(g, t, by0);
        }
        /* --- front kelp --- */
        var cf2 = Math.round(camFor(1.12, true)); if (cf2 + H > worldH - 120) { g.setTransform(1, 0, 0, 1, 0, -cf2); this._kelp(g, kelpF, t, 1); }
        g.setTransform(1, 0, 0, 1, 0, -camI);
        /* --- bottles --- */
        this._bottles(g, dt, t, camI);
        /* --- surface effects --- */
        if (camI < SY + 40) this._surface(g, camI, t);
        g.setTransform(1, 0, 0, 1, 0, 0);
        /* --- screen-space particles --- */
        this._particles(g, dt, t, camI);
        /* --- near foreground (f 1.3) + vignette --- */
        var cn = Math.round(camFor(1.3, true)); if (cn + H > worldH - near.height - 4) { g.setTransform(1, 0, 0, 1, 0, -cn); g.drawImage(near, 0, worldH - near.height); g.setTransform(1, 0, 0, 1, 0, 0); }
        g.globalAlpha = .25 + .75 * depthF; g.drawImage(vign, 0, 0); g.globalAlpha = 1;
      },
      _rays: function (g, camI, t, boost) {
        var n = Math.max(5, Math.round(W / 38)), rr = rng(11), top = SY + 1, bottom = Math.min(BT, SY + Math.round(H * 1.5)), h = bottom - top, col = sky.d > .5 ? '230,250,255' : '140,190,230';
        for (var i = 0; i < n; i++) {
          var x0 = -W * .15 + (i + .5) * (W * 1.3 / n) + (rr() - .5) * 10, w0 = 3 + rr() * 6, slope = .5 + rr() * .3, ph = rr() * 6, sway = Math.sin(t * .25 + ph) * 5, y0 = Math.max(0, Math.floor((camI - top) / 3) * 3), y1 = Math.min(h, camI + H - top + 2);
          for (var y = y0; y < y1; y += 3) { var k = y / h, a = boost * Math.pow(1 - k, 1.4) * (.65 + .35 * Math.sin(t * .6 + ph + k * 3)), x = x0 + sway * (1 - k * .5) + y * slope * .6, w = w0 + y * .07;
            g.fillStyle = 'rgba(' + col + ',' + (a * .5).toFixed(3) + ')'; g.fillRect(Math.round(x - 2), top + y, Math.round(w + 4), 3); g.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; g.fillRect(Math.round(x), top + y, Math.round(w), 3); }
        }
      },
      _caustics: function (g, camI, t) {
        var cr = caus._cr; if (cr < 10) return; var y0 = Math.max(SY, camI), y1 = Math.min(SY + cr, camI + H); if (y1 <= y0) return;
        var d = causData.data, cw = caus.width, r0 = Math.floor((y0 - SY) / 2), r1 = Math.ceil((y1 - SY) / 2), i, x, y;
        for (i = r0 * cw * 4; i < r1 * cw * 4; i += 4) d[i + 3] = 0;
        for (y = r0; y < r1 && y < caus.height; y++) { var fade = Math.pow(1 - (y * 2) / cr, 1.6) * (sky.d > .5 ? .42 : .25), yy = y * 2; for (x = 0; x < cw; x++) { var xx = x * 2, s = (Math.sin(xx * .21 + Math.sin(yy * .17 + t * .7) * 1.8 + t * .5) + Math.sin(yy * .19 + Math.sin(xx * .15 - t * .6) * 1.8 - t * .4)) * .5, st = 1 - Math.abs(s) * 5.5; if (st > .3) { var k = (y * cw + x) * 4; d[k] = 232; d[k + 1] = 251; d[k + 2] = 255; d[k + 3] = Math.round(255 * fade * Math.min(1, st * 1.2)); } } }
        causG.putImageData(causData, 0, 0); g.drawImage(caus, 0, SY, caus.width * 2, caus.height * 2);
      },
      _kelp: function (g, L, t, front) {
        for (var i = 0; i < L.length; i++) { var k = L[i], top = worldH - 4 - k.h; if (top > Math.round(cam) + H + 20) continue;
          for (var j = 0; j < k.h; j += 2) { var f = j / k.h, x = k.x + Math.round(Math.sin(t * .9 + k.ph + j * .09) * (1 + f * 5) + Math.sin(t * .4 + k.ph) * f * 3);
            g.fillStyle = front ? (j % 6 ? '#1f7a58' : '#3fb078') : (j % 6 ? '#0f4a50' : '#1a6a68'); g.fillRect(x, worldH - 4 - j, 2 + front, 2); if (j % 8 === 2) { g.fillRect(x + (j % 16 === 2 ? 2 : -2) , worldH - 5 - j, 3, 2); } if (front && j % 12 === 4) { g.fillStyle = '#9af0a0'; g.fillRect(x, worldH - 5 - j, 1, 1); } } }
      },
      _seabedFx: function (g, t, by0) {
        var gl = mid._glows, i, q, a, n;
        for (i = 0; i < gl.length; i++) { q = gl[i]; a = .5 + .5 * Math.sin(t * (q.r > 9 ? 1.4 : 2.1) + q.ph); disc(g, Math.round(q.x), Math.round(by0 + q.y), Math.round(q.r * (.8 + .25 * a)), 'rgba(' + q.c + ',' + (.06 + .1 * a * q.a).toFixed(3) + ')'); if (q.r < 9) { disc(g, Math.round(q.x), Math.round(by0 + q.y), Math.max(1, Math.round(q.r * .35)), 'rgba(' + q.c + ',' + (.12 + .25 * a * q.a).toFixed(3) + ')'); } g.fillStyle = 'rgba(255,255,255,' + (.35 + .55 * a * q.a).toFixed(2) + ')'; g.fillRect(Math.round(q.x), Math.round(by0 + q.y), 1, 1); }
        var ch = mid._chest; if (ch) { var sp = Math.sin(t * 3) * .5 + .5; g.fillStyle = 'rgba(255,245,190,' + (.4 + sp * .55).toFixed(2) + ')'; g.fillRect(Math.round(ch.x - 6 + ((t * 2 | 0) % 5) * 3), Math.round(by0 + ch.y - 3 - ((t * 2 | 0) % 3)), 1, 1); if (sp > .7) { g.fillStyle = 'rgba(255,255,255,' + (sp * .85).toFixed(2) + ')'; var sx = Math.round(ch.x + 3 + Math.sin(t) * 5), sy = Math.round(by0 + ch.y - 6); g.fillRect(sx, sy - 2, 1, 5); g.fillRect(sx - 2, sy, 5, 1); } }
        var vs = mid._vents; for (i = 0; i < vs.length; i++) for (n = 0; n < 7; n++) { var ph = (t * 9 + n * 7 + i * 5) % 49, f = ph / 49, vx = vs[i].x + Math.sin(t * .8 + n + i) * (1 + f * 5), vy = by0 + vs[i].y - ph; g.fillStyle = f < .25 ? 'rgba(144,224,239,' + (.5 * (1 - f * 2)).toFixed(2) + ')' : 'rgba(5,16,70,' + (.55 * (1 - f)).toFixed(2) + ')'; var sz = 1 + Math.round(f * 3); g.fillRect(Math.round(vx - sz / 2), Math.round(vy), sz, sz); }
        for (i = 0; i < 6; i++) { var bp = (t * 9 + i * 13) % 70; g.drawImage(bubSprites()[i % 3 === 0 ? 1 : 0], Math.round(mid._wx + 6 + Math.sin(t + i) * 2), Math.round(by0 + SBH - 34 - bp)); }
      },
      _life: function (g, dt, t, camI, Lf) {
        var v0 = camI - 40, v1 = camI + H + 40, i, j, s, y, Hs = H;
        var dimA = function (yy) { return clamp(1 - (yy - SY) / DD * .3, .7, 1); };
        for (i = 0; i < shoals.length; i++) { s = shoals[i]; s.x += s.vx * dt; if (s.vx > 0 && s.x > W + 50) s.x = -50; if (s.vx < 0 && s.x < -50) s.x = W + 50; var sy = s.y + Math.sin(t * .4 + s.ph) * 6;
          if (sy < v0 - 20 || sy > v1) continue; var fl = s.vx > 0 ? 0 : 1; g.globalAlpha = s.far ? .8 * dimA(sy) : dimA(sy);
          for (j = 0; j < s.fs.length; j++) { var f = s.fs[j], sp = s.kind[fl][((t * 7 + f.ph) | 0) & 1]; g.drawImage(sp, Math.round(s.x + f.ox + Math.sin(t * 1.3 + f.ph) * 3), Math.round(sy + f.oy + Math.sin(t * 2 + f.ph) * 1.5)); }
          g.globalAlpha = 1; if (s.glow) for (j = 0; j < s.fs.length; j += 2) { var ff = s.fs[j]; if (Math.sin(t * 2 + ff.ph * 3) > .3) { g.fillStyle = 'rgba(144,240,255,.85)'; g.fillRect(Math.round(s.x + ff.ox + (fl ? -1 : 8)), Math.round(sy + ff.oy + 2), 1, 1); } } }
        for (i = 0; i < singles.length; i++) { s = singles[i]; var big = s.t === 'whale';
          s.x += s.vx * dt * (RM ? 0 : 1); var pad = big ? 130 : 50; if (s.vx > 0 && s.x > W + pad) s.x = -pad; if (s.vx < 0 && s.x < -pad) s.x = W + pad;
          y = s.y + (s.t === 'jelly' ? Math.sin(t * .5 + s.ph) * 22 - ((t * 3 + s.ph * 9) % 14) * 0 : Math.sin(t * .35 + s.ph) * (big ? 6 : 4)); if (y < v0 - 30 || y > v1 + 30) continue; var fl2 = s.vx > 0 ? 0 : 1, xx = Math.round(s.x);
          if (s.t === 'turtle') g.drawImage(Lf.turtle[fl2][((t * 2.2 + s.ph) | 0) & 1], xx, Math.round(y));
          else if (s.t === 'tuna') { g.globalAlpha = dimA(y); g.drawImage(s.spr[fl2][((t * 6 + s.ph) | 0) & 1], xx, Math.round(y)); g.globalAlpha = 1; }
          else if (s.t === 'jelly') { g.globalAlpha = .95; SOT.life.jelly(g, xx, Math.round(y), t, s.ph, s.big); g.globalAlpha = 1; }
          else if (s.t === 'manta') SOT.life.manta(g, xx, Math.round(y), t, s.ph, s.vx > 0 ? 1 : -1);
          else if (s.t === 'whale') { var wc = Lf.whale, wy = Math.round(y), wl = wc.width; for (var cx = 0; cx < wl; cx += 1) { var u = fl2 ? wl - 1 - cx : cx, tf = (1 - u / wl), amp = Math.pow(tf, 2) * 5 * (u > wl * .6 ? 1.4 : .5); var dy = Math.round(Math.sin(t * 1.1 - u * .06 + s.ph) * amp); g.drawImage(wc, u, 0, 1, wc.height, xx + cx - (fl2 ? 0 : 0), wy + dy, 1, wc.height); } if (hash(i, 1, Math.floor(t)) > .93) { } }
          else if (s.t === 'angler') { var as = fl2 ? Lf.anglerF : Lf.angler, ay = Math.round(y), lx = xx + (fl2 ? 8 : 22), ly = ay + Math.round(Math.sin(t * 2 + s.ph) * 1); g.drawImage(as, xx, ay); var pulse = .6 + .4 * Math.sin(t * 3 + s.ph);
            disc(g, lx, ly - 1, 24, 'rgba(72,202,228,' + (.07 * pulse).toFixed(3) + ')'); disc(g, lx, ly - 1, 16, 'rgba(72,202,228,' + (.12 * pulse).toFixed(3) + ')'); disc(g, lx, ly - 1, 9, 'rgba(144,224,239,' + (.25 * pulse).toFixed(3) + ')'); disc(g, lx, ly - 1, 4, 'rgba(202,240,248,' + (.6 * pulse).toFixed(3) + ')'); g.fillStyle = '#ffffff'; g.fillRect(lx - 1, ly - 2, 2, 2); }
        }
      },
      _bottles: function (g, dt, t, camI) {
        var i, b, lvl, Bt = SOT.bottles, vis0 = camI - H * .15, vis1 = camI + H * 1.15, ex = Math.exp(-dt * 1.35);
        for (i = 0; i < items.length; i++) { b = items[i]; var near = b.ty > vis0 - 40 && b.ty < vis1 + 40 || b.drop || b.y < vis1 && b.y > vis0 - 40;
          if (!near) { if (b.lastVis || b.dom) { b.x = b.tx; b.y = b.ty; this._dom(b, camI); b.lastVis = false; b.dom = false; } continue; }
          b.lastVis = true; var px0 = b.x, py0 = b.y, slope = 0, bob = Math.sin(t * 1.2 + b.ph);
          if (b.drop) { b.vy += 230 * dt; b.y += b.vy * dt; b.ang += (0 - b.ang) * (1 - Math.exp(-dt * 2)) + b.spin * dt * .0; b.spin *= Math.exp(-dt * 1.2); b.ang += b.spin * dt * .35; if (b.y >= surfY(Math.round(b.x), t) - 2) { b.drop = false; this.splash(b.x, surfY(Math.round(b.x), t), true); b.vy = b.vy * .15; b.sinkV = 1; } }
          else if (b.float) { b.x += (b.tx + Math.sin(t * .3 + b.ph) * 4 - b.x) * (1 - ex); var sx = Math.round(b.x); b.y = surfY(sx, t) - 2 + bob * .7; slope = (surfY(sx + 6, t) - surfY(sx - 6, t)) / 12; }
          else { b.x += (b.tx + Math.sin(t * .35 + b.ph) * 6 - b.x) * (1 - ex * .9); b.y += (b.ty + bob * 2.5 + Math.sin(t * .27 + b.ph * 2) * 2 - b.y) * (1 - Math.exp(-dt * (b.rocks ? 1.5 : 1.0))); }
          var vx = dt > 0 ? (b.x - px0) / dt : 0, vy = dt > 0 ? (b.y - py0) / dt : 0; b.vxS += (vx - b.vxS) * (1 - Math.exp(-dt * 6)); b.vyS += (vy - b.vyS) * (1 - Math.exp(-dt * 6));
          if (!b.drop) { var tgt = slope * .9 + Math.sin(t * .6 + b.ph) * .07 + clamp(b.vxS * .03, -.4, .4) + clamp(b.vyS * .018, -.6, .6) * (b.rocks ? -1.2 : 1) + (b.row > 0 ? Math.sin(t * .4 + b.ph) * .1 : 0); b.ang += (tgt - b.ang) * (1 - Math.exp(-dt * 4.5)); }
          lvl = Bt.level((b.y - SY) / DD); var gl = hoverId === b.id;
          if (gl) { var pulse = .5 + .5 * Math.sin(t * 6); disc(g, Math.round(b.x), Math.round(b.y), 15, 'rgba(255,255,255,' + (.12 + pulse * .1).toFixed(2) + ')'); }
          if (picking && !b.drop) { var bx = Math.round(b.x), by = Math.round(b.y), pp = (t * 2 | 0) % 2 ? 1 : 0, cl = 'rgba(255,255,255,.9)'; g.fillStyle = cl; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var cx2 = bx + q[0] * (17 + pp), cy2 = by + q[1] * (13 + pp); g.fillRect(cx2 - (q[0] > 0 ? 3 : 0), cy2, 4, 1); g.fillRect(cx2, cy2 - (q[1] > 0 ? 3 : 0), 1, 4); }); }
          Bt.draw(g, b, b.x, b.y, b.ang, lvl, t);
          if (b.drop === false && b.sinkV && !b.float && b.y > SY + 4 && Math.random() < dt * 6) parts.push({ x: b.x + (Math.random() - .5) * 8, y: b.y - 4, vx: 0, vy: -12, l: 1.2, k: 2, b: 0 });
          this._dom(b, camI);
        }
      },
      _dom: function (b, camI) { if (!b.el) return; var tx = Math.round((b.x - 17) * S), ty = Math.round((b.y - cam - 12) * S); if (b._tx !== tx || b._ty !== ty) { b._tx = tx; b._ty = ty; b.el.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)'; } },
      _surface: function (g, camI, t) {
        var x, i, ys;
        for (x = 0; x < W; x++) { ys = surfY(x, t); g.fillStyle = pc(P('#7ab0d8', '#CAF0F8'), .95); g.fillRect(x, ys, 1, 1);
          var cr = ys < surfY(x - 1, t) + 1 && ys <= surfY(x + 1, t) && ys < SY - 1; g.fillStyle = 'rgba(0,150,199,.22)'; g.fillRect(x, ys + 1, 1, 2);
          if (cr || hash(x, Math.floor(t * 1.2), 4) > .96) { g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(x - 1, ys - 1, 3, 1); g.fillRect(x, ys, 1, 1); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, ys + 1, 2, 1); }
          if (Math.abs(x - kit.sunX()) < 34 && hash(x, Math.floor(t * 4), 8) > .6) { g.fillStyle = pc(P('#bcd8f0', '#ffffff'), .9); g.fillRect(x, ys + 1, 1, 1); } }
        // water lip over floating bottles
        for (i = 0; i < items.length; i++) { var b = items[i]; if (!b.float || b.drop) continue; var bx = Math.round(b.x - b.bw / 2), by = Math.round(b.y);
          g.globalAlpha = .62; for (x = bx; x < bx + b.bw; x++) { var wy = surfY(x, t) + 1; g.drawImage(wg, x, wy, 1, 10, x, wy, 1, 10); } g.globalAlpha = 1;
          for (x = bx; x < bx + b.bw; x++) { var wy2 = surfY(x, t); if (hash(x, b.n, Math.floor(t * 2)) > .55) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x, wy2 + 1, 1, 1); } } }
        for (i = ripples.length - 1; i >= 0; i--) { var rp = ripples[i]; rp.r += (rp.r < 0 ? 1.6 : 1) * 30 * (1 / 60); rp.a -= (1 / 60) * 1.0; if (rp.a <= 0) { ripples.splice(i, 1); continue; } if (rp.r < 1) continue; var ry = surfY(Math.round(rp.x), t); g.fillStyle = 'rgba(255,255,255,' + (rp.a * .8).toFixed(2) + ')'; g.fillRect(Math.round(rp.x - rp.r), ry + 1, Math.max(2, rp.r * .6), 1); g.fillRect(Math.round(rp.x + rp.r - rp.r * .6), ry + 1, Math.max(2, rp.r * .6), 1); g.fillStyle = 'rgba(202,240,248,' + (rp.a * .5).toFixed(2) + ')'; g.fillRect(Math.round(rp.x - rp.r * .7), ry + 2, Math.round(rp.r * 1.4), 1); }
      },
      _particles: function (g, dt, t, camI) {
        var i, s, surfS = SY - cam, depthA = clamp((cam + H / 2 - SY) / DD, 0, 1), BS = bubSprites();
        for (i = 0; i < snow.length; i++) { s = snow[i]; var yy = ((s.y + t * s.sp - cam * s.f) % H + H) % H, xx = s.x + Math.sin(t * .5 + s.ph) * 3; if (yy < surfS + 2) continue; var a = (.14 + depthA * .5) * (s.z === 2 ? 1 : .7) * (.6 + .4 * Math.sin(t * 2 + s.ph)); g.fillStyle = (depthA > .55 && i % 5 === 0) ? 'rgba(72,202,228,' + (a * 1.3).toFixed(2) + ')' : 'rgba(202,240,248,' + a.toFixed(2) + ')'; g.fillRect(Math.round(xx), Math.round(yy), 1, 1); }
        var dens = 1 - depthA * .6; for (i = 0; i < bubs.length; i++) { s = bubs[i]; if (s.q > dens) continue; var by = (((s.y - t * s.sp - cam * s.f) % (H + 24)) + H + 24) % (H + 24) - 8; if (by < surfS + 3 || by > H) continue; g.drawImage(BS[s.k], Math.round(s.x + Math.sin(t * 1.3 + s.ph) * 2), Math.round(by)); }
        for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } var sy = p.y - cam; if (p.k === 2) { p.y += p.vy * dt * (p.vy > 0 ? 1 : 1); p.vy = Math.max(-26, p.vy - 14 * dt); p.x += Math.sin(t * 5 + i) * .15; if (p.y < SY - 1) { parts.splice(i, 1); continue; } g.drawImage(BS[p.b || 0], Math.round(p.x), Math.round(sy)); continue; }
          p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > SY + 3 && p.vy > 0) { parts.splice(i, 1); continue; } g.fillStyle = p.k ? '#CAF0F8' : '#ffffff'; g.fillRect(Math.round(p.x), Math.round(sy), 1, 1); if (p.l > .6) g.fillRect(Math.round(p.x), Math.round(sy) + 1, 1, 1); }
      }
    };
    SOT.register(sc, cv);
    return sc;
  };
})();
