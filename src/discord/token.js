/** Extract guild/channel ids from the URL (pure). */
export function parseIdsFromUrl(href = (typeof location !== 'undefined' ? location.href : '')) {
  const m = String(href).match(/channels\/([\w@]+)\/(\d+)/);
  return m ? { guildId: m[1], channelId: m[2] } : { guildId: null, channelId: null };
}

/**
 * Whether a value looks like a valid Discord token (pure).
 * Discord tokens are at least ~59 chars; rejects bad values like
 * "[object Object]" (15) and non-strings.
 */
export function looksLikeToken(t) {
  return typeof t === 'string' && t.trim().length >= 30;
}

/**
 * Get the auth token from webpack (preferred) or the iframe localStorage.
 * Returns ONLY a valid string token, otherwise ''. Never returns a wrong
 * module's object — it keeps searching until it finds the right one.
 */
export function getToken() {
  // 1) webpack — Discord auth store. getToken() must return a STRING.
  try {
    let found = '';
    window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {
      for (const m of Object.values(req.c || {})) {
        try {
          const t = m?.exports?.default?.getToken?.();
          if (looksLikeToken(t)) { found = t; break; }
        } catch { /* some modules may throw on access, skip */ }
      }
    }]);
    if (looksLikeToken(found)) return found;
  } catch { /* webpack missing/changed */ }

  // 2) iframe localStorage (older Discord versions)
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.token;
    iframe.remove();
    if (raw) {
      const t = JSON.parse(raw);
      if (looksLikeToken(t)) return t;
    }
  } catch { /* not present */ }

  return '';
}

/** Get the user's own id from localStorage. */
export function getAuthorId() {
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.user_id_cache;
    iframe.remove();
    return raw ? JSON.parse(raw) : '';
  } catch { return ''; }
}
