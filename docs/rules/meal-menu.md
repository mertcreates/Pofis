# Yemek menüsü

Ana ekrandaki **Yemek menüsü** yalnız açık oturumda görünür. Seçilen İstanbul takvim günü, bugünden bir takvim ayı öncesi ile 15 gün sonrası arasında olabilir. Menü TRT İstanbul `get_meal.php` kaynağından `date=YYYY-MM-DD` parametresiyle alınır. [Sunucu adaptörü](../../src/server/meals.ts) gün ve yanıtı doğrular, aynı güne eşzamanlı istekleri birleştirir ve başarılı yanıtı (boş gün dahil) bir saat bellekte tutar. Kaynak hatası önbelleğe alınmaz. Önbellek süreç belleğindedir; yeniden başlatmada boşalır.

[Yemek tarihleri](../../src/lib/meals/dates.ts) seçilebilir aralığı, ay sonuna sınırlanan ay geçişini ve sınır haftalarında gezinmeyi yönetir; sunucu ve modal aynı aralığı kullanır. İstanbul tarihi, gün ekleme, hafta başlangıcı ve gün sırası ortak [takvim sahibinden](calendar.md) gelir. [Tarih seçicinin](../../src/components/meals/date-picker.tsx) formatlayıcıları da bu sahibin saat dilimini kullanır.

[Ayrıştırıcı](../../src/lib/meals/presentation.ts), gözlenen altı satırlı kayıtta ana yemek seçeneklerini, `VJT.` işaretli vejetaryen yemeği, ortak pilavı/yan yemeği ve alt seçenekleri ayırır. Ayrıştırılmış yemek adları gösterimde Türkçe büyük/küçük harf kurallarıyla sözcük başları büyük olacak şekilde düzenlenir; noktayla biten kaynak kısaltmaları korunur ve `ZYT.` mevcut kuralıyla açılır. Kaynak kayıtları korunur; eksik harf veya yazım hatası tahminle tamamlanmaz. İşaretler veya sıra güven vermediğinde tüm kaynak satırlarını olduğu gibi gösterir. Birleşik satırın kalorisi seçeneklere paylaştırılmaz. [Modal](../../src/components/meals/menu-modal.tsx) yükleme, boş gün ve kaynak hatasını ayrı gösterir. [API](../../src/app/api/meals/route.ts), menüyle birlikte oturumdaki hesap anahtarı ve seçili gün için sunucuda seçilen `commentary` metnini döndürür; boş günün yorumu `null` olur. [İstemci doğrulayıcı](../../src/lib/meals/response.ts) menü ve yorumu birlikte denetler; [istek sahibi](../../src/data/use-meal-menu.ts) geç kalan gün yanıtını gösterime almaz.

API oturumu girişte ve kaynak isteği sonuçlandığında yeniden doğrular. Beklerken süresi dolan veya iptal edilen oturum `SESSION_EXPIRED` / 401 alır; kaynak hatasıyla aynı anda gerçekleşen iptalde de oturum sonucu önceliklidir. Ortak menü isteği ve önbelleği diğer oturumlar için kullanılabilir kalır.

Gün geçişlerinde yükleme görünümü, menü bölümleri ve Pofi notunun yerini tutan statik bir skeleton gösterir. Modal açıkken içerik alanı aynı genişlikte ulaştığı en büyük yüksekliği korur; kısa menü, boş gün veya hata bu alanı küçültmez. Genişlik değiştiğinde yükseklik yeni yerleşime göre hesaplanır. Yükleme durumu ekran okuyucuya bildirilir; önceki günün menüsü yeni tarihin altında gösterilmez.

## Pofi yemek yorumları

