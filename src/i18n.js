// Minimal i18n. English is the default/fallback; Turkish is shown to users
// whose Discord language is Turkish. Detection uses <html lang> (set by Discord),
// then localStorage.locale, then navigator.language.

const STRINGS = {
  en: {
    // --- header / tabs ---
    subtitle: 'Bulk message & DM deleter',
    streamer: 'Streamer',
    close: 'Close',
    tab_channel: 'Channel / Server',
    tab_dm: 'Bulk DM',
    tab_log: 'Log',
    // --- channel view ---
    author_id: 'Author ID',
    author_ph: 'Author of the messages to delete',
    btn_me: 'me',
    server_id: 'Server ID',
    server_ph: '@me = DM',
    btn_current: 'current',
    channel_id: 'Channel ID',
    channel_ph: 'Channel/DM id (comma-separated)',
    filters: 'Filters',
    content: 'Content',
    content_ph: 'Messages containing this text',
    has_link: 'Has link',
    has_file: 'Has file',
    include_pinned: 'Delete pinned too',
    regex: 'Regex',
    regex_ph: 'regular expression (i)',
    date_range: 'Date / message range',
    after: 'After',
    before: 'Before',
    id_range: 'min ID / max ID',
    min_id: 'min id',
    max_id: 'max id',
    advanced: 'Advanced',
    delete_delay: 'Delete delay:',
    page_delay: 'Page delay:',
    token: 'Token',
    token_ph: 'auto-filled',
    btn_fill: 'fill',
    // --- DM view ---
    load_dms: 'Load DMs',
    search_ph: 'Search...',
    dm_count: '{sel} selected / {total}',
    mode_only: 'Delete only selected',
    mode_except: 'Delete all except selected',
    select_all: 'Select all',
    follow_dm: 'Follow DM in Discord',
    close_dm: 'Close cleaned DM',
    badge_group: 'Group',
    badge_dm: 'DM',
    dm_hint: 'In DM mode only your own messages are deleted. Channel-tab filters apply here too.',
    // --- log view ---
    follow_log: 'Follow log (scroll to newest)',
    log_msg_info: 'Log deleted message info (incl. content — hidden in Streamer mode)',
    first_run_hint: "If it doesn't work right after loading, wait 1-2s and try again (Discord/webpack may not be ready yet).",
    // --- resume banner ---
    resume: 'Resume',
    discard: 'Discard',
    resume_text: 'Unfinished job found ({n} deleted). Resume?',
    // --- footer ---
    btn_delete: '▶ Delete',
    btn_count: 'Count only',
    btn_stop: '⏸ Stop',
    // --- focus card ---
    dash: '—',
    starting: 'starting...',
    deleted_n: 'deleted: {n}',

    // --- runtime / logs (ui.js) ---
    ready: 'Purgecord ready. Pick a tab and start.',
    dmtab_init_failed: 'DM tab could not initialize: {err}. Refresh the page and try again.',
    need_author_server: 'Author ID is required for server-wide deletion (only your own messages are deleted).',
    need_channel_or_server: 'Channel ID, or Server ID + Author ID for server-wide deletion, is required.',
    confirm_channels: "Messages matching the filter in {n} channel(s)/DM(s) will be deleted. Continue?",
    confirm_server: 'Your own messages in this server ({guildId}) will be deleted. Continue?',
    jobs_built: '{n} job(s) built (channelId={ch}, guildId={g}). Waiting for confirmation...',
    canceled_no_confirm: 'Canceled (not confirmed).',
    confirmed_prep: 'Confirmed. Preparing token/engine...',
    token_got_engine: 'Token obtained ({n} chars). Engine ready, starting deletion...',
    dryrun_started: 'Dry-run started (no deletion).',
    delete_started: 'Deletion started.',
    est_total: 'Estimated total: ~{n} messages.',
    dryrun_done: 'Dry-run done: {n} messages match the filter.',
    done_summary: 'Done. Deleted: {del}, failed: {fail}.',
    unexpected_error: 'Unexpected error: {err}',
    dm_tab_not_ready: 'DM tab is not ready.',
    stopped: 'Stopped.',
    no_valid_token: 'No valid token. If "fill" did not work, paste it manually → F12 > Network > click any request to discord.com/api > Request Headers > copy the "authorization" value.',
    token_got: 'Token obtained ({n} chars).',
    token_autofill_failed: 'Could not auto-fill token. Paste manually → F12 > Network tab > click any request to discord.com/api > Request Headers > copy the value on the "authorization" line.',
    resume_done: 'Resumed job finished.',
    stall_hint: 'No progress for a while. If it is truly stuck, press Stop and use "Resume" in the panel to continue where you left off.',

    // --- dmTab ---
    self_id_missing: 'Could not get your own id; the "only my messages" filter may be weak.',
    loading_dms: 'Loading DM list...',
    dms_found: '{n} DM(s)/group(s) found.',
    dms_failed: 'Could not load DM list: {err}',
    no_target_dm: 'No target DM (empty by selection/mode).',
    dm_jobs_built: '{n} DM job(s) built. Waiting for confirmation...',
    confirm_dms: "Your own messages in {n} DM(s) will be deleted. Continue?",
    canceled: 'Canceled.',
    dms_processing: '{n} DM(s) to process ({mode}).',
    mode_dryrun: 'dry-run',
    mode_delete: 'delete',
    dm_start: '▶ DM: {name}{extra}',
    dm_extra_est: ' (~{n} messages)',
    dm_done: '✓ {name}: {count} deleted.',
    dryrun_total: 'Dry-run: {n} messages total match the filter.',
    dm_all_done: 'Bulk DM done. Deleted: {del}, failed: {fail}.',
    dm_error: 'Bulk DM error: {err}',

    // --- engine ---
    canceled_short: 'Canceled.',
    job_error: 'Job error: {err}',
    auth_error: 'Auth error ({status}). Token may be invalid.',
    unexpected_status: 'Unexpected status {status}; skipping this job.',
    page_fetch_failed: 'Could not fetch page: {err}',
    delete_error: 'Delete error {status} (id {id}).',
    dm_still_has_msgs: '{label}: still has messages matching the filter, DM not closed.',
    dm_closed: '{label}: clean — DM closed.',
    dm_close_failed: '{label}: could not close DM (status {status}).',
    search_error: 'Search error: {err}',
    search_status: 'Search status {status}; skipping job.',
    empty_verify: 'Empty page ({n}/3) verifying...',

    // --- ApiClient ---
    net_error_retry: 'Network error; retrying in {ms}ms (attempt {n}).',
    throttle_wait: '{kind}; waiting {ms}ms...',
    server_error_retry: 'Server error {status}; retrying in {ms}ms...',
    indexing: 'Indexing',
    rate_limit: 'Rate limit',
  },

  tr: {
    subtitle: 'Toplu mesaj & DM silici',
    streamer: 'Streamer',
    close: 'Kapat',
    tab_channel: 'Kanal / Sunucu',
    tab_dm: 'Toplu DM',
    tab_log: 'Log',
    author_id: 'Author ID',
    author_ph: 'Silinecek mesajların yazarı',
    btn_me: 'ben',
    server_id: 'Server ID',
    server_ph: '@me = DM',
    btn_current: 'mevcut',
    channel_id: 'Channel ID',
    channel_ph: 'Kanal/DM id (virgülle çoklu)',
    filters: 'Filtreler',
    content: 'İçerik',
    content_ph: 'Bu metni içerenler',
    has_link: 'Link içeren',
    has_file: 'Dosya içeren',
    include_pinned: 'Sabitlenmişleri de sil',
    regex: 'Regex',
    regex_ph: 'düzenli ifade (i)',
    date_range: 'Tarih / mesaj aralığı',
    after: 'Sonrası (After)',
    before: 'Öncesi (Before)',
    id_range: 'min ID / max ID',
    min_id: 'min id',
    max_id: 'max id',
    advanced: 'Gelişmiş',
    delete_delay: 'Silme gecikmesi:',
    page_delay: 'Sayfa gecikmesi:',
    token: 'Token',
    token_ph: 'otomatik doldurulur',
    btn_fill: 'doldur',
    load_dms: "DM'leri yükle",
    search_ph: 'Ara...',
    dm_count: '{sel} seçili / {total}',
    mode_only: 'Sadece seçilenleri sil',
    mode_except: 'Seçilenler hariç hepsini sil',
    select_all: 'Tümünü seç',
    follow_dm: "DM'i Discord'da takip et",
    close_dm: "Temizlenen DM'i kapat",
    badge_group: 'Grup',
    badge_dm: 'DM',
    dm_hint: 'DM modunda yalnız kendi mesajların silinir. Kanal sekmesindeki filtreler burada da uygulanır.',
    follow_log: 'Logu takip et (son loga kaydır)',
    log_msg_info: 'Silinen mesaj bilgilerini logla (içerik dahil — Streamer modda gizli)',
    first_run_hint: 'İlk yüklemeden hemen sonra çalışmazsa 1-2 sn bekleyip tekrar dene (Discord/webpack henüz hazır olmayabilir).',
    resume: 'Devam et',
    discard: 'Vazgeç',
    resume_text: 'Yarım kalan iş var ({n} silindi). Devam edilsin mi?',
    btn_delete: '▶ Sil',
    btn_count: 'Sadece say',
    btn_stop: '⏸ Durdur',
    dash: '—',
    starting: 'başlıyor...',
    deleted_n: 'silinen: {n}',

    ready: 'Purgecord hazır. Bir sekme seç ve başlat.',
    dmtab_init_failed: 'DM sekmesi kurulamadı: {err}. Sayfayı yenileyip tekrar dene.',
    need_author_server: 'Sunucu-geneli silmede Author ID gerekli (yalnız kendi mesajların silinir).',
    need_channel_or_server: 'Channel ID, veya sunucu-geneli silme için Server ID + Author ID gerekli.',
    confirm_channels: "{n} kanal/DM'de filtreye uyan mesajların silinecek. Devam?",
    confirm_server: 'Bu sunucudaki ({guildId}) kendi mesajların silinecek. Devam?',
    jobs_built: '{n} iş kuruldu (channelId={ch}, guildId={g}). Onay bekleniyor...',
    canceled_no_confirm: 'İptal edildi (onay verilmedi).',
    confirmed_prep: 'Onaylandı. Token/motor hazırlanıyor...',
    token_got_engine: 'Token alındı ({n} karakter). Motor kuruldu, silme başlıyor...',
    dryrun_started: 'Dry-run başladı (silme yok).',
    delete_started: 'Silme başladı.',
    est_total: 'Tahmini toplam: ~{n} mesaj.',
    dryrun_done: 'Dry-run bitti: {n} mesaj filtreye uyuyor.',
    done_summary: 'Bitti. Silinen: {del}, başarısız: {fail}.',
    unexpected_error: 'Beklenmeyen hata: {err}',
    dm_tab_not_ready: 'DM sekmesi hazır değil.',
    stopped: 'Durduruldu.',
    no_valid_token: 'Geçerli token yok. "doldur" işe yaramadıysa token\'ı elle yapıştır → F12 > Network > discord.com/api\'ye giden herhangi bir isteğe tıkla > Request Headers > "authorization" değerini kopyala.',
    token_got: 'Token alındı ({n} karakter).',
    token_autofill_failed: 'Token otomatik alınamadı. Elle yapıştır → F12 > Network sekmesi > discord.com/api\'ye giden herhangi bir isteğe tıkla > Request Headers > "authorization" satırındaki değeri kopyala.',
    resume_done: 'Devam eden iş bitti.',
    stall_hint: 'Uzun süredir ilerleme yok. Gerçekten takıldıysa Durdur\'a basıp paneldeki "Devam et" ile kaldığın yerden sürebilirsin.',

    self_id_missing: 'Kendi id\'niz alınamadı; yalnız kendi mesajlar filtresi zayıf olabilir.',
    loading_dms: 'DM listesi yükleniyor...',
    dms_found: '{n} DM/grup bulundu.',
    dms_failed: 'DM listesi alınamadı: {err}',
    no_target_dm: 'Hedef DM yok (seçim/moda göre boş).',
    dm_jobs_built: '{n} DM işi kuruldu. Onay bekleniyor...',
    confirm_dms: "{n} DM'de kendi mesajların silinecek. Devam?",
    canceled: 'İptal edildi.',
    dms_processing: '{n} DM işlenecek ({mode}).',
    mode_dryrun: 'dry-run',
    mode_delete: 'silme',
    dm_start: '▶ DM: {name}{extra}',
    dm_extra_est: ' (~{n} mesaj)',
    dm_done: '✓ {name}: {count} silindi.',
    dryrun_total: 'Dry-run: toplam {n} mesaj filtreye uyuyor.',
    dm_all_done: 'Toplu DM bitti. Silinen: {del}, başarısız: {fail}.',
    dm_error: 'Toplu DM hatası: {err}',

    canceled_short: 'İptal edildi.',
    job_error: 'Job hatası: {err}',
    auth_error: 'Yetki hatası ({status}). Token geçersiz olabilir.',
    unexpected_status: 'Beklenmeyen durum {status}; bu job atlanıyor.',
    page_fetch_failed: 'Sayfa çekilemedi: {err}',
    delete_error: 'Silme hatası {status} (id {id}).',
    dm_still_has_msgs: '{label}: hâlâ filtreye uyan mesaj var, DM kapatılmadı.',
    dm_closed: '{label}: temiz — DM kapatıldı.',
    dm_close_failed: '{label}: DM kapatılamadı (durum {status}).',
    search_error: 'Arama hatası: {err}',
    search_status: 'Arama durumu {status}; job atlanıyor.',
    empty_verify: 'Boş sayfa ({n}/3) doğrulanıyor...',

    net_error_retry: 'Ağ hatası; {ms}ms sonra tekrar (deneme {n}).',
    throttle_wait: '{kind}; {ms}ms bekleniyor...',
    server_error_retry: 'Sunucu hatası {status}; {ms}ms sonra tekrar...',
    indexing: 'İndeksleniyor',
    rate_limit: 'Rate limit',
  },
};

let LOCALE = 'en';

export function setLocale(loc) {
  LOCALE = STRINGS[loc] ? loc : 'en';
  return LOCALE;
}

/** Detect the user's Discord language → 'tr' for Turkish, otherwise 'en'. */
export function detectLocale() {
  let loc = '';
  try { loc = document.documentElement.lang || ''; } catch { /* ignore */ }
  if (!loc) {
    try {
      const iframe = document.body.appendChild(document.createElement('iframe'));
      const raw = iframe.contentWindow.localStorage.locale;
      iframe.remove();
      loc = raw ? JSON.parse(raw) : '';
    } catch { /* ignore */ }
  }
  if (!loc) { try { loc = navigator.language || ''; } catch { /* ignore */ } }
  return String(loc).toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

/** Translate a key with optional {param} substitution. Falls back to English, then the key. */
export function t(key, params) {
  let s = (STRINGS[LOCALE] && STRINGS[LOCALE][key]) || STRINGS.en[key] || key;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
  return s;
}
