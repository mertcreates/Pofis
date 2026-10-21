# Günlük kayıt durumu

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[record-status.ts](../../src/domain/rules/record-status.ts): `dailyRecordStatus`, `DayState`.

Girdiler günlük ilk giriş/son çıkış özeti, geçiş analizi, raporun İstanbul tarihi, çalışma planına dahil olma ve süre sahibinin canlı sonuç üretip üretmediğidir. Etiketler [labels.ts](../../src/components/attendance/labels.ts) üzerinden [metin sözlüğünden](../../src/lib/ui-text.js) alınır; görünüm bu sahibin kararını sunar.

## Öncelikli karar tablosu

İlk eşleşen satır uygulanır.

| Koşul | Durum | Gösterim |
| --- | --- | --- |
| Tarih raporun bugün değerinden ileride | `future` | Gelecek gün |
| Günlük özet belirsiz değil, bugün ve güvenilir açık giriş var | Canlı süre varsa `ongoing`, yoksa `open` | Mesai devam ediyor / Son hareket: giriş; önceki kayıt sorunları ayrıca korunur |
| Günlük özet veya geçiş eşleşmesi belirsiz | `uncertain` | Kayıt sorununun nedeni ve ilgili saat |
| Hareket yok, plan dışı | `non-working` | Planlı mesai yok |
| Hareket yok, bugün ve planlı | `awaiting-entry` | Henüz giriş kaydı yok |
| Hareket yok, geçmiş ve planlı | `missing` | Kayıt bulunamadı |
| Açık giriş var, geçmiş tarih | `uncertain` | Giriş saatinden sonra çıkış kaydı yok |
| Açık giriş var, bugün ve güvenilir canlı süre üretiliyor | `ongoing` | Mesai devam ediyor |
| Açık giriş var, bugün ve canlı süre üretilemiyor | `open` | Son hareket: giriş |
| Giriş/çıkış kaydı tutarlı, bugün | `outside` | Son hareket: çıkış |
| Giriş/çıkış kaydı tutarlı, geçmiş | `recorded` | Giriş–çıkış kaydı var |

[Geçiş analizi](passages.md) kayıt sorunlarını belirler. Çift giriş veya çıkış uyarısı, hesaplanabilen günlük durumu `uncertain` yapmaz; uyarı nedeni ve saati raporda kalır. Gerçek eşleşmeyen çıkış ve okunamayan hareket belirsizliği korunur. Plan dışı günlerde de kayıtlar değerlendirilir; plan dışı bilgisi ayrıca gösterilir.

Bugünkü güvenilir açık giriş, önceki ve son yön tekrarlarından bağımsız değerlendirilir. Örneğin 12:48:51/12:48:54 giriş ve 12:57:14/12:57:27 çıkış tekrarlarından sonra 13:24:46 girişi, güncel rapor ve uygun saatte `ongoing` olur. `recordIssues` ve durum metnindeki tekrar uyarıları korunur. Rapor eskiyse veya saat son girişten önceyse `open` olur. Gün geçmişe geçtiğinde çıkışsız son giriş `uncertain` olur; kapanmış tekrarlar `recorded` durumunu korur.

Hedefin altında, hedefte veya üzerinde olmak kayıt bütünlüğünü değiştirmez. Örneğin 08:00–12:00 tutarlı geçmiş kayıt, dört saat süreyle `recorded` olur; hedef farkında dört saat eksik görünür. Eksik süre ile eksik geçiş ayrı bilgilerdir. Boş geçmiş günün kayıt durumu plan kapsamına göre `missing` veya `non-working` olur.

Kullanıcının [haftalık planda izinli işaretlediği](work-plan.md#izinli-gün) günün planı sıfırdır; çalışma günü seçimi kapalı gün kurallarını kullanır. Gerçek geçiş oluşursa aynı kayıt bütünlüğü kuralları uygulanır.

Plan sahibinin sıfır süreli açık gün olarak işaretlediği gün, `workingDay` alanında açık olarak aktarılır ve çalışma günü kayıt durumlarını kullanır.

Eski raporda kayıtlı süre esas alınır. Son açık giriş bilgisi korunur, `open` gösterilir ve mevcut rapor tazeliği uyarısı geçerli olur. Saat son girişe yetişmemişse de aynı tarafsız kayıt etiketi kullanılır. Yeni kaynak yanıtı veya İstanbul gününün değişmesi kayıt durumunu yeniden değerlendirir.

## Bağlı sonuçlar

Rapor modeli `recordIssues` ile [geçiş sahibinin nedenlerini](passages.md#kayıt-sorunları) taşır. Gün akışı ve rapor neden ile saati gösterir. Her sorun türünün ilk örneği sunulur; ham hareketlerin tamamı ayrıntıda korunur. Geçiş nedeni bulunmayan tutarsız özette “Giriş ve çıkış saatlerinden süre hesaplanamıyor.” kullanılır.

- [Rapor uyarlaması](../../src/domain/report.ts) durumu bir kez hazırlanan geçiş analizi ve süre sonucundan üretir. Belirsiz kayıt `state: "uncertain"` sonucuyla aktarılır.
- Turnike hareketi bulunan geçmiş gün, `recorded` veya `uncertain` durumundan bağımsız olarak haftalık plan düzenlemesinde kilitlenir. İlk giriş–son çıkış süresi varsa [plan sahibi](work-plan.md) bu süreyi devir ve toplamda kullanır. Süre yoksa gerçekleşen bilinmez ve günün planı korunur. Bugünün `outside` durumunda tekrar giriş olasılığı için plan düzenlemesi açık kalır.
- Belirsiz gün [plan sahibine](work-plan.md) `uncertain` olarak aktarılır. Bugünün durumu `uncertain` ise bugünkü çıkış hedefi engellenir. Önceki yön tekrarlarından sonra güvenilir açık girişle `open`/`ongoing` olan bugün, plan hesabında açık kalır. Kayıtsız geçmiş günün plan süresi beklenen toplamda korunur.
- [Haftalık toplam](week.md) bilinen ilk giriş–son çıkış sürelerini korur. Belirsiz günün günlük hedef farkı gösterilmez; haftalık farkın sunumu [DESIGN](../../DESIGN.md#haftalık-toplam-ve-grafik) belgesindedir.
- [Gün akışı](../../src/components/attendance/day-flow.tsx) ve [giriş–çıkış raporu](../../src/components/attendance/report-table.tsx) aynı durum etiketini tüketir.
- [Pofi](pofi.md) karakter davranışını kendi sahibinde seçer; aynı geçiş belirsizliği girdisini kullanır.

## Testler

[Karar senaryoları](../../src/domain/rules/record-status.test.ts) · [Rapor testleri](../../src/domain/report.test.ts).
