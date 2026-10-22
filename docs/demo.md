# Mesaim demosu

Yerel adres: http://127.0.0.1:3000/demo. Sayfa giriş gerektirmeden Mesaim'i yakalanmış kayıtlarla açar. Canlı ekranla aynı [bileşenleri](architecture/ui-components.md) ve [ürün kurallarını](rules/README.md) kullanır. Yerleşim ve etkileşimlerin sahibi [DESIGN](../DESIGN.md) belgesidir.

## Demo kontrolleri

### Mesaim önizlemesi

Mesaim, Hata ekranları ve Durum mesajları sekmeleri arasında seçimler korunur. Mesaim'de iki önizleme vardır:

| Önizleme | Kontrol ve sonuç |
| --- | --- |
| Gün | Pazartesi–Cuma seçicisi günü sanal “bugün” yapar. Günün akışı, rapordaki “Bugün” ve Pofi aynı günü gösterir. |
| Geçmiş hafta | “Hazır senaryo → Geçmiş hafta” önceki haftanın tüm kayıtlarını yakalama saatiyle açar. Gün ve ek süre kontrolleri gizlenir. Hafta seçiciyle diğer geçmiş haftalara geçilebilir; yakalama haftasına geçmek veya gün senaryosu seçmek gün önizlemesine döner. |

Gün senaryoları: Hedefin altında → 15 Ekim; Tekrarlanan geçiş → 7 Ekim; Kayıt olmayan gün → 9 Ekim; Devam eden mesai → 15 Ekim'e 120 dakika sanal ek süre. Hedef farkı kayıtlı demo planına göre hesaplanır. Elle seçim bir senaryoyla eşleşmezse “Özel seçim” görünür.

“Demoyu sıfırla” yakalama gününü sıfır ek süreyle açar; hata önizlemesini bağlantı, durum mesajı önizlemesini çıkış hatasına döndürür. Kayıtlı planlar ve görünüm tercihi korunur. Sayfa yenilenince geçici seçimler sıfırlanır.

[Demo kontrolleri](../src/demo/controls.tsx) sekmeleri ve sıfırlamayı sunar; durum [demo istemcisinde](../src/demo/dashboard.tsx) tutulur. Ortak DashboardView içeriği standart `children` ile alır.

## Mesai bildirimi ayarları

Yan menüdeki Bildirimler, Electron ile aynı [NotificationSettings](../src/components/notifications/settings.tsx) ekranını açar. Kontroller, açık kaydetme eylemi ve Telegram kurulumu aynı bileşenden gelir; demoya özel görünüm veya stil bulunmaz.

[Demo adaptörü](../src/demo/use-notifications.ts) yalnız durum ve işlem sonuçlarını sağlar. Tercihler başlangıçta kapalıdır. Süre ve kanal seçimleri kaydedilebilir; Telegram kurulumu örnek kişisel sohbeti bulur, bağlantı kurar ve kaldırır. Deneme gönderimleri yalnız örnek başarı sonucuyla tamamlanır. Gerçek token gerektirmez; girilen token saklanmaz. Ağ, Electron köprüsü, işletim sistemi bildirimi veya kalıcı depolama kullanılmaz. Sayfa yenilenince bildirim tercihleri ve örnek bağlantı sıfırlanır.

Masaüstünün gerçek bağlantı ve gönderim davranışını [bildirim sözleşmesi](rules/notifications.md) açıklar.

## Hata ekranları ve durum mesajları

Senaryolar canlı ekranlarla aynı [hata bileşenini](../src/components/request-error.js), [teknik ayrıntıları](../src/components/request-error-details.tsx) ve [kompakt durum mesajlarını](../src/components/inline-notice.tsx) kullanır. Hata sınıfları, İz kaydı ve toparlanma kuralları [hata sözleşmesinde](pdks-errors.md) yönetilir; demo yalnız örnek girdileri sağlar.

