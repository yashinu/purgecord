import { initUI } from './ui/ui.js';

const VERSION = '0.3.4';

function boot() {
  if (window.__purgecord_loaded) return;
  window.__purgecord_loaded = true;
  // Diagnostic: log the running version on each load (helps tell first vs second load apart)
  console.log(`%c[Purgecord] v${VERSION} loaded. webpack ready: ${!!window.webpackChunkdiscord_app}`, 'color:#5865f2;font-weight:bold');
  try {
    initUI();
  } catch (err) {
    console.error('[purgecord] init error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
