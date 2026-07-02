import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Watchdog } from '../src/core/Watchdog.js';

test('stall + running ise onStall çağrılır', () => {
  let stalled = 0;
  const wd = new Watchdog({ getLastProgress: () => 0, isRunning: () => true, onStall: () => stalled++, stallMs: 90000, now: () => 100000 });
  wd.check();
  assert.equal(stalled, 1);
});

test('running değilse onStall çağrılmaz', () => {
  let stalled = 0;
  const wd = new Watchdog({ getLastProgress: () => 0, isRunning: () => false, onStall: () => stalled++, stallMs: 90000, now: () => 100000 });
  wd.check();
  assert.equal(stalled, 0);
});

test('ilerleme yeni ise onStall çağrılmaz', () => {
  let stalled = 0;
  const wd = new Watchdog({ getLastProgress: () => 95000, isRunning: () => true, onStall: () => stalled++, stallMs: 90000, now: () => 100000 });
  wd.check();
  assert.equal(stalled, 0);
});

test('start() enjekte edilen setInterval kullanır, stop() temizler', () => {
  let started = false, cleared = false;
  const wd = new Watchdog({
    getLastProgress: () => 0, isRunning: () => true, onStall: () => {},
    setIntervalImpl: () => { started = true; return 42; },
    clearIntervalImpl: (id) => { cleared = (id === 42); },
  });
  wd.start();
  assert.ok(started);
  wd.stop();
  assert.ok(cleared);
});
