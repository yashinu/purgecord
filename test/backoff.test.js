import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBackoff, BACKOFF_DEFAULTS } from '../src/core/backoff.js';

const noJitter = () => 0;

test('429 retry_after değerine saygı duyar', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 3000, attempt: 0 }, {}, noJitter);
  assert.equal(ms, 3000);
});

test('429 retry_after=0 ise base ile clamp edilir (asla 0)', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 0, attempt: 0 }, {}, noJitter);
  assert.equal(ms, BACKOFF_DEFAULTS.base); // 1000
  assert.ok(ms >= BACKOFF_DEFAULTS.minDelay);
});

test('429 retry_after undefined ise NaN/undefined dönmez', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: undefined, attempt: 0 }, {}, noJitter);
  assert.ok(Number.isFinite(ms) && ms >= BACKOFF_DEFAULTS.minDelay);
});

test('202 (indexing) retry_after ile bekler', () => {
  const ms = computeBackoff({ status: 202, retryAfterMs: 2500, attempt: 0 }, {}, noJitter);
  assert.equal(ms, 2500);
});

test('5xx üstel backoff (jitter=0)', () => {
  assert.equal(computeBackoff({ status: 500, attempt: 0 }, {}, noJitter), 1000); // base*2^0
  assert.equal(computeBackoff({ status: 503, attempt: 1 }, {}, noJitter), 2000); // base*2^1
  assert.equal(computeBackoff({ status: 502, attempt: 2 }, {}, noJitter), 4000); // base*2^2
});

test('network hatası (status 0) da üstel backoff', () => {
  assert.equal(computeBackoff({ status: 0, attempt: 3 }, {}, noJitter), 8000);
});

test('maxDelay ile clamp', () => {
  const ms = computeBackoff({ status: 500, attempt: 20 }, {}, noJitter);
  assert.equal(ms, BACKOFF_DEFAULTS.maxDelay); // 60000
});

test('globalLimited retry_after ile alt sınır uygular', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 5000, attempt: 0, globalLimited: true }, {}, noJitter);
  assert.equal(ms, 5000);
});

test('jitter üstel değere eklenir', () => {
  const ms = computeBackoff({ status: 500, attempt: 0 }, {}, () => 1);
  // 1000 + 1000*0.2*1 = 1200
  assert.equal(ms, 1200);
});
