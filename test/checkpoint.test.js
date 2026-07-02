import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Checkpoint } from '../src/core/Checkpoint.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

test('save + load round-trip', () => {
  const s = fakeStorage();
  const cp = new Checkpoint(s);
  cp.save({ before: '123', delCount: 5 });
  assert.deepEqual(cp.load(), { before: '123', delCount: 5 });
});

test('boşken load null döner', () => {
  assert.equal(new Checkpoint(fakeStorage()).load(), null);
});

test('clear siler', () => {
  const cp = new Checkpoint(fakeStorage());
  cp.save({ a: 1 });
  cp.clear();
  assert.equal(cp.load(), null);
});

test('bozuk JSON güvenli şekilde null döner', () => {
  const s = fakeStorage();
  s.setItem('purgecord:state', '{bozuk');
  assert.equal(new Checkpoint(s).load(), null);
});

test('özel anahtar kullanılabilir', () => {
  const s = fakeStorage();
  const cp = new Checkpoint(s, 'x:y');
  cp.save({ a: 1 });
  assert.ok(s._map.has('x:y'));
});
