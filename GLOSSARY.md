# Pofis

Kişisel PDKS mesaisini takip ederken kullanılan ortak terimler.

## Language

**Kayıtlı süre**:
Turnike hareketlerinden türetilen günlük ilk giriş ile son çıkış arasındaki süre.
_Avoid_: İçeride kalınan süre, geçiş çiftleri toplamı

**Canlı toplam**:
Güncel ve güvenilir açık giriş bulunduğunda, ilk girişten şimdiki ana kadar uzanan toplam süre.
_Avoid_: Son girişten geçen süre

**Ek tahmin**:
Canlı toplamın kayıtlı süreyi aşan bölümü; süre çubuğunun açık tonlu parçası.
_Avoid_: Canlı toplam, mola süresi

**Planlanan günlük hedef**:
Varsayılan veya özel hafta planında kullanıcının belirlediği süre; tamamlanan günün değeri korunur. Tamamla, kalan günleri güncel gereken süreleriyle yeniden planlayabilir. PDKS kayıtları varsayılan şablonu değiştirmez.
_Avoid_: Etkin hedef, eşit pay

**Etkin günlük hedef**:
Güncel gereken süre: özgün planın tamamlanmış geçmiş kayıtların farkıyla dengelenmiş sonucu. Son uygun günden geriye dağıtılır; her gün 0–16 saat sınırındadır.
_Avoid_: Saklanan plan

**Devir**:
Aynı haftanın geçerli tamamlanmış kayıtlarının kendi özgün günlük planlarına göre net farkı. Kayıtsız/belirsiz günler borç sayılmaz.
_Avoid_: Otomatik plan değişikliği

**Haftalık hedef**:
İlk günlük plandan veya Tamamla eyleminden gelen toplam. Günlerin tamamlanmasıyla değişmez; Tamamla sonrasında kalan gerçek çalışma planından ayrı saklanır.

**Gerçekleşen toplam**:
PDKS günlük kayıt sürelerinin toplamı. Canlı ek tahmin dahilse ayrıca belirtilir.

**Beklenen toplam**:
Tamamlanan günlerin gerçekleşen süreleri ile tamamlanmamış günlerin güncel gereken sürelerinin toplamı.

**Çıkış hedefi**:
İlk girişe etkin günlük hedefin eklenmesiyle bulunan çıkış saati. Bugünkü kayıt belirsizse hesaplanmaz.
_Avoid_: Planlanan günlük hedef

**Açık giriş**:
Ardından güvenilir bir çıkış bulunmayan son turnike girişi.
_Avoid_: Kesin içeride olma bilgisi

**Belirsiz kayıt**:
Tutarlı bir giriş/çıkış yorumu yapılamayan hareket bilgisi veya türetilmiş günlük kayıt.
_Avoid_: Devamsızlık, sıfır çalışma

**Kayıt durumu**:
Günlük geçiş bütünlüğü, raporun İstanbul tarihi, açık giriş ve çalışma planı bağlamından seçilen durum. Hedefin altında veya üzerinde kalmak ayrı bir süre karşılaştırmasıdır.
_Avoid_: Hedef durumu, mesai onayı

**Eski rapor**:
Kaynak yenilemesi başarısız olduğu için güncelliği doğrulanamayan son rapor.
_Avoid_: Güncel rapor, oturumu bitmiş rapor

**Seçili çalışma günü**:
Kullanıcının mesai planına dahil ettiği hafta günü.
_Avoid_: Not defteri günü

**Pofi notu**:
Mesai kaydından bağımsız, belirli bir tarih ve kişi anahtarı için seçilen günlük metni.
_Avoid_: PDKS kaydı

**Not teması**:
Giriş, gelişme ve kapanış metin parçalarını bir araya getiren içerik ailesi.
_Avoid_: Arayüz renk teması

**Not yayını**:
Bir pazartesiden itibaren geçerli normal not kimlikleri, seçim adımları ve özel günlerin tarihli listesi. Metin kopyası tutmaz; geçmişi korumak için yayımlanmış içerik kimlikleri ve metinleri korunur.
_Avoid_: Deploy, sürüm yayını
