# Mesai planı ve çıkış hedefi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/work-plan.ts](../../src/domain/rules/work-plan.ts): `WorkPlan`, `WorkPlans`, doğrulama, miras, düzenleme kilidi, `planAdjustmentDays`, `completeWeekPlan`, `completedDaySeconds`, `resolveWeekPlan`, `weeklyTarget`, `resolveStoredTarget`, `targetExitAt`.

## Plan ve miras

- Plan takvimle eşleşmek için pazartesi–pazar sırasındaki yedi dakika değerini tutar. Yalnız pazartesi–cuma düzenlenir: 0–960 dakika. Şablon 30 dakika adımıyla belirlenir; Tamamla sonucu ve sonraki haftalık düzenlemeler saniye hassasiyetini korur. Cumartesi/pazar resmî tatildir, hedefleri daima sıfırdır ve pozitif hafta sonu hedefi geçersizdir. Sıfır kapalı gündür; bütün çalışma günleri kapalı olabilir.
- İlk varsayılan pazartesi–cuma 480, hafta sonu 0 dakikadır. Kullanıcı şablonu elle değiştirir; PDKS kayıtları şablonu değiştirmez.
- Saklanan durum `{ defaultPlan, weekOverrides, weekTargets? }` biçimindedir. `weekTargets` yalnız günlük girdilerin toplamından ayrılan açık haftalık hedefi saniye olarak tutar; eski hedef geçmişi veya PDKS kaydı tutmaz. Haftalık anahtar gerçek bir pazartesi tarihidir (`YYYY-MM-DD`). Özel plan yoksa varsayılan miras alınır. Özel plan varsa bütün günlerin özgün hedefleri bu plandan gelir; günün tamamlanması planı değiştirmez.
- İlk haftalık hedef günlük hedeflerin toplamıdır. Tamamla sonrası hedef, tamamlanan günlerin gerçekleşeni ve kalan gerçek çalışma planından bağımsız olarak korunur. Elle günlük düzenleme hedefi değiştirilen süre kadar artırır/azaltır. Henüz tamamlanmamış Cuma kapatılıp dört gün 8 saat bırakılırsa hedef 32 saattir. Varsayılan toplamına tamamlama ayrı eylemdir.
- Yedi değeri varsayılanla aynı olan özel plan kaldırılır. Yalnız toplamın eşitliği yeterli değildir. Geçmiş hedef versiyonlaması veya snapshot yoktur.
- Varsayılan değişince özel planı olmayan haftalar yeni şablonu kullanır. Düzenlenen haftada tamamlanan günler varsa bunların özgün planı aynı `weekOverrides` kaydında korunur. Kalan günlerde özel düzenleme yoksa onlar yeni şablonu miras almaya devam eder; özel hedefler varsa korunur.
- Varsayılan plana dön tamamlanmamış günleri varsayılana döndürür; tamamlanan günlerin özgün hedefleri korunur. Sonuç şablonla aynıysa özel kayıt kaldırılır. Otomatik hesap tek başına kayıt yazmaz. Tamamla, kullanıcının açık eylemi olarak kalan günlerin gereken sürelerini yeni çalışma planı olarak kaydeder; tamamlanan günlerin özgün hedeflerine dokunmaz.

## Üç günlük süre ve tamamlanma

**Planlanan günlük süre:** kullanıcının varsayılan veya özel hafta planında belirlediği özgün hedef.

**Gerçekleşen günlük süre:** PDKS günlük süre sahibinin ilk giriş–son çıkış hesabı. Ara çıkışlar düşülmez. Bugünün güvenilir canlı süresi ilk girişten anlık zamana uzanır; kesinleşmiş kayıt sayılmaz.

**Güncel gereken süre (etkin hedef):** özgün planın, önceki tamamlanmış günlerin farklarıyla dengelenmiş sonucu.

Bugünden önceki, aynı haftaya ait `recorded` ve kayıtlı süresi tanımlı gün tamamlanmıştır. Sıfır süreli tutarlı kayıt da kilitlenir. Bugünün `outside`, `open`, `ongoing` durumu ve gelecekteki kayıtlar tamamlanmış sayılmaz. Kayıtsız/belirsiz günler sıfır çalışma veya borç sayılmaz.

Hafta kutusunda tamamlanan günün gerçekleşen süresi kilitli görünür. Elle/toplu kaydetme, sıfırlama ve şablon düzenlemesi, tamamlanan günün özgün planını korur. Karşılaştırma farkı gerçekleşen süre eksi **o günün özgün planıdır**. Örneğin 6 saat plan + 6 saat kayıt fark üretmez; ertesi gün de 6 saat plan korunur. Gerçekleşen süre yarım saat adımına yuvarlanmaz veya 16 saate kesilmez.

## Otomatik devir

`planAdjustmentDays` uygun günleri belirler: bugün veya gelecek, pozitif özgün hedefli, tamamlanmamış ve belirsiz olmayan günler. Geçmiş kayıtsız günler, kilitli günler ve kapalı günler otomatik işlemlere katılmaz.

