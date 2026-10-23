/* Sea of Thought — seabed art: coral species, ruins, wreck, treasure. Procedural pixel art (no images).
 * SOT.seabed.paint(g, W, Hh, r) draws everything onto the mid-layer canvas and returns anchors for animation. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, line = px.line, disc = px.disc, hash = px.hash, B = {};
  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }
  function P1(g, c, x, y) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
  function sub(src, k) { if (k >= .99) return src; var w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k)), c = mk(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h); return c; }
  function poly(g, pts, col) {
    var y0 = 1e9, y1 = -1e9, i; for (i = 0; i < pts.length; i++) { y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    for (var y = Math.floor(y0); y <= Math.ceil(y1); y++) { var xs = [], yy = y + .5; for (i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) { var xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]); if (typeof col === 'function') { for (var x = xa; x < xb; x++) { g.fillStyle = col(x, y); g.fillRect(x, y, 1, 1); } } else { g.fillStyle = col; g.fillRect(xa, y, xb - xa, 1); } } }
  }
  var ST = { d: '#0c2a78', m: '#2658a8', l: '#4a88d0', h: '#8cc8f0', mo: '#1f7a68', mh: '#4fc09a' };
  function moss(g, c, x0, y0, x1, y1, n, seed) { for (var i = 0; i < n; i++) { var x = x0 + Math.floor(hash(i, seed, 3) * (x1 - x0)), y = y0 + Math.floor(hash(i, seed, 7) * (y1 - y0)); if (g.getImageData(x, y, 1, 1).data[3] > 0) { P1(g, ST.mo, x, y); if (i % 3 === 0) P1(g, ST.mh, x, y - 1); } } }

  /* ---------- coral species ---------- */
  var PAL = [
    ['#0b6a86', '#2ec4b6', '#9af0e4'],      // teal
    ['#1a4aa0', '#3a8ee0', '#ADE8F4'],      // blue
    ['#4a2a96', '#8a5ad8', '#cdb0f8'],      // purple
    ['#8a3a8a', '#d86ac0', '#ffc4ec'],      // pink-lilac
    ['#0e5a9a', '#48CAE4', '#CAF0F8'],      // cyan
    ['#5a3aa8', '#a07ae8', '#e0d0ff']       // violet
  ];
  function branch(g, x, y, ang, len, depth, pal, r, tips) {
    var x1 = x + Math.cos(ang) * len, y1 = y - Math.sin(ang) * len;
    g.fillStyle = depth > 1 ? pal[0] : pal[1]; line(g, x, y, x1, y1, depth > 1 ? 2 : 1);
    if (depth > 1) { g.fillStyle = pal[1]; line(g, x + 1, y, x1 + 1, y1, 1); }
    if (depth === 0) { P1(g, pal[2], x1, y1); P1(g, pal[2], x1, y1 - 1); tips.push([x1, y1]); return; }
    var n = depth > 1 ? 2 : 2;
    for (var i = 0; i < n; i++) branch(g, x1, y1, ang + (i ? -1 : 1) * (.35 + r() * .45) * (r() > .35 ? 1 : -.5), len * (.66 + r() * .12), depth - 1, pal, r, tips);
    if (depth > 1 && r() > .4) branch(g, (x + x1) / 2, (y + y1) / 2, ang + (r() > .5 ? 1 : -1) * .9, len * .5, depth - 2 < 0 ? 0 : depth - 2, pal, r, tips);
  }
  var KINDS = {
    staghorn: function (g, x, y, s, pal, r, tips) { var n = 2 + (r() * 2 | 0); for (var i = 0; i < n; i++) branch(g, x + (i - (n - 1) / 2) * 3, y, Math.PI / 2 + (i - (n - 1) / 2) * .5 + (r() - .5) * .3, s * (.34 + r() * .1), 3, pal, r, tips); },
    brain: function (g, x, y, s, pal, r, tips) {
      var rx = Math.max(5, Math.round(s * .46)), ry = Math.round(rx * .78);
      for (var yy = -ry; yy <= 0; yy++) for (var xx = -rx; xx <= rx; xx++) { var e = xx * xx / (rx * rx) + yy * yy / (ry * ry); if (e > 1) continue;
        var v = Math.sin(xx * .62 + 1.9 * Math.sin(yy * .55 + xx * .12)) + .5 * Math.sin(yy * 1.1); g.fillStyle = e > .8 ? pal[0] : (v > .35 ? pal[2] : v > -.5 ? pal[1] : pal[0]); g.fillRect(x + xx, y + yy, 1, 1); }
      R(g, pal[0], x - rx + 1, y, rx * 2 - 1, 2); tips.push([x - 1, y - Math.round(ry * .7)]);
    },
    fan: function (g, x, y, s, pal, r, tips) {
      var h = Math.round(s * .95); R(g, pal[0], x, y - 4, 2, 5);
      for (var i = 2; i < h; i++) { var half = Math.round(i * .62) + 1; for (var xx = -half; xx <= half; xx++) { var mesh = ((xx + i * 2) % 3 === 0) || (i % 5 === 0) || Math.abs(xx) >= half - 1; if (!mesh) continue; g.fillStyle = Math.abs(xx) >= half - 1 ? pal[2] : ((xx + i) % 5 === 0 ? pal[2] : pal[1]); g.fillRect(x + xx, y - i - 3, 1, 1); } }
      for (var q = -1; q <= 1; q++) { g.fillStyle = pal[0]; line(g, x + 1, y - 4, x + q * 5, y - h + 1, 1); }
      tips.push([x, y - h]);
    },
    tube: function (g, x, y, s, pal, r, tips) {
      var n = 4 + Math.round(s / 5);
      for (var i = 0; i < n; i++) { var tx = x + Math.round((i - (n - 1) / 2) * 3.4 + (r() - .5) * 2), th = Math.round(s * (.45 + r() * .55)) + 3;
        for (var yy = 0; yy < th; yy++) { g.fillStyle = pal[2]; if (yy < th - 3) g.fillStyle = pal[1]; g.fillRect(tx, y - yy, 1, 1); g.fillStyle = pal[1]; g.fillRect(tx + 1, y - yy, 1, 1); g.fillStyle = pal[0]; g.fillRect(tx + 2, y - yy, 1, 1); }
        R(g, '#03123c', tx + 1, y - th, 1, 1); R(g, pal[2], tx, y - th - 1, 3, 1); if (i % 2 === 0) tips.push([tx + 1, y - th - 1]); }
    },
    table: function (g, x, y, s, pal, r, tips) {
      var w = Math.round(s * 1.1), th = Math.round(s * .4) + 4; R(g, pal[0], x - 1, y - th, 4, th + 1); R(g, pal[1], x - 1, y - th, 1, th);
      for (var layer = 0; layer < 3; layer++) { var ww = w - layer * 7, yy = y - th - layer * 4; if (ww < 6) break;
        for (var xx = -Math.floor(ww / 2); xx <= Math.floor(ww / 2); xx++) { var e = Math.abs(xx) / (ww / 2), dy = Math.round(e * e * 3); g.fillStyle = pal[0]; g.fillRect(x + xx, yy + dy + 1, 1, 3); g.fillStyle = (xx + layer) % 4 === 0 ? pal[2] : pal[1]; g.fillRect(x + xx, yy + dy, 1, 2); if (Math.abs(xx) > ww / 2 - 2) P1(g, pal[2], x + xx, yy + dy - 1); }
        tips.push([x - Math.floor(ww / 2) + 1, yy + 2], [x + Math.floor(ww / 2) - 1, yy + 2]); }
    }
  };
  function coral(g, kind, x, y, s, pal, r, tips) { KINDS[kind](g, Math.round(x), Math.round(y), s, pal, r, tips || []); }
  B.coral = coral; B.PAL = PAL; B.KINDS = Object.keys(KINDS);

  /* ---------- structures (each returns a canvas, base at the bottom edge) ---------- */
  function column(g, x, yb, h, w, broken, seed) {
    for (var i = 0; i < w; i++) { var topJ = broken ? (hash(i, seed, 1) * 5 | 0) + (i % 3 === 0 ? 2 : 0) : 0; for (var y = 0; y < h - topJ; y++) { g.fillStyle = i === 0 ? ST.h : i === 1 ? ST.l : i >= w - 2 ? ST.d : ST.m; if (i === 3 && y % 1 === 0 && i < w - 2) g.fillStyle = ST.l; g.fillRect(x + i, yb - y, 1, 1); } }
    if (!broken) { R(g, ST.h, x - 1, yb - h, w + 2, 1); R(g, ST.l, x - 1, yb - h + 1, w + 2, 2); R(g, ST.d, x - 1, yb - h + 3, w + 2, 1); }
    R(g, ST.l, x - 1, yb - 2, w + 2, 2); R(g, ST.d, x - 1, yb - 1, w + 2, 1);
  }
  function temple() {
    var w = 72, h = 60, c = mk(w, h), g = c.getContext('2d'), yb = h - 3, x, y;
    R(g, ST.d, 0, h - 3, w, 3); R(g, ST.m, 2, h - 5, w - 4, 2); R(g, ST.l, 2, h - 5, w - 4, 1);
    column(g, 6, yb - 2, 40, 7, false, 1); R(g, ST.m, 3, yb - 46, 22, 4); R(g, ST.l, 3, yb - 46, 22, 1); R(g, ST.d, 3, yb - 43, 22, 1); R(g, ST.m, 14, yb - 47, 10, 1);   // architrave piece
    column(g, 20, yb - 2, 29, 7, true, 2);
    column(g, 34, yb - 2, 21, 6, false, 3); column(g, 52, yb - 2, 21, 6, true, 4);
    for (y = -10; y <= 0; y++) for (x = -11; x <= 11; x++) { var d2 = x * x + y * y; if (d2 <= 121 && d2 >= 42) { if (x > 5 && y < -5) continue; if (hash(x, y, 5) > .96) continue; g.fillStyle = (x + y < -9) ? ST.h : (x + y < -4) ? ST.l : (x > 3 ? ST.d : ST.m); g.fillRect(45 + x, yb - 23 + y, 1, 1); } }
    R(g, ST.h, 44, yb - 34, 3, 2);
    for (x = 0; x < 13; x++) { var ey = Math.round(Math.sin(x / 13 * Math.PI) * 4); R(g, ST.m, 58 + x, yb - 5 - ey, 1, ey + 3); R(g, ST.l, 58 + x, yb - 5 - ey, 1, 1); R(g, ST.d, 58 + x, yb - 3, 1, 1); }   // fallen drum
    moss(g, c, 2, 10, 70, 58, 46, 11);
    return c;
  }
  function statue() {
    var w = 28, h = 52, c = mk(w, h), g = c.getContext('2d'), x, y;
    R(g, ST.d, 2, h - 3, 24, 3); R(g, ST.m, 4, h - 11, 20, 8); R(g, ST.l, 4, h - 11, 20, 1); R(g, ST.l, 4, h - 11, 1, 8); R(g, ST.d, 23, h - 11, 1, 8); R(g, ST.m, 3, h - 13, 22, 2); R(g, ST.h, 3, h - 13, 22, 1);
    for (y = 0; y < 22; y++) { var half = 5 + Math.round(y * .22); for (x = -half; x <= half; x++) { var f = (x + 40) % 4 === 0; g.fillStyle = x < -half + 2 ? ST.h : x > half - 2 ? ST.d : f ? ST.l : ST.m; g.fillRect(14 + x, h - 14 - 21 + y, 1, 1); } }
    R(g, ST.m, 10, 17, 9, 8); R(g, ST.l, 10, 17, 2, 8); R(g, ST.d, 18, 17, 1, 8);
    disc(g, 14, 11, 4, ST.m); R(g, ST.l, 11, 9, 2, 3); R(g, ST.h, 11, 8, 2, 1); R(g, ST.d, 17, 11, 1, 3); R(g, '#03123c', 14, 11, 3, 1);
    g.fillStyle = ST.m; line(g, 19, 19, 24, 9, 2); R(g, ST.l, 19, 18, 1, 2); R(g, ST.d, 24, 7, 2, 2); line(g, 9, 20, 7, 31, 2);
    for (x = 10; x < 20; x += 3) if (hash(x, 4, 4) > .3) { R(g, ST.mo, x, 24 + (x % 5), 1, 4); P1(g, ST.mh, x, 24 + (x % 5)); }
    R(g, ST.mo, 6, h - 12, 4, 2);
    return c;
  }
  function steps() {
    var w = 44, h = 22, c = mk(w, h), g = c.getContext('2d');
    for (var i = 0; i < 5; i++) { var th = 3 + i * 3.4 | 0, x0 = i * 8, ww = i === 4 ? 4 : 9; R(g, ST.m, x0, h - th, ww + 1, th); R(g, ST.h, x0, h - th, ww + 1, 1); R(g, ST.l, x0, h - th + 1, ww + 1, 1); R(g, ST.d, x0, h - 1, ww + 1, 1); R(g, ST.d, x0 + ww, h - th + 1, 1, th - 1); }
    R(g, 'rgba(0,0,0,0)', 0, 0, 0, 0); moss(g, c, 0, 2, 40, 22, 14, 21); return c;
  }
  function lighthouse() {
    var w = 30, h = 70, c = mk(w, h), g = c.getContext('2d'), x, y;
    for (y = 0; y < 52; y++) { var half = 6 + Math.round(y * .06), ry = h - 4 - y; for (x = -half; x <= half; x++) { var band = Math.floor(y / 8) % 2; g.fillStyle = x < -half + 2 ? (band ? '#bfe6f4' : ST.h) : x > half - 3 ? (band ? '#4a86bc' : ST.d) : (band ? '#90E0EF' : ST.m); g.fillRect(15 + x, ry, 1, 1); } }
    R(g, ST.d, 7, h - 8, 16, 8); R(g, ST.m, 6, h - 10, 18, 3); R(g, ST.l, 6, h - 10, 18, 1);
    R(g, '#03123c', 13, h - 16, 4, 10); R(g, ST.d, 13, h - 16, 4, 1);
    R(g, '#03123c', 14, h - 34, 2, 5); R(g, '#03123c', 14, h - 50, 2, 5);
    R(g, ST.l, 6, 14, 18, 2); R(g, ST.d, 6, 16, 18, 2); R(g, ST.h, 6, 14, 18, 1);
    R(g, '#0b2a7a', 9, 3, 12, 11);   // lantern room
    R(g, '#48CAE4', 10, 4, 3, 9); R(g, '#1a6a9a', 14, 4, 3, 9); R(g, '#03123c', 18, 4, 2, 4); R(g, '#90E0EF', 11, 6, 1, 3);
    R(g, ST.d, 9, 3, 1, 11); R(g, ST.d, 13, 3, 1, 11); R(g, ST.d, 17, 3, 1, 11); R(g, ST.d, 21, 8, 1, 6);
    for (x = 8; x < 22; x++) { var j = hash(x, 2, 2) * 3 | 0; R(g, ST.m, x, 1 + j, 1, 2); }
    R(g, ST.d, 3, h - 5, 5, 4); R(g, ST.m, 22, h - 5, 6, 4); R(g, ST.l, 22, h - 5, 6, 1); R(g, ST.m, 0, h - 3, 4, 3);
    moss(g, c, 5, 20, 26, 68, 30, 31); return c;
  }
  function pier() {
    var w = 52, h = 38, c = mk(w, h), g = c.getContext('2d'), xs = [3, 12, 22, 33, 44], hs = [26, 34, 20, 36, 24], i, y;
    var W1 = '#6a4a30', W2 = '#4a3020', W3 = '#2a1a10';
    R(g, W2, 2, 14, 12, 3); R(g, W1, 2, 14, 12, 1); R(g, W2, 32, 10, 14, 3); R(g, W1, 32, 10, 14, 1); R(g, W3, 12, 13, 1, 5);
    for (i = 0; i < 5; i++) { var x = xs[i], hh = hs[i]; for (y = 0; y < hh; y++) { var j = y > hh - 3 ? (hash(i, y, 1) > .5 ? 1 : 0) : 0; R(g, W1, x + j, h - 2 - y, 1, 1); R(g, W2, x + 1 + j, h - 2 - y, 2, 1); R(g, W3, x + 3, h - 2 - y, 1, 1); }
      R(g, W1, x, h - 2 - hh - 1, 2, 1);
      for (y = 4; y < hh - 2; y += 5) if (hash(i, y, 2) > .35) { R(g, '#8fb4c0', x + 1, h - 2 - y, 1, 1); }
      for (y = 0; y < hh * .4; y++) if (hash(i, y, 5) > .35) R(g, hash(y, i, 4) > .5 ? '#2f7a6a' : '#4fb89a', x + (y % 3), h - 3 - y, 1, 1);
      if (hash(i, 7, 3) > .3) { var sl = 6 + (hash(i, 9, 1) * 8 | 0); for (y = 0; y < sl; y++) R(g, y % 3 ? '#2f7a6a' : '#4fb89a', x + 2 + Math.round(Math.sin(y * .7 + i) * 1.2), h - 2 - hh + 6 + y, 1, 1); } }
    R(g, W3, 0, h - 2, w, 2); return c;
  }
  function clam(glows) {
    var w = 38, h = 30, c = mk(w, h), g = c.getContext('2d'), x, y, cx = 19, cy = 17;
    // raised upper shell: ridged half-disc behind
    for (y = -16; y <= 0; y++) for (x = -17; x <= 17; x++) { var d = Math.sqrt(x * x + y * y * 1.1), ang = Math.atan2(-y, x); if (d > 16.5 - (Math.floor(ang * 8) % 2 ? 1 : 0)) continue; var rid = Math.floor(ang * 9) % 2; g.fillStyle = d > 15 ? '#cdb0f8' : rid ? '#4a2c9a' : '#6a46c0'; if (d < 6) g.fillStyle = '#3a2280'; g.fillRect(cx + x, cy + y - 1, 1, 1); }
    // open mouth: iridescent mantle
    for (x = -17; x <= 17; x++) { var m = Math.round(Math.sqrt(Math.max(0, 1 - x * x / 324)) * 4); for (y = -m; y <= m + 1; y++) { g.fillStyle = y < -1 ? '#9a8ae8' : y < 1 ? '#48CAE4' : '#2a80d0'; if ((x * 5 + y * 3) % 7 === 0) g.fillStyle = '#CAF0F8'; g.fillRect(cx + x, cy + y, 1, 1); } }
    // lower shell: ridged bowl in front
    for (y = 1; y <= 12; y++) for (x = -17; x <= 17; x++) { var d2 = Math.sqrt(x * x * .9 + y * y * 1.9); if (d2 > 17 - (Math.floor(x / 2) % 2 ? 0 : 1) || y < 3 && Math.abs(x) > 16) continue; var rid2 = Math.floor((x + 40) / 3) % 2; g.fillStyle = y < 3 ? '#cdb0f8' : rid2 ? '#6a4ab4' : '#8a68d8'; if (y > 9) g.fillStyle = rid2 ? '#3a2280' : '#4a2c9a'; g.fillRect(cx + x, cy + y + 2, 1, 1); }
    disc(g, cx, cy + 1, 2, '#ffffff'); P1(g, '#CAF0F8', cx - 1, cy); R(g, '#ADE8F4', cx - 3, cy + 3, 7, 1);
    glows.push({ x: 19, y: 18, c: '202,240,248', r: 9, a: .9 }, { x: 6, y: 17, c: '144,224,239', r: 4, a: .5 }, { x: 32, y: 17, c: '144,224,239', r: 4, a: .5 });
    return c;
  }
  function ribs() {
    var w = 54, h = 44, c = mk(w, h), g = c.getContext('2d'), i, BN = ['#e8f8fc', '#9ac8e0', '#4a7aa8'];
    for (i = 0; i < 6; i++) { var x0 = 7 + i * 7, hh = [30, 38, 36, 34, 22, 28][i], len = 0; var tmax = i === 4 ? .55 : 1;
      for (var t = 0; t <= tmax; t += .015) { var xx = x0 + 15 * (1 - Math.cos(t * Math.PI / 2)) * (1 - i * .03), yy = h - 6 - hh * Math.sin(t * Math.PI / 2 * 1.0) - (t > .9 ? 0 : 0), wd = t < .3 ? 4 : t < .7 ? 3 : 2; R(g, BN[1], xx, yy, wd, 2); R(g, BN[0], xx, yy, 1, 2); R(g, BN[2], xx + wd - 1, yy, 1, 2); } }
    for (i = 0; i < 9; i++) { var vx = 3 + i * 6; R(g, BN[1], vx, h - 8, 5, 5); R(g, BN[0], vx, h - 8, 5, 1); R(g, BN[2], vx, h - 4, 5, 1); R(g, BN[2], vx + 4, h - 7, 1, 3); R(g, BN[0], vx + 1, h - 9, 2, 1); }
    R(g, '#4a7aa8', 0, h - 3, w, 3); for (i = 0; i < 20; i++) if (hash(i, 3, 3) > .4) P1(g, hash(i, 1, 2) > .5 ? '#2f7a6a' : '#4fb89a', 2 + hash(i, 2, 2) * 48 | 0, 6 + hash(i, 5, 2) * 34 | 0);
    return c;
  }
  function vents(info) {
    var w = 44, h = 52, c = mk(w, h), g = c.getContext('2d'), D = ['#061456', '#0e2c7c', '#2a6ac0'], defs = [[8, 28, 9], [19, 44, 11], [31, 22, 8]];
    for (var x = 0; x < w; x++) { var e = Math.sin(x / w * Math.PI), top = h - 4 - Math.round(e * 7); R(g, D[1], x, top, 1, h - top); R(g, D[2], x, top, 1, 1); }
    defs.forEach(function (d, i) { var cx = d[0], hh = d[1], bw = d[2];
      for (var y = 0; y < hh; y++) { var half = Math.round(bw / 2 - y * (bw / 2 - 2) / hh * .8); for (var xx = -half; xx <= half; xx++) { g.fillStyle = xx < -half + 1 ? D[2] : xx > half - 1 ? D[0] : (hash(xx, y, i) > .88 ? '#2ec4b6' : D[1]); g.fillRect(cx + xx, h - 6 - y, 1, 1); } }
      var ty = h - 6 - hh; R(g, '#90E0EF', cx - 2, ty, 5, 1); R(g, '#48CAE4', cx - 3, ty + 1, 7, 1); R(g, '#03092e', cx - 1, ty - 1, 3, 1);
      info.push({ x: cx, y: ty - 1 }); });
    for (var k = 0; k < 14; k++) P1(g, hash(k, 8, 1) > .5 ? '#2ec4b6' : '#48CAE4', 2 + hash(k, 1, 1) * 40 | 0, h - 8 + hash(k, 2, 1) * 5 | 0);
    return c;
  }
  function spire(hh, w, seed) {
    var c = mk(w, hh), g = c.getContext('2d');
    for (var y = 0; y < hh; y++) { var half = Math.max(0, Math.round((w / 2) * Math.pow(y / hh, .75) * 1)), j = hash(y, seed, 1) > .8 ? 1 : 0; for (var x = -half; x <= half; x++) { g.fillStyle = x < -half + 1 ? ST.l : x > half - 2 ? ST.d : (hash(x, y, seed) > .9 ? ST.l : ST.m); g.fillRect(((w / 2) | 0) + x + j, y, 1, 1); } }
    return c;
  }

  /* ---------- the sunken ship (big) ---------- */
  function wreck(meta) {
    var w = 156, h = 108, c = mk(w, h), g = c.getContext('2d'), x, y, i;
    var D = '#120a06', D2 = '#2a1a10', M = '#3e281a', Lw = '#5a3a24', Hh = '#7a5232', planks = ['#3e281a', '#46301e', '#503422'];
    function topY(x) { var t = Math.max(0, (x - 12) / 134); return Math.round(58 - 12 * t - 22 * Math.pow(t, 4)); }
    function botY(x) { var t = Math.max(0, (x - 12) / 134), k = t > .66 ? (t - .66) / .34 : 0; return Math.round(96 + 3 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - 40 * k * k - (t < .05 ? 8 * (1 - t / .05) : 0)); }
    // masts + sail (behind hull)
    g.fillStyle = D2; line(g, 76, 56, 84, 5, 3); g.fillStyle = Lw; line(g, 76, 56, 83, 6, 1); R(g, D2, 82, 3, 3, 2); R(g, D, 80, 2, 2, 1);
    g.fillStyle = D2; line(g, 128, 40, 130, 18, 2); line(g, 118, 21, 144, 24, 1); g.fillStyle = D2; line(g, 40, 17, 118, 24, 2); R(g, Hh, 40, 16, 2, 1);
    for (x = 46; x < 114; x++) { var top = 18 + Math.round((x - 40) * .09), len = 28 + Math.round(8 * Math.sin(x * .33)) - (hash(x, 4, 2) > .78 ? 11 : 0) - (x > 100 ? (x - 100) * 1.1 : 0) - (x < 52 ? (52 - x) * 2.2 : 0);
      for (y = 0; y < len; y++) { if (hash(x, y, 8) > .955 && y > 6) continue; if (Math.abs(x - 80) < 1 && y > 0) continue; var fold = (x % 8) < 2; g.fillStyle = y > len - 3 ? '#6a92b2' : fold ? '#7aa0c0' : ((x + y) % 9 === 0 ? '#c8e2f0' : '#aecbdf'); g.fillRect(x, top + y, 1, 1); } }
    for (i = 0; i < 6; i++) { var lx = 48 + i * 11; R(g, '#6a92b2', lx, 47 + (hash(i, 3, 3) * 8 | 0), 1, 3 + (i % 3)); }
    for (x = 122; x < 142; x++) { var ln = Math.round((x - 120) * .7) + 2; for (y = 0; y < ln; y++) { if (hash(x, y, 6) > .86) continue; R(g, y > ln - 3 ? '#6a92b2' : (x % 5 < 2 ? '#7aa0c0' : '#aecbdf'), x, 22 + Math.round((x - 122) * .35) + y, 1, 1); } }
    g.fillStyle = D; line(g, 82, 6, 16, 48, 1); line(g, 82, 8, 126, 52, 1); line(g, 132, 22, 150, 28, 1); line(g, 78, 20, 34, 52, 1);
    // stern castle
    poly(g, [[12, 38], [46, 42], [46, 64], [12, 64]], function (x, y) { var r = Math.floor((y - 36) / 6); return ((x + r * 13) % 17 === 0 || (y - 36) % 6 === 0) ? D : planks[r % 3]; });
    R(g, Hh, 12, 36, 34, 1); for (x = 13; x < 46; x += 3) if (hash(x, 8, 2) > .35) R(g, M, x, 33 + (x % 4), 2, 4);
    [[17, 42], [27, 42], [37, 42]].forEach(function (p, k) { R(g, D, p[0] - 1, p[1] - 1, 7, 7); R(g, k === 1 ? '#03123c' : '#4fc9d6', p[0], p[1], 5, 5); R(g, D, p[0] + 2, p[1], 1, 5); if (k !== 1) { P1(g, '#ffffff', p[0] + 1, p[1] + 1); meta.ports.push([p[0] + 2, p[1] + 2]); } });
    // hull
    for (x = 12; x <= 147; x++) { var ty = topY(x), by = botY(x); for (y = ty; y <= by; y++) { var row = Math.floor((y - ty) / 6), seam = ((y - ty) % 6 === 0), joint = ((x + row * 19) % 29 === 0); g.fillStyle = seam || joint ? D : planks[(row + (x > 80 ? 1 : 0)) % 3]; if (!seam && !joint && (x * 3 + y) % 17 === 0) g.fillStyle = Lw; g.fillRect(x, y, 1, 1); } R(g, Hh, x, ty, 1, 1); R(g, Lw, x, ty + 1, 1, 1); R(g, D, x, by, 1, 1); }
    R(g, D, 11, topY(12), 1, botY(12) - topY(12));
    // breach with exposed ribs
    var bcx = 86, bcy = 78, rxx = 17, ryy = 12; for (x = bcx - rxx - 2; x <= bcx + rxx + 2; x++) for (y = bcy - ryy - 2; y <= bcy + ryy + 2; y++) { var ee = Math.pow((x - bcx) / rxx, 2) + Math.pow((y - bcy) / ryy, 2) + (hash(x, y, 9) - .5) * .5; if (ee < 1 && y > topY(x) + 7 && y < botY(x) - 3) { g.clearRect(x, y, 1, 1); g.fillStyle = '#04103a'; g.fillRect(x, y, 1, 1); } }
    for (x = bcx - 12; x <= bcx + 12; x += 8) { for (y = bcy - ryy; y <= bcy + ryy; y++) { var pd = g.getImageData(x, y, 1, 1).data; if (pd[0] === 4 && pd[1] === 16) { R(g, D2, x, y, 3, 1); R(g, Lw, x, y, 1, 1); } } }
    // portholes
    [30, 46, 120, 132].forEach(function (px0, k) { var yy = topY(px0) + 15; disc(g, px0, yy, 3, '#9a8a52'); disc(g, px0, yy, 2, k % 2 ? '#2ec4b6' : '#4fc9d6'); P1(g, '#ffffff', px0 - 1, yy - 1); meta.ports.push([px0, yy]); });
    [64, 108].forEach(function (px0) { var yy = topY(px0) + 15; disc(g, px0, yy, 3, '#9a8a52'); disc(g, px0, yy, 2, '#03123c'); });
    // rudder, bowsprit, rail posts
    poly(g, [[8, 56], [13, 54], [13, 88], [9, 92]], D2); R(g, Lw, 9, 58, 1, 28);
    g.fillStyle = D2; line(g, 147, 28, 156 - 1, 18, 2);
    for (x = 52; x < 128; x += 6) if (hash(x, 3, 3) > .3) { var yb = topY(x); R(g, D2, x, yb - 6, 1, 6); R(g, Lw, x, yb - 6, 1, 1); } R(g, D2, 52, topY(52) - 6, 40, 1);
    // algae, barnacles, hanging weed
    for (x = 12; x < 148; x++) { var yb2 = topY(x); if (hash(x, 7, 3) > .45) { R(g, hash(x, 1, 1) > .5 ? '#2f7a6a' : '#1f5a4a', x, yb2 + (hash(x, 2, 2) * 6 | 0), 1, 1 + (hash(x, 3, 3) * 3 | 0)); } if (hash(x, 9, 9) > .9) R(g, '#4fb89a', x, yb2 + 2, 2, 2); }
    for (x = 16; x < 146; x += 7) if (hash(x, 5, 5) > .35) { var yb3 = topY(x) + 6, len = 6 + (hash(x, 8, 8) * 14 | 0); for (i = 0; i < len; i++) R(g, i % 4 ? '#2f7a6a' : '#4fb89a', x + Math.round(Math.sin(i * .6 + x) * 1.4), yb3 + i, 1, 1); }
    for (x = 12; x < 146; x += 2) for (y = topY(x) + 4; y < botY(x) - 2; y += 4) if (hash(x, y, 4) > .93) P1(g, '#9ac0cc', x, y);
    for (x = 14; x < 144; x += 3) if (hash(x, 6, 6) > .5) R(g, '#4a7a6a', x, botY(x) - 4, 2, 3);
    return c;
  }
  function chest(meta) {
    var w = 48, h = 38, c = mk(w, h), g = c.getContext('2d'), x, y;
    var D = '#150b06', W2 = '#46301e', W1 = '#6a4a2c', W0 = '#8a6238', IR = '#46586e', IL = '#8aa0b8', G0 = '#c9a02e', G1 = '#e8c14a', G2 = '#fff1a0';
    // open lid, seen from inside (hinged behind the box)
    poly(g, [[6, 17], [42, 17], [40, 1], [8, 1]], function (x, y) { return y < 3 || x < 9 || x > 38 ? W1 : (y % 5 === 0 ? '#2a1a60' : '#3a2a7a'); });
    R(g, D, 8, 0, 33, 1); R(g, D, 7, 1, 1, 16); R(g, D, 40, 1, 1, 16); R(g, IR, 14, 1, 3, 15); R(g, IR, 31, 1, 3, 15); R(g, IL, 14, 1, 1, 15); R(g, IL, 31, 1, 1, 15); P1(g, G1, 15, 4); P1(g, G1, 32, 4); P1(g, G1, 15, 12); P1(g, G1, 32, 12);
    // box
    R(g, D, 3, 17, 42, 18); R(g, W2, 4, 18, 40, 16); for (y = 20; y < 34; y += 4) R(g, D, 4, y, 40, 1); for (x = 4; x < 44; x++) for (y = 18; y < 34; y++) if ((x * 7 + y * 3) % 11 === 0) P1(g, W1, x, y);
    R(g, W1, 4, 18, 40, 2); R(g, W0, 4, 18, 40, 1); R(g, IR, 8, 18, 4, 16); R(g, IR, 22, 18, 4, 16); R(g, IR, 36, 18, 4, 16); R(g, IL, 8, 18, 1, 16); R(g, IL, 22, 18, 1, 16); R(g, IL, 36, 18, 1, 16);
    [[8, 20], [11, 20], [36, 20], [39, 20], [8, 31], [39, 31]].forEach(function (p) { P1(g, G1, p[0], p[1]); });
    R(g, G0, 20, 24, 8, 7); R(g, G1, 21, 24, 6, 2); R(g, D, 23, 27, 2, 3); R(g, D, 3, 34, 42, 2);
    // gold heap
    for (x = 8; x < 40; x++) { var top = 15 - Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((x - 24) / 17, 2))) * 8) + (hash(x, 1, 1) > .8 ? 1 : 0); for (y = top; y < 19; y++) { g.fillStyle = (x * 3 + y * 5) % 7 === 0 ? G2 : ((x + y) % 3 ? G1 : G0); g.fillRect(x, y, 1, 1); } }
    var gems = [[14, 10, '#48CAE4'], [20, 8, '#c9a0ff'], [27, 9, '#ffffff'], [33, 11, '#ff8ac8'], [24, 12, '#2ec4b6'], [17, 13, '#ff8ac8'], [30, 14, '#48CAE4']];
    gems.forEach(function (q) { R(g, q[2], q[0], q[1], 2, 2); P1(g, '#ffffff', q[0], q[1]); });
    R(g, G2, 24, 6, 1, 1); R(g, G2, 11, 12, 1, 1);
    // spill over the lip + coins on the sand
    for (y = 19; y < 35; y++) { var sx = 29 + Math.round((y - 19) * .35 + Math.sin(y) * 1.5); if (hash(y, 3, 3) > .25) { R(g, y % 3 ? G1 : G2, sx, y, 2, 1); R(g, G0, sx + 1, y, 1, 1); } }
    [[34, 33], [38, 35], [30, 36], [41, 36], [26, 36], [44, 34], [18, 36]].forEach(function (p, i) { R(g, i % 2 ? G1 : G0, p[0], p[1], 2, 1); P1(g, G2, p[0], p[1] - 1 + 1); });
    R(g, '#48CAE4', 36, 36, 2, 1); R(g, '#ff8ac8', 22, 37, 2, 1);
    meta.mouth = [24, 10]; return c;
  }

  /* ---------- the painter ---------- */
  B.paint = function (gm, W, Hh, r, S) {
    var out = { glows: [], vents: [], avoid: [], chest: null, wx: 0, ports: [] }, k = Math.max(.62, Math.min(1, W / 330)), kc = Math.max(.7, Math.min(1, W / 260)), wk = Math.max(.6, Math.min(1, W / 300));
    function floorY(x) { var xx = Math.max(0, Math.min(W - 1, Math.round(x))); return Hh - Math.round(5 + 2.5 * Math.sin(xx * .05) + 1.5 * Math.sin(xx * .13 + 2)); }
    function boxOf(spr, cx, kk) { var s = sub(spr, kk), x = Math.round(cx - s.width / 2); x = Math.max(0, Math.min(W - s.width, x)); return { s: s, x: x, y: Math.round(floorY(x + s.width / 2) + 3 - s.height + (spr._sink || 0) * kk), w: s.width, h: s.height, k: kk }; }
    function put(g, spr, cx, kk) { var b = boxOf(spr, cx, kk); g.drawImage(b.s, b.x, b.y); return b; }
    var i, tips, wmeta = { ports: [] }, wr = wreck(wmeta); wr._sink = 12;
    var wW = wr.width * wk, wcx = Math.max(wW / 2 + 2, Math.min(W - wW / 2 - 2, W * .62)), wl = wcx - wW / 2, wrr = wcx + wW / 2, Lsp = wl, Rsp = W - wrr;
    function addGlows(list, box) { list.forEach(function (q) { out.glows.push({ x: box.x + q.x * box.k, y: box.y + q.y * box.k, c: q.c, r: q.r, a: q.a, ph: r() * 6 }); }); }
    // --- back layer: ruins, ribs, spires (hazed, behind everything) ---
    var back = mk(W, Hh), gb = back.getContext('2d');
    [[.2, 40 + (r() * 8 | 0), 14], [.47, 30, 11], [.97, 36, 12], [.58, 46, 16], [.88, 30, 11]].forEach(function (sp, j) { put(gb, spire(sp[1], sp[2], 10 + j), W * sp[0], k * .9); });
    put(gb, lighthouse(), Math.max(18, Lsp * .14), k);
    put(gb, temple(), Lsp * .6, k * .95);
    if (Rsp > 26) put(gb, ribs(), wrr + Rsp * .5, k * .9);
    if (Rsp > 100) { put(gb, steps(), wrr + Rsp * .32, k * .9); put(gb, statue(), wrr + Rsp * .62, k * .95); }
    else if (W > 380) { put(gb, statue(), W * .08 + Lsp * .38, k * .95); }
    gb.globalCompositeOperation = 'source-atop'; gb.fillStyle = 'rgba(3,12,90,.18)'; gb.fillRect(0, 0, W, Hh); gb.globalCompositeOperation = 'source-over';
    gm.drawImage(back, 0, -2);
    // --- coral: back row (dimmer) ---
    var rowN = Math.round(W / 30), kinds = B.KINDS;
    for (i = 0; i < rowN; i++) { var cx = W * (i + .2 + r() * .6) / rowN, pal = PAL[(i * 2 + 1) % PAL.length].map(function (c) { return px.css(px.mix3(px.parse(c), [6, 18, 100], .4)); }); tips = []; coral(gm, kinds[(i + 2) % kinds.length], cx, floorY(cx) - 2, 18 + r() * 10, pal, r, tips); }
    // --- front structures ---
    var pbox = put(gm, pier(), Math.max(22, Lsp * .1) + 4, kc * .9);
    var wbox = put(gm, wr, wcx, wk);
    var cmeta = {}, chs = chest(cmeta), ccx = Math.max(chs.width * kc / 2 + 4, Lsp * .43 + 6), cbox = boxOf(chs, ccx, kc);
    var gR = 26 * kc; for (i = 0; i < 4; i++) disc(gm, Math.round(cbox.x + cmeta.mouth[0] * kc), Math.round(cbox.y + cmeta.mouth[1] * kc + 3), Math.round(gR * (1 - i * .22)), 'rgba(255,226,120,' + (.05 + i * .02).toFixed(2) + ')');
    gm.drawImage(cbox.s, cbox.x, cbox.y);
    var clglows = [], cl = clam(clglows), clbox = null, gapL = cbox.x + cbox.w + 2, gapR = wl - 2;
    if (gapR - gapL >= 30) { clbox = put(gm, cl, (gapL + gapR) / 2, kc * .95); }
    var vinfo = [], vs = vents(vinfo), vbox = put(gm, vs, Math.min(W - 24 * kc, wrr - 4), kc);
    if (wbox) { out.wx = wbox.x + wbox.w * .42; out.avoid.push([wbox.x - 6, wbox.x + wbox.w + 6]); wmeta.ports.forEach(function (p) { out.ports.push({ x: wbox.x + p[0] * wbox.k, y: wbox.y + p[1] * wbox.k }); }); }
    out.chest = { x: cbox.x + cmeta.mouth[0] * kc, y: cbox.y + cmeta.mouth[1] * kc }; out.avoid.push([cbox.x - 4, cbox.x + cbox.w + 4]);
    out.glows.push({ x: out.chest.x, y: out.chest.y + 2, c: '255,226,120', r: 14, a: 1, ph: 0 });
    if (clbox) { addGlows(clglows, clbox); out.avoid.push([clbox.x - 3, clbox.x + clbox.w + 3]); }
    vinfo.forEach(function (v) { out.vents.push({ x: vbox.x + v.x * vbox.k, y: vbox.y + v.y * vbox.k }); out.glows.push({ x: vbox.x + v.x * vbox.k, y: vbox.y + v.y * vbox.k + 1, c: '72,202,228', r: 7, a: .9, ph: r() * 6 }); }); out.avoid.push([vbox.x - 3, vbox.x + vbox.w + 3]);
    out.avoid.push([pbox.x - 3, pbox.x + pbox.w + 3]);
    out.ports.forEach(function (p, j) { out.glows.push({ x: p.x, y: p.y, c: '72,214,214', r: 4, a: .45, ph: j * 1.7 }); });
    // --- coral: front reef (species + glow tips), skipping the structures ---
    var fN = Math.max(6, Math.round(W / 20));
    for (i = 0; i < fN; i++) { var fx = W * (i + .25 + r() * .5) / fN, bad = false; var onW = fx > wbox.x + 6 && fx < wbox.x + wbox.w - 6; out.avoid.forEach(function (a, ai2) { if (ai2 === 0 && wbox) return; if (fx > a[0] - 14 && fx < a[1] + 14) bad = true; }); if (bad) continue;
      var pl = PAL[(i * 5 + 2) % PAL.length], kd = kinds[(i * 3 + 1) % kinds.length], sz = (onW ? 13 : 18) + r() * (onW ? 7 : 14); tips = []; coral(gm, kd, fx, floorY(fx) - 1, sz, pl, r, tips);
      if (tips.length && i % 2 === 0) { var tp = tips[(r() * tips.length) | 0]; out.glows.push({ x: tp[0], y: tp[1], c: '144,240,255', r: 4, a: .6, ph: r() * 6 }); P1(gm, '#ffffff', tp[0], tp[1]); } }
    // small coral clumps tucked against the structures (layered depth)
    out.avoid.forEach(function (a, ai) { [a[0] - 2, a[1] + 3].forEach(function (cx, j) { if (cx < 6 || cx > W - 6) return; var inside = false; out.avoid.forEach(function (o, oi) { if (oi !== ai && cx > o[0] - 6 && cx < o[1] + 6) inside = true; }); if (inside) return; tips = []; coral(gm, ['staghorn', 'tube', 'brain'][(ai + j) % 3], cx, floorY(cx) - 1, 12 + r() * 6, PAL[(ai * 2 + j + 3) % PAL.length], r, tips); }); });
    return out;
  };
  B.nearCoral = function (g, W, nh, r) {
    var pals = [['#02052e', '#050f58', '#0b2d7c'], ['#0c0626', '#190b3a', '#2a1a5a']], kinds = ['staghorn', 'fan', 'tube', 'table', 'staghorn'], n = Math.max(3, Math.round(W / 70));
    for (var i = 0; i < n; i++) coral(g, kinds[i % kinds.length], W * (i + .3 + r() * .4) / n, nh - 1, 14 + r() * 8, pals[i % 2], r, []);
  };
  B.farCoral = function (g, W, Hh, r) {
    var n = Math.round(W / 46), kinds = ['staghorn', 'fan', 'table', 'tube'];
    g.globalAlpha = .62; for (var i = 0; i < n; i++) { var p = PAL[(i * 2) % PAL.length].map(function (c) { return px.css(px.mix3(px.parse(c), [6, 40, 120], .55)); }); coral(g, kinds[i % 4], W * (i + .2 + r() * .6) / n, Hh - 28 + Math.round(r() * 8), 12 + r() * 8, p, r, []); } g.globalAlpha = 1;
  };
  B._t = { temple: temple, statue: statue, steps: steps, lighthouse: lighthouse, pier: pier, clam: clam, ribs: ribs, vents: vents, spire: spire, wreck: wreck, chest: chest };
  SOT.seabed = B;
})();
