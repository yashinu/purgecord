# Discord Toplu Mesaj Silici — Tasarım Dokümanı

- **Tarih:** 2026-07-02
- **Durum:** Onaylandı (uygulama planı bekleniyor)
- **Çalışma adı:** Purgecord (değiştirilebilir)
- **Temel alınan:** [undiscord](https://github.com/victornpb/undiscord) v5.2.6 (MIT)

---

## 1. Özet

Discord'da bir kullanıcının kendi mesajlarını toplu silmesini sağlayan bir **userscript**. undiscord'un temel silme mantığını korur, fakat:

1. **Kendi kendine durma** ve **rate-limit** hatalarını kökten çözer.
2. Sıfırdan, **sekmeli ve modern bir UI** sunar.
3. **Toplu DM silme** özelliği ekler: tüm açık DM'ler listelenir, "sadece seçilenleri sil" veya "seçilenler hariç hepsini sil" modlarıyla toplu silme yapılır.
4. Sekme yenilense/çökse bile **kaldığı yerden devam** eder (checkpoint).

Hedef kullanıcı: aracı kendisi kuran, teknik bilgisi olan tek kişi (script sahibi). Çok kullanıcılı/dağıtım senaryosu yok.

---

## 2. Hedefler ve başarı kriterleri

- **G1 — Sağlamlık:** Uzun bir silme işi (on binlerce mesaj) insan müdahalesi olmadan sonuna kadar gider. Geçici boş sayfa, network hatası, 5xx veya rate-limit işi *durdurmaz*, sadece geciktirir.
- **G2 — Toplu DM:** Kullanıcı tek tıkla tüm DM'lerini listeleyip include/exclude mantığıyla toplu silme başlatabilir.
- **G3 — Doğru durma:** İş gerçekten bittiğinde (kanalın başına ulaşıldığında) deterministik olarak durur; yanlış "bitti" yok.
- **G4 — Kontrol:** Kullanıcı her an gerçek anlamda durdurabilir; silmeden önce kaç mesajın etkileneceğini görebilir (dry-run).
- **G5 — Rate-limit dostu:** Discord'un `retry_after` ve global limit sinyallerine harfiyen uyar; hesabı riske atacak agresiflik yok.
- **G6 — Görünürlük:** İşlenen DM/kanal, ilerleme, ETA, rate-limit sayaçları panelde canlı görünür.

**Başarı ölçütü:** DM'lerde ≥5.000 mesajlık bir işi tek seferde, elle yeniden başlatmadan tamamlamak; ve toplu DM modunda 10+ DM'i sırayla temizlemek.

---

## 3. Kapsam dışı (YAGNI)

- **Kapalı DM'ler** (sidebar'dan kaldırılmış) için veri-arşivi (`index.json`) import'u. Canlı API açık DM'leri kapsar; import sonradan eklenebilir.
- **Sunucu-geneli otomatik kanal keşfi** (tüm kanalları gezip her birinde silme). Sunucuda silme, undiscord paritesi olarak search motoruyla kalır; otomatik kanal enumerasyonu v2.
- **i18n / çoklu dil.** UI İngilizce label + Türkçe yardım notları yeterli (script sahibi tek kişi).
- **Tarayıcı eklentisi / konsol dağıtımı.** Sadece userscript.
- **Mesaj düzenleme, sunucudan ayrılma vb.** ek "temizlik" özellikleri.

---

## 4. Teslim formatı ve proje yapısı

- **Teslim:** Tek dosya `dist/deleteDiscordMessages.user.js` — Tampermonkey/Violentmonkey'e kurulur. `@match https://*.discord.com/*`, `@grant none`.
- **Kaynak:** Bakım ve test edilebilirlik için `src/` altında modüllere bölünür, **esbuild** ile tek dosyaya bundle'lanır (`npm run build`). Tek dev-dependency: `esbuild`. (Toolchain istenmezse tek dosyaya indirgenebilir; ama modüler + testli yapı "kusursuz çalışsın" hedefi için tercih edilir.)
- **CSS:** Kaynakta ayrı `.css` olarak yazılır, build'de string olarak gömülür (undiscord'daki gibi `insertCss`).

