import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteEngine } from '../src/core/DeleteEngine.js';

const makeResp = (status, body = {}) => ({ status, ok: status >= 200 && status < 300, async json() { return body; }, async text() { return JSON.stringify(body); } });
const hit = (id) => ({ id, type: 0, pinned: false, channel_id: 'c', author: { id: 'me' }, content: 'x', attachments: [], hit: true });

function fakeApi(handler) {
  const calls = [];
  return { calls, async request(url, opts = {}) { const method = opts.method || 'GET'; calls.push({ url, method }); return handler({ url, method }); } };
}

test('search stratejisi: total_results>0 iken siler, boş sayfayı doğrular ve durur', async () => {
  let searchCount = 0;
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (url.includes('/search')) {
      searchCount++;
      if (searchCount === 1) return makeResp(200, { total_results: 2, messages: [[hit('2')], [hit('1')]] });
      return makeResp(200, { total_results: 2, messages: [] }); // sonraki sayfalar boş → doğrulama sonrası bitiş
    }
    return makeResp(200, []);
  });
  const engine = new DeleteEngine({ api, wait: async () => {}, options: { deleteDelay: 0, searchDelay: 0 } });
  const res = await engine.runQueue([{ channelId: undefined, guildId: 'g1', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 2);
});

test('search: gecici bos sayfayi 3x dogrular, sonraki sayfadaki hitleri kacirmaz', async () => {
  // sc=1: 1 hit; sc=2: gecici BOS (total>0); sc=3: 2 hit daha; sc=4: total=0 -> biter.
  // Dogru retry ile delCount=3. Retry olmasaydi (ilk boste dur) delCount=1 olurdu.
  let sc = 0;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    sc++;
    if (sc === 1) return makeResp(200, { total_results: 3, messages: [[hit('5')]] });
    if (sc === 2) return makeResp(200, { total_results: 2, messages: [] });
    if (sc === 3) return makeResp(200, { total_results: 2, messages: [[hit('4')], [hit('3')]] });
    return makeResp(200, { total_results: 0, messages: [] });
  });
  const engine = new DeleteEngine({ api, wait: async () => {}, options: { deleteDelay: 0, searchDelay: 0 } });
  const res = await engine.runQueue([{ channelId: undefined, guildId: 'g1', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 3);
});

test('search: kalici basarisiz silme livelock yapmaz (offset ilerler, is biter)', async () => {
  // DELETE hep 403 (FAILED). offset=0 tek hit dondurur, offset>=1 bos.
  // Fix ile: basarisiz silme sonrasi offset++ -> sonraki arama bos -> streak -> biter.
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(403, { message: 'forbidden' });
    if (url.includes('offset=0')) return makeResp(200, { total_results: 1, messages: [[hit('9')]] });
    return makeResp(200, { total_results: 1, messages: [] });
  });
  const engine = new DeleteEngine({ api, wait: async () => {}, options: { deleteDelay: 0, searchDelay: 0 } });
  const res = await engine.runQueue([{ channelId: undefined, guildId: 'g1', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 0);
  assert.equal(res.failCount, 1); // bir kez denendi; offset ilerledi; livelock yok
});

test('search dry-run: silmez, sadece sayar', async () => {
  let sc = 0;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    sc++;
    if (sc === 1) return makeResp(200, { total_results: 2, messages: [[hit('2')], [hit('1')]] });
    return makeResp(200, { total_results: 2, messages: [] });
  });
  const engine = new DeleteEngine({ api, wait: async () => {}, options: { deleteDelay: 0, searchDelay: 0 } });
  const res = await engine.runQueue([{ channelId: undefined, guildId: 'g1', filters: { authorId: 'me' } }], { dryRun: true });
  assert.equal(api.calls.filter(c => c.method === 'DELETE').length, 0);
  assert.ok(res.grandTotal >= 2);
});
