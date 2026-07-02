import { styles } from './styles.css.js';
import { buttonHtml, panelHtml } from './template.html.js';
import { makeDraggable, makeResizable } from './DragResize.js';
import { ApiClient } from '../core/ApiClient.js';
import { DeleteEngine } from '../core/DeleteEngine.js';
import { Checkpoint } from '../core/Checkpoint.js';
import { Watchdog } from '../core/Watchdog.js';
import { getToken, getAuthorId, parseIdsFromUrl, looksLikeToken } from '../discord/token.js';
import { t, detectLocale, setLocale } from '../i18n.js';
import { initDmTab } from './dmTab.js';

// ---- small helpers ----
function insertCss(css) {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
}
function createEl(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html.trim();
  return tmp.firstElementChild;
}
// Where to mount the trigger button: prefer next to the help button in the top navbar.
function findMountPoint() {
  // 1) Top navbar: the support/help link (the inbox & help cluster lives here)
  const help = document.querySelector('#app-mount a[href*="support.discord.com"], #app-mount a[href*="//discord.com/help"]');
  if (help && help.parentElement) return { host: help.parentElement, before: help };
  // 2) Fallback: the topmost (smallest top offset) visible toolbar
  const bars = [...document.querySelectorAll('#app-mount [class*="toolbar_"]')].filter((b) => b.offsetParent !== null);
  if (bars.length) {
    bars.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return { host: bars[0], before: null };
  }
  return null;
}

