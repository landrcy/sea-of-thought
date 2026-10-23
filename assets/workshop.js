/* Sea of Thought — the bottle workshop: write a scroll, roll it, slide it into the bottle, seal it, tie rocks, throw, splash, sink/bob. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, RM = px.RM, W = 200, H = 120, HZ = 54;
  var TL = { write: 2.4, roll: 3.3, slide: 4.5, cork: 5.1, throw: 6.4, splash: 7.0, end: 8.0 };
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function seg(t, a, b) { return ease((t - a) / (b - a)); }
  SOT.createWorkshop = function (cv, host) {
    var g = cv.getContext('2d'); cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
    var kit = new SOT.SkyKit(W, HZ, 12), state = { playing: false, t0: 0, lines: [], done: null, rocks: 0, n: 1 }, parts = [], rip = [], splashed = false;
    var sea = px.gradCanvas(W, H - HZ, ['#0a4a86', '#04408a', '#023478', '#02296a', '#021e5a', '#03045E'], 0, H - HZ);
    var seaDay = px.gradCanvas(W, H - HZ, ['#ADE8F4', '#90E0EF', '#48CAE4', '#00B4D8', '#0096C7', '#0077B6'], 0, H - HZ);
    var BX = 8, K = 3, BS = null;
    function sprites() { var pk = SOT.bottles.pick(state.n), B = SOT.bottles; K = Math.max(2, Math.min(4, Math.round(62 / B.size(pk.shape).w))); BS = { pk: pk, empty: B.spr(pk.shape, pk.tint, pk.wax, 0, { noScroll: true, noSeal: true }), scrolled: B.spr(pk.shape, pk.tint, pk.wax, 0, { noSeal: true }), full: B.spr(pk.shape, pk.tint, pk.wax, 0), sunk: B.spr(pk.shape, pk.tint, pk.wax, 2) }; }
    function put(sp, cx, cy, ang, k) { g.save(); g.translate(Math.round(cx), Math.round(cy)); if (ang) g.rotate(ang); g.drawImage(sp.c, 0, 0, sp.w, sp.h, -sp.cx * k, -sp.cy * k, sp.w * k, sp.h * k); g.restore(); }
    function seal(sp, x, y, k) { g.drawImage(sp.c, sp.len - 1, 0, sp.sw + 2, sp.h, Math.round(x), Math.round(y), (sp.sw + 2) * k, sp.h * k); }
    function makeLines(text) { var h = 7, i, n = Math.max(2, Math.min(6, Math.ceil(text.length / 40) + 1)), L = []; for (i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0; for (i = 0; i < n; i++) { h = (h * 1103515245 + 12345) | 0; L.push(36 + (Math.abs(h) % 36)); } return L; }
    function parchment(x, y, w, h) { g.fillStyle = '#7a5230'; g.fillRect(x - 3, y - 3, w + 6, 4); g.fillRect(x - 3, y + h - 1, w + 6, 4); g.fillStyle = '#c98a4b'; g.fillRect(x - 3, y - 3, w + 6, 1); g.fillRect(x - 3, y + h - 1, w + 6, 1); g.fillStyle = '#f3dfae'; g.fillRect(x, y + 1, w, h - 2); g.fillStyle = '#fff1cf'; g.fillRect(x, y + 1, w, 2); g.fillStyle = '#d6b87c'; g.fillRect(x, y + h - 4, w, 3); }
    function ink(x, y, len, upto) { g.fillStyle = '#3a2410'; for (var i = 0; i < upto && i < len; i += 3) g.fillRect(x + i, y + ((i / 3) & 1), 2, 1); }
    function bg(T, dt) {
      kit.draw(g, T, dt); g.drawImage(sea, 0, HZ); if (SOT.sky.d > .01) { g.globalAlpha = SOT.sky.d; g.drawImage(seaDay, 0, HZ); g.globalAlpha = 1; }
      for (var i = 0; i < 9; i++) { var y = HZ + 3 + i * i * .8 | 0, off = (Math.sin(i * 2 + T * .4) * 6 + T * (2 + i)) % 14; for (var x = -off; x < W; x += 14) { g.fillStyle = Math.abs(x - kit.sunX()) < 10 + i * 5 ? 'rgba(235,250,255,.85)' : 'rgba(170,215,240,.4)'; g.fillRect(x, y, 4 + (i >> 1), 1); } }
      g.fillStyle = '#5a3a1e'; g.fillRect(0, 98, 100, 22); g.fillStyle = '#7a5230'; g.fillRect(0, 98, 100, 3); g.fillStyle = '#CAF0F8'; g.fillRect(0, 98, 100, 1); g.fillStyle = '#3e2712'; for (x = 12; x < 100; x += 22) g.fillRect(x, 101, 1, 19); g.fillRect(0, 110, 100, 1); g.fillRect(96, 98, 6, 22);
    }
    function rocksAt(x, y, n, T, sway) { for (var i = 0; i < n; i++) { var rx = x + (i - (n - 1) / 2) * 11 + Math.sin(T * 3 + i) * (sway || 1), ry = y + 10 + (i % 2) * 8; g.fillStyle = 'rgba(160,190,215,.9)'; for (var k = 0; k < ry - y; k += 2) g.fillRect(Math.round(x + (rx - x) * k / (ry - y)), Math.round(y + k), 1, 1); var r = SOT.bottles.rock(i + state.n); g.drawImage(r, 0, 0, r.width, r.height, Math.round(rx - r.width), Math.round(ry), r.width * 2, r.height * 2); } }
    function render(dt, T) {
      if (!BS) sprites(); bg(T, dt);
      var t = state.fix != null ? state.fix : state.playing ? (performance.now() - state.t0) / 1000 * (RM ? 5 : 1) : -1, i, pk = BS, bcx = BX + pk.empty.cx * K, bcy = 82;
      var topY = bcy - pk.empty.cy * K, neckX = BX + pk.empty.len * K;
      function bottleIdle() { put(pk.empty, bcx, bcy, 0, K); }
      if ((!state.playing && state.fix == null) || t < 0) { parchment(108, 10, 80, 50); g.fillStyle = '#c9a46a'; for (i = 0; i < 5; i++) g.fillRect(116, 22 + i * 7, 64, 1); bottleIdle(); return; }
      if (t < TL.write) { parchment(108, 10, 80, 50); var total = state.lines.reduce(function (a, b) { return a + b; }, 0), upto = total * t / TL.write * 1.05, acc = 0, px0 = 116, py0 = 0;
        state.lines.forEach(function (len, li) { var take = Math.max(0, Math.min(len, upto - acc)); ink(116, 20 + li * 7, len, take); if (take > 0 && take < len) { px0 = 116 + take; py0 = 20 + li * 7; } acc += len; });
        g.fillStyle = '#3a2410'; g.fillRect(px0, py0 - 7, 1, 7); g.fillRect(px0 + 1, py0 - 9, 1, 3); g.fillRect(px0 + 2, py0 - 11, 1, 3); g.fillStyle = '#c9a46a'; g.fillRect(px0 + 2, py0 - 9, 1, 2); g.fillStyle = '#1a0e06'; g.fillRect(px0, py0 - 1, 1, 1); bottleIdle(); return; }
      if (t < TL.roll) { var k = seg(t, TL.write, TL.roll), h = 50 - 41 * k, w = 80 - 40 * k, x = 148 - w / 2, y = 35 - h / 2;
        if (k < .6) { parchment(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); state.lines.forEach(function (len, li) { if (y + 10 + li * 7 * (h / 50) < y + h - 4) ink(Math.round(x) + 8, Math.round(y + 10 + li * 7 * (h / 50)), len * w / 80, len); }); }
        else { g.fillStyle = '#c9a46a'; g.fillRect(Math.round(x), 31, Math.round(w), 9); g.fillStyle = '#f3dfae'; g.fillRect(Math.round(x), 31, Math.round(w), 4); g.fillStyle = '#fff1cf'; g.fillRect(Math.round(x), 31, Math.round(w), 2); g.fillStyle = '#b08a4e'; g.fillRect(Math.round(x), 31, 2, 9); g.fillRect(Math.round(x + w - 2), 31, 2, 9); if (k > .85) { g.fillStyle = '#6b8aa8'; g.fillRect(148, 29, 3, 13); } }
        bottleIdle(); return; }
      if (t < TL.slide) { var s = seg(t, TL.roll, TL.slide), tx = 128 + (BX + 3 * K - 128) * s, ty = 31 + (bcy - 4 - 31) * s; put(pk.empty, bcx, bcy, 0, K); g.fillStyle = '#c9a46a'; g.fillRect(Math.round(tx), Math.round(ty), 40, 9); g.fillStyle = '#f3dfae'; g.fillRect(Math.round(tx), Math.round(ty), 40, 5); g.fillStyle = '#fff1cf'; g.fillRect(Math.round(tx), Math.round(ty), 40, 2); g.fillStyle = '#6b8aa8'; g.fillRect(Math.round(tx) + 18, Math.round(ty) - 1, 3, 11); return; }
      if (t < TL.cork) { var c = seg(t, TL.slide, TL.cork), bounce = c > .8 ? Math.sin((c - .8) * 15) * 2 : 0; put(pk.scrolled, bcx, bcy, 0, K); seal(pk.full, neckX - 3 * K + 6 - Math.round(6 * c), topY + (pk.full.cy - 3) * K - 30 * (1 - c) - bounce, K); return; }
      var ex = 142, ey = HZ + 22;
      if (t < TL.throw) { var f = seg(t, TL.cork, TL.throw), fx = bcx + (ex - bcx) * f, fy = bcy + (ey - bcy) * f - Math.sin(f * Math.PI) * 52; if (state.rocks) rocksAt(fx, fy, state.rocks, T, 2 + f * 3); put(pk.full, fx, fy, f * Math.PI * 3.4 - .2, K); splashed = false; return; }
      if (!splashed) { splashed = true; for (i = 0; i < 30; i++) parts.push({ x: ex, y: ey, vx: (Math.random() - .5) * 64, vy: -(22 + Math.random() * 56), l: .8 + Math.random() * .5 }); rip.push({ r: 2, a: 1 }); rip.push({ r: -4, a: .8 }); }
      var tt = t - TL.throw, bob = Math.sin(tt * 3) * 1.5, sink = state.rocks ? ease((tt - .5) / (TL.end - TL.throw - .6)) * (10 + state.rocks * 14) : 0;
      if (state.rocks) rocksAt(ex, ey + 4 + bob + sink, state.rocks, T, 1 + sink * .1);
      put(sink > 1 ? pk.sunk : pk.full, ex, ey + 4 + bob + sink, (state.rocks ? .5 - sink * .02 : -.12) + Math.sin(tt * 2.4) * .06, K);
      g.globalAlpha = .5; g.drawImage(SOT.sky.d > .5 ? seaDay : sea, ex - 44, ey + 10 - HZ, 88, 44, ex - 44, ey + 10, 88, 44); g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.7)'; for (i = 0; i < 60; i += 4) if (px.hash(i, 3, Math.floor(T * 3)) > .4) g.fillRect(ex - 30 + i, ey + 10, 2, 1);
      for (i = rip.length - 1; i >= 0; i--) { var r = rip[i]; r.r += dt * 30; r.a -= dt * .9; if (r.a <= 0) { rip.splice(i, 1); continue; } if (r.r < 1) continue; g.fillStyle = 'rgba(255,255,255,' + (r.a * .8).toFixed(2) + ')'; g.fillRect(Math.round(ex - r.r), ey + 10, Math.round(r.r * 2), 1); }
      for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.vy += 130 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = i & 1 ? '#fff' : '#CAF0F8'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      if (t > TL.end && state.playing) { state.playing = false; var d = state.done; state.done = null; if (d) d(); }
    }
    var scn = { fps: 60, T: 0, layout: function () {}, render: render };
    SOT.register(scn, host || cv.parentNode);
    return {
      play: function (text, done, rocks, n) { state.rocks = rocks | 0; state.n = n || 1; sprites(); state.lines = makeLines(text); state.playing = true; state.t0 = performance.now(); state.done = done; splashed = false; parts.length = 0; rip.length = 0; scn.dirty = true; },
      prep: function (n, rocks) { state.n = n || 1; state.rocks = rocks | 0; sprites(); scn.dirty = true; },
      get busy() { return state.playing; },
      freeze: function (sec, rocks, n) { state.n = n || 7; state.rocks = rocks | 0; sprites(); state.playing = true; state.lines = makeLines('example bottle message for preview purposes only'); state.fix = sec; state.done = null; scn.dirty = true; },
      total: TL.end
    };
  };
})();
