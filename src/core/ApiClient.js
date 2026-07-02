import { computeBackoff } from './backoff.js';
import { t } from '../i18n.js';

export class AbortError extends Error {
  constructor() { super('aborted'); this.name = 'AbortError'; }
}

function getHeader(resp, name) {
  try { return resp.headers?.get?.(name) ?? null; } catch { return null; }
}
async function safeJson(resp) {
  try { return await resp.json(); } catch { return null; }
}

export class ApiClient {
  constructor({ token, fetchImpl, wait, signal = null, backoffOpts = {}, onThrottle = () => {}, log = () => {} }) {
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.wait = wait;
    this.signal = signal;
    this.backoffOpts = backoffOpts;
    this.onThrottle = onThrottle;
    this.log = log;
    this.stats = { throttledCount: 0, throttledTotalTime: 0, requests: 0 };
  }

  async request(url, { method = 'GET', maxRetries = 8, noRetry = false } = {}) {
    for (let attempt = 0; ; attempt++) {
      if (this.signal?.aborted) throw new AbortError();
      this.stats.requests++;

      let resp;
      try {
        resp = await this.fetchImpl(url, {
          method,
          headers: { 'Authorization': this.token },
          signal: this.signal,
        });
      } catch (err) {
        if (this.signal?.aborted) throw new AbortError();
        if (noRetry || attempt >= maxRetries) throw err;
        const ms = computeBackoff({ status: 0, attempt }, this.backoffOpts);
        this.log('warn', t('net_error_retry', { ms, n: attempt + 1 }));
        await this.wait(ms);
        continue;
      }

      // Single attempt (for the estimate): return the response as-is, no retry.
      if (noRetry) return resp;

      // Indexing (202) or rate limit (429) → wait + retry
      if (resp.status === 429 || resp.status === 202) {
        const body = await safeJson(resp);
        const retryAfterMs = Math.round((body?.retry_after ?? 0) * 1000);
        const globalLimited = getHeader(resp, 'x-ratelimit-global') === 'true';
        const ms = computeBackoff({ status: resp.status, retryAfterMs, attempt, globalLimited }, this.backoffOpts);
        this.stats.throttledCount++;
        this.stats.throttledTotalTime += ms;
        this.onThrottle({ ms, status: resp.status, global: globalLimited });
        this.log('verb', t('throttle_wait', { kind: resp.status === 202 ? t('indexing') : t('rate_limit'), ms }));
        await this.wait(ms);
        continue;
      }

      // Server error → retry with exponential backoff
      if (resp.status >= 500) {
        if (attempt >= maxRetries) return resp;
        const ms = computeBackoff({ status: resp.status, attempt }, this.backoffOpts);
        this.log('warn', t('server_error_retry', { status: resp.status, ms }));
        await this.wait(ms);
        continue;
      }

      // 2xx and other 4xx → leave to the caller
      return resp;
    }
  }
}
