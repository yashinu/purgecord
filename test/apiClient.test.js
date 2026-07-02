import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, AbortError } from '../src/core/ApiClient.js';

const makeResp = (status, body = {}, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  async json() { return body; },
  async text() { return JSON.stringify(body); },
});

// Sıralı yanıt veren sahte fetch; Error örneği throw eder.
function scriptedFetch(sequence) {
  let i = 0;
  const fn = async () => {
    const step = sequence[Math.min(i, sequence.length - 1)];
    i++;
    if (step instanceof Error) throw step;
    return step;
  };
  fn.count = () => i;
  return fn;
}

function makeClient(fetchImpl, extra = {}) {
  const waits = [];
  const client = new ApiClient({
    token: 't',
    fetchImpl,
    wait: async (ms) => { waits.push(ms); },
    backoffOpts: { minDelay: 500, maxDelay: 60000, base: 1000, factor: 2 },
    ...extra,
  });
  return { client, waits };
}

test('2xx anında döner, beklemez', async () => {
  const { client, waits } = makeClient(scriptedFetch([makeResp(200, { ok: 1 })]));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 0);
});

test('429 sonra 200: retry_after kadar bekler, throttled sayacı artar', async () => {
  const seq = [makeResp(429, { retry_after: 2 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.deepEqual(waits, [2000]);
  assert.equal(client.stats.throttledCount, 1);
});

test('429 retry_after=0 ise asla 0 beklemez (clamp)', async () => {
  const seq = [makeResp(429, { retry_after: 0 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  await client.request('u');
  assert.equal(waits[0], 1000); // base
  assert.ok(waits[0] >= 500);
});

test('202 (indexing) bekler ve tekrar dener', async () => {
  const seq = [makeResp(202, { retry_after: 1.5 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.deepEqual(waits, [1500]);
});

test('5xx sonra 200: üstel backoff ile tekrar', async () => {
  const seq = [makeResp(500), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq), {});
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 1000); // base*2^0 + jitter
});

test('5xx maxRetries tükenince son yanıtı döner (throw etmez)', async () => {
  const { client } = makeClient(scriptedFetch([makeResp(503)]));
  const resp = await client.request('u', { maxRetries: 2 });
  assert.equal(resp.status, 503);
});

test('network hatası sonra başarı: retry eder', async () => {
  const seq = [new Error('ECONNRESET'), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 1);
});

test('network hatası maxRetries tükenince throw eder', async () => {
  const { client } = makeClient(scriptedFetch([new Error('down')]));
  await assert.rejects(() => client.request('u', { maxRetries: 2 }), /down/);
});

test('4xx (403) doğrudan çağırana döner, retry yok', async () => {
  const { client, waits } = makeClient(scriptedFetch([makeResp(403, { message: 'no' })]));
  const resp = await client.request('u');
  assert.equal(resp.status, 403);
  assert.equal(waits.length, 0);
});

test('abort sinyali AbortError fırlatır', async () => {
  const signal = { aborted: true };
  const { client } = makeClient(scriptedFetch([makeResp(200)]), { signal });
  await assert.rejects(() => client.request('u'), (e) => e instanceof AbortError);
});

test('global rate limit retry_after ile beklenir', async () => {
  const seq = [makeResp(429, { retry_after: 4 }, { 'x-ratelimit-global': 'true' }), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq));
  await client.request('u');
  assert.equal(waits[0], 4000);
});
