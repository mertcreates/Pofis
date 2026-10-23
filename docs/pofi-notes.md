# Pofi içeriğini yönetme

[Kural haritası](rules/README.md) · [Terimler](../GLOSSARY.md)

Not defterinin günlükleri ve odadaki faaliyet kayıtları ayrı içerik ve seçim sahiplerinde yönetilir. Menü altındaki [yemek yorumları](rules/meal-menu.md#pofi-yemek-yorumları) menü sözleşmesine bağlıdır.

## Not defteri

Pofi'nin günlükleri giriş / gelişme / kapanış parçalarından oluşan kısa notlardır. Not seçimi kişi anahtarı, hafta ve tarihe dayanır.

### Tek sahipler

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

### Hesap anahtarı

Başarılı PDKS girişinde `SHA-256(JSON.stringify(["pofis:pofi-account:v1", kurumOrigin, kullanıcıAdı.trim()]))` hesaplanır. Saklanan sonuç, sunucu oturumuna özel `self.pofiKey` alanıdır. API yalnız seçilen notları döndürür. Bu anahtar not seçimi içindir; rapor erişim yetkisini kaynak oturumu belirler.

Anahtar, [oturum yöneticisinin normalize ettiği kullanıcı adından](rules/session-policy.md#güvenceler) üretilir. Aynı origin ve aynı kullanıcı adı farklı cihaz/oturumlarda aynı anahtarı verir. Harf büyüklüğü ve farklı giriş takma adları ayrı anahtar üretir; görünen ad-soyad hesaba katılmaz. Farklı anahtarlar aynı normal notu seçebilir.

Tüm tarihlerde notlar güncel havuzdan hesaplanır. Hesap anahtarı olmayan oturumlar yeniden giriş ister.

### Tek havuz

Temalar kullanıcıyla belirlenir; metinler ve tüm kombinasyonları incelendikten sonra onaylanan tema kataloğa eklenir. Güncel tema ve not sayıları [doğrulama komutundan](#yerel-komutlar) alınır.

Katalog giriş × gelişme × kapanış kombinasyonlarından havuz sırasını bir kez kurar; aynı havuz tüm tarihler için kullanılır. Seçim kişi anahtarına, haftaya ve güne göre deterministiktir. Normal havuz boşken haftalık sonuç yalnız o haftanın özel notlarını içerir; diğer günler için not dönmez. Defter mevcut nötr boş durumunu ve tarih gezinmesini korur. Doğrudan normal gün seçimi içerik yokluğu hatası verir. Dolu normal havuz haftalık tekrarı önlemek için en az beş benzersiz not içermelidir.

İçerik veya havuz sırası değişikliği geçmiş tarihler dahil her tarihteki seçimi etkileyebilir. Tema ve metin değişikliklerini Git diff'i ve [önizleme](#yerel-komutlar) üzerinden temsilî tarih ve kişi anahtarlarıyla kontrol edin.

### Tema veya metin eklemek

1. [NoteTheme](../src/lib/pofi-notes/types.ts) yapısıyla yeni dosya ekleyin: `id`, `title`, `premise`, `intros`, `developments`, `endings`.
2. Temayı `themes/index.js` listesine bir kez ekleyin. Katalog ve seçim motoru yeni kombinasyonları tek havuza dahil eder.
3. Yeni parçayı ilgili gruba ekleyin; her grupta en az bir dolu metin olmalıdır.
4. Kimlikler küçük harfle başlamalı; küçük harf, rakam ve tire içerebilir. Normal not kimliği `coffee:i1:d1:e1`, özel not kimliği `special:little-star:v1` biçimindedir.
5. Her birleşimi [ton rehberindeki ölçütlerle](brand/pofi-tone-guide.md#birleşmiş-notu-okuma) okuyun. Ardından doğrulayın ve temsilî tarih/kişi anahtarıyla önizleyin.

Özel not eklerken metni `specials.js` içine, `MM-DD → note` eşleştirmesini `special-days.ts` içine ekleyin. `sharedVariant` varsa herkes o varyantı görür; yoksa kişi anahtarıyla seçim yapılır.

Özel notların her varyantı bağımsız, üç parçalı bir hikâyedir; her seçim bir varyantın kendi giriş, gelişme ve kapanışını birlikte kullanır. Bayram notları küçük katılım ve gözlem anlarını, 10 Kasım notları saygılı anma davranışlarını anlatır. Kâğıt gemi serisi 12 Mart (İlk gün), 9 Nisan (Bir süre sonra) ve 7 Mayıs (Yeniden) sırasıyla ilerler. Her tarihin varyantı ayrı seçilir ve kendi içinde anlamlı bir hikâye sunar. 8 Aralık'ın herkes için ortak `little-star:v1` metni korunur; tarih eşlemesi ve tam metni davranış testiyle doğrulanır.

### Yerel komutlar

Proje kökünde:

```powershell
bun scripts/pofi-notes.ts list
bun scripts/pofi-notes.ts validate
bun scripts/pofi-notes.ts preview --date 2026-10-19 --key example
```

`validate` katalogdaki tema, normal not ve özel gün sayısını bildirir. `preview`, seçilen haftanın notlarını geçerli tek havuz ve özel gün listesiyle gösterir.

## Pofi'nin mesaisi

Odadaki kısa faaliyet kayıtları Pofi'nin kurgusal gününü anlatır. Üç bağımsız havuz kullanılır: [Pencere nöbeti](../src/lib/pofi-work/pools/window.js), [Mola kontrolü](../src/lib/pofi-work/pools/break.js), [Mesai arkadaşlığı](../src/lib/pofi-work/pools/company.js). İlgili listeye `{ id: "benzersiz-kimlik", text: "Pofi'nin kaydı." }` ekleyin. Her kayıt kendi içinde tamamlanmalı; diğer satırdaki olay veya nesneye ihtiyaç duymamalıdır.

Mandalinayı soyma → paylaşma gibi bağlantılı anları [linked.js](../src/lib/pofi-work/linked.js) içinde `id`, `window`, `break`, `company` alanlarıyla bütün set olarak yazın. Yedi günde bir bu setlerden biri sırayla seçilir; diğer günlerde her havuzdan bir kayıt gelir. Bağlantılı set listesi boş bırakılabilir; kullanıldığında en az iki set gerekir. Normal havuzların eşleşmeleri döngüler arasında kayar.

Aynı başlık altında son yedi takvim gününün metni tekrarlanmaz. Her havuzda en az 10 kayıt bulunmalı; aynı başlıktaki metinler havuz ve bağlantılı setler arasında benzersiz olmalıdır. [Katalog](../src/lib/pofi-work/catalogue.ts) bu sınırları, kimlikleri ve dolu metinleri doğrular. [Giriş modülü](../src/lib/pofi-work/index.ts) içeriği bağlar; başlıklar ve sabit oda metinleri [ui-text.js](../src/lib/ui-text.js) içinde kalır.

[Oda bağlantısı](../src/components/pofi-room-content.tsx) canlıda mevcut İstanbul gününü, demoda seçilen sanal günü kullanır. Aynı gün herkes aynı kayıtları görür; yeniden açma veya yenileme seçimi değiştirmez. Hafta sonları dahildir. İçerik veya sıra değişikliği geçmiş ve gelecek seçimlerini etkileyebilir.

## Doğrulama

```powershell
bun test src/lib/pofi-notes src/lib/pofi-work
bun scripts/pofi-notes.ts validate
bun run typecheck
```

[Not defteri testleri](../src/lib/pofi-notes/notebook.test.ts) haftalık seçimi, tekrar kontrolünü, boş havuzu, özel gün varyantlarını, bozuk girdiyi ve değişmezliği sınar. [CLI testi](../src/lib/pofi-notes/cli.test.ts) listeleme, doğrulama, önizleme ve desteklenmeyen komutun reddini kontrol eder. [Faaliyet testleri](../src/lib/pofi-work/catalogue.test.ts) günlük seçimi, değişen eşleşmeleri, bağlantılı setleri, yedi günlük tekrar sınırını, içerik eklemeyi, tarih sınırlarını ve değişmezliği sınar.

Metinleri [ton rehberiyle](brand/pofi-tone-guide.md) birlikte okuyun. Demoda bir gün seçip Pofi → Pofi’nin mesaisi ekranını açın; kapatıp açınca kayıtların korunduğunu, başka gün seçilince değiştiğini kontrol edin. Yenileme kontrolünü demonun varsayılan gününde yapın.
