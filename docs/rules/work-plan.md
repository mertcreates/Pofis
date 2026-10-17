# Mesai planı ve çıkış hedefi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md) · [Görsel sözleşme](../../DESIGN.md)

## Sahiplik

[src/domain/rules/work-plan.ts](../../src/domain/rules/work-plan.ts) planlama hesaplarının sahibidir:

| İşlem | Sahip |
| --- | --- |
| Planı doğrulama, haftayı ve hedefini okuma | `readDayPlan`, `readWeekPlan`, `resolveStoredPlan`, `resolveStoredTarget` |
| İzin günlerini doğrulama/okuma ve izin sonrası referans hedef | `readLeaveDays`, `resolveLeaveDays`, `referenceWeekTarget` |
| Hafta/şablon kaydetme ve sıfırlama | `changeWeekPlan`, `changeDefaultPlan` |
| Tamamlanan ve dağıtıma uygun günleri belirleme | `completedDaySeconds`, `planAdjustmentDays` |
| Devir, gereken süreler ve haftalık toplam | `resolveWeekPlan` |
| Gereken süreyi elle düzenleme | `editRequiredMinutes` |
| İzin sonrası referans hedefe tamamlama | `completeWeekPlan` |
| Hedef çıkış | `targetExitAt` |

[PlanEditor](../../src/components/plan-editor.tsx) bu işlemleri kullanıcı eylemlerine bağlar; [report.ts](../../src/domain/report.ts) sonuçlarını ekran modeline taşır.

## Planın yapısı ve varsayılan şablon

- `WorkPlan`, pazartesi–pazar sırasıyla yedi dakika değeri tutar. Düzenlenebilir günler pazartesi–cumadır; günlük aralık 0–960 dakika, kapalı günün değeri sıfırdır. Cumartesi/pazar resmî tatildir ve plan değerleri sıfırdır.
- İlk şablon pazartesi–cuma 480’er dakika, toplam 40 saattir. Şablonu kullanıcı düzenler; PDKS kayıtları gerçekleşen süreyi sağlar.
- Şablon 30 dakika adımlarını kullanır. Haftalık gereken süreler ve bunların düzenlenmesi saniye hassasiyetini korur; stepper 30 dakikalık artış/azalış yapar ve sınırdaki son adımda 0 veya 16 saate ulaşır.
- Haftanın planı özel hafta kaydından, böyle bir kayıt bulunmadığında varsayılan şablondan gelir. Şablon değişikliği onu miras alan geçmiş haftalara da uygulanır.
- Düzenlenen haftada tamamlanan günlerin kayıtlı plan değerleri korunur. Haftanın şablonu izleme ve özel düzenlemeyi koruma koşulları aşağıdaki tabloda tanımlıdır.

### Varsayılan şablon değişikliği

`changeDefaultPlan`, düzenlenen haftanın kalan günlük planlarını ve haftalık hedefini birlikte değerlendirir:

| Haftanın durumu | Şablon değiştiğinde sonuç |
| --- | --- |
| Tamamlanmamış, izinli olmayan günlerin planları eski şablonla, haftalık hedef de izin sonrası referansla aynı | Kalan günler yeni şablonu, hedef yeni şablonun izin sonrası referansını devralır |
| Tamamlanmamış, izinli olmayan bir günün planı veya haftalık hedef özel | Mevcut günlük plan ve izin öncesi özel hedef korunur; yeni şablondaki izin karşılığı düşülür |

Kilitli günleri korumak için oluşmuş hafta kaydı, yukarıdaki ilk koşul sağlandığında şablonu izlemeye devam eder. İzinli günler kapalı kalır; izin karşılıkları güncel şablondan hesaplanır. Gereken süreler yeni hedef ve gerçekleşen kayıtlarla otomatik dengelenir.

Örnek: Özel düzenlemesi olmayan haftada Pzt–Çar gerçekleşen toplamı 26 sa 40 dk iken şablon 8 × 5'ten 9 × 5'e değiştirilirse haftalık hedef 45 sa, Per 9 sa ve Cum 9 sa 20 dk olur. Şablon ardından 10 × 5'e çıkarılırsa hedef 50 sa olur. Gerçekleşen süreler her iki işlemde korunur.

