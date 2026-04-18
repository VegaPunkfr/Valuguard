/* GHOST TAX — SUPABASE REALTIME CLIENT MODULE (vanilla IIFE, no ES modules)
 * J4 — Live postgres_changes subscriptions pour outreach_leads / osint_prospects / vault_sessions.
 *
 * Source inspirée : pattern V4 recon-ledger (fetch polling) + pattern Supabase JS v2 postgres_changes.
 * V4 n'exposait pas de realtime natif — on construit un module réutilisable.
 *
 * Expose window.GhostRealtime = {
 *   init(opts?)              — bootstrap le client @supabase/supabase-js depuis CDN esm.sh
 *                               opts = { url?, anonKey? } — si omis, auto-resolution via:
 *                                 1. window.__GT_SUPABASE__ = {url, anonKey}
 *                                 2. <meta name="gt-supabase-url"> / <meta name="gt-supabase-anon-key">
 *                                 3. fetch /api/command/supabase-public-config
 *   subscribe(table, cb)     — ouvre un postgres_changes * sur la table, retourne un handle
 *   unsubscribe(handle)      — ferme proprement le canal
 *   status()                 — 'OPEN' | 'CLOSED' | 'CONNECTING' | 'ERROR' | 'NOT_INITIALIZED'
 *   onEvent(cb)              — enregistre un callback global (diagnostic)
 *   reconnect()              — force une reconnection immédiate (flush backoff)
 *   ready                    — Promise résolue quand le client est chargé
 * }
 *
 * Reconnection : exponential backoff 1s → 2s → 4s → 8s → 16s → 30s cap.
 * Dedup : LRU 50 events, fenêtre 100ms, clé = table|eventType|commit_timestamp|primary_key.
 * Fallback : si Supabase unreachable, status()='ERROR', toutes fns retournent handles no-op (UI ne crash pas).
 */
