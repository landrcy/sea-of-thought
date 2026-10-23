/* Sea of Thought — pixel UI art: icons, parchment rolls, paper texture. */
(function () {
  'use strict';
  var SOT = window.SOT, px = SOT.px, mk = px.mkCanvas, disc = px.disc, line = px.line;
  var ASC = {
    flag: ['#######..', '########.', '#########', '########.', '#######..', '#........', '#........', '#........', '#........'],
    x: ['##...##', '###.###', '.#####.', '..###..', '.#####.', '###.###', '##...##'],
    left: ['...##', '..###', '.###.', '###..', '.###.', '..###', '...##'],
    right: ['##...', '###..', '.###.', '..###', '.###.', '###..', '##...']
  };
  function ascii(cv, name, col) { var rows = ASC[name], g = cv.getContext('2d'); cv.width = rows[0].length; cv.height = rows.length; g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = col || '#ffffff'; rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === '#') g.fillRect(x, y, 1, 1); }); }
  function quill(g, x, y, big) {   // dark-brown pixel quill, nib at (x,y) pointing down-left; feather going up-right
    var L = big ? 22 : 14, i;
    for (i = 0; i < L; i++) { var px1 = x + Math.round(i * .8), py1 = y - i; g.fillStyle = '#2a1608'; g.fillRect(px1, py1, 1, 1); }
    for (i = 4; i < L; i++) { var cx = x + Math.round(i * .8), cy = y - i, w = Math.round(Math.sin((i - 4) / (L - 4) * Math.PI) * (big ? 4 : 3)); g.fillStyle = '#6b4a2a'; g.fillRect(cx + 1, cy, w, 1); g.fillStyle = '#a8845a'; g.fillRect(cx + 1, cy, Math.max(0, w - 2), 1); g.fillStyle = '#8a6a44'; g.fillRect(cx - Math.round(w * .6), cy, Math.round(w * .6), 1); }
    g.fillStyle = '#0e0703'; g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x, y, 1, 1);
  }
  function inkwell(g, x, y) { g.fillStyle = '#1a0e06'; g.fillRect(x + 1, y, 8, 2); g.fillStyle = '#3a2410'; g.fillRect(x, y + 2, 10, 8); g.fillStyle = '#5a3a1e'; g.fillRect(x, y + 2, 2, 8); g.fillStyle = '#1a0e06'; g.fillRect(x + 2, y, 6, 1); g.fillStyle = '#0a0502'; g.fillRect(x, y + 10, 10, 1); g.fillStyle = '#7a5230'; g.fillRect(x + 6, y + 3, 1, 4); }
  function sealArt(cv) { var g = cv.getContext('2d'), r = px.rng(5); cv.width = 22; cv.height = 22; g.clearRect(0, 0, 22, 22);
    for (var y = -10; y <= 10; y++) for (var x = -10; x <= 10; x++) { var d = Math.sqrt(x * x + y * y), a = Math.atan2(y, x), edge = 8.6 + Math.sin(a * 5) * 1.1 + Math.sin(a * 9 + 1) * .7; if (d <= edge) { g.fillStyle = d > edge - 1.2 ? '#03045E' : d > edge - 2.4 ? '#0077B6' : '#0096C7'; g.fillRect(11 + x, 11 + y, 1, 1); } }
    g.fillStyle = '#48CAE4'; g.fillRect(5, 5, 4, 1); g.fillRect(4, 6, 1, 3); g.fillStyle = '#03045E'; for (var i = 0; i < 7; i++) { g.fillRect(6 + i * 2 / 1, 12 + (i % 2) - 1, 2, 1); } g.fillStyle = '#CAF0F8'; for (i = 0; i < 6; i++) g.fillRect(6 + i * 2, 11 + (i % 2) - 1, 1, 1); g.fillStyle = '#CAF0F8'; g.fillRect(9, 7, 4, 1); g.fillRect(10, 6, 2, 1); g.fillRect(10, 8, 2, 3); g.fillStyle = '#90E0EF'; g.fillRect(10, 14, 2, 2); }
  function rocksArt(cv, n) { var g = cv.getContext('2d'); cv.width = 40; cv.height = 20; g.imageSmoothingEnabled = false; g.clearRect(0, 0, 40, 20);
    var xs = [[13], [5, 21], [1, 14, 27]][Math.max(1, n) - 1], ys = [[5], [6, 3], [7, 3, 7]][Math.max(1, n) - 1];
    for (var i = 0; i < Math.max(1, n); i++) { var r = SOT.bottles.rock(i + 1); if (!n) { g.globalAlpha = .45; } g.drawImage(r, 0, 0, r.width, r.height, xs[i], ys[i], r.width * 2, r.height * 2); g.globalAlpha = 1; }
    if (!n) { g.fillStyle = '#f3dfae'; g.fillRect(31, 2, 1, 5); g.fillRect(29, 4, 5, 1); } }
  function writeIcon(cv) { var g = cv.getContext('2d'); cv.width = 32; cv.height = 22; g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 22);
    var s = SOT.bottles.spr(0, 0, 0, 0); g.drawImage(s.c, 1, 9); quill(g, 8, 8, false); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(24, 3, 1, 3); g.fillRect(23, 4, 3, 1); g.fillRect(28, 8, 1, 1); }
  function quillArt(cv) { var g = cv.getContext('2d'); cv.width = 34; cv.height = 30; g.clearRect(0, 0, 34, 30); inkwell(g, 2, 17); quill(g, 11, 18, true); }
  /* parchment roll: a curled cylinder with spiral end caps; `bottom` mirrors it */
  function roll(cv, bottom) {
    var sc = (cv.clientHeight || 48) / 16, Wc = Math.max(40, Math.ceil((cv.clientWidth || 400) / sc)), Hc = 16; cv.width = Wc; cv.height = Hc; var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, Wc, Hc); if (bottom) { g.translate(0, Hc); g.scale(1, -1); }
    var cyl = ['#4a2a10', '#e8c080', '#d9a860', '#c98f4c', '#b87a3a', '#a8672e', '#946026', '#7a4a22', '#5e3818', '#3e2410'], y, x;
    for (y = 0; y < 10; y++) { g.fillStyle = cyl[y]; g.fillRect(5, 1 + y, Wc - 10, 1); }
    for (x = 8; x < Wc - 8; x += 7) { g.fillStyle = 'rgba(255,230,170,.25)'; g.fillRect(x, 2, 2, 3); }
    function cap(cx, dir) { disc(g, cx, 6, 6, '#3e2410'); disc(g, cx, 6, 5, '#d9a860'); disc(g, cx, 6, 4, '#c98f4c'); g.fillStyle = '#7a4a22'; for (var a = 0; a < 18; a += 1) { var r = 1 + a * .2, an = a * .75; g.fillRect(Math.round(cx + Math.cos(an) * r * dir * .9), Math.round(6 + Math.sin(an) * r), 1, 1); } g.fillStyle = '#f3dfae'; g.fillRect(cx - 2 * dir, 2, 2, 1); g.fillStyle = '#3e2410'; g.fillRect(cx, 6, 1, 1); }
    cap(6, 1); cap(Wc - 7, -1);
    g.fillStyle = '#f3dfae'; g.fillRect(9, 10, Wc - 18, 3); g.fillStyle = '#d6b87c'; g.fillRect(9, 12, Wc - 18, 1); g.fillStyle = '#b08a4e'; g.fillRect(10, 13, Wc - 20, 1); g.fillStyle = 'rgba(62,36,16,.5)'; g.fillRect(9, 11, Wc - 18, 1);
    g.fillStyle = '#fff1cf'; g.fillRect(9, 10, Wc - 18, 1);
  }
  function paperTile() { var c = mk(48, 48), g = c.getContext('2d'), r = px.rng(3); g.fillStyle = '#f3dfae'; g.fillRect(0, 0, 48, 48);
    for (var i = 0; i < 160; i++) { var x = (r() * 48) | 0, y = (r() * 48) | 0; g.fillStyle = ['#e8cf98', '#fbe8bc', '#ecd49e', '#e0c488'][i & 3]; g.fillRect(x, y, 1 + (r() > .8 ? 1 : 0), 1); }
    for (i = 0; i < 6; i++) { g.fillStyle = 'rgba(176,138,78,.35)'; var fx = (r() * 40) | 0, fy = (r() * 46) | 0; g.fillRect(fx, fy, 5 + (r() * 5 | 0), 1); }
    return c.toDataURL(); }
  SOT.icons = { ascii: ascii, quill: quill, seal: sealArt, rocks: rocksArt, write: writeIcon, quillArt: quillArt, roll: roll, paperTile: paperTile };
})();
