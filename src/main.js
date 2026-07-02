import { initUI } from './ui/ui.js';

const VERSION = '0.2.1';

function boot() {
  if (window.__purgecord_loaded) return;
  window.__purgecord_loaded = true;
  // Teşhis: her yüklemede hangi sürümün çalıştığını konsola yaz (ilk vs ikinci yükleme farkı için)
  console.log(`%c[Purgecord] v${VERSION} yüklendi. webpack hazır: ${!!window.webpackChunkdiscord_app}`, 'color:#5865f2;font-weight:bold');
  try {
    initUI();
  } catch (err) {
    console.error('[purgecord] başlatma hatası:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
