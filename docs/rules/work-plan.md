# Mesai planı ve çıkış hedefi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md) · [Görsel sözleşme](../../DESIGN.md)

## Sahiplik

[src/domain/rules/work-plan.ts](../../src/domain/rules/work-plan.ts) planlama hesaplarının sahibidir:

| İşlem | Sahip |
| --- | --- |
| Planı doğrulama, haftayı ve hedefini okuma | `readDayPlan`, `readWeekPlan`, `resolveStoredPlan`, `resolveStoredTarget` |
| Serbest süre girişini okuma ve +/- adımları | [plan-duration.ts](../../src/domain/rules/plan-duration.ts): `parsePlanDuration`, `stepPlanDuration` |
| Manuel kilitleri okuma ve kaydetme | `resolveUserLockedDays`, `changeWeekLockedDays` |
| Haftalık saat seçimini doğrulama, okuma ve kaydetme | `readWeekTimes`, `resolveWeekTimes`, `changeWeekTime` |
| İzin günlerini doğrulama/okuma ve izin sonrası referans hedef | `readLeaveDays`, `resolveLeaveDays`, `referenceWeekTarget` |
| Hafta/şablon kaydetme ve sıfırlama | `changeWeekPlan`, `changeDefaultPlan` |
| Kayıtlı süreyi, kilitli ve dağıtıma uygun günleri belirleme | `completedDaySeconds`, `lockedDays`, `planProtectionMarkers`, `planAdjustmentDays` |
| Günün açık durumunu ve sıfır süreli açık günleri okuma | `isOpenPlanDay`, `resolveZeroOpenDays` |
| Devir, gereken süreler ve haftalık toplam | `resolveWeekPlan` |
| Gereken süreyi elle düzenleme | `editRequiredMinutes` |
| İzin sonrası referans hedefe tamamlama | `completeWeekPlan` |
| Hedef çıkış | `targetExitAt` |

[PlanEditor](../../src/components/plan-editor.tsx) bu işlemleri kullanıcı eylemlerine bağlar; [report.ts](../../src/domain/report.ts) sonuçlarını ekran modeline taşır.

## Planın yapısı ve varsayılan şablon

- `WorkPlan`, pazartesi–pazar sırasıyla yedi dakika değeri tutar. Düzenlenebilir günler pazartesi–cumadır; günlük aralık 0–960 dakikadır. Şablonda sıfır değer kapalı gündür; haftada otomatik hesapla sıfırlanmış açık gün ayrıca işaretlenir. Cumartesi/pazar bu plan modelinde düzenlenemez ve plan değerleri sıfırdır; mevcut PDKS kayıtları korunur.
- İlk şablon pazartesi–cuma 480’er dakika, toplam 40 saattir. Şablonu kullanıcı düzenler; PDKS kayıtları gerçekleşen süreyi sağlar.
- Süre giriş biçimleri ve +/- adımları [süre girişi sözleşmesinde](plan-duration.md) tanımlıdır. Haftalık gereken süreler saniye hassasiyetini korur.

- Haftanın planı özel hafta kaydından, böyle bir kayıt bulunmadığında varsayılan şablondan gelir. Şablon değişikliği onu miras alan geçmiş haftalara da uygulanır.
- Düzenlenen haftada tamamlanan günlerin kayıtlı plan değerleri korunur. Haftanın şablonu izleme ve özel düzenlemeyi koruma koşulları aşağıdaki tabloda tanımlıdır.

### Günün açık veya kapalı olması

| Durum | Haftalık hedefe etkisi | Otomatik dağıtım |
| --- | --- | --- |
| Şablondan kapalı gün | Miras alınan şablon toplamına süre katmaz | Süre almaz |
| Haftalık planda izinli yapılan gün | O günün güncel şablon karşılığı düşülür | Süre almaz |
| Açık gün, gereken süresi 0 | Hedef aynı kalır | Kayıt veya plan değiştiğinde yeniden süre alabilir |
| Kullanıcının kilitlediği açık gün | Hedef aynı kalır | Gereken süre korunur; diğer uygun günlere dağıtılır |

