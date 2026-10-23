/* Sea of Thought — shared pixel helpers, sky kit and the render ticker. */
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
  SOT.px = { RM: RM, parse: parse, mix3: mix3, css: css, P: P, pc: pc, BAY: BAY, rng: rng, hash: hash, mkCanvas: mkCanvas, gradCanvas: gradCanvas, disc: disc, line: line, sprCanvas: sprCanvas };

  /* ---------- sky kit: gradient, stars, sun, clouds, shooting star ---------- */
  var SKY_DUSK = ['#010230', '#02033f', '#03045E', '#04106e', '#05207a', '#022c82', '#023E8A', '#064a94', '#0a5a9e', '#0f6aa8'];
  var SKY_DAY = ['#0096C7', '#00A8CF', '#00B4D8', '#30C0DE', '#48CAE4', '#70D8EC', '#90E0EF', '#ADE8F4', '#CAF0F8', '#E8F9FD'];
  var CL = { top: P('#0a4a9a', '#ffffff'), body: P('#04307a', '#f0fafd'), shade: P('#03206a', '#bfe4f0') };
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
})();
