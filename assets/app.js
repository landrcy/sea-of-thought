/* Sea of Thought — page logic. All user text is rendered with textContent only. */
(function () {
  'use strict';
  var SOT = window.SOT, $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAXLEN = 280, COOLDOWN = 30000, LAST_KEY = 'sot:last';
  var SEEDS = [
    { name: 'Example · Sea Keeper', msg: 'This is an EXAMPLE bottle so the sea is not empty. Welcome to the Sea of Thought! Write something kind, silly or strange and set it adrift.' },
    { name: 'Example · A wave', msg: 'Example bottle: sea otters hold hands while they sleep so they do not drift apart.' },
    { name: 'Example · Floater', msg: 'Example bottle: if you are reading this, we are floating in the same ocean. Hope your day is a good one.' }
  ];
  var DEMO = ['Hello from the shore!', 'I planted a tree today. It is small, but it is mine.', 'To whoever finds this: you are doing better than you think.', 'Why do we say "sleep tight"? Asking for a friend.', 'The moon looked huge tonight. I told nobody. Now I told the sea.', 'Lost: one sock. Found: a reason to smile.', 'Today I finally called my grandmother. We talked for two hours.', 'Pineapple on pizza is fine. Fight me, gently.', 'If you can read this, wave back at the horizon.', 'I wrote a song in the shower and it was a masterpiece. It is gone now.', 'Be kind to the next person. They carry more than you can see.', 'Three things that went right today: coffee, a green light, this bottle.'];
  var fmtFull = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  var fmtShort = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  var full = function (ts) { return fmtFull.format(new Date(ts)); }, short = function (ts) { return fmtShort.format(new Date(ts)); };
  var tintOf = function (id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h) % SOT.TINT_COUNT; };

  /* ---------- data ---------- */
  var demoN = parseInt(qs.get('demo'), 10) || 0, demoList = null;
  var api = SOT.createSeaApi({ storage: window.localStorage, forceLocal: qs.has('local') });
  var bottles = [], knownIds = {};
  if (demoN) { var t0 = Date.now(); demoList = []; for (var i = 1; i <= demoN; i++) demoList.push({ id: 'd' + i, n: i, ts: t0 - (demoN - i) * 3600e3 * 5.3, name: i % 3 ? ['Mara', 'Jun', 'Otis', 'Wren', ''][i % 5] : '', msg: DEMO[i % DEMO.length] + (i % 4 === 0 ? ' ' + DEMO[(i + 5) % DEMO.length] : ''), seed: false }); demoList[0].seed = true; demoList[0].name = 'Example · Sea Keeper'; demoList[0].msg = 'Example bottle: welcome to the Sea of Thought!'; }

  /* ---------- sea scene + bottle buttons ---------- */
  var stage = $('stage'), overlay = $('overlay'), sea = SOT.createSea($('sea-cv'), overlay, {}), els = {}, lastFocus = null;
  function counts() { var w = stage.clientWidth; return { surf: Math.max(2, Math.min(8, Math.floor(w / 168))), deep: Math.max(2, Math.min(5, Math.floor(w / 215))) }; }
  function bottleEl(b, deep) {
    var el = els[b.id]; if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'bottle-hit'; var chip = document.createElement('span'), nb = document.createElement('b'), when = document.createElement('span');
      chip.className = 'chip'; nb.textContent = '#' + b.n; when.textContent = short(b.ts); chip.append(nb, when); el.append(chip);
      el.setAttribute('aria-label', 'Open bottle #' + b.n + ', ' + full(b.ts));
      el.addEventListener('click', function () { openModal(b.id, el); });
      el.addEventListener('mouseenter', function () { sea.hover(b.id); }); el.addEventListener('mouseleave', function () { sea.hover(null); }); el.addEventListener('focus', function () { sea.hover(b.id); }); el.addEventListener('blur', function () { sea.hover(null); });
      els[b.id] = el; overlay.appendChild(el);
    }
    el.firstChild.classList.toggle('deep', !!deep); el.style.setProperty('--S', sea.S); return el;
  }
  function updateSea(newId) {
    var c = counts(), list = bottles.slice().sort(function (a, b) { return b.n - a.n || b.ts - a.ts; }), shown = list.slice(0, c.surf + c.deep), keep = {};
    var items = shown.map(function (b, i) { keep[b.id] = 1; return { id: b.id, n: b.n, ts: b.ts, deep: i >= c.surf, tint: tintOf(b.id), el: bottleEl(b, i >= c.surf) }; });
    Object.keys(els).forEach(function (id) { if (!keep[id]) { els[id].remove(); delete els[id]; } });
    sea.setItems(items, newId);
    $('status').textContent = bottles.length ? 'Showing the newest ' + shown.length + ' of ' + bottles.length + ' bottles · older ones are in the tray below' : 'The sea is quiet. Be the first to write a bottle.';
    $('hero-count').textContent = bottles.length ? bottles.length + (bottles.length === 1 ? ' bottle' : ' bottles') + ' adrift' + (api.mode === 'remote' && !demoN ? ' · shared sea' : demoN ? ' · demo data' : ' · offline preview (saved in this browser)') : '';
  }

  /* ---------- load / poll ---------- */
  async function load(first) {
    var list; try { list = demoList || await api.list(SEEDS); } catch (e) { list = []; }
    var fresh = list.filter(function (b) { return !knownIds[b.id]; }); list.forEach(function (b) { knownIds[b.id] = 1; });
    if (first || fresh.length || list.length !== bottles.length) { bottles = list; updateSea(first ? null : (fresh.length ? fresh[fresh.length - 1].id : null)); renderArchive(); }
    if (first && /^#bottle-(\d+)$/.test(location.hash)) { var n = +RegExp.$1, b = bottles.filter(function (x) { return x.n === n; })[0]; if (b) openModal(b.id, null); }
  }
  var resizeT; window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (bottles.length) updateSea(null); }, 200); });
  if (!demoN) { setInterval(function () { if (!document.hidden) load(false); }, 25000); document.addEventListener('visibilitychange', function () { if (!document.hidden) load(false); }); }

  /* ---------- write flow ---------- */
  var shop = SOT.createWorkshop($('shop-cv')), form = $('form'), msg = $('msg'), nameIn = $('name'), send = $('send'), note = $('note'), cnt = $('count'), cdT = null;
  msg.addEventListener('input', function () { cnt.textContent = msg.value.length + ' / ' + MAXLEN; });
  function lastSent() { var v = 0; try { v = +localStorage.getItem(LAST_KEY) || 0; } catch (e) {} return v; }
  function setBusy(b) { send.disabled = b; }
  function cooldown() { clearInterval(cdT); function tick() { var left = Math.ceil((lastSent() + COOLDOWN - Date.now()) / 1000); if (left > 0) { send.disabled = true; send.textContent = 'Wait ' + left + 's…'; } else { clearInterval(cdT); send.disabled = shop.busy; send.textContent = 'Seal & throw into the sea'; } } tick(); cdT = setInterval(tick, 500); }
  form.addEventListener('submit', async function (e) {
    e.preventDefault(); if (shop.busy) return;
    var text = msg.value.replace(/\s+$/g, '').slice(0, MAXLEN), nm = nameIn.value.trim().slice(0, 24);
    if (!text.trim()) { note.textContent = 'Write a message first.'; msg.focus(); return; }
    var wait = lastSent() + COOLDOWN - Date.now(); if (wait > 0) { note.textContent = 'The tide needs a moment — try again in ' + Math.ceil(wait / 1000) + 's.'; return; }
    try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e2) {}
    setBusy(true); cooldown(); note.textContent = 'Writing your scroll…';
    $('shop-cv').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    var p; if (demoN) { var nn = bottles.length + 1; p = Promise.resolve({ bottle: { id: 'new' + nn, n: nn, ts: Date.now(), name: nm, msg: text, seed: false }, all: bottles.concat([{ id: 'new' + nn, n: nn, ts: Date.now(), name: nm, msg: text, seed: false }]), mode: 'local' }); } else p = api.add({ name: nm, msg: text }).catch(function () { return null; });
    shop.play(text, async function () {
      var r = await p; if (!r) { note.textContent = 'The bottle slipped away — please try again.'; localStorage.removeItem(LAST_KEY); cooldown(); return; }
      r.all.forEach(function (b) { knownIds[b.id] = 1; }); bottles = r.all; updateSea(r.bottle.id); renderArchive();
      msg.value = ''; cnt.textContent = '0 / ' + MAXLEN;
      var a = document.createElement('a'); a.href = '#sea'; a.textContent = 'See it floating'; note.textContent = 'Bottle #' + r.bottle.n + ' is adrift' + (r.mode === 'remote' ? '. Everyone can read it now. ' : ' (offline preview: saved in this browser only). '); note.appendChild(a);
    });
  });
  cooldown();

  /* ---------- archive ---------- */
  var PER = 12, page = 1, grid = $('grid');
  function filtered() { var q = $('q').value.trim().toLowerCase().replace(/^#/, ''), l = bottles.slice(); if (q) l = l.filter(function (b) { return String(b.n) === q || b.msg.toLowerCase().indexOf(q) > -1 || b.name.toLowerCase().indexOf(q) > -1 || full(b.ts).toLowerCase().indexOf(q) > -1; }); l.sort(function (a, b) { return $('sort').value === 'old' ? a.n - b.n : b.n - a.n; }); return l; }
  function renderArchive() {
    var l = filtered(), pages = Math.max(1, Math.ceil(l.length / PER)); page = Math.min(page, pages); var s = (page - 1) * PER, part = l.slice(s, s + PER);
    grid.textContent = '';
    part.forEach(function (b) {
      var li = document.createElement('li'), bt = document.createElement('button'), nb = document.createElement('b'), sm = document.createElement('small'), nm = document.createElement('span'), p = document.createElement('p');
      bt.type = 'button'; bt.className = 'card-b'; nb.textContent = '#' + b.n + (b.seed ? ' · example' : ''); sm.textContent = full(b.ts); nm.className = 'nm'; nm.textContent = b.name ? 'From ' + b.name : 'From an unknown drifter'; p.textContent = b.msg;
      bt.append(nb, sm, nm, p); bt.addEventListener('click', function () { openModal(b.id, bt); }); li.appendChild(bt); grid.appendChild(li);
    });
    $('amr').textContent = l.length ? 'Showing ' + (s + 1) + '–' + (s + part.length) + ' of ' + l.length + (l.length === bottles.length ? ' bottles' : ' matching bottles') : (bottles.length ? 'No bottles match that search.' : 'No bottles yet.');
    $('pg').textContent = 'Page ' + page + ' / ' + pages; $('prev').disabled = page <= 1; $('next').disabled = page >= pages;
  }
  $('q').addEventListener('input', function () { page = 1; renderArchive(); }); $('sort').addEventListener('change', function () { page = 1; renderArchive(); });
  $('prev').addEventListener('click', function () { page--; renderArchive(); }); $('next').addEventListener('click', function () { page++; renderArchive(); });

  /* ---------- modal ---------- */
  var modal = $('modal'), curId = null;
  function fill(b) {
    curId = b.id; $('m-title').textContent = 'Bottle #' + b.n; $('m-when').textContent = full(b.ts) + ' (New York time)'; $('m-from').textContent = b.name ? 'From ' + b.name : 'From an unknown drifter'; $('m-body').textContent = b.msg; $('m-badge').hidden = !b.seed;
    var idx = bottles.findIndex(function (x) { return x.id === b.id; }); $('m-prev').disabled = idx <= 0; $('m-next').disabled = idx >= bottles.length - 1;
    try { history.replaceState(null, '', '#bottle-' + b.n); } catch (e) {}
  }
  function openModal(id, from) {
    var b = bottles.filter(function (x) { return x.id === id; })[0]; if (!b) return; lastFocus = from || document.activeElement; modal.classList.remove('open'); fill(b); modal.hidden = false; document.body.style.overflow = 'hidden';
    void modal.offsetWidth; requestAnimationFrame(function () { modal.classList.add('open'); }); setTimeout(function () { modal.classList.add('open'); }, 60); modal.querySelector('.x').focus();
  }
  function closeModal() { modal.hidden = true; modal.classList.remove('open'); document.body.style.overflow = ''; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function step(d) { var i = bottles.findIndex(function (x) { return x.id === curId; }), b = bottles[i + d]; if (b) { modal.classList.remove('open'); fill(b); void modal.offsetWidth; setTimeout(function () { modal.classList.add('open'); }, 30); } }
  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeModal(); });
  $('m-prev').addEventListener('click', function () { step(-1); }); $('m-next').addEventListener('click', function () { step(1); });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return; if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') { var f = [].slice.call(modal.querySelectorAll('button:not([disabled])')); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });

  /* ---------- sky toggle, icons, misc ---------- */
  var skyBtn = $('skybtn'), mode = 'dusk'; try { mode = localStorage.getItem('sot:sky') || 'dusk'; } catch (e) {} if (qs.get('sky')) mode = qs.get('sky');
  function applySky() { SOT.setSky(mode); skyBtn.textContent = mode === 'day' ? 'Day' : 'Dusk'; skyBtn.setAttribute('aria-pressed', mode === 'day'); }
  skyBtn.addEventListener('click', function () { mode = mode === 'day' ? 'dusk' : 'day'; try { localStorage.setItem('sot:sky', mode); } catch (e) {} applySky(); });
  applySky(); if (RM || qs.has('still')) SOT.sky.d = SOT.sky.target;
  $('yr').textContent = new Date().getFullYear();
  var ICONS = {
    write: ['................................', '..........................ww....', '........................wwwww...', '.............pppppppppwwwwwpp...', '............pffffffffwwwwwfffp..', '............pfiififfwwwwfffffp..', '............pffffffwwwwfffffp...', '............pfiiiifwwffffffp....', '............pffffffwfffffffp....', '............pfiififfffffffp.....', '............pffffffffffffp......', '............pppppppppppppp......'],
    seal: ['................................', '................................', '..ooooooooooooo.................', '.ogggggggggggggoo...............', 'ogHHHHHHHHHHHggoooooo..........', 'ogg.ffffttfffgggggggoCCCC.......', 'ogg.fiififtfffggggggoCCCC.......', 'ogg.ffffttfffgggggggoCCCC.......', 'ogggggggggggggoooooo.CCCC.......', '.ogggggggggggoo.................', '..ooooooooooo...................'],
    float: ['................................', '................................', '................................', '...ooooooooo....................', '..ogggggggggoo..................', '.ogHHHHHHHHggooooo.CCC..........', '.ogg.fiifffgggggggoCCC..........', '.ogg.fffffffggggggoCCC..........', '..ogggggggggoooooo.CCC..........', '...ooooooooo....................', '................................', '..ww...ww.....ww.....ww.........', '.wwwbbbwwwbbbbwwwbbbbwwwb.......', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbb....']
  };
  var IC = { p: '#e6c88a', f: '#f6e4b4', i: '#4a3320', w: '#ffffff', o: '#2a5a68', g: 'rgba(190,232,238,.55)', H: '#ffd27a', t: '#7a5230', C: '#a8672e', b: '#2a8ad0' };
  document.querySelectorAll('canvas[data-icon]').forEach(function (cv) { var g = cv.getContext('2d'), rows = ICONS[cv.dataset.icon]; g.fillStyle = '#12427c'; g.fillRect(0, 0, 32, 32); rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { if (IC[r[x]]) { g.fillStyle = IC[r[x]]; g.fillRect(x, y + 8, 1, 1); } } }); });
  SOT.createHero($('hero-cv')); SOT.createDeep($('deep')); SOT.createFoot($('foot-cv'));
  load(true);
  var fz = parseFloat(qs.get('anim')); if (fz) shop.freeze(fz);
})();
