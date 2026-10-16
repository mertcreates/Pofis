# Mesaim demosu

Yerel adres: http://127.0.0.1:3000/demo. Sayfa giriş gerektirmeden gerçek Mesaim görünümünü açar. Haftalık grafik, günlük hareketler, rapor tablosu, plan editörü ve Pofi aynı bileşenleri ve [ürün kurallarını](rules/README.md) kullanır.

Yerleşim ve bileşen görünümleri [kaynak arayüzden](ui-source-migration.md) gelir. Hafta seçici aylar üzerinden çalışır. Demo açıklamasının altında Pazartesi–Cuma gün seçicisi bulunur; grafik gün seçme kontrolü değildir. Günün akışı, günlük süre/hedef, kayıt kartı, tablodaki “Bugün” ve Pofi seçilen günü birlikte gösterir. Boş günde “Tüm kayıtlar” düğmesi görünmez. Ayarlar menüsü plan modalını açar.

## Veri ve zaman

[Yakalanan turnike verisi](../src/demo/passages.json) 21 Eylül–16 Ekim 2026 aralığındaki 297 hareketi içerir. Her hareket yalnız `date`, `time`, `direction` taşır. Kişi adı, personel/turnike kimliği, parola ve oturum çerezi fixture içinde bulunmaz; ekranda “Örnek kullanıcı” görünür. Gerçek tarih ve saatler korunmuştur; veri tam anonim sayılmaz.

Başlangıç günü 16 Ekim 2026, saati 11:24 Europe/Istanbul'dur. Bir gün seçildiğinde demo o günü “bugün” kabul eder. Normal görünümde önceki günler İstanbul saatinde 23:59:59, yakalama günü özgün yakalama saatiyle gösterilir. Anlık ek süre seçildiğinde yalnız seçili günün sanal saati, o günün son geçerli hareketinden seçilen süre kadar sonrasına alınır. Son hareket çıkışsa aynı saniyeye demo amaçlı açık giriş eklenir; yakalanmış hareketler ve kayıtlı toplam değişmez. Süre 15 dakika adımlıdır, gün sonunu aşamaz ve seçili gün değişince sıfırlanır. Hareketi olmayan veya belirsiz olan günlerde kontrol kapalıdır. Bilgisayarın tarihi sonucu etkilemez. Seçilen tarihten sonraki hareketler ve Pofi notları önizleme girdisine katılmaz; fixture korunur. Böylece haftalık toplam yalnız seçilen güne kadarki gerçek kayıtlardan oluşur.

Dört hafta arasında gezinilir; ilk yakalama haftasından önceki ve yakalama tarihinden sonraki haftalar seçilmez. Haftayı değiştirince haftanın aynı günü korunur; kısmi yakalama haftasında son kullanılabilir hafta içi gün seçilir. Kayıtsız hafta içi günler de seçilebilir. Seçim istemci belleğindedir; yeniden yükleme başlangıç gününü açar. Raporu yenile, aynı günün yakalanmış raporunu yeniden sunar. Gün gezintisi canlı Mesaim'de gösterilmez.

| Haftanın başlangıcı | Hareket | Kayıtlı süre |
| --- | ---: | ---: |
| 21 Eylül | 74 | 36:55:54 |
| 28 Eylül | 81 | 35:33:29 |
| 5 Ekim | 84 | 32:07:40 |
| 12 Ekim | 58 | 30:01:01 |

Örnek senaryolar:

- 9 Ekim: kayıtsız çalışma günü; haftalık toplam yaklaşık, hedef farkı hesaplanmıyor.
- 15 Ekim: 04:51:52 kayıtlı süre; varsayılan 8 saat hedefe göre eksik.
- 7 Ekim: 09:15:58 bilinen kayıtlı süre; geçiş belirsizliği nedeniyle hedef farkı gösterilmez.
- 28 Eylül: eşleşmeyen ara hareketler; ham hareketler ve ilk giriş–son çıkış özeti birlikte korunuyor.
- 14 Ekim: 05:57:32 erken giriş; İstanbul saatinde gösteriliyor.
- 15 Ekim: 2 saatlik ek süre seçimi 04:51:52 kayıtlı süreyi korur ve 02:00:00 ek tahmin üretir.
- 16 Ekim: henüz giriş yok; 17–18 Ekim gelecek gün.

Yakalanan veride gerçek son hareketi giriş olan gün bulunmuyor. Demo ek süre seçeneği son hareket saatinde sanal açık giriş kurarak ortak süre hesabını örnekler; canlı PDKS açık girişi, eskimiş rapor, ağ hatası ve oturum bitişi kabulü değildir. İlgili kural/oturum testleri ayrı kanıttır.

## Sahiplik ve kalıcılık

- [Sunucu adaptörü](../src/demo/report.ts) fixture'ı ortak rapor sözleşmesiyle doğrular, haftalara böler ve mevcut Pofi not üreticisini sabit örnek anahtarla kullanır.
- [Demo gezinti sahibi](../src/demo/navigation.ts) kullanılabilir günleri, sabit önizleme saatini, seçilen tarihe kadarki raporu ve geçerli son harekete bağlı sanal açık girişi yönetir. Takvim işlemleri [ortak takvim sahibinden](rules/calendar.md) gelir; süre/plan/Pofi formülleri [ortak rapor hazırlığında](../src/domain/report.ts) kendi kural sahiplerinden alınır.
- [Demo istemcisi](../src/demo/dashboard.tsx) seçili günü ve o güne ait geçici ek süreyi tutar; hafta ve sanal saat bu seçimden türetilir. [Gün seçici](../src/demo/day-picker.tsx) gün/süre kontrollerini ve açıklamaları sunar. [Ortak DashboardView](../src/components/dashboard/view.tsx) demo kontrolünü demo dalında gösterir; hafta seçicinin üst sınırı yakalama tarihidir. Canlı [Dashboard](../src/components/dashboard.tsx) kendi saatini ve PDKS hook'unu yönetir.
- [Plan depolama adaptörü](../src/data/work-plans.ts) demo anahtarlarını `demo:` önekiyle ayırır. Demo planları canlı planları değiştirmez; anında kayıt ve hata davranışı ortak kalır. Görünüm tercihi uygulama genelinde paylaşılır.
- [Route](../src/app/demo/page.tsx) statik üretilir. Demo gezinme/yenileme akışı PDKS, oturum ve heartbeat API'lerini çağırmaz.

`/demo` uygulamayla birlikte sunulan, oturumsuz erişilebilir bir sayfadır. `noindex, nofollow` arama motoru tercihidir; erişim kısıtı sağlamaz. Dağıtım kapsamını [dağıtım rehberi](deployment.md) açıklar.

## Veriyi güncelleme

Onaylı yeni yakalamada fixture'ın `from`, `to`, `capturedAt` ve hareketlerini birlikte değiştirin. Hareketleri tarih/saat sırasıyla, aynı üç alanla koruyun. Ekrandaki tarih açıklamasını [metin sahibinde](../src/lib/ui-text.js), bağımsız beklenen haftalık toplamları ve senaryoları [demo testlerinde](../src/demo/report.test.ts) güncelleyin. Ardından test, tür kontrolü, üretim derlemesi ve tarayıcıda hafta/kayıt/plan kabulünü çalıştırın.

[Doğrulama rehberi](verification.md) · [Gezinti testleri](../src/demo/navigation.test.ts)
