# Pofi — onay için görsel üretim seti

## Durum

10 ayrı adayın üretim metinleri hazır; henüz hiçbir aday görsel üretilmedi. Yerleşik Imagegen çağrıları 15 Ekim 2026 tarihinde hesap/model erişim hatalarıyla (HTTP 400 unsupported model ve HTTP 503 auth_unavailable) sonuçlandı. Bu klasör görsel onayı veya tamamlanmış üretim olarak değerlendirilmemelidir.

API/CLI alternatifi kullanılmadı. Bu yol için kullanıcının açık tercihi ve yerelde yapılandırılmış OPENAI_API_KEY gerekir. Uygulamanın kanonik Pofi dosyaları değiştirilmedi.

## Kaynaklar ve sabitler

- Kanonik kimlik: `extras/pofis-brand-kit/assets/pofi-full.png`.
- Personel kartı sembolü: `extras/pofis-brand-kit/references/tabii-logo-provided.png`.
- Karakter kuralları: marka kitindeki CHARACTER_BIBLE.md ve MASTER_PROMPT.md; güncel proje ton rehberi.
- Aynı krem-lavanta kedi; yuvarlak baş, tek kıvrımlı perçem, koyu oval gözler, pembe yanaklar, lavanta kuyruk ve kart askısı korunur.
- Her aday ayrı, tam gövdeli, şeffaf arka planlı bir görsel olacak. Yüz/kimlik, kart, dört uzuv ve küçük boyut okunurluğu çıktı oluştuktan sonra incelenecek.
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

Tam üretim metinleri `prompts.json` dosyasında saklanır. Her çağrı `basePrompt + variants[i].scene` kullanır; iki kanonik referans ve gerçek şeffaf arka plan talebi eklenir.
