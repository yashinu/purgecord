# Purgecord — Discord Toplu Mesaj & DM Silici — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** undiscord'un silme mantığına dayanan, kendi kendine durmayan, modern UI'lı ve toplu DM silme özellikli bir Discord userscript'i inşa etmek.

**Architecture:** Saf mantık modülleri (snowflake/backoff/filters) + `fetch` enjekte edilen bir `ApiClient` (429/5xx/network/202 için merkezî retry) + `DeleteEngine` (DM ve tek kanal için indeksten bağımsız **cursor** sayfalama; silme undiscord ile aynı DELETE). Bağımlılık enjeksiyonu sayesinde çekirdek `node:test` ile birim-test edilir; DOM/UI tarayıcıda manuel doğrulanır. Tek dosyaya `esbuild` ile bundle.

**Tech Stack:** Vanilla JS (ESM), esbuild (bundle), node:test (birim test), Tampermonkey/Violentmonkey (çalışma ortamı), Discord API v9.

## Global Constraints

- **Teslim dosyası:** `dist/deleteDiscordMessages.user.js` (esbuild IIFE bundle, `src/header.js` banner olarak).
- **Metablock:** `@match https://*.discord.com/*`, `@grant none`, `@run-at document-idle`, `@version 0.1.0`, `@name Purgecord`.
- **Bağımlılık:** Tek dev-dependency `esbuild`. Runtime bağımlılığı YOK. Testler yalnız Node built-in (`node:test`, `node:assert`).
- **Node:** ≥ 18 (yerleşik `node:test`).
- **Snowflake matematiği:** Daima `BigInt` — asla float çarpımı (undiscord'un `* Math.pow(2,22)` precision bug'ından kaçın).
- **Bekleme süresi:** Her API beklemesi `computeBackoff` üzerinden; asla `wait(undefined)`/`wait(0)`. `minDelay = 500ms`, `maxDelay = 60000ms`.
- **deleteDelay alt sınırı:** 500ms (kullanıcı bunun altına inemez).
- **Silinebilir tip:** `type === 0 || (type >= 6 && type <= 21)`; pinned ise yalnız `includePinned` true iken.
- **Dil:** UI label'ları İngilizce, kod yorumları Türkçe olabilir. Commit mesajlarında `Co-Authored-By` **yok**.
- **Determinizm (testler):** Rastgelelik/zaman enjekte edilir (`rng`, `now`, `wait`, `fetchImpl`, `storage`, timer'lar) — testler deterministik olmalı.

---

## Dosya Haritası

| Dosya | Sorumluluk | Test |
|---|---|---|
| `src/header.js` | ==UserScript== metablock (banner) | — |
| `src/discord/constants.js` | API_BASE, mesaj tipi predicate, kanal tipleri | — |
| `src/core/snowflake.js` | tarih↔snowflake, `oldestId(page)` | `test/snowflake.test.js` |
| `src/core/backoff.js` | `computeBackoff()` clamp'li bekleme | `test/backoff.test.js` |
| `src/core/filters.js` | `filterMessages()` saf ayıklama | `test/filters.test.js` |
| `src/core/ApiClient.js` | `request()` retry/backoff/rate-limit | `test/apiClient.test.js` |
| `src/core/DeleteEngine.js` | job kuyruğu, cursor stratejisi, silme, dry-run | `test/deleteEngine.test.js` |
| `src/core/DmDiscovery.js` | `listDms()` + isim/avatar yardımcıları | `test/dmDiscovery.test.js` |
| `src/core/Checkpoint.js` | localStorage kalıcılık | `test/checkpoint.test.js` |
| `src/core/Watchdog.js` | stall tespiti + otomatik devam | `test/watchdog.test.js` |
| `src/discord/token.js` | token/authorId/guildId/channelId edinimi | manuel |
| `src/ui/styles.css.js` | panel CSS (string export) | manuel |
| `src/ui/template.html.js` | panel + buton HTML (string export) | manuel |
| `src/ui/DragResize.js` | sürükle/boyutlandır (undiscord uyarlaması) | manuel |
| `src/ui/ui.js` | mount, observer, sekmeler, render, olaylar | manuel |
| `src/main.js` | boot: CSS enjekte, UI init | manuel |
| `build.mjs` | esbuild bundle | — |
| `package.json` | scriptler, esbuild | — |

**Bağımlılık sırası:** constants → snowflake → backoff → filters → ApiClient → DeleteEngine/DmDiscovery/Checkpoint/Watchdog → token → UI → main.

---

## Bilinen sadeleştirmeler (bilinçli spec sapmaları)

Öz-inceleme sonucu, spec'e göre iki nokta MVP'de bilinçli olarak sadeleştirildi (doğruluğu etkilemez, sonradan yükseltilebilir):

1. **Onay diyaloğu:** Spec panel-içi (bloklamayan) onay istiyordu; MVP'de kısa bir `window.confirm` kullanılıyor (Task 13/14). Güvenli ve yeterli; panel-içi modal sonraki iterasyona ertelendi.
2. **Öngörülü rate-limit freni:** Spec §8'deki "`X-RateLimit-Remaining: 0` görülünce önden bekle" optimizasyonu eklenmedi. Reaktif 429 yönetimi (Task 5, `retry_after`'a saygı + global limit) doğruluk için yeterli; öngörülü fren sadece 429 sayısını azaltan bir iyileştirme olarak ertelendi.

Bunların dışında spec'in tüm bölümleri bir göreve eşlenmiştir (cursor motoru, sağlamlaştırma/bug-düzeltmeleri, toplu DM include/exclude, focus kartı + "takip et", checkpoint/resume, watchdog, streamer modu, dry-run).

---

## Task 1: Proje iskeleti (scaffold)

**Files:**
- Create: `package.json`
- Create: `build.mjs`
- Create: `src/header.js`
- Create: `src/main.js` (geçici stub)
- Create: `src/ui/styles.css.js` (geçici stub)

**Interfaces:**
- Consumes: —
- Produces: `npm run build` → `dist/deleteDiscordMessages.user.js`; `npm test` çalışır (henüz test yok, 0 test geçer).

- [ ] **Step 1: package.json yaz**

```json
{
  "name": "purgecord",
  "version": "0.1.0",
  "type": "module",
  "description": "Discord toplu mesaj & DM silici userscript",
  "scripts": {
    "build": "node build.mjs",
    "test": "node --test"
  },
  "devDependencies": {
    "esbuild": "^0.23.0"
  }
}
```

- [ ] **Step 2: Metablock header yaz**

`src/header.js`:
```js
// ==UserScript==
// @name         Purgecord
// @namespace    https://github.com/local/purgecord
// @version      0.1.0
// @description  Discord toplu mesaj & DM silici (undiscord temelli, sağlamlaştırılmış)
// @author       local
// @match        https://*.discord.com/*
// @icon         https://victornpb.github.io/undiscord/images/icon128.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==
```

- [ ] **Step 3: Geçici stub'lar yaz**

`src/ui/styles.css.js`:
```js
export const styles = `/* purgecord styles */`;
```

`src/main.js`:
```js
import { styles } from './ui/styles.css.js';
// Geçici boot — Task 15'te gerçek UI ile değişecek.
console.log('[purgecord] loaded', styles.length, 'bytes css');
```

- [ ] **Step 4: build.mjs yaz**

```js
import esbuild from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const banner = readFileSync('src/header.js', 'utf8');

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: 'dist/deleteDiscordMessages.user.js',
  banner: { js: banner },
  legalComments: 'none',
});
console.log('[build] dist/deleteDiscordMessages.user.js yazıldı.');
```

- [ ] **Step 5: Bağımlılıkları kur ve build'i çalıştır**

Run: `npm install && npm run build`
Expected: `dist/deleteDiscordMessages.user.js` oluşur, en üstte metablock, altında IIFE. Konsol: `[build] ... yazıldı.`

- [ ] **Step 6: Testi çalıştır (boş)**

Run: `npm test`
Expected: `node --test` hata vermez (henüz test dosyası yok → "0 tests" veya exit 0).

- [ ] **Step 7: Commit**

```bash
git add package.json build.mjs src/header.js src/main.js src/ui/styles.css.js
git commit -m "chore: proje iskeleti (esbuild build + node:test)"
```

---

## Task 2: snowflake.js (saf, TDD)

**Files:**
- Create: `src/core/snowflake.js`
- Test: `test/snowflake.test.js`

**Interfaces:**
- Consumes: —
- Produces:
  - `dateToSnowflake(date: Date|string|number): string`
  - `snowflakeToDate(id: string): Date`
  - `oldestId(messages: {id:string}[]): string` — sayfadaki en küçük (en eski) id
  - `DISCORD_EPOCH: number`

- [ ] **Step 1: Failing test yaz**

`test/snowflake.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/snowflake.test.js`
Expected: FAIL — `Cannot find module '../src/core/snowflake.js'` / import hatası.

- [ ] **Step 3: Minimal implementasyon yaz**

`src/core/snowflake.js`:
```js
export const DISCORD_EPOCH = 1420070400000;

export function dateToSnowflake(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return (BigInt(ms - DISCORD_EPOCH) << 22n).toString();
}

export function snowflakeToDate(id) {
  return new Date(Number(BigInt(id) >> 22n) + DISCORD_EPOCH);
}

export function oldestId(messages) {
  return messages.reduce(
    (min, m) => (BigInt(m.id) < BigInt(min) ? m.id : min),
    messages[0].id
  );
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/snowflake.test.js`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/snowflake.js test/snowflake.test.js
git commit -m "feat: snowflake donusumleri (BigInt, precision-safe)"
```

---

## Task 3: backoff.js (saf, TDD)

**Files:**
- Create: `src/core/backoff.js`
- Test: `test/backoff.test.js`

**Interfaces:**
- Consumes: —
- Produces:
  - `BACKOFF_DEFAULTS = { minDelay:500, maxDelay:60000, base:1000, factor:2 }`
  - `computeBackoff({ status, retryAfterMs, attempt, globalLimited }, opts?, rng?): number` — daima `minDelay..maxDelay` arası, asla 0/undefined/NaN.

- [ ] **Step 1: Failing test yaz**

`test/backoff.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBackoff, BACKOFF_DEFAULTS } from '../src/core/backoff.js';

const noJitter = () => 0;

test('429 retry_after değerine saygı duyar', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 3000, attempt: 0 }, {}, noJitter);
  assert.equal(ms, 3000);
});

test('429 retry_after=0 ise base ile clamp edilir (asla 0)', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 0, attempt: 0 }, {}, noJitter);
  assert.equal(ms, BACKOFF_DEFAULTS.base); // 1000
  assert.ok(ms >= BACKOFF_DEFAULTS.minDelay);
});

test('429 retry_after undefined ise NaN/undefined dönmez', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: undefined, attempt: 0 }, {}, noJitter);
  assert.ok(Number.isFinite(ms) && ms >= BACKOFF_DEFAULTS.minDelay);
});

test('202 (indexing) retry_after ile bekler', () => {
  const ms = computeBackoff({ status: 202, retryAfterMs: 2500, attempt: 0 }, {}, noJitter);
  assert.equal(ms, 2500);
});

