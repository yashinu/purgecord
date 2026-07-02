import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdsFromUrl, looksLikeToken } from '../src/discord/token.js';

test('sunucu kanalı URL ayrıştırma', () => {
  const r = parseIdsFromUrl('https://discord.com/channels/123456789/987654321');
  assert.deepEqual(r, { guildId: '123456789', channelId: '987654321' });
});

test('DM URL ayrıştırma (@me)', () => {
  const r = parseIdsFromUrl('https://discord.com/channels/@me/555000111');
  assert.deepEqual(r, { guildId: '@me', channelId: '555000111' });
});

test('eşleşme yoksa null döner', () => {
  assert.deepEqual(parseIdsFromUrl('https://discord.com/app'), { guildId: null, channelId: null });
});

test('looksLikeToken obje/kısa/boş değerleri reddeder', () => {
  assert.equal(looksLikeToken('[object Object]'), false); // 15 karakter — obje coercion'ı
  assert.equal(looksLikeToken(''), false);
  assert.equal(looksLikeToken('   '), false);
  assert.equal(looksLikeToken('kısa'), false);
  assert.equal(looksLikeToken(null), false);
  assert.equal(looksLikeToken(undefined), false);
  assert.equal(looksLikeToken({}), false);
  assert.equal(looksLikeToken({ token: 'x' }), false);
  assert.equal(looksLikeToken(12345678901234567890), false); // sayı
});

test('looksLikeToken gerçek token uzunluğundaki stringi kabul eder', () => {
  // Discord token'ları ~59-72 karakter
  assert.equal(looksLikeToken('a'.repeat(59)), true);
  assert.equal(looksLikeToken('MTA5' + 'x'.repeat(60)), true);
});