[Yorum sahibi](../../src/lib/meals/commentary.ts) yalnız menü sunumu, tarih ve [Pofi hesap anahtarı](../pofi-notes.md#hesap-anahtarı) alır. Hesap anahtarı oturumdan okunur; tarayıcıya yalnız seçilen metin gider. Ortak saatlik önbellek kaynak menüsünü tutar. Kişisel yorum her API isteğinde ortak menü üzerinden seçilir; HTTP yanıtı `Cache-Control: no-store` taşır.

| Sorumluluk | Sahip |
| --- | --- |
| Birliktelikler: 38 senaryo, 103 bütün varyant | [pairs.ts](../../src/lib/meals/commentary/pairs.ts) |
| Tekil yemekler: 51 senaryo, 115 bütün varyant | [dishes.ts](../../src/lib/meals/commentary/dishes.ts) |
| Sofra sahneleri: 12 senaryo, 36 bütün varyant | [scenes.ts](../../src/lib/meals/commentary/scenes.ts) |
| Tek güncel havuz | [catalogue.ts](../../src/lib/meals/commentary/catalogue.ts) |
| Yemek adı eşdeğerlikleri | [foods.ts](../../src/lib/meals/commentary/foods.ts) |
| Menüye uygun senaryolar ve rol koşulları | [matching.ts](../../src/lib/meals/commentary/matching.ts) |
| Hesap/tarih bazlı seçim ve not kimliği | [commentary.ts](../../src/lib/meals/commentary.ts) |

Güncel havuz **101 senaryo ve 254 yorum** içerir. Her senaryoda 2–3 bağımsız bütün metin bulunur; her metin 1–2 cümle ve en çok 160 karakterdir. Dil, mizah ve sahne sürekliliği [ton rehberinde](../brand/pofi-tone-guide.md#birleşmiş-notu-okuma) yönetilir. Kalori, kullanıcı tercihi, geçmiş tüketim ve kaynakta belirtilmeyen tat/porsiyon bilgisi metinlere eklenmez.

Yemek adları Türkçe harf dönüşümü, Unicode ve boşluk/nokta aralığı normalizasyonundan sonra incelenmiş tam adlarla eşleşir. Sözcük içerme veya benzerlik tahmini kullanılmaz. Yemek ailesi adları yalnız yorum eşleştirmesine aittir; ekrandaki kaynak adını veya vejetaryen işaretini değiştirmez. İki yemek gerektiren senaryo iki ayrı öğe ister. Örneğin tek bademli pilav, iki ayrı pilavın birlikte bulunduğu anlamına gelmez.

Somut koşullar:

- 23 Nisan'da kuru ve taze fasulye birlikte bulunur; `beans-fresh-beans` uygundur.
- 5 Mayıs'ta ana seçenekte Bafra pidesi, yanında Adana böreği vardır; `bafra-adana` uygundur.
- 22 Nisan'da mantı diğer seçeneklerdedir; `manti-extra` uygundur. Ana yemeğe taşınan mantı bu senaryoyu açmaz.
- 14 Mayıs'ta nohut ve turşu birlikte bulunur; `chickpeas-pickles` uygundur. 20 Mayıs'ta yan yemekte pilav ve tatlıda sütlaç vardır; `rice-sutlac` uygundur.
- 20 Ekim'de fasulye/pilav, lahmacun/limon ve cacık/enginar senaryoları uygundur.
- 17 Ekim'de tek ana yemek vardır; çoklu seçim veya ortak yan yemek hikâyesi açılmaz.
- Tanınmayan kaynak düzeninde yalnız menü geneline ait sofra sahneleri uygundur. Boş menüde not dönmez.

Seçim aşağıdaki ilk dolu gruptan yapılır:

1. Eşleşen yemek birliktelikleri.
2. Ana yemek veya vejetaryen alternatif için tekil yorumlar.
3. Diğer yemekler için tekil yorumlar.
4. İçecek yorumları.
5. Sofra sahneleri.

Rol koşulu belirtilmeyen tekil yorumlar da yemek ana seçeneklerde veya vejetaryen alternatifte eşleşiyorsa ana yemek grubuna alınır.

Senaryo kararlı kimliklerin hesap/tarih hash'iyle, varyant ise hesap/senaryo başlangıcı ve gün sayısıyla seçilir. Aynı hesap, tarih, menü ve katalog aynı sonucu verir. Aynı senaryo ardışık günlerde seçilirse varyant ilerler. Senaryoların dosyadaki sırası seçimi etkilemez; yeni içerik veya eşleştirme değişikliği geçmiş tarihlerin sonucunu da etkileyebilir. Kullanıcıların aynı yorumu seçmesi mümkündür.

Yeni içerikte gerçek menüdeki ad/rol koşulunu belirle, gerekiyorsa `foods.ts` içine incelenmiş tam adı ekle. İlgili içerik dosyasına kararlı kimlik ve her biri bağımsız bütün metin olan 2–3 varyant yaz. Metinde adı geçen her yemeği senaryonun eşleşme koşullarıyla karşılaştır. Varyantların kendi sahnesini taşımasını ve havuzdaki eylem çeşitliliğini [ton rehberindeki editoryal ölçütlerle](../brand/pofi-tone-guide.md#birleşmiş-notu-okuma) incele.

```powershell
bun scripts/meal-commentary.ts validate
bun scripts/meal-commentary.ts preview --date 2026-05-05 --key ornek-hesap
bun test src/lib/meals src/server/meals.test.ts src/server/meals-route.test.ts
bun run typecheck
```

[Katalog testi](../../src/lib/meals/commentary-catalogue.test.ts) metin sınırlarını, benzersizliği ve her senaryonun arşivde bir örneği bulunmasını; [seçim testleri](../../src/lib/meals/commentary-selection.test.ts) öncelikleri, hesap/tarih tutarlılığını ve ardışık varyant geçişini doğrular. Doğallık, mizah ve sahne sürekliliği editoryal incelemeyle değerlendirilir.

[Yerel araç](../../scripts/meal-commentary.ts) arşivde eşleşme kapsamını ve 100 örnek hesabın seçimini inceler; `preview` aynı günün farklı kaynak kayıtlarını ayrı gösterir. Tarihsel arşiv çalışma zamanına yüklenmez; bu nedenle menünün yeniden gelmesi veya uzun süredir bulunmaması hakkında yorum seçilmez.

## İçerik araştırma verisi

20 Eylül–20 Ekim 2026 arasındaki [31 günlük kaynak kaydı](../../src/lib/meals/history-sample.json), Pofi metin çalışmaları ve ayrıştırma testleri için korunur. Canlı menü yanıtı olarak kullanılmaz; sonraki aylar için otomatik arşivleme sözleşmesi yoktur.

Pofi içerik çalışmaları için 20 Nisan–20 Ekim 2026 aralığındaki [altı aylık arşiv](../../data/meals/history.json), 184 gün ve 186 kayıt içerir. [Toplama durumu](../../data/meals/collection.json) kaynak, tarih aralığı ve gün bazında sonucu korur. Aynı günün farklı kayıtları birlikte saklanır. [Sıklık listesi](../../data/meals/frequencies.json) her öğenin bulunduğu farklı gün sayısına göre çoktan aza sıralıdır; aynı günün birden fazla kaydı sayıyı artırmaz. Bu arşiv uygulamanın çalışma zamanı verisine dahil değildir. [Toplama](../../scripts/collect-meal-history.ts) ve [özetleme](../../scripts/summarize-meal-history.ts) betikleri araştırma verisini üretir.
