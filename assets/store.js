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
      out.push({ id: id, n: n | 0, ts: Math.round(ts), name: str(b.name, 24).replace(/\n/g, ' ').trim(), msg: msg, rocks: rocks(b.rocks)});
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
      /* Read every bottle. Never creates any: an empty sea stays empty (the first bottle becomes #1). */
      async list() {
        var l = [];
        if (mode === 'remote') { try { l = await rRead(); } catch (e) { mode = 'local'; } }
        if (mode === 'local') l = lRead();
        return l;
      },
      /* Append one bottle. Merge-on-write: re-read right before writing, merge by id, write,
       * then read back to verify (retry if a concurrent visitor overwrote us). */
      async add(rec) {
        var mine = { id: uid(), n: 0, ts: Date.now(), name: str(rec.name, 24).replace(/\n/g, ' ').trim(), msg: str(rec.msg, 280).trim(), rocks: rocks(rec.rocks) };
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

  /* ---------- review queue (reports) ----------
   * A SEPARATE bucket. A report NEVER touches the bottles bucket: the bottle stays visible until the
   * owner removes it by hand. Record: {id, bottleId, n, ts, reason, bottleName, bottleMsg, bottleTs, status}
   */
  var REPORT_DEFAULTS = {
    url: 'https://textdb.dev/api/data/sea-of-thought-reports-20569297366a',
    localKey: 'sot:reports:v1', max: 500, minGap: 20000, dedupeMs: 3600000, lastKey: 'sot:rlast', seenKey: 'sot:reported'
  };
  var STATUS = { pending: 1, reviewed: 1, dismissed: 1, removed: 1 };
  function cleanReports(a) {
    var seen = Object.create(null), out = [];
    if (!Array.isArray(a)) return out;
    for (var i = 0; i < a.length; i++) {
      var r = a[i]; if (!r || typeof r !== 'object') continue;
      var id = str(r.id, 40), bid = str(r.bottleId, 40), ts = +r.ts, n = +r.n, bts = +r.bottleTs;
      if (!id || seen[id] || !bid || !isFinite(ts) || !isFinite(n)) continue;
      seen[id] = 1;
      out.push({ id: id, bottleId: bid, n: n | 0, ts: Math.round(ts), reason: str(r.reason, 140).replace(/[<>]/g, '').replace(/\n/g, ' ').trim(), bottleName: str(r.bottleName, 24).replace(/\n/g, ' ').trim(), bottleMsg: str(r.bottleMsg, 280).trim(), bottleTs: isFinite(bts) ? Math.round(bts) : 0, status: STATUS[r.status] === 1 ? r.status : 'pending' });
    }
    return out.sort(function (x, y) { return x.ts - y.ts; });
  }
  function createReportsApi(o) {
    o = Object.assign({}, REPORT_DEFAULTS, o || {});
    var fetchFn = o.fetch || (root.fetch && root.fetch.bind(root)), store = o.storage || null, local = !!o.forceLocal;
    function kv(k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
    function kset(k, v) { try { store.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
    async function rRead() {
      var r = await fetchFn(o.url, { cache: 'no-store' }); if (!r.ok) throw new Error('read ' + r.status);
      var t = (await r.text()).trim(); if (!t) return []; var j; try { j = JSON.parse(t); } catch (e) { throw new Error('bad json'); }
      return cleanReports(j && j.reports);
    }
    async function rWrite(list) { var r = await fetchFn(o.url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ v: 1, reports: list.slice(-o.max) }) }); if (!r.ok) throw new Error('write ' + r.status); }
    function read() { return local ? Promise.resolve(cleanReports(kv(o.localKey))) : rRead(); }
    function write(l) { if (local) { kset(o.localKey, l.slice(-o.max)); return Promise.resolve(); } return rWrite(l); }
    return {
      /* -> {ok, state:'sent'|'duplicate'|'wait'|'empty'|'failed', wait?} */
      async submit(bottle, reason) {
        var now = Date.now(); if (!bottle || !bottle.id) return { ok: false, state: 'failed' };
        var seen = (store && kv(o.seenKey)) || {}, last = store ? +store.getItem(o.lastKey) || 0 : 0;
        if (seen[bottle.id] && now - seen[bottle.id] < o.dedupeMs) return { ok: true, state: 'duplicate' };
        if (last && now - last < o.minGap) return { ok: false, state: 'wait', wait: Math.ceil((o.minGap - (now - last)) / 1000) };
        var F = root.SOT && root.SOT.filter, why = str(reason || '', 140).replace(/[<>]/g, '').replace(/\n/g, ' ').trim();
        if (F) why = F.clean(why).text;                       // last line of defence: bad words never leave the browser
        var rec = { id: uid(), bottleId: str(bottle.id, 40), n: bottle.n | 0, ts: now, reason: why, bottleName: str(bottle.name, 24).replace(/\n/g, ' ').trim(), bottleMsg: str(bottle.msg, 280).trim(), bottleTs: Math.round(+bottle.ts) || 0, status: 'pending' };
        try {
          for (var attempt = 0; attempt < 3; attempt++) {
            var cur = await read(), all = cleanReports(cur.concat([rec]));
            if (all.length > o.max) all = all.slice(-o.max);
            await write(all);
            if (local) break;
            var chk = await rRead(); if (chk.some(function (x) { return x.id === rec.id; })) break;
            if (attempt === 2) throw new Error('not verified');
          }
        } catch (e) { return { ok: false, state: 'failed' }; }
        seen[bottle.id] = now; kset(o.seenKey, seen); kset(o.lastKey, String(now));
        return { ok: true, state: 'sent', report: rec };
      },
      _clean: cleanReports
    };
  }
  root.SOT = root.SOT || {};
  root.SOT.createSeaApi = createSeaApi;
  root.SOT.createReportsApi = createReportsApi;
  root.SOT.REPORT_DEFAULTS = REPORT_DEFAULTS;
  root.SOT.SEA_DEFAULTS = DEFAULTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createSeaApi: createSeaApi, createReportsApi: createReportsApi, DEFAULTS: DEFAULTS, REPORT_DEFAULTS: REPORT_DEFAULTS };
})(typeof window !== 'undefined' ? window : globalThis);
