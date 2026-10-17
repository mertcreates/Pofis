# Mesai planı ve çıkış hedefi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md) · [Görsel sözleşme](../../DESIGN.md)

## Sahiplik

[src/domain/rules/work-plan.ts](../../src/domain/rules/work-plan.ts) planlama hesaplarının sahibidir:

| İşlem | Sahip |
| --- | --- |
| Planı doğrulama, haftayı ve hedefini okuma | `readDayPlan`, `readWeekPlan`, `resolveStoredPlan`, `resolveStoredTarget` |
| Hafta/şablon kaydetme ve sıfırlama | `changeWeekPlan`, `changeDefaultPlan` |
| Tamamlanan ve dağıtıma uygun günleri belirleme | `completedDaySeconds`, `planAdjustmentDays` |
| Devir, gereken süreler ve haftalık toplam | `resolveWeekPlan` |
| Gereken süreyi elle düzenleme | `editRequiredMinutes` |
| Varsayılan hafta toplamına tamamlama | `completeWeekPlan` |
| Hedef çıkış | `targetExitAt` |

[PlanEditor](../../src/components/plan-editor.tsx) bu işlemleri kullanıcı eylemlerine bağlar; [report.ts](../../src/domain/report.ts) sonuçlarını ekran modeline taşır.

## Planın yapısı ve varsayılan şablon

- `WorkPlan`, pazartesi–pazar sırasıyla yedi dakika değeri tutar. Düzenlenebilir günler pazartesi–cumadır; günlük aralık 0–960 dakika, kapalı günün değeri sıfırdır. Cumartesi/pazar resmî tatildir ve plan değerleri sıfırdır.
- İlk şablon pazartesi–cuma 480’er dakika, toplam 40 saattir. Şablonu kullanıcı düzenler; PDKS kayıtları gerçekleşen süreyi sağlar.
- Şablon 30 dakika adımlarını kullanır. Haftalık gereken süreler ve bunların düzenlenmesi saniye hassasiyetini korur; stepper 30 dakikalık artış/azalış yapar ve sınırdaki son adımda 0 veya 16 saate ulaşır.
- Haftanın planı özel hafta kaydından, böyle bir kayıt bulunmadığında varsayılan şablondan gelir. Şablon değişikliği onu miras alan geçmiş haftalara da uygulanır.
- Düzenlenen haftada tamamlanan günlerin kayıtlı plan değerleri korunur. Kalan günlerde özel düzenleme varsa o hafta planı kullanılır; diğer durumda kalan günler yeni şablonu miras alır.

## Süreler ve tamamlanan günler

| Kavram | Hesapta kullanılan değer |
| --- | --- |
| Planlanan günlük süre | Varsayılan veya özel hafta kaydındaki günlük hedef |
| Gerçekleşen günlük süre | [Kayıtlı süre sahibinin](recorded-time.md) ilk giriş–son çıkış sonucu |
| Gereken günlük süre | Günlük planın, haftalık hedef ve tamamlanan günlerin farklarıyla dengelenmiş sonucu |
| Haftalık hedef | Başlangıçta günlük planların toplamı; elle düzenlemede gereken süre farkıyla, Tamamla işleminde varsayılan hafta toplamıyla güncellenen hedef |
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

Aynı plan, kayıt, tarih ve haftalık hedef aynı sonucu üretir. Otomatik hesap güncel planı okuyarak sonuç döndürür; kalıcı kayıt kullanıcı düzenlemesinde yapılır. Gün seçimi dağıtım sırasını belirlemez.

Örnek: Pzt 6 saat plan/5,5 saat kayıt, Sal 10 saat, Çar–Cum 8 saat → Sal 10 saat, Cum gereken 8,5 saat, haftalık hedef 40 saat. Pzt 6,5 saat çalışılsaydı Cum gereken 7,5 saat olurdu.

## Elle haftalık düzenleme ve sıfırlama

`editRequiredMinutes`, tamamlanmamış günlerin güncel gereken sürelerini yeni çalışma planına alır. Haftalık hedef, yalnız kullanıcının açıkça değiştirdiği günlerin gereken süre farkı kadar güncellenir. Diğer günlerin gereken süreleri ve tamamlanan günlerin kayıtlı planları korunur. Bağımsız haftalık hedef sonraki hesaplamada bu sürelerin aynı kalmasını sağlar.

Toplu uygulama, seçili gereken süreyi diğer uygun açık günlere uygular. Tamamla işleminin alıcıları güncel seçime göre belirlenir.

Günü kapatma gereken süreyi sıfırlar; haftalık hedeften o günün gereken süresi çıkarılır. Yeniden açma, o günün varsayılan şablon süresini kullanır; şablonda kapalıysa ilk şablondaki 480 dakika uygulanır. Bu süre haftalık hedefe eklenir.

Sıfırla, tamamlanmamış günleri şablona döndürür ve haftalık hedefi sonuç planının toplamına ayarlar. Tamamlanan günlerin kayıtlı planları korunur.

Örnek: Pzt–Çar 26 sa 40 dk kayıt, Per 8 sa, Cum planı 7,5 sa → Cum gereken 4 sa 50 dk, haftalık hedef 39 sa 30 dk. Bu başlangıçtan:

| Kullanıcı eylemi | Sonuç |
| --- | --- |
| Cuma gereken süreyi 5 saate ayarlamak | Cum 5 sa, Per 8 sa, haftalık hedef 39 sa 40 dk |
| Cuma’yı kapatmak | Cum 0, Per 8 sa, haftalık hedef 34 sa 40 dk |

## Varsayılan hafta toplamına tamamlama