test('5xx üstel backoff (jitter=0)', () => {
  assert.equal(computeBackoff({ status: 500, attempt: 0 }, {}, noJitter), 1000); // base*2^0
  assert.equal(computeBackoff({ status: 503, attempt: 1 }, {}, noJitter), 2000); // base*2^1
  assert.equal(computeBackoff({ status: 502, attempt: 2 }, {}, noJitter), 4000); // base*2^2
});

test('network hatası (status 0) da üstel backoff', () => {
  assert.equal(computeBackoff({ status: 0, attempt: 3 }, {}, noJitter), 8000);
});

test('maxDelay ile clamp', () => {
  const ms = computeBackoff({ status: 500, attempt: 20 }, {}, noJitter);
  assert.equal(ms, BACKOFF_DEFAULTS.maxDelay); // 60000
});

test('globalLimited retry_after ile alt sınır uygular', () => {
  const ms = computeBackoff({ status: 429, retryAfterMs: 5000, attempt: 0, globalLimited: true }, {}, noJitter);
  assert.equal(ms, 5000);
});

test('jitter üstel değere eklenir', () => {
  const ms = computeBackoff({ status: 500, attempt: 0 }, {}, () => 1);
  // 1000 + 1000*0.2*1 = 1200
  assert.equal(ms, 1200);
});
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/backoff.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: Minimal implementasyon yaz**

