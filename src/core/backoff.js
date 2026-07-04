export const BACKOFF_DEFAULTS = {
  minDelay: 500, maxDelay: 60000, base: 1000, factor: 2,
  // Safety margin applied to the server's retry_after. Waiting *exactly*
  // retry_after is spec-correct, but a hair of clock skew or a bucket shared
  // with an in-flight request can immediately re-trip the limit. undiscord
  // waits 2× retry_after and has run for years without account bans, so we
  // match that proven-safe padding rather than the bare minimum.
  retryAfterFactor: 2,
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Milliseconds to wait before the next attempt. Always within minDelay..maxDelay.
 * @param {{status:number, retryAfterMs?:number, attempt?:number, globalLimited?:boolean}} info
 * @param {object} [opts] BACKOFF_DEFAULTS override
 * @param {() => number} [rng] jitter source (injected in tests)
 */
export function computeBackoff({ status, retryAfterMs, attempt = 0, globalLimited = false }, opts = {}, rng = Math.random) {
  const o = { ...BACKOFF_DEFAULTS, ...opts };
  const hasRetryAfter = typeof retryAfterMs === 'number' && retryAfterMs > 0;
  let ms;
  if (status === 429 || status === 202) {
    // Honor the server's retry_after, padded (see retryAfterFactor); fall back
    // to base when the server didn't hand us a usable value.
    ms = hasRetryAfter ? retryAfterMs * o.retryAfterFactor : o.base;
  } else {
    const exp = o.base * Math.pow(o.factor, attempt);
    ms = exp + exp * 0.2 * rng();
  }
  if (globalLimited && hasRetryAfter) {
    ms = Math.max(ms, retryAfterMs * o.retryAfterFactor);
  }
  return clamp(ms, o.minDelay, o.maxDelay);
}