İlk iki durumda gün kapalıdır. Üçüncü durumda gereken süre sıfırdır ve gün açıktır. Örneğin kullanıcı Tamamla ile Cuma'yı açık ve 0 saat kaydetmişse, Pzt–Per toplamı 40 saatten 39 saate düzeltildiğinde Cuma'ya 1 saat düşer. Güncel politikada Pzt–Per toplamının 40 saate ulaşması, planlanan 8 saatlik Cuma'yı korur; beklenen toplam 48 saat ve fazla süre 8 saattir. Cuma'yı izinli yapmak ise 8 saatlik şablonda hedefi 32 saate indirir.

### Varsayılan şablon değişikliği

Çalışma düzeni sekmesindeki “Planı sıfırla”, şablon ilk plandan farklıysa görünür. `onSaveDefault(DEFAULT_WORK_PLAN)` üzerinden mevcut şablon kaydetme akışını kullanır; pazartesi–cuma 480'er dakika, hafta sonu sıfır olur. Aşağıdaki miras ve koruma kuralları bu işlemde de geçerlidir. Kaydetme başarısızsa son başarılı plan korunur.

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

Geçmiş günde turnike hareketi varsa gün plan düzenlemesine kilitlenir. İlk giriş ve son çıkıştan kayıtlı süre hesaplanabiliyorsa, çift giriş/çıkış uyarıları olsa da bu süre gerçekleşen olarak devir, beklenen toplam ve şablon hesabına katılır. Sıfır süreli kayıt da bu kapsamdadır. Yalnız çıkış veya yalnız giriş gibi süre hesaplanamayan kayıtta gün kilitlenir; gerçekleşen süre bilinmez ve devir farkı üretilmez. Kayıt uyarısı raporda ayrıca gösterilir. Bugünün süreleri [canlı tahmin sözleşmesiyle](duration.md), kayıt bütünlüğü [kayıt durumu sözleşmesiyle](record-status.md) değerlendirilir.

Kilitli günün hesaplanabilen gerçekleşeni gösterilir; süre hesaplanamıyorsa “Süre belirsiz” gösterilir. Elle/toplu düzenleme, sıfırlama ve şablon değişikliği bu günün kayıtlı planını korur. Devir farkı **gerçekleşen − o günün kayıtlı planı** üzerinden hesaplanır. Örneğin 6 saat planlanan günde 6 saat gerçekleşmesi sıfır fark üretir. Gerçekleşen süre kaynak hassasiyetiyle kullanılır; 16 saat sınırı düzenlenebilir gereken süreye uygulanır.

## Otomatik devir

Dağıtıma uygun gün bugün veya gelecekteki açık, tamamlanmamış gündür. Kayıt durumu belirsiz veya kilitli gün dağıtıma katılmaz. Pozitif planlı gün ile sıfır süreli açık gün işareti taşıyan gün açıktır. Kullanıcı seçtiği haftalık günü kilitleyebilir. Kilitleme, o anda görünen gereken süreyi haftanın planına kaydeder. Kilit açıkken süre alanı ve İzin eylemi kapalıdır; kilidi açınca kullanıcı yeniden düzenleyebilir. Otomatik devir, Tamamla, açık günlere uygulama ve şablon değişikliği kilitli günün planını korur. Sıfırla manuel kilidi kaldırır ve günü şablona döndürür. Kapasite yetersizse kalan fark görünür.

Tam hafta raporunda gereken süreler şu bakiyeyle hesaplanır:

```text
bakiye = haftalık hedef − günlük plan toplamı
       + Σ(tamamlanan günün plan saniyesi − gerçekleşen saniyesi)
gereken süreler başlangıçta günlük plan süreleridir
```

Pozitif bakiye (eksik süre), son uygun günden geriye doğru uygulanır. Her gereken süre 0–16 saat aralığında tutulur; o günün sınırı aşılırsa kalan bakiye önceki uygun güne aktarılır. `unallocatedSeconds`, dağıtım sonunda kalan bakiyedir: pozitif değer eksik, negatif değer fazla süreyi gösterir.

Fazla sürenin otomatik azaltılmasını aynı modüldeki `WORK_PLAN_POLICY.autoReduceSurplus` yönetir:

| Ayar | Negatif bakiye (fazla süre) |
| --- | --- |
| `false` (güncel) | Kalan günlerin kayıtlı plan süreleri korunur; fazla süre negatif bakiyede kalır |
| `true` | Fazla süre son uygun günden geriye doğru, günlük alt sınır 0 olacak şekilde düşülür |