| Önizleme | Etkileşim ve sınır |
| --- | --- |
| Bağlantı/DNS, kaynak HTTP 500, uygulama hatası | Ortak Pofi sahnesi ve açık teknik ayrıntılar; kopyalama izinli alanları ve özgün zaman damgasını taşır |
| Girişe dön | Örnek formu açar; gönderim formu temizleyip seçili örnek hatayı gösterir. API/PDKS isteği göndermez |
| 404 | Canlı [NotFoundState](../src/components/not-found-state.tsx); Mesaim bağlantısı demoya döner |
| Uygulama içi hata | Ortak runtime hata görünümünün sunumu; framework yeniden denemesi kontrollü gerçek istisna senaryosuyla doğrulanır |
| Rapor yenileme/çıkış hatası | Rapor üzerinde ortak bildirim; yeniden deneme yalnız örnek hatanın zamanını yeniler |
| Tema/plan depolama ve eski rapor | Kompakt bildirim. Eski rapor senaryosu durum mesajıdır; tazelik durum makinesini çalıştırmaz |
| Plan süre sınırları | “Planı aç” gerçek PlanEditor'ü açar; serbest süre girişi, 30 dakikalık +/- çizgileri, manuel kilit, İzin/Aç, kilitli günden açık günlere uygulama, iki Tamamla seçeneği ve manuel kilidi kaldıran Sıfırla denenir. Günlük sınır 0–16 saattir. |
| Plan kayıt hatası | Yazma reddedilir, son örnek plan korunur |
| Eksik Pofi notu | “Defteri aç” gerçek Notebook/Modal'ı açar; ilk seçilecek günün notu önizleme girdisinden çıkarılır, tarih ve gezinme korunur |

Yerel modal ve örnek plan senaryo/sekme değişiminde sıfırlanır. Bu örneklerin saklama alanı yalnız süreç belleğidir.

Önizleme sahipleri: [hatalar](../src/demo/error-preview.tsx), [durum mesajları](../src/demo/notice-preview.tsx), [yerel modal senaryoları](../src/demo/local-preview.tsx). Ortak DashboardView bu senaryoları bilmez.

## Veri ve zaman

[Yakalanan turnike verisi](../src/demo/passages.json) 21 Eylül–16 Ekim 2026 aralığındaki 297 hareketi içerir. Her hareket yalnız `date`, `time`, `direction` taşır; gerçek tarih ve saatler korunmuştur. Ekranda “Örnek kullanıcı” görünür. Veri paylaşımında bu zamanların kaynak kişiyi tanımlama olasılığı dikkate alınır.

Başlangıç günü 16 Ekim 2026, saati 11:24 Europe/Istanbul'dur. Bir gün seçildiğinde demo o günü “bugün” kabul eder. Normal görünümde önceki günler İstanbul saatinde 23:59:59, yakalama günü özgün yakalama saatiyle gösterilir. Anlık ek süre seçildiğinde yalnız seçili günün sanal saati, o günün son geçerli hareketinden seçilen süre kadar sonrasına alınır. Son hareket çıkışsa aynı saniyeye demo amaçlı açık giriş eklenir; yakalanmış hareketler ve kayıtlı toplam değişmez. Süre 15 dakika adımlıdır, gün sonunu aşamaz ve seçili gün değişince sıfırlanır. Hareketi olmayan veya güvenilir açık giriş kurulamayan günlerde kontrol kapalıdır. Önceki eşleşmeyen çıkış güvenilir son girişi engellemez. Bilgisayarın tarihi sonucu etkilemez. Seçilen tarihten sonraki hareketler ve Pofi notları önizleme girdisine katılmaz; fixture korunur. Böylece haftalık toplam yalnız seçilen güne kadarki gerçek kayıtlardan oluşur.

Dört hafta arasında gezinilir; ilk yakalama haftasından önceki ve yakalama tarihinden sonraki haftalar seçilmez. Haftayı değiştirince haftanın aynı günü korunur; kısmi yakalama haftasında son kullanılabilir hafta içi gün seçilir. Kayıtsız hafta içi günler de seçilebilir. Raporu yenile, aynı günün yakalanmış raporunu yeniden sunar. Gün gezintisi canlı Mesaim'de gösterilmez.

Pozitif ek sürede sanal saat saniyede bir ilerler; sayaçlar, haftalık toplam ve Pofi aynı saati kullanır. Sekmeye dönüşte geçen süre yansır. Saat 23:59:59'da durur; sıfır ek süre ve “Demoyu sıfırla” çalışan saati durdurur. Geçmiş hafta önizlemesi tüm haftayı sabit yakalama saatiyle değerlendirir.

| Haftanın başlangıcı | Hareket | Kayıtlı süre |
| --- | ---: | ---: |
| 21 Eylül | 74 | 36:55:54 |
| 28 Eylül | 81 | 35:33:29 |
| 5 Ekim | 84 | 32:07:40 |
| 12 Ekim | 58 | 30:01:01 |

