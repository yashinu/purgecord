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
