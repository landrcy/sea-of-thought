/* Sea of Thought — nine bottle shapes (procedural pixel art), seals, tints, rocks. Shape/tint/seal are chosen from the bottle number. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, hash = px.hash;
  function rep(h, n) { var o = []; for (var i = 0; i < n; i++) o.push(h); return o; }
  function ramp(a, b, n) { var o = []; for (var i = 0; i < n; i++) o.push(Math.round(a + (b - a) * (i + .5) / n)); return o; }
  function circ(r) { var o = []; for (var x = 0; x <= 2 * r; x++) o.push(Math.max(1, Math.floor(Math.sqrt(r * r - (x - r) * (x - r) + .6)))); return o; }
  /* prof: half-height per column (bottom → neck, neck points right). body = number of columns that hold the scroll. */
  var SHAPES = [
    { name: 'longneck', prof: [2, 3].concat(rep(4, 11), [3, 2], rep(1, 8), rep(2, 2)), body: 15, cy: 6, seal: 'cork', sw: 4, sh: 5 },
    { name: 'flask', prof: circ(7).concat(rep(2, 6), [3]), body: 14, cy: 7, seal: 'cork', sw: 3, sh: 5 },
    { name: 'square', prof: [3].concat(rep(5, 13), [3], rep(2, 5), [3]), body: 14, cy: 5, seal: 'wax', sw: 3, sh: 6 },
    { name: 'jug', prof: [4, 5].concat(rep(6, 11), [5, 4], rep(3, 4), [4]), body: 13, cy: 10, seal: 'cork', sw: 3, sh: 7, handle: [3, 8] },
    { name: 'vial', prof: [1].concat(rep(2, 9), rep(1, 3), [2]), body: 9, cy: 4, seal: 'cork', sw: 2, sh: 3 },
    { name: 'wine', prof: [2, 3].concat(rep(4, 17), [3, 3, 2, 2, 1, 1], rep(1, 5), [2, 2]), body: 19, cy: 5, seal: 'wax', sw: 4, sh: 5 },
    { name: 'lantern', prof: [4].concat(rep(6, 11), [5], rep(4, 2)), body: 12, cy: 10, seal: 'lid', sw: 3, sh: 8, wire: true },
    { name: 'twisted', prof: [2, 3].concat(rep(3, 14), [2, 2], rep(1, 6), [2]), body: 14, cy: 8, seal: 'cork', sw: 3, sh: 4, twist: true },
    { name: 'potion', prof: [4, 6, 6].concat(ramp(6, 2, 9), rep(1, 6), [2]), body: 10, cy: 7, seal: 'wax', sw: 3, sh: 5 }
  ];
  var TINTS = [[190, 236, 238], [168, 228, 184], [150, 226, 222], [160, 202, 240], [132, 206, 168], [205, 225, 245], [120, 190, 220]];
  var WAX = [['#0077B6', '#48CAE4', '#03045E'], ['#1f8a78', '#6fd8b8', '#0a3c3a'], ['#90E0EF', '#ffffff', '#0096C7'], ['#4a3aa0', '#9a8ae0', '#1c1450']];
  var LEVELS = ['', 'rgba(0,119,182,.16)', 'rgba(2,62,138,.34)', 'rgba(3,4,94,.5)'];
  var cache = {};
  function inMask(sh, x, y) {   // glass mask with twist offset
    var P = sh.prof; if (x < 0 || x >= P.length) return false;
    var off = sh.twist && x < 17 ? Math.round(1.2 * Math.sin(x * .45)) : 0;
    return Math.abs(y - sh.cy - off) <= P[x];
  }
  function build(si, ti, wi, level, opt) {
    opt = opt || {};
    var sh = SHAPES[si], P = sh.prof, len = P.length, W = len + sh.sw + 2, H = sh.cy * 2 + 3, c = mk(W, H), g = c.getContext('2d'), T = TINTS[ti % TINTS.length];
    var glass = 'rgba(' + T.join(',') + ',.46)', deep = 'rgba(' + T.map(function (v) { return v * .6 | 0; }).join(',') + ',.62)', out = 'rgba(' + T.map(function (v) { return v * .26 | 0; }).join(',') + ',.97)';
    var cy = sh.cy + 1;
    function at(x, y) { return inMask(sh, x, y - 1); }
    var x, y;
    for (y = 0; y < H; y++) for (x = 0; x < len; x++) {
      if (!at(x, y)) continue;
      var edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      g.fillStyle = edge ? out : (!at(x, y + 1) || (!at(x, y + 2) && y > cy)) ? deep : glass; g.fillRect(x, y, 1, 1);
    }
    // handle / wire loop
    if (sh.handle) { g.fillStyle = out; var hx = sh.handle[0], ht = cy - P[hx] - 1; g.fillRect(hx, ht - 3, 6, 1); g.fillRect(hx, ht - 3, 1, 4); g.fillRect(hx + 5, ht - 3, 1, 4); g.fillStyle = glass; g.fillRect(hx + 1, ht - 2, 4, 2); }
    if (sh.wire) { g.fillStyle = '#9db4c8'; for (x = 2; x <= 10; x++) { var yy = Math.round(cy - P[x] - 1 - 3 * Math.sin((x - 2) / 8 * Math.PI)); g.fillRect(x, yy, 1, 1); } g.fillStyle = '#e8f4fa'; g.fillRect(6, cy - P[6] - 4, 1, 1); }
    // rolled scroll with twine + handwriting, sized from the body
    var bh = Math.min(P[Math.floor(sh.body / 2)] - 1, 3), sx0 = 2, sx1 = sh.body - 2, sw = sx1 - sx0 + 1;
    if (sw >= 5 && bh >= 1 && !opt.noScroll) {
      var sy0 = cy - bh + 1, sh2 = bh * 2 - 1; if (sh2 < 3) sh2 = 3; var top = cy - Math.floor(sh2 / 2);
      g.fillStyle = '#c9a46a'; g.fillRect(sx0, top, sw, sh2); g.fillStyle = '#f3dfae'; g.fillRect(sx0, top, sw, Math.max(1, sh2 - 1)); g.fillStyle = '#fff1cf'; g.fillRect(sx0, top, sw, 1);
      g.fillStyle = '#b08a4e'; g.fillRect(sx0, top, 1, sh2); g.fillRect(sx1, top, 1, sh2);
      g.fillStyle = '#5b3d22'; for (x = sx0 + 2; x < sx1 - 1; x += 2) if (hash(x, si, ti) > .35) g.fillRect(x, top + (sh2 > 3 ? 1 : 0), 1, 1);
      g.fillStyle = '#6b8aa8'; var tx = sx0 + Math.floor(sw / 2); g.fillRect(tx, top - 1, 1, sh2 + 2);   // twine (cool blue-grey)
    }
    // glass highlights
    g.fillStyle = 'rgba(255,255,255,.9)'; for (x = 3; x < Math.min(len - 6, 14); x++) if (at(x, cy - P[x] + 1) && !at(x, cy - P[x] - 1 + 0)) g.fillRect(x, cy - P[x] + 1, 1, 1);
    g.fillStyle = 'rgba(255,255,255,.8)'; if (at(1, cy)) g.fillRect(1, cy - 1, 1, 2); g.fillRect(Math.min(len - 8, 9), cy - 1 - Math.max(0, P[Math.min(len - 8, 9)] - 2), 2, 1);
    // seal at the neck
    var sx = len, sH = sh.sh, s0 = cy - Math.floor(sH / 2);
    if (opt.noSeal) {}
    else if (sh.seal === 'cork') { g.fillStyle = '#6d3f1a'; g.fillRect(sx, s0, sh.sw, sH); g.fillStyle = '#a8672e'; g.fillRect(sx, s0, sh.sw, Math.ceil(sH / 2)); g.fillStyle = '#d19a58'; g.fillRect(sx + 1, s0, Math.max(1, sh.sw - 2), 1); g.fillStyle = '#4a2a10'; g.fillRect(sx + sh.sw - 1, s0 + 1, 1, sH - 2); }
    else if (sh.seal === 'wax') { var wc = WAX[wi % WAX.length]; g.fillStyle = wc[2]; g.fillRect(sx - 1, s0, sh.sw + 1, sH); g.fillStyle = wc[0]; g.fillRect(sx - 1, s0, sh.sw, sH - 1); g.fillStyle = wc[1]; g.fillRect(sx, s0, sh.sw - 1, 1); g.fillStyle = wc[2]; g.fillRect(sx + 1, s0 + Math.floor(sH / 2), 1, 1); g.fillStyle = wc[0]; g.fillRect(sx - 1, s0 + sH, 2, 2); g.fillRect(sx + 2, s0 + sH, 1, 1); }
    else { g.fillStyle = '#34506c'; g.fillRect(sx, s0, sh.sw, sH); g.fillStyle = '#7a9ab8'; g.fillRect(sx, s0, sh.sw, 2); g.fillStyle = '#c4dcec'; g.fillRect(sx, s0, sh.sw, 1); g.fillStyle = '#1e3248'; g.fillRect(sx + sh.sw - 1, s0 + 1, 1, sH - 1); }
    if (level && LEVELS[level]) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = LEVELS[level]; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    return { c: c, w: W, h: H, cx: Math.round((len + sh.sw) / 2), cy: cy, shape: si, len: len, sw: sh.sw };
  }
  function spr(si, ti, wi, level, opt) { var k = si + '|' + ti + '|' + wi + '|' + level + (opt ? '|' + (opt.noScroll ? 1 : 0) + (opt.noSeal ? 1 : 0) : ''); return cache[k] || (cache[k] = build(si, ti, wi, level, opt)); }
  var ROCKS = [['..ddd..', '.dabbd.', 'dabbbcd', 'dbbbccd', '.dccccd', '..ddd..'], ['..dddd..', '.dabbbd.', 'dabbbbcd', 'dbbbcccd', '.dddddd.'], ['.ddd.', 'dabbd', 'dbbcd', '.dcd.']], rockC = {};
  var RP = { d: '#1c2740', a: '#a9bccf', b: '#6f859c', c: '#47596f' };
  function rock(i) { return rockC[i] || (rockC[i] = px.sprCanvas(ROCKS[i % 3], RP)); }
  function pick(n, id) { var h = hash(n | 0, 77, 5); return { shape: ((n | 0) + (h * 3 | 0)) % SHAPES.length, tint: Math.floor(hash(n | 0, 11, 2) * TINTS.length), wax: Math.floor(hash(n | 0, 13, 3) * WAX.length) }; }
  function level(depthFrac) { return depthFrac < .12 ? 0 : depthFrac < .4 ? 1 : depthFrac < .7 ? 2 : 3; }
  /* draw a bottle (rotated about its centre) and the rocks hanging from it */
  function draw(g, b, x, y, ang, lv, T) {
    var s = spr(b.shape, b.tint, b.wax, lv);
    if (b.rocks) { g.fillStyle = 'rgba(160,190,215,.75)'; for (var i = 0; i < b.rocks; i++) { var rx = Math.round(x + (i - (b.rocks - 1) / 2) * 7 + Math.sin(T * 1.1 + i + b.ph) * 1.5), ry = Math.round(y + s.h / 2 + 5 + i % 2 * 5 + Math.sin(T * .9 + i) * 1);
        g.fillRect(Math.round(x + (rx - x) * .4), Math.round(y + 1), 1, 1); var steps = ry - y, sx = x; for (var k = 2; k < steps; k++) g.fillRect(Math.round(x + (rx - x) * k / steps), Math.round(y + k), 1, 1);
        g.drawImage(rock(i + b.n), rx - 3, ry); } }
    g.save(); g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(ang); g.drawImage(s.c, -s.cx, -s.cy); g.restore();
  }
  SOT.bottles = { SHAPES: SHAPES, spr: spr, rock: rock, pick: pick, level: level, draw: draw, TINTS: TINTS, size: function (si) { var sh = SHAPES[si]; return { w: sh.prof.length + sh.sw + 2, h: sh.cy * 2 + 3 }; } };
})();
