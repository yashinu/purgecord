import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdsFromUrl } from '../src/discord/token.js';

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
