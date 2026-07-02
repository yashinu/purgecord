import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateToSnowflake, snowflakeToDate, oldestId, DISCORD_EPOCH } from '../src/core/snowflake.js';

test('DISCORD_EPOCH doğru', () => {
  assert.equal(DISCORD_EPOCH, 1420070400000);
});

test('dateToSnowflake epoch anında 0 üretir', () => {
  assert.equal(dateToSnowflake(new Date(DISCORD_EPOCH)), '0');
});

test('dateToSnowflake ve snowflakeToDate tersine çevrilebilir (ms hassasiyeti)', () => {
  const d = new Date('2024-01-01T00:00:00.000Z');
  const snow = dateToSnowflake(d);
  const back = snowflakeToDate(snow);
  assert.equal(back.getTime(), d.getTime());
});

test('dateToSnowflake BigInt kullanır, precision kaybı yok', () => {
  // 2025 civarı bir tarih; float çarpımı yanlış olurdu
  const snow = dateToSnowflake('2025-06-15T12:00:00.000Z');
  // geri dönüş aynı ms olmalı
  assert.equal(snowflakeToDate(snow).toISOString(), '2025-06-15T12:00:00.000Z');
});

test('oldestId en küçük id string döner', () => {
  const page = [{ id: '300' }, { id: '100' }, { id: '200' }];
  assert.equal(oldestId(page), '100');
});

test('oldestId büyük snowflake stringlerinde BigInt karşılaştırır', () => {
  const page = [{ id: '1200000000000000000' }, { id: '1100000000000000000' }];
  assert.equal(oldestId(page), '1100000000000000000');
});
