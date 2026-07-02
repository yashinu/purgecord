export const BACKOFF_DEFAULTS = { minDelay: 500, maxDelay: 60000, base: 1000, factor: 2 };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Bir sonraki deneme öncesi beklenecek ms. Daima minDelay..maxDelay arası.
 * @param {{status:number, retryAfterMs?:number, attempt?:number, globalLimited?:boolean}} info
 * @param {object} [opts] BACKOFF_DEFAULTS override
 * @param {() => number} [rng] jitter kaynağı (test için enjekte edilir)
 */
export function computeBackoff({ status, retryAfterMs, attempt = 0, globalLimited = false }, opts = {}, rng = Math.random) {
  const o = { ...BACKOFF_DEFAULTS, ...opts };
  let ms;
  if (status === 429 || status === 202) {
    ms = (typeof retryAfterMs === 'number' && retryAfterMs > 0) ? retryAfterMs : o.base;
  } else {
    const exp = o.base * Math.pow(o.factor, attempt);
    ms = exp + exp * 0.2 * rng();
  }
  if (globalLimited && typeof retryAfterMs === 'number' && retryAfterMs > 0) {
    ms = Math.max(ms, retryAfterMs);
  }
  return clamp(ms, o.minDelay, o.maxDelay);
}
