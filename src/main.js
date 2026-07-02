import { initUI } from './ui/ui.js';

function boot() {
  if (window.__purgecord_loaded) return;
  window.__purgecord_loaded = true;
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
