import { API_BASE } from '../discord/constants.js';
import { filterMessages } from './filters.js';
import { oldestId } from './snowflake.js';
import { t } from '../i18n.js';

const noop = () => {};

export class DeleteEngine {
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
        if (job.filters?.authorId) params.set('author_id', job.filters.authorId);
        if (job.filters?.content) params.set('content', job.filters.content);
        if (job.filters?.hasLink) params.set('has', 'link');
        if (job.filters?.hasFile) params.set('has', 'file');
        const base = (job.guildId && job.guildId !== '@me')
          ? `${API_BASE}/guilds/${job.guildId}/messages/search`
          : `${API_BASE}/channels/${job.channelId}/messages/search`;
        const resp = await this.api.request(`${base}?${params.toString()}`, { noRetry: true });
        if (resp.ok) {
          const data = await resp.json();
          if (typeof data.total_results === 'number') {
            job._estTotal = data.total_results; // this DM's estimated total (for the "16/340" focus card)
            total += data.total_results;
          }
        }
      } catch (err) {
        if (err?.name === 'AbortError') break;
        /* estimate is best-effort; ignore other errors */
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
      this.state.before = job.before || undefined;
      this.state.jobDelStart = this.state.delCount; // deleted count when this job starts
      this.state.jobFailStart = this.state.failCount;
      this.onJobStart(job, this.state);
      try {
        if (job.guildId && job.guildId !== '@me' && !job.channelId) {
          await this.runSearchJob(job, { dryRun });
        } else {
          await this.runCursorJob(job, { dryRun });
        }
        this.onJobDone(job, this.state); // this job finished (delta = delCount - jobDelStart)
      } catch (err) {
        if (err?.name === 'AbortError') { this.log('warn', t('canceled_short')); break; }
        this.log('error', t('job_error', { err: err?.message || err }));
      }
    }

    this.state.running = false;
    this.onStop(this.state);
    return { delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal };
  }

  /** Cursor pagination — index-independent and deterministic (DM / single channel). */
  async runCursorJob(job, { dryRun = false } = {}) {
    let before = job.before || undefined;

    while (this.state.running) {
      const url = `${API_BASE}/channels/${job.channelId}/messages?limit=100` + (before ? `&before=${before}` : '');

      let resp;
      try {
        resp = await this.api.request(url);
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        this.log('error', t('page_fetch_failed', { err: err?.message || err }));
        return;
      }

      if (resp.status === 401 || resp.status === 403) {
        this.log('error', t('auth_error', { status: resp.status }));
        this.stop();
        return;
      }
      if (!resp.ok) {
        this.log('error', t('unexpected_status', { status: resp.status }));
        return;
      }

      const page = await resp.json();
      if (!Array.isArray(page) || page.length === 0) break; // start of channel → truly done

      const { toDelete } = filterMessages(page, job.filters || {});
      // With an estimate the denominator is fixed; otherwise accumulate as we discover (count-based).
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
        job, before,
        delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal,
      });

      if (page.length < 100) break; // last (partial) page processed → done
      await this.wait(this.options.searchDelay);
    }

    // Close the cleaned DM: only 1:1 DMs, only if the job completed normally with no delete failures.
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
      if (toDelete.length > 0) { this.log('warn', t('dm_still_has_msgs', { label })); return false; }
      const del = await this.api.request(`${API_BASE}/channels/${job.channelId}`, { method: 'DELETE' });
      if (del.ok || del.status === 404) { this.log('success', t('dm_closed', { label })); return true; }
      this.log('warn', t('dm_close_failed', { label, status: del.status }));
      return false;
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      return false;
    }
  }

  /** Search strategy — server-wide (guildId, no single channel). Verifies empty pages. */
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
      catch (err) { if (err?.name === 'AbortError') throw err; this.log('error', t('search_error', { err: err?.message || err })); return; }

      if (resp.status === 401 || resp.status === 403) { this.log('error', t('auth_error', { status: resp.status })); this.stop(); return; }
      if (!resp.ok) { this.log('error', t('search_status', { status: resp.status })); return; }

      const data = await resp.json();
      const total = data.total_results || 0;
      if (total > this.state.grandTotal) this.state.grandTotal = total;

      const discovered = (data.messages || []).map((convo) => convo.find((m) => m.hit === true)).filter(Boolean);
      const { toDelete, skipped } = filterMessages(discovered, job.filters || {});

      if (discovered.length === 0) {
        // Empty page: if total>0 it may be transient → verify a few times, then finish.
        if (total > 0 && emptyStreak < 3) { emptyStreak++; this.log('verb', t('empty_verify', { n: emptyStreak })); await this.wait(this.options.searchDelay); continue; }
        break; // truly done
      }
      emptyStreak = 0;

      if (dryRun) {
        this.markProgress();
      } else {
        for (const msg of toDelete) {
          if (!this.state.running) return;
          const r = await this.deleteMessage(msg);
          if (r !== 'OK') offset++; // an undeletable (FAILED/FAIL_SKIP) message stays in the index → advance to avoid a livelock
          this.onDelete(msg, r);
          this.markProgress();
          await this.wait(this.options.deleteDelay);
        }
      }
      offset += skipped.length; // deleted ones drop out of the list; skipped ones advance the offset
      this.saveCheckpoint({ job, offset, delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal });
      await this.wait(this.options.searchDelay);
    }
  }

  /** Delete a single message. Retry is centralized in ApiClient, so there's no RETRY loop here. */
  async deleteMessage(msg) {
    let resp;
    try {
      resp = await this.api.request(`${API_BASE}/channels/${msg.channel_id}/messages/${msg.id}`, { method: 'DELETE' });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      this.state.failCount++;
      return 'FAILED';
    }

    if (resp.ok || resp.status === 404) { // 404 = already gone
      this.state.delCount++;
      return 'OK';
    }

    let body = null;
    try { body = await resp.json(); } catch { /* ignore */ }

    if (resp.status === 400 && body?.code === 50083) { // archived thread
      this.state.failCount++;
      return 'FAIL_SKIP';
    }

    this.log('error', t('delete_error', { status: resp.status, id: msg.id }));
    this.state.failCount++;
    return 'FAILED';
  }
}
