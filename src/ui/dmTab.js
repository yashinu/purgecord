import { listDms } from '../core/DmDiscovery.js';
import { getAuthorId } from '../discord/token.js';
import { CHANNEL_TYPE } from '../discord/constants.js';

export function initDmTab(ctx) {
  const { panel, el, log } = ctx;

  let dms = [];               // tüm DM satırları
  const selected = new Set(); // seçili channel id'leri

  const listEl = el('dmList');
  const countEl = el('dmCount');
  const searchEl = el('dmSearch');
  const selectAllEl = el('dmSelectAll');

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = (d) => (d ? d.toLocaleDateString() : '');
  const updateCount = () => (countEl.textContent = `${selected.size} seçili / ${dms.length}`);

  function visibleRows() {
    const q = (searchEl.value || '').toLowerCase();
    return dms.filter((d) => !q || d.name.toLowerCase().includes(q));
  }

  function render() {
    listEl.innerHTML = '';
    for (const d of visibleRows()) {
      const row = document.createElement('label');
      row.className = 'pc-dm-row';
      const badge = d.type === CHANNEL_TYPE.GROUP_DM ? 'Grup' : 'DM';
      const avatar = d.icon ? `<img class="pc-dm-avatar" src="${d.icon}" alt="">` : `<div class="pc-dm-avatar"></div>`;
      row.innerHTML =
        `<input type="checkbox" ${selected.has(d.id) ? 'checked' : ''}>` +
        avatar +
        `<div class="pc-dm-meta"><div class="pc-dm-name pc-priv">${escapeHtml(d.name)}</div>` +
        `<div class="pc-dm-time">${fmtTime(d.lastTime)}</div></div>` +
        `<span class="pc-badge">${badge}</span>`;
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(d.id); else selected.delete(d.id);
        updateCount();
      });
      listEl.appendChild(row);
    }
    updateCount();
  }

  async function loadDms() {
    const { api, token } = ctx.buildApi();
    if (!token) return log('error', 'Token yok, DM listesi alınamıyor.');
    log('info', 'DM listesi yükleniyor...');
    try {
      dms = await listDms(api);
      log('success', `${dms.length} DM/grup bulundu.`);
      render();
    } catch (err) {
      log('error', `DM listesi alınamadı: ${err.message || err}`);
    }
  }

  searchEl.addEventListener('input', render);
  selectAllEl.addEventListener('change', () => {
    const rows = visibleRows();
    if (selectAllEl.checked) rows.forEach((d) => selected.add(d.id));
    else rows.forEach((d) => selected.delete(d.id));
    render();
  });
  panel.querySelectorAll('[data-action="loadDms"]').forEach((b) => b.addEventListener('click', loadDms));

  // Seçim + moda göre job kuyruğu
  function buildJobs() {
    const mode = panel.querySelector('input[name="pc-dm-mode"]:checked')?.value || 'only';
    const targets = mode === 'except'
      ? dms.filter((d) => !selected.has(d.id))
      : dms.filter((d) => selected.has(d.id));
    const authorId = getAuthorId() || undefined;
    if (!authorId) log('warn', 'Kendi id\'niz alınamadı; yalnız kendi mesajlar filtresi zayıf olabilir.');
    const baseFilters = ctx.getFilters();
    return targets.map((d) => ({
      channelId: d.id,
      guildId: '@me',
      label: d.name,
      _dm: d,
      filters: { ...baseFilters, authorId },
    }));
  }

  // Focus kartı + opsiyonel "Discord'da takip et"
  function showFocus(job) {
    const d = job._dm || {};
    el('focus').hidden = false;
    el('focusAvatar').src = d.icon || '';
    el('focusName').textContent = d.name || job.channelId;
    el('focusProg').textContent = 'başlıyor...';
    if (el('followDm').checked) {
      const link = document.querySelector(`a[href="/channels/@me/${job.channelId}"]`);
      if (link) link.click(); // Discord SPA yerinde geçer (reload yok)
    }
  }

  ctx.onJobStart = (job) => { if (job.guildId === '@me' && job._dm) showFocus(job); };
  ctx.onProgress = (s) => {
    if (!el('focus').hidden && s.currentJob && s.currentJob._dm) {
      el('focusProg').textContent = `silinen: ${s.delCount}`;
    }
  };

  async function runDm({ dryRun }) {
    const jobs = buildJobs();
    if (!jobs.length) return log('error', 'Hedef DM yok (seçim/moda göre boş).');

    const { api, token } = ctx.buildApi();
    if (!token) return log('error', 'Token yok.');
    ctx.makeEngine(api);
    ctx.startWatchdog();

    if (!dryRun && !window.confirm(`${jobs.length} DM'de kendi mesajların silinecek. Devam?`)) {
      ctx.setRunningUI(false);
      return;
    }
    ctx.switchTab('log');
    log('info', `${jobs.length} DM işlenecek (${dryRun ? 'dry-run' : 'silme'}).`);

    const engine = ctx.getEngine();
    await engine.runQueue(jobs, { dryRun });

    if (dryRun) log('success', `Dry-run: toplam ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
    else { log('success', `Toplu DM bitti. Silinen: ${engine.state.delCount}, başarısız: ${engine.state.failCount}.`); ctx.checkpoint.clear(); }
    el('focus').hidden = true;
  }

  ctx.runDm = runDm;
}