`src/core/backoff.js`:
```js
export const BACKOFF_DEFAULTS = { minDelay: 500, maxDelay: 60000, base: 1000, factor: 2 };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Bir sonraki deneme öncesi beklenecek ms. Daima minDelay..maxDelay arası.
 * @param {{status:number, retryAfterMs?:number, attempt?:number, globalLimited?:boolean}} info
 * @param {object} [opts] BACKOFF_DEFAULTS override
 * @param {() => number} [rng] jitter kaynağı (test için enjekte edilir)
 */
export function computeBackoff({ status, retryAfterMs, attempt = 0, globalLimited = false }, opts = {}, rng = Math.random) {
  const o = { ...BACKOFF_DEFAULTS, ...opts };
  let ms;
  if (status === 429 || status === 202) {
    ms = (typeof retryAfterMs === 'number' && retryAfterMs > 0) ? retryAfterMs : o.base;
  } else {
    const exp = o.base * Math.pow(o.factor, attempt);
    ms = exp + exp * 0.2 * rng();
  }
  if (globalLimited && typeof retryAfterMs === 'number' && retryAfterMs > 0) {
    ms = Math.max(ms, retryAfterMs);
  }
  return clamp(ms, o.minDelay, o.maxDelay);
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/backoff.test.js`
Expected: PASS (9 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/backoff.js test/backoff.test.js
git commit -m "feat: computeBackoff (clamp'li, wait(undefined) bug'ini onler)"
```

---

## Task 4: constants.js + filters.js (saf, TDD)

**Files:**
- Create: `src/discord/constants.js`
- Create: `src/core/filters.js`
- Test: `test/filters.test.js`

**Interfaces:**
- Consumes: `snowflake.dateToSnowflake`
- Produces:
  - `constants.API_BASE = 'https://discord.com/api/v9'`
  - `constants.isDeletableType(type:number): boolean`
  - `constants.CHANNEL_TYPE = { DM:1, GROUP_DM:3 }`
  - `filters.filterMessages(messages, options): { toDelete: Msg[], skipped: Msg[] }`
    - options: `{ authorId?, includePinned?, hasLink?, hasFile?, content?, pattern?, minDate?, maxDate?, minId?, maxId? }`

- [ ] **Step 1: Failing test yaz**

`test/filters.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/filters.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: constants.js yaz**

`src/discord/constants.js`:
```js
export const API_BASE = 'https://discord.com/api/v9';

// Silinebilir mesaj tipleri (undiscord ile birebir).
export const isDeletableType = (type) => type === 0 || (type >= 6 && type <= 21);

export const CHANNEL_TYPE = { DM: 1, GROUP_DM: 3 };
```

- [ ] **Step 4: filters.js yaz**

`src/core/filters.js`:
```js
import { isDeletableType } from '../discord/constants.js';
import { dateToSnowflake } from './snowflake.js';

const LINK_RE = /https?:\/\//i;

function isDeletable(msg, o, regex, minSnow, maxSnow) {
  if (!isDeletableType(msg.type)) return false;
  if (msg.pinned && !o.includePinned) return false;
  if (o.authorId && msg.author?.id !== o.authorId) return false;
  if (o.content && !String(msg.content || '').toLowerCase().includes(o.content.toLowerCase())) return false;
  if (o.hasLink && !(LINK_RE.test(msg.content || '') || (msg.embeds && msg.embeds.length))) return false;
  if (o.hasFile && !(msg.attachments && msg.attachments.length)) return false;
  if (regex && !regex.test(msg.content || '')) return false;
  if (minSnow && BigInt(msg.id) < BigInt(minSnow)) return false;
  if (maxSnow && BigInt(msg.id) > BigInt(maxSnow)) return false;
  return true;
}

/**
 * Bir sayfa mesajı silinecek/atlanacak olarak ayırır (saf).
 * @param {object[]} messages
 * @param {object} options
 * @returns {{toDelete: object[], skipped: object[]}}
 */
export function filterMessages(messages, options = {}) {
  let regex = null;
  if (options.pattern) {
    try { regex = new RegExp(options.pattern, 'i'); } catch { regex = null; }
  }
  const minSnow = options.minId || (options.minDate ? dateToSnowflake(options.minDate) : null);
  const maxSnow = options.maxId || (options.maxDate ? dateToSnowflake(options.maxDate) : null);

  const toDelete = [];
  const skipped = [];
  for (const msg of messages) {
    if (isDeletable(msg, options, regex, minSnow, maxSnow)) toDelete.push(msg);
    else skipped.push(msg);
  }
  return { toDelete, skipped };
}
```

- [ ] **Step 5: Testi çalıştır — pass görmeli**

Run: `node --test test/filters.test.js`
Expected: PASS (11 test).

- [ ] **Step 6: Commit**

```bash
git add src/discord/constants.js src/core/filters.js test/filters.test.js
git commit -m "feat: constants + filterMessages (saf ayiklama hatti)"
```

---

## Task 5: ApiClient.js — merkezî retry/rate-limit (TDD, fake fetch)

**Files:**
- Create: `src/core/ApiClient.js`
- Test: `test/apiClient.test.js`

**Interfaces:**
- Consumes: `backoff.computeBackoff`
- Produces:
  - `class ApiClient` — ctor `{ token, fetchImpl, wait, signal?, backoffOpts?, onThrottle?, log? }`
  - `apiClient.request(url, { method?, maxRetries? }): Promise<Response>` — 429/202/5xx/network'ü içeride retry'lar; 2xx ve 4xx'i çağırana döner; abort'ta `AbortError` fırlatır.
  - `apiClient.stats = { throttledCount, throttledTotalTime, requests }`
  - `class AbortError extends Error`

- [ ] **Step 1: Failing test yaz**

`test/apiClient.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, AbortError } from '../src/core/ApiClient.js';

const makeResp = (status, body = {}, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  async json() { return body; },
  async text() { return JSON.stringify(body); },
});

// Sıralı yanıt veren sahte fetch; Error örneği throw eder.
function scriptedFetch(sequence) {
  let i = 0;
  const fn = async () => {
    const step = sequence[Math.min(i, sequence.length - 1)];
    i++;
    if (step instanceof Error) throw step;
    return step;
  };
  fn.count = () => i;
  return fn;
}

function makeClient(fetchImpl, extra = {}) {
  const waits = [];
  const client = new ApiClient({
    token: 't',
    fetchImpl,
    wait: async (ms) => { waits.push(ms); },
    backoffOpts: { minDelay: 500, maxDelay: 60000, base: 1000, factor: 2 },
    ...extra,
  });
  return { client, waits };
}

test('2xx anında döner, beklemez', async () => {
  const { client, waits } = makeClient(scriptedFetch([makeResp(200, { ok: 1 })]));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 0);
});

test('429 sonra 200: retry_after kadar bekler, throttled sayacı artar', async () => {
  const seq = [makeResp(429, { retry_after: 2 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.deepEqual(waits, [2000]);
  assert.equal(client.stats.throttledCount, 1);
});

test('429 retry_after=0 ise asla 0 beklemez (clamp)', async () => {
  const seq = [makeResp(429, { retry_after: 0 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  await client.request('u');
  assert.equal(waits[0], 1000); // base
  assert.ok(waits[0] >= 500);
});

test('202 (indexing) bekler ve tekrar dener', async () => {
  const seq = [makeResp(202, { retry_after: 1.5 }), makeResp(200, {})];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.deepEqual(waits, [1500]);
});

test('5xx sonra 200: üstel backoff ile tekrar', async () => {
  const seq = [makeResp(500), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq), {});
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 1000); // base*2^0 + jitter
});

test('5xx maxRetries tükenince son yanıtı döner (throw etmez)', async () => {
  const { client } = makeClient(scriptedFetch([makeResp(503)]));
  const resp = await client.request('u', { maxRetries: 2 });
  assert.equal(resp.status, 503);
});

test('network hatası sonra başarı: retry eder', async () => {
  const seq = [new Error('ECONNRESET'), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq));
  const resp = await client.request('u');
  assert.equal(resp.status, 200);
  assert.equal(waits.length, 1);
});

test('network hatası maxRetries tükenince throw eder', async () => {
  const { client } = makeClient(scriptedFetch([new Error('down')]));
  await assert.rejects(() => client.request('u', { maxRetries: 2 }), /down/);
});

test('4xx (403) doğrudan çağırana döner, retry yok', async () => {
  const { client, waits } = makeClient(scriptedFetch([makeResp(403, { message: 'no' })]));
  const resp = await client.request('u');
  assert.equal(resp.status, 403);
  assert.equal(waits.length, 0);
});

test('abort sinyali AbortError fırlatır', async () => {
  const signal = { aborted: true };
  const { client } = makeClient(scriptedFetch([makeResp(200)]), { signal });
  await assert.rejects(() => client.request('u'), (e) => e instanceof AbortError);
});

test('global rate limit retry_after ile beklenir', async () => {
  const seq = [makeResp(429, { retry_after: 4 }, { 'x-ratelimit-global': 'true' }), makeResp(200)];
  const { client, waits } = makeClient(scriptedFetch(seq));
  await client.request('u');
  assert.equal(waits[0], 4000);
});
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/apiClient.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: ApiClient.js yaz**

`src/core/ApiClient.js`:
```js
import { computeBackoff } from './backoff.js';

export class AbortError extends Error {
  constructor() { super('aborted'); this.name = 'AbortError'; }
}

function getHeader(resp, name) {
  try { return resp.headers?.get?.(name) ?? null; } catch { return null; }
}
async function safeJson(resp) {
  try { return await resp.json(); } catch { return null; }
}

export class ApiClient {
  constructor({ token, fetchImpl, wait, signal = null, backoffOpts = {}, onThrottle = () => {}, log = () => {} }) {
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.wait = wait;
    this.signal = signal;
    this.backoffOpts = backoffOpts;
    this.onThrottle = onThrottle;
    this.log = log;
    this.stats = { throttledCount: 0, throttledTotalTime: 0, requests: 0 };
  }

  async request(url, { method = 'GET', maxRetries = 8 } = {}) {
    for (let attempt = 0; ; attempt++) {
      if (this.signal?.aborted) throw new AbortError();
      this.stats.requests++;

      let resp;
      try {
        resp = await this.fetchImpl(url, {
          method,
          headers: { 'Authorization': this.token },
          signal: this.signal,
        });
      } catch (err) {
        if (this.signal?.aborted) throw new AbortError();
        if (attempt >= maxRetries) throw err;
        const ms = computeBackoff({ status: 0, attempt }, this.backoffOpts);
        this.log('warn', `Ağ hatası; ${ms}ms sonra tekrar (deneme ${attempt + 1}).`);
        await this.wait(ms);
        continue;
      }

      // İndeksleniyor (202) veya rate limit (429) → bekle + tekrar
      if (resp.status === 429 || resp.status === 202) {
        const body = await safeJson(resp);
        const retryAfterMs = Math.round((body?.retry_after ?? 0) * 1000);
        const globalLimited = getHeader(resp, 'x-ratelimit-global') === 'true';
        const ms = computeBackoff({ status: resp.status, retryAfterMs, attempt, globalLimited }, this.backoffOpts);
        this.stats.throttledCount++;
        this.stats.throttledTotalTime += ms;
        this.onThrottle({ ms, status: resp.status, global: globalLimited });
        this.log('warn', `${resp.status === 202 ? 'İndeksleniyor' : 'Rate limit'}; ${ms}ms bekleniyor...`);
        await this.wait(ms);
        continue;
      }

      // Sunucu hatası → üstel backoff ile tekrar
      if (resp.status >= 500) {
        if (attempt >= maxRetries) return resp;
        const ms = computeBackoff({ status: resp.status, attempt }, this.backoffOpts);
        this.log('warn', `Sunucu hatası ${resp.status}; ${ms}ms sonra tekrar...`);
        await this.wait(ms);
        continue;
      }

      // 2xx ve diğer 4xx → çağırana bırak
      return resp;
    }
  }
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/apiClient.test.js`
Expected: PASS (11 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/ApiClient.js test/apiClient.test.js
git commit -m "feat: ApiClient merkezi retry/rate-limit (429/202/5xx/network)"
```

---

## Task 6: DeleteEngine.js — cursor motoru + silme + kuyruk + dry-run (TDD)

**Files:**
- Create: `src/core/DeleteEngine.js`
- Test: `test/deleteEngine.test.js`

**Interfaces:**
- Consumes: `constants.API_BASE`, `filters.filterMessages`, `snowflake.oldestId`, bir `ApiClient` örneği (veya uyumlu `{request()}`)
- Produces:
  - `class DeleteEngine` — ctor `{ api, wait, log?, options?, onProgress?, onStart?, onStop?, onJobStart?, saveCheckpoint? }`
  - `engine.runQueue(jobs, { dryRun? }): Promise<{delCount,failCount,grandTotal}>` — job'ları **sıralı** işler
  - `engine.runCursorJob(job, { dryRun? })` — cursor sayfalama
  - `engine.deleteMessage(msg): Promise<'OK'|'FAILED'|'FAIL_SKIP'>`
  - `engine.stop()`
  - `engine.state = { running, delCount, failCount, grandTotal, dryRun, currentJob, before, lastProgressTs }`
  - **job şekli:** `{ channelId, guildId?, filters?, before?, label? }`

- [ ] **Step 1: Failing test yaz**

`test/deleteEngine.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteEngine } from '../src/core/DeleteEngine.js';

const makeResp = (status, body = {}) => ({
  status, ok: status >= 200 && status < 300,
  async json() { return body; },
  async text() { return JSON.stringify(body); },
});

const m = (id, over = {}) => ({
  id: String(id), type: 0, pinned: false, channel_id: 'c',
  author: { id: 'me' }, content: 'x', attachments: [], embeds: [], ...over,
});

// Sahte api: handler({url, method}) => resp
function fakeApi(handler) {
  const calls = [];
  return {
    calls,
    async request(url, opts = {}) {
      const method = opts.method || 'GET';
      calls.push({ url, method });
      return handler({ url, method });
    },
  };
}

const engineWith = (api, over = {}) => new DeleteEngine({
  api,
  wait: async () => {},
  options: { deleteDelay: 0, searchDelay: 0 },
  ...over,
});

test('cursor iki sayfayı gezer, hepsini siler, <100 sayfada durur', async () => {
  const page1 = Array.from({ length: 100 }, (_, k) => m(200 - k)); // id 200..101
  const page2 = [m(100), m(99)];
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!url.includes('before=')) return makeResp(200, page1);
    if (url.includes('before=101')) return makeResp(200, page2);
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 102);
  const deletes = api.calls.filter(c => c.method === 'DELETE');
  assert.equal(deletes.length, 102);
  // ikinci sayfa isteği before=101 içermeli (oldestId(page1))
  const gets = api.calls.filter(c => c.method === 'GET');
  assert.ok(gets[1].url.includes('before=101'));
});

test('boş sayfada durur (yanlış "bitti" yok — gerçekten boş)', async () => {
  const api = fakeApi(() => makeResp(200, []));
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: {} }]);
  assert.equal(res.delCount, 0);
});

test('sadece authorId eşleşen mesajları siler', async () => {
  const page = [m(3, { author: { id: 'me' } }), m(2, { author: { id: 'other' } }), m(1, { author: { id: 'me' } })];
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); } // 3<100 → tek sayfa
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 2); // yalnız 'me' olan 2 mesaj
});

test('dry-run sayar ama silmez', async () => {
  const page = [m(2), m(1)];
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); }
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }], { dryRun: true });
  assert.equal(res.grandTotal, 2);
  assert.equal(api.calls.filter(c => c.method === 'DELETE').length, 0);
});

test('stop() sırasında durur', async () => {
  const page = Array.from({ length: 100 }, (_, k) => m(200 - k));
  let served = false;
  const api = fakeApi(({ method }) => {
    if (method === 'DELETE') return makeResp(204);
    if (!served) { served = true; return makeResp(200, page); }
    return makeResp(200, []);
  });
  let engine;
  engine = engineWith(api, {
    onProgress: () => { engine.stop(); }, // ilk ilerlemede dur
  });
  const res = await engine.runQueue([{ channelId: 'c', filters: { authorId: 'me' } }]);
  assert.equal(res.delCount, 1);
});

test('401 job\'u durdurur', async () => {
  const api = fakeApi(() => makeResp(401, { message: 'unauthorized' }));
  const engine = engineWith(api);
  const res = await engine.runQueue([{ channelId: 'c', filters: {} }]);
  assert.equal(res.delCount, 0);
  assert.equal(engine.state.running, false);
});

test('deleteMessage 404\'ü başarı sayar (zaten silinmiş)', async () => {
  const api = fakeApi(() => makeResp(404));
  const engine = engineWith(api);
  const r = await engine.deleteMessage(m(1));
  assert.equal(r, 'OK');
  assert.equal(engine.state.delCount, 1);
});

test('deleteMessage arşivli thread (400/50083) FAIL_SKIP döner', async () => {
  const api = fakeApi(() => makeResp(400, { code: 50083 }));
  const engine = engineWith(api);
  const r = await engine.deleteMessage(m(1));
  assert.equal(r, 'FAIL_SKIP');
  assert.equal(engine.state.failCount, 1);
});

test('runQueue birden çok job\'u sıralı işler', async () => {
  const served = {};
  const api = fakeApi(({ url, method }) => {
    if (method === 'DELETE') return makeResp(204);
    const ch = url.match(/channels\/(\w+)\//)[1];
    if (!served[ch]) { served[ch] = true; return makeResp(200, [m(2, { channel_id: ch }), m(1, { channel_id: ch })]); }
    return makeResp(200, []);
  });
  const engine = engineWith(api);
  const res = await engine.runQueue([
    { channelId: 'aaa', filters: { authorId: 'me' } },
    { channelId: 'bbb', filters: { authorId: 'me' } },
  ]);
  assert.equal(res.delCount, 4);
  assert.ok(api.calls.some(c => c.url.includes('channels/aaa/')));
  assert.ok(api.calls.some(c => c.url.includes('channels/bbb/')));
});
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/deleteEngine.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: DeleteEngine.js yaz**

`src/core/DeleteEngine.js`:
```js
import { API_BASE } from '../discord/constants.js';
import { filterMessages } from './filters.js';
import { oldestId } from './snowflake.js';

const noop = () => {};

export class DeleteEngine {
  constructor({ api, wait, log = noop, options = {}, onProgress = noop, onStart = noop, onStop = noop, onJobStart = noop, saveCheckpoint = noop }) {
    this.api = api;
    this.wait = wait;
    this.log = log;
    this.onProgress = onProgress;
    this.onStart = onStart;
    this.onStop = onStop;
    this.onJobStart = onJobStart;
    this.saveCheckpoint = saveCheckpoint;
    this.options = { deleteDelay: 1000, searchDelay: 1000, ...options };
    this.resetState();
  }

  resetState() {
    this.state = {
      running: false, delCount: 0, failCount: 0, grandTotal: 0,
      dryRun: false, currentJob: null, before: undefined, lastProgressTs: Date.now(),
    };
  }

  stop() {
    this.state.running = false;
    this.onStop(this.state);
  }

  markProgress() {
    this.state.lastProgressTs = Date.now();
    this.onProgress(this.state);
  }

  /** Job'ları sıralı işleyen kuyruk. */
  async runQueue(jobs, { dryRun = false } = {}) {
    this.resetState();
    this.state.running = true;
    this.state.dryRun = dryRun;
    this.onStart(this.state);

    for (const job of jobs) {
      if (!this.state.running) break;
      this.state.currentJob = job;
      this.state.before = job.before || undefined;
      this.onJobStart(job, this.state);
      try {
        await this.runCursorJob(job, { dryRun });
      } catch (err) {
        if (err?.name === 'AbortError') { this.log('warn', 'İptal edildi.'); break; }
        this.log('error', `Job hatası: ${err?.message || err}`);
      }
    }

    this.state.running = false;
    this.onStop(this.state);
    return { delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal };
  }

  /** Cursor sayfalama — DM/tek kanal için indeksten bağımsız ve deterministik. */
  async runCursorJob(job, { dryRun = false } = {}) {
    let before = job.before || undefined;

    while (this.state.running) {
      const url = `${API_BASE}/channels/${job.channelId}/messages?limit=100` + (before ? `&before=${before}` : '');

      let resp;
      try {
        resp = await this.api.request(url);
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        this.log('error', `Sayfa çekilemedi: ${err?.message || err}`);
        return;
      }

      if (resp.status === 401 || resp.status === 403) {
        this.log('error', `Yetki hatası (${resp.status}). Token geçersiz olabilir.`);
        this.stop();
        return;
      }
      if (!resp.ok) {
        this.log('error', `Beklenmeyen durum ${resp.status}; bu job atlanıyor.`);
        return;
      }

      const page = await resp.json();
      if (!Array.isArray(page) || page.length === 0) break; // kanalın başı → gerçekten bitti

      const { toDelete } = filterMessages(page, job.filters || {});
      this.state.grandTotal += toDelete.length;

      if (dryRun) {
        this.markProgress();
      } else {
        for (const msg of toDelete) {
          if (!this.state.running) return;
          await this.deleteMessage(msg);
          this.markProgress();
          await this.wait(this.options.deleteDelay);
        }
      }

      before = oldestId(page);
      this.state.before = before;
      this.saveCheckpoint({
        job, before,
        delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal,
      });

      if (page.length < 100) break; // son (kısmi) sayfa işlendi → bitti
      await this.wait(this.options.searchDelay);
    }
  }

  /** Tek mesajı sil. Retry ApiClient'te merkezî olduğundan burada RETRY döngüsü yok. */
  async deleteMessage(msg) {
    let resp;
    try {
      resp = await this.api.request(`${API_BASE}/channels/${msg.channel_id}/messages/${msg.id}`, { method: 'DELETE' });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      this.state.failCount++;
      return 'FAILED';
    }

    if (resp.ok || resp.status === 404) { // 404 = zaten yok
      this.state.delCount++;
      return 'OK';
    }

    let body = null;
    try { body = await resp.json(); } catch { /* yoksay */ }

    if (resp.status === 400 && body?.code === 50083) { // arşivli thread
      this.state.failCount++;
      return 'FAIL_SKIP';
    }

    this.log('error', `Silme hatası ${resp.status} (id ${msg.id}).`);
    this.state.failCount++;
    return 'FAILED';
  }
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/deleteEngine.test.js`
Expected: PASS (9 test).

- [ ] **Step 5: Tüm testleri çalıştır (regresyon)**

Run: `npm test`
Expected: Tüm dosyalar PASS (snowflake, backoff, filters, apiClient, deleteEngine).

- [ ] **Step 6: Commit**

```bash
git add src/core/DeleteEngine.js test/deleteEngine.test.js
git commit -m "feat: DeleteEngine cursor motoru + silme + kuyruk + dry-run"
```

---

## Task 7: DmDiscovery.js — DM listesi (TDD, fake api)

**Files:**
- Create: `src/core/DmDiscovery.js`
- Test: `test/dmDiscovery.test.js`

**Interfaces:**
- Consumes: `constants.API_BASE/CHANNEL_TYPE`, `snowflake.snowflakeToDate`, `ApiClient`
- Produces:
  - `dmName(channel): string`, `dmIcon(channel): string|null`, `mapDmChannel(channel): DmRow`
  - `listDms(api): Promise<DmRow[]>` — `DmRow = { id, type, name, icon, lastMessageId, lastTime }`, son mesaja göre azalan sıralı

- [ ] **Step 1: Failing test yaz**

`test/dmDiscovery.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/dmDiscovery.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: DmDiscovery.js yaz**

`src/core/DmDiscovery.js`:
```js
import { API_BASE, CHANNEL_TYPE } from '../discord/constants.js';
import { snowflakeToDate } from './snowflake.js';

export function dmName(channel) {
  if (channel.type === CHANNEL_TYPE.GROUP_DM) {
    if (channel.name) return channel.name;
    const names = (channel.recipients || []).map(r => r.global_name || r.username).filter(Boolean);
    return names.length ? names.join(', ') : 'Grup DM';
  }
  const r = (channel.recipients || [])[0];
  return r ? (r.global_name || r.username || 'Bilinmeyen') : 'Bilinmeyen';
}

export function dmIcon(channel) {
  if (channel.type === CHANNEL_TYPE.GROUP_DM) {
    return channel.icon
      ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
      : null;
  }
  const r = (channel.recipients || [])[0];
  return r?.avatar ? `https://cdn.discordapp.com/avatars/${r.id}/${r.avatar}.png?size=64` : null;
}

export function mapDmChannel(c) {
  return {
    id: c.id,
    type: c.type,
    name: dmName(c),
    icon: dmIcon(c),
    lastMessageId: c.last_message_id || null,
    lastTime: c.last_message_id ? snowflakeToDate(c.last_message_id) : null,
  };
}

function cmpSnowDesc(a, b) {
  const av = a ? BigInt(a) : 0n;
  const bv = b ? BigInt(b) : 0n;
  return av < bv ? 1 : av > bv ? -1 : 0;
}

export async function listDms(api) {
  const resp = await api.request(`${API_BASE}/users/@me/channels`);
  if (!resp.ok) throw new Error(`DM listesi alınamadı: ${resp.status}`);
  const channels = await resp.json();
  return channels
    .filter(c => c.type === CHANNEL_TYPE.DM || c.type === CHANNEL_TYPE.GROUP_DM)
    .map(mapDmChannel)
    .sort((a, b) => cmpSnowDesc(a.lastMessageId, b.lastMessageId));
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/dmDiscovery.test.js`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/DmDiscovery.js test/dmDiscovery.test.js
git commit -m "feat: DmDiscovery (canli /users/@me/channels listesi)"
```

---

## Task 8: Checkpoint.js — localStorage kalıcılık (TDD, fake storage)

**Files:**
- Create: `src/core/Checkpoint.js`
- Test: `test/checkpoint.test.js`

**Interfaces:**
- Consumes: `Storage` uyumlu bir nesne (`getItem/setItem/removeItem`)
- Produces: `class Checkpoint` — `save(state)`, `load(): object|null`, `clear()`

- [ ] **Step 1: Failing test yaz**

`test/checkpoint.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/checkpoint.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: Checkpoint.js yaz**

`src/core/Checkpoint.js`:
```js
export class Checkpoint {
  constructor(storage, key = 'purgecord:state') {
    this.storage = storage;
    this.key = key;
  }
  save(state) {
    try { this.storage.setItem(this.key, JSON.stringify(state)); } catch { /* kota/erişim */ }
  }
  load() {
    try {
      const s = this.storage.getItem(this.key);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  clear() {
    try { this.storage.removeItem(this.key); } catch { /* yoksay */ }
  }
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/checkpoint.test.js`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/core/Checkpoint.js test/checkpoint.test.js
git commit -m "feat: Checkpoint localStorage kaliciligi"
```

---

## Task 9: Watchdog.js — stall tespiti (TDD, enjekte edilen saat/timer)

**Files:**
- Create: `src/core/Watchdog.js`
- Test: `test/watchdog.test.js`

**Interfaces:**
- Consumes: —
- Produces: `class Watchdog` — ctor `{ getLastProgress, isRunning, onStall, stallMs?, now?, setIntervalImpl?, clearIntervalImpl? }`; `start()`, `check()`, `stop()`

- [ ] **Step 1: Failing test yaz**

`test/watchdog.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/watchdog.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: Watchdog.js yaz**

`src/core/Watchdog.js`:
```js
export class Watchdog {
  constructor({ getLastProgress, isRunning, onStall, stallMs = 90000, now = () => Date.now(), setIntervalImpl = setInterval, clearIntervalImpl = clearInterval }) {
    this.getLastProgress = getLastProgress;
    this.isRunning = isRunning;
    this.onStall = onStall;
    this.stallMs = stallMs;
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.timer = null;
  }

  start() {
    this.stop();
    const period = Math.max(1000, Math.floor(this.stallMs / 3));
    this.timer = this.setIntervalImpl(() => this.check(), period);
    return this;
  }

  check() {
    if (!this.isRunning()) return;
    if (this.now() - this.getLastProgress() > this.stallMs) {
      this.onStall();
    }
  }

  stop() {
    if (this.timer != null) {
      this.clearIntervalImpl(this.timer);
      this.timer = null;
    }
  }
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/watchdog.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Tüm testleri çalıştır**

Run: `npm test`
Expected: Hepsi PASS (snowflake, backoff, filters, apiClient, deleteEngine, dmDiscovery, checkpoint, watchdog).

- [ ] **Step 6: Commit**

```bash
git add src/core/Watchdog.js test/watchdog.test.js
git commit -m "feat: Watchdog stall tespiti + otomatik devam kancasi"
```

---

## Task 10: token.js — token/authorId/URL id edinimi

**Files:**
- Create: `src/discord/token.js`
- Test: `test/token.test.js` (yalnız saf `parseIdsFromUrl`)

**Interfaces:**
- Consumes: `window`, `document`, `location` (tarayıcı); undiscord webpack yöntemi
- Produces:
  - `parseIdsFromUrl(href?): { guildId, channelId }` (saf)
  - `getToken(): string` (DOM/webpack — manuel)
  - `getAuthorId(): string` (DOM — manuel)

- [ ] **Step 1: Saf fonksiyon için failing test yaz**

`test/token.test.js`:
```js
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
```

> Not: `getToken`/`getAuthorId` DOM ve Discord webpack'ine bağlı olduğundan burada birim-test edilmez; Task 15 manuel kontrol listesinde doğrulanır. `token.js` modülünü Node'da import etmek güvenlidir (DOM'a yalnız fonksiyon gövdelerinde erişilir).

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/token.test.js`
Expected: FAIL — modül yok.

- [ ] **Step 3: token.js yaz**

`src/discord/token.js`:
```js
/** URL'den guild/channel id'lerini çıkarır (saf). */
export function parseIdsFromUrl(href = (typeof location !== 'undefined' ? location.href : '')) {
  const m = String(href).match(/channels\/([\w@]+)\/(\d+)/);
  return m ? { guildId: m[1], channelId: m[2] } : { guildId: null, channelId: null };
}

/** Auth token'ı localStorage (iframe) veya webpack üzerinden alır (undiscord yöntemi). */
export function getToken() {
  // 1) iframe localStorage
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.token;
    iframe.remove();
    if (raw) return JSON.parse(raw);
  } catch { /* webpack fallback'e düş */ }

  // 2) webpack fallback
  try {
    const modules = [];
    window.webpackChunkdiscord_app.push([['purgecord'], {}, (e) => {
      for (const c in e.c) modules.push(e.c[c]);
    }]);
    const mod = modules.find(m => m?.exports?.default?.getToken !== undefined);
    if (mod) return mod.exports.default.getToken();
  } catch { /* düştü */ }

  return '';
}

/** Kullanıcının kendi id'sini localStorage'dan alır. */
export function getAuthorId() {
  try {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const raw = iframe.contentWindow.localStorage.user_id_cache;
    iframe.remove();
    return raw ? JSON.parse(raw) : '';
  } catch { return ''; }
}
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/token.test.js`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/discord/token.js test/token.test.js
git commit -m "feat: token/authorId/URL id edinimi"
```

---

## Task 11: styles.css.js + template.html.js — panel görünümü (statik)

**Files:**
- Modify: `src/ui/styles.css.js` (Task 1 stub'unu değiştir)
- Create: `src/ui/template.html.js`

**Interfaces:**
- Consumes: —
- Produces: `styles` (CSS string), `buttonHtml` (string), `panelHtml` (string)

> Bu görev statik varlık üretir; birim test yok. Task 15 manuel kontrol listesinde görsel doğrulanır. Adım sonunda `npm run build` kırılmamalı.

- [ ] **Step 1: styles.css.js yaz** (stub'u değiştir)

`src/ui/styles.css.js`:
```js
export const styles = `
#purgecord-btn { display:flex; align-items:center; justify-content:center; width:24px; height:24px; margin:0 8px; cursor:pointer; color:var(--interactive-normal,#b5bac1); flex:0 0 auto; }
#purgecord-btn:hover { color:var(--interactive-hover,#dbdee1); }
#purgecord-btn.is-running { color:var(--status-danger,#f23f43); }

#purgecord { position:fixed; z-index:1000; top:60px; right:20px; width:720px; height:78vh; min-width:480px; min-height:420px; display:flex; flex-direction:column; background:var(--background-primary,#313338); color:var(--text-normal,#dbdee1); border:1px solid var(--background-tertiary,#1e1f22); border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,.5); overflow:hidden; font-family:var(--font-primary,'gg sans',sans-serif); }
#purgecord[hidden]{ display:none; }
#purgecord *, #purgecord *::before { box-sizing:border-box; }

.pc-header { display:flex; align-items:center; gap:10px; height:48px; padding:0 14px; background:var(--background-secondary,#2b2d31); cursor:grab; user-select:none; }
.pc-logo { font-weight:700; font-size:15px; }
.pc-sub { font-size:12px; color:var(--text-muted,#949ba4); }
.pc-spacer { flex:1; }
.pc-icon-btn { background:none; border:none; color:var(--interactive-normal,#b5bac1); font-size:16px; cursor:pointer; padding:6px; border-radius:4px; }
.pc-icon-btn:hover { background:var(--background-modifier-hover,rgba(255,255,255,.06)); color:#fff; }

.pc-tabs { display:flex; gap:2px; padding:8px 10px 0; background:var(--background-secondary,#2b2d31); }
.pc-tab { padding:8px 14px; background:none; border:none; border-radius:6px 6px 0 0; color:var(--text-muted,#949ba4); font-size:13px; font-weight:600; cursor:pointer; }
.pc-tab:hover { color:var(--interactive-hover,#dbdee1); }
.pc-tab.is-active { color:#fff; background:var(--background-primary,#313338); }

.pc-body { flex:1; overflow:auto; padding:14px; }
.pc-view[hidden]{ display:none; }

.pc-field { margin-bottom:14px; }
.pc-field > label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; color:var(--header-secondary,#b5bac1); margin-bottom:6px; letter-spacing:.02em; }
.pc-row { display:flex; gap:6px; align-items:center; }
.pc-input, #purgecord input[type=text], #purgecord input[type=search], #purgecord input[type=datetime-local] { width:100%; height:38px; padding:0 10px; background:var(--input-background,#1e1f22); border:1px solid transparent; border-radius:6px; color:var(--text-normal,#dbdee1); font-size:14px; }
.pc-input:focus { border-color:var(--brand-experiment,#5865f2); outline:none; }
.pc-check { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-normal,#dbdee1); margin:6px 0; cursor:pointer; font-weight:400; }
.pc-hint { font-size:12px; color:var(--text-muted,#949ba4); margin:6px 0; }

.pc-btn { height:36px; padding:0 16px; border:none; border-radius:6px; background:var(--button-secondary-background,#4e5058); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.pc-btn:hover { filter:brightness(1.1); }
.pc-btn:disabled { opacity:.4; cursor:not-allowed; }
.pc-btn.pc-danger { background:var(--button-danger-background,#da373c); }
.pc-btn.pc-small { height:30px; padding:0 10px; font-size:12px; }

.pc-details { border-top:1px solid var(--background-modifier-accent,rgba(255,255,255,.06)); margin-top:10px; padding-top:10px; }
.pc-details > summary { cursor:pointer; font-size:13px; font-weight:600; color:var(--header-secondary,#b5bac1); }

.pc-footer { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--background-secondary,#2b2d31); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-progress { flex:1; height:8px; background:var(--background-tertiary,#1e1f22); border-radius:4px; overflow:hidden; }
.pc-progress-bar { height:100%; width:0; background:var(--brand-experiment,#5865f2); transition:width .2s; }
.pc-progress-bar.is-indeterminate { width:30%; animation:pc-indet 1.2s infinite ease-in-out; }
@keyframes pc-indet { 0%{margin-left:-30%} 100%{margin-left:100%} }
.pc-percent { font-size:12px; color:var(--text-muted,#949ba4); min-width:130px; text-align:right; }

#pc-log { margin:0; font-family:Consolas,'Courier New',monospace; font-size:12px; white-space:pre-wrap; word-break:break-word; }
.pc-log-line { margin:2px 0; }
.pc-log-info{color:#00a8fc} .pc-log-verb{color:#949ba4} .pc-log-warn{color:#f0b232} .pc-log-error{color:#f23f43} .pc-log-success{color:#23a559} .pc-log-debug{color:var(--text-normal,#dbdee1)}

.pc-dm-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
.pc-dm-count { font-size:12px; color:var(--text-muted,#949ba4); margin-left:auto; }
.pc-dm-modes { display:flex; gap:14px; font-size:13px; flex-wrap:wrap; }
.pc-dm-list { display:flex; flex-direction:column; gap:2px; }
.pc-dm-row { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:6px; cursor:pointer; }
.pc-dm-row:hover { background:var(--background-modifier-hover,rgba(255,255,255,.04)); }
.pc-dm-avatar { width:32px; height:32px; border-radius:50%; background:var(--background-tertiary,#1e1f22); flex:0 0 auto; object-fit:cover; }
.pc-dm-meta { flex:1; min-width:0; }
.pc-dm-name { font-size:14px; color:var(--text-normal,#f2f3f5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pc-dm-time { font-size:11px; color:var(--text-muted,#949ba4); }
.pc-badge { font-size:10px; padding:1px 6px; border-radius:10px; background:var(--background-tertiary,#1e1f22); color:var(--text-muted,#949ba4); text-transform:uppercase; }

.pc-focus { display:flex; align-items:center; gap:10px; padding:8px 14px; background:var(--background-secondary-alt,#232428); border-top:1px solid var(--background-tertiary,#1e1f22); }
.pc-focus[hidden]{ display:none; }
.pc-focus .pc-dm-avatar { width:28px; height:28px; }
.pc-focus-name { font-size:13px; font-weight:600; }
.pc-focus-prog { font-size:11px; color:var(--text-muted,#949ba4); }

.pc-banner { display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(240,178,50,.12); border-bottom:1px solid var(--background-tertiary,#1e1f22); font-size:13px; }
.pc-banner[hidden]{ display:none; }

.pc-resize { position:absolute; right:2px; bottom:2px; width:16px; height:16px; cursor:nwse-resize; opacity:.5; background:linear-gradient(135deg,transparent 50%,var(--text-muted,#949ba4) 50%); border-radius:0 0 6px 0; }

#purgecord.pc-redact .pc-priv { filter:blur(5px); transition:filter .1s; }
#purgecord.pc-redact .pc-priv:hover { filter:none; }
`;
```

- [ ] **Step 2: template.html.js yaz**

`src/ui/template.html.js`:
```js
export const buttonHtml = `
<div id="purgecord-btn" role="button" tabindex="0" aria-label="Purgecord" title="Purgecord — toplu mesaj sil">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
    <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
  </svg>
</div>`;

export const panelHtml = `
<div id="purgecord" class="pc-panel pc-redact" hidden>
  <header class="pc-header" data-drag>
    <span class="pc-logo">🗑️ Purgecord</span>
    <span class="pc-sub">Toplu mesaj & DM silici</span>
    <span class="pc-spacer"></span>
    <label class="pc-check" title="Ekran paylaşımı için gizle"><input type="checkbox" data-el="redact" checked> Streamer</label>
    <button class="pc-icon-btn" data-action="close" title="Kapat">✕</button>
  </header>

  <div class="pc-banner" data-el="resumeBanner" hidden>
    <span data-el="resumeText"></span>
    <span class="pc-spacer"></span>
    <button class="pc-btn pc-small" data-action="resume">Devam et</button>
    <button class="pc-btn pc-small" data-action="discard">Vazgeç</button>
  </div>

  <nav class="pc-tabs">
    <button class="pc-tab is-active" data-tab="channel">Kanal / Sunucu</button>
    <button class="pc-tab" data-tab="dm">Toplu DM</button>
    <button class="pc-tab" data-tab="log">Log</button>
  </nav>

  <div class="pc-body">
    <section class="pc-view" data-view="channel">
      <div class="pc-field"><label>Author ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="authorId" type="text" placeholder="Silinecek mesajların yazarı">
        <button class="pc-btn pc-small" data-action="fillAuthor">ben</button></div></div>
      <div class="pc-field"><label>Server ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="guildId" type="text" placeholder="@me = DM">
        <button class="pc-btn pc-small" data-action="fillGuild">mevcut</button></div></div>
      <div class="pc-field"><label>Channel ID</label>
        <div class="pc-row"><input class="pc-input pc-priv" data-el="channelId" type="text" placeholder="Kanal/DM id (virgülle çoklu)">
        <button class="pc-btn pc-small" data-action="fillChannel">mevcut</button></div></div>

      <details class="pc-details"><summary>Filtreler</summary>
        <div class="pc-field" style="margin-top:10px"><label>İçerik</label>
          <input class="pc-input pc-priv" data-el="content" type="text" placeholder="Bu metni içerenler"></div>
        <label class="pc-check"><input type="checkbox" data-el="hasLink"> Link içeren</label>
        <label class="pc-check"><input type="checkbox" data-el="hasFile"> Dosya içeren</label>
        <label class="pc-check"><input type="checkbox" data-el="includePinned"> Sabitlenmişleri de sil</label>
        <div class="pc-field" style="margin-top:10px"><label>Regex</label>
          <input class="pc-input pc-priv" data-el="pattern" type="text" placeholder="düzenli ifade (i)"></div>
      </details>

      <details class="pc-details"><summary>Tarih / mesaj aralığı</summary>
        <div class="pc-field" style="margin-top:10px"><label>Sonrası (After)</label>
          <input class="pc-input" data-el="minDate" type="datetime-local"></div>
        <div class="pc-field"><label>Öncesi (Before)</label>
          <input class="pc-input" data-el="maxDate" type="datetime-local"></div>
        <div class="pc-field"><label>min ID / max ID</label>
          <div class="pc-row"><input class="pc-input pc-priv" data-el="minId" type="text" placeholder="min id">
          <input class="pc-input pc-priv" data-el="maxId" type="text" placeholder="max id"></div></div>
      </details>

      <details class="pc-details"><summary>Gelişmiş</summary>
        <div class="pc-field" style="margin-top:10px"><label>Silme gecikmesi: <span data-el="deleteDelayVal">1000</span>ms</label>
          <input data-el="deleteDelay" type="range" min="500" max="10000" step="50" value="1000" style="width:100%"></div>
        <div class="pc-field"><label>Sayfa gecikmesi: <span data-el="searchDelayVal">1000</span>ms</label>
          <input data-el="searchDelay" type="range" min="0" max="10000" step="50" value="1000" style="width:100%"></div>
        <div class="pc-field"><label>Token</label>
          <div class="pc-row"><input class="pc-input pc-priv" data-el="token" type="text" placeholder="otomatik doldurulur">
          <button class="pc-btn pc-small" data-action="fillToken">doldur</button></div></div>
      </details>
    </section>

    <section class="pc-view" data-view="dm" hidden>
      <div class="pc-dm-toolbar">
        <button class="pc-btn pc-small" data-action="loadDms">DM'leri yükle</button>
        <input class="pc-input pc-priv" data-el="dmSearch" type="search" placeholder="Ara..." style="max-width:180px">
        <span class="pc-dm-count" data-el="dmCount">0 seçili</span>
      </div>
      <div class="pc-dm-modes">
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="only" checked> Sadece seçilenleri sil</label>
        <label class="pc-check"><input type="radio" name="pc-dm-mode" value="except"> Seçilenler hariç hepsini sil</label>
      </div>
      <div class="pc-dm-modes" style="margin:6px 0">
        <label class="pc-check"><input type="checkbox" data-el="dmSelectAll"> Tümünü seç</label>
        <label class="pc-check"><input type="checkbox" data-el="followDm"> DM'i Discord'da takip et</label>
      </div>
      <div class="pc-hint">DM modunda yalnız <b>kendi</b> mesajların silinir. Kanal sekmesindeki filtreler burada da uygulanır.</div>
      <div class="pc-dm-list" data-el="dmList"></div>
    </section>

    <section class="pc-view" data-view="log" hidden><pre id="pc-log"></pre></section>
  </div>

  <div class="pc-focus" data-el="focus" hidden>
    <img class="pc-dm-avatar pc-priv" data-el="focusAvatar" alt="">
    <div><div class="pc-focus-name pc-priv" data-el="focusName">—</div>
    <div class="pc-focus-prog" data-el="focusProg"></div></div>
  </div>

  <footer class="pc-footer">
    <button class="pc-btn pc-danger" data-action="start">▶ Sil</button>
    <button class="pc-btn" data-action="dry">Sadece say</button>
    <button class="pc-btn" data-action="stop" disabled>⏸ Durdur</button>
    <div class="pc-progress"><div class="pc-progress-bar" data-el="progressBar"></div></div>
    <span class="pc-percent" data-el="percent"></span>
  </footer>

  <div class="pc-resize" data-resize></div>
</div>`;
```

- [ ] **Step 3: Build kırılmadı mı kontrol et**

Run: `npm run build`
Expected: Hata yok, `dist/...user.js` güncellenir (henüz kullanılmıyor ama import edilebilir olmalı).

- [ ] **Step 4: Commit**

```bash
git add src/ui/styles.css.js src/ui/template.html.js
git commit -m "feat: panel CSS + HTML sablonu (sekmeli modern UI)"
```

---

## Task 12: DragResize.js — sürükle/boyutlandır

**Files:**
- Create: `src/ui/DragResize.js`

**Interfaces:**
- Consumes: `window`, `document`
- Produces: `makeDraggable(panel, handle)`, `makeResizable(panel, handle)`

> DOM davranışı; birim test yok, Task 15'te manuel doğrulanır.

- [ ] **Step 1: DragResize.js yaz**

`src/ui/DragResize.js`:
```js
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function makeDraggable(panel, handle) {
  let sx, sy, st, sl;
  const onMove = (e) => {
    const t = clamp(st + (e.clientY - sy), 0, window.innerHeight - 40);
    const l = clamp(sl + (e.clientX - sx), -panel.offsetWidth + 80, window.innerWidth - 80);
    panel.style.top = t + 'px';
    panel.style.left = l + 'px';
    panel.style.right = 'auto';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; st = r.top; sl = r.left;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function makeResizable(panel, handle) {
  let sx, sy, sw, sh;
  const onMove = (e) => {
    panel.style.width = Math.max(480, sw + (e.clientX - sx)) + 'px';
    panel.style.height = Math.max(420, sh + (e.clientY - sy)) + 'px';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    sx = e.clientX; sy = e.clientY; sw = panel.offsetWidth; sh = panel.offsetHeight;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/DragResize.js
git commit -m "feat: panel surukle/boyutlandir"
```

---

## Task 13: ui.js — panel kabuğu, sekmeler, log, kanal silme akışı

**Files:**
- Create: `src/ui/ui.js`

**Interfaces:**
- Consumes: `styles`, `buttonHtml`, `panelHtml`, `makeDraggable/makeResizable`, `ApiClient`, `DeleteEngine`, `Checkpoint`, `Watchdog`, `getToken/getAuthorId/parseIdsFromUrl`
- Produces:
  - `initUI(): void` — CSS enjekte eder, butonu+paneli kurar, sekmeleri ve kanal silme akışını bağlar.
  - `ctx` (dahili) — DM sekmesi (Task 14) için paylaşılan bağlam: `{ panel, el, log, buildApi, makeEngine, getFilters, startWatchdog, setRunningUI, renderProgress, switchTab, checkpoint, getEngine, setEngine, runDm }`

> DOM/fetch davranışı; birim test yok, Task 15 manuel kontrol listesinde doğrulanır.

- [ ] **Step 1: ui.js yaz**

`src/ui/ui.js`:
```js
import { styles } from './styles.css.js';
import { buttonHtml, panelHtml } from './template.html.js';
import { makeDraggable, makeResizable } from './DragResize.js';
import { ApiClient } from '../core/ApiClient.js';
import { DeleteEngine } from '../core/DeleteEngine.js';
import { Checkpoint } from '../core/Checkpoint.js';
import { Watchdog } from '../core/Watchdog.js';
import { getToken, getAuthorId, parseIdsFromUrl } from '../discord/token.js';

// ---- küçük yardımcılar ----
function insertCss(css) {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
}
function createEl(html) {
  const t = document.createElement('div');
  t.innerHTML = html.trim();
  return t.firstElementChild;
}
function findToolbar() {
  return document.querySelector('#app-mount [class*="toolbar_"]') ||
         document.querySelector('#app-mount [class*="-toolbar"]');
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initUI() {
  insertCss(styles);

  const panel = createEl(panelHtml);
  document.body.appendChild(panel);
  const btn = createEl(buttonHtml);

  const el = (name) => panel.querySelector(`[data-el="${name}"]`);
  const on = (action, fn) => panel.querySelectorAll(`[data-action="${action}"]`).forEach((b) => b.addEventListener('click', fn));

  // --- log ---
  const logEl = panel.querySelector('#pc-log');
  function log(type, ...args) {
    const line = document.createElement('div');
    line.className = `pc-log-line pc-log-${type}`;
    line.textContent = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    logEl.appendChild(line);
    logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
    if (type === 'error') console.error('[purgecord]', ...args);
  }

  // --- buton mount + yeniden-mount ---
  function mountBtn() {
    const tb = findToolbar();
    if (tb && !tb.contains(btn)) tb.prepend(btn);
  }
  mountBtn();
  const appRoot = document.querySelector('#app-mount') || document.body;
  let throttle = null;
  new MutationObserver(() => {
    if (throttle) return;
    throttle = setTimeout(() => { throttle = null; if (!appRoot.contains(btn)) mountBtn(); }, 2000);
  }).observe(appRoot, { childList: true, subtree: true });

  function togglePanel(force) {
    const show = force !== undefined ? force : panel.hidden;
    panel.hidden = !show;
    btn.style.color = show ? 'var(--interactive-active,#fff)' : '';
  }
  btn.addEventListener('click', () => togglePanel());
  on('close', () => togglePanel(false));

  // --- drag / resize / sekmeler ---
  makeDraggable(panel, panel.querySelector('[data-drag]'));
  makeResizable(panel, panel.querySelector('[data-resize]'));

  function switchTab(name) {
    panel.querySelectorAll('.pc-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    panel.querySelectorAll('.pc-view').forEach((v) => (v.hidden = v.dataset.view !== name));
  }
  panel.querySelectorAll('.pc-tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // --- redact ---
  el('redact').addEventListener('change', (e) => panel.classList.toggle('pc-redact', e.target.checked));

  // --- id/token doldurma ---
  on('fillAuthor', () => (el('authorId').value = getAuthorId()));
  on('fillGuild', () => {
    const { guildId, channelId } = parseIdsFromUrl();
    el('guildId').value = guildId || '';
    if (guildId === '@me' && channelId) el('channelId').value = channelId;
  });
  on('fillChannel', () => {
    const { guildId, channelId } = parseIdsFromUrl();
    el('channelId').value = channelId || '';
    el('guildId').value = guildId || '';
  });
  on('fillToken', () => {
    try { el('token').value = getToken(); }
    catch { log('error', 'Token otomatik alınamadı; elle girin.'); }
  });

  // --- gecikme slider'ları ---
  const bindSlider = (input, valSpan) => {
    const sync = () => (valSpan.textContent = input.value);
    input.addEventListener('input', sync);
    sync();
  };
  bindSlider(el('deleteDelay'), el('deleteDelayVal'));
  bindSlider(el('searchDelay'), el('searchDelayVal'));

  // --- çalışma zamanı durumu ---
  const checkpoint = new Checkpoint(localStorage);
  let engine = null;
  let watchdog = null;
  let abort = null;

  function buildApi() {
    abort = new AbortController();
    const token = el('token').value.trim() || (() => { try { return getToken(); } catch { return ''; } })();
    if (token && !el('token').value.trim()) el('token').value = token;
    const api = new ApiClient({
      token,
      fetchImpl: (u, o) => fetch(u, o),
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      signal: abort.signal,
      onThrottle: ({ ms }) => {
        if (engine && ms) {
          const next = Math.min(10000, Math.max(engine.options.deleteDelay, Math.round(ms)));
          if (next > engine.options.deleteDelay) {
            engine.options.deleteDelay = next;
            el('deleteDelay').value = next;
            el('deleteDelayVal').textContent = next;
          }
        }
      },
      log,
    });
    return { api, token };
  }

  function getFilters() {
    return {
      authorId: el('authorId').value.trim() || undefined,
      content: el('content').value.trim() || undefined,
      hasLink: el('hasLink').checked || undefined,
      hasFile: el('hasFile').checked || undefined,
      includePinned: el('includePinned').checked || undefined,
      pattern: el('pattern').value.trim() || undefined,
      minId: el('minId').value.trim() || undefined,
      maxId: el('maxId').value.trim() || undefined,
      minDate: el('minDate').value || undefined,
      maxDate: el('maxDate').value || undefined,
    };
  }

  function makeEngine(api) {
    const options = {
      deleteDelay: Math.max(500, +el('deleteDelay').value),
      searchDelay: +el('searchDelay').value,
    };
    engine = new DeleteEngine({
      api,
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      log,
      options,
      onStart: () => setRunningUI(true),
      onStop: () => { setRunningUI(false); watchdog?.stop(); },
      onProgress: (s) => renderProgress(s),
      onJobStart: (job) => ctx.onJobStart && ctx.onJobStart(job),
      saveCheckpoint: (data) => checkpoint.save({ ...data, ts: Date.now() }),
    });
    return engine;
  }

  function startWatchdog() {
    watchdog = new Watchdog({
      getLastProgress: () => (engine ? engine.state.lastProgressTs : Date.now()),
      isRunning: () => !!(engine && engine.state.running),
      onStall: () => log('warn', 'İlerleme durakladı; motor bir sonraki denemede kaldığı cursor\'dan sürdürür.'),
      stallMs: 90000,
    });
    watchdog.start();
  }

  function setRunningUI(running) {
    panel.querySelector('[data-action="start"]').disabled = running;
    panel.querySelector('[data-action="dry"]').disabled = running;
    panel.querySelector('[data-action="stop"]').disabled = !running;
    btn.classList.toggle('is-running', running);
    if (!running) el('focus').hidden = true;
  }

  function renderProgress(s) {
    const bar = el('progressBar');
    if (s.grandTotal > 0) {
      const val = s.delCount + s.failCount;
      const pct = Math.min(100, Math.round((val / Math.max(s.grandTotal, val)) * 100));
      bar.classList.remove('is-indeterminate');
      bar.style.width = pct + '%';
      el('percent').textContent = `${val}/${s.grandTotal} (${pct}%)`;
    } else {
      bar.classList.add('is-indeterminate');
      el('percent').textContent = `Silinen: ${s.delCount}`;
    }
    if (ctx.onProgress) ctx.onProgress(s);
  }

  // --- kanal silme akışı ---
  async function runChannel({ dryRun }) {
    const guildId = el('guildId').value.trim();
    const channelIds = el('channelId').value.trim().split(/\s*,\s*/).filter(Boolean);
    if (!channelIds.length) return log('error', 'Channel ID gerekli.');

    const { api, token } = buildApi();
    if (!token) return log('error', 'Token bulunamadı.');
    makeEngine(api);
    startWatchdog();

    const filters = getFilters();
    const jobs = channelIds.map((ch) => ({ channelId: ch, guildId, filters }));

    if (!dryRun && !window.confirm(`${channelIds.length} kanal/DM'de filtreye uyan mesajların silinecek. Devam?`)) {
      setRunningUI(false);
      return;
    }
    switchTab('log');
    log('info', dryRun ? 'Dry-run başladı (silme yok).' : 'Silme başladı.');
    await engine.runQueue(jobs, { dryRun });
    if (dryRun) log('success', `Dry-run bitti: ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
    else { log('success', `Bitti. Silinen: ${engine.state.delCount}, başarısız: ${engine.state.failCount}.`); checkpoint.clear(); }
  }

  // --- start/dry/stop dispatch (aktif sekmeye göre) ---
  function dispatch({ dryRun }) {
    const active = panel.querySelector('.pc-tab.is-active')?.dataset.tab;
    if (active === 'dm') {
      if (ctx.runDm) ctx.runDm({ dryRun });
      else log('error', 'DM sekmesi hazır değil.');
    } else {
      runChannel({ dryRun });
    }
  }
  on('start', () => dispatch({ dryRun: false }));
  on('dry', () => dispatch({ dryRun: true }));
  on('stop', () => { engine?.stop(); abort?.abort(); log('warn', 'Durduruldu.'); });

  // --- resume banner ---
  const saved = checkpoint.load();
  if (saved && saved.job) {
    el('resumeBanner').hidden = false;
    el('resumeText').textContent = `Yarım kalan iş var (${saved.delCount || 0} silindi). Devam edilsin mi?`;
    on('resume', async () => {
      el('resumeBanner').hidden = true;
      const { api, token } = buildApi();
      if (!token) return log('error', 'Token yok, devam edilemiyor.');
      makeEngine(api); startWatchdog();
      switchTab('log');
      await engine.runQueue([{ ...saved.job, before: saved.before }], { dryRun: false });
      log('success', 'Devam eden iş bitti.'); checkpoint.clear();
    });
    on('discard', () => { el('resumeBanner').hidden = true; checkpoint.clear(); });
  }

  // --- paylaşılan bağlam (Task 14 DM sekmesi kullanır) ---
  const ctx = {
    panel, el, log, buildApi, makeEngine, getFilters, startWatchdog,
    setRunningUI, renderProgress, switchTab, checkpoint,
    getEngine: () => engine,
    setEngine: (e) => { engine = e; },
    runDm: null,       // Task 14 doldurur
    onJobStart: null,  // Task 14 doldurur (focus kartı)
    onProgress: null,  // Task 14 doldurur (focus kartı ilerlemesi)
  };

  // Task 14: initDmTab(ctx);

  log('info', 'Purgecord hazır. Bir sekme seç ve başlat.');
  return ctx;
}
```

- [ ] **Step 2: Build kontrolü**

Run: `npm run build`
Expected: Hata yok (henüz `initUI` çağrılmıyor; Task 15'te main.js bağlayacak).

- [ ] **Step 3: Commit**

```bash
git add src/ui/ui.js
git commit -m "feat: UI kabugu + kanal silme akisi (sekmeler, log, progress, resume)"
```

---

## Task 14: dmTab.js — Toplu DM sekmesi (keşif, seçim, include/exclude, focus, takip)

**Files:**
- Create: `src/ui/dmTab.js`
- Modify: `src/ui/ui.js` (initDmTab import + çağrısı)

**Interfaces:**
- Consumes: `DmDiscovery.listDms`, `token.getAuthorId`, `constants.CHANNEL_TYPE`, ve `ctx` (Task 13)
- Produces: `initDmTab(ctx): void` — DM sekmesini bağlar; `ctx.runDm`, `ctx.onJobStart`, `ctx.onProgress` doldurur.

> DOM/fetch davranışı; birim test yok. Task 15 manuel kontrol listesinde doğrulanır.

- [ ] **Step 1: dmTab.js yaz**

`src/ui/dmTab.js`:
```js
import { listDms } from '../core/DmDiscovery.js';
import { getAuthorId } from '../discord/token.js';
import { CHANNEL_TYPE } from '../discord/constants.js';

export function initDmTab(ctx) {
  const { panel, el, log } = ctx;

  let dms = [];               // tüm DM satırları
  const selected = new Set(); // seçili channel id'leri

  const listEl = el('dmList');
  const countEl = el('dmCount');
  const searchEl = el('dmSearch');
  const selectAllEl = el('dmSelectAll');

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = (d) => (d ? d.toLocaleDateString() : '');
  const updateCount = () => (countEl.textContent = `${selected.size} seçili / ${dms.length}`);

  function visibleRows() {
    const q = (searchEl.value || '').toLowerCase();
    return dms.filter((d) => !q || d.name.toLowerCase().includes(q));
  }

  function render() {
    listEl.innerHTML = '';
    for (const d of visibleRows()) {
      const row = document.createElement('label');
      row.className = 'pc-dm-row';
      const badge = d.type === CHANNEL_TYPE.GROUP_DM ? 'Grup' : 'DM';
      const avatar = d.icon ? `<img class="pc-dm-avatar" src="${d.icon}" alt="">` : `<div class="pc-dm-avatar"></div>`;
      row.innerHTML =
        `<input type="checkbox" ${selected.has(d.id) ? 'checked' : ''}>` +
        avatar +
        `<div class="pc-dm-meta"><div class="pc-dm-name pc-priv">${escapeHtml(d.name)}</div>` +
        `<div class="pc-dm-time">${fmtTime(d.lastTime)}</div></div>` +
        `<span class="pc-badge">${badge}</span>`;
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(d.id); else selected.delete(d.id);
        updateCount();
      });
      listEl.appendChild(row);
    }
    updateCount();
  }

  async function loadDms() {
    const { api, token } = ctx.buildApi();
    if (!token) return log('error', 'Token yok, DM listesi alınamıyor.');
    log('info', 'DM listesi yükleniyor...');
    try {
      dms = await listDms(api);
      log('success', `${dms.length} DM/grup bulundu.`);
      render();
    } catch (err) {
      log('error', `DM listesi alınamadı: ${err.message || err}`);
    }
  }

  searchEl.addEventListener('input', render);
  selectAllEl.addEventListener('change', () => {
    const rows = visibleRows();
    if (selectAllEl.checked) rows.forEach((d) => selected.add(d.id));
    else rows.forEach((d) => selected.delete(d.id));
    render();
  });
  panel.querySelectorAll('[data-action="loadDms"]').forEach((b) => b.addEventListener('click', loadDms));

  // Seçim + moda göre job kuyruğu
  function buildJobs() {
    const mode = panel.querySelector('input[name="pc-dm-mode"]:checked')?.value || 'only';
    const targets = mode === 'except'
      ? dms.filter((d) => !selected.has(d.id))
      : dms.filter((d) => selected.has(d.id));
    const authorId = getAuthorId() || undefined;
    if (!authorId) log('warn', 'Kendi id\'niz alınamadı; yalnız kendi mesajlar filtresi zayıf olabilir.');
    const baseFilters = ctx.getFilters();
    return targets.map((d) => ({
      channelId: d.id,
      guildId: '@me',
      label: d.name,
      _dm: d,
      filters: { ...baseFilters, authorId },
    }));
  }

  // Focus kartı + opsiyonel "Discord'da takip et"
  function showFocus(job) {
    const d = job._dm || {};
    el('focus').hidden = false;
    el('focusAvatar').src = d.icon || '';
    el('focusName').textContent = d.name || job.channelId;
    el('focusProg').textContent = 'başlıyor...';
    if (el('followDm').checked) {
      const link = document.querySelector(`a[href="/channels/@me/${job.channelId}"]`);
      if (link) link.click(); // Discord SPA yerinde geçer (reload yok)
    }
  }

  ctx.onJobStart = (job) => { if (job.guildId === '@me' && job._dm) showFocus(job); };
  ctx.onProgress = (s) => {
    if (!el('focus').hidden && s.currentJob && s.currentJob._dm) {
      el('focusProg').textContent = `silinen: ${s.delCount}`;
    }
  };

  async function runDm({ dryRun }) {
    const jobs = buildJobs();
    if (!jobs.length) return log('error', 'Hedef DM yok (seçim/moda göre boş).');

    const { api, token } = ctx.buildApi();
    if (!token) return log('error', 'Token yok.');
    ctx.makeEngine(api);
    ctx.startWatchdog();

    if (!dryRun && !window.confirm(`${jobs.length} DM'de kendi mesajların silinecek. Devam?`)) {
      ctx.setRunningUI(false);
      return;
    }
    ctx.switchTab('log');
    log('info', `${jobs.length} DM işlenecek (${dryRun ? 'dry-run' : 'silme'}).`);

    const engine = ctx.getEngine();
    await engine.runQueue(jobs, { dryRun });

    if (dryRun) log('success', `Dry-run: toplam ${engine.state.grandTotal} mesaj filtreye uyuyor.`);
    else { log('success', `Toplu DM bitti. Silinen: ${engine.state.delCount}, başarısız: ${engine.state.failCount}.`); ctx.checkpoint.clear(); }
    el('focus').hidden = true;
  }

  ctx.runDm = runDm;
}
```

- [ ] **Step 2: ui.js'e import ekle**

`src/ui/ui.js` — mevcut import bloğunun sonuna ekle:
```js
import { getToken, getAuthorId, parseIdsFromUrl } from '../discord/token.js';
import { initDmTab } from './dmTab.js';
```
(Yani `initDmTab` satırını `token.js` import'undan hemen sonra ekle.)

- [ ] **Step 3: ui.js'de initDmTab çağrısını aç**

`src/ui/ui.js` içinde şu satırı:
```js
  // Task 14: initDmTab(ctx);
```
şununla değiştir:
```js
  initDmTab(ctx);
```

- [ ] **Step 4: Build kontrolü**

Run: `npm run build`
Expected: Hata yok; bundle içinde DM sekmesi kodu yer alır.

- [ ] **Step 5: Commit**

```bash
git add src/ui/dmTab.js src/ui/ui.js
git commit -m "feat: Toplu DM sekmesi (kesif, include/exclude, focus karti, takip)"
```

---

## Task 15: main.js + final build + README + manuel doğrulama

**Files:**
- Modify: `src/main.js` (Task 1 stub'unu değiştir)
- Create: `README.md`

**Interfaces:**
- Consumes: `ui.initUI`
- Produces: Kurulabilir `dist/deleteDiscordMessages.user.js`

- [ ] **Step 1: main.js yaz** (stub'u değiştir)

`src/main.js`:
```js
import { initUI } from './ui/ui.js';

function boot() {
  if (window.__purgecord_loaded) return;
  window.__purgecord_loaded = true;
  try {
    initUI();
  } catch (err) {
    console.error('[purgecord] başlatma hatası:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
```

- [ ] **Step 2: README yaz**

`README.md`:
```markdown
# Purgecord

Discord'da kendi mesajlarını toplu silen bir userscript. undiscord temelli, sağlamlaştırılmış (kendi kendine durmaz), sekmeli modern UI ve **toplu DM silme** özellikli.

## Kurulum
1. Tampermonkey veya Violentmonkey kur.
2. `npm install && npm run build`
3. `dist/deleteDiscordMessages.user.js` dosyasını userscript yöneticisine ekle (dosyayı sürükle-bırak veya içeriğini yeni script olarak yapıştır).
4. discord.com'u aç; araç çubuğunda 🗑️ ikonu belirir.

## Kullanım
- **Kanal / Sunucu:** author/guild/channel id'leri "mevcut" ile doldur, filtre seç, ▶ Sil.
- **Toplu DM:** "DM'leri yükle" → seç → *Sadece seçilenler* / *Seçilenler hariç* → ▶ Sil.
- **Sadece say:** silmeden kaç mesajın etkileneceğini gösterir.
- Sekme yenilenirse **Devam et** ile kaldığı yerden sürer.

## Geliştirme
- `npm test` — saf mantık birim testleri (node:test).
- `npm run build` — esbuild ile tek dosya bundle.

> Sorumluluk sizde: yalnız kendi hesabınızda kullanın. Rate-limit'e saygılı varsayılanlar mevcuttur.
```

- [ ] **Step 3: Final build**

Run: `npm run build`
Expected: `dist/deleteDiscordMessages.user.js` oluşur; en üstte metablock, ardından IIFE bundle. Hata yok.

- [ ] **Step 4: Tüm birim testleri çalıştır**

Run: `npm test`
Expected: Tüm test dosyaları PASS.

- [ ] **Step 5: Bundle sağlık kontrolü**

Run: `node -e "const s=require('fs').readFileSync('dist/deleteDiscordMessages.user.js','utf8'); if(!s.includes('==UserScript==')) throw new Error('metablock yok'); if(!s.includes('purgecord')) throw new Error('kod yok'); console.log('bundle OK', s.length, 'bytes');"`
Expected: `bundle OK <n> bytes`

- [ ] **Step 6: Commit**

```bash
git add src/main.js README.md dist/deleteDiscordMessages.user.js
git commit -m "feat: boot (main.js) + README + ilk calisan bundle"
```

- [ ] **Step 7: Manuel doğrulama — tarayıcıda (Tampermonkey ile)**

> Bu adımlar otomatikleştirilemez; gerçek Discord hesabında **küçük/test bir DM** üzerinde yürütülür. Her maddeyi işaretle.

- [ ] Script kurulu; discord.com'da araç çubuğunda 🗑️ ikonu görünüyor, tıklayınca panel açılıyor.
- [ ] Panel sürüklenebiliyor ve sağ-alt köşeden boyutlandırılabiliyor.
- [ ] **Kanal:** Bir test DM'ine gir → "mevcut" ile channel/guild doldur → **Sadece say** → log'da makul bir sayı çıkıyor, silme olmuyor.
- [ ] **Kanal:** ▶ Sil → onay → mesajlar siliniyor, ilerleme çubuğu ve yüzde güncelleniyor, "Bitti" logu.
- [ ] **Boş/az mesaj:** Az mesajlı bir DM'de sonuna kadar gidip **kendiliğinden ve doğru** duruyor (yanlış "bitti" veya takılma yok).
- [ ] **Toplu DM:** "DM'leri yükle" → liste avatar/isim/tarih ile geliyor; arama filtresi çalışıyor.
- [ ] **Toplu DM include:** Birkaç DM seç → *Sadece seçilenler* → **Sadece say** → yalnız seçilenler işleniyor.
- [ ] **Toplu DM exclude:** Birini seç → *Seçilenler hariç* → **Sadece say** → seçilen atlanıyor, diğerleri işleniyor.
- [ ] **Focus kartı:** Toplu DM çalışırken alt kartta işlenen DM'in avatarı/adı ve "silinen: N" güncelleniyor.
- [ ] **Takip et:** "DM'i Discord'da takip et" açıkken her DM'e geçişte Discord **reload olmadan** o DM'i açıyor; panel ayakta kalıyor.
- [ ] **Rate-limit:** Silme gecikmesini düşür (ör. 500ms) → throttle logları çıksa bile iş **durmadan yavaşlayıp devam ediyor**.
- [ ] **Stop:** Çalışırken ⏸ Durdur → anında duruyor.
- [ ] **Resume:** Silme ortasında sekmeyi yenile → panelde "Devam et" bandı çıkıyor → tıklayınca kaldığı yerden sürüyor.
- [ ] **Streamer modu:** Açıkken id/isim alanları bulanık; kapatınca net.

- [ ] **Step 8: Doğrulama sonrası commit (varsa düzeltmeler)**

Manuel testte bulunan ufak düzeltmeleri uygula, sonra:
```bash
git add -A
git commit -m "fix: manuel dogrulama duzeltmeleri"
```

---

## Task 16 (OPSİYONEL): Sunucu-geneli silme için search stratejisi

> MVP için gerekli değildir — tek kanal/DM cursor ile çalışır. Bu görev yalnız "tüm sunucuda tek seferde" senaryosu için search motorunu ekler (undiscord paritesi). Atlanabilir.

**Files:**
- Modify: `src/core/DeleteEngine.js` (search stratejisi + strateji seçimi)
- Test: `test/deleteEngine.search.test.js`

**Interfaces:**
- Consumes: mevcut `DeleteEngine`, `constants.API_BASE`
- Produces: `engine.runSearchJob(job, {dryRun})`; `runQueue` guildId'ye göre strateji seçer (`@me` veya tek kanal → cursor; aksi → search).

- [ ] **Step 1: Failing test yaz**

`test/deleteEngine.search.test.js`:
```js
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
```

- [ ] **Step 2: Testi çalıştır — fail görmeli**

Run: `node --test test/deleteEngine.search.test.js`
Expected: FAIL (henüz search yok; guildId=g1 cursor'a gidip `/channels/undefined/...` ister → hata).

- [ ] **Step 3: DeleteEngine'e search stratejisi ekle**

`src/core/DeleteEngine.js` — `runQueue` içindeki `await this.runCursorJob(job, { dryRun });` satırını şununla değiştir:
```js
        if (job.guildId && job.guildId !== '@me' && !job.channelId) {
          await this.runSearchJob(job, { dryRun });
        } else {
          await this.runCursorJob(job, { dryRun });
        }
```

Ve sınıfa şu metodu ekle (`deleteMessage`'dan hemen önce):
```js
  /** Search stratejisi — sunucu-geneli (guildId, tek kanal yok). Boş sayfa doğrulamalı. */
  async runSearchJob(job, { dryRun = false } = {}) {
    let offset = 0;
    let emptyStreak = 0;
    while (this.state.running) {
      const params = new URLSearchParams();
      if (job.filters?.authorId) params.set('author_id', job.filters.authorId);
      params.set('sort_by', 'timestamp');
      params.set('sort_order', 'desc');
      params.set('offset', String(offset));
      const url = `${API_BASE}/guilds/${job.guildId}/messages/search?${params.toString()}`;

      let resp;
      try { resp = await this.api.request(url); }
      catch (err) { if (err?.name === 'AbortError') throw err; this.log('error', `Arama hatası: ${err?.message || err}`); return; }

      if (resp.status === 401 || resp.status === 403) { this.log('error', `Yetki hatası (${resp.status}).`); this.stop(); return; }
      if (!resp.ok) { this.log('error', `Arama durumu ${resp.status}; job atlanıyor.`); return; }

      const data = await resp.json();
      const total = data.total_results || 0;
      if (total > this.state.grandTotal) this.state.grandTotal = total;

      const discovered = (data.messages || []).map((convo) => convo.find((m) => m.hit === true)).filter(Boolean);
      const { toDelete, skipped } = filterMessages(discovered, job.filters || {});

      if (discovered.length === 0) {
        // Boş sayfa: total>0 ise geçici olabilir → birkaç kez doğrula, sonra bitir.
        if (total > 0 && emptyStreak < 3) { emptyStreak++; this.log('verb', `Boş sayfa (${emptyStreak}/3) doğrulanıyor...`); await this.wait(this.options.searchDelay); continue; }
        break; // gerçekten bitti
      }
      emptyStreak = 0;

      if (dryRun) {
        this.markProgress();
      } else {
        for (const msg of toDelete) {
          if (!this.state.running) return;
          const r = await this.deleteMessage(msg);
          if (r === 'FAIL_SKIP') offset++; // arşivli: bir sonraki sayfada atla
          this.markProgress();
          await this.wait(this.options.deleteDelay);
        }
      }
      offset += skipped.length; // silinenler listeden düşer; atlananlar offset ilerletir
      this.saveCheckpoint({ job, offset, delCount: this.state.delCount, failCount: this.state.failCount, grandTotal: this.state.grandTotal });
      await this.wait(this.options.searchDelay);
    }
  }
```

- [ ] **Step 4: Testi çalıştır — pass görmeli**

Run: `node --test test/deleteEngine.search.test.js`
Expected: PASS.

- [ ] **Step 5: Regresyon + commit**

Run: `npm test`
Expected: Tümü PASS.
```bash
git add src/core/DeleteEngine.js test/deleteEngine.search.test.js
git commit -m "feat: opsiyonel search stratejisi (sunucu-geneli, bos sayfa dogrulamali)"
```

---