```text
dağıtılacak eksik = haftalık hedef − günlük plan toplamı + Σ(tamamlanan günün plan saniyesi − gerçekleşen saniyesi)
gereken süreler başlangıçta özgün plan süreleridir
```

Kısmi hafta dışında fark, son uygun günden geriye doğru aktarılır. Her gereken süre 0–16 saat arasında kalır; saniye hassasiyeti korunur. Son günün kapasitesi yetmezse kalan fark önceki uygun güne geçer. Kapalı/belirsiz son gün atlanır. Hiç uygun gün yoksa geçmiş değiştirilmez. `unallocatedSeconds` pozitifse dağıtılamayan eksik, negatifse dengelenemeyen fazla süredir; modal bunu görünür kılar.

Örnek: Pzt 6 saat plan/5,5 saat kayıt, Sal 10 saat, Çar–Cum 8 saat → Sal yine 10 saat, Cum gereken 8,5 saat, haftalık hedef 40 saat. Pzt 6,5 saat çalışılsaydı Cum gereken 7,5 saat olurdu.

Kullanıcının diğer günlere yaptığı elle plan düzenlemeleri korunur; her hesap özgün yeni planı temel alır. Gün seçmek veya görüntülemek aktarım tercihi değildir. Mevcut arayüzde ayrı aktarım tercihi yoktur; bu çalışma yeni tercih özelliği veya saklama alanı eklemez.

Hesap idempotenttir: aynı plan/kayıt/tarih aynı sonucu verir. Otomatik hesap kendi sonucunu tekrar girdi olarak kaydetmez. Tamamla gerektiğinde gereken süreleri yeni plan yapar; bağımsız hafta hedefi aynı farkın ikinci kez eklenmesini önler. Kısmi hafta raporunda devir ve bugünkü çıkış hedefi verilmez. Bugünün belirsizliği çıkış hedefini engeller; geçmiş eksik kayıtlar kendi farklarını üretmeden yaklaşık toplamda belirtilir.

## Haftalık toplamlar ve rapor

- **Haftalık hedef (`weeklySeconds`):** ilk plandan veya kullanıcının Tamamla eyleminden gelen toplam; günler tamamlandığı için değişmez. Kalan gerçek çalışma planı bu hedeften ayrı tutulur.
- **Gerçekleşen toplam:** PDKS kayıtlarından gelen süre. Dashboard güvenilir canlı ek tahmini dahil ediyorsa başlık bunu belirtir; tamamlanan gün devrinde canlı tahmin kullanılmaz.
- **Beklenen toplam (`projectedWeeklySeconds`):** tamamlanan günlerin gerçekleşen süreleri + tamamlanmamış günlerin gereken süreleri. Geçmiş kayıtsız günün planı bilinmeyen kayıt yerine bir hedef olarak korunur; eksik kayıt gerçek çalışma sayılmaz.

Bu değerler eşit olmak zorunda değildir. Örneğin hedef 32 saatken 32 saat 45 dakika gerçekleşebilir. Modal ana toplamı “Haftalık hedef” olarak gösterir; beklenen toplam farklıysa ayrı etiketle sunar. Dashboard gerçekleşen toplamı hedefle karşılaştırır. Dağıtılamayan bakiye ayrıca gösterilir.

Modal yalnız pazartesi–cuma günlerini gösterir. Hafta sonu PDKS kayıtları raporda görünür ve gerçekleşen/beklenen toplama katılır; sıfır planı veya haftalık hedefi değiştirmez. Gün kutuları tamamlanan günlerde gerçekleşeni, devirle değişen bütün uygun günlerde gereken süreyi, diğerlerinde planı gösterir. Alt stepper özgün planı düzenler; haftalık gün başlığının altında “Planlanan” ve devir varsa “Gereken” tek satırda ayrılır. Kilitli günde özgün plan, farklıysa varsayılanı ve “Gerçekleşen” kayıtlı süre gösterilir. Farklı süreli başka uygun gün yoksa toplu uygulama gizlenir. “Varsayılan plana dön”, yalnız değişecek tamamlanmamış hedef veya temizlenecek geçici düzenleme tercihi varsa gösterilir. Saniyeler hesapta ve erişilebilir/tam süre etiketlerinde korunur. Görünür dakika değerlerinin toplamı saniyeli hassas toplamdan ayrışabilir; bu sunum farkı kayıtları değiştirmez.

[report.ts](../../src/domain/report.ts) aynı hesap sahibinin `targets` sonucunu `goalSeconds`, `dailyGoalSeconds`, `exitGoalSeconds` alanlarına taşır; `plannedGoalSeconds` özgün plandır. Dashboard, günlük akış, tablo ve Pofi ortak gereken süreyi kullanır. Hedef çıkış ilk giriş + gereken süredir; ara çıkışlar bu saati ötelemez. [İlerleme](progress.md) sıfır hedef ve yüzde gösterimini yönetir.

## Tamamla