export function initUI() {
  setLocale(detectLocale());
  insertCss(styles);

  // Fill {{key}} placeholders with localized strings, then build the panel.
  const localized = panelHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => t(k));
  const panel = createEl(localized);
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
    // If "follow log" is on (default), scroll to the newest line.
    const scroller = logEl.closest('.pc-body');
    if (scroller && el('autoScroll')?.checked !== false) scroller.scrollTop = scroller.scrollHeight;
    if (type === 'error') console.error('[purgecord]', ...args);
  }
  // Log a deleted message's info — createElement+textContent (XSS-safe).
  // Author/content/ID wrapped in .pc-priv → blurred in Streamer mode (like undiscord).
  function logMsgInfo(msg, r) {
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
    const disc = (msg.author?.discriminator && msg.author.discriminator !== '0') ? '#' + msg.author.discriminator : '';
    const author = (msg.author?.username || '?') + disc;
    const content = String(msg.content || '').replace(/\n/g, '↵');
    const status = (r && r !== 'OK') ? ` (${r})` : '';

    const mk = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.textContent = text; // auto-escaped — no HTML injection
      return e;
    };
    const line = document.createElement('div');
    line.className = 'pc-log-line pc-log-debug';
    line.append(mk('sup', '', time), ' ', mk('b', 'pc-priv', author), ': ', mk('i', 'pc-priv', content));
    if (msg.attachments && msg.attachments.length) line.append(' ', mk('span', 'pc-priv', `[${msg.attachments.length} file(s)]`));
    line.append(' ', mk('sup', 'pc-priv', `{ID:${msg.id}}`));
    if (status) line.append(status);

    logEl.appendChild(line);
    const scroller = logEl.closest('.pc-body');
    if (scroller && el('autoScroll')?.checked !== false) scroller.scrollTop = scroller.scrollHeight;
  }

  // --- button mount + re-mount ---
  function mountBtn() {
    const mp = findMountPoint();
    if (mp && !mp.host.contains(btn)) {
      if (mp.before) mp.host.prepend(btn); // to the start of the help cluster → left of inbox
      else mp.host.append(btn);
    }
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

  // --- drag / resize / tabs ---
  makeDraggable(panel, panel.querySelector('[data-drag]'));
  makeResizable(panel, panel.querySelector('[data-resize]'));

  function switchTab(name) {
    panel.querySelectorAll('.pc-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.tab === name));
    panel.querySelectorAll('.pc-view').forEach((v) => (v.hidden = v.dataset.view !== name));
  }
  panel.querySelectorAll('.pc-tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  // --- redact / streamer mode ---
  el('redact').addEventListener('change', (e) => panel.classList.toggle('pc-redact', e.target.checked));

  // --- fill id/token buttons ---
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
    const tok = (() => { try { return getToken(); } catch { return ''; } })();
    if (looksLikeToken(tok)) { el('token').value = tok; log('success', t('token_got', { n: tok.length })); }
    else log('error', t('token_autofill_failed'));
  });

  // --- delay sliders ---
  const bindSlider = (input, valSpan) => {
    const sync = () => (valSpan.textContent = input.value);
    input.addEventListener('input', sync);
    sync();
  };
  bindSlider(el('deleteDelay'), el('deleteDelayVal'));
  bindSlider(el('searchDelay'), el('searchDelayVal'));

  // --- runtime state ---
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
      log('error', t('no_valid_token'));
      return { api: null, token: '' };
    }
    const api = new ApiClient({
      token,
      fetchImpl: (u, o) => fetch(u, o),
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      signal: abort.signal,
      onThrottle: ({ ms }) => {
        if (!engine) return;
        engine.state.lastProgressTs = Date.now(); // active but throttled — don't count as a stall
        // Adaptive: bump delete delay on each 429 (converge to a sustainable rate), max 6s
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
      onDelete: (msg, r) => { if (el('logMsgInfo')?.checked) logMsgInfo(msg, r); },
      saveCheckpoint: (data) => checkpoint.save({ ...data, ts: Date.now() }),
    });
    return engine;
  }

  function startWatchdog() {
    watchdog = new Watchdog({
      getLastProgress: () => (engine ? engine.state.lastProgressTs : Date.now()),
      isRunning: () => !!(engine && engine.state.running),
      onStall: () => log('warn', t('stall_hint')),
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
      el('percent').textContent = t('deleted_n', { n: s.delCount });
    }
    if (ctx.onProgress) ctx.onProgress(s);
  }

  // --- channel deletion flow ---
  async function runChannel({ dryRun }) {
    const guildId = el('guildId').value.trim();
    const channelIds = el('channelId').value.trim().split(/\s*,\s*/).filter(Boolean);
    const filters = getFilters();

    let jobs, confirmMsg;
    if (channelIds.length) {
      jobs = channelIds.map((ch) => ({ channelId: ch, guildId, filters }));
      confirmMsg = t('confirm_channels', { n: channelIds.length });
    } else if (guildId && guildId !== '@me') {
      // Server-wide deletion (search strategy): no channel, guild set
      if (!filters.authorId) return log('error', t('need_author_server'));
      jobs = [{ guildId, filters }];
      confirmMsg = t('confirm_server', { guildId });
    } else {
      return log('error', t('need_channel_or_server'));
    }

    log('verb', t('jobs_built', { n: jobs.length, ch: channelIds.length, g: guildId || '@me' }));
    if (!dryRun && !window.confirm(confirmMsg)) { log('warn', t('canceled_no_confirm')); return; }
    log('verb', t('confirmed_prep'));

    const { api, token } = buildApi();
    if (!token) return; // buildApi already logged a detailed error
    log('verb', t('token_got_engine', { n: token.length }));
    makeEngine(api);
    startWatchdog();

    switchTab('log');
    log('info', dryRun ? t('dryrun_started') : t('delete_started'));
    // One-time read-only total estimate for the progress denominator (best-effort; few jobs only)
    const estimatedTotal = (!dryRun && jobs.length <= 10) ? await engine.estimateTotal(jobs) : 0;
    if (estimatedTotal > 0) log('verb', t('est_total', { n: estimatedTotal }));
    await engine.runQueue(jobs, { dryRun, estimatedTotal });
    if (dryRun) log('success', t('dryrun_done', { n: engine.state.grandTotal }));
    else { log('success', t('done_summary', { del: engine.state.delCount, fail: engine.state.failCount })); checkpoint.clear(); }
  }

  // --- start/dry/stop dispatch (by active tab) ---
  function dispatch({ dryRun }) {
    const active = panel.querySelector('.pc-tab.is-active')?.dataset.tab;
    switchTab('log'); // switch to Log first so errors/progress are visible
    const run = active === 'dm' ? ctx.runDm : runChannel;
    if (!run) return log('error', t('dm_tab_not_ready'));
    // Don't silently swallow async errors — write them to the Log:
    Promise.resolve().then(() => run({ dryRun })).catch((err) => {
      log('error', t('unexpected_error', { err: err?.message || err }));
      console.error('[purgecord] dispatch error', err);
    });
  }
  on('start', () => dispatch({ dryRun: false }));
  on('dry', () => dispatch({ dryRun: true }));
  on('stop', () => { engine?.stop(); abort?.abort(); log('warn', t('stopped')); });

  // --- resume banner ---
  const saved = checkpoint.load();
  if (saved && saved.job) {
    el('resumeBanner').hidden = false;
    el('resumeText').textContent = t('resume_text', { n: saved.delCount || 0 });
    on('resume', async () => {
      el('resumeBanner').hidden = true;
      const { api, token } = buildApi();
      if (!token) return; // buildApi logged the error
      makeEngine(api); startWatchdog();
      switchTab('log');
      await engine.runQueue([{ ...saved.job, before: saved.before }], { dryRun: false });
      log('success', t('resume_done')); checkpoint.clear();
    });
    on('discard', () => { el('resumeBanner').hidden = true; checkpoint.clear(); });
  }

  // --- shared context (consumed by the DM tab) ---
  const ctx = {
    panel, el, log, buildApi, makeEngine, getFilters, startWatchdog,
    setRunningUI, renderProgress, switchTab, checkpoint,
    getEngine: () => engine,
    setEngine: (e) => { engine = e; },
    runDm: null,       // filled by initDmTab
    onJobStart: null,  // filled by initDmTab (focus card + DM log)
    onJobDone: null,   // filled by initDmTab (per-DM result log + DM close)
    onProgress: null,  // filled by initDmTab (focus card progress)
  };

  try {
    initDmTab(ctx);
  } catch (err) {
    console.error('[purgecord] initDmTab error:', err);
    log('error', t('dmtab_init_failed', { err: err?.message || err }));
  }

  log('info', t('ready'));
  return ctx;
}
