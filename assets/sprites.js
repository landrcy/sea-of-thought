/* Sea of Thought — hand-made sprite layer (gulls and pirate ships, art by the pixel boss, see assets/sprites/manifest.json). Gulls are drawn as they are (whole-number css px per art px); the ships are re-gridded onto the scene's own pixels.
 * The source sheets were drawn on a finer pixel grid than the scene, so each ship is box-reduced by an integer factor (a block's dominant colour wins,
 * the silhouette is re-outlined with a darker tone of its own colour) until one ship pixel is exactly one scene pixel. It is then drawn on the
 * #sprites canvas (between the scene and the bottle/foreground layer) at an integer multiple of the scene scale S and snapped to the scene grid, so no
 * mixed pixel sizes and no sub-pixel positions. Frames advance with delta time. Night, deep water and storms darken the ships with one source-atop
 * wash; the galleon lantern glow masks are added back additively. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, FX = SOT.fx, RM = px.RM;
  var qs = new URLSearchParams(location.search);
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  /* manifest: name -> [frame w, frame h, frames, anchor x, anchor y, loop order, has glow sheet] */
  var M = {seagull_float:[36,30,2,18,15,[0, 1]],seagull_fly:[36,30,3,18,15,[0, 1, 2, 1]],seagull_dive:[36,30,2,18,15,[0, 1]],sloop_small:[76,80,3,34,76,[0, 1, 2]],sloop_large:[125,132,3,56,128,[0, 1, 2]],galleon_small:[136,122,3,68,111,[0, 1, 2],1],galleon_large:[223,199,3,111,188,[0, 1, 2],1]};
  var SPR = SOT.spr = {}, sheets = {}, A = null, cv = null, c = null, CW = 0, CH = 0, K = 2;

  /* ---------- loading ---------- */
  function sheet(name) {
    var s = sheets[name]; if (s) return s; var d = M[name]; if (!d) return null;
    s = sheets[name] = { name: name, w: d[0], h: d[1], n: d[2], ax: d[3], ay: d[4], loop: d[5], hasGlow: !!d[6], ready: false, img: new Image(), red: {}, bot: d[1], gull: name.indexOf('seagull') === 0 };
    s.img.onload = function () { if (s.gull) prepGull(s); else s.ready = !s.hasGlow || s.gready; }; s.img.src = 'assets/sprites/' + name + '.png';
    if (s.hasGlow) { s.gimg = new Image(); s.gimg.onload = function () { s.gready = true; s.ready = !!s.img.complete && s.img.naturalWidth > 0; }; s.gimg.src = 'assets/sprites/' + name + '_glow.png'; }
    return s;
  }
  /* gulls: the hand-made sheets drawn as they are (whole-number css px per art px, mirrored copy for the other direction) */
  function prepGull(s) {
    var o = px.mkCanvas(s.w * s.n, s.h), g = o.getContext('2d'), i; g.imageSmoothingEnabled = false;
    for (i = 0; i < s.n; i++) { g.save(); g.translate((i + 1) * s.w, 0); g.scale(-1, 1); g.drawImage(s.img, i * s.w, 0, s.w, s.h, 0, 0, s.w, s.h); g.restore(); } s.flip = o;
    try { var t = px.mkCanvas(s.img.width, s.img.height), tg = t.getContext('2d', { willReadFrequently: true }), d, bot = 0, x, y; tg.drawImage(s.img, 0, 0); d = tg.getImageData(0, 0, t.width, t.height).data;
      for (y = s.h - 1; y >= 0 && !bot; y--) for (x = 0; x < s.w * s.n; x++) if (d[(y * t.width + x) * 4 + 3]) { bot = y + 1; break; } s.bot = bot || s.h; } catch (e) { s.bot = s.h; }
    s.ready = true;
  }
  function put(s, fr, dir, cx, cy, sc, a) {
    if (!s || !s.ready) return; var dx = Math.round(cx - (dir > 0 ? s.ax : s.w - s.ax) * sc), dy = Math.round(cy - s.ay * sc), dw = s.w * sc, dh = s.h * sc;
    if (dx > CW || dy > CH || dx + dw < 0 || dy + dh < 0) return;
    if (a < 1) c.globalAlpha = a; c.drawImage(dir > 0 ? s.img : s.flip, fr * s.w, 0, s.w, s.h, dx, dy, dw, dh); if (a < 1) c.globalAlpha = 1;
  }
  function frame(s, at) { return s.loop[Math.floor(at) % s.loop.length]; }
  function pix(img, w, h) { var cc = px.mkCanvas(w, h), g = cc.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; }
  /* box-reduce a sheet by an integer factor d: per block the dominant colour (dark outline tones weigh a little more) if enough of the block is opaque */
  function reduce(s, d) {
    if (s.red[d]) return s.red[d]; var fw = Math.ceil(s.w / d), fh = Math.ceil(s.h / d), W = fw * s.n, out = px.mkCanvas(W, fh), og = out.getContext('2d'), glow = null, R;
    try {
      var data = pix(s.img, s.img.width, s.img.height), gd = s.hasGlow && s.gready ? pix(s.gimg, s.gimg.width, s.gimg.height) : null, sw = s.img.width, img = og.createImageData(W, fh), px32 = img.data, f, x, y, i, j, k;
      var mask = new Uint8Array(W * fh);
      for (f = 0; f < s.n; f++) for (y = 0; y < fh; y++) for (x = 0; x < fw; x++) {
        var cnt = 0, tot = 0, votes = {}, best = null, bw = 0, gl = 0, gr = 0, gg = 0, gb = 0;
        for (j = 0; j < d; j++) for (i = 0; i < d; i++) { var X = f * s.w + x * d + i, Y = y * d + j; if (x * d + i >= s.w || Y >= s.h) continue; tot++; var o = (Y * sw + X) * 4;
          if (gd && gd[o + 3] > 60) { gl++; gr = gd[o]; gg = gd[o + 1]; gb = gd[o + 2]; }
          if (data[o + 3] < 128) continue; cnt++; var lum = data[o] * .3 + data[o + 1] * .59 + data[o + 2] * .11, key = (data[o] >> 2) + ',' + (data[o + 1] >> 2) + ',' + (data[o + 2] >> 2), wv = (votes[key] = (votes[key] || 0) + (lum < 70 ? 1.4 : 1)); if (wv > bw) { bw = wv; best = [data[o], data[o + 1], data[o + 2]]; } }
        var p = (y * W + f * fw + x) * 4;
        if (cnt >= tot * .42 && best) { px32[p] = best[0]; px32[p + 1] = best[1]; px32[p + 2] = best[2]; px32[p + 3] = 255; mask[y * W + f * fw + x] = 1; }
      }
      /* re-outline: silhouette-edge pixels take a darker tone of themselves (same rule as the fish) */
      for (f = 0; f < s.n; f++) for (y = 0; y < fh; y++) for (x = 0; x < fw; x++) { var xx = f * fw + x; if (!mask[y * W + xx]) continue;
        var edge = x === 0 || y === 0 || x === fw - 1 || y === fh - 1 || !mask[y * W + xx - 1] || !mask[y * W + xx + 1] || !mask[(y - 1) * W + xx] || !mask[(y + 1) * W + xx];
        if (edge) { var q = (y * W + xx) * 4; px32[q] = Math.round(px32[q] * .5 + 3 * .5 * .55); px32[q + 1] = Math.round(px32[q + 1] * .5 + 4 * .5 * .55); px32[q + 2] = Math.round(px32[q + 2] * .55 + 94 * .2); } }
      og.putImageData(img, 0, 0);
      if (gd) { glow = px.mkCanvas(W, fh); var gg2 = glow.getContext('2d'), gi = gg2.createImageData(W, fh);
        for (f = 0; f < s.n; f++) for (y = 0; y < fh; y++) for (x = 0; x < fw; x++) { var hit = 0, hr = 0, hg = 0, hb = 0; for (j = 0; j < d; j++) for (i = 0; i < d; i++) { if (x * d + i >= s.w || y * d + j >= s.h) continue; var o2 = ((y * d + j) * sw + f * s.w + x * d + i) * 4; if (gd[o2 + 3] > 60) { hit++; hr = gd[o2]; hg = gd[o2 + 1]; hb = gd[o2 + 2]; } }
          if (hit) { var p2 = (y * W + f * fw + x) * 4; gi.data[p2] = hr; gi.data[p2 + 1] = hg; gi.data[p2 + 2] = hb; gi.data[p2 + 3] = 255; } }
        gg2.putImageData(gi, 0, 0); }
    } catch (e) {   // pixel data unavailable (e.g. opened from file://): nearest-neighbour reduction, still on the scene grid
      og.imageSmoothingEnabled = false; for (var ff = 0; ff < s.n; ff++) og.drawImage(s.img, ff * s.w, 0, s.w, s.h, ff * fw, 0, fw, fh); glow = null;
    }
    var flip = px.mkCanvas(W, fh), fg = flip.getContext('2d'); for (var q2 = 0; q2 < s.n; q2++) { fg.save(); fg.translate((q2 + 1) * fw, 0); fg.scale(-1, 1); fg.drawImage(out, q2 * fw, 0, fw, fh, 0, 0, fw, fh); fg.restore(); }
    var gflip = null; if (glow) { gflip = px.mkCanvas(W, fh); var gf2 = gflip.getContext('2d'); for (var q3 = 0; q3 < s.n; q3++) { gf2.save(); gf2.translate((q3 + 1) * fw, 0); gf2.scale(-1, 1); gf2.drawImage(glow, q3 * fw, 0, fw, fh, 0, 0, fw, fh); gf2.restore(); } }
    R = { d: d, fw: fw, fh: fh, ax: Math.round(s.ax / d), ay: Math.round(s.ay / d), img: out, flip: flip, glow: glow, gflip: gflip };
    return s.red[d] = R;
  }
  SPR.ready = function (n) { var s = sheets[n]; return !!(s && s.ready); };

  /* ---------- ships ---------- */
  var key = '', ship = null, shipCool = 0, shipForce = qs.get('ship'), shipN = 0, lastShip = '';
  function factor(s) {   // smallest integer reduction that fits the ship into the sky (and not wider than ~45% of the scene)
    var d = 1; while (d < 8 && ((s.ay + 6) / d > A.SY * .9 || s.w / d > A.W * .45)) d++; return d;
  }
  function ensure() {
    K = A.S >= 5 ? 3 : Math.max(1, A.S >> 1); var k2 = A.W + ',' + A.S + ',' + (A.BT - A.SY); if (k2 === key) return; var old = key !== ''; key = k2;
    var cssW = document.documentElement.clientWidth, cssH = window.innerHeight;
    if (cv.width !== cssW || cv.height !== cssH) { cv.width = cssW; cv.height = cssH; c = cv.getContext('2d'); c.imageSmoothingEnabled = false; } CW = cssW; CH = cssH;
    if (old && ship) ship = null;
  }
  function shipPick() {
    var names = ['sloop_small', 'sloop_large', 'galleon_small', 'galleon_large'], forced = shipForce && M[shipForce];
    if (forced) names = [shipForce];
    var o = names.filter(function (n) { return n !== lastShip; }); if (!o.length) o = names; return o[Math.floor(Math.random() * o.length)];
  }
  function spawnShip(first) {
    var n = shipPick(), s = sheet(n); if (!s.ready) { shipCool = 1; return; } var R = reduce(s, factor(s));
    var dir = Math.random() < .5 ? 1 : -1, wS = R.fw; lastShip = n; shipN++;
    ship = { sh: s, R: R, dir: dir, x: first ? A.W * (dir > 0 ? .3 : .7) : dir > 0 ? -wS / 2 - 6 : A.W + wS / 2 + 6, wS: wS, sp: 5 + Math.random() * 2.5, at: 0, ph: Math.random() * 6, rip: 0 };
  }
  function updateShip(dt) {
    if (!ship) { shipCool -= dt; if (shipCool <= 0 && (!RM || shipForce)) spawnShip(!!shipForce && shipN === 0); return; }
    ship.at += dt * 4.5; if (!RM) ship.x += ship.dir * ship.sp * dt; ship.rip -= dt;
    if (ship.rip <= 0 && ship.x > 0 && ship.x < A.W) { ship.rip = 1.3; A.ripples.push({ x: ship.x + ship.dir * ship.wS * .4, y: A.SY, r: 1, a: .5 }); A.ripples.push({ x: ship.x - ship.dir * ship.wS * .4, y: A.SY, r: 1, a: .35 }); }
    if ((ship.dir > 0 && ship.x > A.W + ship.wS / 2 + 8) || (ship.dir < 0 && ship.x < -ship.wS / 2 - 8)) { ship = null; shipCool = shipForce ? 8 : 100 + Math.random() * 110; }
  }

  /* ---------- render ---------- */
  SPR.render = function (api, dt, t, camI, depthF) {
    A = api; if (!cv) { cv = document.getElementById('sprites'); if (!cv) return; }
    ensure(); if (!c) return; var S = A.S, j;
    updateShip(dt);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW, CH); c.imageSmoothingEnabled = false; camI = Math.round(camI);
    var gl = null, birds = FX.getBirds ? FX.getBirds() : [], i;
    if (ship && ship.sh.ready) {
      var R = ship.R, sh = ship.sh, wl = 0, n = 0, cx = Math.round(ship.x), hw = Math.round(ship.wS * .4);
      for (j = -hw; j <= hw; j += 3) { wl += A.surfY(cx + j, t); n++; } wl /= n;
      var chop = FX.chop || 1, bob = Math.round(Math.sin(t * .8 + ship.ph) * .9 + (chop - 1) * 1.6 * Math.sin(t * 2.3 + ship.ph)),
        sy = Math.round(wl) + bob + 1 - camI, fr = sh.loop[Math.floor(ship.at) % sh.loop.length], dx = cx - (ship.dir > 0 ? R.ax : R.fw - R.ax), dy = sy - R.ay;   // all in scene pixels
      if (dy < A.H && sy > 0) {
        c.save(); c.beginPath(); c.rect(0, 0, CW, (sy + 1) * S); c.clip();
        var im = ship.dir > 0 ? R.img : R.flip; c.drawImage(im, fr * R.fw, 0, R.fw, R.fh, dx * S, dy * S, R.fw * S, R.fh * S); c.restore();
        if (R.glow) gl = { im: ship.dir > 0 ? R.glow : R.gflip, fr: fr, R: R, x: dx * S, y: dy * S };
      }
    }
    /* gulls: float / fly (loop 0,1,2,1) / dive frames, driven by the bird states in extras.js */
    for (i = 0; i < birds.length; i++) { var b = birds[i], gs, gf, ga = 1, gx = b.x * S, gy;
      if (b.y < camI - 14 || b.y > camI + A.H + 14) continue; var dirb = b.dir > 0 ? 1 : -1;
      if (b.m === 'float') { gs = sheet('seagull_float'); if (!gs.ready) continue; gf = frame(gs, t * 1.6 + b.ph); gy = (b.y + 5 - camI) * S - gs.bot * K + gs.ay * K; put(gs, gf, dirb, gx, gy, K, 1); }
      else if (b.m === 'dive' || b.m === 'under') { gs = sheet('seagull_dive'); gf = frame(gs, t * 8 + b.ph); ga = b.m === 'under' ? .8 : 1; put(gs, gf, dirb, gx, (b.y - camI) * S, K, ga); }
      else { gs = sheet('seagull_fly'); gf = frame(gs, t * (b.m === 'land' ? 8 : 6.5) + b.ph); ga = b.m === 'rise' ? .85 : 1; put(gs, gf, dirb, gx, (b.y - camI) * S, K, ga);
        if (b.carry > 0 && gs.ready) { c.fillStyle = '#9ad0f0'; c.fillRect(Math.round(gx + dirb * 12 * K - 2 * K), Math.round((b.y - camI) * S + 3 * K), 4 * K, 2 * K); } } }
    /* one wash darkens the sprites like the water around them: night, depth, rain */
    var nA = .58 * FX.night * (1 - depthF * .75) * .9, sA = ((FX.rain || 0) * .08 + (FX.storm || 0) * .16) * (1 - depthF), dA = .2 * depthF, tot = 1 - (1 - nA) * (1 - sA) * (1 - dA);
    if (tot > .01) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(3,6,72,' + tot.toFixed(3) + ')'; c.fillRect(0, 0, CW, CH); c.globalCompositeOperation = 'source-over'; }
    if (gl) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp((.45 + .55 * FX.night) * (.75 + .25 * Math.sin(t * 2.2)), 0, 1);
      c.drawImage(gl.im, gl.fr * gl.R.fw, 0, gl.R.fw, gl.R.fh, gl.x, gl.y, gl.R.fw * S, gl.R.fh * S); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  };
  SPR.debug = { ship: function (n) { shipForce = n || '1'; shipN = 0; ship = null; shipCool = 0; }, ship_: function () { return ship; } };
  SPR.probe = function () { return { K: K, ship: ship && ship.sh.name, ships: shipN, d: ship && ship.R.d, px: ship && [ship.R.fw, ship.R.fh] }; };
  /* start loading now so nothing pops in */
  Object.keys(M).forEach(sheet);
  if (shipForce) shipCool = .2; else shipCool = 45 + Math.random() * 60;
})();
