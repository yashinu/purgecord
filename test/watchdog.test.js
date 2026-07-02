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

test('varsayilan setInterval/clearInterval cipplak (global) cagrilir — tarayicida Illegal invocation olmaz', () => {
  // Tarayicidaki WebIDL davranisini taklit et: window.setInterval, this window/global
  // degilse "Illegal invocation" firlatir. Watchdog varsayilan impl'i metot gibi
  // (this=watchdog) cagirirsa bu test yakalar.
  const realSI = globalThis.setInterval;
  const realCI = globalThis.clearInterval;
  try {
    globalThis.setInterval = function (fn, ms) {
      if (this !== globalThis && this !== undefined) throw new TypeError('Illegal invocation');
      return realSI(fn, ms);
    };
    globalThis.clearInterval = function (id) {
      if (this !== globalThis && this !== undefined) throw new TypeError('Illegal invocation');
      return realCI(id);
    };
    // setIntervalImpl/clearIntervalImpl ENJEKTE EDILMEDEN (varsayilanla) — throw etmemeli
    const wd = new Watchdog({ getLastProgress: () => 0, isRunning: () => false, onStall: () => {} });
    assert.doesNotThrow(() => { wd.start(); wd.stop(); });
  } finally {
    globalThis.setInterval = realSI;
    globalThis.clearInterval = realCI;
  }
});
