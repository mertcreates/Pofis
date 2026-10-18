# Pofi — onay için görsel üretim seti

## Durum

Depoda iki görsel seti bulunur:

| Set | İçerik |
| --- | --- |
| [round-1-approved](round-1-approved/) | 10 PNG: durumlar, bitki, defter ve kamera |
| [round-2-approved](round-2-approved/) | 10 PNG: şemsiye, kâğıt tekne, su birikintisi, fırıldak, paket, fide, çanta, eskiz, kart ve esneme |

Klasör adları korunur. Uygulamanın etkin görselleri [görsel kaynaklar](../assets.md) belgesindedir; bu setlerin uygulamaya alınması ayrıca seçilmelidir.

[prompts.json](prompts.json) ilk üretim denemesinin metinlerini ve eski engel durumunu içerir; güncel dosya envanteri değildir. Yeni üretim için [karakter kuralları](../../../extras/pofis-brand-kit/docs/CHARACTER_BIBLE.md) ve [ana prompt](../../../extras/pofis-brand-kit/docs/MASTER_PROMPT.md) kullanılır.

## Kaynaklar ve sabitler

- Kanonik kimlik: `extras/pofis-brand-kit/assets/pofi-full.png`.
- Personel kartı sembolü: `extras/pofis-brand-kit/references/tabii-logo-provided.png`.
- Karakter kuralları: marka kitindeki CHARACTER_BIBLE.md ve MASTER_PROMPT.md; güncel proje ton rehberi.
- Aynı krem-lavanta kedi; yuvarlak baş, tek kıvrımlı perçem, koyu oval gözler, pembe yanaklar, lavanta kuyruk ve kart askısı korunur.
- Uygulamaya alınacak görselde yüz/kimlik, kart, dört uzuv, gerçek şeffaflık ve küçük boyutta okunurluk incelenir.
- Onay almadan uygulama dosyaları değiştirilmeyecek.

## Hazırlanan sahneler

| No | Dosya kökü | Başlık | Sahne |
| --- | --- | --- | --- |
| 01 | 01-idle | Buradayım | Küçük bir pati selamı |
| 02 | 02-working | Bilgisayar başında | Küçük laptop ile sakin çalışma |
| 03 | 03-break | Kupa molası | İki ön patiyle tutulan sade kupa |
| 04 | 04-tired | Biraz uykum geldi | Hafif esneme |
| 05 | 05-completed | Defteri kapattım | Kapalı defterin yanında sakin oturuş |
| 06 | 06-overworked | Ben biraz daha buradayım | Masa saatine küçük bir bakış |
| 07 | 07-error | Benimki açılmadı | Ekranı açılmayan laptopa meraklı bakış |
| 08 | 08-plant | Bitkiyle aynı yere baktık | Küçük ofis bitkisiyle sakin an |
| 09 | 09-notebook | Küçük bir not | Not defteri ve kalem |
| 10 | 10-camera | Bu kez fotoğraftayım | Küçük lavanta fotoğraf makinesi |

İlk setin metinleri `prompts.json` içindedir; `basePrompt + variants[i].scene` yapısını kullanır. Bu metinlerdeki oturan poz ilk denemeye aittir; yeni üretimler güncel karakter kurallarındaki dik duruşu izler.
