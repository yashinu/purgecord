# 🧹 Purgecord

A userscript to bulk-delete **your own** Discord messages — in a channel/server or across your DMs. Based on [undiscord](https://github.com/victornpb/undiscord), rewritten and hardened so it doesn't stop on its own, with a modern tabbed UI, a **Bulk DM** mode, and automatic English/Turkish based on your Discord language.

> ⚠️ **Read this first.** Automating a user account (a "self-bot") is **against Discord's Terms of Service** and can, in principle, get your account actioned. Deleting your *own* messages is a gray area that Discord rarely enforces, but **use this at your own risk, only on your own account, for your own data.** **Never share your auth token** — it grants full access to your account. This is a third-party script: only run it if you trust the code (it's all here, read it).

## Features

- **Reliable by design** — index-independent cursor pagination terminates deterministically (no false "done", no getting stuck). Centralized retry for rate limits (429), indexing (202), 5xx and network errors — it slows down and keeps going instead of dying.
- **Bulk DM** — list all your open DMs, then *delete only selected* or *delete all except selected*. Per-DM progress, optional "follow the DM in Discord", and an optional "close the DM once it's clean".
- **Filters** — by author, text content, has-link/has-file, regex, pinned, date range, or message-id range.
- **Count only (dry-run)** — see how many messages match before deleting anything.
- **Resume** — refresh the tab mid-run and continue where you left off (checkpoint in localStorage).
- **Adaptive rate limiting** — the delete delay auto-tunes upward on 429s to a sustainable rate.
- **Streamer mode** — blurs your token, ids, DM names and message content for safe screen-sharing.
- **English / Türkçe** — the UI language follows your Discord language automatically.

## Install

**Option A — prebuilt (easiest):**
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw script and let your userscript manager install it:
   `https://raw.githubusercontent.com/yashinu/purgecord/main/dist/deleteDiscordMessages.user.js`
3. Open `discord.com` in the browser — a 🧹 icon appears in the top bar next to the inbox/help buttons.

**Option B — build from source:**
```bash
npm install
npm run build
# then load dist/deleteDiscordMessages.user.js into your userscript manager
```

> Works with Discord in the **browser** (userscript managers don't run inside the desktop app).

## Usage

1. Click the 🧹 icon to open the panel.
2. **Channel / Server tab:** fill Author/Server/Channel id with the "current" buttons, pick filters, then **Delete** (or **Count only** first). Leave Channel id empty + set Server id + Author id to delete across a whole server.
3. **Bulk DM tab:** **Load DMs** → select → choose *only selected* / *all except selected* → **Delete**.
4. Use the **Advanced** section to tune delete/page delays or paste a token manually if auto-fill fails.

## Development

```bash
npm test        # pure-logic unit tests (node:test)
npm run build   # bundle src/ into dist/deleteDiscordMessages.user.js (esbuild)
```

The core logic (pagination, filters, retry/backoff, DM discovery, checkpoint, watchdog) is unit-tested with Node's built-in test runner. DOM/API behavior is verified manually in the browser.

## Credits

Based on and inspired by **[undiscord](https://github.com/victornpb/undiscord)** by Victor N. (victornpb), MIT licensed. Purgecord reuses its deletion approach and adapts several patterns (token retrieval, draggable window, message deletion), then rebuilds the engine for reliability and adds bulk-DM support.

## License

[MIT](LICENSE). Provided "as is", without warranty of any kind.
