// A localStorage reference that keeps working even after Discord blocks
// `window.localStorage` (Discord deletes/locks it to prevent token theft, which is
// why reading it directly throws "localStorage is not defined" once the app has
// loaded). We fall back to a persistent same-origin iframe whose localStorage points
// at the same discord.com storage area but isn't affected by the main-window block.

let cached = null;

export function safeLocalStorage() {
  if (cached) return cached;

  // 1) The page's localStorage, if Discord hasn't blocked it yet.
  try {
    window.localStorage.getItem('__pc_probe');
    cached = window.localStorage;
    return cached;
  } catch { /* blocked by Discord → fall through */ }

  // 2) A persistent hidden same-origin iframe (kept attached so the reference stays valid).
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
    const ls = iframe.contentWindow.localStorage;
    ls.getItem('__pc_probe'); // verify it works
    cached = ls;
    return cached;
  } catch { /* fall through */ }

  // 3) In-memory fallback (no persistence across reloads, but never throws).
  const mem = new Map();
  cached = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
  return cached;
}