`completeWeekPlan`, gerçekleşen toplam + kalan gereken süreleri varsayılan hafta toplamına getirmek için yalnız uygun günlerin gerçek çalışma süresini düzenler. Günlük 16 saat kapasitesi devir öncesi bazdan hesaplanmaz. Birden fazla gün değişiyorsa gösterim “40 saate tamamla” gibi dinamik kalır. Başarılı sonuç yalnız tek günün gereken süresini değiştiriyorsa düğme bu farkı söyler: “Cumaya 1 sa 30 dk ekle” veya “Cumadan 30 dk azalt”. Kapasite yoksa uygulanabilir bir değişiklik vaat edilmez; hedefe tamamlama etiketi ve mevcut gerekçe gösterilir.

- Uygunluk otomatik devirle aynı tarihe/kilide/belirsizliğe dayanır. Geçmiş kayıtsız günler değiştirilmez.
- Yalnız gün seçmek kapasiteyi kısıtlamaz. Plan penceresi açıkken haftalık süre kontrolleriyle elle değiştirilen günler Tamamla dağıtımından çıkarılır; seçim değiştirilse de bu tercih korunur. Toplu düzenlemede değişen günler de korunur. Başarısız kayıt ve aynı değeri yeniden seçmek yeni koruma oluşturmaz.
- Koruma yalnız Tamamla içindir; otomatik PDKS devri kendi kuralını izler. Korunan günler varken kapasite yetmezse günler ve süreleriyle gerekçe gösterilir; işlem kısmi sonuç yazmaz. Başarılı Varsayılan plana dön işlemi veya pencereyi kapatmak geçici korumayı temizler; saatler normal plan olarak kayıtlı kalır. Yeni kalıcı kilit alanı yoktur.
- Pazartesi–cuma sırasındaki en fazla 30 dakikalık turlar kullanılır; son adım tam saniyeli fark kadar olabilir. Her kalan gereken süre 0–16 saat sınırında kalır. Kapalı günler açılmaz; hafta sonu dağıtıma katılmaz.
- Kapasite yetmezse `null` döner, kısmi plan kaydedilmez, düğme devre dışı kalır ve gerekçe gösterilir.
- Pzt–Çar 25 sa 10 dk gerçekleşen, Per gereken 5 sa 20 dk ve Cum kapalıyken 40 saate tamamlamak Perşembeyi 14 sa 50 dk yapar. Devir öncesinde 17,5 saatlik yapay bir plan gerektirmez. Kaydetme/yenileme aynı sonucu korur; hedef çıkış ilk giriş + 14 sa 50 dk olur.

## Kalıcılık ve navigasyon

[plan-storage](../../src/lib/plan-storage.js) `pofis:work-plans:v2` verisini doğrular. [work-plans](../../src/data/work-plans.ts) canlı/demo kapsamlarını ayırır. [use-work-plans](../../src/data/use-work-plans.ts) başarılı yazıdan sonra tek durum güncellemesi yapar; yazı hatasında son kayıt korunur. PDKS kayıtları ve kilitler planda saklanmaz. Tamamla ile seçilen kalan çalışma süreleri saniye hassasiyetinde dakika değerleriyle, haftalık hedef ise ayrı saniye değeriyle kaydedilir. Varsayılan şablon yarım saat adımlarını korur.

V2 yoksa yalnız mevcut v1 `{ weekdays, hours }` biçimi okunur. Okuma yazmaz; ilk başarılı düzenleme v2 oluşturur, özgün v1 korunur. Bozuk veya yeni sınırlara uymayan veri görünür hata verir, düzenleme kilitlenir; sessiz yuvarlama veya eski veriye dönüş yapılmaz.

Ana navigasyondaki Ayarlar mevcut haftaya geçip plan modalını açar. Geçmiş hafta başlığındaki “Hafta planını düzenle” aynı modalı o haftanın bağlamında açar. Kaynak rapor ve plan yüklenene kadar düzenleme devre dışıdır. Modal hataları modal içinde, kapalıyken rapor üzerinde gösterilir. Görsel sözleşme [DESIGN](../../DESIGN.md) sahibindedir.

## Doğrulama ve bağımlılıklar

[Takvim](calendar.md), [kayıt durumu](record-status.md), [süre](duration.md), [ilerleme](progress.md), [görünen haftalık toplam](week.md).

- [Plan testleri](../../src/domain/rules/work-plan.test.ts): gün ilerlemesi, özgün özel hedef, eksik/fazla devir, geriye dağıtım, sınırlar, bakiye, seçimden bağımsız tamamla, kilitler, saniyeler ve idempotans.
- [Rapor testleri](../../src/domain/report.test.ts), [tablo testleri](../../src/components/attendance/report-ui.test.tsx), [kural testleri](../../src/domain/rules/rules.test.ts), [depolama testleri](../../src/data/work-plans.test.ts).
- [Plan kabulü](../../scripts/acceptance/work-plan.js), [hafta ilerleme kabulü](../../scripts/acceptance/work-plan-progression.js), [görünüm kabulü](../../scripts/acceptance/work-plan-style.js), [genel kabul](../../scripts/acceptance/archive-behavior.js).
- Gerçek PDKS kabulü [görev listesinde](../../tasks/todo.md); fixture testleri gerçek kaynağı kanıtlamaz.
