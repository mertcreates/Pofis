# Günlük kayıt durumu

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[record-status.ts](../../src/domain/rules/record-status.ts): `dailyRecordStatus`, `DayState`.

Girdiler günlük ilk giriş/son çıkış özeti, geçiş analizi, raporun İstanbul tarihi, çalışma planına dahil olma ve süre sahibinin canlı sonuç üretip üretmediğidir. Etiketler [labels.ts](../../src/components/attendance/labels.ts) üzerinden [metin sözlüğünden](../../src/lib/ui-text.js) alınır; görünüm ikinci bir tarih veya kayıt kararı vermez.

## Öncelikli karar tablosu

İlk eşleşen satır uygulanır.

| Koşul | Durum | Gösterim |
| --- | --- | --- |
| Tarih raporun bugün değerinden ileride | `future` | Gelecek gün |
| Günlük özet veya geçiş eşleşmesi belirsiz | `uncertain` | Kayıtlarda belirsizlik var |
| Hareket yok, plan dışı | `non-working` | Çalışma günü değil |
| Hareket yok, bugün ve planlı | `awaiting-entry` | Giriş bekleniyor |
| Hareket yok, geçmiş ve planlı | `missing` | Kayıt bulunamadı |
| Açık giriş var, geçmiş tarih | `uncertain` | Kayıtlarda belirsizlik var |
| Açık giriş var, bugün ve güvenilir canlı süre üretiliyor | `ongoing` | Mesai devam ediyor |
| Açık giriş var, bugün ve canlı süre üretilemiyor | `open` | Son hareket giriş kaydı |
| Giriş/çıkış kaydı tutarlı, bugün | `outside` | Son hareket çıkış kaydı |
| Giriş/çıkış kaydı tutarlı, geçmiş | `recorded` | Giriş–çıkış kaydı var |

Tekrarlanan yön, eşleşmeyen çıkış ve geçmiş güne açık giriş kalması geçiş sahibinin belirsizlik sonucunu kullanır. İlk giriş ve son çıkış bulunması ara geçişlerdeki belirsizliği gidermez. Plan dışı günlerde de mevcut kayıt değerlendirilir; tabloda plan dışı olduğu ayrıca belirtilir. Gelecek gün, plan durumundan önce gelir.

Hedefin altında, hedefte veya üzerinde olmak kayıt bütünlüğünü değiştirmez. Örneğin 08:00–12:00 tutarlı geçmiş kayıt, dört saat süreyle `recorded` olur; hedef farkında dört saat eksik görünür. Eksik süre ile eksik geçiş ayrı bilgilerdir. Boş geçmiş gün devamsızlık, izin veya sıfır çalışma diye yorumlanmaz.

Kullanıcının [haftalık planda izinli işaretlediği](work-plan.md#izinli-gün) günün planı sıfırdır; çalışma günü seçimi kapalı gün kurallarını kullanır. Gerçek geçiş oluşursa aynı kayıt bütünlüğü kuralları uygulanır.

Plan sahibinin sıfır süreli açık gün olarak işaretlediği gün, `workingDay` alanında açık olarak aktarılır ve çalışma günü kayıt durumlarını kullanır.

Eski rapor canlı süre üretmez. Son açık giriş bilgisi korunur, `open` gösterilir ve mevcut rapor tazeliği uyarısı geçerli olur. Saat son girişe yetişmemişse de aynı tarafsız kayıt etiketi kullanılır. Yeni kaynak yanıtı veya İstanbul gününün değişmesi kayıt durumunu yeniden değerlendirir.

## Bağlı sonuçlar

- [Rapor uyarlaması](../../src/domain/report.ts) durumu bir kez hazırlanan geçiş analizi ve süre sonucundan üretir. Belirsiz kayıt `state: "uncertain"` sonucuyla aktarılır.
- `recorded` gün haftalık plan düzenlemesinde kayıtlı süresiyle kilitlenir. Bugünün `outside` durumu tekrar giriş olabileceğinden kilit oluşturmaz; hedef farkı ve devir [plan sözleşmesinden](work-plan.md) gelir.
- Belirsiz gün [plan sahibine](work-plan.md) `uncertain` olarak aktarılır. Geçmişteyse devre katılmaz; bugünün kendi kaydı belirsizse bugünkü çıkış hedefi engellenir. Kayıtsız geçmiş gün de son güne borç eklemez.
- [Haftalık toplam](week.md), `uncertain` veya `missing` günlerde mevcut kayıtların toplamı olarak sunulur. Bilinen ilk giriş–son çıkış süresi korunur; belirsiz günün tabloda hedef farkı gösterilmez.
- [Gün akışı](../../src/components/attendance/day-flow.tsx) ve [giriş–çıkış raporu](../../src/components/attendance/report-table.tsx) aynı durum etiketini tüketir.
- [Pofi](pofi.md) karakter davranışını kendi sahibinde seçer; aynı geçiş belirsizliği girdisini kullanır.

## Testler

[Karar senaryoları](../../src/domain/rules/record-status.test.ts) · [Rapor testleri](../../src/domain/report.test.ts).
