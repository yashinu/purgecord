import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteEngine } from '../src/core/DeleteEngine.js';

const makeResp = (status, body = {}) => ({
  status, ok: status >= 200 && status < 300,
  async json() { return body; },
  async text() { return JSON.stringify(body); },
});

const m = (id, over = {}) => ({
  id: String(id), type: 0, pinned: false, channel_id: 'c',
  author: { id: 'me' }, content: 'x', attachments: [], embeds: [], ...over,
});

// Sahte api: handler({url, method}) => resp
function fakeApi(handler) {
  const calls = [];
  return {
    calls,
    async request(url, opts = {}) {
      const method = opts.method || 'GET';
      calls.push({ url, method });
      return handler({ url, method });
    },
  };
}

const engineWith = (api, over = {}) => new DeleteEngine({
  api,
  wait: async () => {},
  options: { deleteDelay: 0, searchDelay: 0 },
  ...over,
});

test('cursor iki sayfayı gezer, hepsini siler, <100 sayfada durur', async () => {
  const page1 = Array.from({ length: 100 }, (_, k) => m(200 - k)); // id 200..101
  const page2 = [m(100), m(99)];
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!url.includes('before=')) return makeResp(200, page1);
    if (url.includes('before=101')) return makeResp(200, page2);
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 102);
  const deletes = api.calls.filter(c => c.method === 'DELETE');
  assert.equal(deletes.length, 102);
  // ikinci sayfa isteği before=101 içermeli (oldestId(page1))
  const gets = api.calls.filter(c => c.method === 'GET');
  assert.ok(gets[1].url.includes('before=101'));
});

test('boş sayfada durur (yanlış "bitti" yok — gerçekten boş)', async () => {
  const api = fakeApi(() => makeResp(200, []));
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: {} }]);
  assert.equal(res.delCount, 0);
});

test('sadece authorId eşleşen mesajları siler', async () => {
  const page = [m(3, { author: { id: 'me' } }), m(2, { author: { id: 'other' } }), m(1, { author: { id: 'me' } })];
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); } // 3<100 → tek sayfa
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 2); // yalnız 'me' olan 2 mesaj
});

test('dry-run sayar ama silmez', async () => {
  const page = [m(2), m(1)];
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); }
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }], { dryRun: true });
  assert.equal(res.grandTotal, 2);
  assert.equal(api.calls.filter(c => c.method === 'DELETE').length, 0);
});

test('stop() sırasında durur', async () => {
  const page = Array.from({ length: 100 }, (_, k) => m(200 - k));
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); }
    return makeResp(200, []);
  });
  let engine;
  engine = engineWith(api, {
    onProgress: () => { engine.stop(); }, // ilk ilerlemede dur
  });
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 1);
});

test('401 job\'u durdurur', async () => {
  const api = fakeApi(() => makeResp(401, { message: 'unauthorized' }));
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: {} }]);
  assert.equal(res.delCount, 0);
  assert.equal(engine.state.running, false);
});

test('deleteMessage 404\'ü başarı sayar (zaten silinmiş)', async () => {
  const api = fakeApi(() => makeResp(404));
  const engine = engineWith(api);
  const r = await engine.deleteMessage(m(1));
  assert.equal(r, 'OK');
  assert.equal(engine.state.delCount, 1);
});

test('deleteMessage arşivli thread (400/50083) FAIL_SKIP döner', async () => {
  const api = fakeApi(() => makeResp(400, { code: 50083 }));
  const engine = engineWith(api);
  const r = await engine.deleteMessage(m(1));
  assert.equal(r, 'FAIL_SKIP');
  assert.equal(engine.state.failCount, 1);
});

test('runQueue birden çok job\'u sıralı işler', async () => {
  const served = {};
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(204);
    const ch = url.match(/channels\/(\w+)\//)[1];
    if (!served[ch]) { served[ch] = true; return makeResp(200, [m(2, { channel_id: ch }), m(1, { channel_id: ch })]); }
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([
    { channelId: 'aaa', filters: { authorId: 'me' } },
    { channelId: 'bbb', filters: { authorId: 'me' } },
  ]);
  assert.equal(res.delCount, 4);
  assert.ok(api.calls.some(c => c.url.includes('channels/aaa/')));
  assert.ok(api.calls.some(c => c.url.includes('channels/bbb/')));
});
