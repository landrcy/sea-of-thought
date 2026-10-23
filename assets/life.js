/* Sea of Thought — marine life sprites + drawing (procedural pixel art). Depth zones: shallows · midwater · deep · seabed. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, line = px.line, hash = px.hash, rng = px.rng, disc = px.disc, L = {};
  function flip(c) { var o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
  function lerpc(a, b, t) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  var hex = px.parse;
  /* ---- generic fish: [frame0, frame1] facing right (head right) ---- */
  function fishSprite(len, hh, top, belly, fin, o) {
    o = o || {}; var tail = Math.max(3, Math.round(len * .32)), w = len + tail, h = hh + 6, cy = Math.floor(h / 2), T = hex(top), B = hex(belly), out = [];
    for (var f = 0; f < 2; f++) {
      var c = mk(w, h), g = c.getContext('2d'), mask = {};
      for (var x = 0; x < len; x++) { var t = (x + .5) / len, half = Math.max(.6, hh / 2 * Math.sqrt(Math.max(0, 1 - Math.pow((t - .56) / .56, 2))) * (.75 + .25 * t)), r = Math.round(half - .2);
        for (var y = -r; y <= r; y++) { var fy = (y + r) / Math.max(1, 2 * r); var col = fy > .62 ? lerpc(B, B, 0) : lerpc(T, B, Math.max(0, (fy - .25) / .6) * .7); if (o.stripe && x > len * .38 && x < len * .46) col = o.stripe; if (o.stripe2 && x > len * .62 && x < len * .7) col = o.stripe2; g.fillStyle = col; g.fillRect(tail + x, cy + y, 1, 1); mask[(tail + x) + ',' + (cy + y)] = 1; } }
      var hx = tail + len - 1; // dorsal + tail
      g.fillStyle = fin; var dy = Math.round(hh / 2) + 1; for (var i = 0; i < Math.max(2, len / 4); i++) g.fillRect(tail + Math.round(len * .36) + i, cy - dy + Math.round(i * .5) - (i < 2 ? 1 : 0), 1, 1 + (i < 3 ? 1 : 0));
      for (x = 0; x < tail; x++) { var sp = Math.round((tail - x) / tail * (hh * .55 + 1)); for (y = -sp; y <= sp; y++) g.fillRect(x, cy + y + (f ? 1 : -1) * Math.round((tail - x) * .25), 1, 1); }
      g.fillStyle = 'rgba(3,4,94,.55)'; for (var k in mask) { var p = k.split(',').map(Number); if (!mask[(p[0] + 1) + ',' + p[1]] || !mask[p[0] + ',' + (p[1] + 1)] && !mask[p[0] + ',' + (p[1] - 1)]) if (!mask[(p[0] + 1) + ',' + p[1]]) g.fillRect(p[0], p[1], 1, 1); }
      if (hh >= 3) { g.fillStyle = '#ffffff'; g.fillRect(hx - Math.round(len * .15), cy - Math.round(hh * .15) - 1, 1, 1); g.fillStyle = '#03045E'; if (hh >= 5) g.fillRect(hx - Math.round(len * .15) + 1, cy - Math.round(hh * .15) - 1, 1, 1); }
      out.push(c);
    }
    return [out, [flip(out[0]), flip(out[1])]];
  }
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
    cache.small = [fishSprite(7, 3, '#0077B6', '#CAF0F8', '#90E0EF'), fishSprite(7, 3, '#48CAE4', '#ffffff', '#90E0EF'), fishSprite(8, 4, '#e8a73a', '#ffe08a', '#e8a73a', { stripe: '#ffffff' }), fishSprite(8, 4, '#2a6ad0', '#6ac0ff', '#f0d24a', { stripe: '#03045E' })];
    cache.mid = [fishSprite(24, 9, '#023E8A', '#CAF0F8', '#0077B6'), fishSprite(18, 7, '#0a5a9a', '#ADE8F4', '#48CAE4', { stripe: '#48CAE4', stripe2: '#48CAE4' }), fishSprite(20, 8, '#1a6a8a', '#e8fbff', '#90E0EF')];
    cache.deepFish = [fishSprite(16, 6, '#04186e', '#2a56b0', '#0a2a90'), fishSprite(12, 5, '#03126a', '#1c4aa6', '#0a2a90')];
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
