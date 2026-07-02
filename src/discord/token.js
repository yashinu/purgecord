/** URL'den guild/channel id'lerini çıkarır (saf). */
export function parseIdsFromUrl(href = (typeof location !== 'undefined' ? location.href : '')) {
  const m = String(href).match(/channels\/([\w@]+)\/(\d+)/);
  return m ? { guildId: m[1], channelId: m[2] } : { guildId: null, channelId: null };
}

/** Auth token'ı localStorage (iframe) veya webpack üzerinden alır (undiscord yöntemi). */
export function getToken() {
  // 1) iframe localStorage
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.token;
    iframe.remove();
    if (raw) return JSON.parse(raw);
  } catch { /* webpack fallback'e düş */ }

  // 2) webpack fallback
  try {
    const modules = [];
    window.webpackChunkdiscord_app.push([['purgecord'], {}, (e) => {
      for (const c in e.c) modules.push(e.c[c]);
    }]);
    const mod = modules.find(m => m?.exports?.default?.getToken !== undefined);
    if (mod) return mod.exports.default.getToken();
  } catch { /* düştü */ }

  return '';
}

/** Kullanıcının kendi id'sini localStorage'dan alır. */
export function getAuthorId() {
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.user_id_cache;
    iframe.remove();
    return raw ? JSON.parse(raw) : '';
  } catch { return ''; }
}
