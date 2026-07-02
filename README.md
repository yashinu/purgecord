# 🧹 Purgecord

Bulk-delete **your own** Discord messages — in a channel/server or across your DMs. Based on [undiscord](https://github.com/victornpb/undiscord), rewritten and hardened so it doesn't stop on its own, with a modern tabbed UI and a **Bulk DM** mode. The UI follows your Discord language automatically.

### 🌐 [English](#english) · [Türkçe](#türkçe)

---

## English

> ⚠️ **Read this first.** Automating a user account (a "self-bot") is **against Discord's Terms of Service** and can, in principle, get your account actioned. Deleting your *own* messages is a gray area that Discord rarely enforces, but **use this at your own risk, only on your own account, for your own data.** **Never share your auth token** — it grants full access to your account. This is a third-party script: only run it if you trust the code (it's all here, read it).

### Features

- **Reliable by design** — index-independent cursor pagination terminates deterministically (no false "done", no getting stuck). Centralized retry for rate limits (429), indexing (202), 5xx and network errors — it slows down and keeps going instead of dying.
- **Bulk DM** — list all your open DMs, then *delete only selected* or *delete all except selected*. Per-DM progress, optional "follow the DM in Discord", and an optional "close the DM once it's clean".
- **Filters** — by author, text content, has-link/has-file, regex, pinned, date range, or message-id range.
- **Count only (dry-run)** — see how many messages match before deleting anything.
- **Resume** — refresh the tab mid-run and continue where you left off (checkpoint in localStorage).
- **Adaptive rate limiting** — the delete delay auto-tunes upward on 429s to a sustainable rate.
- **Streamer mode** — blurs your token, ids, DM names and message content for safe screen-sharing.
- **English / Türkçe** — the UI language follows your Discord language automatically.

### Install

**Option A — prebuilt (easiest):**
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw script and let your userscript manager install it:
   **https://raw.githubusercontent.com/yashinu/purgecord/main/deleteDiscordMessages.user.js**
