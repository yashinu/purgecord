import { listDms } from '../core/DmDiscovery.js';
import { getAuthorId } from '../discord/token.js';
import { CHANNEL_TYPE } from '../discord/constants.js';
import { t } from '../i18n.js';

// Discord default avatar for users without a profile picture
const DEFAULT_AVATAR = 'https://discord.com/assets/2ccd8ae8b2379360.png?size=64';
const avatarSrc = (d) => (d && d.icon && /^https:\/\//.test(d.icon)) ? d.icon : DEFAULT_AVATAR;

export function initDmTab(ctx) {
  const { panel, el, log } = ctx;

  let dms = [];               // all DM rows
  const selected = new Set(); // selected channel ids

  const listEl = el('dmList');
  const countEl = el('dmCount');
  const searchEl = el('dmSearch');
  const selectAllEl = el('dmSelectAll');

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (d) => (d ? d.toLocaleDateString() : '');
  const updateCount = () => (countEl.textContent = t('dm_count', { sel: selected.size, total: dms.length }));

  function visibleRows() {
    const q = (searchEl.value || '').toLowerCase();
    return dms.filter((d) => !q || d.name.toLowerCase().includes(q));
  }

  function render() {
    listEl.innerHTML = '';
    for (const d of visibleRows()) {
      const row = document.createElement('label');
      row.className = 'pc-dm-row';
      const badge = d.type === CHANNEL_TYPE.GROUP_DM ? t('badge_group') : t('badge_dm');
      // d.name is escaped; the avatar src is set via property below (not via HTML).
      row.innerHTML =
        `<input type="checkbox" ${selected.has(d.id) ? 'checked' : ''}>` +
        `<div class="pc-dm-avatar" data-avatar></div>` +
        `<div class="pc-dm-meta"><div class="pc-dm-name pc-priv">${escapeHtml(d.name)}</div>` +
        `<div class="pc-dm-time">${escapeHtml(fmtTime(d.lastTime))}</div></div>` +
        `<span class="pc-badge">${escapeHtml(badge)}</span>`;
      // Avatar: set src as a property (URL is never HTML-parsed) — XSS-safe.
      const img = document.createElement('img');
      img.className = 'pc-dm-avatar';
      img.alt = '';
      img.src = avatarSrc(d); // default avatar when there's no PFP (avoid a black box)
      row.querySelector('[data-avatar]').replaceWith(img);
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
    if (!token) return; // buildApi already logged a detailed error
    log('info', t('loading_dms'));
    try {
      dms = await listDms(api);
      log('success', t('dms_found', { n: dms.length }));
      render();
    } catch (err) {
      log('error', t('dms_failed', { err: err.message || err }));
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

  // Build the job queue from selection + mode
  function buildJobs() {
    const mode = panel.querySelector('input[name="pc-dm-mode"]:checked')?.value || 'only';
    const targets = mode === 'except'
      ? dms.filter((d) => !selected.has(d.id))
      : dms.filter((d) => selected.has(d.id));
    const authorId = getAuthorId() || undefined;
    if (!authorId) log('warn', t('self_id_missing'));
    const baseFilters = ctx.getFilters();
    const closeAfter = el('closeDm')?.checked || false;
    return targets.map((d) => ({
      channelId: d.id,
      guildId: '@me',
      label: d.name,
      _dm: d,
      closeAfter,
      filters: { ...baseFilters, authorId },
    }));
  }

  // Focus card + optional "follow in Discord"
  function showFocus(job) {
    const d = job._dm || {};
    el('focus').hidden = false;
    el('focusAvatar').src = avatarSrc(d);
    el('focusName').textContent = d.name || job.channelId;
    el('focusProg').textContent = t('starting');
    if (el('followDm').checked) {
      const link = document.querySelector(`a[href="/channels/@me/${job.channelId}"]`);
      if (link) link.click(); // Discord SPA navigates in place (no reload)
    }
  }

  ctx.onJobStart = (job) => {
    if (job.guildId === '@me' && job._dm) {
      const extra = job._estTotal ? t('dm_extra_est', { n: job._estTotal }) : '';
      log('info', t('dm_start', { name: job._dm.name || job.channelId, extra }));
      showFocus(job);
    }
  };
  ctx.onProgress = (s) => {
    if (!el('focus').hidden && s.currentJob && s.currentJob._dm) {
      const done = s.delCount - (s.jobDelStart || 0); // deleted in this DM
      const total = s.currentJob._estTotal;
      el('focusProg').textContent = total ? `${done}/${total}` : t('deleted_n', { n: done });
    }
  };
  ctx.onJobDone = (job, s) => {
    if (job.guildId === '@me' && job._dm) {
      const done = s.delCount - (s.jobDelStart || 0);
      const count = job._estTotal ? `${done}/${job._estTotal}` : done;
      log('success', t('dm_done', { name: job._dm.name || job.channelId, count }));
    }
  };

  async function runDm({ dryRun }) {
    const jobs = buildJobs();
    if (!jobs.length) return log('error', t('no_target_dm'));

    log('verb', t('dm_jobs_built', { n: jobs.length }));
    if (!dryRun && !window.confirm(t('confirm_dms', { n: jobs.length }))) { log('warn', t('canceled')); return; }
    log('verb', t('confirmed_prep'));

    const { api, token } = ctx.buildApi();
    if (!token) return; // buildApi logged the error
    log('verb', t('token_got_engine', { n: token.length }));
    ctx.makeEngine(api);
    ctx.startWatchdog();
    ctx.switchTab('log');
    log('info', t('dms_processing', { n: jobs.length, mode: dryRun ? t('mode_dryrun') : t('mode_delete') }));

    const engine = ctx.getEngine();
    try {
      // One-time read-only total estimate for the progress denominator (few DMs only)
      const estimatedTotal = (!dryRun && jobs.length <= 10) ? await engine.estimateTotal(jobs) : 0;
      if (estimatedTotal > 0) log('verb', t('est_total', { n: estimatedTotal }));
      await engine.runQueue(jobs, { dryRun, estimatedTotal });
      if (dryRun) log('success', t('dryrun_total', { n: engine.state.grandTotal }));
      else { log('success', t('dm_all_done', { del: engine.state.delCount, fail: engine.state.failCount })); ctx.checkpoint.clear(); }
    } catch (err) {
      log('error', t('dm_error', { err: err?.message || err }));
    } finally {
      el('focus').hidden = true;
    }
  }

  ctx.runDm = runDm;
  updateCount(); // initial "0 selected / 0"
}
