import { styles } from './styles.css.js';
import { buttonHtml, panelHtml } from './template.html.js';
import { makeDraggable, makeResizable } from './DragResize.js';
import { ApiClient } from '../core/ApiClient.js';
import { DeleteEngine } from '../core/DeleteEngine.js';
import { Checkpoint } from '../core/Checkpoint.js';
import { Watchdog } from '../core/Watchdog.js';
import { getToken, getAuthorId, parseIdsFromUrl, looksLikeToken } from '../discord/token.js';
import { initDmTab } from './dmTab.js';

// ---- küçük yardımcılar ----
function insertCss(css) {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
}
function createEl(html) {
  const t = document.createElement('div');
  t.innerHTML = html.trim();
  return t.firstElementChild;
}
function findToolbar() {
  return document.querySelector('#app-mount [class*="toolbar_"]') ||
         document.querySelector('#app-mount [class*="-toolbar"]');
}

export function initUI() {
  insertCss(styles);

  const panel = createEl(panelHtml);
  document.body.appendChild(panel);
  const btn = createEl(buttonHtml);

  const el = (name) => panel.querySelector(`[data-el="${name}"]`);
  const on = (action, fn) => panel.querySelectorAll(`[data-action="${action}"]`).forEach((b) => b.addEventListener('click', fn));

  // --- log ---
  const logEl = panel.querySelector('#pc-log');
  function log(type, ...args) {
    const line = document.createElement('div');
    line.className = `pc-log-line pc-log-${type}`;
    line.textContent = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    logEl.appendChild(line);
    // "Logu takip et" açıksa (varsayılan) son loga kaydır
    const scroller = logEl.closest('.pc-body');
    if (scroller && el('autoScroll')?.checked !== false) scroller.scrollTop = scroller.scrollHeight;
    if (type === 'error') console.error('[purgecord]', ...args);
  }

  // --- buton mount + yeniden-mount ---
  function mountBtn() {
    const tb = findToolbar();
    // Araç çubuğunun sağ ucuna (inbox/help kümesine) ekle
    if (tb && !tb.contains(btn)) tb.append(btn);
  }
  mountBtn();
  const appRoot = document.querySelector('#app-mount') || document.body;
  let throttle = null;
  new MutationObserver(() => {
    if (throttle) return;
    throttle = setTimeout(() => { throttle = null; if (!appRoot.contains(btn)) mountBtn(); }, 2000);
  }).observe(appRoot, { childList: true, subtree: true });

  function togglePanel(force) {
    const show = force !== undefined ? force : panel.hidden;
    panel.hidden = !show;
    btn.style.color = show ? 'var(--interactive-active,#fff)' : '';
  }
  btn.addEventListener('click', () => togglePanel());
  on('close', () => togglePanel(false));

  // --- drag / resize / sekmeler ---
  makeDraggable(panel, panel.querySelector('[data-drag]'));
  makeResizable(panel, panel.querySelector('[data-resize]'));

  function switchTab(name) {
    panel.querySelectorAll('.pc-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    panel.querySelectorAll('.pc-view').forEach((v) => (v.hidden = v.dataset.view !== name));
  }
  panel.querySelectorAll('.pc-tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // --- redact ---
  el('redact').addEventListener('change', (e) => panel.classList.toggle('pc-redact', e.target.checked));

  // --- id/token doldurma ---
  on('fillAuthor', () => (el('authorId').value = getAuthorId()));
  on('fillGuild', () => {
    const { guildId, channelId } = parseIdsFromUrl();
    el('guildId').value = guildId || '';
    if (guildId === '@me' && channelId) el('channelId').value = channelId;
  });
  on('fillChannel', () => {
    const { guildId, channelId } = parseIdsFromUrl();
    el('channelId').value = channelId || '';
    el('guildId').value = guildId || '';
  });
  on('fillToken', () => {
    const t = (() => { try { return getToken(); } catch { return ''; } })();
    if (looksLikeToken(t)) { el('token').value = t; log('success', `Token alındı (${t.length} karakter).`); }
    else log('error', 'Token otomatik alınamadı. Elle yapıştır → F12 > Network sekmesi > discord.com/api\'ye giden herhangi bir isteğe tıkla > Request Headers > "authorization" satırındaki değeri kopyala.');
  });

  // --- gecikme slider'ları ---
  const bindSlider = (input, valSpan) => {
    const sync = () => (valSpan.textContent = input.value);
    input.addEventListener('input', sync);
    sync();
  };
  bindSlider(el('deleteDelay'), el('deleteDelayVal'));
  bindSlider(el('searchDelay'), el('searchDelayVal'));

  // --- çalışma zamanı durumu ---
  const checkpoint = new Checkpoint(localStorage);
  let engine = null;
  let watchdog = null;
  let abort = null;

  function buildApi() {
    abort = new AbortController();
    let token = el('token').value.trim();
    if (!looksLikeToken(token)) {
      const auto = (() => { try { return getToken(); } catch { return ''; } })();
      if (looksLikeToken(auto)) { token = auto; el('token').value = auto; }
    }
    if (!looksLikeToken(token)) {
      log('error', 'Geçerli token yok. "doldur" işe yaramadıysa token\'ı elle yapıştır → F12 > Network > discord.com/api\'ye giden herhangi bir isteğe tıkla > Request Headers > "authorization" değerini kopyala.');
      return { api: null, token: '' };
    }
    const api = new ApiClient({
      token,
      fetchImpl: (u, o) => fetch(u, o),
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      signal: abort.signal,
      onThrottle: ({ ms }) => {
        if (!engine) return;
        engine.state.lastProgressTs = Date.now(); // aktif ama throttle'da — stall sayma
        // Uyarlanabilir: her 429'da silme gecikmesini kademeli artır (sürdürülebilir hıza yakınsa), max 6s
        const next = Math.min(6000, Math.max(engine.options.deleteDelay + 250, Math.round(ms || 0)));
        if (next > engine.options.deleteDelay) {
          engine.options.deleteDelay = next;
          el('deleteDelay').value = Math.min(10000, next);
          el('deleteDelayVal').textContent = next;
        }
      },
      log,
    });
    return { api, token };
  }

  function getFilters() {
    return {
      authorId: el('authorId').value.trim() || undefined,
      content: el('content').value.trim() || undefined,
      hasLink: el('hasLink').checked || undefined,
      hasFile: el('hasFile').checked || undefined,
      includePinned: el('includePinned').checked || undefined,
      pattern: el('pattern').value.trim() || undefined,
      minId: el('minId').value.trim() || undefined,
      maxId: el('maxId').value.trim() || undefined,
      minDate: el('minDate').value || undefined,
      maxDate: el('maxDate').value || undefined,
    };
  }

  function makeEngine(api) {
    const options = {
      deleteDelay: Math.max(500, +el('deleteDelay').value),
      searchDelay: +el('searchDelay').value,
    };
    engine = new DeleteEngine({
      api,
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      log,
      options,
      onStart: () => setRunningUI(true),
      onStop: () => { setRunningUI(false); watchdog?.stop(); },
      onProgress: (s) => renderProgress(s),
      onJobStart: (job) => ctx.onJobStart && ctx.onJobStart(job),
      onJobDone: (job, s) => ctx.onJobDone && ctx.onJobDone(job, s),
      saveCheckpoint: (data) => checkpoint.save({ ...data, ts: Date.now() }),
    });
    return engine;
  }

  function startWatchdog() {
    watchdog = new Watchdog({
      getLastProgress: () => (engine ? engine.state.lastProgressTs : Date.now()),
      isRunning: () => !!(engine && engine.state.running),
      onStall: () => log('warn', 'Uzun süredir ilerleme yok. Gerçekten takıldıysa Durdur\'a basıp paneldeki "Devam et" ile kaldığın yerden sürebilirsin.'),
      stallMs: 90000,
    });
    watchdog.start();
  }

  function setRunningUI(running) {
    panel.querySelector('[data-action="start"]').disabled = running;
    panel.querySelector('[data-action="dry"]').disabled = running;
    panel.querySelector('[data-action="stop"]').disabled = !running;
    btn.classList.toggle('is-running', running);
    if (!running) el('focus').hidden = true;
  }

  function renderProgress(s) {
    const bar = el('progressBar');
    if (s.grandTotal > 0) {
      const val = s.delCount + s.failCount;
      const pct = Math.min(100, Math.round((val / Math.max(s.grandTotal, val)) * 100));
      bar.classList.remove('is-indeterminate');
      bar.style.width = pct + '%';
      el('percent').textContent = `${val}/${s.grandTotal} (${pct}%)`;
    } else {
      bar.classList.add('is-indeterminate');
      el('percent').textContent = `Silinen: ${s.delCount}`;
    }
    if (ctx.onProgress) ctx.onProgress(s);
  }

  // --- kanal silme akışı ---
  async function runChannel({ dryRun }) {
    const guildId = el('guildId').value.trim();
    const channelIds = el('channelId').value.trim().split(/\s*,\s*/).filter(Boolean);
    const filters = getFilters();

    let jobs, confirmMsg;
    if (channelIds.length) {
      jobs = channelIds.map((ch) => ({ channelId: ch, guildId, filters }));
      confirmMsg = `${channelIds.length} kanal/DM'de filtreye uyan mesajların silinecek. Devam?`;
    } else if (guildId && guildId !== '@me') {
      // Sunucu-geneli silme (search stratejisi): kanal yok, guild var
      if (!filters.authorId) return log('error', 'Sunucu-geneli silmede Author ID gerekli (yalnız kendi mesajların silinir).');
      jobs = [{ guildId, filters }];
      confirmMsg = `Bu sunucudaki (${guildId}) kendi mesajların silinecek. Devam?`;
    } else {
      return log('error', 'Channel ID, veya sunucu-geneli silme için Server ID + Author ID gerekli.');
    }

    log('verb', `${jobs.length} iş kuruldu (channelId=${channelIds.length ? 'var' : 'yok'}, guildId=${guildId || 'yok'}). Onay bekleniyor...`);
    if (!dryRun && !window.confirm(confirmMsg)) { log('warn', 'İptal edildi (onay verilmedi).'); return; }
    log('verb', 'Onaylandı. Token/motor hazırlanıyor...');

    const { api, token } = buildApi();
    if (!token) return; // buildApi geçersiz token'da detaylı hata yazdı
    log('verb', `Token alındı (${token.length} karakter). Motor kuruldu, silme başlıyor...`);
    makeEngine(api);
    startWatchdog();

    switchTab('log');
    log('info', dryRun ? 'Dry-run başladı (silme yok).' : 'Silme başladı.');
    // Progress paydası için tek seferlik toplam tahmini (read-only, best-effort; az sayıda iş için)
    const estimatedTotal = (!dryRun && jobs.length <= 10) ? await engine.estimateTotal(jobs) : 0;
    if (estimatedTotal > 0) log('verb', `Tahmini toplam: ~${estimatedTotal} mesaj.`);
    await engine.runQueue(jobs, { dryRun, estimatedTotal });
    if (dryRun) log('success', `Dry-run bitti: ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
    else { log('success', `Bitti. Silinen: ${engine.state.delCount}, başarısız: ${engine.state.failCount}.`); checkpoint.clear(); }
  }

  // --- start/dry/stop dispatch (aktif sekmeye göre) ---
  function dispatch({ dryRun }) {
    const active = panel.querySelector('.pc-tab.is-active')?.dataset.tab;
    switchTab('log'); // hatalar/ilerleme görünür olsun diye önce Log sekmesine geç
    const run = active === 'dm' ? ctx.runDm : runChannel;
    if (!run) return log('error', 'DM sekmesi hazır değil.');
    // async hataları sessizce yutma — Log'a yaz:
    Promise.resolve().then(() => run({ dryRun })).catch((err) => {
      log('error', `Beklenmeyen hata: ${err?.message || err}`);
      console.error('[purgecord] dispatch error', err);
    });
  }
  on('start', () => dispatch({ dryRun: false }));
  on('dry', () => dispatch({ dryRun: true }));
  on('stop', () => { engine?.stop(); abort?.abort(); log('warn', 'Durduruldu.'); });

  // --- resume banner ---
  const saved = checkpoint.load();
  if (saved && saved.job) {
    el('resumeBanner').hidden = false;
    el('resumeText').textContent = `Yarım kalan iş var (${saved.delCount || 0} silindi). Devam edilsin mi?`;
    on('resume', async () => {
      el('resumeBanner').hidden = true;
      const { api, token } = buildApi();
      if (!token) return; // buildApi hata yazdı
      makeEngine(api); startWatchdog();
      switchTab('log');
      await engine.runQueue([{ ...saved.job, before: saved.before }], { dryRun: false });
      log('success', 'Devam eden iş bitti.'); checkpoint.clear();
    });
    on('discard', () => { el('resumeBanner').hidden = true; checkpoint.clear(); });
  }

  // --- paylaşılan bağlam (Task 14 DM sekmesi kullanır) ---
  const ctx = {
    panel, el, log, buildApi, makeEngine, getFilters, startWatchdog,
    setRunningUI, renderProgress, switchTab, checkpoint,
    getEngine: () => engine,
    setEngine: (e) => { engine = e; },
    runDm: null,       // Task 14 doldurur
    onJobStart: null,  // Task 14 doldurur (focus kartı + DM log)
    onJobDone: null,   // Task 14 doldurur (DM başı sonuç logu + DM kapatma)
    onProgress: null,  // Task 14 doldurur (focus kartı ilerlemesi)
  };

  initDmTab(ctx);

  log('info', 'Purgecord hazır. Bir sekme seç ve başlat.');
  return ctx;
}
