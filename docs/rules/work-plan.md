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
| Günün açık durumunu ve sıfır süreli açık günleri okuma | `isOpenPlanDay`, `resolveZeroOpenDays` |
| Devir, gereken süreler ve haftalık toplam | `resolveWeekPlan` |
| Gereken süreyi elle düzenleme | `editRequiredMinutes` |
| İzin sonrası referans hedefe tamamlama | `completeWeekPlan` |
| Hedef çıkış | `targetExitAt` |

[PlanEditor](../../src/components/plan-editor.tsx) bu işlemleri kullanıcı eylemlerine bağlar; [report.ts](../../src/domain/report.ts) sonuçlarını ekran modeline taşır.

## Planın yapısı ve varsayılan şablon

- `WorkPlan`, pazartesi–pazar sırasıyla yedi dakika değeri tutar. Düzenlenebilir günler pazartesi–cumadır; günlük aralık 0–960 dakikadır. Şablonda sıfır değer kapalı gündür; haftada otomatik hesapla sıfırlanmış açık gün ayrıca işaretlenir. Cumartesi/pazar bu plan modelinde düzenlenemez ve plan değerleri sıfırdır; mevcut PDKS kayıtları korunur.
- İlk şablon pazartesi–cuma 480’er dakika, toplam 40 saattir. Şablonu kullanıcı düzenler; PDKS kayıtları gerçekleşen süreyi sağlar.
- Şablon 30 dakika adımlarını kullanır. Haftalık gereken süreler ve bunların düzenlenmesi saniye hassasiyetini korur; stepper 30 dakikalık artış/azalış yapar ve sınırdaki son adımda 0 veya 16 saate ulaşır.
- Haftanın planı özel hafta kaydından, böyle bir kayıt bulunmadığında varsayılan şablondan gelir. Şablon değişikliği onu miras alan geçmiş haftalara da uygulanır.
- Düzenlenen haftada tamamlanan günlerin kayıtlı plan değerleri korunur. Haftanın şablonu izleme ve özel düzenlemeyi koruma koşulları aşağıdaki tabloda tanımlıdır.

### Günün açık veya kapalı olması

| Durum | Haftalık hedefe etkisi | Otomatik dağıtım |
| --- | --- | --- |
| Şablondan kapalı gün | Miras alınan şablon toplamına süre katmaz | Süre almaz |
| Haftalık planda izinli yapılan gün | O günün güncel şablon karşılığı düşülür | Süre almaz |
| Açık gün, gereken süresi 0 | Hedef aynı kalır | Kayıt veya plan değiştiğinde yeniden süre alabilir |

İlk iki durumda gün kapalıdır. Üçüncü durumda gereken süre sıfırdır ve gün açıktır. Örneğin kullanıcı Tamamla ile Cuma'yı açık ve 0 saat kaydetmişse, Pzt–Per toplamı 40 saatten 39 saate düzeltildiğinde Cuma'ya 1 saat düşer. Güncel politikada Pzt–Per toplamının 40 saate ulaşması, planlanan 8 saatlik Cuma'yı korur; beklenen toplam 48 saat ve fazla süre 8 saattir. Cuma'yı izinli yapmak ise 8 saatlik şablonda hedefi 32 saate indirir.

### Varsayılan şablon değişikliği

`changeDefaultPlan`, düzenlenen haftanın kalan günlük planlarını ve haftalık hedefini birlikte değerlendirir:

| Haftanın durumu | Şablon değiştiğinde sonuç |
| --- | --- |
| Tamamlanmamış, izinli olmayan günlerin planları eski şablonla, haftalık hedef de izin sonrası referansla aynı; sıfır süreli açık gün işareti yok | Kalan günler yeni şablonu, hedef yeni şablonun izin sonrası referansını devralır |
| Tamamlanmamış, izinli olmayan bir günün planı, sıfır süreli açık gün işareti veya haftalık hedef özel | Mevcut günlük plan, açık gün işaretleri ve izin öncesi özel hedef korunur; yeni şablondaki izin karşılığı düşülür |