`completeWeekPlan`, beklenen toplamı varsayılan hafta toplamına getirir. Hesap otomatik devirdeki uygun günleri ve onların güncel gereken sürelerini kullanır. Öncelik seçili gün dışındaki uygun günlerdedir. Başka uygun gün bulunmadığında seçili uygun gün alıcı olur. Kilitli, kapalı, geçmiş veya belirsiz günler uygunluk kuralıyla korunur.

| Yön | Dağıtım |
| --- | --- |
| Süre ekleme | Alıcı günlere pazartesi–cuma sırasıyla en fazla 30 dakikalık turlar; son adım kalan saniye kadar |
| Süre azaltma | Alıcı günlerin sonundan geriye; gün sıfıra inince önceki alıcı güne geçiş |

Başarılı işlem kalan gereken süreleri çalışma planına, varsayılan toplamını haftalık hedefe kaydeder. Kapasite yetersizse sonuç `null` olur; arayüz işlemi kapasite açıklamasıyla devre dışı gösterir ve mevcut kayıt korunur. Diğer uygun günler varken bu günlerin kapasitesi yetmiyorsa seçili gün korunur.

| Senaryo | Sonuç |
| --- | --- |
| Pzt–Çar 25 sa 9 dk 17 sn kayıt, Per/Cum 8’er saat gereken, Cuma seçili, hedef 41 sa 9 dk 17 sn | Per 6 sa 50 dk 43 sn, Cum 8 sa, hedef 40 sa |
| Pzt–Per 30 sa 1 dk kayıt, yalnız Cuma açık/seçili ve gereken 8 sa, hedef 38 sa 1 dk | Cum 9 sa 59 dk, hedef 40 sa |
| Pzt–Çar 25 sa 10 dk kayıt, Per gereken 5 sa 20 dk, Cum kapalı | Per 14 sa 50 dk, hedef 40 sa; Per ilk girişi 08.00 ise hedef çıkış 22.50 |

## Rapor ve arayüzün kullandığı sonuçlar

[report.ts](../../src/domain/report.ts), `resolveWeekPlan.targets` değerlerini `goalSeconds`, `dailyGoalSeconds` ve `exitGoalSeconds` alanlarına taşır; `plannedGoalSeconds` kayıtlı günlük plandır. Dashboard, gün akışı, tablo ve Pofi aynı gereken süreyi kullanır. Hedef çıkış, ilk giriş + gereken süredir; bu çıkış hesabı için tam hafta raporu ve bugünün güvenilir kayıt durumu gerekir.

Modalda tamamlanan gün gerçekleşeni, diğer hafta günleri gereken süreyi gösterir. Varsayılan sekmesi şablonu düzenler. Haftalık ana toplam hedeftir; beklenen toplam farklıysa ayrıca gösterilir. Geçmiş kayıtsız günün planı beklenen toplamda hedef olarak yer alır; kayıt durumu haftanın eksikliğini belirtir. Hafta sonu PDKS kayıtları gerçekleşen/beklenen toplama katılır; plan değerleri sıfır kalır.

Hesaplar saniye hassasiyetini korur. Görünür süreler saat/dakika, erişilebilir etiketler ve tam süre başlıkları saniye hassasiyetindedir. Etiketler, kontrol durumları ve yerleşim [DESIGN](../../DESIGN.md) sahibindedir.

## Kalıcılık ve navigasyon

Saklanan `WorkPlans` durumu `{ defaultPlan, weekOverrides, weekTargets? }` biçimindedir:

- `defaultPlan`: güncel şablon.
- `weekOverrides`: pazartesi tarihiyle (`YYYY-MM-DD`) anahtarlanan hafta planları. Yedi değerin tamamı şablonla eşleşirse özel kayıt kaldırılır.
- `weekTargets`: günlük plan toplamından ayrılan haftalık hedefler, saniye cinsinden. Günlük toplamla eşleşen hedef girdisi kaldırılır. Her hafta için güncel plan ve hedef tutulur.

[plan-storage](../../src/lib/plan-storage.js) serileştirme ve doğrulamayı, [work-plans](../../src/data/work-plans.ts) canlı/demo depolama kapsamını, [use-work-plans](../../src/data/use-work-plans.ts) başarılı yazıdan sonraki durum güncellemesini yönetir. Okuyucu v2 kaydını; v2 bulunmadığında v1 `{ weekdays, hours }` girdisini kabul eder. Geçersiz veri görünür hata üretir ve düzenleme kilitlenir. Yazı hatasında son başarılı kayıt korunur.

Ana Ayarlar mevcut haftanın planını, geçmiş hafta başlığındaki düzenleme eylemi ilgili haftanın planını açar. Düzenleme için kaynak rapor ve yerel planın yüklenmesi gerekir. Modal açıkken hatalar modalda, kapalıyken rapor üzerinde gösterilir.

## Doğrulama

- [Plan testleri](../../src/domain/rules/work-plan.test.ts): bu belgedeki sayısal senaryolar, kilitler, sınırlar, bakiye, koruma ve tekrar hesaplama.
- [Düzenleyici testleri](../../src/components/plan-editor.test.tsx): açık/kapalı/kilitli gün kontrolleri, süre etiketi ve toplu uygulama gösterimi.
- Bağımlı sonuçlar: [rapor](../../src/domain/report.test.ts), [tablo](../../src/components/attendance/report-ui.test.tsx), [depolama](../../src/data/work-plans.test.ts), [kural mimarisi](../../src/domain/rules/rules.test.ts).
- Kabul betikleri ve çalışma yöntemi: [doğrulama rehberi](../verification.md). Gerçek PDKS kabulünün durumu: [görev listesi](../../tasks/todo.md).