3. Open `discord.com` in the browser — a 🧹 icon appears in the top bar next to the inbox/help buttons:

   ![Where the Purgecord icon appears in Discord's top navbar](assets/icon-location.png)

**Option B — build from source:**
```bash
npm install
npm run build
# then load deleteDiscordMessages.user.js into your userscript manager
```

> Works with Discord in the **browser** (userscript managers don't run inside the desktop app).

### Usage

1. Click the 🧹 icon to open the panel.
2. **Channel / Server tab:** fill Author/Server/Channel id with the "current" buttons, pick filters, then **Delete** (or **Count only** first). Leave Channel id empty + set Server id + Author id to delete across a whole server.
3. **Bulk DM tab:** **Load DMs** → select → choose *only selected* / *all except selected* → **Delete**.
4. Use the **Advanced** section to tune delete/page delays or paste a token manually if auto-fill fails.

### Development

```bash
npm test        # pure-logic unit tests (node:test)
npm run build   # bundle src/ into deleteDiscordMessages.user.js (esbuild)
```

The core logic (pagination, filters, retry/backoff, DM discovery, checkpoint, watchdog) is unit-tested with Node's built-in test runner. DOM/API behavior is verified manually in the browser.

### Credits

Based on and inspired by **[undiscord](https://github.com/victornpb/undiscord)** by Victor N. (victornpb), MIT licensed. Purgecord reuses its deletion approach and adapts several patterns (token retrieval, draggable window, message deletion), then rebuilds the engine for reliability and adds bulk-DM support.

### License

[MIT](LICENSE). Provided "as is", without warranty of any kind.

---

## Türkçe

Discord'da **kendi** mesajlarını toplu sil — bir kanal/sunucuda veya tüm DM'lerinde. [undiscord](https://github.com/victornpb/undiscord) temelli, kendi kendine durmayacak şekilde yeniden yazılıp sağlamlaştırıldı; modern sekmeli arayüz ve **Toplu DM** modu var. Arayüz, Discord diline göre otomatik gelir.

> ⚠️ **Önce oku.** Bir kullanıcı hesabını otomatikleştirmek ("self-bot") Discord'un **Hizmet Şartları'na aykırıdır** ve teoride hesabına işlem uygulanmasına yol açabilir. Kendi mesajlarını silmek Discord'un nadiren yaptırım uyguladığı gri bir alandır, ama **sorumluluk sende: yalnız kendi hesabında, kendi verin için kullan.** **Token'ını kimseyle paylaşma** — hesabına tam erişim verir. Bu üçüncü taraf bir scripttir: yalnız koda güveniyorsan çalıştır (hepsi burada, oku).

### Özellikler

- **Tasarımı gereği güvenilir** — indeksten bağımsız cursor sayfalama deterministik biter (yanlış "bitti" yok, takılma yok). Rate limit (429), indeksleme (202), 5xx ve ağ hataları için merkezî retry — ölmek yerine yavaşlayıp devam eder.
- **Toplu DM** — tüm açık DM'lerini listeler, sonra *sadece seçilenleri sil* veya *seçilenler hariç hepsini sil*. DM başına ilerleme, isteğe bağlı "DM'i Discord'da takip et" ve "temizlenince DM'i kapat".
- **Filtreler** — yazar, metin içeriği, link/dosya içerir, regex, sabitlenmiş, tarih aralığı veya mesaj-id aralığı.
- **Sadece say (dry-run)** — silmeden önce kaç mesajın eşleştiğini gösterir.
- **Devam et** — silme sırasında sekmeyi yenile, kaldığın yerden devam et (localStorage'da checkpoint).
- **Uyarlanabilir rate limit** — silme gecikmesi 429'larda otomatik yukarı ayarlanır (sürdürülebilir hıza).
- **Streamer modu** — token, id'ler, DM adları ve mesaj içeriğini bulanıklaştırır (güvenli ekran paylaşımı için).
- **English / Türkçe** — arayüz dili Discord diline göre otomatik.

### Kurulum

**Seçenek A — hazır (en kolay):**
1. [Tampermonkey](https://www.tampermonkey.net/) veya [Violentmonkey](https://violentmonkey.github.io/) kur.
2. Ham scripti aç, userscript yöneticine kurdur:
   **https://raw.githubusercontent.com/yashinu/purgecord/main/deleteDiscordMessages.user.js**
3. `discord.com`'u tarayıcıda aç — üst çubukta inbox/help düğmelerinin yanında 🧹 ikonu belirir:

   ![🧹 ikonunun Discord üst çubuğunda göründüğü yer](assets/icon-location.png)

**Seçenek B — kaynaktan derle:**
```bash
npm install
npm run build
# sonra deleteDiscordMessages.user.js dosyasını userscript yöneticine yükle
```

> Discord'un **tarayıcı** sürümüyle çalışır (userscript yöneticileri masaüstü uygulamasının içinde çalışmaz).

### Kullanım

1. 🧹 ikonuna tıklayıp paneli aç.
2. **Kanal / Sunucu sekmesi:** Author/Server/Channel id'lerini "mevcut" düğmeleriyle doldur, filtre seç, **Sil** (veya önce **Sadece say**). Channel id'yi boş bırakıp Server id + Author id verirsen tüm sunucuda siler.
3. **Toplu DM sekmesi:** **DM'leri yükle** → seç → *sadece seçilenler* / *seçilenler hariç* → **Sil**.
4. **Gelişmiş** bölümünden silme/sayfa gecikmelerini ayarla veya otomatik doldurma başarısız olursa token'ı elle yapıştır.

### Geliştirme

```bash
npm test        # saf mantık birim testleri (node:test)
npm run build   # src/'yi deleteDiscordMessages.user.js olarak paketle (esbuild)
```

Çekirdek mantık (sayfalama, filtreler, retry/backoff, DM keşfi, checkpoint, watchdog) Node'un yerleşik test koşucusuyla birim-test edilir. DOM/API davranışı tarayıcıda manuel doğrulanır.

### Krediler

Victor N. (victornpb) tarafından yazılan, MIT lisanslı **[undiscord](https://github.com/victornpb/undiscord)** projesine dayanır ve ondan ilham alır. Purgecord onun silme yaklaşımını kullanır ve bazı kalıpları (token alma, sürüklenebilir pencere, mesaj silme) uyarlar; ardından motoru güvenilirlik için yeniden kurar ve toplu-DM desteği ekler.

### Lisans

[MIT](LICENSE). "Olduğu gibi" sunulur, hiçbir garanti verilmez.
