// ==UserScript==
// @name         Purgecord
// @namespace    https://github.com/local/purgecord
// @version      0.3.0
// @description  Bulk delete Discord messages & DMs (based on undiscord, hardened)
// @author       local
// @match        https://*.discord.com/*
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
<div id="purgecord-btn" role="button" tabindex="0" aria-label="Purgecord" title="Purgecord \u2014 bulk message/DM deleter">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 16h4v2h-4zM15 8h7v2h-7zM15 12h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"></path>
  </svg>
</div>`;
  var panelHtml = `
<div id="purgecord" class="pc-panel pc-redact" hidden>
  <header class="pc-header" data-drag>
    <span class="pc-logo">\u{1F9F9} Purgecord</span>
    <span class="pc-sub">{{subtitle}}</span>
    <span class="pc-spacer"></span>
    <label class="pc-check"><input type="checkbox" data-el="redact" checked> {{streamer}}</label>
    <button class="pc-icon-btn" data-action="close" title="{{close}}">\u2715</button>
  </header>

  <div class="pc-banner" data-el="resumeBanner" hidden>
    <span data-el="resumeText"></span>
    <span class="pc-spacer"></span>
    <button class="pc-btn pc-small" data-action="resume">{{resume}}</button>
    <button class="pc-btn pc-small" data-action="discard">{{discard}}</button>
  </div>

  <nav class="pc-tabs">
    <button class="pc-tab is-active" data-tab="channel">{{tab_channel}}</button>
    <button class="pc-tab" data-tab="dm">{{tab_dm}}</button>
    <button class="pc-tab" data-tab="log">{{tab_log}}</button>
  </nav>

  <div class="pc-body">
    <section class="pc-view" data-view="channel">
      <div class="pc-field"><label>{{author_id}}</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="authorId" type="text" placeholder="{{author_ph}}">
        <button class="pc-btn pc-small" data-action="fillAuthor">{{btn_me}}</button></div></div>
      <div class="pc-field"><label>{{server_id}}</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="guildId" type="text" placeholder="{{server_ph}}">
        <button class="pc-btn pc-small" data-action="fillGuild">{{btn_current}}</button></div></div>
      <div class="pc-field"><label>{{channel_id}}</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="channelId" type="text" placeholder="{{channel_ph}}">
        <button class="pc-btn pc-small" data-action="fillChannel">{{btn_current}}</button></div></div>

      <details class="pc-details"><summary>{{filters}}</summary>
        <div class="pc-field" style="margin-top:10px"><label>{{content}}</label>
          <input class="pc-input pc-priv" data-el="content" type="text" placeholder="{{content_ph}}"></div>
        <label class="pc-check"><input type="checkbox" data-el="hasLink"> {{has_link}}</label>
        <label class="pc-check"><input type="checkbox" data-el="hasFile"> {{has_file}}</label>
        <label class="pc-check"><input type="checkbox" data-el="includePinned"> {{include_pinned}}</label>
        <div class="pc-field" style="margin-top:10px"><label>{{regex}}</label>
          <input class="pc-input pc-priv" data-el="pattern" type="text" placeholder="{{regex_ph}}"></div>
      </details>

      <details class="pc-details"><summary>{{date_range}}</summary>
        <div class="pc-field" style="margin-top:10px"><label>{{after}}</label>
          <input class="pc-input" data-el="minDate" type="datetime-local"></div>
        <div class="pc-field"><label>{{before}}</label>
          <input class="pc-input" data-el="maxDate" type="datetime-local"></div>
        <div class="pc-field"><label>{{id_range}}</label>
          <div class="pc-row"><input class="pc-input pc-priv" data-el="minId" type="text" placeholder="{{min_id}}">
          <input class="pc-input pc-priv" data-el="maxId" type="text" placeholder="{{max_id}}"></div></div>
      </details>

      <details class="pc-details"><summary>{{advanced}}</summary>
        <div class="pc-field" style="margin-top:10px"><label>{{delete_delay}} <span data-el="deleteDelayVal">1250</span>ms</label>
          <input data-el="deleteDelay" type="range" min="500" max="10000" step="50" value="1250" style="width:100%"></div>
        <div class="pc-field"><label>{{page_delay}} <span data-el="searchDelayVal">1000</span>ms</label>
          <input data-el="searchDelay" type="range" min="0" max="10000" step="50" value="1000" style="width:100%"></div>
        <div class="pc-field"><label>{{token}}</label>
          <div class="pc-row"><input class="pc-input" data-el="token" type="password" autocomplete="off" placeholder="{{token_ph}}">
          <button class="pc-btn pc-small" data-action="fillToken">{{btn_fill}}</button></div></div>
      </details>
    </section>

    <section class="pc-view" data-view="dm" hidden>
      <div class="pc-dm-toolbar">
        <button class="pc-btn pc-small" data-action="loadDms">{{load_dms}}</button>
        <input class="pc-input pc-priv" data-el="dmSearch" type="search" placeholder="{{search_ph}}" style="max-width:180px">
        <span class="pc-dm-count" data-el="dmCount"></span>
      </div>
      <div class="pc-dm-modes">
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="only" checked> {{mode_only}}</label>
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="except"> {{mode_except}}</label>
      </div>
      <div class="pc-dm-modes" style="margin:6px 0">
        <label class="pc-check"><input type="checkbox" data-el="dmSelectAll"> {{select_all}}</label>
        <label class="pc-check"><input type="checkbox" data-el="followDm"> {{follow_dm}}</label>
        <label class="pc-check"><input type="checkbox" data-el="closeDm"> {{close_dm}}</label>
      </div>
      <div class="pc-hint">{{dm_hint}}</div>
      <div class="pc-dm-list" data-el="dmList"></div>
    </section>

    <section class="pc-view" data-view="log" hidden>
      <label class="pc-check"><input type="checkbox" data-el="autoScroll" checked> {{follow_log}}</label>
      <label class="pc-check"><input type="checkbox" data-el="logMsgInfo"> {{log_msg_info}}</label>
      <div class="pc-hint" style="margin-bottom:8px">{{first_run_hint}}</div>
      <pre id="pc-log"></pre>
    </section>
  </div>

  <div class="pc-focus" data-el="focus" hidden>
    <img class="pc-dm-avatar pc-priv" data-el="focusAvatar" alt="">
    <div><div class="pc-focus-name pc-priv" data-el="focusName">\u2014</div>
    <div class="pc-focus-prog" data-el="focusProg"></div></div>
  </div>

  <footer class="pc-footer">
    <button class="pc-btn pc-danger" data-action="start">{{btn_delete}}</button>
    <button class="pc-btn" data-action="dry">{{btn_count}}</button>
    <button class="pc-btn" data-action="stop" disabled>{{btn_stop}}</button>
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
      const t2 = clamp(st + (e.clientY - sy), 0, window.innerHeight - 40);
      const l = clamp(sl + (e.clientX - sx), -panel.offsetWidth + 80, window.innerWidth - 80);
      panel.style.top = t2 + "px";
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

  // src/i18n.js
  var STRINGS = {
    en: {
      // --- header / tabs ---
      subtitle: "Bulk message & DM deleter",
      streamer: "Streamer",
      close: "Close",
      tab_channel: "Channel / Server",
      tab_dm: "Bulk DM",
      tab_log: "Log",
      // --- channel view ---
      author_id: "Author ID",
      author_ph: "Author of the messages to delete",
      btn_me: "me",
      server_id: "Server ID",
      server_ph: "@me = DM",
      btn_current: "current",
      channel_id: "Channel ID",
      channel_ph: "Channel/DM id (comma-separated)",
      filters: "Filters",
      content: "Content",
      content_ph: "Messages containing this text",
      has_link: "Has link",
      has_file: "Has file",
      include_pinned: "Delete pinned too",
      regex: "Regex",
      regex_ph: "regular expression (i)",
      date_range: "Date / message range",
      after: "After",
      before: "Before",
      id_range: "min ID / max ID",
      min_id: "min id",
      max_id: "max id",
      advanced: "Advanced",
      delete_delay: "Delete delay:",
      page_delay: "Page delay:",
      token: "Token",
      token_ph: "auto-filled",
      btn_fill: "fill",
      // --- DM view ---
      load_dms: "Load DMs",
      search_ph: "Search...",
      dm_count: "{sel} selected / {total}",
      mode_only: "Delete only selected",
      mode_except: "Delete all except selected",
      select_all: "Select all",
      follow_dm: "Follow DM in Discord",
      close_dm: "Close cleaned DM",
      badge_group: "Group",
      badge_dm: "DM",
      dm_hint: "In DM mode only your own messages are deleted. Channel-tab filters apply here too.",
      // --- log view ---
      follow_log: "Follow log (scroll to newest)",
      log_msg_info: "Log deleted message info (incl. content \u2014 hidden in Streamer mode)",
      first_run_hint: "If it doesn't work right after loading, wait 1-2s and try again (Discord/webpack may not be ready yet).",
      // --- resume banner ---
      resume: "Resume",
      discard: "Discard",
      resume_text: "Unfinished job found ({n} deleted). Resume?",
      // --- footer ---
      btn_delete: "\u25B6 Delete",
      btn_count: "Count only",
      btn_stop: "\u23F8 Stop",
      // --- focus card ---
      dash: "\u2014",
      starting: "starting...",
      deleted_n: "deleted: {n}",
      // --- runtime / logs (ui.js) ---
      ready: "Purgecord ready. Pick a tab and start.",
      dmtab_init_failed: "DM tab could not initialize: {err}. Refresh the page and try again.",
      need_author_server: "Author ID is required for server-wide deletion (only your own messages are deleted).",
      need_channel_or_server: "Channel ID, or Server ID + Author ID for server-wide deletion, is required.",
      confirm_channels: "Messages matching the filter in {n} channel(s)/DM(s) will be deleted. Continue?",
      confirm_server: "Your own messages in this server ({guildId}) will be deleted. Continue?",
      jobs_built: "{n} job(s) built (channelId={ch}, guildId={g}). Waiting for confirmation...",
      canceled_no_confirm: "Canceled (not confirmed).",
      confirmed_prep: "Confirmed. Preparing token/engine...",
      token_got_engine: "Token obtained ({n} chars). Engine ready, starting deletion...",
      dryrun_started: "Dry-run started (no deletion).",
      delete_started: "Deletion started.",
      est_total: "Estimated total: ~{n} messages.",
      dryrun_done: "Dry-run done: {n} messages match the filter.",
      done_summary: "Done. Deleted: {del}, failed: {fail}.",
      unexpected_error: "Unexpected error: {err}",
      dm_tab_not_ready: "DM tab is not ready.",
      stopped: "Stopped.",
      no_valid_token: 'No valid token. If "fill" did not work, paste it manually \u2192 F12 > Network > click any request to discord.com/api > Request Headers > copy the "authorization" value.',
      token_got: "Token obtained ({n} chars).",
      token_autofill_failed: 'Could not auto-fill token. Paste manually \u2192 F12 > Network tab > click any request to discord.com/api > Request Headers > copy the value on the "authorization" line.',
      resume_done: "Resumed job finished.",
      stall_hint: 'No progress for a while. If it is truly stuck, press Stop and use "Resume" in the panel to continue where you left off.',
      // --- dmTab ---
      self_id_missing: 'Could not get your own id; the "only my messages" filter may be weak.',
      loading_dms: "Loading DM list...",
      dms_found: "{n} DM(s)/group(s) found.",
      dms_failed: "Could not load DM list: {err}",
      no_target_dm: "No target DM (empty by selection/mode).",
      dm_jobs_built: "{n} DM job(s) built. Waiting for confirmation...",
      confirm_dms: "Your own messages in {n} DM(s) will be deleted. Continue?",
      canceled: "Canceled.",
      dms_processing: "{n} DM(s) to process ({mode}).",
      mode_dryrun: "dry-run",
      mode_delete: "delete",
      dm_start: "\u25B6 DM: {name}{extra}",
      dm_extra_est: " (~{n} messages)",
      dm_done: "\u2713 {name}: {count} deleted.",
      dryrun_total: "Dry-run: {n} messages total match the filter.",
      dm_all_done: "Bulk DM done. Deleted: {del}, failed: {fail}.",
      dm_error: "Bulk DM error: {err}",
      // --- engine ---
      canceled_short: "Canceled.",
      job_error: "Job error: {err}",
      auth_error: "Auth error ({status}). Token may be invalid.",
      unexpected_status: "Unexpected status {status}; skipping this job.",
      page_fetch_failed: "Could not fetch page: {err}",
      delete_error: "Delete error {status} (id {id}).",
      dm_still_has_msgs: "{label}: still has messages matching the filter, DM not closed.",
      dm_closed: "{label}: clean \u2014 DM closed.",
      dm_close_failed: "{label}: could not close DM (status {status}).",
      search_error: "Search error: {err}",
      search_status: "Search status {status}; skipping job.",
      empty_verify: "Empty page ({n}/3) verifying...",
      // --- ApiClient ---
      net_error_retry: "Network error; retrying in {ms}ms (attempt {n}).",
      throttle_wait: "{kind}; waiting {ms}ms...",
      server_error_retry: "Server error {status}; retrying in {ms}ms...",
      indexing: "Indexing",
      rate_limit: "Rate limit"
    },
    tr: {
      subtitle: "Toplu mesaj & DM silici",
      streamer: "Streamer",
      close: "Kapat",
      tab_channel: "Kanal / Sunucu",
      tab_dm: "Toplu DM",
      tab_log: "Log",
      author_id: "Author ID",
      author_ph: "Silinecek mesajlar\u0131n yazar\u0131",
      btn_me: "ben",
      server_id: "Server ID",
      server_ph: "@me = DM",
      btn_current: "mevcut",
      channel_id: "Channel ID",
      channel_ph: "Kanal/DM id (virg\xFClle \xE7oklu)",
      filters: "Filtreler",
      content: "\u0130\xE7erik",
      content_ph: "Bu metni i\xE7erenler",
      has_link: "Link i\xE7eren",
      has_file: "Dosya i\xE7eren",
      include_pinned: "Sabitlenmi\u015Fleri de sil",
      regex: "Regex",
      regex_ph: "d\xFCzenli ifade (i)",
      date_range: "Tarih / mesaj aral\u0131\u011F\u0131",
      after: "Sonras\u0131 (After)",
      before: "\xD6ncesi (Before)",
      id_range: "min ID / max ID",
      min_id: "min id",
      max_id: "max id",
      advanced: "Geli\u015Fmi\u015F",
      delete_delay: "Silme gecikmesi:",
      page_delay: "Sayfa gecikmesi:",
      token: "Token",
      token_ph: "otomatik doldurulur",
      btn_fill: "doldur",
      load_dms: "DM'leri y\xFCkle",
      search_ph: "Ara...",
      dm_count: "{sel} se\xE7ili / {total}",
      mode_only: "Sadece se\xE7ilenleri sil",
      mode_except: "Se\xE7ilenler hari\xE7 hepsini sil",
      select_all: "T\xFCm\xFCn\xFC se\xE7",
      follow_dm: "DM'i Discord'da takip et",
      close_dm: "Temizlenen DM'i kapat",
      badge_group: "Grup",
      badge_dm: "DM",
      dm_hint: "DM modunda yaln\u0131z kendi mesajlar\u0131n silinir. Kanal sekmesindeki filtreler burada da uygulan\u0131r.",
      follow_log: "Logu takip et (son loga kayd\u0131r)",
      log_msg_info: "Silinen mesaj bilgilerini logla (i\xE7erik dahil \u2014 Streamer modda gizli)",
      first_run_hint: "\u0130lk y\xFCklemeden hemen sonra \xE7al\u0131\u015Fmazsa 1-2 sn bekleyip tekrar dene (Discord/webpack hen\xFCz haz\u0131r olmayabilir).",
      resume: "Devam et",
      discard: "Vazge\xE7",
      resume_text: "Yar\u0131m kalan i\u015F var ({n} silindi). Devam edilsin mi?",
      btn_delete: "\u25B6 Sil",
      btn_count: "Sadece say",
      btn_stop: "\u23F8 Durdur",
      dash: "\u2014",
      starting: "ba\u015Fl\u0131yor...",
      deleted_n: "silinen: {n}",
      ready: "Purgecord haz\u0131r. Bir sekme se\xE7 ve ba\u015Flat.",
      dmtab_init_failed: "DM sekmesi kurulamad\u0131: {err}. Sayfay\u0131 yenileyip tekrar dene.",
      need_author_server: "Sunucu-geneli silmede Author ID gerekli (yaln\u0131z kendi mesajlar\u0131n silinir).",
      need_channel_or_server: "Channel ID, veya sunucu-geneli silme i\xE7in Server ID + Author ID gerekli.",
      confirm_channels: "{n} kanal/DM'de filtreye uyan mesajlar\u0131n silinecek. Devam?",
      confirm_server: "Bu sunucudaki ({guildId}) kendi mesajlar\u0131n silinecek. Devam?",
      jobs_built: "{n} i\u015F kuruldu (channelId={ch}, guildId={g}). Onay bekleniyor...",
      canceled_no_confirm: "\u0130ptal edildi (onay verilmedi).",
      confirmed_prep: "Onayland\u0131. Token/motor haz\u0131rlan\u0131yor...",
      token_got_engine: "Token al\u0131nd\u0131 ({n} karakter). Motor kuruldu, silme ba\u015Fl\u0131yor...",
      dryrun_started: "Dry-run ba\u015Flad\u0131 (silme yok).",
      delete_started: "Silme ba\u015Flad\u0131.",
      est_total: "Tahmini toplam: ~{n} mesaj.",
      dryrun_done: "Dry-run bitti: {n} mesaj filtreye uyuyor.",
      done_summary: "Bitti. Silinen: {del}, ba\u015Far\u0131s\u0131z: {fail}.",
      unexpected_error: "Beklenmeyen hata: {err}",
      dm_tab_not_ready: "DM sekmesi haz\u0131r de\u011Fil.",
      stopped: "Durduruldu.",
      no_valid_token: `Ge\xE7erli token yok. "doldur" i\u015Fe yaramad\u0131ysa token'\u0131 elle yap\u0131\u015Ft\u0131r \u2192 F12 > Network > discord.com/api'ye giden herhangi bir iste\u011Fe t\u0131kla > Request Headers > "authorization" de\u011Ferini kopyala.`,
      token_got: "Token al\u0131nd\u0131 ({n} karakter).",
      token_autofill_failed: `Token otomatik al\u0131namad\u0131. Elle yap\u0131\u015Ft\u0131r \u2192 F12 > Network sekmesi > discord.com/api'ye giden herhangi bir iste\u011Fe t\u0131kla > Request Headers > "authorization" sat\u0131r\u0131ndaki de\u011Feri kopyala.`,
      resume_done: "Devam eden i\u015F bitti.",
      stall_hint: `Uzun s\xFCredir ilerleme yok. Ger\xE7ekten tak\u0131ld\u0131ysa Durdur'a bas\u0131p paneldeki "Devam et" ile kald\u0131\u011F\u0131n yerden s\xFCrebilirsin.`,
      self_id_missing: "Kendi id'niz al\u0131namad\u0131; yaln\u0131z kendi mesajlar filtresi zay\u0131f olabilir.",
      loading_dms: "DM listesi y\xFCkleniyor...",
      dms_found: "{n} DM/grup bulundu.",
      dms_failed: "DM listesi al\u0131namad\u0131: {err}",
      no_target_dm: "Hedef DM yok (se\xE7im/moda g\xF6re bo\u015F).",
      dm_jobs_built: "{n} DM i\u015Fi kuruldu. Onay bekleniyor...",
      confirm_dms: "{n} DM'de kendi mesajlar\u0131n silinecek. Devam?",
      canceled: "\u0130ptal edildi.",
      dms_processing: "{n} DM i\u015Flenecek ({mode}).",
      mode_dryrun: "dry-run",
      mode_delete: "silme",
      dm_start: "\u25B6 DM: {name}{extra}",
      dm_extra_est: " (~{n} mesaj)",
      dm_done: "\u2713 {name}: {count} silindi.",
      dryrun_total: "Dry-run: toplam {n} mesaj filtreye uyuyor.",
      dm_all_done: "Toplu DM bitti. Silinen: {del}, ba\u015Far\u0131s\u0131z: {fail}.",
      dm_error: "Toplu DM hatas\u0131: {err}",
      canceled_short: "\u0130ptal edildi.",
      job_error: "Job hatas\u0131: {err}",
      auth_error: "Yetki hatas\u0131 ({status}). Token ge\xE7ersiz olabilir.",
      unexpected_status: "Beklenmeyen durum {status}; bu job atlan\u0131yor.",
      page_fetch_failed: "Sayfa \xE7ekilemedi: {err}",
      delete_error: "Silme hatas\u0131 {status} (id {id}).",
      dm_still_has_msgs: "{label}: h\xE2l\xE2 filtreye uyan mesaj var, DM kapat\u0131lmad\u0131.",
      dm_closed: "{label}: temiz \u2014 DM kapat\u0131ld\u0131.",
      dm_close_failed: "{label}: DM kapat\u0131lamad\u0131 (durum {status}).",
      search_error: "Arama hatas\u0131: {err}",
      search_status: "Arama durumu {status}; job atlan\u0131yor.",
      empty_verify: "Bo\u015F sayfa ({n}/3) do\u011Frulan\u0131yor...",
      net_error_retry: "A\u011F hatas\u0131; {ms}ms sonra tekrar (deneme {n}).",
      throttle_wait: "{kind}; {ms}ms bekleniyor...",
      server_error_retry: "Sunucu hatas\u0131 {status}; {ms}ms sonra tekrar...",
      indexing: "\u0130ndeksleniyor",
      rate_limit: "Rate limit"
    }
  };
  var LOCALE = "en";
  function setLocale(loc) {
    LOCALE = STRINGS[loc] ? loc : "en";
    return LOCALE;
  }
  function detectLocale() {
    let loc = "";
    try {
      loc = document.documentElement.lang || "";
    } catch {
    }
    if (!loc) {
      try {
        const iframe = document.body.appendChild(document.createElement("iframe"));
        const raw = iframe.contentWindow.localStorage.locale;
        iframe.remove();
        loc = raw ? JSON.parse(raw) : "";
      } catch {
      }
    }
    if (!loc) {
      try {
        loc = navigator.language || "";
      } catch {
      }
    }
    return String(loc).toLowerCase().startsWith("tr") ? "tr" : "en";
  }
  function t(key, params) {
    let s = STRINGS[LOCALE] && STRINGS[LOCALE][key] || STRINGS.en[key] || key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] !== void 0 ? params[k] : `{${k}}`);
    return s;
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
          this.log("warn", t("net_error_retry", { ms, n: attempt + 1 }));
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
          this.log("verb", t("throttle_wait", { kind: resp.status === 202 ? t("indexing") : t("rate_limit"), ms }));
          await this.wait(ms);
          continue;
        }
        if (resp.status >= 500) {
          if (attempt >= maxRetries) return resp;
          const ms = computeBackoff({ status: resp.status, attempt }, this.backoffOpts);
          this.log("warn", t("server_error_retry", { status: resp.status, ms }));
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
    constructor({ api, wait, log = noop, options = {}, onProgress = noop, onStart = noop, onStop = noop, onJobStart = noop, onJobDone = noop, onDelete = noop, saveCheckpoint = noop }) {
      this.api = api;
      this.wait = wait;
      this.log = log;
      this.onProgress = onProgress;
      this.onStart = onStart;
      this.onStop = onStop;
      this.onJobStart = onJobStart;
      this.onJobDone = onJobDone;
      this.onDelete = onDelete;
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
     * One-time read-only search to estimate the total message count (for the progress
     * denominator). Does NOT delete. Returns 0 if search isn't indexed / errors (falls
     * back to count-based progress).
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
    /** Sequential job queue. */
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
            this.log("warn", t("canceled_short"));
            break;
          }
          this.log("error", t("job_error", { err: err?.message || err }));
        }
      }
      this.state.running = false;
      this.onStop(this.state);
      return { delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal };
    }
    /** Cursor pagination — index-independent and deterministic (DM / single channel). */
    async runCursorJob(job, { dryRun = false } = {}) {
      let before = job.before || void 0;
      while (this.state.running) {
        const url = `${API_BASE}/channels/${job.channelId}/messages?limit=100` + (before ? `&before=${before}` : "");
        let resp;
        try {
          resp = await this.api.request(url);
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          this.log("error", t("page_fetch_failed", { err: err?.message || err }));
          return;
        }
        if (resp.status === 401 || resp.status === 403) {
          this.log("error", t("auth_error", { status: resp.status }));
          this.stop();
          return;
        }
        if (!resp.ok) {
          this.log("error", t("unexpected_status", { status: resp.status }));
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
            const r = await this.deleteMessage(msg);
            this.onDelete(msg, r);
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
    /** Final check: if no filter-matching messages remain in the newest page, close the DM (DELETE /channels/{id}). */
    async closeDmIfClean(job) {
      const label = job.label || job.channelId;
      try {
        const resp = await this.api.request(`${API_BASE}/channels/${job.channelId}/messages?limit=100`, { noRetry: true });
        if (!resp.ok) return false;
        const page = await resp.json();
        if (!Array.isArray(page)) return false;
        const { toDelete } = filterMessages(page, job.filters || {});
        if (toDelete.length > 0) {
          this.log("warn", t("dm_still_has_msgs", { label }));
          return false;
        }
        const del = await this.api.request(`${API_BASE}/channels/${job.channelId}`, { method: "DELETE" });
        if (del.ok || del.status === 404) {
          this.log("success", t("dm_closed", { label }));
          return true;
        }
        this.log("warn", t("dm_close_failed", { label, status: del.status }));
        return false;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        return false;
      }
    }
    /** Search strategy — server-wide (guildId, no single channel). Verifies empty pages. */
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
          this.log("error", t("search_error", { err: err?.message || err }));
          return;
        }
        if (resp.status === 401 || resp.status === 403) {
          this.log("error", t("auth_error", { status: resp.status }));
          this.stop();
          return;
        }
        if (!resp.ok) {
          this.log("error", t("search_status", { status: resp.status }));
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
            this.log("verb", t("empty_verify", { n: emptyStreak }));
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
            this.onDelete(msg, r);
            this.markProgress();
            await this.wait(this.options.deleteDelay);
          }
        }
        offset += skipped.length;
        this.saveCheckpoint({ job, offset, delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal });
        await this.wait(this.options.searchDelay);
      }
    }
    /** Delete a single message. Retry is centralized in ApiClient, so there's no RETRY loop here. */
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
      this.log("error", t("delete_error", { status: resp.status, id: msg.id }));
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
  function looksLikeToken(t2) {
    return typeof t2 === "string" && t2.trim().length >= 30;
  }
  function getToken() {
    try {
      let found = "";
      window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {
        for (const m of Object.values(req.c || {})) {
          try {
            const t2 = m?.exports?.default?.getToken?.();
            if (looksLikeToken(t2)) {
              found = t2;
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
        const t2 = JSON.parse(raw);
        if (looksLikeToken(t2)) return t2;
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
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const channels = await resp.json();
    return channels.filter((c) => c.type === CHANNEL_TYPE.DM || c.type === CHANNEL_TYPE.GROUP_DM).map(mapDmChannel).sort((a, b) => cmpSnowDesc(a.lastMessageId, b.lastMessageId));
  }

  // src/ui/dmTab.js
  var DEFAULT_AVATAR = "https://discord.com/assets/2ccd8ae8b2379360.png?size=64";
  var avatarSrc = (d) => d && d.icon && /^https:\/\//.test(d.icon) ? d.icon : DEFAULT_AVATAR;
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
    const updateCount = () => countEl.textContent = t("dm_count", { sel: selected.size, total: dms.length });
    function visibleRows() {
      const q = (searchEl.value || "").toLowerCase();
      return dms.filter((d) => !q || d.name.toLowerCase().includes(q));
    }
    function render() {
      listEl.innerHTML = "";
      for (const d of visibleRows()) {
        const row = document.createElement("label");
        row.className = "pc-dm-row";
        const badge = d.type === CHANNEL_TYPE.GROUP_DM ? t("badge_group") : t("badge_dm");
        row.innerHTML = `<input type="checkbox" ${selected.has(d.id) ? "checked" : ""}><div class="pc-dm-avatar" data-avatar></div><div class="pc-dm-meta"><div class="pc-dm-name pc-priv">${escapeHtml(d.name)}</div><div class="pc-dm-time">${escapeHtml(fmtTime(d.lastTime))}</div></div><span class="pc-badge">${escapeHtml(badge)}</span>`;
        const img = document.createElement("img");
        img.className = "pc-dm-avatar";
        img.alt = "";
        img.src = avatarSrc(d);
        row.querySelector("[data-avatar]").replaceWith(img);
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
      log("info", t("loading_dms"));
      try {
        dms = await listDms(api);
        log("success", t("dms_found", { n: dms.length }));
        render();
      } catch (err) {
        log("error", t("dms_failed", { err: err.message || err }));
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
      if (!authorId) log("warn", t("self_id_missing"));
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
      el("focusAvatar").src = avatarSrc(d);
      el("focusName").textContent = d.name || job.channelId;
      el("focusProg").textContent = t("starting");
      if (el("followDm").checked) {
        const link = document.querySelector(`a[href="/channels/@me/${job.channelId}"]`);
        if (link) link.click();
      }
    }
    ctx.onJobStart = (job) => {
      if (job.guildId === "@me" && job._dm) {
        const extra = job._estTotal ? t("dm_extra_est", { n: job._estTotal }) : "";
        log("info", t("dm_start", { name: job._dm.name || job.channelId, extra }));
        showFocus(job);
      }
    };
    ctx.onProgress = (s) => {
      if (!el("focus").hidden && s.currentJob && s.currentJob._dm) {
        const done = s.delCount - (s.jobDelStart || 0);
        const total = s.currentJob._estTotal;
        el("focusProg").textContent = total ? `${done}/${total}` : t("deleted_n", { n: done });
      }
    };
    ctx.onJobDone = (job, s) => {
      if (job.guildId === "@me" && job._dm) {
        const done = s.delCount - (s.jobDelStart || 0);
        const count = job._estTotal ? `${done}/${job._estTotal}` : done;
        log("success", t("dm_done", { name: job._dm.name || job.channelId, count }));
      }
    };
    async function runDm({ dryRun }) {
      const jobs = buildJobs();
      if (!jobs.length) return log("error", t("no_target_dm"));
      log("verb", t("dm_jobs_built", { n: jobs.length }));
      if (!dryRun && !window.confirm(t("confirm_dms", { n: jobs.length }))) {
        log("warn", t("canceled"));
        return;
      }
      log("verb", t("confirmed_prep"));
      const { api, token } = ctx.buildApi();
      if (!token) return;
      log("verb", t("token_got_engine", { n: token.length }));
      ctx.makeEngine(api);
      ctx.startWatchdog();
      ctx.switchTab("log");
      log("info", t("dms_processing", { n: jobs.length, mode: dryRun ? t("mode_dryrun") : t("mode_delete") }));
      const engine = ctx.getEngine();
      try {
        const estimatedTotal = !dryRun && jobs.length <= 10 ? await engine.estimateTotal(jobs) : 0;
        if (estimatedTotal > 0) log("verb", t("est_total", { n: estimatedTotal }));
        await engine.runQueue(jobs, { dryRun, estimatedTotal });
        if (dryRun) log("success", t("dryrun_total", { n: engine.state.grandTotal }));
        else {
          log("success", t("dm_all_done", { del: engine.state.delCount, fail: engine.state.failCount }));
          ctx.checkpoint.clear();
        }
      } catch (err) {
        log("error", t("dm_error", { err: err?.message || err }));
      } finally {
        el("focus").hidden = true;
      }
    }
    ctx.runDm = runDm;
    updateCount();
  }

  // src/ui/ui.js
  function insertCss(css) {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }
  function createEl(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html.trim();
    return tmp.firstElementChild;
  }
  function findMountPoint() {
    const help = document.querySelector('#app-mount a[href*="support.discord.com"], #app-mount a[href*="//discord.com/help"]');
    if (help && help.parentElement) return { host: help.parentElement, before: help };
    const bars = [...document.querySelectorAll('#app-mount [class*="toolbar_"]')].filter((b) => b.offsetParent !== null);
    if (bars.length) {
      bars.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return { host: bars[0], before: null };
    }
    return null;
  }
  function initUI() {
    setLocale(detectLocale());
    insertCss(styles);
    const localized = panelHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => t(k));
    const panel = createEl(localized);
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
    function logMsgInfo(msg, r) {
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : "";
      const disc = msg.author?.discriminator && msg.author.discriminator !== "0" ? "#" + msg.author.discriminator : "";
      const author = (msg.author?.username || "?") + disc;
      const content = String(msg.content || "").replace(/\n/g, "\u21B5");
      const status = r && r !== "OK" ? ` (${r})` : "";
      const mk = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        e.textContent = text;
        return e;
      };
      const line = document.createElement("div");
      line.className = "pc-log-line pc-log-debug";
      line.append(mk("sup", "", time), " ", mk("b", "pc-priv", author), ": ", mk("i", "pc-priv", content));
      if (msg.attachments && msg.attachments.length) line.append(" ", mk("span", "pc-priv", `[${msg.attachments.length} file(s)]`));
      line.append(" ", mk("sup", "pc-priv", `{ID:${msg.id}}`));
      if (status) line.append(status);
      logEl.appendChild(line);
      const scroller = logEl.closest(".pc-body");
      if (scroller && el("autoScroll")?.checked !== false) scroller.scrollTop = scroller.scrollHeight;
    }
    function mountBtn() {
      const mp = findMountPoint();
      if (mp && !mp.host.contains(btn)) {
        if (mp.before) mp.host.prepend(btn);
        else mp.host.append(btn);
      }
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
      panel.querySelectorAll(".pc-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
      panel.querySelectorAll(".pc-view").forEach((v) => v.hidden = v.dataset.view !== name);
    }
    panel.querySelectorAll(".pc-tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
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
      const tok = (() => {
        try {
          return getToken();
        } catch {
          return "";
        }
      })();
      if (looksLikeToken(tok)) {
        el("token").value = tok;
        log("success", t("token_got", { n: tok.length }));
      } else log("error", t("token_autofill_failed"));
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
        log("error", t("no_valid_token"));
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
        onDelete: (msg, r) => {
          if (el("logMsgInfo")?.checked) logMsgInfo(msg, r);
        },
        saveCheckpoint: (data) => checkpoint.save({ ...data, ts: Date.now() })
      });
      return engine;
    }
    function startWatchdog() {
      watchdog = new Watchdog({
        getLastProgress: () => engine ? engine.state.lastProgressTs : Date.now(),
        isRunning: () => !!(engine && engine.state.running),
        onStall: () => log("warn", t("stall_hint")),
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
        el("percent").textContent = t("deleted_n", { n: s.delCount });
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
        confirmMsg = t("confirm_channels", { n: channelIds.length });
      } else if (guildId && guildId !== "@me") {
        if (!filters.authorId) return log("error", t("need_author_server"));
        jobs = [{ guildId, filters }];
        confirmMsg = t("confirm_server", { guildId });
      } else {
        return log("error", t("need_channel_or_server"));
      }
      log("verb", t("jobs_built", { n: jobs.length, ch: channelIds.length, g: guildId || "@me" }));
      if (!dryRun && !window.confirm(confirmMsg)) {
        log("warn", t("canceled_no_confirm"));
        return;
      }
      log("verb", t("confirmed_prep"));
      const { api, token } = buildApi();
      if (!token) return;
      log("verb", t("token_got_engine", { n: token.length }));
      makeEngine(api);
      startWatchdog();
      switchTab("log");
      log("info", dryRun ? t("dryrun_started") : t("delete_started"));
      const estimatedTotal = !dryRun && jobs.length <= 10 ? await engine.estimateTotal(jobs) : 0;
      if (estimatedTotal > 0) log("verb", t("est_total", { n: estimatedTotal }));
      await engine.runQueue(jobs, { dryRun, estimatedTotal });
      if (dryRun) log("success", t("dryrun_done", { n: engine.state.grandTotal }));
      else {
        log("success", t("done_summary", { del: engine.state.delCount, fail: engine.state.failCount }));
        checkpoint.clear();
      }
    }
    function dispatch({ dryRun }) {
      const active = panel.querySelector(".pc-tab.is-active")?.dataset.tab;
      switchTab("log");
      const run = active === "dm" ? ctx.runDm : runChannel;
      if (!run) return log("error", t("dm_tab_not_ready"));
      Promise.resolve().then(() => run({ dryRun })).catch((err) => {
        log("error", t("unexpected_error", { err: err?.message || err }));
        console.error("[purgecord] dispatch error", err);
      });
    }
    on("start", () => dispatch({ dryRun: false }));
    on("dry", () => dispatch({ dryRun: true }));
    on("stop", () => {
      engine?.stop();
      abort?.abort();
      log("warn", t("stopped"));
    });
    const saved = checkpoint.load();
    if (saved && saved.job) {
      el("resumeBanner").hidden = false;
      el("resumeText").textContent = t("resume_text", { n: saved.delCount || 0 });
      on("resume", async () => {
        el("resumeBanner").hidden = true;
        const { api, token } = buildApi();
        if (!token) return;
        makeEngine(api);
        startWatchdog();
        switchTab("log");
        await engine.runQueue([{ ...saved.job, before: saved.before }], { dryRun: false });
        log("success", t("resume_done"));
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
      // filled by initDmTab
      onJobStart: null,
      // filled by initDmTab (focus card + DM log)
      onJobDone: null,
      // filled by initDmTab (per-DM result log + DM close)
      onProgress: null
      // filled by initDmTab (focus card progress)
    };
    try {
      initDmTab(ctx);
    } catch (err) {
      console.error("[purgecord] initDmTab error:", err);
      log("error", t("dmtab_init_failed", { err: err?.message || err }));
    }
    log("info", t("ready"));
    return ctx;
  }

  // src/main.js
  var VERSION = "0.3.0";
  function boot() {
    if (window.__purgecord_loaded) return;
    window.__purgecord_loaded = true;
    console.log(`%c[Purgecord] v${VERSION} loaded. webpack ready: ${!!window.webpackChunkdiscord_app}`, "color:#5865f2;font-weight:bold");
    try {
      initUI();
    } catch (err) {
      console.error("[purgecord] init error:", err);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
