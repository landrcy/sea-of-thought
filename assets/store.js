/* Sea of Thought — storage adapter (SEA_API).
 * The ONLY code that talks to the network/storage. Shared store = textdb.dev:
 * a free, keyless, CORS-enabled text store (one JSON blob per URL).
 * If it is unreachable the adapter falls back to localStorage so the page still works.
 * Safety: every record is re-validated on read AND write; the UI renders with textContent only.
 */
(function (root) {
  'use strict';
  var DEFAULTS = {
    url: 'https://textdb.dev/api/data/sea-of-thought-site-1d094949f829', // bucket created for THIS site only
    localKey: 'sot:bottles:v1',
    max: 1000
  };

  // strip control chars + bidi overrides, cap length
  function str(v, n) {
    if (typeof v !== 'string') return '';
    return v.replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, n);
  }
  // rocks tied to a bottle: integer 0-3 (missing/invalid = 0, keeps older records valid)
  function rocks(v) { v = Math.round(+v); return v >= 1 ? Math.min(3, v) : 0; }
  function clean(a) {
    var seen = Object.create(null), out = [];
    if (!Array.isArray(a)) return out;
    for (var i = 0; i < a.length; i++) {
      var b = a[i];
      if (!b || typeof b !== 'object') continue;
      var id = str(b.id, 40), ts = +b.ts, n = +b.n, msg = str(b.msg, 280).trim();
      if (!id || seen[id] || !isFinite(ts) || !isFinite(n) || !msg) continue;
      seen[id] = 1;
      out.push({ id: id, n: n | 0, ts: Math.round(ts), name: str(b.name, 24).replace(/\n/g, ' ').trim(), msg: msg, rocks: rocks(b.rocks), seed: b.seed === true });
    }
    return out.sort(function (x, y) { return x.n - y.n || x.ts - y.ts; });
  }
  function merge(a, b) {
    var m = Object.create(null), out = [], all = clean(a).concat(clean(b));
    for (var i = 0; i < all.length; i++) if (!m[all[i].id]) { m[all[i].id] = 1; out.push(all[i]); }
    return out.sort(function (x, y) { return x.n - y.n || x.ts - y.ts; });
  }
  function maxN(l) { return l.reduce(function (m, x) { return Math.max(m, x.n); }, 0); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function createSeaApi(o) {
    o = Object.assign({}, DEFAULTS, o || {});
    var fetchFn = o.fetch || (root.fetch && root.fetch.bind(root));
    var store = o.storage || null;
    var mode = o.forceLocal ? 'local' : 'remote';

    async function rRead() {
      var r = await fetchFn(o.url, { cache: 'no-store' });
      if (!r.ok) throw new Error('read ' + r.status);
      var t = (await r.text()).trim();
      if (!t) return [];
      var j; try { j = JSON.parse(t); } catch (e) { throw new Error('bad json'); }
      return clean(j && j.bottles);
    }
    async function rWrite(list) {
      var r = await fetchFn(o.url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ v: 1, bottles: list.slice(-o.max) }) });
      if (!r.ok) throw new Error('write ' + r.status);
    }
    function lRead() { try { return clean(JSON.parse(store.getItem(o.localKey))); } catch (e) { return []; } }
    function lWrite(l) { try { store.setItem(o.localKey, JSON.stringify(l.slice(-o.max))); } catch (e) {} }

    return {
      get mode() { return mode; },
      /* Read every bottle. Seeds 3 clearly-labelled example bottles ONLY when the store is empty. */
      async list(seeds) {
        var l;
        if (mode === 'remote') { try { l = await rRead(); } catch (e) { mode = 'local'; } }
        if (mode === 'local') l = lRead();
        if (!l.length && seeds && seeds.length) {
          var t = Date.now();
          l = clean(seeds.map(function (s, i) { return { id: 'seed-' + (i + 1), n: i + 1, ts: t - (seeds.length - i) * 60000, name: s.name, msg: s.msg, rocks: s.rocks | 0, seed: true }; }));
          if (mode === 'remote') { try { await rWrite(l); } catch (e) { mode = 'local'; lWrite(l); } } else lWrite(l);
        }
        return l;
      },
      /* Append one bottle. Merge-on-write: re-read right before writing, merge by id, write,
       * then read back to verify (retry if a concurrent visitor overwrote us). */
      async add(rec) {
        var mine = { id: uid(), n: 0, ts: Date.now(), name: str(rec.name, 24).replace(/\n/g, ' ').trim(), msg: str(rec.msg, 280).trim(), rocks: rocks(rec.rocks), seed: false };
        if (!mine.msg) throw new Error('empty');
        var fresh = [], all = [];
        for (var attempt = 0; attempt < 3; attempt++) {
          if (mode === 'remote') { try { fresh = await rRead(); } catch (e) { mode = 'local'; } }
          if (mode === 'local') fresh = lRead();
          mine.n = maxN(fresh.filter(function (x) { return x.id !== mine.id; })) + 1;
          all = merge(fresh, [mine]);
          if (mode === 'remote') {
            try {
              await rWrite(all);
              var check = await rRead();
              var ok = check.some(function (x) { return x.id === mine.id; });
              var clash = check.some(function (x) { return x.id !== mine.id && x.n === mine.n; });
              if (ok && !clash) return { bottle: mine, all: check, mode: mode };
              if (ok && clash) continue;     // renumber on next pass
              continue;                       // we were overwritten: merge again
            } catch (e) { mode = 'local'; }
          }
          if (mode === 'local') { var m = merge(lRead(), all); lWrite(m); return { bottle: mine, all: m.slice(-o.max), mode: mode }; }
        }
        // could not verify after retries: keep what we have locally so the visitor's bottle is not lost
        lWrite(merge(lRead(), all));
        return { bottle: mine, all: all.slice(-o.max), mode: 'local' };
      },
      _clean: clean, _rocks: rocks, _merge: merge, _str: str
    };
  }
  root.SOT = root.SOT || {};
  root.SOT.createSeaApi = createSeaApi;
  root.SOT.SEA_DEFAULTS = DEFAULTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createSeaApi: createSeaApi, DEFAULTS: DEFAULTS };
})(typeof window !== 'undefined' ? window : globalThis);
