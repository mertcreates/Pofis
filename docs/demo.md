# Mesaim demosu

Yerel adres: http://127.0.0.1:3000/demo. Sayfa giriş gerektirmeden gerçek Mesaim görünümünü açar. Günlük hareketler, rapor tablosu, plan editörü, geçmiş haftanın grafiği ve Pofi aynı bileşenleri ve [ürün kurallarını](rules/README.md) kullanır.

Yerleşim ve bileşen görünümleri [DESIGN](../DESIGN.md) belgesini izler; demo ve canlı ekran [aynı arayüz sahiplerini](architecture/ui-components.md) kullanır. Hafta seçici aylar üzerinden çalışır. Demo kontrollerinde Pazartesi–Cuma gün seçicisi bulunur; grafik gün seçme kontrolü değildir. Günün akışı içindeki geçen süre ve hedef çıkış, tablodaki “Bugün” ve Pofi seçilen günü birlikte gösterir. Üst satır gün akışı ve haftalık toplamı; orta satır akordeon giriş-çıkış raporu ve içeriği kadar yükselen Pofi kartını içerir. Kapalı satırda gün, süre ve ilk giriş/son çıkış özeti görünür. Raporda hedef farkı ve kayıt durumu satır açıldığında görünür; verisi olmayan hafta sonları gösterilmez. Günün kayıtları rapor satırından açılır. Ayarlar menüsü plan modalını açar.

## Demo kontrolleri

### Mesaim önizlemesi

Sıfırdan büyük ek süre seçildiğinde sanal saat seçilen andan başlayarak saniyede bir ilerler; günlük sayaçlar, haftalık toplam ve Pofi aynı saati kullanır. Kayıtlı süre sabit kalır. Gün veya ek süre değişince saat yeni seçimden başlar; sıfır ek süre ve “Başlangıca dön” çalışan saati durdurur. Sekme yeniden görünür olduğunda geçen süre saate yansır. Saat İstanbul'da seçilen günün 23:59:59 sınırında durur.

Üstteki Mesaim, Hata ekranları ve Bildirimler sekmeleri ekranlar arasında geçiş sağlar. Hazır senaryolar mevcut veri ve ortak hesap sahiplerini kullanır: Hedefin altında 15 Ekim'i, Belirsiz kayıt 7 Ekim'i, Kayıt olmayan gün 9 Ekim'i açar; Devam eden mesai 15 Ekim'e 120 dakika sanal ek süre ekler. Hedef farkı kayıtlı demo mesai planına göre hesaplanır. Gün veya süre elle değiştiğinde eşleşen senaryo seçilir; eşleşme yoksa “Özel seçim” görünür.

Geçişlerde gün, ek süre, hata senaryosu ve örnek giriş adımı korunur. “Başlangıca dön” Mesaim'i yakalama gününde sıfır ek süreyle açar; hata önizlemesini bağlantı hatasına döndürür. Kayıtlı planlar ve görünüm tercihi korunur. Sayfa yenilenince önizleme başlangıç durumuna döner.

[Demo kontrolleri](../src/demo/controls.tsx) sekmeleri ve sıfırlamayı sunar; durum [demo istemcisinde](../src/demo/dashboard.tsx) tutulur. Ortak DashboardView demo kontrol yapısını bilmez; içeriği standart `children` ile alır.
## Hata ekranları ve bildirimler

Senaryolar canlı ekranlarla aynı [hata bileşenini](../src/components/request-error.js), [teknik ayrıntıları](../src/components/request-error-details.tsx) ve [kompakt bildirimleri](../src/components/inline-notice.tsx) kullanır. Hata sınıfları, İz kaydı ve toparlanma kuralları [hata sözleşmesinde](pdks-errors.md) yönetilir; demo yalnız örnek girdileri sağlar.

| Önizleme | Etkileşim ve sınır |
| --- | --- |
| Bağlantı/DNS, kaynak HTTP 500, uygulama hatası | Ortak Pofi sahnesi ve açık teknik ayrıntılar; kopyalama izinli alanları ve özgün zaman damgasını taşır |
| Girişe dön | Örnek formu açar; gönderim formu temizleyip seçili örnek hatayı gösterir. API/PDKS isteği göndermez |
| 404 | Canlı [NotFoundState](../src/components/not-found-state.tsx); Mesaim bağlantısı demoya döner |
| Uygulama içi hata | Ortak runtime hata görünümü; gerçek istisna oluşturmaz, framework yeniden denemesini kanıtlamaz |
| Rapor yenileme/çıkış hatası | Rapor üzerinde ortak bildirim; yeniden deneme yalnız örnek hatanın zamanını yeniler |
| Tema/plan depolama ve eski rapor | Kompakt bildirim. Eski rapor senaryosu durum mesajıdır; tazelik durum makinesini çalıştırmaz |
| Plan süre sınırları | “Planı aç” gerçek PlanEditor'ü açar; eksi/artı ile 0–16 saat, İzin/Aç ve açık günlere uygulama denenir. Ayrı saat giriş alanı yoktur |
| Plan kayıt hatası | Yazma reddedilir, son örnek plan korunur |
| Eksik Pofi notu | “Defteri aç” gerçek Notebook/Modal'ı açar; ilk seçilecek günün notu önizleme girdisinden çıkarılır, tarih ve gezinme korunur |

Seçimler sekmeler arasında korunur. Yerel modal ve örnek plan senaryo/sekme değişiminde sıfırlanır. “Başlangıca dön” hata önizlemesini bağlantı hatasına, bildirim önizlemesini çıkış hatasına getirir. Yerel örnekler bellektedir; plan depolamasına veya kaynak fixture'a yazmaz.

Önizleme sahipleri: [hatalar](../src/demo/error-preview.tsx), [bildirimler](../src/demo/notice-preview.tsx), [yerel modal senaryoları](../src/demo/local-preview.tsx). Ortak DashboardView bu senaryoları bilmez.

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
- 15 Ekim: 2 saatlik ek süre seçimi 04:51:52 kayıtlı süreyi korur ve 02:00:00 anlık tahmin üretir.
- 16 Ekim: henüz giriş yok; 17–18 Ekim gelecek gün.

Yakalanan veride gerçek son hareketi giriş olan gün bulunmuyor. Demo ek süre seçeneği son hareket saatinde sanal açık giriş kurarak ortak süre hesabını örnekler; canlı PDKS açık girişi, eskimiş rapor, ağ hatası ve oturum bitişi kabulü değildir. İlgili kural/oturum testleri ayrı kanıttır.

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
