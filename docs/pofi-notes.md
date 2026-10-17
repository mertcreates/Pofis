# Pofi notlarını yönetme

[Kural haritası](rules/README.md) · [Terimler](../GLOSSARY.md)

Pofi'nin günlükleri giriş / gelişme / kapanış parçalarından oluşan kısa notlardır. İçerik kataloğu, tek not havuzu, seçim motoru ve ekran kendi sahiplerinde kalır. Mesai kayıtlarıyla ilişkili hesap yapmaz.

## Tek sahipler

| Sorumluluk | Dosya |
| --- | --- |
| Tema ve metinler | [themes/](../src/lib/pofi-notes/themes/), [tema listesi](../src/lib/pofi-notes/themes/index.js) |
| Özel not metinleri ve varyantları | [specials.js](../src/lib/pofi-notes/specials.js) |
| Özel gün listesi | [special-days.ts](../src/lib/pofi-notes/special-days.ts) |
| İçerik doğrulama ve tek havuz üretimi | [catalogue.ts](../src/lib/pofi-notes/catalogue.ts) |
| Kişi / hafta / tarih üzerinden seçim | [notebook.ts](../src/lib/pofi-notes/notebook.ts) |
| Uygulamanın bağlandığı giriş | [index.ts](../src/lib/pofi-notes/index.ts) |
| Kişi anahtarının sunucuda oluşturulması | [sunucu adaptörü](../src/server/pofi-notes.js) |
| Not yönetimi ve önizleme komutları | [CLI](../scripts/pofi-notes.ts) |
| Tarih uygunluğu / gösterim | [takvim kuralı](rules/notebook-calendar.md), [not defteri](../src/components/pofi/notebook.js) |

## Tek havuz

20 tema ve her temadaki 4 giriş, 4 gelişme, 4 kapanış parçası toplam **1.280 normal not** üretir. Katalog havuz sırasını bir kez kurar; aynı havuz tüm tarihler için kullanılır. Seçim kişi anahtarına, haftaya ve güne göre deterministiktir.

Tarih bazlı yayın kaydı veya eski havuz seçimi yoktur. İçerik eklemek ya da düzenlemek mevcut tek havuzu günceller ve her tarihteki seçimi etkileyebilir. Proje yayımlanmadığı için geçmiş seçimler dondurulmaz. Özel tarihler yalnız `special-days.ts` içinde tanımlanır; varyantlar `specials.js` kataloğundan alınır. 8 Aralık `little-star:v1` herkes için ortaktır.

Güncel tema ve özel not metinleri [içerik fixture'ındaki](../src/lib/pofi-notes/fixtures/current-content.json) hash'lerle izlenir; başlangıç kaynağının ZIP hash'i ayrıca korunur. Ton düzenlemelerinde yalnız incelenen metinlerin hash'lerini ve etkilenen seçim referanslarını güncelleyin. Tema sırası ve havuz sırası seçim sonucunu etkiler; bunları değiştirirken [önizleme](#yerel-komutlar) ile sonuçları inceleyin.

## Tema veya metin eklemek

1. [Mevcut bir temanın](../src/lib/pofi-notes/themes/coffee.js) yapısıyla yeni dosya ekleyin: `id`, `title`, `premise`, `intros`, `developments`, `endings`.
2. Temayı `themes/index.js` listesine bir kez ekleyin. Katalog ve seçim motoru yeni kombinasyonları tek havuza dahil eder.
3. Yeni parçayı ilgili gruba ekleyin; her grupta en az bir dolu metin olmalıdır.
4. Kimlikler küçük harfle başlamalı; küçük harf, rakam ve tire içerebilir. Normal not kimliği `coffee:i1:d1:e1`, özel not kimliği `special:little-star:v1` biçimindedir.
5. Metni [ton rehberine](brand/pofi-tone-guide.md) göre inceleyin, doğrulayın ve temsilî tarih/kişi anahtarıyla önizleyin.

Özel not eklerken metni `specials.js` içine, `MM-DD → note` eşleştirmesini `special-days.ts` içine ekleyin. `sharedVariant` varsa herkes o varyantı görür; yoksa kişi anahtarıyla seçim yapılır.

## Yerel komutlar

Proje kökünde:

```powershell
bun scripts/pofi-notes.ts list
bun scripts/pofi-notes.ts validate
bun scripts/pofi-notes.ts preview --date 2026-10-19 --key example
```

`validate` katalog, 1.280 notluk havuz ve özel gün sayısını bildirir. `preview`, seçilen haftanın notlarını geçerli tek havuz ve özel gün listesiyle gösterir.

## Doğrulama

```powershell
bun test src/lib/pofi-notes
bun scripts/pofi-notes.ts validate
bun run typecheck
```

[Davranış testleri](../src/lib/pofi-notes/notebook.test.ts) içerik fixture'larını, tek havuz sırasını ve 2026–2028 deterministik seçimlerini kapsar. [CLI testi](../src/lib/pofi-notes/cli.test.ts) listeleme, doğrulama, önizleme ve kaldırılan yayın hazırlama komutunu denetler.
