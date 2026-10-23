/* Sea of Thought — marine life sprites + drawing (procedural pixel art). Depth zones: shallows · midwater · deep · seabed. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, line = px.line, hash = px.hash, rng = px.rng, disc = px.disc, L = {};
  function flip(c) { var o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
  function lerpc(a, b, t) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  var hex = px.parse;
  /* ---- fish: 4-tone shading (back / upper / mid / belly) with ordered-dither tone seams, lateral sheen, gill line, patterns,
         translucent ray fins, a flexing tail (4 frames) and optional bioluminescent photophores. Returns [right[4], left[4]]. ---- */
  var FR = 4, FLEX = [-1, 0, 1, 0];
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function cs(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function fish(sp) {
    var len = sp.len, hh = sp.hh, tail = Math.max(3, Math.round(len * (sp.tail || .32))), fh = Math.max(2, Math.round(hh * (sp.fin1 || .42))), pad = fh + 3, w = len + tail + 1, h = hh + pad * 2 + 4, cy = Math.floor(h / 2);
    var T = hex(sp.top), B = hex(sp.belly), Mc = sp.mid ? hex(sp.mid) : mixc(T, B, .5), F = hex(sp.fin || sp.top), W = [255, 255, 255];
    var tones = [T, mixc(T, Mc, .6), Mc, B], HL = mixc(B, W, .55), OL = mixc(T, [3, 4, 94], .5), seed = sp.seed || 1, out = [];
    var skew = sp.skew || .82, pw = sp.pw || .7, ped = sp.ped || .75, amp = Math.max(1, Math.round(hh * .22)) * (sp.flex == null ? 1 : sp.flex);
    for (var f = 0; f < FR; f++) {
      var c = mk(w, h), g = c.getContext('2d'), flex = FLEX[f] * amp, topY = [], botY = [], hf = [], x, y, u, k;
      function px_(X, Y, col, a) { if (a != null && a < .5) { if (a < .25 || ((X + Y) & 1)) return; } g.fillStyle = cs(col); g.fillRect(X, Y, 1, 1); }   /* crisp pixel art: no translucent pixels, soft tones become a checker dither */
      /* tail (behind the body): rays alternate bright/translucent */
      var tt = sp.tailType || 'fork', span0 = hh * (tt === 'lunate' ? .75 : tt === 'round' ? .5 : .6) + 1;
      for (x = 0; x < tail; x++) { var fr = (tail - x) / tail, sp2 = Math.round((tt === 'round' ? Math.sin(Math.PI * (x + 1) / (tail + 1)) * 1.1 : fr) * span0), sh = Math.round(flex * (.3 + fr * 1.1)), notch = tt === 'round' ? -1 : (fr > .45 ? Math.round((fr - .45) / .55 * sp2 * .55) : -1);
        for (y = -sp2; y <= sp2; y++) { if (Math.abs(y) <= notch && Math.abs(y) < sp2) continue; if (tt === 'round') px_(x, cy + y + sh, Math.abs(y) === sp2 ? mixc(F, W, .25) : F, .8); else px_(x, cy + y + sh, y % 2 === 0 ? mixc(F, W, .3) : F, y % 2 === 0 ? .9 : .62); } }
      /* body */
      for (x = 0; x < len; x++) {
        var t = (x + .5) / len, half = Math.max(ped, hh / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, skew)), pw)), r = Math.max(0, Math.round(half - .15)), s = Math.round(flex * (sp.bend == null ? .55 : sp.bend) * Math.pow(1 - t, 1.6)), yc = cy + s, X = tail + x;
        topY[x] = yc - r; botY[x] = yc + r; hf[x] = half;
        for (y = -r; y <= r; y++) {
          var fy = r === 0 ? .5 : (y + r) / (2 * r), ti = fy < .24 ? 0 : fy < .47 ? 1 : fy < .7 ? 2 : 3, edge = [.24, .47, .7];
          for (var q = 0; q < 3; q++) if (Math.abs(fy - edge[q]) < .1 && ((X + y) & 1) && ti === q) ti = q + 1;   /* ordered dither at each tone seam */
          var col = tones[ti], a = 1;
          if (sp.pat === 'scales' && ((X + 2 * y) & 3) === 0 && fy > .12 && fy < .8) col = mixc(col, HL, .22);
          if (sp.pat === 'wavy' && fy < .5 && ((X * 2 + y + 40) % 5 === 0)) col = mixc(col, OL, .6);
          if (sp.pat === 'spots' && fy < .75 && fy > .1 && hash(X * 3 + seed, y * 5 + 7, seed) < .16) col = hex(sp.pc);
          if (sp.pat === 'speckle' && hash(X * 3 + seed, y * 5 + 7, seed) < .22) col = mixc(col, OL, .45);
          if (sp.bars) for (var bi = 0; bi < sp.bars.length; bi++) { var bx = Math.round(len * sp.bars[bi]), bw = sp.bw || 1; if (x >= bx && x < bx + bw) col = hex(sp.pc); else if (sp.be && (x === bx - 1 || x === bx + bw)) col = hex(sp.be); }
          if (sp.band && Math.abs(fy - sp.band[0]) < .09 && x > len * .2 && x < len * .9) col = hex(sp.band[1]);
          if (sp.band2 && Math.abs(fy - sp.band2[0]) < .09 && x > len * .25 && x < len * .85) col = hex(sp.band2[1]);
          if (y === -r && hh >= 4) col = sp.rim ? hex(sp.rim) : mixc(col, OL, .55);                  /* back rim: dark outline (or a rim light for deep species) */
          else if (y === r && hh >= 5 && ti === 3) col = mixc(col, OL, .18);
          if (x === Math.round(len * .8) && hh >= 5 && fy > .12 && fy < .85) col = mixc(col, OL, .38);   /* gill line */
          if (x === len - 1) col = mixc(col, OL, .5);
          px_(X, yc + y, col, a);
        }
        if (len >= 12 && sp.sheen !== false) { var ly = Math.round(yc - r + (2 * r) * .42); if (x > len * .22 && x < len * .78 && (x & 1) === 0) px_(X, ly, HL, .45); }
        if (sp.glow && x > len * .28 && x < len * .86 && ((x + seed) % 3 === 0)) px_(X, yc + Math.round(half * .55), hex(sp.glow), 1);
      }
      /* dorsal fin(s) */
      var dm = sp.dorsal || 'single', segs = dm === 'none' ? [] : dm === 'double' ? [[.28, .46, 1], [.5, .64, .6]] : dm === 'long' ? [[.2, .66, .7]] : dm === 'sail' ? [[.3, .62, 1.5]] : [[.3, .6, 1]];
      segs.forEach(function (sg) { var x0 = Math.round(len * sg[0]), x1 = Math.round(len * sg[1]), H0 = Math.max(2, Math.round(fh * sg[2])); for (x = x0; x <= x1; x++) { u = (x - x0) / Math.max(1, x1 - x0); var hgt = Math.max(1, Math.round(H0 * Math.sin(Math.PI * (u * .75 + .08)) * (dm === 'long' ? .7 : 1))); for (var k = 1; k <= hgt; k++) px_(tail + x, topY[x] - k, k === hgt ? mixc(F, W, .35) : F, (x - x0) % 2 === 0 ? .85 : .55); } });
      /* anal + pelvic fin */
      if (sp.anal !== false) { var ax0 = Math.round(len * .32), ax1 = Math.round(len * .52), AH = Math.max(1, Math.round(fh * .6)); for (x = ax0; x <= ax1; x++) { u = (x - ax0) / Math.max(1, ax1 - ax0); var ah = Math.max(1, Math.round(AH * Math.sin(Math.PI * (u * .7 + .12)))); for (k = 1; k <= ah; k++) px_(tail + x, botY[x] + k, F, (x - ax0) % 2 === 0 ? .8 : .5); } }
      if (sp.finlets) { for (x = Math.round(len * .12); x < len * .3; x += 2) { px_(tail + x, topY[x] - 1, hex(sp.finlets), 1); px_(tail + x, botY[x] + 1, hex(sp.finlets), 1); } }
      /* pectoral fin: flaps */
      if (hh >= 4) { var pxx = Math.round(len * .7), pyy = Math.round((topY[pxx] + botY[pxx]) / 2 + hf[pxx] * .25), fl2 = [0, 1, 1, 0][f], fL = Math.max(2, Math.round(len * .12)); for (var m = 0; m < fL; m++) px_(tail + pxx - m, pyy + Math.round(m * .5) + fl2, mixc(F, W, .25), m === fL - 1 ? .5 : .78); }
      /* jaw/snout + eye */
      var ex = tail + len - 1 - Math.max(2, Math.round(len * .16)), exi = ex - tail, ey = Math.round((topY[exi] + botY[exi]) / 2 - hf[exi] * .22);
      if (hh >= 3) { var big = hh >= 8 || sp.bigEye; if (big) { px_(ex, ey, sp.eyeGlow ? hex(sp.eyeGlow) : W, 1); px_(ex + 1, ey, [3, 4, 94], 1); px_(ex, ey + 1, [3, 4, 94], 1); px_(ex + 1, ey + 1, [3, 4, 94], 1); px_(ex, ey - 1, mixc(tones[1], OL, .4), .8); } else { px_(ex, ey, sp.eyeGlow ? hex(sp.eyeGlow) : W, 1); if (hh >= 5) px_(ex + 1, ey, [3, 4, 94], 1); } }
      if (len >= 14) px_(tail + len - 1, Math.round((topY[len - 1] + botY[len - 1]) / 2) + 1, [3, 4, 94], .7);
      out.push(c);
    }
    var R = out, Lf = out.map(flip); return [R, Lf];
  }
  function fishPair(sp) { var a = fish(sp), sm = {}; for (var k in sp) sm[k] = sp[k]; sm.len = Math.max(5, sp.len - Math.max(1, Math.round(sp.len * .22))); sm.hh = Math.max(2, sp.hh - 1); sm.seed = (sp.seed || 1) + 5; a.alt = fish(sm); return a; }
  /* ---- turtle (2 frames) ---- */
  function turtle() {
    var out = [];
    for (var f = 0; f < 2; f++) {
      var c = mk(30, 20), g = c.getContext('2d'), cx = 12, cy = 10;
      g.fillStyle = '#143a3a'; disc(g, cx, cy, 7, '#2f7a4a'); for (var y = -6; y <= 6; y++) for (var x = -9; x <= 9; x++) { var e = x * x / 81 + y * y / 31; if (e <= 1) { g.fillStyle = e > .72 ? '#1e5a38' : (((x + 40) % 6 < 1 || (y + 40) % 5 < 1) ? '#3f8f58' : '#5fb36a'); g.fillRect(cx + x, cy + y, 1, 1); if (e > .8 || (f === 0 && false)) { } } }
      g.fillStyle = '#16402a'; for (x = -9; x <= 9; x++) { var yy = Math.round(Math.sqrt(Math.max(0, 31 * (1 - x * x / 81)))); g.fillRect(cx + x, cy + yy, 1, 1); g.fillRect(cx + x, cy - yy, 1, 1); }
      g.fillStyle = '#a3cf82'; disc(g, cx + 12, cy - 1, 2, '#a3cf82'); g.fillStyle = '#03045E'; g.fillRect(cx + 13, cy - 2, 1, 1); g.fillStyle = '#8cc07a'; g.fillRect(cx + 9, cy - 1, 3, 2);
      g.fillStyle = '#8cc07a'; var a = f ? -1 : 1; line(g, cx + 4, cy + 4, cx + 9, cy + 9 * a + (f ? 1 : 3), 2); line(g, cx + 4, cy - 4, cx + 8, cy - 8 * -a - (f ? 3 : 1), 2); g.fillStyle = '#5a9a5a'; line(g, cx - 7, cy + 2, cx - 11, cy + 4 - f * 2, 2); g.fillRect(cx - 9, cy, 3, 1);
      out.push(c);
    }
    return [out, [flip(out[0]), flip(out[1])]];
  }
  /* ---- whale (column-sheared each frame), angler, wreck, chest, starfish ---- */
  function whale() {
    var w = 118, h = 40, c = mk(w, h), g = c.getContext('2d'), cy = 18;
    for (var x = 0; x < w; x++) { var t = x / w, hh; if (t < .72) hh = 11 * Math.sqrt(Math.max(0, 1 - Math.pow((t - .5) / .5, 2))) * (t < .1 ? .8 : 1) + (t > .5 ? 2.5 * (1 - (t - .5) / .22) : 0); else hh = 8.5 * (1 - (t - .72) / .28) + 1;
      hh = Math.max(1, hh); for (var y = -Math.round(hh); y <= Math.round(hh * .8); y++) { var f = (y + hh) / (hh * 1.9); g.fillStyle = f > .78 ? '#0a3a86' : f > .6 ? '#06286a' : '#031a52'; g.fillRect(x, cy + y, 1, 1); } }
    for (x = 0; x < w; x += 3) if (x > 40 && x < 90) { g.fillStyle = 'rgba(30,90,170,.7)'; g.fillRect(x, cy + 6, 2, 1); g.fillRect(x + 1, cy + 8, 2, 1); }
    g.fillStyle = '#0a3a86'; line(g, 80, cy + 8, 70, cy + 17, 3); g.fillStyle = '#031a52'; g.fillRect(34, cy - 3, 1, 1); g.fillStyle = '#6aa0e0'; g.fillRect(33, cy - 3, 1, 1); g.fillStyle = 'rgba(100,160,220,.6)'; g.fillRect(8, cy + 2, 14, 1); g.fillRect(70, cy - 10, 18, 1);
    return c;
  }
  function angler() {
    var c = mk(30, 22), g = c.getContext('2d');
    disc(g, 14, 13, 7, '#07185a'); for (var y = -7; y <= 7; y++) for (var x = -8; x <= 8; x++) if (x * x / 64 + y * y / 49 <= 1) { g.fillStyle = y < -2 ? '#0e2a80' : y > 3 ? '#1d4ba0' : '#123a96'; g.fillRect(14 + x, 13 + y, 1, 1); }
    g.fillStyle = '#031042'; g.fillRect(2, 11, 3, 5); g.fillRect(0, 9, 3, 3); g.fillRect(0, 15, 3, 3); // tail
    g.fillStyle = '#0a2278'; g.fillRect(6, 6, 6, 2); // dorsal
    g.fillStyle = '#030a30'; g.fillRect(20, 12, 8, 5); g.fillStyle = '#f0f8ff'; for (var i = 0; i < 4; i++) { g.fillRect(21 + i * 2, 12, 1, 2); g.fillRect(22 + i * 2, 16, 1, -2 + 2); } g.fillRect(21, 15, 1, 2); g.fillRect(24, 15, 1, 2); g.fillRect(27, 15, 1, 2);
    g.fillStyle = '#e8fbff'; g.fillRect(20, 8, 3, 3); g.fillStyle = '#03045E'; g.fillRect(21, 9, 1, 1);
    g.fillStyle = '#48CAE4'; line(g, 21, 6, 22, 2, 1); line(g, 22, 2, 27, 0, 1);
    return c;
  }
  function chest() {
    var c = mk(18, 13), g = c.getContext('2d'); var a = ['..dddddddddddddd..', '.dwwwwwwwwwwwwwwd.', 'dwhhhhhhhhhhhhhhwd', 'dwwwwwwwwwwwwwwwwd', 'dkkkkkkkkkkkkkkkkd', 'dwyyyyygyyyyyyywwd', 'dwyygyyyyyyygyyywd', 'dwwwwwwkkwwwwwwwwd', 'dwhhhhhkykhhhhhhwd', 'dwwwwwwkkwwwwwwwwd', 'dwwwwwwwwwwwwwwwwd', 'dkkkkkkkkkkkkkkkkd', '.dddddddddddddddd.'], pal = { d: '#1b0f08', w: '#5a3a22', h: '#7a5232', k: '#46586e', y: '#e8c14a', g: '#fff1a0' };
    a.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (pal[r[x]]) { g.fillStyle = pal[r[x]]; g.fillRect(x, y, 1, 1); } }); return c;
  }
  function wreck() {
    var w = 84, h = 56, c = mk(w, h), g = c.getContext('2d');
    // broken mast + torn sail
    g.fillStyle = '#2a1a10'; line(g, 46, 40, 58, 3, 2); line(g, 40, 14, 74, 22, 2);
    g.fillStyle = 'rgba(190,215,235,.55)'; for (var i = 0; i < 16; i++) { g.fillRect(50 + i, 8 + (i >> 1) + ((i * 7) % 3), 1, 14 - (i % 4)); }
    // hull (tilted)
    for (var x = 0; x < 72; x++) { var t = x / 72, top = 34 + Math.round(-8 * t + 6 * Math.pow(Math.abs(t - .35), 1.2)), bot = 52 - Math.round(Math.abs(t - .45) * 10); for (var y = top; y <= bot; y++) { var pl = ((y - top) % 5 === 0); g.fillStyle = pl ? '#1a0f08' : (x % 11 === 0 ? '#3a2616' : '#4a3020'); g.fillRect(4 + x, y, 1, 1); } }
    g.fillStyle = '#1a0f08'; for (x = 0; x < 72; x += 7) { var t2 = x / 72; g.fillRect(4 + x, 30 + Math.round(-8 * t2 + 6 * Math.pow(Math.abs(t2 - .35), 1.2)) - 5 * (x % 14 === 0 ? 1 : 0), 2, 6); } // broken ribs
    g.fillStyle = '#1a0f08'; g.fillRect(24, 40, 4, 4); g.fillRect(40, 41, 4, 4); g.fillStyle = '#4fa8a0'; g.fillRect(25, 41, 2, 2); g.fillRect(41, 42, 2, 2);
    g.fillStyle = '#2f7a6a'; for (x = 6; x < 72; x += 3) if (hash(x, 3, 9) > .5) g.fillRect(x, 36 + (x % 5), 2, 2);
    g.fillStyle = '#5a8a7a'; for (x = 8; x < 72; x += 5) g.fillRect(x, 48 - (x % 3), 1, 1);
    return c;
  }
  function star(col) { var c = mk(9, 9), g = c.getContext('2d'); g.fillStyle = col; var P = [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [0, 4], [1, 4], [2, 4], [3, 4], [5, 4], [6, 4], [7, 4], [8, 4], [1, 1], [2, 2], [6, 6], [7, 7], [1, 7], [2, 6], [6, 2], [7, 1]]; P.forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); }); return c; }
  var cache = {};
  function get() {
    if (cache.ok) return cache;
    cache.ok = 1;
    cache.small = [
      fishPair({ len: 8, hh: 3, top: '#0077B6', belly: '#CAF0F8', fin: '#90E0EF', seed: 1 }),
      fishPair({ len: 8, hh: 3, top: '#0096C7', mid: '#48CAE4', belly: '#CAF0F8', fin: '#48CAE4', pat: 'scales', seed: 2 }),
      fishPair({ len: 9, hh: 5, top: '#e8a73a', mid: '#f2c660', belly: '#ffe08a', fin: '#e8a73a', bars: [.5], pc: '#ffffff', be: '#9a6a20', skew: .9, pw: .6, dorsal: 'long', seed: 3 }),
      fishPair({ len: 9, hh: 5, top: '#2a6ad0', mid: '#4a90e8', belly: '#6ac0ff', fin: '#f0d24a', bars: [.36], pc: '#03045E', skew: .9, pw: .6, dorsal: 'long', seed: 4 }),
      fishPair({ len: 10, hh: 5, top: '#e8742a', mid: '#f08a3a', belly: '#f6b060', fin: '#e8742a', bars: [.3, .6], bw: 2, pc: '#ffffff', be: '#6a3010', skew: .85, pw: .55, tailType: 'round', seed: 5 }),
      fishPair({ len: 10, hh: 6, top: '#f2c82a', mid: '#f6dc4a', belly: '#fdf0a0', fin: '#f2c82a', skew: .92, pw: .55, dorsal: 'long', sheen: false, seed: 6 }),
      fishPair({ len: 10, hh: 3, top: '#3a6a9a', mid: '#9ab8d0', belly: '#e8f4fa', fin: '#90E0EF', pat: 'scales', seed: 7 }),
      fishPair({ len: 9, hh: 4, top: '#1a3a8a', mid: '#2a6ad0', belly: '#d8e8f0', fin: '#90E0EF', band: [.36, '#48f0ff'], band2: [.66, '#e0504a'], seed: 8 }),
      fishPair({ len: 10, hh: 8, top: '#9cb4c4', mid: '#cfdde4', belly: '#ffffff', fin: '#cfe8f0', bars: [.3, .52], pc: '#3a4a5a', skew: .98, pw: .62, dorsal: 'sail', fin1: .6, seed: 9 })];
    cache.mid = [
      fishPair({ len: 26, hh: 10, top: '#023E8A', mid: '#0a6aa8', belly: '#CAF0F8', fin: '#0077B6', finlets: '#f0d24a', tailType: 'lunate', dorsal: 'double', seed: 11 }),
      fishPair({ len: 19, hh: 7, top: '#0a5a9a', mid: '#2a9ac8', belly: '#ADE8F4', fin: '#48CAE4', pat: 'wavy', dorsal: 'double', finlets: '#48CAE4', seed: 12 }),
      fishPair({ len: 21, hh: 9, top: '#1a6a8a', mid: '#8cc8d8', belly: '#e8fbff', fin: '#90E0EF', pat: 'scales', seed: 13 }),
      fishPair({ len: 30, hh: 6, top: '#2a4a6a', mid: '#8aa8bc', belly: '#dce8ee', fin: '#5a7a92', bars: [.35, .5, .65], pc: '#3a566e', pw: .55, skew: .7, dorsal: 'none', seed: 14 }),
      fishPair({ len: 19, hh: 9, top: '#b8503e', mid: '#d8705a', belly: '#f0b8a6', fin: '#c8503e', pat: 'scales', seed: 15 }),
      fishPair({ len: 21, hh: 11, top: '#3a5a6a', mid: '#6a8a98', belly: '#b8ccd4', fin: '#7a98a6', pat: 'spots', pc: '#1a2a3a', skew: .9, dorsal: 'long', tailType: 'round', seed: 16 })];
    cache.deepFish = [
      fishPair({ len: 16, hh: 6, top: '#04186e', mid: '#0b2f98', belly: '#2a56b0', fin: '#0a2a90', rim: '#2a6ac8', glow: '#90E0EF', bigEye: true, seed: 21 }),
      fishPair({ len: 13, hh: 5, top: '#03126a', mid: '#0b2a8a', belly: '#1c4aa6', fin: '#0a2a90', rim: '#2a6ac8', glow: '#48CAE4', eyeGlow: '#90E0EF', bigEye: true, seed: 22 }),
      fishPair({ len: 11, hh: 9, top: '#0a2a86', mid: '#3a78c0', belly: '#a8d8f0', fin: '#2a5ab0', rim: '#4a8ae0', glow: '#CAF0F8', skew: .98, pw: .6, dorsal: 'none', seed: 23 }),
      fishPair({ len: 20, hh: 4, top: '#03126a', mid: '#0a2a84', belly: '#1a3a98', fin: '#0a2a90', rim: '#2a6ac8', glow: '#48CAE4', eyeGlow: '#CAF0F8', bigEye: true, pw: .55, seed: 24 })];
    cache.turtle = turtle(); cache.whale = whale(); cache.angler = angler(); cache.anglerF = flip(cache.angler); cache.chest = chest(); cache.wreck = wreck(); cache.stars = [star('#f0884a'), star('#e8553a')];
    return cache;
  }
  /* ---- dynamic: jellyfish, manta ---- */
  function jelly(g, x, y, T, ph, big) {
    var p = Math.sin(T * 2.2 + ph), w = (big ? 12 : 8) + Math.round(p * 1.6), h = (big ? 8 : 6) - Math.round(p), c;
    g.fillStyle = 'rgba(190,170,255,.10)'; disc(g, x, y, w + 3, 'rgba(190,170,255,.10)'); disc(g, x, y, w - 1, 'rgba(190,170,255,.10)');
    for (var r = 0; r < h; r++) { var half = Math.round(w / 2 * Math.sqrt(1 - Math.pow((r - h) / h, 2))); g.fillStyle = r === 0 ? 'rgba(255,255,255,.9)' : r < 2 ? 'rgba(214,196,255,.85)' : 'rgba(170,146,245,.7)'; g.fillRect(x - half, y - h + r + 1, half * 2 + 1, 1); }
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - Math.round(w / 2), y, w + 1, 1); g.fillStyle = 'rgba(120,90,220,.7)'; g.fillRect(x - 2, y - 3, 2, 1);
    for (var i = -2; i <= 2; i++) { var len = (big ? 14 : 9) + (i & 1) * 3; for (var k = 1; k < len; k++) { g.fillStyle = 'rgba(214,200,255,' + (.7 * (1 - k / len)).toFixed(2) + ')'; g.fillRect(x + i * Math.round(w / 6) + Math.round(Math.sin(T * 2 + ph + k * .45 + i) * 1.6), y + k, 1, 1); } }
  }
  function manta(g, x, y, T, ph, dir) {
    var span = 20, flap = Math.sin(T * 1.6 + ph);
    for (var dx = -span; dx <= span; dx++) { var a = Math.abs(dx) / span, wy = Math.round(flap * 6 * a * a - a * 2), thick = Math.max(1, Math.round((1 - a * a) * 5)); g.fillStyle = '#022a78'; g.fillRect(x + dx, y + wy - 1, 1, thick); g.fillStyle = '#0a58a8'; g.fillRect(x + dx, y + wy - 1, 1, 1); if (a < .55) { g.fillStyle = '#CAF0F8'; g.fillRect(x + dx, y + wy + thick - 2, 1, 1); } }
    g.fillStyle = '#022a78'; g.fillRect(x - 3, y - 2, 7, 3); g.fillRect(x + dir * 5, y - 1, 3, 2); g.fillStyle = '#ffffff'; g.fillRect(x + dir * 5, y - 1, 1, 1);
    for (var k = 0; k < 18; k++) { g.fillStyle = '#022a78'; g.fillRect(x - dir * (4 + k), y + Math.round(Math.sin(T * 2 + k * .3 + ph) * 1.5) + (k > 8 ? 0 : 0), 1, 1); }
  }
  L.get = get; L.jelly = jelly; L.manta = manta; L.flip = flip;
  SOT.life = L;
})();