Otomatik azaltmayı açmak için bu sabiti `true` yapın. Modal, rapor, günlük hedef, hedef çıkış ve Pofi ortak hesabı kullanır. Ayar uygulama politikasıdır; kullanıcı ayarı veya kalıcı plan alanı değildir. `resolveWeekPlan` içindeki `autoReduceSurplus` parametresiyle her iki davranış izole testlerde doğrulanır. Eksik süre dağıtımı iki ayarda da sürer. Kullanıcının elle azaltma ve Tamamla eylemleri kendi sözleşmeleriyle çalışır.

Tam hafta hesabında `beklenen toplam + unallocatedSeconds = haftalık hedef` eşitliği korunur. Kalan uygun gün veya kapasite bulunmadığında fark bu bakiyede kalır.

Aynı plan, kayıt, tarih ve haftalık hedef aynı sonucu üretir. Otomatik hesap güncel planı okuyarak sonuç döndürür; kalıcı kayıt kullanıcı düzenlemesinde yapılır. Dağıtım sırası her gün seçiminde aynı kurala göre belirlenir. Elle düzenleme sonrasında da kalan bakiye aynı sırayla uygulanır; kapasite sınırlarında elle düzenlenen günün gereken süresi yeniden değişebilir. İzinli günler dağıtıma katılmaz.

Tamamla veya otomatik azaltmayla sıfıra inen gereken süre günün açık durumunu korur. Elle düzenleme veya Tamamla sonucu kaydedilirken sıfır süreli açık gün işareti saklanır. Kayıtlar sonraki gün değiştiğinde bu gün yeniden borç alabilir. Örnek: Pzt–Çar toplam 32 sa, Per gereken 8 sa, Cum gereken 0 olarak kayıtlıyken Per 7,5 saate ayarlanırsa hedef 39,5 sa olur. Per gerçekleşeni ertesi gün 7 sa olduğunda Cum gereken 30 dk olur.

Örnek: Pzt 6 saat plan/5,5 saat kayıt, Sal 10 saat, Çar–Cum 8 saat → Sal 10 saat, Cum gereken 8,5 saat, haftalık hedef 40 saat. Pzt 6,5 saat çalışılsaydı güncel ayarda Cum 8 saat kalır; beklenen toplam 40,5 saat ve fazla süre 30 dakika olur. `autoReduceSurplus: true` iken Cum gereken 7,5 saattir.

## Elle haftalık düzenleme ve sıfırlama

`editRequiredMinutes`, tamamlanmamış günlerin güncel gereken sürelerini yeni çalışma planına alır. Pozitif süre düzenlemesinde haftalık hedef, açıkça değiştirilen gereken süre farkı kadar güncellenir. Tamamlanan günlerin kayıtlı planları korunur. Yeni hedefle otomatik devir yeniden hesaplanır; dağıtılamayan bakiye varsa elle düzenlenen güne de uygulanabilir.

