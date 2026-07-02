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
