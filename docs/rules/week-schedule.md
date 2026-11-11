# Haftalık saat denemesi

[Kural haritası](README.md) · [Mesai planı](work-plan.md) · [Planlama kabulü](../verification.md#planlama-etkileşim-kabulü)

## Başlangıç seçimi

- **Bu hafta**, Mesaim’de açık olan rapor haftasından başlar. Kayıtlı saatler, izinler, kilitler ve haftanın mevcut net hedefi başlangıç değerleridir. Taslak, Bu hafta / Yeni hafta arasında geçişte korunur. Planlama sekmesinden çıkınca, modal kapanınca veya rapor haftası değişince silinir.
- **Yeni hafta**, ilk kullanımda çalışma düzeninden başlayan tarihsiz bir taslaktır. Hedef başlangıç şablonunun toplamıdır ve şablondaki kapalı günler korunur. Taslak yalnız çalışma düzenini devralır. Saat, izin ve seçilen dağıtım sekme ya da hafta değiştiğinde, modal veya uygulama yeniden açıldığında korunur. Mevcut taslak başlangıç şablonunu korur. **Hesabı sıfırla** güncel çalışma düzeninden boş bir taslak başlatır ve sonucu saklar.

## Saat ve izin düzenleme

- Bir saat belirlenince karşı saat günün mevcut gereken süresinden hesaplanır. İki saat belirlenince günlük süre aralarındaki fark olur. Haftalık planda kaydedilmiş giriş veya çıkış da kullanıcının belirlediği saat sayılır. Kayıtlı saatin kendisini değiştirmek karşı saati yeniden hesaplar. Karşı alanı değiştirmek iki saati sabitler.
- Bugünün kayıtlı girişi düzenlemeye kapalıdır. Hesap, girişin saniyesini korur. Çıkışı elle belirlemek günlük süreyi sabitler. Çıkışı temizlemek gereken süreden hesaplanan saate döner.
- Saat ve dakika bölümlerinin ikisi de boşaltıldığında o alanın manuel kısıtı kalkar. **×** düğmesi aynı işlemi tek adımda yapar ve odağı saat alanına döndürür. Düğme, düzenlenebilir ve kullanıcı tarafından belirlenmiş saatte etkindir. Kalan bir saat varsa karşı saat mevcut günlük süreden hesaplanır. Hiçbir saat kalmazsa iki alan da boş görünür. Tek bölümün boş kalması tamamlanmamış giriş sayılır.
- `14:0` gibi tamamlanmamış bir değer yazılırken uyarı bekler. Alan grubundan çıkıldığında veya Enter ile “Saati tamamla” görünür. 16 saat sınırı yalnız tamamlanmış, geçerli saat çiftine uygulanır. Eksik veya geçersiz düzenlenebilir saat varken kesin haftalık toplam ve dağıtım seçeneği gizlenir. Eksik hafta ya da geçmiş veya bugünkü belirsiz kayıt varsa saat düzenleme de kapanır. Gece yarısı aşıldığında detayda önceki veya ertesi gün bilgisi görünür.
- İzin, o günün şablon karşılığını hedeften düşürür. İzinli günde saat alanları gizlenir. İzin kaldırıldığında saat taslağı geri gelir. Tamamlanmış kayıtlar ve kullanıcı kilitleri izin değişikliğine kapalıdır. İzin işlemi taslak içinde kalır.
- Gün kartı sürenin altında detayla aynı giriş ve çıkış saatlerini gösterir. Geçmiş günlerde bilinen kayıt saati gösterilir ve eksik kayıt saati boş işaretle belirtilir. İzinli, kapalı veya gösterilebilir saati olmayan günlerde saat satırı gizlenir. Seçili günün detayında **Giriş saati** ve **Çıkış saati** etiketleri kullanılır. Kayıtlı saatler salt okunur görünür.
- Günün sıfırlama ikonu saatler, izin durumu veya süre başlangıçtan farklıysa görünür. Yalnız ilgili günü etkiler. Başlangıçla aynı hale gelen saat taslağı, alan grubundan çıkıldığında kaldırılır.

## Hedef ve dağıtım

Üst özet taslağın haftalık hedefini, beklenen toplamını ve aradaki farkı gösterir. Saat ve izin değişiklikleri diğer günlerin süresini kendiliğinden değiştirmez. **Saate tamamla / ayarla** eylemi [izin sonrası referans hedefi](work-plan.md#izin-sonrası-referans-hedefe-tamamlama) kullanır. Bu hedef şablon toplamından izin karşılıkları çıkarılarak hesaplanır. Taslağın haftalık hedefiyle farklı olabilir. Başarılı tamamlama taslak hedefini referansa getirir.

| Günün durumu | Dağıtım |
| --- | --- |
| Yalnız giriş veya çıkış belirlenmiş | Gün uygunsa süre değişebilir. Belirlenen saat kalır, karşı saat yeniden hesaplanır. |
| İki saat belirlenmiş | Günün süresi ve iki saat korunur. |
| Bugün kayıtlı giriş, çıkış hesaplanıyor | Gün uygunsa süre değişebilir. Giriş kalır ve çıkış yeniden hesaplanır. |
| Bugün kayıtlı giriş, çıkış elle belirlenmiş | Günün süresi ve iki saat korunur. |
| Geçmiş, izinli, kapalı, belirsiz veya kullanıcı kilitli | Gün dağıtıma katılmaz. |

**Günlere eşit dağıt**, uygun günlere haftanın başından başlayarak en fazla 30 dakikalık adımlarla fark ekler veya düşer. Son adım kalan fark ya da günlük kapasite kadar olabilir. **Son mesai gününe dağıt**, son uygun günden başlar ve sınırda önceki uygun güne geçer. Günlük sınır 0–16 saattir. Toplam kapasite yetmezse dağıtım uygulanmaz ve fark görünür kalır. Sonraki düzenlemelerde yeni fark üst özette kalır. Dağıtım tekrar seçilerek uygulanır.

Örnek: 40 saat hedefli haftada Pzt–Sal toplam 16 saat gerçekleşmiş, Çar 7 saate sabitlenmiş, Per ve Cum 8’er saat ise beklenen toplam 39 saattir. Eşit dağıtım Per ve Cum’u 8 sa 30 dk’ya getirir. Son güne dağıtım Per’i 8 saatte tutup Cum’u 9 saate getirir. Eksik 45 dakika ve iki uygun gün varsa eşit dağıtım ilk güne 30, sonraki güne 15 dakika ekler.

## Sahiplik ve saklama

[WeekSchedulePreview](../../src/components/week-schedule-preview.tsx) canlı ve demo arayüzünü ortak kullanır. [previewWeekSchedule](../../src/domain/rules/week-schedule.ts) sabitlenen günlük süreleri başlangıç haftasına uygular. İzin değişikliği `editRequiredMinutes`, isteğe bağlı dağıtım `completeWeekPlan` ile hesaplanır. İki işlem de [mesai planı kuralının](work-plan.md) sahipliğindedir.

**Yeni hafta**, başlangıç şablonu, saat taslakları, izinler ve dağıtım sonucunu `independentWeek` alanında saklar. [Mesai planı deposu](work-plan.md#kalıcılık-ve-navigasyon) masaüstünde hesap ve revizyon denetimini, webde tarayıcı profilini, demoda ayrı demo alanını kullanır.

Masaüstünde kayıt sürerken yapılan düzenlemelerden sonuncusu sırada bekler. Yazma sırasında hata oluşursa sıradaki düzenleme güncel revizyon okunduktan sonra gönderilir. Kaydedilemeyen taslak açık oturumda bellekte kalır. Sonraki düzenleme kaydı yeniden başlatır.