```
/
├── docs/superpowers/specs/2026-07-02-discord-bulk-deleter-design.md
├── src/
│   ├── header.js            # ==UserScript== metablock
│   ├── main.js              # giriş noktası, mount + observer
│   ├── core/
│   │   ├── ApiClient.js     # retry/backoff/rate-limit sarmalayıcı
│   │   ├── DeleteEngine.js  # job çalıştırıcı (cursor + search stratejileri)
│   │   ├── filters.js       # saf filtre hattı (test edilir)
│   │   ├── snowflake.js     # tarih<->snowflake, cursor matematiği (test edilir)
│   │   ├── backoff.js       # bekleme süresi hesabı (test edilir)
│   │   ├── DmDiscovery.js   # /users/@me/channels -> seçilebilir liste
│   │   ├── Checkpoint.js    # localStorage kalıcılık
│   │   └── Watchdog.js      # stall tespiti + otomatik devam
│   ├── ui/
│   │   ├── template.html.js # panel HTML
│   │   ├── styles.css.js    # panel CSS
│   │   ├── DragResize.js    # undiscord'dan uyarlanır
│   │   └── ui.js            # DOM bağlama, olaylar, render
│   └── discord/
│       ├── token.js         # token/authorId edinimi (undiscord yöntemi)
│       └── constants.js     # API URL'leri, mesaj tipleri
├── test/                    # node:test ile saf mantık testleri
│   ├── filters.test.js
│   ├── snowflake.test.js
│   └── backoff.test.js
├── build.mjs                # esbuild bundle scripti
└── package.json
```

---

## 5. Mimari — modüller ve sorumluluklar

Her modül tek sorumluluğa sahip, iyi tanımlı arayüzle konuşur, bağımsız anlaşılır.