Toplu uygulama, seçili gereken süreyi diğer uygun açık günlere uygular. Seçili günün manuel kilidi bu eylemi engellemez; seçili günün süresi ve diğer kilitli günler korunur. Uygun günlerden en az birinin süresi farklıysa “Açık günlere uygula” görünür. Tamamla işleminin dağıtım sırası [aşağıda](#izin-sonrası-referans-hedefe-tamamlama) tanımlıdır.

<a id="izinli-gün"></a>

### İzinli gün

Haftalık düzenlemede günü kapatmak veya süresini elle sıfıra indirmek o günü izinli yapar. Günün çalışma planı sıfırlanır; haftalık hedeften **o günün güncel varsayılan şablon süresi** düşülür. Hedefin alt sınırı sıfırdır. Aynı günün izin karşılığı hedefte bir kez uygulanır. İzin, uygulamadaki kişisel planlama tercihidir ve bu planın hedefini günceller.

İzni kaldırıp yeniden açmak o günün varsayılan şablon süresini kullanır; şablonda kapalıysa ilk şablondaki 480 dakika uygulanır. Açılan süre haftalık hedefe eklenir. İzin karşılığı güncel şablondan okunur; izin işareti haftaya aittir. PDKS geçişleri ve şablon bu işlemle değişmez. İzinli günde gerçek kayıt oluşursa kayıtlı süre normal kayıt kurallarıyla hesaba katılır.

Sıfırla, haftanın manuel kilitlerini ve tamamlanmamış günlerin izinlerini kaldırıp tamamlanmamış günleri şablona döndürür. Hedef güncel şablon toplamıdır; tamamlanmış izinli gün varsa onun şablon karşılığı düşülür. Tamamlanan günlerin izin işaretleri, kayıtlı planları ve gerçekleşen süreleri korunur. Otomatik devir yeniden hesaplanır; seçili gün sıfırlama sonucunu etkilemez. Aynı şablon ve kayıtlarla tekrar sıfırlama aynı sonucu verir.

Örnek: Pzt–Çar 26 sa 40 dk kayıt, Per 8 sa, Cum planı 7,5 sa → Cum gereken 7 sa 30 dk, haftalık hedef 39 sa 30 dk, beklenen toplam 42 sa 10 dk ve fazla süre 2 sa 40 dk. Bu başlangıçtan:

| Kullanıcı eylemi | Sonuç |
| --- | --- |
| Cuma gereken süreyi 5 saate ayarlamak | Cum 5 sa, Per 8 sa, haftalık hedef 37 sa; fazla süre 2 sa 40 dk olarak kalır |
| Cuma’yı izinli yapmak | Cum 0, Per 8 sa, haftalık hedef 31 sa 30 dk; şablondaki 8 saat düşülür, fazla süre 3 sa 10 dk olur |

Şablon 9 × 5 ve Pzt–Çar toplamı 26 sa 40 dk ise Cuma izni 9 saat düşürür: hedef 36 sa, Per gereken 9 sa 20 dk olur.

Kapasite örneği: hedef 40 sa, Pzt–Çar gerçekleşeni 6 sa, Per/Cum gereken 16’şar sa ve dağıtılamayan borç 2 sa. Perşembe 15 saate ayarlandığında hedef 39 saate iner; otomatik dağıtım Perşembeyi yeniden 16 saate çıkarır ve kalan borç 1 sa olur.

<a id="izin-sonrası-referans-hedefe-tamamlama"></a>

## İzin sonrası referans hedefe tamamlama

`completeWeekPlan`, seçilen dağıtımla beklenen toplamı izin sonrası referans hedefe getirir. Haftalık hedef veya beklenen toplam bu referanstan farklıysa modal Tamamla eylemini gösterir; standart 40 saatlik plandaki fazla süre de bu kapsamdadır. Eylem aşağıdaki iki dağıtımı sunar. Her ikisi ekleme ve azaltmada uygulanır. Hesap otomatik devirdeki uygun günleri ve onların güncel gereken sürelerini kullanır. Kilitli, izinli, kapalı, geçmiş veya belirsiz günler uygunluk kuralıyla korunur.

| Seçenek | Dağıtım |
| --- | --- |
| Günlere eşit dağıt | Tüm uygun günlere pazartesi–cuma sırasıyla 30 dakikalık ekleme veya azaltma turları; son adım kalan saniye kadar |
| Son mesai gününe dağıt | Son uygun günden geriye ekleme veya azaltma; günlük sınıra ulaşıldığında önceki uygun güne geçiş |

Başarılı işlem kalan gereken süreleri çalışma planına, izin sonrası referansı haftalık hedefe kaydeder. Bütün uygun günlerin kapasitesi yetersizse sonuç `null` olur; arayüz işlemi kapasite açıklamasıyla devre dışı gösterir ve mevcut kayıt korunur.

Otomatik devir, mevcut haftalık hedefe göre kendiliğinden hesaplanır. Tamamla ise kullanıcının eylemiyle haftalık hedefi izin sonrası referansa getirir ve dağılımı kaydeder.

| Senaryo | Sonuç |
| --- | --- |
| Pzt–Sal 8’er saat kayıt, Çar 4 sa, Per/Cum 8’er saat gereken; Günlere eşit dağıt | Çar 5 sa 30 dk, Per 9 sa 30 dk, Cum 9 sa, hedef 40 sa |
| Pzt–Çar 25 sa 9 dk 17 sn kayıt, Per/Cum 8’er saat gereken, hedef 41 sa 9 dk 17 sn; Son mesai gününe dağıt | Per 8 sa, Cum 6 sa 50 dk 43 sn, hedef 40 sa |
| Pzt–Per 30 sa 1 dk kayıt, yalnız Cuma açık ve gereken 8 sa, hedef 38 sa 1 dk | Cum 9 sa 59 dk, hedef 40 sa |
| Standart şablonda Cuma izinli, Pzt–Çar 26 sa 40 dk kayıt; Per elle 8 saate çıkarılmış | Tamamla Per’i 5 sa 20 dk’ya indirir, hedef 32 sa; Per ilk girişi 08.00 ise hedef çıkış 13.20 |

## Rapor ve arayüzün kullandığı sonuçlar

[report.ts](../../src/domain/report.ts), `resolveWeekPlan.targets` değerlerini günlük `dailyGoalSeconds` ve `exitGoalSeconds` alanlarına taşır. `workingDay` günlük açık durumunu taşır; kayıt durumu, grafik, tablo ve ilerleme bu alanı kullanır. Kayıtlı plan ve haftalık hedef [use-work-plans](../../src/data/use-work-plans.ts) sahibinden alınır; metrikler haftalık hedefi doğrudan kullanır. Dashboard, gün akışı, tablo ve Pofi aynı gereken süreyi kullanır. Hedef çıkış, ilk giriş + gereken süredir; bu çıkış hesabı için tam hafta raporu ve bugünün güvenilir kayıt durumu gerekir.

Modalın süre etiketleri ve eylem yerleşimi [DESIGN](../../DESIGN.md#gezinme-ve-kontroller) sahibindedir. Seçili haftanın özetindeki toplam `projectedWeeklySeconds` değerini “Beklenen toplam” olarak gösterir; aynı özetteki fark bu toplamı izin sonrası referans hedefle karşılaştırır. Bu gösterim ilk açılıştan itibaren geçerlidir ve kayıtlı haftalık hedefi değiştirmez. Örnek: Pzt–Çar 26 sa 40 dk 11 sn gerçekleşen ve Per/Cum 8'er saat gereken → beklenen toplam 42 sa 40 dk 11 sn. Per 6 sa 30 dk'ya indirilince haftalık hedef 38 sa 30 dk olur; beklenen toplam 41 sa 10 dk 11 sn ve 40 saatlik referansın üzerindeki fark 1 sa 10 dk 11 sn olarak gösterilir. İzin sonrası referans her zaman “Haftalık hedef” olarak aynı özette görünür. Hedef, beklenen toplam ve fark saniye hassasiyetindedir; fark “Hedefe kalan” veya “Hedefi aşan” etiketiyle tek yerde gösterilir. Otomatik azaltma kapalıyken negatif bakiye için ayrıca bilgilendirme kutusu üretilmez. Ana eylem beklenen toplam referansın altındayken “tamamla”, hedefte veya üzerindeyken “ayarla” der. Beklenen toplam ve Tamamla hesabı değişmez. Otomatik azaltma açıkken dağıtılamayan fazla veya her iki ayarda dağıtılamayan eksik süre kapasite uyarısıyla gösterilir. Hafta sonu PDKS kayıtları gerçekleşen/beklenen toplama katılır; plan değerleri sıfır kalır.

Geçmiş kayıtsız veya süresi hesaplanamayan günün gerçekleşeni devir toplamına katılmaz; o günün plan süresi beklenen toplamda kalır. Ara geçişi belirsiz olsa da ilk giriş ve son çıkışı bulunan geçmiş günün süresi devir hesabına katılır. Bugünün kayıtları gün içinde açık/kapalı giriş durumuyla gösterilir; günlük fark ertesi gün kayıt tamamlandığında devre girer. Rapor haftanın yalnız bir bölümünü kapsıyorsa otomatik devir uygulanmaz ve hedef çıkış üretilmez. Bu durumların kayıt etiketleri [kayıt durumu sözleşmesindedir](record-status.md).

Hesaplar, Tamamla dağıtımı ve kalıcılık saniye hassasiyetini korur. Gereken sürenin dakika gösterimi yukarı, gerçekleşen süreninki aşağı yuvarlanır; gösterim kaynak kayıtları değiştirmez. Yuvarlama ve düzenleme sınırı [plan süresi sözleşmesinde](plan-duration.md#güvenli-dakika-gösterimi), görünür ve erişilebilir süre biçimleri [DESIGN](../../DESIGN.md#sayılar-ve-süreler) sahibindedir.

## Kalıcılık ve navigasyon

### Haftalık giriş/çıkış saati

Seçili haftada, açık ve PDKS kaydıyla kilitlenmemiş günün eylem satırında, İzin ve Kilitle düğmelerinin sağında “Planlayıcı” bulunur. Bölüm modal veya gün açıldığında kapalıdır; düğmeye basınca “[saat]’te girersem” veya “[saat]’te çıkmak için” cümlesi içinde saat/dakika alanı ve temizleme kontrolü doğrudan görünür. Sağdaki karşı saat cümleyi “14:30’da çıkarım” veya “10:00’da girmeliyim” biçiminde tamamlar. Saat alanının altında tek bir girersem/çıkmak için seçimi sunulur. Saat seçimi isteğe bağlıdır ve başlangıçta boştur; geçerli saat girilene kadar sonuç ve ok gösterilmez. Kullanıcı kilidi bölümü açmayı, seçimi ve temizlemeyi devre dışı bırakır. Çalışma düzeni sekmesinde, kapalı/izinli günlerde ve tamamlanan günlerin kayıt görünümünde Planlayıcı gösterilmez. Kaydetme etkileşiminin sahibi [PlanTimePlanner](../../src/components/plan-time-planner.tsx), saat alanının sahibi [PlanTimeInput](../../src/components/plan-time-input.tsx), gün ve hafta bağlamının sahibi [PlanEditor](../../src/components/plan-editor.tsx) bileşenidir.

- Saatin ilk rakamı 3–9 ise başına sıfır eklenip dakikaya geçilir: `6`, `3`, `0` sırasıyla `06:––`, `06:3`, `06:30` oluşturur. İlk rakam 0, 1 veya 2 ise ikinci saat rakamı beklenir; `0`, `6`, `3`, `0` da `06:30` olur. İki saat rakamı girilince dakikaya geçilir. Dakikada ilk rakam 6–9 ise `06`–`09` olarak tamamlanır; 0–5 ikinci rakamı bekler. Eksik dakika kendiliğinden `00` yapılmaz ve kaydedilmez.
- Bir bölüme odaklanınca içeriği seçilir; yazmak o bölümü değiştirir. Tab veya sağ ok saatten dakikaya geçirir; `:` aynı geçişi sağlar. Saatten ayrılınca tek rakamın başına sıfır eklenir. Dakikada sol ok veya boş dakika bölümünde Backspace saate döner. Silmek karşı bölümü korur; iki bölümün boşalması boş taslaktır.
- Geçerli saatte ↑ / ↓ odaktaki saat bölümünü bir saat, dakika bölümünü bir dakika artırır/azaltır; aynı bölüm seçili kalır. Dakika sınırı saati de değiştirir (`06:59` → `07:00`); gece yarısında `23:59` ↔ `00:00` döngüsü olur. Boş veya eksik saat değişmez. Önizleme güncellenir; kayıt yine Enter veya gruptan odak çıkışıyla yapılır.
- Saat alanına `H:mm`, `HH:mm` veya dört rakam yapıştırılabilir; `9:00`, `09:00` ve `0900` aynı saattir. Tam saat yapıştırmak iki bölümü birlikte değiştirir; bir veya iki rakam yapıştırmak seçili bölümü değiştirir. Fazla hane, harf ve sınır dışı saat/dakika engellenir; geçersiz yapıştırma kesilmez, mevcut taslak korunur. `12983`, `24:00` ve `12:60` reddedilir. Geçerli aralık `00:00`–`23:59` olur; ayrıştırma [plan süresi sahibindedir](plan-duration.md#planlanan-saat-hesabı).
- Yazarken geçerli taslaktan karşı saat önizlenir; kayıt henüz değiştirilmez. Enter veya odağın düzenleme grubundan ayrılması değişen geçerli taslağı kaydeder ve alan `HH:mm` biçimine dönüşür. Saat türü seçimi ve temizleme kontrolü arasındaki odak geçişi kayıt oluşturmaz. Düzenleme kontrolleri kayıt sonrasında görünür kalır; dışarıda tıklanan kontrolün yeri değişmez. Değişmemiş seçim yeniden yazılmaz.
- Geçersiz taslak kaydedilmez; alan, taslak ve hata mesajı düzenleme için korunur. Boş taslakta Enter, gruptan odak çıkışı veya temizleme düğmesine basmak yalnız o günün saat seçimini `null` olarak kaydeder; çalışma süresi korunur.
- Kaydedilmemiş değişiklik veya hata varken Escape taslağı son başarılı seçime döndürür ve saat bölümünü seçer. Değişiklik yokken Escape Planlayıcı bölümünü kapatıp odağı açan düğmeye döndürür.
- Başka pencerede saat değiştiğinde düzenlenmemiş alan güncellenir; açık taslak korunur. Escape güncel kayda döner.

- Giriş 09:00 + gereken 8 saat → çıkış 17:00. Çıkış 18:00 + gereken 8 saat → giriş 10:00.
- [plan-duration.ts](../../src/domain/rules/plan-duration.ts) içindeki `planClockTimes`, karşı saati görünür gereken dakikadan hesaplar. Gereken 6 sa 50 dk 43 sn, 6 sa 51 dk olarak kullanılır; 09:00 girişi 15:51 çıkışı verir.
- Süre, devir veya Tamamla değiştiğinde seçilen saat sabit kalır, karşı saat yeniden hesaplanır. Saat türünü değiştirmek girilen saati korur ve o saati yeni giriş/çıkış sınırı olarak yorumlar.
- Perşembe günü giriş 20:00 ve süre 8 saat → “04:00’te Cuma çıkarım”. Çıkış 06:30 ve süre 8 saat → “22:30’da Çarşamba girmeliyim”. Gün değiştiğinde sonuç cümlesi ilgili günün tam adını gösterir; aynı günse gün adı tekrarlanmaz. Seçilen saat ilgili güne aittir.
- İzinle kapanan günün seçimi saklanır ve yeniden açıldığında Planlayıcı içinde görünür. Planı sıfırla, tamamlanmamış günlerin saatlerini de kaldırır; tamamlanmış günlerin ve diğer haftaların seçimlerini korur. Sıfırlama başarılıysa Planlayıcı bölümü kapanır.
- Bu saatler kişisel planlama içindir. PDKS kayıtları, rapordaki gerçek giriş/çıkışlar ve bildirimlerin kayda dayanan hedef çıkışı mevcut sahiplerinden hesaplanmaya devam eder.

Saklanan `WorkPlans` durumu `{ defaultPlan, weekOverrides, weekTargets?, weekLeaves?, weekZeroOpenDays?, weekLockedDays?, weekTimes? }` biçimindedir:

- `defaultPlan`: güncel şablon.
- `weekOverrides`: pazartesi tarihiyle (`YYYY-MM-DD`) anahtarlanan hafta planları. Yedi değerin tamamı şablonla eşleştiğinde ve manuel kilit kalmadığında özel kayıt kaldırılır. Manuel kilit varsa kilitlenen süreyi koruyan plan kaydı tutulur.
- `weekTargets`: izin karşılıkları düşülmeden önceki haftalık hedef, saniye cinsinden. Okunan net hedef `max(0, saklanan hedef − güncel izin karşılıkları)` olur. İzinli haftada bu kayıt tutulur; izinsiz haftada günlük toplamla eşleşen hedef girdisi kaldırılır. Kayıt yoksa hedef, izinler uygulanmış günlük plan toplamıdır.
- `weekLeaves`: pazartesi tarihiyle anahtarlanan, tekil 0–4 gün indeksleri. Okunan haftalık planda bu günler sıfırlanır. Boş liste kaldırılır. Güncel şablon izin karşılığının tek kaynağıdır.
- `weekZeroOpenDays`: sıfır plan süresine rağmen açık kalan günlerin tekil 0–4 indeksleri. Önceki açık gün kullanıcı düzenlemesinde veya Tamamla sonucunda sıfırla kaydedilirse işaretlenir. İzin verme işareti kaldırır; pozitif plan değeri açık durumu zaten taşır. Sıfırla tamamlanmamış işaretleri kaldırıp şablonu uygular; tamamlanan günün işareti korunur. Boş ve pozitif plan için gereksiz işaretler temizlenir; izinle çelişen işaretler reddedilir.
- `weekLockedDays`: kullanıcı tarafından kilitlenen tekil 0–4 gün indeksleri. İzinli günle çakışmaz. Günün kilit anındaki gereken süresi `weekOverrides` içinde tutulur; kilit kaldırılınca bu süre plan olarak kalır. Sıfırla, seçili haftanın kilit listesini kaldırır.
- `weekTimes`: pazartesi tarihiyle anahtarlanan, gün indeksine (0–4) göre `{ anchor: "entry" | "exit", minute: 0–1439 }` seçimleri. Yalnız seçilen sınır saklanır; karşı saat gereken süreden türetilir. Boş gün/hafta kayıtları temizlenir; alanın bulunmadığı mevcut v1 kayıtları normal okunur. Şablon ve süre değişikliği saat seçimini korur; seçim başka güne veya haftaya taşınmaz.

[plan-storage](../../src/lib/plan-storage.js) bütün ortamlarda plan şemasını doğrular. [use-work-plans](../../src/data/use-work-plans.ts) yükleme ve başarılı yazı sonrası ekran durumunu yönetir.

**Electron canlı oturumu:** Yerel sunucu, planı doğrulanmış oturumun [ortak hesap anahtarıyla](account-identity.md) seçer.

[work-plan-storage](../../src/server/work-plan-storage.js), Electron profilindeki `work-plans/` dizininde hesap anahtarıyla adlandırılmış bir JSON dosyası kullanır. Yeni hesap 40 saatlik şablonla başlar ve dosya ilk başarılı yazıda oluşur. Aynı hesap, aynı cihazda tekrar açıldığında son planı görür.

[work-plans route'u](../../src/app/api/work-plans/route.js), okuma ve yazma yanıtlarında oturum bağlayıcısı ile içerik revizyonunu döndürür; yazıda ikisini doğrular. Aynı hesaba eşzamanlı yazılarda eski revizyon reddedilir ve [desktop-work-plans](../../src/data/desktop-work-plans.ts) güncel planı yeniden okur. Ana pencere ve Mini değişikliği `BroadcastChannel` ile bildirip sunucudan yeniden okur. Rapor hedefi ve bildirimler, doğrulanmış güncel planı kullanır.

Okuma veya doğrulama hatası görünür ve düzenleme durur; ana pencerede ve Mini'de yeniden deneme planı tekrar okur. Yazma hatasında son başarılı plan korunur. Sunucu dosyayı geçici kaydı yeniden adlandırarak yazar; fsync uygulanmaz.

Oturum son dosya değişiminden önce doğrulanır. Değişim başlamışsa çıkış tamamlanmasını bekler; çıkış başlamışsa yeni değişim reddedilir. Oturum süresi değişim başladıktan sonra dolarsa kabul edilen değişim tamamlanır.

**Web, demo ve paketli senaryo:** [work-plans](../../src/data/work-plans.ts) tarayıcı depolamasını ve pencereler arası storage olaylarını kullanır. Web canlı planı `pofis:work-plans:v1`, demo `demo:pofis:work-plans:v1` anahtarındadır; aynı tarayıcı profilindeki web hesapları canlı planı paylaşır. Paketli senaryo ayrı profilindeki canlı anahtarı kullanır. Kayıt yoksa varsayılan plan açılır. Geçersiz kayıt görünür hata üretir ve düzenlemeyi durdurur; yazı hatasında son başarılı kayıt korunur. Storage temizleme olayı varsayılan plana döner; demo ve canlı anahtarları birbirini güncellemez.

Yan menüdeki Mesai planı, ekranda seçili haftanın planını açar. Güncel haftanın cetvelinde bugün veya gelecek gün seçildiğinde plan o günle açılır. Modalın haftalık sekmesi, kaynak raporu ve okuma/kaydetme işlemleri aynı pazartesi tarihini kullanır. Modalı kapatmak ve Çalışma düzeni sekmesine geçmek seçili haftayı korur. Çalışma düzeni genel şablonu düzenler; haftalık düzenlemeler seçili haftaya kaydedilir. Mesaim menü eylemi güncel haftaya döner. Düzenleme için kaynak rapor ve yerel planın yüklenmesi gerekir. Hataların gösterimi [hata sözleşmesindedir](../pdks-errors.md#uygulama-içi-hata-ve-yerel-bildirimler).

## Doğrulama

Bu belgedeki senaryoların test dosyaları ve kabul yöntemi [doğrulama rehberindedir](../verification.md#plan-doğrulaması).
