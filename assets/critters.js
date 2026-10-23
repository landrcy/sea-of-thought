/* Sea of Thought — extra marine life: urchins, anemones, sponges, shells, driftwood (static seabed decor) + crab, seahorse, puffer, squid sprites. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, disc = px.disc, line = px.line, hash = px.hash, spr = px.sprCanvas, C = SOT.critters = {};
  function flip(c) { var o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function P1(g, c, x, y) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }

  /* ---- sprites (face right; [frames] then flipped copies) ---- */
  function seahorse() {
    var pal = { a: '#ffb36b', b: '#d97a3a', w: '#ffe3b8', e: '#03045E', t: '#f08a4b' };
    var f0 = ['.....bb..', '....bwab.', '...aaaaab', '...aeaaaaa', '....aaaa..', '....aaaab.', '...bawwab.', '...bawwa..', '...baaab..', '....baab..', '....baab..', '.....aab..', '.....aab..', '....tab...', '...tab....', '...ta.....', '...tt.....', '....t.....'];
    var f1 = f0.slice(); f1[1] = '....bwab.'; f1[13] = '....tab...'; f1[14] = '....ta....'; f1[15] = '....tt....'; f1[16] = '....t.....'; f1[17] = '...tt.....';
    var a = [spr(f0, pal), spr(f1, pal)]; return [a, [flip(a[0]), flip(a[1])]];
  }
  function crab() {
    var pal = { a: '#e0603a', b: '#a8402a', c: '#ff9a6a', e: '#03045E', w: '#ffffff' }, out = [];
    [['..c......c..', '.cc......cc.', '.cb.bwwb.bc.', '..bbaaaabb..', '.eaaaaaaaae.', 'baaaaaaaaaab', '.b.b.bb.b.b.', 'b..b....b..b'], ['..c......c..', '.cc......cc.', '.cb.bwwb.bc.', '..bbaaaabb..', '.eaaaaaaaae.', 'baaaaaaaaaab', '..b.b..b.b..', '.b...bb...b.']].forEach(function (r) { out.push(spr(r, pal)); });
    return out;
  }
  function puffer(infl) {
    var rd = infl ? 7 : 5, w = rd * 2 + 8, h = rd * 2 + 5, out = [];
    for (var f = 0; f < 2; f++) {
      var c = mk(w, h), g = c.getContext('2d'), cx = rd + 1, cy = Math.floor(h / 2);
      disc(g, cx, cy, rd, '#e8c870'); for (var y = -rd; y <= rd; y++) for (var x = -rd; x <= rd; x++) if (x * x + y * y <= rd * rd) { if (y > rd * .35) { g.fillStyle = '#fff4d0'; g.fillRect(cx + x, cy + y, 1, 1); } else if (y < -rd * .3 && (x + y + 40) % 3 === 0) { g.fillStyle = '#b8883a'; g.fillRect(cx + x, cy + y, 1, 1); } }
      if (infl) for (var a = 0; a < 16; a++) { var an = a / 16 * 6.283, sx = Math.round(cx + Math.cos(an) * (rd + 1)), sy = Math.round(cy + Math.sin(an) * (rd + 1)); P1(g, '#fff4d0', sx, sy); P1(g, '#fff4d0', Math.round(cx + Math.cos(an) * (rd + 2)), Math.round(cy + Math.sin(an) * (rd + 2))); }
      R(g, '#d8a850', cx - 1, cy + rd - 2 + f, 3, 2); // fin
      for (x = 0; x < 4; x++) R(g, '#d8a850', cx - rd - 4 + x, cy - 2 + (f ? 1 : -1) * (3 - x) + 1, 1, 3 + (3 - x)); // tail
      R(g, '#ffffff', cx + rd - 3, cy - 2, 2, 2); P1(g, '#03045E', cx + rd - 2, cy - 1); R(g, '#b8683a', cx + rd - 1, cy + 1, 2, 1);
      out.push(c);
    } return [out, [flip(out[0]), flip(out[1])]];
  }
  function squid() {
    var pal = { a: '#b79af0', b: '#8a6ad8', c: '#e0d0ff', d: '#5a3aa8', e: '#03045E', g: '#48CAE4' }, out = [];
    var body = ['......dd.......', '....ddbbbd.....', '..ddbbaaabbd...', '.dbbaaaaaaabbd.', 'dbaaagaaagaabbd', '.dbbaaaaeaabbd.', '..ddbbaaabbd...'];
    [0, 1].forEach(function (f) {
      var c = mk(26, 11), g = c.getContext('2d'); var rows = body; for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) { var ch = rows[y][x]; if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect(11 + x, 2 + y, 1, 1); } }
      // fins at the tip + arms trailing left
      R(g, '#8a6ad8', 22, 3 + f, 3, 1); R(g, '#8a6ad8', 22, 7 - f, 3, 1);
      for (var k = 0; k < 4; k++) { var ay = 3 + k + (k > 1 ? 0 : 0), len = f ? 7 + k % 2 : 10 + (k % 2) * 2; for (var q = 0; q < len; q++) P1(g, q > len - 3 ? '#e0d0ff' : (k % 2 ? '#8a6ad8' : '#b79af0'), 11 - q, ay + Math.round(Math.sin(q * .6 + k) * (f ? .5 : 1)) + (q > 5 ? (k < 2 ? -1 : 1) * Math.min(1, (q - 5) * .3) : 0)); }
      out.push(c);
    });
    return [out, [flip(out[0]), flip(out[1])]];
  }
  var cache; C.get = function () { return cache || (cache = { seahorse: seahorse(), crab: crab(), crabF: crab().map(flip), puffer: puffer(false), puffer2: puffer(true), squid: squid() }); };

  /* ---- static seabed decor ---- */
  function urchin(g, x, y, r, c1, c2) {
    var n = 12 + r * 2; for (var i = 0; i < n; i++) { var a = Math.PI + i / (n - 1) * Math.PI, len = r + 3 + (i % 2) * 2; line(g, x, y, Math.round(x + Math.cos(a) * len), Math.round(y + Math.sin(a) * len), 1); }
    g.fillStyle = c2; for (i = 0; i < n; i++) { a = Math.PI + i / (n - 1) * Math.PI; len = r + 3 + (i % 2) * 2; g.fillRect(Math.round(x + Math.cos(a) * len), Math.round(y + Math.sin(a) * len), 1, 1); }
    disc(g, x, y, r, c1); for (var yy = -r; yy <= 0; yy++) for (var xx = -r; xx <= r; xx++) if (xx * xx + yy * yy > r * r) g.clearRect(x + xx, y + yy, 0, 0); P1(g, c2, x - 1, y - 1);
  }
  function anemone(g, x, y, h, col, tip, glows, r) {
    R(g, '#2a2a88', x - 2, y - 3, 5, 4); R(g, col, x - 1, y - 4, 3, 2);
    var n = 9; for (var i = 0; i < n; i++) { var a = -Math.PI * (.12 + .76 * i / (n - 1)), len = h * (.7 + .3 * ((i * 5) % 3) / 2), bx = x + Math.round(Math.cos(a) * 1), ex = Math.round(x + Math.cos(a) * len), ey = Math.round(y - 4 + Math.sin(a) * len);
      g.fillStyle = col; line(g, bx, y - 4, ex, ey, 1); P1(g, tip, ex, ey); P1(g, '#ffffff', ex, ey - 1); }
    glows.push({ x: x, y: y - h * .7, c: '144,240,255', r: 5, a: .5, ph: r() * 6 });
  }
  function sponge(g, x, y, kind, col, hi) {
    if (kind === 0) { for (var k = 0; k < 3; k++) { var tx = x + (k - 1) * 4, th = 7 + ((k * 5) % 4) * 2; R(g, col, tx, y - th, 3, th); R(g, hi, tx, y - th, 1, th); R(g, '#1a0a50', tx + 1, y - th, 1, 1); R(g, hi, tx - 0, y - th - 1, 3, 1); } }
    else { for (var yy = -9; yy <= 0; yy++) { var w = Math.round(6 - Math.abs(yy + 4) * .5); R(g, col, x - w, y + yy, w * 2 + 1, 1); R(g, hi, x - w, y + yy, 1, 1); if ((yy + 20) % 3 === 0) R(g, '#2a1a70', x - w + 2, y + yy, 1, 1); } R(g, '#1a0a50', x - 3, y - 9, 7, 1); R(g, hi, x - 4, y - 10, 9, 1); }
  }
  function shell(g, x, y, kind) {
    if (kind === 0) { for (var i = -4; i <= 4; i++) { var h = 5 - Math.abs(i) * .5; R(g, i % 2 ? '#f6e6d0' : '#e8c8b0', x + i, y - Math.round(h), 1, Math.round(h)); } R(g, '#b8908a', x - 1, y, 3, 1); }
    else { disc(g, x, y - 3, 3, '#f2e0c8'); P1(g, '#c8a088', x, y - 3); P1(g, '#c8a088', x + 1, y - 4); P1(g, '#fff', x - 1, y - 5); R(g, '#e8c8b0', x + 2, y - 2, 3, 2); }
  }
  function driftwood(g, x, y, len) {
    g.fillStyle = '#4a2c1a'; line(g, x, y, x + len, y - 2, 3); g.fillStyle = '#7a4c2c'; line(g, x, y - 1, x + len, y - 3, 1); g.fillStyle = '#4a2c1a'; line(g, x + len * .4, y - 2, x + len * .55, y - 9, 1); line(g, x + len * .7, y - 3, x + len * .85, y - 8, 1);
    R(g, '#2f7a68', x + 2, y - 1, 3, 1); R(g, '#2f7a68', x + len * .5, y - 2, 2, 1); P1(g, '#1a1008', x + len * .3, y - 1); R(g, '#9ab0b8', x + len * .8, y - 3, 2, 1);
  }
  C.decor = function (gm, W, Hh, r, avoid) {
    var out = { glows: [] };
    function floorY(x) { var xx = Math.max(0, Math.min(W - 1, Math.round(x))); return Hh - Math.round(5 + 2.5 * Math.sin(xx * .05) + 1.5 * Math.sin(xx * .13 + 2)); }
    function free(x, m) { for (var i = 0; i < avoid.length; i++) if (x > avoid[i][0] - m && x < avoid[i][1] + m) return false; return true; }
    var n = Math.max(4, Math.round(W / 38)), i, x, tries;
    var warm = ['#e8b048', '#d96a8a', '#8a5ad0', '#2ec4b6'], hi = ['#ffe08a', '#ffb0c8', '#c0a0f0', '#90f0e0'], tint = [['#3a1f7a', '#9a7af0'], ['#5a1f6a', '#d06ad0'], ['#0e4a7a', '#48CAE4']], ac = [['#e0589a', '#ffd0e8'], ['#2ec4b6', '#CAF0F8'], ['#9a6ae8', '#e8d8ff']];
    function spot(m) { for (tries = 0; tries < 12; tries++) { x = 6 + Math.round(r() * (W - 12)); if (free(x, m)) return x; } return -1; }
    for (i = 0; i < n; i++) { if (spot(8) < 0) continue; var t = tint[i % 3]; urchin(gm, x, floorY(x) - 1, 3 + (r() * 2 | 0), t[0], t[1]); }
    for (i = 0; i < Math.round(n * .8); i++) { if (spot(10) < 0) continue; var a = ac[i % 3]; anemone(gm, x, floorY(x) + 1, 9 + Math.round(r() * 5), a[0], a[1], out.glows, r); }
    for (i = 0; i < Math.round(n * .8); i++) { if (spot(10) < 0) continue; sponge(gm, x, floorY(x) + 1, i % 2, warm[i % 4], hi[i % 4]); }
    for (i = 0; i < n; i++) { if (spot(5) < 0) continue; shell(gm, x, floorY(x) + 1, i % 2); }
    for (i = 0; i < Math.max(1, Math.round(W / 220)); i++) { if (spot(24) < 0) continue; driftwood(gm, x - 10, floorY(x) + 1, 22 + (r() * 12 | 0)); }
    return out;
  };
})();
