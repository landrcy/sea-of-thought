/* Sea of Thought — calm background music: a real recorded track (CC0), played in an <audio loop>.
   Starts on the first user interaction (browsers block autoplay), low volume with a slow fade-in, mute remembered, pauses with the tab. */
(function () {
  'use strict';
  var SOT = window.SOT, spr = SOT.px.sprCanvas, KEY = 'sot:music', VOL = .35, FADE = 3000;
  var btn = document.getElementById('music-btn'); if (!btn) return;
  var au = new Audio(); au.loop = true; au.preload = 'none'; au.volume = 0; au.setAttribute('aria-hidden', 'true');
  var canOgg = au.canPlayType('audio/ogg; codecs="vorbis"'); au.src = canOgg ? 'assets/music/aquaria.ogg' : 'assets/music/aquaria.mp3';
  var muted = false; try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) {}
  var started = false, fadeT = 0, fadeFrom = 0, raf = 0, credit = btn.getAttribute('data-tip');
  var ON = ['.......ww...', '......www..w', '..wwwwwww...', '.wwwwwwww.w.', '.wwwwwwww.w.', '..wwwwwww...', '......www..w', '.......ww...'], OFF = ['.......ww...', '......www...', '..wwwwwww.x.', '.wwwwwwww..x', '.wwwwwwww.x.', '..wwwwwww..x', '......www...', '.......ww...'];
  function icon() { var c = btn.firstChild, s = spr(muted ? OFF : ON, { w: '#CAF0F8', x: '#F0A050' }); c.width = 12; c.height = 8; c.style.height = '16px'; var g = c.getContext('2d'); g.clearRect(0, 0, 12, 8); g.drawImage(s, 0, 0); btn.setAttribute('aria-pressed', String(!muted)); btn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music'); btn.setAttribute('data-tip', (muted ? 'Music off · ' : '') + credit); }
  function fadeTo(v, ms, done) { cancelAnimationFrame(raf); fadeFrom = au.volume; fadeT = performance.now(); (function step() { var k = Math.min(1, (performance.now() - fadeT) / ms); au.volume = Math.max(0, Math.min(1, fadeFrom + (v - fadeFrom) * k)); if (k < 1) raf = requestAnimationFrame(step); else if (done) done(); })(); }
  function play() { if (muted || document.hidden) return; var p = au.play(); started = true; if (p && p.catch) p.catch(function () { started = false; }); fadeTo(VOL, FADE); }
  function pause() { fadeTo(0, 400, function () { au.pause(); }); }
  var evs = ['pointerdown', 'keydown', 'touchend', 'click'];
  function first(e) { if (e.target && e.target.closest && e.target.closest('#music-btn')) return; if (started) return; play(); if (started) evs.forEach(function (n) { removeEventListener(n, first, true); }); }
  evs.forEach(function (n) { addEventListener(n, first, true); });
  btn.addEventListener('click', function () { muted = !muted; try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) {} icon(); if (muted) { pause(); } else { evs.forEach(function (n) { removeEventListener(n, first, true); }); play(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (started) { cancelAnimationFrame(raf); au.pause(); } } else if (started && !muted) { var p = au.play(); if (p && p.catch) p.catch(function () {}); fadeTo(VOL, 1200); } });
  icon(); SOT.music = { audio: au, get muted() { return muted; } };
})();
