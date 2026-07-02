/** URL'den guild/channel id'lerini çıkarır (saf). */
export function parseIdsFromUrl(href = (typeof location !== 'undefined' ? location.href : '')) {
  const m = String(href).match(/channels\/([\w@]+)\/(\d+)/);
  return m ? { guildId: m[1], channelId: m[2] } : { guildId: null, channelId: null };
}

/**
 * Bir değerin geçerli bir Discord token'ı gibi görünüp görünmediğini söyler (saf).
 * Discord token'ları en az ~59 karakterdir; "[object Object]" (15) gibi hatalı
 * değerleri ve string olmayanları reddeder.
 */
export function looksLikeToken(t) {
  return typeof t === 'string' && t.trim().length >= 30;
}

/**
 * Auth token'ı webpack'ten (öncelik) veya iframe localStorage'dan alır.
 * SADECE geçerli bir string token döner; aksi halde ''. Yanlış modülün objesini
 * asla döndürmez — doğru modülü bulana kadar arar.
 */
export function getToken() {
  // 1) webpack — Discord auth store. getToken() bir STRING dönmeli.
  try {
    let found = '';
    window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {
      for (const m of Object.values(req.c || {})) {
        try {
          const t = m?.exports?.default?.getToken?.();
          if (looksLikeToken(t)) { found = t; break; }
        } catch { /* bazı modüllere erişim hata verebilir, atla */ }
      }
    }]);
    if (looksLikeToken(found)) return found;
  } catch { /* webpack yok/değişti */ }

  // 2) iframe localStorage (eski Discord sürümleri)
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.token;
    iframe.remove();
    if (raw) {
      const t = JSON.parse(raw);
      if (looksLikeToken(t)) return t;
    }
  } catch { /* yok */ }

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
