/* Sea of Thought — kindness filter (client-side, no dependencies).
 * Catches profanity, slurs, sexual terms and violent threats, including common obfuscations:
 * accents, zero-width chars, homoglyphs, repeated letters (fuuuck), leetspeak (@ 4 3 1 ! 0 $ 5 7 +),
 * separators between letters (f.u.c.k / f u c k / f-u-c-k) and wildcard stars (f*ck, sh*t).
 * Matching is token based (word-boundary aware) so innocent words such as class, assassin, grass,
 * analysis, Scunthorpe, shiitake or "cum laude" are NOT flagged. Matches are replaced by ***.
 * API: SOT.filter.clean(text) -> {text, bad}   SOT.filter.has(text)   SOT.filter.mask(text, caret)
 */
(function (root) {
  'use strict';
  // ---- word lists ---------------------------------------------------------------------------
  // SUB: flagged even inside longer tokens (bullshit, fucking, motherfucker...)
  var SUB = ['fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'cocksuck', 'dickhead', 'asshole', 'pedophil', 'paedophil', 'porn', 'blowjob', 'handjob', 'cumshot', 'jackoff', 'jerkoff', 'dildo', 'wetback', 'towelhead', 'masturbat', 'jizz', 'twat', 'bollock', 'douchebag', 'whorehouse', 'motherfuck', 'cocksucker', 'dipshit', 'bullshit', 'fvck', 'phuck'];
  // WORD: flagged only as a whole word (with an optional suffix)
  var WORD = [
    ['ass', '(es)?s?'], ['asses', ''], ['arse', 's?'], ['asswipe', 's?'], ['jackass', '(es)?'], ['dumbass', '(es)?'], ['fatass', '(es)?'], ['smartass', '(es)?'], ['badassery', ''],
    ['dick', 's?'], ['cock', 's?'], ['cum', '(s|ming)?'], ['tit', '(s|ty|ties)?'], ['titties', ''], ['boob', 's?'], ['boner', 's?'], ['pussy', '|pussies'], ['pussies', ''], ['prick', 's?'],
    ['wank', '(s|er|ers|ed|ing)?'], ['whore', '(s|d)?'], ['slut', '(s|ty)?'], ['piss', '(es|ed|ing|er|ers)?'], ['bastard', 's?'], ['douche', 's?'], ['scumbag', 's?'],
    ['fag', '(s|gy)?'], ['dyke', 's?'], ['tranny', '|trannies'], ['shemale', 's?'], ['retard', '(s|ed)?'], ['spic', 's?'], ['chink', 's?'], ['gook', 's?'], ['kike', 's?'], ['coon', 's?'], ['paki', 's?'], ['beaner', 's?'],
    ['rape', '(s|d|r|rs)?'], ['raping', ''], ['rapist', 's?'], ['molest', '(s|ed|er|ers|ing)?'], ['anal', ''], ['milf', 's?'], ['kys', ''], ['stfu', ''], ['gtfo', ''], ['pedo', 's?'], ['paedo', 's?']
  ];
  // phrases (violent threats etc): each slot is a list of alternatives; apostrophes are dropped (i'll -> ill)
  var YOU = 'you|u|ya|yourself|urself|yourselves', THEM = 'him|her|them|everyone|everybody|myself';
  var PHRASES = [
    ['kill', YOU + '|' + THEM], ['kill', 'your', 'self'], ['hang', 'yourself|urself'], ['go', 'die'], ['hope', YOU, 'die'], ['hope', YOU, 'rot'], ['should', 'die'], ['rot', 'in', 'hell'],
    ['shoot|stab|murder|strangle', YOU + '|him|her|them|everyone'], ['burn|choke', YOU], ['shoot', 'up', 'the|a|this|my|your'], ['beat', YOU, 'up'], ['blow', YOU, 'up'], ['bomb', 'threat'],
    ['i|im|we', 'will|wanna|gonna|going|want|am|ll|m', 'murder|stab|rape'], ['ill|ima', 'murder|stab|rape'], ['kill', 'em|them', 'all'], ['die', 'in', 'a', 'fire']
  ].map(function (p) { return p.map(function (alts) { return alts.split('|'); }); });
  // innocent tokens that contain a SUB word, or must never be flagged
  var SAFE = /^(scunthorpe|shiitake|shitake|niggard|niggardly|cocktail|cockatoo|cockney|cockpit|peacock|hancock|bobcock|dickens|dickinson|cumberland|cucumber|document)$/;
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't', '€': 'e', '£': 'e', '¡': 'i' };
  var HOMO = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'ο': 'o', 'ν': 'v', 'ı': 'i', 'ɡ': 'g', 'ß': 'ss' };
  var SYM = '@!$+€£¡*';

  // ---- regex builders ----------------------------------------------------------------------
  function core(w) { return w.replace(/(.)\1*/g, function (m, c) { return c + '{' + m.length + ',}'; }); }
  var subRe = new RegExp(SUB.map(core).join('|'));
  var subWhole = new RegExp('^(' + SUB.map(core).join('|') + ')(s|es|ed|ing|er|ers|y|ie|in)?$');
  var wordRe = new RegExp('^(' + WORD.map(function (w) { return core(w[0]) + (w[1] ? (w[1].charAt(0) === '|' ? '(' + w[1].slice(1) + ')?' : w[1]) : ''); }).join('|') + ')$');
  var baseList = SUB.concat(WORD.map(function (w) { return w[0]; }));
  function altRe(a) { return new RegExp('^(' + a.map(core).join('|') + ')$'); }
  var PH = PHRASES.map(function (p) { return p.map(altRe); });

  function flatten(ch) { var d = ch.normalize ? ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ch; d = d.toLowerCase(); return HOMO[d] || HOMO[ch] || d; }
  var ZW = /[\u200b-\u200f\u2060-\u2064\ufeff\u00ad\u034f\u180e\u061c\u202a-\u202e]/;

  // wildcard (f*ck, sh*t): same length as a list word, stars match any letter
  function wildcardHit(f) {
    if (f.indexOf('*') < 0) return false;
    var letters = f.replace(/\*/g, '').length; if (letters < 1 || f.length < 3) return false;
    var rx = new RegExp('^' + f.replace(/\*+/g, function (m) { return '[a-z]{' + m.length + '}'; }) + '$');
    for (var i = 0; i < baseList.length; i++) { var w = baseList[i]; if (w.length >= 3 && (rx.test(w) || rx.test(w + 's') || rx.test(w + 'ing') || rx.test(w + 'er'))) return true; }
    return false;
  }
  function tokenHit(f) {
    if (!f || SAFE.test(f)) return false;
    if (f.indexOf("'") >= 0) { var g = f.replace(/'/g, ''); return !SAFE.test(g) && subRe.test(g) && f.length > 3; }   // contractions never match whole-word entries
    if (f.indexOf('*') >= 0) return wildcardHit(f);
    return subRe.test(f) || wordRe.test(f);
  }
  function wholeHit(f) { return !!f && !SAFE.test(f) && (subWhole.test(f) || wordRe.test(f)); }

  // ---- tokenizer ----------------------------------------------------------------------------
  function tokenize(text) {
    var toks = [], i = 0, n = text.length;
    while (i < n) {
      var c = text.charAt(i), fl = flatten(c);
      var inRun = /[a-z0-9]/.test(fl.charAt(0)) || SYM.indexOf(c) >= 0 || /['’`]/.test(c) || ZW.test(c);
      if (!inRun) { i++; continue; }
      var chars = [], j = i;
      while (j < n) {
        var cj = text.charAt(j), fj = flatten(cj);
        if (ZW.test(cj)) { j++; continue; }
        if (/['’`]/.test(cj)) { chars.push({ ch: "'", k: 'a', i: j }); j++; continue; }
        if (SYM.indexOf(cj) >= 0) { chars.push({ ch: cj, k: 's', i: j }); j++; continue; }
        if (fj.length && /^[a-z0-9]+$/.test(fj)) { for (var q = 0; q < fj.length; q++) chars.push({ ch: fj.charAt(q), k: /[0-9]/.test(fj.charAt(q)) ? 'd' : 'l', i: j }); j++; continue; }
        break;
      }
      var hasLetter = chars.some(function (x) { return x.k === 'l'; });
      if (hasLetter) {
        var variants = [], seen = {};
        [true, false].forEach(function (trim) {
          [0, 1].forEach(function (one) {
            var a = 0, b = chars.length - 1;
            while (a <= b && (chars[a].k === 'a' || chars[a].ch === '*' || (trim && chars[a].k === 's'))) a++;
            while (b >= a && (chars[b].k === 'a' || chars[b].ch === '*' || (trim && chars[b].k === 's'))) b--;
            if (a > b) return;
            var s = '';
            for (var x = a; x <= b; x++) { var ch = chars[x].ch; if (chars[x].k === 'd' || chars[x].k === 's') { if (ch === '1' && one) ch = 'l'; else ch = LEET[ch] || ch; } s += ch; }
            var key = s + '|' + a + '|' + b; if (!seen[key]) { seen[key] = 1; variants.push({ f: s, s: chars[a].i, e: chars[b].i + 1 }); }
          });
        });
        if (variants.length) toks.push({ v: variants, p: variants[0].f.replace(/'/g, ''), s: variants[0].s, e: variants[0].e });
      }
      i = Math.max(j, i + 1);
    }
    return groupSingles(text, toks);
  }
  // k.i.l.l / f-u-c-k : runs of 3+ single letters joined by non-space separators become one token
  function groupSingles(text, toks) {
    var out = [], i = 0;
    while (i < toks.length) {
      var j = i; while (j + 1 < toks.length && toks[j].p.length === 1 && toks[j + 1].p.length === 1 && !/\s/.test(text.slice(toks[j].e, toks[j + 1].s)) && /^[._\-*~|\/\\]+$/.test(text.slice(toks[j].e, toks[j + 1].s))) j++;
      if (j - i >= 2) { var f = ''; for (var q = i; q <= j; q++) f += toks[q].p; out.push({ v: [{ f: f, s: toks[i].s, e: toks[j].e }], p: f, s: toks[i].s, e: toks[j].e }); i = j + 1; } else { out.push(toks[i]); i++; }
    }
    return out;
  }

  // ---- find ranges --------------------------------------------------------------------------
  function find(text) {
    var out = [], toks = tokenize(String(text || '')), i, j, k;
    for (i = 0; i < toks.length; i++) {
      var t = toks[i];
      for (k = 0; k < t.v.length; k++) if (tokenHit(t.v[k].f)) {
        var nx = toks[i + 1];
        if (/^cum$/.test(t.v[k].f) && nx && /^laude/.test(nx.p)) continue;   // "magna cum laude"
        if (/^tit$/.test(t.v[k].f) && ((nx && nx.p === 'for') || (toks[i - 1] && toks[i - 1].p === 'for'))) continue;   // "tit for tat"
        out.push([t.v[k].s, t.v[k].e]); break;
      }
    }
    // short fragments glued together: "f u c k", "f.u.c.k", "fu ck", "bi tch"
    for (i = 0; i < toks.length; i++) {
      var joined = '', hasSmall = false;
      for (j = i; j < toks.length && j < i + 8; j++) {
        var tj = toks[j], fj = tj.v[0].f; if (fj.length > 3 || fj.indexOf("'") >= 0 || fj.indexOf('*') >= 0) break;
        if (j > i && /[a-z0-9]/i.test(text.slice(toks[j - 1].e, tj.s).replace(/[\s._\-,;:\/\\|~^*#=]/g, ''))) break;   // only gaps made of separators
        if (fj.length <= 2) hasSmall = true; joined += fj;
        if (j > i && hasSmall && joined.length >= 3 && wholeHit(joined)) { out.push([toks[i].s, tj.e]); break; }
      }
    }
    // phrases (threats)
    for (i = 0; i < toks.length; i++) for (var pi = 0; pi < PH.length; pi++) {
      var ph = PH[pi]; if (i + ph.length > toks.length) continue; var ok = true;
      for (k = 0; k < ph.length; k++) if (!ph[k].test(toks[i + k].p)) { ok = false; break; }
      if (ok) out.push([toks[i].s, toks[i + ph.length - 1].e]);
    }
    out.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var m = []; out.forEach(function (r) { var l = m[m.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else m.push([r[0], r[1]]); });
    return m;
  }
  function apply(text, ranges) { var o = '', p = 0; ranges.forEach(function (r) { o += text.slice(p, r[0]) + '***'; p = r[1]; }); return o + text.slice(p); }

  var F = {
    find: find,
    has: function (t) { return find(t).length > 0; },
    clean: function (t) { t = String(t == null ? '' : t); var r = find(t); return { text: r.length ? apply(t, r) : t, bad: r.length > 0, count: r.length }; },
    /* live typing: mask finished words only (a match touching the caret may still be a longer, innocent word) */
    mask: function (t, caret) { t = String(t || ''); if (caret == null) caret = t.length; var r = find(t).filter(function (x) { return x[1] < caret || x[0] > caret || x[1] < t.length && /[^a-z0-9@$!+*]/i.test(t.charAt(x[1])) && x[1] !== caret; }); return { text: r.length ? apply(t, r) : t, bad: r.length > 0, shift: 0 }; }
  };
  root.SOT = root.SOT || {}; root.SOT.filter = F;
  if (typeof module !== 'undefined' && module.exports) module.exports = F;
})(typeof window !== 'undefined' ? window : globalThis);
