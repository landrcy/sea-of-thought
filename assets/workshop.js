/* Sea of Thought — the "bottle workshop": write a scroll, roll it, slide it into the bottle, cork it, throw it, splash, bob. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 200, H = 120, HZ = 54;
  var TL = { write: 2.4, roll: 3.3, slide: 4.5, cork: 5.1, throw: 6.4, splash: 7.0, end: 7.8 };
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function seg(t, a, b) { return ease((t - a) / (b - a)); }
  SOT.createWorkshop = function (cv) {
    var g = cv.getContext('2d'), host = cv.parentNode; cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
    var kit = new SOT.SkyKit(W, HZ, 12), state = { playing: false, t0: 0, lines: [], done: null, text: '' }, parts = [], rip = [], splashed = false;
    var sea = px.gradCanvas(W, H - HZ, ['#0e3a58', '#0a2c4c', '#082240', '#061a34', '#04122a', '#030c1e'], 0, H - HZ);
    var seaDay = px.gradCanvas(W, H - HZ, ['#5ad0e0', '#2fb0d0', '#1f8cc0', '#1668a8', '#0f4a88', '#0a3568'], 0, H - HZ);
    var K = 3, BX = 8, BY = 66, bw = SOT.bottle.W * K, bh = SOT.bottle.H * K;
    var fS = SOT.bottle.sprite(0, { noScroll: true, noCork: true }), fH = SOT.bottle.sprite(0, { hl: true }), fFull = SOT.bottle.sprite(0), fScroll = SOT.bottle.sprite(0, { noCork: true });
    function sc(img, x, y, k, w, h) { g.drawImage(img, 0, 0, img.width, img.height, Math.round(x), Math.round(y), Math.round((w || img.width) * k), Math.round((h || img.height) * k)); }
    function makeLines(text) { var h = 7, i, n = Math.max(2, Math.min(6, Math.ceil(text.length / 40) + 1)), L = []; for (i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0; for (i = 0; i < n; i++) { h = (h * 1103515245 + 12345) | 0; L.push(36 + (Math.abs(h) % 36)); } return L; }
    function parchment(x, y, w, h, tint) { g.fillStyle = '#7a5230'; g.fillRect(x - 3, y - 3, w + 6, 4); g.fillRect(x - 3, y + h - 1, w + 6, 4); g.fillStyle = '#c98a4b'; g.fillRect(x - 3, y - 3, w + 6, 1); g.fillRect(x - 3, y + h - 1, w + 6, 1); g.fillStyle = '#f3dfae'; g.fillRect(x, y + 1, w, h - 2); g.fillStyle = '#fff1cf'; g.fillRect(x, y + 1, w, 2); g.fillStyle = '#d6b87c'; g.fillRect(x, y + h - 4, w, 3); }
    function ink(x, y, len, upto) { g.fillStyle = '#4a3320'; for (var i = 0; i < upto && i < len; i += 3) { g.fillRect(x + i, y + ((i / 3) & 1), 2, 1); } }
    function bg(T, dt) {
      kit.draw(g, T, dt); g.drawImage(sea, 0, HZ); if (SOT.sky.d > .01) { g.globalAlpha = SOT.sky.d; g.drawImage(seaDay, 0, HZ); g.globalAlpha = 1; }
      for (var i = 0; i < 9; i++) { var y = HZ + 3 + i * i * .8 | 0, off = (Math.sin(i * 2 + T * .4) * 6 + T * (2 + i)) % 14; for (var x = -off; x < W; x += 14) { g.fillStyle = Math.abs(x - kit.sunX()) < 10 + i * 5 ? 'rgba(235,250,255,.85)' : 'rgba(170,215,240,.4)'; g.fillRect(x, y, 4 + (i >> 1), 1); } }
      // wooden dock
      g.fillStyle = '#5a3a1e'; g.fillRect(0, 98, 100, 22); g.fillStyle = '#7a5230'; g.fillRect(0, 98, 100, 3); g.fillStyle = '#cfe6f0'; g.fillRect(0, 98, 100, 1); g.fillStyle = '#3e2712'; for (x = 12; x < 100; x += 22) g.fillRect(x, 101, 1, 19); g.fillRect(0, 110, 100, 1);
      g.fillStyle = '#3e2712'; g.fillRect(96, 98, 6, 22);
    }
    function bottleAt(x, y, kind, k) { // kind: empty | scrolled | full
      var img = kind === 'empty' ? fS : kind === 'scrolled' ? fScroll : fFull; sc(img, x, y, k || K); if (kind !== 'full') sc(fH, x, y, k || K); else sc(fH, x, y, k || K);
    }
    function render(dt, T) {
      bg(T, dt);
      var t = state.fix != null ? state.fix : state.playing ? (performance.now() - state.t0) / 1000 * (RM ? 5 : 1) : -1, i;
      if ((!state.playing && state.fix == null) || t < 0) { // idle: blank scroll + bottle waiting
        parchment(108, 10, 80, 50); g.fillStyle = '#c9a46a'; for (i = 0; i < 5; i++) g.fillRect(116, 22 + i * 7, 64, 1); bottleAt(BX, BY, 'empty'); sc(SOT.bottle.sprite(0, { noScroll: true }), BX, BY, K); return;
      }
      if (t < TL.write) { parchment(108, 10, 80, 50); var total = state.lines.reduce(function (a, b) { return a + b; }, 0), upto = total * t / TL.write * 1.05, acc = 0, px0 = 116, py0 = 0;
        state.lines.forEach(function (len, li) { var take = Math.max(0, Math.min(len, upto - acc)); ink(116, 20 + li * 7, len, take); if (take > 0 && take < len) { px0 = 116 + take; py0 = 20 + li * 7; } acc += len; });
        g.fillStyle = '#fff'; g.fillRect(px0, py0 - 6, 1, 6); g.fillRect(px0 + 1, py0 - 8, 1, 3); g.fillStyle = '#5a3a1e'; g.fillRect(px0, py0 - 1, 1, 1);
        bottleAt(BX, BY, 'empty'); sc(SOT.bottle.sprite(0, { noScroll: true }), BX, BY, K); return; }
      if (t < TL.roll) { var k = seg(t, TL.write, TL.roll), h = 50 - 41 * k, w = 80 - 40 * k, x = 148 - w / 2, y = 35 - h / 2;
        if (k < .6) { parchment(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); state.lines.forEach(function (len, li) { if (y + 10 + li * 7 * (h / 50) < y + h - 4) ink(Math.round(x) + 8, Math.round(y + 10 + li * 7 * (h / 50)), len * w / 80, len); }); }
        else { g.fillStyle = '#c9a46a'; g.fillRect(Math.round(x), 31, Math.round(w), 9); g.fillStyle = '#f3dfae'; g.fillRect(Math.round(x), 31, Math.round(w), 4); g.fillStyle = '#fff1cf'; g.fillRect(Math.round(x), 31, Math.round(w), 2); g.fillStyle = '#b08a4e'; g.fillRect(Math.round(x), 31, 2, 9); g.fillRect(Math.round(x + w - 2), 31, 2, 9); if (k > .85) { g.fillStyle = '#7a5230'; g.fillRect(148, 29, 3, 13); g.fillRect(146, 27, 2, 2); g.fillRect(151, 27, 2, 2); } }
        bottleAt(BX, BY, 'empty'); sc(SOT.bottle.sprite(0, { noScroll: true }), BX, BY, K); return; }
      var cx0 = BX + 24 * K, cy0 = BY + 3 * K;
      if (t < TL.slide) { var s = seg(t, TL.roll, TL.slide), tx = 128 + (BX + 3 * K - 128) * s, ty = 31 + (BY + 4 * K - 31) * s;
        sc(fS, BX, BY, K); g.fillStyle = '#c9a46a'; g.fillRect(Math.round(tx), Math.round(ty), 40, 9); g.fillStyle = '#f3dfae'; g.fillRect(Math.round(tx), Math.round(ty), 40, 5); g.fillStyle = '#fff1cf'; g.fillRect(Math.round(tx), Math.round(ty), 40, 2); g.fillStyle = '#7a5230'; g.fillRect(Math.round(tx) + 18, Math.round(ty) - 1, 3, 11);
        sc(fH, BX, BY, K); var cr = SOT.bottle.sprite(0); g.drawImage(cr, 24, 3, 4, 5, cx0 + 6, cy0 - 30 + Math.round(Math.sin(t * 6) * 2), 12, 15); return; }
      if (t < TL.cork) { var c = seg(t, TL.slide, TL.cork), bounce = c > .8 ? Math.sin((c - .8) * 15) * 2 : 0; sc(fScroll, BX, BY, K); sc(fH, BX, BY, K);
        g.drawImage(fFull, 24, 3, 4, 5, cx0 + 6 - Math.round(6 * c), Math.round(cy0 - 30 * (1 - c) - bounce), 12, 15); return; }
      var flyP = seg(t, TL.cork, TL.throw), sx = BX, sy = BY, ex = 142, ey = HZ + 24;
      if (t < TL.throw) { var f = flyP, fx = sx + (ex - sx) * f, fy = sy + (ey - sy) * f - Math.sin(f * Math.PI) * 52; g.save(); g.translate(Math.round(fx + bw / 2), Math.round(fy + bh / 2)); g.rotate(f * Math.PI * 3.4 - .2); g.drawImage(fFull, 0, 0, 28, 11, -bw / 2, -bh / 2, bw, bh); g.drawImage(fH, 0, 0, 28, 11, -bw / 2, -bh / 2, bw, bh); g.restore();
        if (f > .02 && f < .2) { /* sparkle at hand */ } splashed = false; return; }
      if (!splashed) { splashed = true; for (i = 0; i < 26; i++) parts.push({ x: ex + bw / 2, y: ey + bh / 2, vx: (Math.random() - .5) * 60, vy: -(22 + Math.random() * 52), l: .8 + Math.random() * .5 }); rip.push({ r: 2, a: 1 }); }
      var bob = Math.sin((t - TL.throw) * 3) * 1.5, by2 = ey + 4 + bob;
      g.save(); g.translate(ex + bw / 2, Math.round(by2 + bh / 2)); g.rotate(-.12 + Math.sin((t - TL.throw) * 2.4) * .06); g.drawImage(fFull, 0, 0, 28, 11, -bw / 2, -bh / 2, bw, bh); g.drawImage(fH, 0, 0, 28, 11, -bw / 2, -bh / 2, bw, bh); g.restore();
      g.drawImage(sea, ex - 6, ey + 18 - HZ + 0, bw + 12, 2, ex - 6, ey + 18, bw + 12, 2); g.fillStyle = 'rgba(255,255,255,.7)'; for (i = 0; i < bw; i += 4) if (px.hash(i, 3, Math.floor(T * 3)) > .4) g.fillRect(ex + i, ey + 18, 2, 1);
      for (i = rip.length - 1; i >= 0; i--) { var r = rip[i]; r.r += dt * 30; r.a -= dt * .9; if (r.a <= 0) { rip.splice(i, 1); continue; } g.fillStyle = 'rgba(255,255,255,' + (r.a * .8).toFixed(2) + ')'; g.fillRect(Math.round(ex + bw / 2 - r.r), ey + 19, Math.round(r.r * 2), 1); }
      for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.vy += 130 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = i & 1 ? '#fff' : '#bfeaff'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      if (t > TL.end && state.playing) { state.playing = false; var d = state.done; state.done = null; if (d) d(); }
    }
    var scn = { fps: 30, T: 0, layout: function () {}, render: render };
    SOT.register(scn, host);
    return {
      play: function (text, done) { state.text = text; state.lines = makeLines(text); state.playing = true; state.t0 = performance.now(); state.done = done; splashed = false; parts.length = 0; rip.length = 0; scn.dirty = true; },
      get busy() { return state.playing; },
      freeze: function (sec) { state.playing = true; state.lines = makeLines('example bottle message for preview purposes only'); state.fix = sec; state.done = null; scn.dirty = true; },
      total: TL.end
    };
  };
})();