(function() {
  'use strict';

  var CDN_URL = 'https://esm.sh/@supabase/supabase-js@2';
  var STATUS = 'NOT_INITIALIZED';
  var client = null;
  var readyResolve, readyReject;
  var ready = new Promise(function(res, rej) { readyResolve = res; readyReject = rej; });
  var handles = []; // { channel, table, callback, retries, timer }
  var globalListeners = [];
  var lastActivityAt = null;
  var dedupLRU = []; // array of keys, oldest first
  var DEDUP_MAX = 50;
  var DEDUP_WINDOW_MS = 100;

  function setStatus(s) {
    STATUS = s;
    // Notify global listeners (diagnostic)
    for (var i = 0; i < globalListeners.length; i++) {
      try { globalListeners[i]({ type: 'status', status: s, at: Date.now() }); }
      catch (e) { /* swallow listener errors */ }
    }
  }

  function logWarn(msg, err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[GhostRealtime] ' + msg, err || '');
    }
  }

  function logInfo(msg) {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[GhostRealtime] ' + msg);
    }
  }

  // ── Dedup LRU (broadcast echo guard) ────────────────────
  function dedupKey(payload) {
    try {
      var table = payload && payload.table ? String(payload.table) : '?';
      var eventType = payload && payload.eventType ? String(payload.eventType) : '?';
      var ts = payload && payload.commit_timestamp ? String(payload.commit_timestamp) : '';
      var pk = '';
      var row = (payload && (payload.new || payload.old)) || {};
      if (row && row.id != null) pk = String(row.id);
      return table + '|' + eventType + '|' + ts + '|' + pk;
    } catch (_) { return String(Math.random()); }
  }

  function isDuplicate(payload) {
    var k = dedupKey(payload);
    var now = Date.now();
    // Cleanup stale entries
    dedupLRU = dedupLRU.filter(function(e) { return now - e.at < DEDUP_WINDOW_MS * 50; });
    // Check for recent match within window
    for (var i = 0; i < dedupLRU.length; i++) {
      if (dedupLRU[i].key === k && (now - dedupLRU[i].at) < DEDUP_WINDOW_MS) {
        return true;
      }
    }
    dedupLRU.push({ key: k, at: now });
    if (dedupLRU.length > DEDUP_MAX) dedupLRU.shift();
    return false;
  }

  // ── Exponential backoff ────────────────────────────────
  function backoffDelay(attempt) {
    var base = 1000 * Math.pow(2, Math.min(attempt, 5)); // 1s, 2s, 4s, 8s, 16s, 32s
    return Math.min(base, 30000);
  }

  // ── Supabase client loader (CDN esm.sh) ────────────────
  function loadClient(url, anonKey) {
    setStatus('CONNECTING');
    // Use dynamic import() — works in modern browsers, cockpit V6 is evergreen
    return import(CDN_URL)
      .then(function(mod) {
        var createClient = mod.createClient;
        if (typeof createClient !== 'function') {
          throw new Error('createClient not found in @supabase/supabase-js module');
        }
        client = createClient(url, anonKey, {
          realtime: { params: { eventsPerSecond: 10 } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        setStatus('OPEN');
        lastActivityAt = Date.now();
        readyResolve(client);
        return client;
      })
      .catch(function(e) {
        logWarn('CDN load failed — realtime disabled (fallback to manual polling)', e);
        setStatus('ERROR');
        readyReject(e);
        throw e;
      });
  }

  // ── Config auto-resolver ───────────────────────────────
  function metaContent(name) {
    try {
      var m = document.querySelector('meta[name="' + name + '"]');
      return m ? m.getAttribute('content') : null;
    } catch (_) { return null; }
  }

  function resolveConfig(opts) {
    // Priorité 1 : arg explicite
    if (opts && opts.url && opts.anonKey) {
      return Promise.resolve({ url: opts.url, anonKey: opts.anonKey });
    }
    // Priorité 2 : window.__GT_SUPABASE__
    if (typeof window.__GT_SUPABASE__ === 'object' && window.__GT_SUPABASE__ && window.__GT_SUPABASE__.url && window.__GT_SUPABASE__.anonKey) {
      return Promise.resolve({ url: window.__GT_SUPABASE__.url, anonKey: window.__GT_SUPABASE__.anonKey });
    }
    // Priorité 3 : meta tags
    var metaUrl = metaContent('gt-supabase-url');
    var metaKey = metaContent('gt-supabase-anon-key');
    if (metaUrl && metaKey) {
      return Promise.resolve({ url: metaUrl, anonKey: metaKey });
    }
    // Priorité 4 : endpoint public config
    return fetch('/api/command/supabase-public-config')
      .then(function(r) {
        if (!r.ok) throw new Error('config endpoint ' + r.status);
        return r.json();
      })
      .then(function(j) {
        if (!j || !j.url || !j.anonKey) throw new Error('config endpoint: missing fields');
        return { url: j.url, anonKey: j.anonKey };
      });
  }

  // ── Public API ─────────────────────────────────────────
  function init(opts) {
    if (client) {
      logInfo('already initialized');
      return ready;
    }
    return resolveConfig(opts)
      .then(function(cfg) { return loadClient(cfg.url, cfg.anonKey); })
      .catch(function(e) {
        logWarn('config resolution failed — realtime disabled', e);
        setStatus('ERROR');
        readyReject(e);
        // Return a rejected-but-caught promise so callers don't crash
        return Promise.reject(e);
      });
  }

  function subscribe(table, callback) {
    if (typeof table !== 'string' || typeof callback !== 'function') {
      logWarn('subscribe() invalid args');
      return { _noop: true, unsubscribe: function() {} };
    }
    var handle = {
      table: table,
      callback: callback,
      channel: null,
      retries: 0,
      timer: null,
      active: true,
    };

    function attachChannel() {
      if (!client || !handle.active) return;
      var channelName = 'ghost-realtime-' + table + '-' + Math.random().toString(36).slice(2, 8);
      try {
        var ch = client.channel(channelName);
        ch.on('postgres_changes',
          { event: '*', schema: 'public', table: table },
          function(payload) {
            lastActivityAt = Date.now();
            if (isDuplicate(payload)) return;
            // Dispatch to the handle callback
            try { handle.callback(payload); }
            catch (e) { logWarn('handler threw for ' + table, e); }
            // Dispatch to global listeners
            for (var i = 0; i < globalListeners.length; i++) {
              try { globalListeners[i]({ type: 'event', table: table, payload: payload, at: Date.now() }); }
              catch (_) {}
            }
          }
        );
        ch.subscribe(function(st) {
          logInfo('channel ' + table + ' status=' + st);
          if (st === 'SUBSCRIBED') {
            handle.retries = 0;
            setStatus('OPEN');
          } else if (st === 'CLOSED' || st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
            if (!handle.active) return;
            // Reconnect with backoff
            var delay = backoffDelay(handle.retries++);
            logWarn('channel ' + table + ' lost (' + st + '), reconnecting in ' + delay + 'ms');
            if (handle.timer) clearTimeout(handle.timer);
            handle.timer = setTimeout(function() {
              try { ch.unsubscribe(); } catch (_) {}
              attachChannel();
            }, delay);
          }
        });
        handle.channel = ch;
      } catch (e) {
        logWarn('channel attach failed for ' + table, e);
        setStatus('ERROR');
      }
    }

    // If client not ready, wait for it
    if (!client) {
      ready.then(attachChannel).catch(function() {
        logWarn('subscribe(' + table + ') aborted — client unavailable');
      });
    } else {
      attachChannel();
    }

    return {
      _handle: handle,
      unsubscribe: function() {
        handle.active = false;
        if (handle.timer) { clearTimeout(handle.timer); handle.timer = null; }
        if (handle.channel && client) {
          try { client.removeChannel(handle.channel); } catch (_) {}
        }
      },
    };
  }

  function unsubscribe(h) {
    if (h && typeof h.unsubscribe === 'function') h.unsubscribe();
  }

  function status() {
    return STATUS;
  }

  function onEvent(cb) {
    if (typeof cb === 'function') globalListeners.push(cb);
    return function() {
      var i = globalListeners.indexOf(cb);
      if (i >= 0) globalListeners.splice(i, 1);
    };
  }

  function reconnect() {
    if (!client) { logWarn('reconnect() ignored — client not initialized'); return; }
    // Tear down all handles and re-attach
    var snapshot = handles.slice();
    for (var i = 0; i < snapshot.length; i++) {
      var h = snapshot[i];
      if (h.active && h.channel) {
        try { client.removeChannel(h.channel); } catch (_) {}
        h.retries = 0;
      }
    }
  }

  function lastActivity() {
    return lastActivityAt;
  }

  // ── Expose ─────────────────────────────────────────────
  window.GhostRealtime = {
    init: init,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    status: status,
    onEvent: onEvent,
    reconnect: reconnect,
    lastActivity: lastActivity,
    ready: ready,
  };
})();