| Modül | Ne yapar | Bağımlılık |
|---|---|---|
| `ApiClient` | Tek `request(url, opts)`; 429/5xx/network/202 için backoff+retry; rate-limit header takibi; global limit; iptal sinyali | — |
| `DeleteEngine` | Bir `job` alır, strateji seçer (cursor/search), filtre uygular, siler; `onProgress/onStop` event'leri | ApiClient, filters, snowflake |
| `filters` | Saf fonksiyon: mesaj listesi + options → silinecekler/atlananlar | — (saf) |
| `snowflake` | tarih↔snowflake, sayfa cursor'u (en eski id) | — (saf) |
| `backoff` | HTTP durumu + header + deneme sayısı → bekleme ms (clamp'li) | — (saf) |
| `DmDiscovery` | `/users/@me/channels` çeker; DM (type 1) + grup DM (type 3) → {id, isim, avatar, tip, sonMesaj} | ApiClient |
| `Checkpoint` | Aktif iş durumunu localStorage'a yaz/oku/temizle | — |
| `Watchdog` | İlerleme zaman damgasını izler; stall'da job'ı son cursor'dan yeniden başlatır | DeleteEngine |
| `token` | Auth token + authorId edinimi (iframe localStorage + webpack fallback) | — |
| `ui` | Panel render, olay bağlama, DM listesi çizimi, "şu an işlenen" kartı, log | hepsini tüketir |
| `DragResize` | Paneli sürükle/boyutlandır | — |

**Veri akışı:** `ui` → job(lar) kurar → `DeleteEngine.runQueue(jobs)` → her job için `ApiClient` ile sayfalama → `filters` ile ayıklama → `deleteMessage` döngüsü → `onProgress` → `ui` render + `Checkpoint` yaz. `Watchdog` arka planda ilerlemeyi izler.

---

## 6. Çekirdek motor — stratejiler

Bir **job** şu alanları taşır: `{ channelId, guildId, authorId, filters, mode }`.

### 6.1 Cursor stratejisi (varsayılan — DM ve tek kanal)

İndeksten bağımsız, **deterministik** sayfalama:

```
before = undefined  # ilk sayfa: en yeni 100 mesaj
loop:
    page = GET /channels/{channelId}/messages?limit=100[&before={before}]
    if page.length == 0: break            # kanalın başı — kesin bitti
    {toDelete, skipped} = filters(page, options)   # author==me, tip, tarih, içerik, regex, pinned
    for msg in toDelete: deleteMessage(msg); wait(deleteDelay)
    before = oldestId(page)               # sayfadaki en eski mesaj id'si
    if page.length < 100: break           # son (kısmi) sayfa işlendi — bitti
    wait(searchDelay)
```

- **Neden sağlam:** `messages` endpoint'i otantik kaynaktır, arama indeksi değil. "Yanlış boş sayfa" imkânsız. Cursor daima geriye (`before`) gider; silme cursor'u etkilemez → **offset kayması yok**.
- **Filtreler client-side** uygulanır (author, tarih, içerik, link/dosya, regex, pinned).
- **Bitiş koşulu:** boş sayfa **veya** 100'den az mesaj → kanalın başına ulaşıldı.

### 6.2 Search stratejisi (sunucu-geneli / opsiyonel içerik araması)

undiscord'un search akışı korunur (guildId ≠ `@me` ve belirli tek kanal yoksa), **ama** §7'deki sağlamlaştırma ile:
- Boş sayfa **asla** hemen "bitti" sayılmaz; `total_results > 0` iken aynı offset backoff'la 3 kez doğrulanır, hâlâ boşsa gerçekten biter.
- Tüm hatalar `ApiClient` üzerinden retry'lanır.

Search yalnızca gerektiğinde (tüm sunucuda, author'a göre) devreye girer; DM/tek-kanal daima cursor kullanır.

### 6.3 Silme fonksiyonu (undiscord ile aynı)

`DELETE /channels/{channelId}/messages/{id}`, `Authorization: token`. Dönüşler: `OK`, `RETRY` (429 → `retry_after`), `FAIL_SKIP` (400/50083 arşivli thread → cursor/offset ilerlet), `FAILED`. `maxAttempt` retry.

**Silinebilir tip filtresi:** `type === 0 || (type >= 6 && type <= 21)`; pinned ise `includePinned` şartı (undiscord ile birebir).

---

## 7. Sağlamlaştırma katmanı — undiscord bug eşlemesi

`ApiClient.request()` her API çağrısını sarar. Politika:

| Durum | Davranış |
|---|---|
| `429` | `retry_after` (+ `X-RateLimit-Global` ise global) kadar bekle, sonra retry. İlgili delay'i (search/delete) uyarlanabilir artır. |
| `202` (indexing, sadece search) | `retry_after` kadar bekle, retry. |
| `5xx` | Üstel backoff (base×2^n, jitter'lı, tavan clamp'li) ile retry. |
| Network hatası (fetch throw) | Üstel backoff ile retry (belli sınıra kadar), sonra o mesajı `FAILED` işaretle ve **devam et** — işi öldürme. |
| `401/403` | Gerçek yetki hatası → dur ve kullanıcıyı uyar (token geçersiz). |
| `retry_after == 0/undefined` | **Her zaman** `max(minDelay, hesaplanan)` ile clamp. Asla `wait(undefined)`. |

**Undiscord bug → çözüm haritası:**

1. **Yanlış "bitti" durması** (undiscord `run()` 591-596) → Cursor'da bitiş deterministik (§6.1). Search'te boş sayfa doğrulaması (§6.2).
2. **`stats.searchDelay` undefined → `wait(undefined)`** (undiscord 682/694/699) → `backoff` saf fonksiyonu daima geçerli, clamp'li süre üretir; delay'ler `options` üzerinde tutulur.
3. **Geçici hatada tam çöküş** (undiscord 673-677/707-712) → network/5xx/202 retry'lanır; `running=false` ile ölmez.
4. **Offset kayması** → Cursor'da offset yok (§6.1). Search'te `FAIL_SKIP` offset ilerletme korunur.
5. **Checkpoint yok** → §9.

**Watchdog:** `DeleteEngine` her başarılı sayfa/silme sonrası `lastProgressTs` günceller. `Watchdog` periyodik kontrol eder; `running && now - lastProgressTs > STALL_MS` (örn. 90 sn) ise: uyarı logla, mevcut job'ı **son kaydedilen cursor'dan** yeniden başlat. Cursor geriye gittiği için yeniden başlatma güvenli (çift silme yok).

---

## 8. Rate-limit stratejisi

- **Ayrı bucket'lar:** `GET messages`, `search` ve `DELETE` farklı rate-limit bucket'ları; her biri için `retry_after`'a ayrı saygı.
- **Uyarlanabilir gecikme:** 429 alınınca ilgili delay artırılır; bir süre sorunsuz gidince kademeli düşürülebilir (opsiyonel, muhafazakâr).
- **Global limit:** `X-RateLimit-Global: true` gelirse tüm istekler `retry_after` kadar duraklatılır.
- **Varsayılanlar:** deleteDelay ~1000ms, searchDelay ~1000ms (cursor'da sayfa arası). Kullanıcı slider'la ayarlar. Muhafazakâr alt sınırlar zorunlu (ör. deleteDelay ≥ 500ms) — hesabı korumak için.
- **Öngörülü fren:** `X-RateLimit-Remaining: 0` görülürse `X-RateLimit-Reset-After` kadar önden bekle (429 yemeden).

---

## 9. Kalıcılık ve otomatik devam (Checkpoint)

- **Şema (localStorage, tek anahtar `purgecord:state`):**
  ```json
  {
    "version": 1,
    "queue": [ { "channelId": "...", "label": "...", "done": false } ],
    "current": { "channelId": "...", "before": "<cursor snowflake>",
                 "delCount": 0, "failCount": 0, "grandTotal": 0 },
    "options": { "deleteDelay": 1000, "searchDelay": 1000, "filters": { } },
    "startedAt": 1719900000000
  }
  ```
- **Yazma:** her sayfa sonrası (throttle'lı, ~her 2 sn'de bir en fazla).
- **Okuma:** script yüklenince tamamlanmamış bir state varsa panelde **"Kaldığın yerden devam et? (X/Y silindi)"** bildirimi; kullanıcı Devam / Vazgeç seçer.
- **Temizleme:** iş bitince veya kullanıcı Stop + Temizle deyince silinir.

---

## 10. Toplu DM özelliği

### 10.1 Keşif
- `GET /users/@me/channels` → DM (`type:1`) ve grup DM (`type:3`) kanalları.
- Her satır: **avatar**, **isim** (DM: karşı kullanıcı; grup DM: `name` veya katılımcılardan türetilmiş), **tip rozeti** (DM/Grup), **son mesaj tarihi** (`last_message_id`'den snowflake→tarih).
- Sıralama: son mesaja göre (yeni→eski). Arama kutusu ile filtrele.

### 10.2 Seçim ve mod
- Her satırda **checkbox**. Üstte iki radyo modu:
  - ⦿ **Sadece seçilenleri sil** — yalnız işaretli DM'ler kuyruğa girer.
  - ⦿ **Seçilenler hariç hepsini sil** — işaretliler *atlanır*, kalan tüm DM'ler kuyruğa girer.
- "Tümünü seç / hiçbirini seçme" kısayolu ve seçili sayacı.

### 10.3 Çalıştırma
- Seçilen DM listesi → her biri bir `job` (`channelId`, `authorId=me`, cursor stratejisi).
- Job'lar **sıralı** işlenir (paralel değil — rate-limit güvenliği). Her job'a §5-6'daki motor uygulanır.
- Job'lar arası kısa nefes (searchDelay).
- Mesaj-seviyesi filtreler (tarih/içerik/regex/link/dosya/pinned) tüm DM job'larına ortak uygulanır (opsiyonel; boşsa "tüm kendi mesajlarım").
- Grup DM'lerde de yalnız kendi mesajların silinir (API zaten başkasınınkini engeller).

---

## 11. "Silinen DM'e odaklan" özelliği

**Araştırma sonucu:** Reload olmadan mümkün. İki katman:

1. **Panel-içi odak kartı (her zaman açık):** "Şu an işleniyor" kartı — avatar + isim + o DM'in ilerleme çubuğu + silinen/toplam. Discord'u zıplatmadan görsel takip. Ana çözüm bu.
2. **Opsiyonel toggle "DM'i Discord'da takip et" (varsayılan KAPALI):** Her job başında o DM'in sidebar linkine (`a[href="/channels/@me/{channelId}"]`) programatik `click()` → Discord SPA **yerinde** geçer (URL güncellenir, **reload olmaz**, panelimiz MutationObserver ile ayakta kalır). Varsayılan kapalı çünkü: (a) DM'i okundu işaretler, (b) kullanıcı etkileşimiyle çakışabilir, (c) silme için teknik gereksinim değil. Link sidebar'da yoksa sessizce atlanır.

---

## 12. Güvenlik ve kontroller

- **Dry-run / "Sadece say":** Silmeden tüm sayfaları gezip kaç mesajın filtreye uyduğunu raporlar (silme yapmaz). Büyük işlerden önce güven verir.
- **Onay + önizleme:** Başlatınca panel-içi (bloklamayan) onay: tahmini sayı, ETA, ilk N mesajın önizlemesi. undiscord'un `window.confirm`'ü yerine modal-benzeri panel bölgesi.
- **Gerçek Stop:** `running=false` + `AbortController` ile bekleyen istekleri iptal; anında ve temiz durur.
- **Streamer/redact modu:** Kişisel bilgileri gizleyen sınıf (undiscord'daki `redact`), ekran paylaşımı için.
- **Alt-sınır zorlaması:** deleteDelay minimumu (ör. 500ms) hesabı korur.

---

## 13. UI tasarımı

- **Tetikleyici:** Discord toolbar'ına eklenen ikon (undiscord gibi), MutationObserver ile yeniden-mount.
- **Panel:** sürüklenebilir + boyutlandırılabilir; Discord CSS değişkenleriyle temalı ama daha derli toplu.
- **Sekmeler:**
  1. **Kanal/Sunucu** — authorId, guildId, channelId (mevcut kanaldan doldur), mesaj/tarih aralığı, filtreler. (undiscord paritesi)
  2. **Toplu DM** — DM listesi, seçim, include/exclude modu, ara. (§10)
  3. **Log** — renkli log akışı, auto-scroll, temizle.
- **Üst bar (her sekmede):** ▶ Başlat / ⏸ Durdur / Dry-run / ilerleme çubuğu + yüzde + ETA.
- **Alt bar:** "Şu an işleniyor" odak kartı (§11.1), rate-limit sayaçları (kaç kez throttle, toplam bekleme).
- **Durumlar:** boş, çalışıyor, throttle'da (sarı), hata (kırmızı, ama iş sürüyor), bitti (yeşil), devam-edilebilir (mavi bildirim).

---

## 14. Token ve ID edinimi

- **Token:** undiscord yöntemi — iframe `localStorage.token`; başarısızsa webpack modülünden `getToken()` fallback. Elle giriş alanı da var (Advanced).
- **authorId:** iframe `localStorage.user_id_cache`.
- **guildId/channelId:** URL'den regex (`channels/([\w@]+)/(\d+)`), "mevcut kanaldan doldur" butonu.
- Token panelde redact'li tutulur; loglarda gizlenir.

---

## 15. Hata yönetimi ve kenar durumlar

- **Token geçersiz (401/403):** Dur, net uyarı, "token'ı yenile" öner.
- **DM listesi boş:** Bilgi mesajı ("Açık DM yok; kapalı DM'ler için import v2").
- **Grup DM'de tek yetkili sen değilsin:** Yalnız kendi mesajların silinir; başkasınınki 403 → `FAILED` sayılır, iş sürer.
- **Arşivli thread (400/50083):** cursor/offset ilerlet, atla (undiscord davranışı).
- **Sayfa/DOM Discord güncellemesiyle değişirse:** buton mount + panel MutationObserver ile yeniden bağlanır; API tabanlı silme DOM'a bağımlı değil (dayanıklı).
- **Watchdog yeniden başlatması:** cursor güvenli olduğundan çift silme yok; log'a "otomatik devam" yazılır.

---

## 16. Test stratejisi

- **Otomatik (node:test, bağımlılıksız):** Saf modüller birim-test edilir:
  - `filters`: tip/pinned/author/tarih/içerik/regex ayıklaması; skipped hesabı.
  - `snowflake`: tarih↔snowflake, `oldestId(page)` cursor matematiği.
  - `backoff`: 429/5xx/undefined `retry_after`/global için clamp'li süre; asla 0/undefined dönmez.
- **Manuel doğrulama (tarayıcıda, kontrol listesi):** DOM/fetch/rate-limit davranışı (otomatikleştirilemez):
  1. Küçük bir test DM'inde birkaç mesaj sil → doğru durur.
  2. Dry-run sayımı gerçek silme sayısıyla tutarlı.
  3. Toplu DM include & exclude modları doğru kuyruk kurar.
  4. Rate-limit'i tetikle (delay'i düşür) → durmadan yavaşlayıp devam eder.
  5. Silme ortasında sekme yenile → "devam et" çalışır.
  6. Stop anında durur.
  7. "DM'i takip et" açıkken reload olmadan geçiş.

---

## 17. Açık sorular / gelecek işler

- **İsimlendirme:** Çalışma adı "Purgecord" — kesinleşince metablock güncellenir.
- **v2 adayları:** kapalı DM'ler için `index.json` import; sunucu-geneli otomatik kanal keşfi; uyarlanabilir delay'in kademeli düşürülmesi; çoklu-hesap profilleri.
- **Build toolchain:** esbuild tercih; istenirse tek-dosya elle-yazıma indirgenir.

---

## Ek: undiscord'dan korunan / değişen

| Bileşen | Karar |
|---|---|
| `deleteMessage` (DELETE + retry) | **Korunur** (birebir mantık) |
| Silinebilir tip filtresi | **Korunur** |
| `DragResize` / sürükle-boyutlandır | **Uyarlanır** |
| Token/authorId edinimi | **Korunur** |
| Search-tabanlı sayfalama | **İkincil** (sadece sunucu-geneli); DM/tek-kanal cursor'a geçer |
| `run()` boş-sayfa durma mantığı | **Değişir** (deterministik cursor bitişi) |
| `window.confirm` onayı | **Değişir** (panel-içi) |
| Rate-limit/retry mantığı | **Yeniden yazılır** (`ApiClient` + `backoff`) |
| UI şablonu/CSS | **Yeniden yazılır** (sekmeli, modern) |
| Checkpoint / Watchdog | **Yeni** |
| Toplu DM keşfi + include/exclude | **Yeni** |
