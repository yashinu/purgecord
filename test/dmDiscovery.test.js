import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmName, dmIcon, mapDmChannel, listDms } from '../src/core/DmDiscovery.js';

test('dmName tekli DM: karşı kullanıcı adı', () => {
  const c = { type: 1, recipients: [{ id: 'u1', username: 'ali', global_name: 'Ali K' }] };
  assert.equal(dmName(c), 'Ali K');
});

test('dmName grup DM: name varsa onu, yoksa katılımcılar', () => {
  assert.equal(dmName({ type: 3, name: 'Takım' }), 'Takım');
  assert.equal(dmName({ type: 3, recipients: [{ username: 'a' }, { username: 'b' }] }), 'a, b');
});

test('dmIcon tekli DM avatar URL üretir', () => {
  const c = { type: 1, recipients: [{ id: 'u1', avatar: 'abc' }] };
  assert.equal(dmIcon(c), 'https://cdn.discordapp.com/avatars/u1/abc.png?size=64');
});

test('mapDmChannel alanları eşler ve lastTime üretir', () => {
  const c = { id: 'c1', type: 1, last_message_id: '175928847299117063', recipients: [{ id: 'u', username: 'x' }] };
  const row = mapDmChannel(c);
  assert.equal(row.id, 'c1');
  assert.equal(row.lastMessageId, '175928847299117063');
  assert.ok(row.lastTime instanceof Date);
});

test('listDms yalnız DM/grup-DM alır ve azalan sıralar', async () => {
  const channels = [
    { id: 'a', type: 1, last_message_id: '100', recipients: [{ username: 'a' }] },
    { id: 'g', type: 3, last_message_id: '300', name: 'Grup' },
    { id: 'server', type: 0 }, // atlanmalı
    { id: 'b', type: 1, last_message_id: '200', recipients: [{ username: 'b' }] },
  ];
  const api = { async request() { return { ok: true, async json() { return channels; } }; } };
  const rows = await listDms(api);
  assert.deepEqual(rows.map(r => r.id), ['g', 'b', 'a']); // 300,200,100
});

test('listDms hata durumunda fırlatır', async () => {
  const api = { async request() { return { ok: false, status: 401, async json() { return {}; } }; } };
  await assert.rejects(() => listDms(api), /401/);
});