Kilitli günleri korumak için oluşmuş hafta kaydı, yukarıdaki ilk koşul sağlandığında şablonu izlemeye devam eder. İzinli günler kapalı kalır; izin karşılıkları güncel şablondan hesaplanır. Gereken süreler yeni hedef ve gerçekleşen kayıtlarla otomatik dengelenir.

Örnek: Özel düzenlemesi olmayan haftada Pzt–Çar gerçekleşen toplamı 26 sa 40 dk iken şablon 8 × 5'ten 9 × 5'e değiştirilirse haftalık hedef 45 sa, Per 9 sa ve Cum 9 sa 20 dk olur. Şablon ardından 10 × 5'e çıkarılırsa hedef 50 sa olur. Gerçekleşen süreler her iki işlemde korunur.

Yeniden yükleme aynı miras davranışını sürdürür. Kalan günlerin kapasitesi yetmediğinde veya gerçekleşen toplam yeni hedefi aştığında bakiye görünür kalır.

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

Dağıtıma uygun gün: bugün veya gelecekte bulunan, açık, tamamlanmamış ve kayıt durumu belirsiz olmayan gündür. Pozitif planlı gün ile sıfır süreli açık gün işareti taşıyan gün açıktır. Tam hafta raporunda gereken süreler şu bakiyeyle hesaplanır:

```text
bakiye = haftalık hedef − günlük plan toplamı
       + Σ(tamamlanan günün plan saniyesi − gerçekleşen saniyesi)
gereken süreler başlangıçta günlük plan süreleridir
```

Pozitif bakiye (eksik süre), son uygun günden geriye doğru uygulanır. Her gereken süre 0–16 saat aralığında tutulur; o günün sınırı aşılırsa kalan bakiye önceki uygun güne aktarılır. `unallocatedSeconds`, dağıtım sonunda kalan bakiyedir: pozitif değer eksik, negatif değer fazla süreyi gösterir.

Fazla sürenin otomatik azaltılmasını aynı modüldeki `WORK_PLAN_POLICY.autoReduceSurplus` yönetir:

| Ayar | Negatif bakiye (fazla süre) |
| --- | --- |
| `false` (güncel) | Kalan günlerin kayıtlı plan süreleri korunur; fazla süre negatif bakiyede ve modalın bilgilendirmesinde gösterilir |
| `true` | Önceki davranış: fazla süre son uygun günden geriye doğru, günlük alt sınır 0 olacak şekilde düşülür |

Önceki davranışı geri açmak için yalnız bu sabiti `true` yapın. Modal, rapor, günlük hedef, hedef çıkış ve Pofi ortak hesabı kullanır. Ayar uygulama politikasıdır; kullanıcı ayarı veya kalıcı plan alanı değildir. `resolveWeekPlan` son parametresiyle her iki davranış izole testlerde doğrulanır. Eksik süre dağıtımı iki ayarda da sürer. Kullanıcının elle azaltma ve Tamamla eylemleri kendi sözleşmeleriyle çalışır.

Tam hafta hesabında `beklenen toplam + unallocatedSeconds = haftalık hedef` eşitliği korunur. Kalan uygun gün veya kapasite bulunmadığında fark bu bakiyede kalır.

Aynı plan, kayıt, tarih ve haftalık hedef aynı sonucu üretir. Otomatik hesap güncel planı okuyarak sonuç döndürür; kalıcı kayıt kullanıcı düzenlemesinde yapılır. Dağıtım sırası her gün seçiminde aynı kurala göre belirlenir. Elle düzenleme sonrasında da kalan bakiye aynı sırayla uygulanır; kapasite sınırlarında elle düzenlenen günün gereken süresi yeniden değişebilir. İzinli günler dağıtıma katılmaz.

Tamamla veya önceki otomatik azaltma politikasıyla sıfıra inen gereken süre günün açık durumunu korur. Elle düzenleme veya Tamamla sonucu kaydedilirken sıfır süreli açık gün işareti saklanır. Kayıtlar sonraki gün değiştiğinde bu gün yeniden borç alabilir. Örnek: Pzt–Çar toplam 32 sa, Per gereken 8 sa, Cum gereken 0 olarak kayıtlıyken Per 7,5 saate ayarlanırsa hedef 39,5 sa olur. Per gerçekleşeni ertesi gün 7 sa olduğunda Cum gereken 30 dk olur.