Gün önizlemesinde örnekler:

- 9 Ekim: kayıtsız çalışma günü; haftalık toplam yaklaşık, hedef farkı hesaplanmıyor.
- 15 Ekim: 04:51:52 kayıtlı süre; varsayılan 8 saat hedefe göre eksik.
- 7 Ekim: 09:15:58 kayıtlı süre; 13:11:58'de arada çıkış kaydı olmadan yeni giriş vardır. Tekrar uyarısı saatiyle gösterilir; günlük hedef farkı ve Pofi ilerlemesi kayıtlı süreyi kullanır. Ek süre seçimi de açıktır.
- 28 Eylül: eşleşmeyen ara hareketler; ham hareketler ve ilk giriş–son çıkış özeti birlikte korunuyor.
- 14 Ekim: 05:57:32 erken giriş; İstanbul saatinde gösteriliyor.
- 15 Ekim: 2 saatlik ek süre seçimi 04:51:52 kayıtlı süreyi korur ve 02:00:00 anlık tahmin üretir.
- 16 Ekim: henüz giriş yok; 17–18 Ekim gelecek gün.

Yakalanan veride gerçek son hareketi giriş olan gün bulunmuyor. Demo ek süre seçeneği son hareket saatinde sanal açık giriş kurarak ortak süre hesabını örnekler; canlı PDKS açık girişi, eskimiş rapor, ağ hatası ve oturum bitişi gerçek kaynak kabulünde kontrol edilir. İlgili kural/oturum testleri kendi davranış sözleşmelerini doğrular.

## Sahiplik ve kalıcılık

- [Sunucu adaptörü](../src/demo/report.ts) fixture'ı ortak rapor sözleşmesiyle doğrular, haftalara böler ve mevcut Pofi not üreticisini sabit örnek anahtarla kullanır.
- [Demo gezinti sahibi](../src/demo/navigation.ts) kullanılabilir günleri, sabit önizleme saatini, seçilen tarihe kadarki raporu ve geçerli son harekete bağlı sanal açık girişi yönetir. Takvim işlemleri [ortak takvim sahibinden](rules/calendar.md) gelir; süre/plan/Pofi formülleri [ortak rapor hazırlığında](../src/domain/report.ts) kendi kural sahiplerinden alınır.
- [Demo istemcisi](../src/demo/dashboard.tsx) seçili günü ve o güne ait geçici ek süreyi tutar; hafta ve sanal saat bu seçimden türetilir. [Gün seçici](../src/demo/day-picker.tsx) gün/süre kontrollerini ve açıklamaları sunar. [Ortak DashboardView](../src/components/dashboard/view.tsx) demo istemcisinin oluşturduğu içeriği standart children alanında sunar; hafta seçicinin üst sınırı yakalama tarihidir. Canlı [Dashboard](../src/components/dashboard.tsx) kendi saatini ve PDKS hook'unu yönetir.
- [Plan depolama adaptörü](../src/data/work-plans.ts) demo anahtarlarını `demo:` önekiyle ayırır. Demo planları canlı planları değiştirmez; anında kayıt ve hata davranışı ortak kalır. Görünüm tercihi uygulama genelinde paylaşılır.
- [Route](../src/app/demo/page.tsx) statik üretilir. Demo gezinme/yenileme akışı PDKS, oturum ve heartbeat API'lerini çağırmaz.

`/demo` uygulamayla birlikte sunulan, oturumsuz erişilebilir bir sayfadır. `noindex, nofollow` arama motoru tercihidir; erişim kısıtı sağlamaz. Dağıtım kapsamını [dağıtım rehberi](deployment.md) açıklar.

## Veriyi güncelleme

Onaylı yeni yakalamada fixture'ın `from`, `to`, `capturedAt` ve hareketlerini birlikte değiştirin. Hareketleri tarih/saat sırasıyla, aynı üç alanla koruyun. Ekrandaki tarih açıklamasını [metin sahibinde](../src/lib/ui-text.js), değişen simülasyon senaryolarını [demo davranış testlerinde](../src/demo/navigation.test.ts) güncelleyin. Ardından test, tür kontrolü, üretim derlemesi ve tarayıcıda hafta/kayıt/plan kabulünü çalıştırın.

[Doğrulama rehberi](verification.md) · [Gezinti testleri](../src/demo/navigation.test.ts)
