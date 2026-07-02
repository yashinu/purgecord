import { API_BASE } from '../discord/constants.js';
import { filterMessages } from './filters.js';
import { oldestId } from './snowflake.js';

const noop = () => {};

export class DeleteEngine {
  constructor({ api, wait, log = noop, options = {}, onProgress = noop, onStart = noop, onStop = noop, onJobStart = noop, saveCheckpoint = noop }) {
    this.api = api;
    this.wait = wait;
    this.log = log;
    this.onProgress = onProgress;
    this.onStart = onStart;
    this.onStop = onStop;
    this.onJobStart = onJobStart;
    this.saveCheckpoint = saveCheckpoint;
    this.options = { deleteDelay: 1000, searchDelay: 1000, ...options };
    this.resetState();
  }

  resetState() {
    this.state = {
      running: false, delCount: 0, failCount: 0, grandTotal: 0,
      dryRun: false, currentJob: null, before: undefined, lastProgressTs: Date.now(),
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

  /** Job'ları sıralı işleyen kuyruk. */
  async runQueue(jobs, { dryRun = false } = {}) {
    this.resetState();
    this.state.running = true;
    this.state.dryRun = dryRun;
    this.onStart(this.state);

    for (const job of jobs) {
      if (!this.state.running) break;
      this.state.currentJob = job;
      this.state.before = job.before || undefined;
      this.onJobStart(job, this.state);
      try {
        if (job.guildId && job.guildId !== '@me' && !job.channelId) {
          await this.runSearchJob(job, { dryRun });
        } else {
          await this.runCursorJob(job, { dryRun });
        }
      } catch (err) {
        if (err?.name === 'AbortError') { this.log('warn', 'İptal edildi.'); break; }
        this.log('error', `Job hatası: ${err?.message || err}`);
      }
    }

    this.state.running = false;
    this.onStop(this.state);
    return { delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal };
  }

  /** Cursor sayfalama — DM/tek kanal için indeksten bağımsız ve deterministik. */
  async runCursorJob(job, { dryRun = false } = {}) {
    let before = job.before || undefined;

    while (this.state.running) {
      const url = `${API_BASE}/channels/${job.channelId}/messages?limit=100` + (before ? `&before=${before}` : '');

      let resp;
      try {
        resp = await this.api.request(url);
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        this.log('error', `Sayfa çekilemedi: ${err?.message || err}`);
        return;
      }

      if (resp.status === 401 || resp.status === 403) {
        this.log('error', `Yetki hatası (${resp.status}). Token geçersiz olabilir.`);
        this.stop();
        return;
      }
      if (!resp.ok) {
        this.log('error', `Beklenmeyen durum ${resp.status}; bu job atlanıyor.`);
        return;
      }

      const page = await resp.json();
      if (!Array.isArray(page) || page.length === 0) break; // kanalın başı → gerçekten bitti

      const { toDelete } = filterMessages(page, job.filters || {});
      this.state.grandTotal += toDelete.length;

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
        job, before,
        delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal,
      });

      if (page.length < 100) break; // son (kısmi) sayfa işlendi → bitti
      await this.wait(this.options.searchDelay);
    }
  }

  /** Search stratejisi — sunucu-geneli (guildId, tek kanal yok). Boş sayfa doğrulamalı. */
  async runSearchJob(job, { dryRun = false } = {}) {
    let offset = 0;
    let emptyStreak = 0;
    while (this.state.running) {
      const params = new URLSearchParams();
      if (job.filters?.authorId) params.set('author_id', job.filters.authorId);
      params.set('sort_by', 'timestamp');
      params.set('sort_order', 'desc');
      params.set('offset', String(offset));
      const url = `${API_BASE}/guilds/${job.guildId}/messages/search?${params.toString()}`;

      let resp;
      try { resp = await this.api.request(url); }
      catch (err) { if (err?.name === 'AbortError') throw err; this.log('error', `Arama hatası: ${err?.message || err}`); return; }

      if (resp.status === 401 || resp.status === 403) { this.log('error', `Yetki hatası (${resp.status}).`); this.stop(); return; }
      if (!resp.ok) { this.log('error', `Arama durumu ${resp.status}; job atlanıyor.`); return; }

      const data = await resp.json();
      const total = data.total_results || 0;
      if (total > this.state.grandTotal) this.state.grandTotal = total;

      const discovered = (data.messages || []).map((convo) => convo.find((m) => m.hit === true)).filter(Boolean);
      const { toDelete, skipped } = filterMessages(discovered, job.filters || {});

      if (discovered.length === 0) {
        // Boş sayfa: total>0 ise geçici olabilir → birkaç kez doğrula, sonra bitir.
        if (total > 0 && emptyStreak < 3) { emptyStreak++; this.log('verb', `Boş sayfa (${emptyStreak}/3) doğrulanıyor...`); await this.wait(this.options.searchDelay); continue; }
        break; // gerçekten bitti
      }
      emptyStreak = 0;

      if (dryRun) {
        this.markProgress();
      } else {
        for (const msg of toDelete) {
          if (!this.state.running) return;
          const r = await this.deleteMessage(msg);
          if (r !== 'OK') offset++; // silinemeyen (FAILED/FAIL_SKIP) mesaj indekste kalir -> ilerlet, livelock'u onle
          this.markProgress();
          await this.wait(this.options.deleteDelay);
        }
      }
      offset += skipped.length; // silinenler listeden düşer; atlananlar offset ilerletir
      this.saveCheckpoint({ job, offset, delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal });
      await this.wait(this.options.searchDelay);
    }
  }

  /** Tek mesajı sil. Retry ApiClient'te merkezî olduğundan burada RETRY döngüsü yok. */
  async deleteMessage(msg) {
    let resp;
    try {
      resp = await this.api.request(`${API_BASE}/channels/${msg.channel_id}/messages/${msg.id}`, { method: 'DELETE' });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      this.state.failCount++;
      return 'FAILED';
    }

    if (resp.ok || resp.status === 404) { // 404 = zaten yok
      this.state.delCount++;
      return 'OK';
    }

    let body = null;
    try { body = await resp.json(); } catch { /* yoksay */ }

    if (resp.status === 400 && body?.code === 50083) { // arşivli thread
      this.state.failCount++;
      return 'FAIL_SKIP';
    }

    this.log('error', `Silme hatası ${resp.status} (id ${msg.id}).`);
    this.state.failCount++;
    return 'FAILED';
  }
}
