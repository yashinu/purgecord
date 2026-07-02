// ==UserScript==
// @name         Purgecord
// @namespace    https://github.com/local/purgecord
// @version      0.1.0
// @description  Discord toplu mesaj & DM silici (undiscord temelli, sağlamlaştırılmış)
// @author       local
// @match        https://*.discord.com/*
// @icon         https://victornpb.github.io/undiscord/images/icon128.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  // src/ui/styles.css.js
  var styles = `
#purgecord-btn { display:flex; align-items:center; justify-content:center; width:24px; height:24px; margin:0 8px; cursor:pointer; color:var(--interactive-normal,#b5bac1); flex:0 0 auto; }
#purgecord-btn:hover { color:var(--interactive-hover,#dbdee1); }
#purgecord-btn.is-running { color:var(--status-danger,#f23f43); }

#purgecord { position:fixed; z-index:1000; top:60px; right:20px; width:720px; height:78vh; min-width:480px; min-height:420px; display:flex; flex-direction:column; background:var(--background-primary,#313338); color:var(--text-normal,#dbdee1); border:1px solid var(--background-tertiary,#1e1f22); border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,.5); overflow:hidden; font-family:var(--font-primary,'gg sans',sans-serif); }
#purgecord[hidden]{ display:none; }
#purgecord *, #purgecord *::before { box-sizing:border-box; }

.pc-header { display:flex; align-items:center; gap:10px; height:48px; padding:0 14px; background:var(--background-secondary,#2b2d31); cursor:grab; user-select:none; }
.pc-logo { font-weight:700; font-size:15px; }
.pc-sub { font-size:12px; color:var(--text-muted,#949ba4); }
.pc-spacer { flex:1; }
.pc-icon-btn { background:none; border:none; color:var(--interactive-normal,#b5bac1); font-size:16px; cursor:pointer; padding:6px; border-radius:4px; }
.pc-icon-btn:hover { background:var(--background-modifier-hover,rgba(255,255,255,.06)); color:#fff; }

.pc-tabs { display:flex; gap:2px; padding:8px 10px 0; background:var(--background-secondary,#2b2d31); }
.pc-tab { padding:8px 14px; background:none; border:none; border-radius:6px 6px 0 0; color:var(--text-muted,#949ba4); font-size:13px; font-weight:600; cursor:pointer; }
.pc-tab:hover { color:var(--interactive-hover,#dbdee1); }
.pc-tab.is-active { color:#fff; background:var(--background-primary,#313338); }

.pc-body { flex:1; overflow:auto; padding:14px; }
.pc-view[hidden]{ display:none; }

.pc-field { margin-bottom:14px; }
.pc-field > label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; color:var(--header-secondary,#b5bac1); margin-bottom:6px; letter-spacing:.02em; }
.pc-row { display:flex; gap:6px; align-items:center; }
.pc-input, #purgecord input[type=text], #purgecord input[type=search], #purgecord input[type=datetime-local] { width:100%; height:38px; padding:0 10px; background:var(--input-background,#1e1f22); border:1px solid transparent; border-radius:6px; color:var(--text-normal,#dbdee1); font-size:14px; }
.pc-input:focus { border-color:var(--brand-experiment,#5865f2); outline:none; }
.pc-check { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-normal,#dbdee1); margin:6px 0; cursor:pointer; font-weight:400; }
.pc-hint { font-size:12px; color:var(--text-muted,#949ba4); margin:6px 0; }

.pc-btn { height:36px; padding:0 16px; border:none; border-radius:6px; background:var(--button-secondary-background,#4e5058); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.pc-btn:hover { filter:brightness(1.1); }
.pc-btn:disabled { opacity:.4; cursor:not-allowed; }
.pc-btn.pc-danger { background:var(--button-danger-background,#da373c); }
.pc-btn.pc-small { height:30px; padding:0 10px; font-size:12px; }

.pc-details { border-top:1px solid var(--background-modifier-accent,rgba(255,255,255,.06)); margin-top:10px; padding-top:10px; }
.pc-details > summary { cursor:pointer; font-size:13px; font-weight:600; color:var(--header-secondary,#b5bac1); }

.pc-footer { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--background-secondary,#2b2d31); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-progress { flex:1; height:8px; background:var(--background-tertiary,#1e1f22); border-radius:4px; overflow:hidden; }
.pc-progress-bar { height:100%; width:0; background:var(--brand-experiment,#5865f2); transition:width .2s; }
.pc-progress-bar.is-indeterminate { width:30%; animation:pc-indet 1.2s infinite ease-in-out; }
@keyframes pc-indet { 0%{margin-left:-30%} 100%{margin-left:100%} }
.pc-percent { font-size:12px; color:var(--text-muted,#949ba4); min-width:130px; text-align:right; }

#pc-log { margin:0; font-family:Consolas,'Courier New',monospace; font-size:12px; white-space:pre-wrap; word-break:break-word; }
.pc-log-line { margin:2px 0; }
.pc-log-info{color:#00a8fc} .pc-log-verb{color:#949ba4} .pc-log-warn{color:#f0b232} .pc-log-error{color:#f23f43} .pc-log-success{color:#23a559} .pc-log-debug{color:var(--text-normal,#dbdee1)}

.pc-dm-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
.pc-dm-count { font-size:12px; color:var(--text-muted,#949ba4); margin-left:auto; }
.pc-dm-modes { display:flex; gap:14px; font-size:13px; flex-wrap:wrap; }
.pc-dm-list { display:flex; flex-direction:column; gap:2px; }
.pc-dm-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:6px; cursor:pointer; }
.pc-dm-row:hover { background:var(--background-modifier-hover,rgba(255,255,255,.04)); }
.pc-dm-avatar { width:32px; height:32px; border-radius:50%; background:var(--background-tertiary,#1e1f22); flex:0 0 auto; object-fit:cover; }
.pc-dm-meta { flex:1; min-width:0; }
.pc-dm-name { font-size:14px; color:var(--text-normal,#f2f3f5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pc-dm-time { font-size:11px; color:var(--text-muted,#949ba4); }
.pc-badge { font-size:10px; padding:1px 6px; border-radius:10px; background:var(--background-tertiary,#1e1f22); color:var(--text-muted,#949ba4); text-transform:uppercase; }

.pc-focus { display:flex; align-items:center; gap:10px; padding:8px 14px; background:var(--background-secondary-alt,#232428); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-focus[hidden]{ display:none; }
.pc-focus .pc-dm-avatar { width:28px; height:28px; }
.pc-focus-name { font-size:13px; font-weight:600; }
.pc-focus-prog { font-size:11px; color:var(--text-muted,#949ba4); }

.pc-banner { display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(240,178,50,.12); border-bottom:1px solid var(--background-tertiary,#1e1f22); font-size:13px; }
.pc-banner[hidden]{ display:none; }

.pc-resize { position:absolute; right:2px; bottom:2px; width:16px; height:16px; cursor:nwse-resize; opacity:.5; background:linear-gradient(135deg,transparent 50%,var(--text-muted,#949ba4) 50%); border-radius:0 0 6px 0; }

#purgecord.pc-redact .pc-priv { filter:blur(5px); transition:filter .1s; }
#purgecord.pc-redact .pc-priv:hover { filter:none; }
`;

  // src/ui/template.html.js
  var buttonHtml = `
<div id="purgecord-btn" role="button" tabindex="0" aria-label="Purgecord" title="Purgecord \u2014 toplu mesaj sil">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
    <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
  </svg>
</div>`;
  var panelHtml = `
<div id="purgecord" class="pc-panel pc-redact" hidden>
  <header class="pc-header" data-drag>
    <span class="pc-logo">\u{1F5D1}\uFE0F Purgecord</span>
    <span class="pc-sub">Toplu mesaj & DM silici</span>
    <span class="pc-spacer"></span>
    <label class="pc-check" title="Ekran payla\u015F\u0131m\u0131 i\xE7in gizle"><input type="checkbox" data-el="redact" checked> Streamer</label>
    <button class="pc-icon-btn" data-action="close" title="Kapat">\u2715</button>
  </header>

  <div class="pc-banner" data-el="resumeBanner" hidden>
    <span data-el="resumeText"></span>
    <span class="pc-spacer"></span>
    <button class="pc-btn pc-small" data-action="resume">Devam et</button>
    <button class="pc-btn pc-small" data-action="discard">Vazge\xE7</button>
  </div>

  <nav class="pc-tabs">
    <button class="pc-tab is-active" data-tab="channel">Kanal / Sunucu</button>
    <button class="pc-tab" data-tab="dm">Toplu DM</button>
    <button class="pc-tab" data-tab="log">Log</button>
  </nav>

  <div class="pc-body">
    <section class="pc-view" data-view="channel">
      <div class="pc-field"><label>Author ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="authorId" type="text" placeholder="Silinecek mesajlar\u0131n yazar\u0131">
        <button class="pc-btn pc-small" data-action="fillAuthor">ben</button></div></div>
      <div class="pc-field"><label>Server ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="guildId" type="text" placeholder="@me = DM">
        <button class="pc-btn pc-small" data-action="fillGuild">mevcut</button></div></div>
      <div class="pc-field"><label>Channel ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="channelId" type="text" placeholder="Kanal/DM id (virg\xFClle \xE7oklu)">
        <button class="pc-btn pc-small" data-action="fillChannel">mevcut</button></div></div>

      <details class="pc-details"><summary>Filtreler</summary>
        <div class="pc-field" style="margin-top:10px"><label>\u0130\xE7erik</label>
          <input class="pc-input pc-priv" data-el="content" type="text" placeholder="Bu metni i\xE7erenler"></div>
        <label class="pc-check"><input type="checkbox" data-el="hasLink"> Link i\xE7eren</label>
        <label class="pc-check"><input type="checkbox" data-el="hasFile"> Dosya i\xE7eren</label>
        <label class="pc-check"><input type="checkbox" data-el="includePinned"> Sabitlenmi\u015Fleri de sil</label>
        <div class="pc-field" style="margin-top:10px"><label>Regex</label>
          <input class="pc-input pc-priv" data-el="pattern" type="text" placeholder="d\xFCzenli ifade (i)"></div>
      </details>

      <details class="pc-details"><summary>Tarih / mesaj aral\u0131\u011F\u0131</summary>
        <div class="pc-field" style="margin-top:10px"><label>Sonras\u0131 (After)</label>
          <input class="pc-input" data-el="minDate" type="datetime-local"></div>
        <div class="pc-field"><label>\xD6ncesi (Before)</label>
          <input class="pc-input" data-el="maxDate" type="datetime-local"></div>
        <div class="pc-field"><label>min ID / max ID</label>
          <div class="pc-row"><input class="pc-input pc-priv" data-el="minId" type="text" placeholder="min id">
          <input class="pc-input pc-priv" data-el="maxId" type="text" placeholder="max id"></div></div>
      </details>

      <details class="pc-details"><summary>Geli\u015Fmi\u015F</summary>
        <div class="pc-field" style="margin-top:10px"><label>Silme gecikmesi: <span data-el="deleteDelayVal">1250</span>ms</label>
          <input data-el="deleteDelay" type="range" min="500" max="10000" step="50" value="1250" style="width:100%"></div>
        <div class="pc-field"><label>Sayfa gecikmesi: <span data-el="searchDelayVal">1000</span>ms</label>
          <input data-el="searchDelay" type="range" min="0" max="10000" step="50" value="1000" style="width:100%"></div>
        <div class="pc-field"><label>Token</label>
          <div class="pc-row"><input class="pc-input" data-el="token" type="password" autocomplete="off" placeholder="otomatik doldurulur">
          <button class="pc-btn pc-small" data-action="fillToken">doldur</button></div></div>
      </details>
    </section>

    <section class="pc-view" data-view="dm" hidden>
      <div class="pc-dm-toolbar">
        <button class="pc-btn pc-small" data-action="loadDms">DM'leri y\xFCkle</button>
        <input class="pc-input pc-priv" data-el="dmSearch" type="search" placeholder="Ara..." style="max-width:180px">
        <span class="pc-dm-count" data-el="dmCount">0 se\xE7ili</span>
      </div>
      <div class="pc-dm-modes">
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="only" checked> Sadece se\xE7ilenleri sil</label>
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="except"> Se\xE7ilenler hari\xE7 hepsini sil</label>
      </div>
      <div class="pc-dm-modes" style="margin:6px 0">
        <label class="pc-check"><input type="checkbox" data-el="dmSelectAll"> T\xFCm\xFCn\xFC se\xE7</label>
        <label class="pc-check"><input type="checkbox" data-el="followDm"> DM'i Discord'da takip et</label>
        <label class="pc-check"><input type="checkbox" data-el="closeDm"> Temizlenen DM'i kapat</label>
      </div>
      <div class="pc-hint">DM modunda yaln\u0131z <b>kendi</b> mesajlar\u0131n silinir. Kanal sekmesindeki filtreler burada da uygulan\u0131r.</div>
      <div class="pc-dm-list" data-el="dmList"></div>
    </section>

    <section class="pc-view" data-view="log" hidden>
      <label class="pc-check" style="margin-bottom:8px"><input type="checkbox" data-el="autoScroll" checked> Logu takip et (son loga kayd\u0131r)</label>
      <pre id="pc-log"></pre>
    </section>
  </div>

  <div class="pc-focus" data-el="focus" hidden>
    <img class="pc-dm-avatar pc-priv" data-el="focusAvatar" alt="">
    <div><div class="pc-focus-name pc-priv" data-el="focusName">\u2014</div>
    <div class="pc-focus-prog" data-el="focusProg"></div></div>
  </div>

  <footer class="pc-footer">
    <button class="pc-btn pc-danger" data-action="start">\u25B6 Sil</button>
    <button class="pc-btn" data-action="dry">Sadece say</button>
    <button class="pc-btn" data-action="stop" disabled>\u23F8 Durdur</button>
    <div class="pc-progress"><div class="pc-progress-bar" data-el="progressBar"></div></div>
    <span class="pc-percent" data-el="percent"></span>
  </footer>

  <div class="pc-resize" data-resize></div>
</div>`;

  // src/ui/DragResize.js
  var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function makeDraggable(panel, handle) {
    let sx, sy, st, sl;
    const onMove = (e) => {
      const t = clamp(st + (e.clientY - sy), 0, window.innerHeight - 40);
      const l = clamp(sl + (e.clientX - sx), -panel.offsetWidth + 80, window.innerWidth - 80);
      panel.style.top = t + "px";
      panel.style.left = l + "px";
      panel.style.right = "auto";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = panel.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      st = r.top;
      sl = r.left;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }
  function makeResizable(panel, handle) {
    let sx, sy, sw, sh;
    const onMove = (e) => {
      panel.style.width = Math.max(480, sw + (e.clientX - sx)) + "px";
      panel.style.height = Math.max(420, sh + (e.clientY - sy)) + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      sx = e.clientX;
      sy = e.clientY;
      sw = panel.offsetWidth;
      sh = panel.offsetHeight;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // src/core/backoff.js
  var BACKOFF_DEFAULTS = { minDelay: 500, maxDelay: 6e4, base: 1e3, factor: 2 };
  var clamp2 = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function computeBackoff({ status, retryAfterMs, attempt = 0, globalLimited = false }, opts = {}, rng = Math.random) {
    const o = { ...BACKOFF_DEFAULTS, ...opts };
    let ms;
    if (status === 429 || status === 202) {
      ms = typeof retryAfterMs === "number" && retryAfterMs > 0 ? retryAfterMs : o.base;
    } else {
      const exp = o.base * Math.pow(o.factor, attempt);
      ms = exp + exp * 0.2 * rng();
    }
    if (globalLimited && typeof retryAfterMs === "number" && retryAfterMs > 0) {
      ms = Math.max(ms, retryAfterMs);
    }
    return clamp2(ms, o.minDelay, o.maxDelay);
  }

  // src/core/ApiClient.js
  var AbortError = class extends Error {
    constructor() {
      super("aborted");
      this.name = "AbortError";
    }
  };
  function getHeader(resp, name) {
    try {
      return resp.headers?.get?.(name) ?? null;
    } catch {
      return null;
    }
  }
  async function safeJson(resp) {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }
  var ApiClient = class {
    constructor({ token, fetchImpl, wait, signal = null, backoffOpts = {}, onThrottle = () => {
    }, log = () => {
    } }) {
      this.token = token;
      this.fetchImpl = fetchImpl;
      this.wait = wait;
      this.signal = signal;
      this.backoffOpts = backoffOpts;
      this.onThrottle = onThrottle;
      this.log = log;
      this.stats = { throttledCount: 0, throttledTotalTime: 0, requests: 0 };
    }
    async request(url, { method = "GET", maxRetries = 8, noRetry = false } = {}) {
      for (let attempt = 0; ; attempt++) {
        if (this.signal?.aborted) throw new AbortError();
        this.stats.requests++;
        let resp;
        try {
          resp = await this.fetchImpl(url, {
            method,
            headers: { "Authorization": this.token },
            signal: this.signal
          });
        } catch (err) {
          if (this.signal?.aborted) throw new AbortError();
          if (noRetry || attempt >= maxRetries) throw err;
          const ms = computeBackoff({ status: 0, attempt }, this.backoffOpts);
          this.log("warn", `A\u011F hatas\u0131; ${ms}ms sonra tekrar (deneme ${attempt + 1}).`);
          await this.wait(ms);
          continue;
        }
        if (noRetry) return resp;
        if (resp.status === 429 || resp.status === 202) {
          const body = await safeJson(resp);
          const retryAfterMs = Math.round((body?.retry_after ?? 0) * 1e3);
          const globalLimited = getHeader(resp, "x-ratelimit-global") === "true";
          const ms = computeBackoff({ status: resp.status, retryAfterMs, attempt, globalLimited }, this.backoffOpts);
          this.stats.throttledCount++;
          this.stats.throttledTotalTime += ms;
          this.onThrottle({ ms, status: resp.status, global: globalLimited });
          this.log("verb", `${resp.status === 202 ? "\u0130ndeksleniyor" : "Rate limit"}; ${ms}ms bekleniyor...`);
          await this.wait(ms);
          continue;
        }
        if (resp.status >= 500) {
          if (attempt >= maxRetries) return resp;
          const ms = computeBackoff({ status: resp.status, attempt }, this.backoffOpts);
          this.log("warn", `Sunucu hatas\u0131 ${resp.status}; ${ms}ms sonra tekrar...`);
          await this.wait(ms);
          continue;
        }
        return resp;
      }
    }
  };

  // src/discord/constants.js
  var API_BASE = "https://discord.com/api/v9";
  var isDeletableType = (type) => type === 0 || type >= 6 && type <= 21;
  var CHANNEL_TYPE = { DM: 1, GROUP_DM: 3 };

  // src/core/snowflake.js
  var DISCORD_EPOCH = 14200704e5;
  function dateToSnowflake(date) {
    const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
    return (BigInt(ms - DISCORD_EPOCH) << 22n).toString();
  }
  function snowflakeToDate(id) {
    return new Date(Number(BigInt(id) >> 22n) + DISCORD_EPOCH);
  }
  function oldestId(messages) {
    return messages.reduce(
      (min, m) => BigInt(m.id) < BigInt(min) ? m.id : min,
      messages[0].id
    );
  }

  // src/core/filters.js
  var LINK_RE = /https?:\/\//i;
  function isDeletable(msg, o, regex, minSnow, maxSnow) {
    if (!isDeletableType(msg.type)) return false;
    if (msg.pinned && !o.includePinned) return false;
    if (o.authorId && msg.author?.id !== o.authorId) return false;
    if (o.content && !String(msg.content || "").toLowerCase().includes(o.content.toLowerCase())) return false;
    if (o.hasLink && !(LINK_RE.test(msg.content || "") || msg.embeds && msg.embeds.length)) return false;
    if (o.hasFile && !(msg.attachments && msg.attachments.length)) return false;
    if (regex && !regex.test(msg.content || "")) return false;
    if (minSnow && BigInt(msg.id) < BigInt(minSnow)) return false;
    if (maxSnow && BigInt(msg.id) > BigInt(maxSnow)) return false;
    return true;
  }
  function filterMessages(messages, options = {}) {
    let regex = null;
    if (options.pattern) {
      try {
        regex = new RegExp(options.pattern, "i");
      } catch {
        regex = null;
      }
    }
    const minSnow = options.minId || (options.minDate ? dateToSnowflake(options.minDate) : null);
    const maxSnow = options.maxId || (options.maxDate ? dateToSnowflake(options.maxDate) : null);
    const toDelete = [];
    const skipped = [];
    for (const msg of messages) {
      if (isDeletable(msg, options, regex, minSnow, maxSnow)) toDelete.push(msg);
      else skipped.push(msg);
    }
    return { toDelete, skipped };
  }

  // src/core/DeleteEngine.js
  var noop = () => {
  };
  var DeleteEngine = class {
    constructor({ api, wait, log = noop, options = {}, onProgress = noop, onStart = noop, onStop = noop, onJobStart = noop, onJobDone = noop, saveCheckpoint = noop }) {
      this.api = api;
      this.wait = wait;
      this.log = log;
      this.onProgress = onProgress;
      this.onStart = onStart;
      this.onStop = onStop;
      this.onJobStart = onJobStart;
      this.onJobDone = onJobDone;
      this.saveCheckpoint = saveCheckpoint;
      this.options = { deleteDelay: 1e3, searchDelay: 1e3, ...options };
      this.resetState();
    }
    resetState() {
      this.state = {
        running: false,
        delCount: 0,
        failCount: 0,
        grandTotal: 0,
        dryRun: false,
        currentJob: null,
        before: void 0,
        lastProgressTs: Date.now()
      };
    }
    stop() {
      this.state.running = false;
      this.onStop(this.state);
    }
    markProgress() {
      this.state.lastProgressTs = Date.now();
      this.onProgress(this.state);
    }
    /**
     * Bir kez, read-only search ile toplam mesaj sayısını tahmin eder (progress paydası için).
     * Silme YAPMAZ. Search indekslenmemişse/hata verirse 0 döner (sayaç-tabanlı progress'e düşülür).
     */
    async estimateTotal(jobs) {
      let total = 0;
      for (const job of jobs) {
        try {
          const params = new URLSearchParams();
          if (job.filters?.authorId) params.set("author_id", job.filters.authorId);
          if (job.filters?.content) params.set("content", job.filters.content);
          if (job.filters?.hasLink) params.set("has", "link");
          if (job.filters?.hasFile) params.set("has", "file");
          const base = job.guildId && job.guildId !== "@me" ? `${API_BASE}/guilds/${job.guildId}/messages/search` : `${API_BASE}/channels/${job.channelId}/messages/search`;
          const resp = await this.api.request(`${base}?${params.toString()}`, { noRetry: true });
          if (resp.ok) {
            const data = await resp.json();
            if (typeof data.total_results === "number") {
              job._estTotal = data.total_results;
              total += data.total_results;
            }
          }
        } catch (err) {
          if (err?.name === "AbortError") break;
        }
      }
      return total;
    }
    /** Job'ları sıralı işleyen kuyruk. */
    async runQueue(jobs, { dryRun = false, estimatedTotal = 0 } = {}) {
      this.resetState();
      this.state.running = true;
      this.state.dryRun = dryRun;
      this._estimated = estimatedTotal > 0;
      if (this._estimated) this.state.grandTotal = estimatedTotal;
      this.onStart(this.state);
      for (const job of jobs) {
        if (!this.state.running) break;
        this.state.currentJob = job;
        this.state.before = job.before || void 0;
        this.state.jobDelStart = this.state.delCount;
        this.state.jobFailStart = this.state.failCount;
        this.onJobStart(job, this.state);
        try {
          if (job.guildId && job.guildId !== "@me" && !job.channelId) {
            await this.runSearchJob(job, { dryRun });
          } else {
            await this.runCursorJob(job, { dryRun });
          }
          this.onJobDone(job, this.state);
        } catch (err) {
          if (err?.name === "AbortError") {
            this.log("warn", "\u0130ptal edildi.");
            break;
          }
          this.log("error", `Job hatas\u0131: ${err?.message || err}`);
        }
      }
      this.state.running = false;
      this.onStop(this.state);
      return { delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal };
    }
    /** Cursor sayfalama — DM/tek kanal için indeksten bağımsız ve deterministik. */
    async runCursorJob(job, { dryRun = false } = {}) {
      let before = job.before || void 0;
      while (this.state.running) {
        const url = `${API_BASE}/channels/${job.channelId}/messages?limit=100` + (before ? `&before=${before}` : "");
        let resp;
        try {
          resp = await this.api.request(url);
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          this.log("error", `Sayfa \xE7ekilemedi: ${err?.message || err}`);
          return;
        }
        if (resp.status === 401 || resp.status === 403) {
          this.log("error", `Yetki hatas\u0131 (${resp.status}). Token ge\xE7ersiz olabilir.`);
          this.stop();
          return;
        }
        if (!resp.ok) {
          this.log("error", `Beklenmeyen durum ${resp.status}; bu job atlan\u0131yor.`);
          return;
        }
        const page = await resp.json();
        if (!Array.isArray(page) || page.length === 0) break;
        const { toDelete } = filterMessages(page, job.filters || {});
        if (!this._estimated) this.state.grandTotal += toDelete.length;
        if (dryRun) {
          this.markProgress();
        } else {
          for (const msg of toDelete) {
            if (!this.state.running) return;
            await this.deleteMessage(msg);
            this.markProgress();
            await this.wait(this.options.deleteDelay);
          }
        }
        before = oldestId(page);
        this.state.before = before;
        this.saveCheckpoint({
          job,
          before,
          delCount: this.state.delCount,
          failCount: this.state.failCount,
          grandTotal: this.state.grandTotal
        });
        if (page.length < 100) break;
        await this.wait(this.options.searchDelay);
      }
      const jobHadFailures = this.state.failCount > (this.state.jobFailStart ?? 0);
      if (!dryRun && job.closeAfter && job._dm?.type === 1 && this.state.running && !jobHadFailures) {
        await this.closeDmIfClean(job);
      }
    }
    /** Son kontrol: en yeni sayfada filtreye uyan mesaj kalmadıysa DM'i kapatır (DELETE /channels/{id}). */
    async closeDmIfClean(job) {
      const label = job.label || job.channelId;
      try {
        const resp = await this.api.request(`${API_BASE}/channels/${job.channelId}/messages?limit=100`, { noRetry: true });
        if (!resp.ok) return false;
        const page = await resp.json();
        if (!Array.isArray(page)) return false;
        const { toDelete } = filterMessages(page, job.filters || {});
        if (toDelete.length > 0) {
          this.log("warn", `${label}: h\xE2l\xE2 filtreye uyan mesaj var, DM kapat\u0131lmad\u0131.`);
          return false;
        }
        const del = await this.api.request(`${API_BASE}/channels/${job.channelId}`, { method: "DELETE" });
        if (del.ok || del.status === 404) {
          this.log("success", `${label}: temiz \u2014 DM kapat\u0131ld\u0131.`);
          return true;
        }
        this.log("warn", `${label}: DM kapat\u0131lamad\u0131 (durum ${del.status}).`);
        return false;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        return false;
      }
    }
    /** Search stratejisi — sunucu-geneli (guildId, tek kanal yok). Boş sayfa doğrulamalı. */
    async runSearchJob(job, { dryRun = false } = {}) {
      let offset = 0;
      let emptyStreak = 0;
      while (this.state.running) {
        const params = new URLSearchParams();
        if (job.filters?.authorId) params.set("author_id", job.filters.authorId);
        params.set("sort_by", "timestamp");
        params.set("sort_order", "desc");
        params.set("offset", String(offset));
        const url = `${API_BASE}/guilds/${job.guildId}/messages/search?${params.toString()}`;
        let resp;
        try {
          resp = await this.api.request(url);
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          this.log("error", `Arama hatas\u0131: ${err?.message || err}`);
          return;
        }
        if (resp.status === 401 || resp.status === 403) {
          this.log("error", `Yetki hatas\u0131 (${resp.status}).`);
          this.stop();
          return;
        }
        if (!resp.ok) {
          this.log("error", `Arama durumu ${resp.status}; job atlan\u0131yor.`);
          return;
        }
        const data = await resp.json();
        const total = data.total_results || 0;
        if (total > this.state.grandTotal) this.state.grandTotal = total;
        const discovered = (data.messages || []).map((convo) => convo.find((m) => m.hit === true)).filter(Boolean);
        const { toDelete, skipped } = filterMessages(discovered, job.filters || {});
        if (discovered.length === 0) {
          if (total > 0 && emptyStreak < 3) {
            emptyStreak++;
            this.log("verb", `Bo\u015F sayfa (${emptyStreak}/3) do\u011Frulan\u0131yor...`);
            await this.wait(this.options.searchDelay);
            continue;
          }
          break;
        }
        emptyStreak = 0;
        if (dryRun) {
          this.markProgress();
        } else {
          for (const msg of toDelete) {
            if (!this.state.running) return;
            const r = await this.deleteMessage(msg);
            if (r !== "OK") offset++;
            this.markProgress();
            await this.wait(this.options.deleteDelay);
          }
        }
        offset += skipped.length;
        this.saveCheckpoint({ job, offset, delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal });
        await this.wait(this.options.searchDelay);
      }
    }
    /** Tek mesajı sil. Retry ApiClient'te merkezî olduğundan burada RETRY döngüsü yok. */
    async deleteMessage(msg) {
      let resp;
      try {
        resp = await this.api.request(`${API_BASE}/channels/${msg.channel_id}/messages/${msg.id}`, { method: "DELETE" });
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        this.state.failCount++;
        return "FAILED";
      }
      if (resp.ok || resp.status === 404) {
        this.state.delCount++;
        return "OK";
      }
      let body = null;
      try {
        body = await resp.json();
      } catch {
      }
      if (resp.status === 400 && body?.code === 50083) {
        this.state.failCount++;
        return "FAIL_SKIP";
      }
      this.log("error", `Silme hatas\u0131 ${resp.status} (id ${msg.id}).`);
      this.state.failCount++;
      return "FAILED";
    }
  };

  // src/core/Checkpoint.js
  var Checkpoint = class {
    constructor(storage, key = "purgecord:state") {
      this.storage = storage;
      this.key = key;
    }
    save(state) {
      try {
        this.storage.setItem(this.key, JSON.stringify(state));
      } catch {
      }
    }
    load() {
      try {
        const s = this.storage.getItem(this.key);
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    }
    clear() {
      try {
        this.storage.removeItem(this.key);
      } catch {
      }
    }
  };

  // src/core/Watchdog.js
  var Watchdog = class {
    constructor({ getLastProgress, isRunning, onStall, stallMs = 9e4, now = () => Date.now(), setIntervalImpl = (fn, ms) => setInterval(fn, ms), clearIntervalImpl = (id) => clearInterval(id) }) {
      this.getLastProgress = getLastProgress;
      this.isRunning = isRunning;
      this.onStall = onStall;
      this.stallMs = stallMs;
      this.now = now;
      this.setIntervalImpl = setIntervalImpl;
      this.clearIntervalImpl = clearIntervalImpl;
      this.timer = null;
    }
    start() {
      this.stop();
      const period = Math.max(1e3, Math.floor(this.stallMs / 3));
      this.timer = this.setIntervalImpl(() => this.check(), period);
      return this;
    }
    check() {
      if (!this.isRunning()) return;
      if (this.now() - this.getLastProgress() > this.stallMs) {
        this.onStall();
      }
    }
    stop() {
      if (this.timer != null) {
        this.clearIntervalImpl(this.timer);
        this.timer = null;
      }
    }
  };

  // src/discord/token.js
  function parseIdsFromUrl(href = typeof location !== "undefined" ? location.href : "") {
    const m = String(href).match(/channels\/([\w@]+)\/(\d+)/);
    return m ? { guildId: m[1], channelId: m[2] } : { guildId: null, channelId: null };
  }
  function looksLikeToken(t) {
    return typeof t === "string" && t.trim().length >= 30;
  }
  function getToken() {
    try {
      let found = "";
      window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {
        for (const m of Object.values(req.c || {})) {
          try {
            const t = m?.exports?.default?.getToken?.();
            if (looksLikeToken(t)) {
              found = t;
              break;
            }
          } catch {
          }
        }
      }]);
      if (looksLikeToken(found)) return found;
    } catch {
    }
    try {
      const iframe = document.body.appendChild(document.createElement("iframe"));
      const raw = iframe.contentWindow.localStorage.token;
      iframe.remove();
      if (raw) {
        const t = JSON.parse(raw);
        if (looksLikeToken(t)) return t;
      }
    } catch {
    }
    return "";
  }
  function getAuthorId() {
    try {
      const iframe = document.body.appendChild(document.createElement("iframe"));
      const raw = iframe.contentWindow.localStorage.user_id_cache;
      iframe.remove();
      return raw ? JSON.parse(raw) : "";
    } catch {
      return "";
    }
  }

  // src/core/DmDiscovery.js
  function dmName(channel) {
    if (channel.type === CHANNEL_TYPE.GROUP_DM) {
      if (channel.name) return channel.name;
      const names = (channel.recipients || []).map((r2) => r2.global_name || r2.username).filter(Boolean);
      return names.length ? names.join(", ") : "Grup DM";
    }
    const r = (channel.recipients || [])[0];
    return r ? r.global_name || r.username || "Bilinmeyen" : "Bilinmeyen";
  }
  function dmIcon(channel) {
    if (channel.type === CHANNEL_TYPE.GROUP_DM) {
      return channel.icon ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64` : null;
    }
    const r = (channel.recipients || [])[0];
    return r?.avatar ? `https://cdn.discordapp.com/avatars/${r.id}/${r.avatar}.png?size=64` : null;
  }
  function mapDmChannel(c) {
    return {
      id: c.id,
      type: c.type,
      name: dmName(c),
      icon: dmIcon(c),
      lastMessageId: c.last_message_id || null,
      lastTime: c.last_message_id ? snowflakeToDate(c.last_message_id) : null
    };
  }
  function cmpSnowDesc(a, b) {
    const av = a ? BigInt(a) : 0n;
    const bv = b ? BigInt(b) : 0n;
    return av < bv ? 1 : av > bv ? -1 : 0;
  }
  async function listDms(api) {
    const resp = await api.request(`${API_BASE}/users/@me/channels`);
    if (!resp.ok) throw new Error(`DM listesi al\u0131namad\u0131: ${resp.status}`);
    const channels = await resp.json();
    return channels.filter((c) => c.type === CHANNEL_TYPE.DM || c.type === CHANNEL_TYPE.GROUP_DM).map(mapDmChannel).sort((a, b) => cmpSnowDesc(a.lastMessageId, b.lastMessageId));
  }

  // src/ui/dmTab.js
  function initDmTab(ctx) {
    const { panel, el, log } = ctx;
    let dms = [];
    const selected = /* @__PURE__ */ new Set();
    const listEl = el("dmList");
    const countEl = el("dmCount");
    const searchEl = el("dmSearch");
    const selectAllEl = el("dmSelectAll");
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const fmtTime = (d) => d ? d.toLocaleDateString() : "";
    const updateCount = () => countEl.textContent = `${selected.size} se\xE7ili / ${dms.length}`;
    function visibleRows() {
      const q = (searchEl.value || "").toLowerCase();
      return dms.filter((d) => !q || d.name.toLowerCase().includes(q));
    }
    function render() {
      listEl.innerHTML = "";
      for (const d of visibleRows()) {
        const row = document.createElement("label");
        row.className = "pc-dm-row";
        const badge = d.type === CHANNEL_TYPE.GROUP_DM ? "Grup" : "DM";
        row.innerHTML = `<input type="checkbox" ${selected.has(d.id) ? "checked" : ""}><div class="pc-dm-avatar" data-avatar></div><div class="pc-dm-meta"><div class="pc-dm-name pc-priv">${escapeHtml(d.name)}</div><div class="pc-dm-time">${fmtTime(d.lastTime)}</div></div><span class="pc-badge">${badge}</span>`;
        if (d.icon && /^https:\/\//.test(d.icon)) {
          const img = document.createElement("img");
          img.className = "pc-dm-avatar";
          img.alt = "";
          img.src = d.icon;
          row.querySelector("[data-avatar]").replaceWith(img);
        }
        const cb = row.querySelector("input");
        cb.addEventListener("change", () => {
          if (cb.checked) selected.add(d.id);
          else selected.delete(d.id);
          updateCount();
        });
        listEl.appendChild(row);
      }
      updateCount();
    }
    async function loadDms() {
      const { api, token } = ctx.buildApi();
      if (!token) return;
      log("info", "DM listesi y\xFCkleniyor...");
      try {
        dms = await listDms(api);
        log("success", `${dms.length} DM/grup bulundu.`);
        render();
      } catch (err) {
        log("error", `DM listesi al\u0131namad\u0131: ${err.message || err}`);
      }
    }
    searchEl.addEventListener("input", render);
    selectAllEl.addEventListener("change", () => {
      const rows = visibleRows();
      if (selectAllEl.checked) rows.forEach((d) => selected.add(d.id));
      else rows.forEach((d) => selected.delete(d.id));
      render();
    });
    panel.querySelectorAll('[data-action="loadDms"]').forEach((b) => b.addEventListener("click", loadDms));
    function buildJobs() {
      const mode = panel.querySelector('input[name="pc-dm-mode"]:checked')?.value || "only";
      const targets = mode === "except" ? dms.filter((d) => !selected.has(d.id)) : dms.filter((d) => selected.has(d.id));
      const authorId = getAuthorId() || void 0;
      if (!authorId) log("warn", "Kendi id'niz al\u0131namad\u0131; yaln\u0131z kendi mesajlar filtresi zay\u0131f olabilir.");
      const baseFilters = ctx.getFilters();
      const closeAfter = el("closeDm")?.checked || false;
      return targets.map((d) => ({
        channelId: d.id,
        guildId: "@me",
        label: d.name,
        _dm: d,
        closeAfter,
        filters: { ...baseFilters, authorId }
      }));
    }
    function showFocus(job) {
      const d = job._dm || {};
      el("focus").hidden = false;
      el("focusAvatar").src = d.icon && /^https:\/\//.test(d.icon) ? d.icon : "";
      el("focusName").textContent = d.name || job.channelId;
      el("focusProg").textContent = "ba\u015Fl\u0131yor...";
      if (el("followDm").checked) {
        const link = document.querySelector(`a[href="/channels/@me/${job.channelId}"]`);
        if (link) link.click();
      }
    }
    ctx.onJobStart = (job) => {
      if (job.guildId === "@me" && job._dm) {
        log("info", `\u25B6 DM: ${job._dm.name || job.channelId}${job._estTotal ? ` (~${job._estTotal} mesaj)` : ""}`);
        showFocus(job);
      }
    };
    ctx.onProgress = (s) => {
      if (!el("focus").hidden && s.currentJob && s.currentJob._dm) {
        const done = s.delCount - (s.jobDelStart || 0);
        const total = s.currentJob._estTotal;
        el("focusProg").textContent = total ? `${done}/${total}` : `silinen: ${done}`;
      }
    };
    ctx.onJobDone = (job, s) => {
      if (job.guildId === "@me" && job._dm) {
        const done = s.delCount - (s.jobDelStart || 0);
        log("success", `\u2713 ${job._dm.name || job.channelId}: ${job._estTotal ? `${done}/${job._estTotal}` : done} silindi.`);
      }
    };
    async function runDm({ dryRun }) {
      const jobs = buildJobs();
      if (!jobs.length) return log("error", "Hedef DM yok (se\xE7im/moda g\xF6re bo\u015F).");
      log("verb", `${jobs.length} DM i\u015Fi kuruldu. Onay bekleniyor...`);
      if (!dryRun && !window.confirm(`${jobs.length} DM'de kendi mesajlar\u0131n silinecek. Devam?`)) {
        log("warn", "\u0130ptal edildi.");
        return;
      }
      log("verb", "Onayland\u0131. Token/motor haz\u0131rlan\u0131yor...");
      const { api, token } = ctx.buildApi();
      if (!token) return;
      log("verb", `Token al\u0131nd\u0131 (${token.length} karakter). Silme ba\u015Fl\u0131yor...`);
      ctx.makeEngine(api);
      ctx.startWatchdog();
      ctx.switchTab("log");
      log("info", `${jobs.length} DM i\u015Flenecek (${dryRun ? "dry-run" : "silme"}).`);
      const engine = ctx.getEngine();
      try {
        const estimatedTotal = !dryRun && jobs.length <= 10 ? await engine.estimateTotal(jobs) : 0;
        if (estimatedTotal > 0) log("verb", `Tahmini toplam: ~${estimatedTotal} mesaj.`);
        await engine.runQueue(jobs, { dryRun, estimatedTotal });
        if (dryRun) log("success", `Dry-run: toplam ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
        else {
          log("success", `Toplu DM bitti. Silinen: ${engine.state.delCount}, ba\u015Far\u0131s\u0131z: ${engine.state.failCount}.`);
          ctx.checkpoint.clear();
        }
      } catch (err) {
        log("error", `Toplu DM hatas\u0131: ${err?.message || err}`);
      } finally {
        el("focus").hidden = true;
      }
    }
    ctx.runDm = runDm;
  }

  // src/ui/ui.js
  function insertCss(css) {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }
  function createEl(html) {
    const t = document.createElement("div");
    t.innerHTML = html.trim();
    return t.firstElementChild;
  }
  function findToolbar() {
    return document.querySelector('#app-mount [class*="toolbar_"]') || document.querySelector('#app-mount [class*="-toolbar"]');
  }
  function initUI() {
    insertCss(styles);
    const panel = createEl(panelHtml);
    document.body.appendChild(panel);
    const btn = createEl(buttonHtml);
    const el = (name) => panel.querySelector(`[data-el="${name}"]`);
    const on = (action, fn) => panel.querySelectorAll(`[data-action="${action}"]`).forEach((b) => b.addEventListener("click", fn));
    const logEl = panel.querySelector("#pc-log");
    function log(type, ...args) {
      const line = document.createElement("div");
      line.className = `pc-log-line pc-log-${type}`;
      line.textContent = args.map((a) => typeof a === "object" ? JSON.stringify(a) : a).join(" ");
      logEl.appendChild(line);
      const scroller = logEl.closest(".pc-body");
      if (scroller && el("autoScroll")?.checked !== false) scroller.scrollTop = scroller.scrollHeight;
      if (type === "error") console.error("[purgecord]", ...args);
    }
    function mountBtn() {
      const tb = findToolbar();
      if (tb && !tb.contains(btn)) tb.prepend(btn);
    }
    mountBtn();
    const appRoot = document.querySelector("#app-mount") || document.body;
    let throttle = null;
    new MutationObserver(() => {
      if (throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        if (!appRoot.contains(btn)) mountBtn();
      }, 2e3);
    }).observe(appRoot, { childList: true, subtree: true });
    function togglePanel(force) {
      const show = force !== void 0 ? force : panel.hidden;
      panel.hidden = !show;
      btn.style.color = show ? "var(--interactive-active,#fff)" : "";
    }
    btn.addEventListener("click", () => togglePanel());
    on("close", () => togglePanel(false));
    makeDraggable(panel, panel.querySelector("[data-drag]"));
    makeResizable(panel, panel.querySelector("[data-resize]"));
    function switchTab(name) {
      panel.querySelectorAll(".pc-tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
      panel.querySelectorAll(".pc-view").forEach((v) => v.hidden = v.dataset.view !== name);
    }
    panel.querySelectorAll(".pc-tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
    el("redact").addEventListener("change", (e) => panel.classList.toggle("pc-redact", e.target.checked));
    on("fillAuthor", () => el("authorId").value = getAuthorId());
    on("fillGuild", () => {
      const { guildId, channelId } = parseIdsFromUrl();
      el("guildId").value = guildId || "";
      if (guildId === "@me" && channelId) el("channelId").value = channelId;
    });
    on("fillChannel", () => {
      const { guildId, channelId } = parseIdsFromUrl();
      el("channelId").value = channelId || "";
      el("guildId").value = guildId || "";
    });
    on("fillToken", () => {
      const t = (() => {
        try {
          return getToken();
        } catch {
          return "";
        }
      })();
      if (looksLikeToken(t)) {
        el("token").value = t;
        log("success", `Token al\u0131nd\u0131 (${t.length} karakter).`);
      } else log("error", `Token otomatik al\u0131namad\u0131. Elle yap\u0131\u015Ft\u0131r \u2192 F12 > Network sekmesi > discord.com/api'ye giden herhangi bir iste\u011Fe t\u0131kla > Request Headers > "authorization" sat\u0131r\u0131ndaki de\u011Feri kopyala.`);
    });
    const bindSlider = (input, valSpan) => {
      const sync = () => valSpan.textContent = input.value;
      input.addEventListener("input", sync);
      sync();
    };
    bindSlider(el("deleteDelay"), el("deleteDelayVal"));
    bindSlider(el("searchDelay"), el("searchDelayVal"));
    const checkpoint = new Checkpoint(localStorage);
    let engine = null;
    let watchdog = null;
    let abort = null;
    function buildApi() {
      abort = new AbortController();
      let token = el("token").value.trim();
      if (!looksLikeToken(token)) {
        const auto = (() => {
          try {
            return getToken();
          } catch {
            return "";
          }
        })();
        if (looksLikeToken(auto)) {
          token = auto;
          el("token").value = auto;
        }
      }
      if (!looksLikeToken(token)) {
        log("error", `Ge\xE7erli token yok. "doldur" i\u015Fe yaramad\u0131ysa token'\u0131 elle yap\u0131\u015Ft\u0131r \u2192 F12 > Network > discord.com/api'ye giden herhangi bir iste\u011Fe t\u0131kla > Request Headers > "authorization" de\u011Ferini kopyala.`);
        return { api: null, token: "" };
      }
      const api = new ApiClient({
        token,
        fetchImpl: (u, o) => fetch(u, o),
        wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        signal: abort.signal,
        onThrottle: ({ ms }) => {
          if (!engine) return;
          engine.state.lastProgressTs = Date.now();
          const next = Math.min(6e3, Math.max(engine.options.deleteDelay + 250, Math.round(ms || 0)));
          if (next > engine.options.deleteDelay) {
            engine.options.deleteDelay = next;
            el("deleteDelay").value = Math.min(1e4, next);
            el("deleteDelayVal").textContent = next;
          }
        },
        log
      });
      return { api, token };
    }
    function getFilters() {
      return {
        authorId: el("authorId").value.trim() || void 0,
        content: el("content").value.trim() || void 0,
        hasLink: el("hasLink").checked || void 0,
        hasFile: el("hasFile").checked || void 0,
        includePinned: el("includePinned").checked || void 0,
        pattern: el("pattern").value.trim() || void 0,
        minId: el("minId").value.trim() || void 0,
        maxId: el("maxId").value.trim() || void 0,
        minDate: el("minDate").value || void 0,
        maxDate: el("maxDate").value || void 0
      };
    }
    function makeEngine(api) {
      const options = {
        deleteDelay: Math.max(500, +el("deleteDelay").value),
        searchDelay: +el("searchDelay").value
      };
      engine = new DeleteEngine({
        api,
        wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        log,
        options,
        onStart: () => setRunningUI(true),
        onStop: () => {
          setRunningUI(false);
          watchdog?.stop();
        },
        onProgress: (s) => renderProgress(s),
        onJobStart: (job) => ctx.onJobStart && ctx.onJobStart(job),
        onJobDone: (job, s) => ctx.onJobDone && ctx.onJobDone(job, s),
        saveCheckpoint: (data) => checkpoint.save({ ...data, ts: Date.now() })
      });
      return engine;
    }
    function startWatchdog() {
      watchdog = new Watchdog({
        getLastProgress: () => engine ? engine.state.lastProgressTs : Date.now(),
        isRunning: () => !!(engine && engine.state.running),
        onStall: () => log("warn", `Uzun s\xFCredir ilerleme yok. Ger\xE7ekten tak\u0131ld\u0131ysa Durdur'a bas\u0131p paneldeki "Devam et" ile kald\u0131\u011F\u0131n yerden s\xFCrebilirsin.`),
        stallMs: 9e4
      });
      watchdog.start();
    }
    function setRunningUI(running) {
      panel.querySelector('[data-action="start"]').disabled = running;
      panel.querySelector('[data-action="dry"]').disabled = running;
      panel.querySelector('[data-action="stop"]').disabled = !running;
      btn.classList.toggle("is-running", running);
      if (!running) el("focus").hidden = true;
    }
    function renderProgress(s) {
      const bar = el("progressBar");
      if (s.grandTotal > 0) {
        const val = s.delCount + s.failCount;
        const pct = Math.min(100, Math.round(val / Math.max(s.grandTotal, val) * 100));
        bar.classList.remove("is-indeterminate");
        bar.style.width = pct + "%";
        el("percent").textContent = `${val}/${s.grandTotal} (${pct}%)`;
      } else {
        bar.classList.add("is-indeterminate");
        el("percent").textContent = `Silinen: ${s.delCount}`;
      }
      if (ctx.onProgress) ctx.onProgress(s);
    }
    async function runChannel({ dryRun }) {
      const guildId = el("guildId").value.trim();
      const channelIds = el("channelId").value.trim().split(/\s*,\s*/).filter(Boolean);
      const filters = getFilters();
      let jobs, confirmMsg;
      if (channelIds.length) {
        jobs = channelIds.map((ch) => ({ channelId: ch, guildId, filters }));
        confirmMsg = `${channelIds.length} kanal/DM'de filtreye uyan mesajlar\u0131n silinecek. Devam?`;
      } else if (guildId && guildId !== "@me") {
        if (!filters.authorId) return log("error", "Sunucu-geneli silmede Author ID gerekli (yaln\u0131z kendi mesajlar\u0131n silinir).");
        jobs = [{ guildId, filters }];
        confirmMsg = `Bu sunucudaki (${guildId}) kendi mesajlar\u0131n silinecek. Devam?`;
      } else {
        return log("error", "Channel ID, veya sunucu-geneli silme i\xE7in Server ID + Author ID gerekli.");
      }
      log("verb", `${jobs.length} i\u015F kuruldu (channelId=${channelIds.length ? "var" : "yok"}, guildId=${guildId || "yok"}). Onay bekleniyor...`);
      if (!dryRun && !window.confirm(confirmMsg)) {
        log("warn", "\u0130ptal edildi (onay verilmedi).");
        return;
      }
      log("verb", "Onayland\u0131. Token/motor haz\u0131rlan\u0131yor...");
      const { api, token } = buildApi();
      if (!token) return;
      log("verb", `Token al\u0131nd\u0131 (${token.length} karakter). Motor kuruldu, silme ba\u015Fl\u0131yor...`);
      makeEngine(api);
      startWatchdog();
      switchTab("log");
      log("info", dryRun ? "Dry-run ba\u015Flad\u0131 (silme yok)." : "Silme ba\u015Flad\u0131.");
      const estimatedTotal = !dryRun && jobs.length <= 10 ? await engine.estimateTotal(jobs) : 0;
      if (estimatedTotal > 0) log("verb", `Tahmini toplam: ~${estimatedTotal} mesaj.`);
      await engine.runQueue(jobs, { dryRun, estimatedTotal });
      if (dryRun) log("success", `Dry-run bitti: ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
      else {
        log("success", `Bitti. Silinen: ${engine.state.delCount}, ba\u015Far\u0131s\u0131z: ${engine.state.failCount}.`);
        checkpoint.clear();
      }
    }
    function dispatch({ dryRun }) {
      const active = panel.querySelector(".pc-tab.is-active")?.dataset.tab;
      switchTab("log");
      const run = active === "dm" ? ctx.runDm : runChannel;
      if (!run) return log("error", "DM sekmesi haz\u0131r de\u011Fil.");
      Promise.resolve().then(() => run({ dryRun })).catch((err) => {
        log("error", `Beklenmeyen hata: ${err?.message || err}`);
        console.error("[purgecord] dispatch error", err);
      });
    }
    on("start", () => dispatch({ dryRun: false }));
    on("dry", () => dispatch({ dryRun: true }));
    on("stop", () => {
      engine?.stop();
      abort?.abort();
      log("warn", "Durduruldu.");
    });
    const saved = checkpoint.load();
    if (saved && saved.job) {
      el("resumeBanner").hidden = false;
      el("resumeText").textContent = `Yar\u0131m kalan i\u015F var (${saved.delCount || 0} silindi). Devam edilsin mi?`;
      on("resume", async () => {
        el("resumeBanner").hidden = true;
        const { api, token } = buildApi();
        if (!token) return;
        makeEngine(api);
        startWatchdog();
        switchTab("log");
        await engine.runQueue([{ ...saved.job, before: saved.before }], { dryRun: false });
        log("success", "Devam eden i\u015F bitti.");
        checkpoint.clear();
      });
      on("discard", () => {
        el("resumeBanner").hidden = true;
        checkpoint.clear();
      });
    }
    const ctx = {
      panel,
      el,
      log,
      buildApi,
      makeEngine,
      getFilters,
      startWatchdog,
      setRunningUI,
      renderProgress,
      switchTab,
      checkpoint,
      getEngine: () => engine,
      setEngine: (e) => {
        engine = e;
      },
      runDm: null,
      // Task 14 doldurur
      onJobStart: null,
      // Task 14 doldurur (focus kartı + DM log)
      onJobDone: null,
      // Task 14 doldurur (DM başı sonuç logu + DM kapatma)
      onProgress: null
      // Task 14 doldurur (focus kartı ilerlemesi)
    };
    initDmTab(ctx);
    log("info", "Purgecord haz\u0131r. Bir sekme se\xE7 ve ba\u015Flat.");
    return ctx;
  }

  // src/main.js
  function boot() {
    if (window.__purgecord_loaded) return;
    window.__purgecord_loaded = true;
    try {
      initUI();
    } catch (err) {
      console.error("[purgecord] ba\u015Flatma hatas\u0131:", err);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