Örnek: Pzt 6 saat plan/5,5 saat kayıt, Sal 10 saat, Çar–Cum 8 saat → Sal 10 saat, Cum gereken 8,5 saat, haftalık hedef 40 saat. Pzt 6,5 saat çalışılsaydı güncel ayarda Cum 8 saat kalır; beklenen toplam 40,5 saat ve fazla süre 30 dakika olur. `autoReduceSurplus: true` iken Cum gereken 7,5 saattir.

## Elle haftalık düzenleme ve sıfırlama

`editRequiredMinutes`, tamamlanmamış günlerin güncel gereken sürelerini yeni çalışma planına alır. Pozitif süre düzenlemesinde haftalık hedef, açıkça değiştirilen gereken süre farkı kadar güncellenir. Tamamlanan günlerin kayıtlı planları korunur. Yeni hedefle otomatik devir yeniden hesaplanır; dağıtılamayan bakiye varsa elle düzenlenen güne de uygulanabilir.

Toplu uygulama, seçili gereken süreyi diğer uygun açık günlere uygular. Tamamla işleminin dağıtım sırası [aşağıda](#izin-sonrası-referans-hedefe-tamamlama) tanımlıdır.

<a id="izinli-gün"></a>

### İzinli gün

Haftalık düzenlemede günü kapatmak veya süresini elle sıfıra indirmek o günü izinli yapar. Günün çalışma planı sıfırlanır; haftalık hedeften **o günün güncel varsayılan şablon süresi** düşülür. Hedefin alt sınırı sıfırdır. Aynı günün izin karşılığı hedefte bir kez uygulanır. İzin, uygulamadaki kişisel planlama tercihidir ve bu planın hedefini günceller.

İzni kaldırıp yeniden açmak o günün varsayılan şablon süresini kullanır; şablonda kapalıysa ilk şablondaki 480 dakika uygulanır. Açılan süre haftalık hedefe eklenir. İzin karşılığı güncel şablondan okunur; izin işareti haftaya aittir. PDKS geçişleri ve şablon bu işlemle değişmez. İzinli günde gerçek kayıt oluşursa kayıtlı süre normal kayıt kurallarıyla hesaba katılır.

Sıfırla, tamamlanmamış günlerin izinlerini kaldırıp günleri şablona döndürür. Hedef güncel şablon toplamıdır; tamamlanmış izinli gün varsa onun şablon karşılığı düşülür. Tamamlanan günlerin izin işaretleri, kayıtlı planları ve gerçekleşen süreleri korunur. Otomatik devir yeniden hesaplanır; seçili gün sıfırlama sonucunu etkilemez. Aynı şablon ve kayıtlarla tekrar sıfırlama aynı sonucu verir.

Örnek: Pzt–Çar 26 sa 40 dk kayıt, Per 8 sa, Cum planı 7,5 sa → Cum gereken 7 sa 30 dk, haftalık hedef 39 sa 30 dk, beklenen toplam 42 sa 10 dk ve fazla süre 2 sa 40 dk. Bu başlangıçtan:

| Kullanıcı eylemi | Sonuç |
| --- | --- |
| Cuma gereken süreyi 5 saate ayarlamak | Cum 5 sa, Per 8 sa, haftalık hedef 37 sa; fazla süre 2 sa 40 dk olarak kalır |
| Cuma’yı izinli yapmak | Cum 0, Per 8 sa, haftalık hedef 31 sa 30 dk; şablondaki 8 saat düşülür, fazla süre 3 sa 10 dk olur |

Şablon 9 × 5 ve Pzt–Çar toplamı 26 sa 40 dk ise Cuma izni 9 saat düşürür: hedef 36 sa, Per gereken 9 sa 20 dk olur.

Kapasite örneği: hedef 40 sa, Pzt–Çar gerçekleşeni 6 sa, Per/Cum gereken 16’şar sa ve dağıtılamayan borç 2 sa. Perşembe 15 saate ayarlandığında hedef 39 saate iner; otomatik dağıtım Perşembeyi yeniden 16 saate çıkarır ve kalan borç 1 sa olur.

<a id="izin-sonrası-referans-hedefe-tamamlama"></a>

## İzin sonrası referans hedefe tamamlama

`completeWeekPlan`, beklenen toplamı izin sonrası referans hedefe getirir. Haftalık hedef veya beklenen toplam bu referanstan farklıysa modal Tamamla eylemini gösterir; standart 40 saatlik plandaki fazla süre de bu kapsamdadır. Hesap otomatik devirdeki uygun günleri ve onların güncel gereken sürelerini kullanır. Kilitli, izinli, kapalı, geçmiş veya belirsiz günler uygunluk kuralıyla korunur.

| Yön | Dağıtım |
| --- | --- |
| Süre ekleme | Önce seçili gün dışındaki uygun günlere pazartesi–cuma sırasıyla en fazla 30 dakikalık turlar; son adım kalan saniye kadar. Başka uygun gün yoksa veya kapasiteleri tükenirse seçili uygun güne eklenir |
| Süre azaltma | Seçimden bağımsız, tüm uygun günlerin sonundan geriye; gün sıfıra inince önceki uygun güne geçiş |

Başarılı işlem kalan gereken süreleri çalışma planına, izin sonrası referansı haftalık hedefe kaydeder. Bütün uygun günlerin kapasitesi yetersizse sonuç `null` olur; arayüz işlemi kapasite açıklamasıyla devre dışı gösterir ve mevcut kayıt korunur.

Otomatik devir, mevcut haftalık hedefe göre kendiliğinden hesaplanır. Tamamla ise kullanıcının eylemiyle haftalık hedefi izin sonrası referansa getirir ve dağılımı kaydeder.

| Senaryo | Sonuç |
| --- | --- |
| Pzt–Çar 25 sa 9 dk 17 sn kayıt, Per/Cum 8’er saat gereken, Cuma seçili, hedef 41 sa 9 dk 17 sn | Per 8 sa, Cum 6 sa 50 dk 43 sn, hedef 40 sa |
| Pzt–Per 30 sa 1 dk kayıt, yalnız Cuma açık/seçili ve gereken 8 sa, hedef 38 sa 1 dk | Cum 9 sa 59 dk, hedef 40 sa |
| Standart şablonda Cuma izinli, Pzt–Çar 26 sa 40 dk kayıt; Per elle 8 saate çıkarılmış | Tamamla Per’i 5 sa 20 dk’ya indirir, hedef 32 sa; Per ilk girişi 08.00 ise hedef çıkış 13.20 |

## Rapor ve arayüzün kullandığı sonuçlar

[report.ts](../../src/domain/report.ts), `resolveWeekPlan.targets` değerlerini günlük `dailyGoalSeconds` ve `exitGoalSeconds` alanlarına taşır. `workingDay` günlük açık durumunu taşır; kayıt durumu, grafik, tablo ve ilerleme bu alanı kullanır. Kayıtlı plan ve haftalık hedef [use-work-plans](../../src/data/use-work-plans.ts) sahibinden alınır; metrikler haftalık hedefi doğrudan kullanır. Dashboard, gün akışı, tablo ve Pofi aynı gereken süreyi kullanır. Hedef çıkış, ilk giriş + gereken süredir; bu çıkış hesabı için tam hafta raporu ve bugünün güvenilir kayıt durumu gerekir.

Modalda tamamlanan gün gerçekleşeni, izinli gün “İzinli”, diğer açık hafta günleri gereken süreyi gösterir. Varsayılan sekmesi şablonu düzenler. Üstteki değer “Haftalık plan” olarak gösterilir. Planın izin sonrası referans hedefe farkı alt eylem alanında “40 sa hedefine kalan: 1 sa” gibi gösterilir. Güncel ayarda negatif bakiye ve izin sonrası referansla aynı haftalık hedef, “Beklenen toplam, haftalık hedefin … üzerinde. Kalan günlerin planı korunuyor.” bilgilendirmesini üretir. Haftalık hedef bu referanstan farklıysa üstteki fazla süre bildirimi gizlenir; alt bölümdeki hedef farkı ve Tamamla eylemi güncel hesapla çalışır. Otomatik azaltma açıkken dağıtılamayan fazla veya her iki ayarda dağıtılamayan eksik süre kapasite uyarısıyla gösterilir. Hafta sonu PDKS kayıtları gerçekleşen/beklenen toplama katılır; plan değerleri sıfır kalır.

Geçmiş kayıtsız veya belirsiz günün gerçekleşeni devir toplamına katılmaz; o günün plan süresi beklenen toplamda kalır. Bugünün kayıtları gün içinde açık/kapalı giriş durumuyla gösterilir; günlük fark ertesi gün kayıt tamamlandığında devre girer. Rapor haftanın yalnız bir bölümünü kapsıyorsa otomatik devir uygulanmaz ve hedef çıkış üretilmez. Bu durumların kayıt etiketleri [kayıt durumu sözleşmesindedir](record-status.md).

Hesaplar saniye hassasiyetini korur. Görünür süreler saat/dakika, erişilebilir etiketler ve tam süre başlıkları saniye hassasiyetindedir. Etiketler, kontrol durumları ve yerleşim [DESIGN](../../DESIGN.md) sahibindedir.

## Kalıcılık ve navigasyon

Saklanan `WorkPlans` durumu `{ defaultPlan, weekOverrides, weekTargets?, weekLeaves?, weekZeroOpenDays? }` biçimindedir:

- `defaultPlan`: güncel şablon.
- `weekOverrides`: pazartesi tarihiyle (`YYYY-MM-DD`) anahtarlanan hafta planları. Yedi değerin tamamı şablonla eşleşirse özel kayıt kaldırılır.
- `weekTargets`: izin karşılıkları düşülmeden önceki haftalık hedef, saniye cinsinden. Okunan net hedef `max(0, saklanan hedef − güncel izin karşılıkları)` olur. İzinli haftada bu kayıt tutulur; izinsiz haftada günlük toplamla eşleşen hedef girdisi kaldırılır. Kayıt yoksa hedef, izinler uygulanmış günlük plan toplamıdır.
- `weekLeaves`: pazartesi tarihiyle anahtarlanan, tekil 0–4 gün indeksleri. Okunan haftalık planda bu günler sıfırlanır. Boş liste kaldırılır. Güncel şablon izin karşılığının tek kaynağıdır.
- `weekZeroOpenDays`: sıfır plan süresine rağmen açık kalan günlerin tekil 0–4 indeksleri. Önceki açık gün kullanıcı düzenlemesinde veya Tamamla sonucunda sıfırla kaydedilirse işaretlenir. İzin verme işareti kaldırır; pozitif plan değeri açık durumu zaten taşır. Sıfırla tamamlanmamış işaretleri kaldırıp şablonu uygular; tamamlanan günün işareti korunur. Boş ve pozitif plan için gereksiz işaretler temizlenir; izinle çelişen işaretler reddedilir.

[plan-storage](../../src/lib/plan-storage.js) serileştirme ve doğrulamayı, [work-plans](../../src/data/work-plans.ts) canlı/demo depolama kapsamını, [use-work-plans](../../src/data/use-work-plans.ts) başarılı yazıdan sonraki durum güncellemesini yönetir. Güncel şema tek `pofis:work-plans:v1` anahtarında saklanır; demo aynı şemayı `demo:pofis:work-plans:v1` anahtarında tutar. Yalnız bu anahtar okunur; kayıt yoksa varsayılan plan açılır. Depolama sözleşmesi güncel v1 şemasıdır. Güncel anahtardaki geçersiz veri görünür hata üretir ve düzenleme kilitlenir. Yazı hatasında son başarılı kayıt korunur.

Ana Ayarlar mevcut haftanın planını, geçmiş hafta başlığındaki düzenleme eylemi ilgili haftanın planını açar. Düzenleme için kaynak rapor ve yerel planın yüklenmesi gerekir. Modal açıkken hatalar modalda, kapalıyken rapor üzerinde gösterilir.

## Doğrulama

Bu belgedeki senaryoların test dosyaları ve kabul yöntemi [doğrulama rehberinde](../verification.md#plan-doğrulaması), bekleyen gerçek PDKS ve arayüz kabulü [görev listesinde](../../tasks/todo.md) tutulur.
