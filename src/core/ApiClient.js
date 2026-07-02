import { computeBackoff } from './backoff.js';

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

  async request(url, { method = 'GET', maxRetries = 8 } = {}) {
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
        if (attempt >= maxRetries) throw err;
        const ms = computeBackoff({ status: 0, attempt }, this.backoffOpts);
        this.log('warn', `Ağ hatası; ${ms}ms sonra tekrar (deneme ${attempt + 1}).`);
        await this.wait(ms);
        continue;
      }

      // İndeksleniyor (202) veya rate limit (429) → bekle + tekrar
      if (resp.status === 429 || resp.status === 202) {
        const body = await safeJson(resp);
        const retryAfterMs = Math.round((body?.retry_after ?? 0) * 1000);
        const globalLimited = getHeader(resp, 'x-ratelimit-global') === 'true';
        const ms = computeBackoff({ status: resp.status, retryAfterMs, attempt, globalLimited }, this.backoffOpts);
        this.stats.throttledCount++;
        this.stats.throttledTotalTime += ms;
        this.onThrottle({ ms, status: resp.status, global: globalLimited });
        this.log('warn', `${resp.status === 202 ? 'İndeksleniyor' : 'Rate limit'}; ${ms}ms bekleniyor...`);
        await this.wait(ms);
        continue;
      }

      // Sunucu hatası → üstel backoff ile tekrar
      if (resp.status >= 500) {
        if (attempt >= maxRetries) return resp;
        const ms = computeBackoff({ status: resp.status, attempt }, this.backoffOpts);
        this.log('warn', `Sunucu hatası ${resp.status}; ${ms}ms sonra tekrar...`);
        await this.wait(ms);
        continue;
      }

      // 2xx ve diğer 4xx → çağırana bırak
      return resp;
    }
  }
}
