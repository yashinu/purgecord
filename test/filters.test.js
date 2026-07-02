import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMessages } from '../src/core/filters.js';

const msg = (over = {}) => ({
  id: '100', type: 0, pinned: false,
  author: { id: 'me' }, content: 'hello world',
  attachments: [], embeds: [], ...over,
});

test('varsayılan: silinebilir tipler toDelete, sistem mesajları skipped', () => {
  const messages = [msg({ id: '1', type: 0 }), msg({ id: '2', type: 3 })]; // type 3 = recipient add (silinemez)
  const { toDelete, skipped } = filterMessages(messages, {});
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
  assert.deepEqual(skipped.map(m => m.id), ['2']);
});

test('type 6..21 aralığı silinebilir', () => {
  const { toDelete } = filterMessages([msg({ id: '7', type: 7 }), msg({ id: '19', type: 19 })], {});
  assert.deepEqual(toDelete.map(m => m.id), ['7', '19']);
});

test('authorId filtresi sadece o yazarı seçer', () => {
  const messages = [msg({ id: '1', author: { id: 'me' } }), msg({ id: '2', author: { id: 'other' } })];
  const { toDelete, skipped } = filterMessages(messages, { authorId: 'me' });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
  assert.deepEqual(skipped.map(m => m.id), ['2']);
});

test('pinned varsayılan atlanır, includePinned ile silinir', () => {
  const messages = [msg({ id: '1', pinned: true })];
  assert.equal(filterMessages(messages, {}).toDelete.length, 0);
  assert.equal(filterMessages(messages, { includePinned: true }).toDelete.length, 1);
});

test('content filtresi (büyük/küçük harf duyarsız içerir)', () => {
  const messages = [msg({ id: '1', content: 'Merhaba Dünya' }), msg({ id: '2', content: 'başka' })];
  const { toDelete } = filterMessages(messages, { content: 'dünya' });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
});

test('hasFile filtresi eki olanları seçer', () => {
  const messages = [msg({ id: '1', attachments: [{ url: 'x' }] }), msg({ id: '2', attachments: [] })];
  const { toDelete } = filterMessages(messages, { hasFile: true });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
});

test('hasLink filtresi link içerenleri seçer', () => {
  const messages = [msg({ id: '1', content: 'bak https://a.com' }), msg({ id: '2', content: 'link yok' })];
  const { toDelete } = filterMessages(messages, { hasLink: true });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
});

test('pattern (regex) filtresi', () => {
  const messages = [msg({ id: '1', content: 'abc123' }), msg({ id: '2', content: 'xyz' })];
  const { toDelete } = filterMessages(messages, { pattern: '\\d+' });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
});

test('bozuk regex tüm mesajları geçirir (yok sayılır)', () => {
  const messages = [msg({ id: '1' })];
  const { toDelete } = filterMessages(messages, { pattern: '[' });
  assert.equal(toDelete.length, 1);
});

test('minId/maxId aralığı (BigInt karşılaştırma)', () => {
  const messages = [msg({ id: '100' }), msg({ id: '200' }), msg({ id: '300' })];
  const { toDelete } = filterMessages(messages, { minId: '150', maxId: '250' });
  assert.deepEqual(toDelete.map(m => m.id), ['200']);
});

test('birden çok filtre AND mantığıyla birleşir', () => {
  const messages = [
    msg({ id: '1', author: { id: 'me' }, content: 'foo' }),
    msg({ id: '2', author: { id: 'me' }, content: 'bar' }),
    msg({ id: '3', author: { id: 'other' }, content: 'foo' }),
  ];
  const { toDelete } = filterMessages(messages, { authorId: 'me', content: 'foo' });
  assert.deepEqual(toDelete.map(m => m.id), ['1']);
});
