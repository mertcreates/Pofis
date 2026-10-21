# Pofi notlarını yönetme

[Kural haritası](rules/README.md) · [Terimler](../GLOSSARY.md)

Pofi'nin günlükleri giriş / gelişme / kapanış parçalarından oluşan kısa notlardır. İçerik kataloğu, tek not havuzu, seçim motoru ve ekran kendi sahiplerinde kalır. Not seçimi kişi anahtarı, hafta ve tarihe dayanır.

Menü altındaki [yemek yorumları](rules/meal-menu.md#pofi-yemek-yorumları), aynı hesap anahtarı ve seçilen günle kendi bütün metin havuzundan seçilir. Yemek koşulları ve içerik sahipleri menü sözleşmesinde yönetilir.

## Tek sahipler

| Sorumluluk | Dosya |
| --- | --- |
| Tema ve metinler | [themes/](../src/lib/pofi-notes/themes/), [tema listesi](../src/lib/pofi-notes/themes/index.js) |
| Özel not metinleri ve varyantları | [specials.js](../src/lib/pofi-notes/specials.js) |
| Özel gün listesi | [special-days.ts](../src/lib/pofi-notes/special-days.ts) |
| İçerik doğrulama ve tek havuz üretimi | [catalogue.ts](../src/lib/pofi-notes/catalogue.ts) |
| Kişi / hafta / tarih üzerinden seçim | [notebook.ts](../src/lib/pofi-notes/notebook.ts) |
| Uygulamanın bağlandığı giriş | [index.ts](../src/lib/pofi-notes/index.ts) |
| Hesap anahtarının başarılı girişte oluşturulması | [kaynak adaptörü](../src/server/pdks.js) |
| Hesap anahtarıyla not seçimine bağlanma | [sunucu adaptörü](../src/server/pofi-notes.js) |
| Not yönetimi ve önizleme komutları | [CLI](../scripts/pofi-notes.ts) |
| Tarih uygunluğu / gösterim | [takvim kuralı](rules/notebook-calendar.md), [not defteri](../src/components/pofi/notebook.js) |

## Hesap anahtarı

Başarılı PDKS girişinde `SHA-256(JSON.stringify(["pofis:pofi-account:v1", kurumOrigin, kullanıcıAdı.trim()]))` hesaplanır. Saklanan sonuç, sunucu oturumuna özel `self.pofiKey` alanıdır. API yalnız seçilen notları döndürür. Bu anahtar not seçimi içindir; rapor erişim yetkisini kaynak oturumu belirler.

Aynı origin ve aynı kullanıcı adı farklı cihaz/oturumlarda aynı anahtarı üretir. Dış boşluklar temizlenir; harf büyüklüğü ve giriş adı takma adları ayrı anahtar üretir. Kullanıcı adı değişirse seçim değişebilir; aynı adlı farklı hesaplar ayrı anahtar alır. Farklı anahtarlar aynı normal notu seçebilir. Anahtarın görevi deterministik not seçimidir.

Kişi ID’sinden hesap anahtarına geçiş mevcut ve geçmiş tarihlerin not seçimlerini değiştirebilir; tüm tarihlerde notlar güncel havuzdan hesaplanır. Yeni anahtarı olmayan oturumlar yeniden giriş ister.

## Tek havuz

Güncel katalog **16 tema ve 1.024 normal not** içerir: Kahve, Toplantı, Asansör, Küçük bir yardım, Yapılacaklar listesi, Dosya adı, Bilgisayar, Pencere misafiri, Yapışkan not, Masa komşusu, Atıştırmalıklar, Küçük bir yanlışlık, Karton, Sandalye, Masa ve Öğle yemeği. Her temada 4 giriş, 4 gelişme ve 4 kapanış vardır; her tema 64 kombinasyon üretir. Özel notlar ve özel gün eşleştirmeleri korunur. Temalar kullanıcıyla belirlenir; metinler ve tüm kombinasyonları incelendikten sonra onaylanan tema kataloğa eklenir.

Katalog giriş × gelişme × kapanış kombinasyonlarından havuz sırasını bir kez kurar; aynı havuz tüm tarihler için kullanılır. Seçim kişi anahtarına, haftaya ve güne göre deterministiktir. Normal havuz boşken haftalık sonuç yalnız o haftanın özel notlarını içerir; diğer günler için not dönmez. Defter mevcut nötr boş durumunu ve tarih gezinmesini korur. Doğrudan normal gün seçimi içerik yokluğu hatası verir. Dolu normal havuz haftalık tekrarı önlemek için en az beş benzersiz not içermelidir.

İçerik eklemek ya da düzenlemek mevcut tek havuzu günceller ve geçmiş tarihler dahil her tarihteki seçimi etkileyebilir. Özel tarihler yalnız `special-days.ts` içinde tanımlanır; varyantlar `specials.js` kataloğundan alınır. 8 Aralık `little-star:v1` herkes için ortaktır.

Güncel tema ve özel not metinleri [içerik fixture'ındaki](../src/lib/pofi-notes/fixtures/current-content.json) hash'lerle izlenir; başlangıç kaynağının ZIP hash'i ayrıca korunur. Ton düzenlemelerinde yalnız incelenen metinlerin hash'lerini ve etkilenen seçim referanslarını güncelleyin. Tema sırası ve havuz sırası seçim sonucunu etkiler; bunları değiştirirken [önizleme](#yerel-komutlar) ile sonuçları inceleyin.

## Tema veya metin eklemek

1. [NoteTheme](../src/lib/pofi-notes/types.ts) yapısıyla yeni dosya ekleyin: `id`, `title`, `premise`, `intros`, `developments`, `endings`.
2. Temayı `themes/index.js` listesine bir kez ekleyin. Katalog ve seçim motoru yeni kombinasyonları tek havuza dahil eder.
3. Yeni parçayı ilgili gruba ekleyin; her grupta en az bir dolu metin olmalıdır.
4. Kimlikler küçük harfle başlamalı; küçük harf, rakam ve tire içerebilir. Normal not kimliği `coffee:i1:d1:e1`, özel not kimliği `special:little-star:v1` biçimindedir.
5. Metni [ton rehberine](brand/pofi-tone-guide.md) göre inceleyin, doğrulayın ve temsilî tarih/kişi anahtarıyla önizleyin.

Özel not eklerken metni `specials.js` içine, `MM-DD → note` eşleştirmesini `special-days.ts` içine ekleyin. `sharedVariant` varsa herkes o varyantı görür; yoksa kişi anahtarıyla seçim yapılır.

Özel notların her varyantı bağımsız, üç parçalı bir hikâyedir; her seçim bir varyantın kendi giriş, gelişme ve kapanışını birlikte kullanır. Katalogda 13 özel tarih vardır. 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı, 29 Ekim Cumhuriyet Bayramı ve 10 Kasım Atatürk'ü Anma Günü bu tarihler arasındadır. Bayram notları küçük katılım ve gözlem anlarını, 10 Kasım notları saygılı anma davranışlarını anlatır. Kâğıt gemi serisi 12 Mart (İlk gün), 9 Nisan (Bir süre sonra) ve 7 Mayıs (Yeniden) sırasıyla ilerler. Her tarihin varyantı ayrı seçilir ve kendi içinde anlamlı bir hikâye sunar. 8 Aralık'ın ortak `little-star:v1` metni korunur; tarih eşlemesi ve tam metni davranış testiyle doğrulanır.

## Yerel komutlar

Proje kökünde:

```powershell
bun scripts/pofi-notes.ts list
bun scripts/pofi-notes.ts validate
bun scripts/pofi-notes.ts preview --date 2026-10-19 --key example
```

`validate` katalogdaki tema, normal not ve özel gün sayısını bildirir. `preview`, seçilen haftanın notlarını geçerli tek havuz ve özel gün listesiyle gösterir.

## Doğrulama

```powershell
bun test src/lib/pofi-notes
bun scripts/pofi-notes.ts validate
bun run typecheck
```

[Davranış testleri](../src/lib/pofi-notes/notebook.test.ts) içerik fixture'larını, tek havuz sırasını ve 2026–2028 deterministik seçimlerini kapsar. [CLI testi](../src/lib/pofi-notes/cli.test.ts) listeleme, doğrulama ve önizlemeyi çalıştırır; kaldırılan yayın hazırlama komutunun kabul edilmediğini denetler.
