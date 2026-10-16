# Pofi notlarını yönetme

[Kural haritası](rules/README.md) · [Terimler](../GLOSSARY.md)

Pofi'nin günlükleri, giriş / gelişme / kapanış parçalarından oluşan kısa notlardır. İçerik kataloğu, tarihli seçim havuzu, seçim motoru ve ekran birbirinden ayrıdır. Mesai kayıtlarıyla ilişkili hesap yapmaz.

## Tek sahipler

| Sorumluluk                               | Dosya                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tema ve metinler                         | [themes/](../src/lib/pofi-notes/themes/), [tema listesi](../src/lib/pofi-notes/themes/index.js)          |
| Özel not metinleri                       | [specials.js](../src/lib/pofi-notes/specials.js)                                                         |
| Gelecek yayınların özel gün eşleştirmesi | [special-days.ts](../src/lib/pofi-notes/special-days.ts)                                                 |
| İçerik doğrulama, kombinasyon ve çıkarma | [catalogue.ts](../src/lib/pofi-notes/catalogue.ts)                                                       |
| Kişi / hafta / tarih üzerinden seçim     | [notebook.ts](../src/lib/pofi-notes/notebook.ts)                                                         |
| Arşiv yayınları                          | [publications.ts](../src/lib/pofi-notes/publications.ts), [pool-v1.js](../src/lib/pofi-notes/pool-v1.js) |
| Yeni tarihli yayınlar                    | [scheduled-publications.json](../src/lib/pofi-notes/scheduled-publications.json)                         |
| Yeni yayın hazırlama ve komutlar         | [authoring.ts](../src/lib/pofi-notes/authoring.ts), [CLI](../scripts/pofi-notes.ts)                      |
| Uygulamanın bağlandığı giriş             | [index.ts](../src/lib/pofi-notes/index.ts)                                                               |
| Kişi anahtarının sunucuda oluşturulması  | [sunucu adaptörü](../src/server/pofi-notes.js)                                                           |
| Tarih uygunluğu / gösterim               | [takvim kuralı](rules/notebook-calendar.md), [not defteri](../src/components/pofi/notebook.js)           |

## Korunan arşiv

Kaynak ZIP'teki **20 tema, 240 metin parçası ve 11 özel notun 44 varyantı (132 paragraf)** korunur. Arşiv yayınları önce 768, 19 Ekim 2026 haftasından itibaren 1.280 normal not kombinasyonu kullanır. 8 Aralık `little-star:v1` herkes için ortaktır. Hash, havuz sırası ve seçim adımları eski atamaları korur.

`pool-v1.js` ve `publications.ts` içindeki iki arşiv kaydı geçmiş sözleşmenin dondurulmuş tanımıdır. Buradaki özel günler, gelecekte düzenlenecek `special-days.ts` listesinden özellikle bağımsızdır. İçerik eklemek mevcut yayın havuzuna kendiliğinden girmez; yeni tarihli yayın hazırlanır.

Yayınlar **metnin kopyasını değil, değişmez içerik kimliklerini** saklar. Bu yüzden yayımlanmış tema/parça/varyant kimliklerini silmeyin, yeniden adlandırmayın veya metinlerini değiştirmeyin. Düzeltmeyi yeni bir kimlikle ekleyip eski kimliği gelecek havuzdan çıkarın. Arşiv metinleri ayrıca ZIP'ten alınan hash testleriyle korunur; sonradan eklenen içeriklerde bu disiplin kod incelemesinde de korunmalıdır.

## Tema veya metin eklemek

1. [Mevcut bir temanın](../src/lib/pofi-notes/themes/coffee.js) yapısıyla yeni dosya ekleyin: `id`, `title`, `premise`, `intros`, `developments`, `endings`.
2. Temayı `themes/index.js` listesine bir kez ekleyin. Motor veya ekran değişmez.
3. Bir temaya yeni parça eklemek için ilgili gruba yeni anahtar ekleyin: örneğin `intros.i5`. Gruplar dört parçayla sınırlı değildir; her grupta en az bir dolu metin gerekir.
4. Kimlikler küçük harfle başlamalı; küçük harf, rakam ve tire içerebilir. Normal not kimliği `coffee:i1:d1:e1`, özel not kimliği `special:little-star:v1` biçimindedir.
5. Metni [ton rehberine](brand/pofi-tone-guide.md) göre inceleyin, aşağıdaki doğrulama ve önizlemeyi çalıştırın; ardından yeni yayın hazırlayın.

Özel not eklerken metni `specials.js` içine, `MM-DD → note` eşleştirmesini `special-days.ts` içine ekleyin. Varyantlar metin kataloğundan alınır. `sharedVariant` varsa herkes o varyantı görür; yoksa kişi anahtarıyla seçim yapılır. Bu değişiklik de ancak yeni yayının başlangıcından itibaren uygulanır.

## Yerel yönetim komutları

Proje kökünde:

```powershell
bun scripts/pofi-notes.ts list
bun scripts/pofi-notes.ts validate
bun scripts/pofi-notes.ts preview --date 2026-10-16 --key example
```

Yeni yayını **mevcut haftadan ve son yayından sonraki bir pazartesiye** hazırlayın. Örnek tarih kullanım sırasında gelecekte olmalıdır:

```powershell
bun scripts/pofi-notes.ts prepare --from 2026-10-26
```

Tema / parça / tek kombinasyon / özel gün çıkarma örnekleri (birleştirilebilir ve tekrarlanabilir):

```powershell
bun scripts/pofi-notes.ts prepare --from 2026-10-26 `
  --exclude-theme chair `
  --exclude-part coffee:intros:i1 `
  --exclude-note plant:i1:d1:e1 `
  --exclude-special-date 12-08
```

Her yayın o anki katalogdan **tam bir yeni havuz** oluşturur. Önceki yayının çıkarmaları otomatik devralınmaz; korunacak çıkarmaları komuta yeniden verin. Bir gruptaki tüm parçaları çıkarmak yerine temayı çıkarın. En az beş normal not kalmalıdır. Özel tarihi çıkarmak, hafta içi o tarihte normal not seçilmesi; hafta sonu ise o günün listelenmemesi demektir.

`prepare` yalnız `scheduled-publications.json` dosyasına yerel bir kayıt ekler. Mevcut yayınları ve metinleri değiştirmez. Dağıtım yapmaz. Yeni kaydın tarihini, kimliklerini ve özel günlerini diff'te inceleyin; aynı `preview` komutunu yeni yayın haftasıyla çalıştırın. Yanlışlık varsa henüz kullanılmamış yeni kaydı kaynak değişikliği olarak düzeltin; yayımlanmış kaydı değiştirmeyin.

## Doğrulama

```powershell
bun test src/lib/pofi-notes
bun scripts/pofi-notes.ts validate
bun run typecheck
```

[Davranış testleri](../src/lib/pofi-notes/notebook.test.ts) ZIP metinlerini ve özgün motorun üç kişi anahtarı için 2026–2028 arasında ürettiği 2.379 günlük seçimi karşılaştırır. Yeni tema/parça, gelecekte çıkarma, ortak özel not ve hatalı içerik de sınanır. [Komut testi](../src/lib/pofi-notes/authoring-cli.test.ts) gerçek komutu izole kaynak kopyasında çalıştırır; asıl yayın dosyasına yazmaz. Arşiv testleri yeni kimliklerin eklenmesine izin verir; var olan arşiv içeriğinin değiştirilmesini yakalar.
