export const buttonHtml = `
<div id="purgecord-btn" role="button" tabindex="0" aria-label="Purgecord" title="Purgecord — toplu mesaj sil">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
    <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
  </svg>
</div>`;

export const panelHtml = `
<div id="purgecord" class="pc-panel pc-redact" hidden>
  <header class="pc-header" data-drag>
    <span class="pc-logo">🗑️ Purgecord</span>
    <span class="pc-sub">Toplu mesaj & DM silici</span>
    <span class="pc-spacer"></span>
    <label class="pc-check" title="Ekran paylaşımı için gizle"><input type="checkbox" data-el="redact" checked> Streamer</label>
    <button class="pc-icon-btn" data-action="close" title="Kapat">✕</button>
  </header>

  <div class="pc-banner" data-el="resumeBanner" hidden>
    <span data-el="resumeText"></span>
    <span class="pc-spacer"></span>
    <button class="pc-btn pc-small" data-action="resume">Devam et</button>
    <button class="pc-btn pc-small" data-action="discard">Vazgeç</button>
  </div>

  <nav class="pc-tabs">
    <button class="pc-tab is-active" data-tab="channel">Kanal / Sunucu</button>
    <button class="pc-tab" data-tab="dm">Toplu DM</button>
    <button class="pc-tab" data-tab="log">Log</button>
  </nav>

  <div class="pc-body">
    <section class="pc-view" data-view="channel">
      <div class="pc-field"><label>Author ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="authorId" type="text" placeholder="Silinecek mesajların yazarı">
        <button class="pc-btn pc-small" data-action="fillAuthor">ben</button></div></div>
      <div class="pc-field"><label>Server ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="guildId" type="text" placeholder="@me = DM">
        <button class="pc-btn pc-small" data-action="fillGuild">mevcut</button></div></div>
      <div class="pc-field"><label>Channel ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="channelId" type="text" placeholder="Kanal/DM id (virgülle çoklu)">
        <button class="pc-btn pc-small" data-action="fillChannel">mevcut</button></div></div>

      <details class="pc-details"><summary>Filtreler</summary>
        <div class="pc-field" style="margin-top:10px"><label>İçerik</label>
          <input class="pc-input pc-priv" data-el="content" type="text" placeholder="Bu metni içerenler"></div>
        <label class="pc-check"><input type="checkbox" data-el="hasLink"> Link içeren</label>
        <label class="pc-check"><input type="checkbox" data-el="hasFile"> Dosya içeren</label>
        <label class="pc-check"><input type="checkbox" data-el="includePinned"> Sabitlenmişleri de sil</label>
        <div class="pc-field" style="margin-top:10px"><label>Regex</label>
          <input class="pc-input pc-priv" data-el="pattern" type="text" placeholder="düzenli ifade (i)"></div>
      </details>

      <details class="pc-details"><summary>Tarih / mesaj aralığı</summary>
        <div class="pc-field" style="margin-top:10px"><label>Sonrası (After)</label>
          <input class="pc-input" data-el="minDate" type="datetime-local"></div>
        <div class="pc-field"><label>Öncesi (Before)</label>
          <input class="pc-input" data-el="maxDate" type="datetime-local"></div>
        <div class="pc-field"><label>min ID / max ID</label>
          <div class="pc-row"><input class="pc-input pc-priv" data-el="minId" type="text" placeholder="min id">
          <input class="pc-input pc-priv" data-el="maxId" type="text" placeholder="max id"></div></div>
      </details>

      <details class="pc-details"><summary>Gelişmiş</summary>
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
        <button class="pc-btn pc-small" data-action="loadDms">DM'leri yükle</button>
        <input class="pc-input pc-priv" data-el="dmSearch" type="search" placeholder="Ara..." style="max-width:180px">
        <span class="pc-dm-count" data-el="dmCount">0 seçili</span>
      </div>
      <div class="pc-dm-modes">
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="only" checked> Sadece seçilenleri sil</label>
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="except"> Seçilenler hariç hepsini sil</label>
      </div>
      <div class="pc-dm-modes" style="margin:6px 0">
        <label class="pc-check"><input type="checkbox" data-el="dmSelectAll"> Tümünü seç</label>
        <label class="pc-check"><input type="checkbox" data-el="followDm"> DM'i Discord'da takip et</label>
        <label class="pc-check"><input type="checkbox" data-el="closeDm"> Temizlenen DM'i kapat</label>
      </div>
      <div class="pc-hint">DM modunda yalnız <b>kendi</b> mesajların silinir. Kanal sekmesindeki filtreler burada da uygulanır.</div>
      <div class="pc-dm-list" data-el="dmList"></div>
    </section>

    <section class="pc-view" data-view="log" hidden>
      <label class="pc-check" style="margin-bottom:8px"><input type="checkbox" data-el="autoScroll" checked> Logu takip et (son loga kaydır)</label>
      <pre id="pc-log"></pre>
    </section>
  </div>

  <div class="pc-focus" data-el="focus" hidden>
    <img class="pc-dm-avatar pc-priv" data-el="focusAvatar" alt="">
    <div><div class="pc-focus-name pc-priv" data-el="focusName">—</div>
    <div class="pc-focus-prog" data-el="focusProg"></div></div>
  </div>

  <footer class="pc-footer">
    <button class="pc-btn pc-danger" data-action="start">▶ Sil</button>
    <button class="pc-btn" data-action="dry">Sadece say</button>
    <button class="pc-btn" data-action="stop" disabled>⏸ Durdur</button>
    <div class="pc-progress"><div class="pc-progress-bar" data-el="progressBar"></div></div>
    <span class="pc-percent" data-el="percent"></span>
  </footer>

  <div class="pc-resize" data-resize></div>
</div>`;
