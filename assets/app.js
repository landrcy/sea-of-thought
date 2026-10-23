/* Sea of Thought — page logic. All user text is rendered with textContent only. */
(function () {
  'use strict';
  var SOT = window.SOT, $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAXLEN = 280, COOLDOWN = 30000, LAST_KEY = 'sot:last';
  var DEMO = ['Hello from the shore!', 'I planted a tree today. It is small, but it is mine.', 'To whoever finds this: you are doing better than you think.', 'Why do we say "sleep tight"? Asking for a friend.', 'The moon looked huge tonight. I told nobody. Now I told the sea.', 'Lost: one sock. Found: a reason to smile.', 'Today I finally called my grandmother. We talked for two hours.', 'Pineapple on pizza is fine. Fight me, gently.', 'If you can read this, wave back at the horizon.', 'I wrote a song in the shower and it was a masterpiece. It is gone now.', 'Be kind to the next person. They carry more than you can see.', 'Three things that went right today: coffee, a green light, this bottle.'];
  var fmtFull = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  var fmtShort = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  var full = function (ts) { return fmtFull.format(new Date(ts)); }, short = function (ts) { return fmtShort.format(new Date(ts)); };

  /* sky: day by default; ?sky=night is a developer preview */
  SOT.setSky(qs.get('sky') === 'night' ? 'night' : 'day'); SOT.sky.d = SOT.sky.target;

  /* ---------- title: integer pixel scale, fades as you dive ---------- */
  var timg = $('title-img');
  function scaleTitle() { var w = timg.naturalWidth; if (!w) return; var mobile = innerWidth <= 640, k = Math.max(1, Math.floor((mobile ? innerWidth - 24 : Math.min(innerWidth * .7, 900)) / w)); timg.style.width = (w * k) + 'px'; }
  var titleEl = document.querySelector('.title'); function fadeTitle() { var y = window.scrollY || 0, o = Math.max(0, 1 - y / (innerHeight * .4)); titleEl.style.opacity = o.toFixed(2); titleEl.style.transform = 'translateY(' + (-y * .35).toFixed(0) + 'px)'; } addEventListener('scroll', fadeTitle, { passive: true }); fadeTitle();
  timg.addEventListener('load', scaleTitle); addEventListener('resize', scaleTitle); if (timg.complete) scaleTitle();

  /* ---------- pixel icons ---------- */
  var I = SOT.icons;
  document.querySelectorAll('.x canvas').forEach(function (c) { I.ascii(c, 'x', '#ffffff'); });
  I.write($('write-btn').firstChild); I.seal($('send').firstChild); I.quillArt(document.querySelector('.quillart'));
  I.ascii($('m-prev').firstChild, 'left', '#f3dfae'); I.ascii($('m-next').firstChild, 'right', '#f3dfae');
  try { document.documentElement.style.setProperty('--paper', 'url(' + I.paperTile() + ')'); } catch (e) {}
  function drawRolls(root) { root.querySelectorAll('.roll').forEach(function (c) { I.roll(c, c.classList.contains('bottom')); }); }

  /* ---------- data ---------- */
  var demoN = parseInt(qs.get('demo'), 10) || 0, demoList = null;
  var api = SOT.createSeaApi({ storage: window.localStorage, forceLocal: qs.has('local') });
  var bottles = [], knownIds = {};
  if (demoN) { var t0 = Date.now(); demoList = []; for (var i = 1; i <= demoN; i++) demoList.push({ id: 'd' + i, n: i, ts: t0 - (demoN - i) * 3600e3 * 5.3, name: i % 3 ? ['Mara', 'Jun', 'Otis', 'Wren', ''][i % 5] : '', msg: DEMO[i % DEMO.length] + (i % 4 === 0 ? ' ' + DEMO[(i + 5) % DEMO.length] : ''), rocks: (i * 7) % 5 === 0 ? 1 + (i % 3) : 0 }); }

  /* ---------- ocean + bottle buttons (fixed overlay, positioned by the scene) ---------- */
  var overlay = $('overlay'), ocean = SOT.createOcean($('ocean'), overlay, $('spacer')), els = {}, lastFocus = null;
  function bottleEl(b) {
    var el = els[b.id]; if (el) return el;
    el = document.createElement('button'); el.type = 'button'; el.className = 'bottle-hit'; var chip = document.createElement('span'), nb = document.createElement('b'), when = document.createElement('span');
    chip.className = 'chip'; nb.textContent = '#' + b.n; when.textContent = short(b.ts); chip.append(nb, when); el.append(chip);
    el.setAttribute('aria-label', 'Open bottle #' + b.n + ', ' + full(b.ts) + (b.rocks ? ', weighed down by ' + b.rocks + (b.rocks === 1 ? ' rock' : ' rocks') : ''));
    el.addEventListener('click', function () { if (picking) openReport(b.id, el); else openModal(b.id, el); });
    el.addEventListener('mouseenter', function () { ocean.hover(b.id); }); el.addEventListener('mouseleave', function () { ocean.hover(null); });
    el.addEventListener('focus', function () { ocean.hover(b.id); var it = ocean.items.filter(function (x) { return x.id === b.id; })[0]; if (it) ocean.reveal(it); }); el.addEventListener('blur', function () { ocean.hover(null); });
    els[b.id] = el; overlay.appendChild(el); return el;
  }
  function updateSea(newId) {
    var list = bottles.slice().sort(function (a, b) { return b.n - a.n || b.ts - a.ts; }), keep = {};
    var items = list.map(function (b) { keep[b.id] = 1; return { id: b.id, n: b.n, ts: b.ts, rocks: b.rocks | 0, el: bottleEl(b) }; });
    Object.keys(els).forEach(function (id) { if (!keep[id]) { els[id].remove(); delete els[id]; } });
    ocean.setBottles(items, newId);
    $('live').textContent = bottles.length ? bottles.length + (bottles.length === 1 ? ' bottle' : ' bottles') + ' in the sea. Scroll down to find older ones.' : 'The sea is empty. Be the first to drop a bottle.';
    delBtn.disabled = !bottles.length; if (!bottles.length && picking) setPick(false);
  }

  /* ---------- load / poll ---------- */
  async function load(first) {
    var list; try { list = demoList || await api.list(); } catch (e) { list = []; }
    var fresh = list.filter(function (b) { return !knownIds[b.id]; }); list.forEach(function (b) { knownIds[b.id] = 1; });
    if (first || fresh.length) { bottles = list; updateSea(first ? null : (fresh.length ? fresh[fresh.length - 1].id : null)); }
    if (first && /^#bottle-(\d+)$/.test(location.hash)) { var n = +RegExp.$1, b = bottles.filter(function (x) { return x.n === n; })[0]; if (b) { openModal(b.id, null); var it = ocean.items.filter(function (x) { return x.id === b.id; })[0]; if (it) ocean.reveal(it); } }
  }
  if (!demoN) { setInterval(function () { if (!document.hidden) load(false); }, 25000); document.addEventListener('visibilitychange', function () { if (!document.hidden) load(false); }); }

  /* ---------- generic modal helpers ---------- */
  function show(m, focusEl, from) { lastFocus = from || document.activeElement; var ps = m.querySelector('.pscroll'); ps.classList.add('closed'); m.classList.remove('open'); m.hidden = false; drawRolls(m); void m.offsetWidth; requestAnimationFrame(function () { m.classList.add('open'); setTimeout(function () { ps.classList.remove('closed'); }, RM ? 0 : 220); }); if (focusEl) focusEl.focus({ preventScroll: true }); }
  function hide(m) { m.hidden = true; m.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  function lockScroll(e) { if (e.target.closest && e.target.closest('textarea,.m-body')) return; e.preventDefault(); }
  ['wheel', 'touchmove'].forEach(function (ev) { document.querySelectorAll('.modal').forEach(function (m) { m.addEventListener(ev, lockScroll, { passive: false }); }); });
  document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('[data-close]'); if (c) { var m = c.closest('.modal'); if (m === modal) closeModal(); else if (m === wmodal) closeWrite(); else if (m === rmodal) closeReport(); } });
  addEventListener('resize', function () { [modal, wmodal, rmodal].forEach(function (m) { if (!m.hidden) drawRolls(m); }); });
  document.addEventListener('keydown', function (e) {
    var m = !modal.hidden ? modal : !wmodal.hidden ? wmodal : !rmodal.hidden ? rmodal : null;
    if (!m) { if (e.key === 'Escape' && picking) { setPick(false); delBtn.focus({ preventScroll: true }); } return; }
    if (e.key === 'Escape') { if (m === modal) closeModal(); else if (m === rmodal) closeReport(); else closeWrite(); return; }
    if (m === modal && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { step(e.key === 'ArrowLeft' ? 1 : -1); return; }
    if (e.key === 'Tab') { var f = [].slice.call(m.querySelectorAll('button:not([disabled]),input,textarea')).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });

  /* ---------- read a bottle ---------- */
  var modal = $('modal'), curId = null;
  function rocksNode(n) { var box = $('m-rocks-art'); box.textContent = ''; var lbl = $('m-rocks'); lbl.hidden = !n; if (!n) return; for (var i = 0; i < n; i++) { var r = SOT.bottles.rock(i + 1), c = document.createElement('canvas'); c.width = r.width; c.height = r.height; c.getContext('2d').drawImage(r, 0, 0); c.style.width = (r.width * 4) + 'px'; c.style.height = (r.height * 4) + 'px'; c.style.imageRendering = 'pixelated'; c.style.marginRight = '6px'; box.appendChild(c); } lbl.setAttribute('role', 'img'); lbl.setAttribute('aria-label', n + (n === 1 ? ' rock' : ' rocks') + ' tied to this bottle'); }
  function fill(b) {
    curId = b.id; $('m-title').textContent = 'Bottle #' + b.n; $('m-when').textContent = full(b.ts) + ' (New York time)'; $('m-from').textContent = b.name ? '— ' + b.name : '— an unknown drifter'; $('m-body').textContent = b.msg; $('m-body').scrollTop = 0; rocksNode(b.rocks | 0);
    var idx = bottles.slice().sort(function (a, c) { return c.n - a.n; }).findIndex(function (x) { return x.id === b.id; }); $('m-next').disabled = idx <= 0; $('m-prev').disabled = idx >= bottles.length - 1;
    try { history.replaceState(null, '', '#bottle-' + b.n); } catch (e) {}
  }
  function sorted() { return bottles.slice().sort(function (a, c) { return c.n - a.n; }); }
  function openModal(id, from) { var b = bottles.filter(function (x) { return x.id === id; })[0]; if (!b) return; fill(b); show(modal, modal.querySelector('.x'), from); }
  function closeModal() { hide(modal); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  function step(d) { var L = sorted(), i = L.findIndex(function (x) { return x.id === curId; }), b = L[i + d]; if (b) { var ps = $('rscroll'); ps.classList.add('closed'); setTimeout(function () { fill(b); ps.classList.remove('closed'); }, RM ? 0 : 260); var it = ocean.items.filter(function (x) { return x.id === b.id; })[0]; if (it) ocean.reveal(it); } }
  $('m-prev').addEventListener('click', function () { step(1); }); $('m-next').addEventListener('click', function () { step(-1); });

  /* ---------- write a bottle ---------- */
  var wmodal = $('wmodal'), wdlg = $('wdlg'), wscroll = $('wscroll'), shop = SOT.createWorkshop($('shop-cv'), $('workshop')), form = $('form'), msg = $('msg'), nameIn = $('name'), send = $('send'), note = $('note'), cnt = $('count'), cdT = null, rocks = 0;
  function drawRocks() { I.rocks($('rocks').firstChild, rocks); $('rocks').setAttribute('aria-label', 'Tie rocks to the bottle: ' + rocks + '. Press to change (0 to 3).'); $('rocks').setAttribute('data-tip', 'Rocks: ' + rocks + ' · heavier sinks faster'); }
  $('rocks').addEventListener('click', function () { rocks = (rocks + 1) % 4; drawRocks(); }); drawRocks();
  function openWrite() { wdlg.classList.remove('play', 'busy'); wscroll.classList.remove('rolling'); show(wmodal, msg, $('write-btn')); }
  function closeWrite() { if (shop.busy) return; hide(wmodal); }
  $('write-btn').addEventListener('click', openWrite);
  msg.addEventListener('input', function () { cnt.textContent = msg.value.length + '/' + MAXLEN; cnt.classList.toggle('full', msg.value.length >= MAXLEN); });
  function lastSent() { var v = 0; try { v = +localStorage.getItem(LAST_KEY) || 0; } catch (e) {} return v; }
  function cooldown() { clearInterval(cdT); function tick() { var left = Math.ceil((lastSent() + COOLDOWN - Date.now()) / 1000); if (left > 0) { send.disabled = true; note.textContent = 'The tide needs a moment… ' + left + 's'; } else { clearInterval(cdT); send.disabled = shop.busy; if (/tide/.test(note.textContent)) note.textContent = ''; } } tick(); cdT = setInterval(tick, 500); }
  function afterSend(r, nm) {
    msg.readOnly = nameIn.readOnly = false;
    r.all.forEach(function (b) { knownIds[b.id] = 1; }); bottles = r.all; msg.value = ''; rocks = 0; drawRocks(); cnt.textContent = '0/' + MAXLEN; note.textContent = '';
    lastFocus = $('write-btn'); hide(wmodal); wdlg.classList.remove('play', 'busy'); wscroll.classList.remove('rolling');
    var go = function () { updateSea(r.bottle.id); $('live').textContent = 'Your bottle number ' + r.bottle.n + ' is now floating in the sea.'; };
    if ((window.scrollY || 0) < 40) go(); else { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); var tries = 0; (function wait() { if ((window.scrollY || 0) < 40 || ++tries > 180) go(); else requestAnimationFrame(wait); })(); }
    cooldown();
  }
  form.addEventListener('submit', async function (e) {
    e.preventDefault(); if (shop.busy) return;
    var text = msg.value.replace(/\s+$/g, '').slice(0, MAXLEN), nm = nameIn.value.trim().slice(0, 24);
    if (!text.trim()) { msg.focus(); return; }
    if (lastSent() + COOLDOWN - Date.now() > 0) { cooldown(); return; }
    try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e2) {}
    send.disabled = true; msg.readOnly = nameIn.readOnly = true; note.textContent = '';
    var nextN = bottles.reduce(function (m, b) { return Math.max(m, b.n); }, 0) + 1, rk = rocks;
    var p; if (demoN) { var nb = { id: 'new' + nextN, n: nextN, ts: Date.now(), name: nm, msg: text, rocks: rk }; p = Promise.resolve({ bottle: nb, all: bottles.concat([nb]), mode: 'local' }); } else p = api.add({ name: nm, msg: text, rocks: rk }).catch(function () { return null; });
    wdlg.classList.add('busy'); wscroll.classList.add('closed');   // the paper rolls itself up…
    setTimeout(function () {           // …then the workshop takes over
      wscroll.classList.add('rolling'); setTimeout(function () {
        wdlg.classList.add('play'); shop.play(text, async function () {
          var r = await p;
          if (!r) { msg.readOnly = nameIn.readOnly = false; wdlg.classList.remove('play', 'busy'); wscroll.classList.remove('rolling'); drawRolls(wmodal); wscroll.classList.remove('closed'); note.textContent = 'The bottle slipped away — please try again.'; try { localStorage.removeItem(LAST_KEY); } catch (e3) {} send.disabled = false; return; }
          afterSend(r, nm);
        }, rk, nextN);
      }, RM ? 0 : 380);
    }, RM ? 0 : 950);
  });
  cooldown();

  /* ---------- delete a bottle -> pick mode -> report dialog (sent to a review queue, never deleted instantly) ---------- */
  var F = SOT.filter, delBtn = $('del-btn'), delLabel = $('del-label'), picking = false, toastEl = $('toast'), toastT = null;
  var rmodal = $('rmodal'), rform = $('rform'), rNum = $('r-num'), rWhy = $('r-why'), rPeek = $('r-peek'), rNote = $('r-note'), rCount = $('r-count'), rSend = $('r-send'), rBottle = null, noteT = null;
  var reports = SOT.createReportsApi({ storage: window.localStorage, forceLocal: qs.has('local') || !!demoN, url: /^https:\/\/textdb\.dev\/api\/data\/[\w-]+$/.test(qs.get('reportsurl') || '') ? qs.get('reportsurl') : undefined });
  I.ascii(rSend.querySelector('canvas'), 'flag', '#f3dfae');
  function setPick(on) {
    picking = !!on; document.body.classList.toggle('picking', picking); delBtn.classList.toggle('on', picking); delBtn.setAttribute('aria-pressed', picking ? 'true' : 'false');
    delLabel.textContent = picking ? 'pick a bottle… · cancel (esc)' : 'delete a bottle'; ocean.pick(picking);
    delBtn.setAttribute('aria-label', picking ? 'Cancel: stop picking a bottle' : 'Delete a bottle: pick a bottle to send for review');
    $('live').textContent = picking ? 'Pick a bottle: click one, or focus one and press Enter. Press Escape to cancel.' : '';
  }
  delBtn.addEventListener('click', function () { setPick(!picking); });
  function toast(t) { clearTimeout(toastT); toastEl.textContent = t; toastEl.classList.remove('out'); toastEl.hidden = false; $('live').textContent = t; toastT = setTimeout(function () { toastEl.classList.add('out'); setTimeout(function () { toastEl.hidden = true; }, RM ? 0 : 350); }, 2800); }
  function rnote(t) { clearTimeout(noteT); rNote.textContent = t; rNote.hidden = false; rNote.style.animation = 'none'; void rNote.offsetWidth; rNote.style.animation = ''; noteT = setTimeout(function () { rNote.hidden = true; }, 4200); }
  function findByN(n) { return bottles.filter(function (b) { return b.n === n; })[0] || null; }
  function peek() {
    var n = parseInt(rNum.value, 10); rBottle = isFinite(n) ? findByN(n) : null;
    if (rBottle) { var t = rBottle.msg.replace(/\s+/g, ' '); rPeek.textContent = '“' + (t.length > 56 ? t.slice(0, 55) + '…' : t) + '” ' + (rBottle.name ? '— ' + rBottle.name : ''); }
    else rPeek.textContent = rNum.value ? 'No bottle with that number.' : 'Type the number of the bottle.';
    rSend.disabled = !rBottle;
  }
  /* live filter: finished words become ***; a word touching the caret is judged once you move on */
  function liveFilter(el, digits) {
    var v = el.value, caret = el.selectionStart == null ? v.length : el.selectionStart, hit = false;
    if (digits) { if (F.has(v)) { el.value = ''; rnote('Please keep it kind'); return true; } el.value = v.replace(/\D/g, '').slice(0, 5); return false; }
    var r = F.mask(v, caret); if (r.bad) { el.value = r.text; var p = caret - (v.length - r.text.length); el.setSelectionRange(Math.max(0, Math.min(r.text.length, p)), Math.max(0, Math.min(r.text.length, p))); rnote('Please keep it kind'); hit = true; }
    return hit;
  }
  function hardFilter(el) { var r = F.clean(el.value); if (r.bad) { el.value = r.text; return true; } return false; }
  rNum.addEventListener('input', function () { liveFilter(rNum, true); peek(); });
  rWhy.addEventListener('input', function () { liveFilter(rWhy, false); rCount.textContent = rWhy.value.length + '/140'; });
  rWhy.addEventListener('blur', function () { if (hardFilter(rWhy)) { rnote('Please keep it kind'); rCount.textContent = rWhy.value.length + '/140'; } });
  function openReport(id, from) {
    var b = bottles.filter(function (x) { return x.id === id; })[0]; if (!b) return; setPick(false);
    rNum.value = String(b.n); rWhy.value = ''; rCount.textContent = '0/140'; rNote.hidden = true; peek(); rSend.disabled = false;
    show(rmodal, rWhy, from);
  }
  function closeReport() { hide(rmodal); }
  rform.addEventListener('submit', async function (e) {
    e.preventDefault(); peek(); if (!rBottle) { rNum.focus(); return; }
    var badNum = F.has(rNum.value), badWhy = F.has(rWhy.value);
    if (badNum || badWhy) { if (badNum) rNum.value = ''; hardFilter(rWhy); rCount.textContent = rWhy.value.length + '/140'; rnote('Please keep it kind'); peek(); return; }   // blocked: nothing is sent
    if (rWhy.value.indexOf('***') > -1) { rnote('Please keep it kind — edit out the ***'); rWhy.focus(); return; }   // masked words: ask for a rewrite
    rSend.disabled = true;
    var res = await reports.submit(rBottle, rWhy.value);
    if (res.state === 'sent') { closeReport(); toast('Sent for review'); }
    else if (res.state === 'duplicate') { closeReport(); toast('Already sent — thank you'); }
    else if (res.state === 'wait') { rSend.disabled = false; rnote('Easy… try again in ' + res.wait + 's'); }
    else { rSend.disabled = false; rnote('Could not send — please try again'); }
  });
  rmodal.querySelector('.ink.num') && (document.getElementById('r-num').setAttribute('autocapitalize', 'off'));

  load(true);
  if (qs.has('pick')) setPick(true);
  if (qs.has('report')) { var rn = +qs.get('report'); setTimeout(function () { var b = findByN(rn) || bottles[0]; if (b) { openReport(b.id, delBtn); var w = qs.get('why'); if (w) { rWhy.value = w; rCount.textContent = w.length + '/140'; } } }, 600); }
  if (qs.has('write')) { openWrite(); var wt = qs.get('write'); if (wt && wt !== '1') { msg.value = 'Dear sea, I hope this finds you well. Today I learned that even the smallest bottle can carry a whole ocean of thought.'; cnt.textContent = msg.value.length + '/' + MAXLEN; nameIn.value = 'Finn'; rocks = Math.min(3, +wt || 0); drawRocks(); } }
  var fz = parseFloat(qs.get('anim')); if (fz) { openWrite(); wdlg.classList.add('play'); shop.freeze(fz, rocks || +qs.get('rocks') || 0, +qs.get('bn') || 7); }
  var sy = parseFloat(qs.get('scroll')); if (sy) setTimeout(function () { window.scrollTo(0, sy); }, 400);
})();