Bağımsız hedef ve izin işaretleri [kalıcılık sözleşmesine](#kalıcılık-ve-navigasyon) göre saklanır. Yeniden yükleme aynı miras davranışını sürdürür. Kalan günlerin kapasitesi yetmediğinde veya gerçekleşen toplam yeni hedefi aştığında bakiye, otomatik devir sözleşmesindeki sınırlarla görünür kalır.

## Süreler ve tamamlanan günler

| Kavram | Hesapta kullanılan değer |
| --- | --- |
| Planlanan günlük süre | Varsayılan veya özel hafta kaydındaki günlük hedef |
| Gerçekleşen günlük süre | [Kayıtlı süre sahibinin](recorded-time.md) ilk giriş–son çıkış sonucu |
| Gereken günlük süre | Günlük planın, haftalık hedef ve tamamlanan günlerin farklarıyla dengelenmiş sonucu |
| Haftalık hedef | İzin karşılıkları düşülmüş hafta hedefi; elle süre farkı, izin, Sıfırla ve Tamamla işlemleriyle güncellenir |
| İzin sonrası referans hedef | Varsayılan şablon toplamı − izinli günlerin güncel şablondaki süreleri |
| Beklenen toplam | Tamamlanan günlerin gerçekleşen süreleri + kalan günlerin gereken süreleri |

Tamamlanan gün, aynı haftada bugünden önceki bir tarihe ait, durumu `recorded` ve kayıtlı süresi tanımlı gündür. Tutarlı sıfır süreli kayıt da bu kapsamdadır. Bugünün süreleri [canlı tahmin sözleşmesiyle](duration.md), kayıt bütünlüğü [kayıt durumu sözleşmesiyle](record-status.md) değerlendirilir.

Tamamlanan günün gerçekleşeni kilitli gösterilir. Elle/toplu düzenleme, sıfırlama ve şablon değişikliği bu günün kayıtlı planını korur. Devir farkı **gerçekleşen − o günün kayıtlı planı** üzerinden hesaplanır. Örneğin 6 saat planlanan günde 6 saat gerçekleşmesi sıfır fark üretir. Gerçekleşen süre kaynak hassasiyetiyle kullanılır; 16 saat sınırı düzenlenebilir gereken süreye uygulanır.

## Otomatik devir

Dağıtıma uygun gün: bugün veya gelecekte bulunan, pozitif planlı, tamamlanmamış ve kayıt durumu belirsiz olmayan gündür. Tam hafta raporunda gereken süreler şu bakiyeyle hesaplanır:

```text
bakiye = haftalık hedef − günlük plan toplamı
       + Σ(tamamlanan günün plan saniyesi − gerçekleşen saniyesi)
gereken süreler başlangıçta günlük plan süreleridir
```

Bakiye son uygun günden geriye doğru uygulanır. Her gereken süre 0–16 saat aralığında tutulur; o günün sınırı aşılırsa kalan bakiye önceki uygun güne aktarılır. `unallocatedSeconds`, dağıtım sonunda kalan bakiyedir: pozitif değer eksik, negatif değer fazla süreyi gösterir.

Aynı plan, kayıt, tarih ve haftalık hedef aynı sonucu üretir. Otomatik hesap güncel planı okuyarak sonuç döndürür; kalıcı kayıt kullanıcı düzenlemesinde yapılır. Gün seçimi dağıtım sırasını belirlemez. Elle düzenleme sonrasında da kalan bakiye aynı sırayla uygulanır; kapasite sınırlarında elle düzenlenen günün gereken süresi yeniden değişebilir. İzinli günler dağıtıma katılmaz.

Örnek: Pzt 6 saat plan/5,5 saat kayıt, Sal 10 saat, Çar–Cum 8 saat → Sal 10 saat, Cum gereken 8,5 saat, haftalık hedef 40 saat. Pzt 6,5 saat çalışılsaydı Cum gereken 7,5 saat olurdu.

## Elle haftalık düzenleme ve sıfırlama

`editRequiredMinutes`, tamamlanmamış günlerin güncel gereken sürelerini yeni çalışma planına alır. Pozitif süre düzenlemesinde haftalık hedef, açıkça değiştirilen gereken süre farkı kadar güncellenir. Tamamlanan günlerin kayıtlı planları korunur. Yeni hedefle otomatik devir yeniden hesaplanır; dağıtılamayan bakiye varsa elle düzenlenen güne de uygulanabilir.

Toplu uygulama, seçili gereken süreyi diğer uygun açık günlere uygular. Tamamla işleminin alıcıları güncel seçime göre belirlenir.

### İzinli gün

Haftalık düzenlemede günü kapatmak veya süresini sıfıra indirmek o günü izinli yapar. Günün çalışma planı sıfırlanır; haftalık hedeften **o günün güncel varsayılan şablon süresi** düşülür. Hedefin alt sınırı sıfırdır. Otomatik devirle sıfırlanan gereken süre izin oluşturmaz. Şablonda kapalı olan gün, kullanıcı ayrıca izinli yapmadıkça normal kapalı gündür.

İzni kaldırıp yeniden açmak o günün varsayılan şablon süresini kullanır; şablonda kapalıysa ilk şablondaki 480 dakika uygulanır. Açılan süre haftalık hedefe eklenir. İzin karşılığı güncel şablondan okunur; izin işareti haftaya aittir. PDKS geçişleri ve şablon bu işlemle değişmez. İzinli günde gerçek kayıt oluşursa kayıtlı süre normal kayıt kurallarıyla hesaba katılır.

Sıfırla, tamamlanmamış günlerin izinlerini kaldırıp günleri şablona döndürür. Hedef güncel şablon toplamıdır; tamamlanmış izinli gün varsa onun şablon karşılığı düşülür. Tamamlanan günlerin izin işaretleri, kayıtlı planları ve gerçekleşen süreleri korunur. Otomatik devir yeniden hesaplanır; seçili gün sıfırlama sonucunu etkilemez. Aynı şablon ve kayıtlarla tekrar sıfırlama aynı sonucu verir.

Örnek: Pzt–Çar 26 sa 40 dk kayıt, Per 8 sa, Cum planı 7,5 sa → Cum gereken 4 sa 50 dk, haftalık hedef 39 sa 30 dk. Bu başlangıçtan:

| Kullanıcı eylemi | Sonuç |
| --- | --- |
| Cuma gereken süreyi 5 saate ayarlamak | Cum 5 sa, Per 8 sa, haftalık hedef 39 sa 40 dk |
| Cuma’yı izinli yapmak | Cum 0, Per 4 sa 50 dk, haftalık hedef 31 sa 30 dk; şablondaki 8 saat düşülür |

Standart 40 saatlik haftada Pzt–Çar toplamı 26 sa 40 dk, Per gereken 8 sa ve Cum gereken 5 sa 20 dk iken Cuma izni hedefi 32 saate indirir. Per gereken süre 5 sa 20 dk olur. İzni kaldırmak 8 saat ekler ve hedefi 40 saate döndürür. Şablon 9 × 5 ise Cuma izni 9 saat düşürür: hedef 36 sa, Per gereken 9 sa 20 dk olur.

Kapasite örneği: hedef 40 sa, Pzt–Çar gerçekleşeni 6 sa, Per/Cum gereken 16’şar sa ve dağıtılamayan borç 2 sa. Perşembe 15 saate ayarlandığında hedef 39 saate iner; otomatik dağıtım Perşembeyi yeniden 16 saate çıkarır ve kalan borç 1 sa olur.

## İzin sonrası referans hedefe tamamlama

`completeWeekPlan`, beklenen toplamı izin sonrası referans hedefe getirir. Hesap otomatik devirdeki uygun günleri ve onların güncel gereken sürelerini kullanır. Öncelik seçili gün dışındaki uygun günlerdedir. Başka uygun gün bulunmadığında veya diğer günlerin kapasitesi tükendiğinde seçili uygun gün de alıcı olur. Kilitli, izinli, kapalı, geçmiş veya belirsiz günler uygunluk kuralıyla korunur.

| Yön | Dağıtım |
| --- | --- |
| Süre ekleme | Alıcı günlere pazartesi–cuma sırasıyla en fazla 30 dakikalık turlar; son adım kalan saniye kadar |
| Süre azaltma | Alıcı günlerin sonundan geriye; gün sıfıra inince önceki alıcı güne geçiş |

Başarılı işlem kalan gereken süreleri çalışma planına, izin sonrası referansı haftalık hedefe kaydeder. Bütün uygun günlerin kapasitesi yetersizse sonuç `null` olur; arayüz işlemi kapasite açıklamasıyla devre dışı gösterir ve mevcut kayıt korunur.

| Senaryo | Sonuç |
| --- | --- |
| Pzt–Çar 25 sa 9 dk 17 sn kayıt, Per/Cum 8’er saat gereken, Cuma seçili, hedef 41 sa 9 dk 17 sn | Per 6 sa 50 dk 43 sn, Cum 8 sa, hedef 40 sa |
| Pzt–Per 30 sa 1 dk kayıt, yalnız Cuma açık/seçili ve gereken 8 sa, hedef 38 sa 1 dk | Cum 9 sa 59 dk, hedef 40 sa |
| Standart şablonda Cuma izinli, Pzt–Çar 26 sa 40 dk kayıt; Per elle 8 saate çıkarılmış | Tamamla Per’i 5 sa 20 dk’ya indirir, hedef 32 sa; Per ilk girişi 08.00 ise hedef çıkış 13.20 |

## Rapor ve arayüzün kullandığı sonuçlar

[report.ts](../../src/domain/report.ts), `resolveWeekPlan.targets` değerlerini `goalSeconds`, `dailyGoalSeconds` ve `exitGoalSeconds` alanlarına taşır; `plannedGoalSeconds` kayıtlı günlük plandır. Dashboard, gün akışı, tablo ve Pofi aynı gereken süreyi kullanır. Hedef çıkış, ilk giriş + gereken süredir; bu çıkış hesabı için tam hafta raporu ve bugünün güvenilir kayıt durumu gerekir.

Modalda tamamlanan gün gerçekleşeni, izinli gün “İzinli”, diğer açık hafta günleri gereken süreyi gösterir. Varsayılan sekmesi şablonu düzenler. Haftalık ana toplam hedeftir; beklenen toplam farklıysa ayrıca gösterilir. Geçmiş kayıtsız günün planı beklenen toplamda hedef olarak yer alır; kayıt durumu haftanın eksikliğini belirtir. Hafta sonu PDKS kayıtları gerçekleşen/beklenen toplama katılır; plan değerleri sıfır kalır.

Hesaplar saniye hassasiyetini korur. Görünür süreler saat/dakika, erişilebilir etiketler ve tam süre başlıkları saniye hassasiyetindedir. Etiketler, kontrol durumları ve yerleşim [DESIGN](../../DESIGN.md) sahibindedir.

## Kalıcılık ve navigasyon

Saklanan `WorkPlans` durumu `{ defaultPlan, weekOverrides, weekTargets?, weekLeaves? }` biçimindedir:

- `defaultPlan`: güncel şablon.
- `weekOverrides`: pazartesi tarihiyle (`YYYY-MM-DD`) anahtarlanan hafta planları. Yedi değerin tamamı şablonla eşleşirse özel kayıt kaldırılır.
- `weekTargets`: izin karşılıkları düşülmeden önceki haftalık hedef, saniye cinsinden. Okunan net hedef `max(0, saklanan hedef − güncel izin karşılıkları)` olur. İzinli haftada bu kayıt tutulur; izinsiz haftada günlük toplamla eşleşen hedef girdisi kaldırılır. Kayıt yoksa hedef, izinler uygulanmış günlük plan toplamıdır.
- `weekLeaves`: pazartesi tarihiyle anahtarlanan, tekil 0–4 gün indeksleri. Okunan haftalık planda bu günler sıfırlanır. Boş liste kaldırılır. Güncel şablon izin karşılığının tek kaynağıdır.

[plan-storage](../../src/lib/plan-storage.js) serileştirme ve doğrulamayı, [work-plans](../../src/data/work-plans.ts) canlı/demo depolama kapsamını, [use-work-plans](../../src/data/use-work-plans.ts) başarılı yazıdan sonraki durum güncellemesini yönetir. Okuyucu v2 kaydını; v2 bulunmadığında v1 `{ weekdays, hours }` girdisini kabul eder. Geçersiz veri görünür hata üretir ve düzenleme kilitlenir. Yazı hatasında son başarılı kayıt korunur.

Ana Ayarlar mevcut haftanın planını, geçmiş hafta başlığındaki düzenleme eylemi ilgili haftanın planını açar. Düzenleme için kaynak rapor ve yerel planın yüklenmesi gerekir. Modal açıkken hatalar modalda, kapalıyken rapor üzerinde gösterilir.

## Doğrulama

- [Plan testleri](../../src/domain/rules/work-plan.test.ts): bu belgedeki sayısal senaryolar, şablon mirası/özel hedef ayrımı, kilitler, sınırlar, bakiye, koruma ve tekrar hesaplama.
- [İzin ve kapasite testleri](../../src/domain/rules/work-plan-leave.test.ts): şablon karşılığını düşme, sıfır süre/izin ayrımı, açma/sıfırlama, şablon değişimi ve elle düzenlenen güne otomatik bakiye uygulama.
- [Düzenleyici testleri](../../src/components/plan-editor.test.tsx): açık/kapalı/kilitli gün kontrolleri, süre etiketi ve toplu uygulama gösterimi.
- Bağımlı sonuçlar: [rapor](../../src/domain/report.test.ts), [tablo](../../src/components/attendance/report-ui.test.tsx), [depolama](../../src/data/work-plans.test.ts), [kural mimarisi](../../src/domain/rules/rules.test.ts).
- Kabul betikleri ve çalışma yöntemi: [doğrulama rehberi](../verification.md). Gerçek PDKS kabulünün durumu: [görev listesi](../../tasks/todo.md).
