// UI markup. {{key}} placeholders are replaced with localized strings at init
// (see ui.js). Attribute-safe: no i18n string contains quotes or HTML.

export const buttonHtml = `
<div id="purgecord-btn" role="button" tabindex="0" aria-label="Purgecord" title="Purgecord — bulk message/DM deleter">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 16h4v2h-4zM15 8h7v2h-7zM15 12h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"></path>
  </svg>
</div>`;

export const panelHtml = `
<div id="purgecord" class="pc-panel pc-redact" hidden>
  <header class="pc-header" data-drag>
    <span class="pc-logo">🧹 Purgecord</span>
    <span class="pc-sub">{{subtitle}}</span>
    <span class="pc-spacer"></span>
    <label class="pc-check"><input type="checkbox" data-el="redact" checked> {{streamer}}</label>
    <button class="pc-icon-btn" data-action="close" title="{{close}}">✕</button>
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
    <div><div class="pc-focus-name pc-priv" data-el="focusName">—</div>
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
