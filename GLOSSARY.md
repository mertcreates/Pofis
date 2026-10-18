# Pofis

Kişisel PDKS mesaisini takip ederken kullanılan ortak terimler.

## Language

**Kayıtlı süre**:
Turnike hareketlerinden türetilen günlük ilk giriş ile son çıkış arasındaki süre.
_Avoid_: İçeride kalınan süre, geçiş çiftleri toplamı

**Canlı toplam**:
Güncel ve güvenilir açık giriş bulunduğunda, ilk girişten şimdiki ana kadar uzanan toplam süre.
_Avoid_: Son girişten geçen süre

**Anlık tahmin**:
Canlı toplamın kayıtlı süreyi aşan bölümü; süre çubuğunun açık tonlu parçası.
_Avoid_: Canlı toplam, mola süresi

**Planlanan günlük hedef**:
Varsayılan veya özel hafta planında belirlenen günlük çalışma süresi.

**Etkin günlük hedef**:
Güncel gereken çalışma süresi; haftalık hedef ve tamamlanan günlerin kayıtlarıyla dengelenmiş günlük hedef.

**Devir**:
Tamamlanan günlerin gerçekleşen süreleri ile kayıtlı günlük planları arasındaki net farkın kalan uygun günlere aktarılması.

**Haftalık hedef**:
Hafta için belirlenen, izin karşılıkları düşülmüş toplam çalışma süresi.

**İzinli gün**:
Kullanıcının haftalık planda izin olarak kapattığı gün. Haftalık hedeften o günün güncel varsayılan şablondaki süresi düşülür.

**İzin sonrası referans hedef**:
Varsayılan şablonun toplamından izinli günlerin şablon süreleri çıkarıldıktan sonra kalan hedef. Tamamla eylemi bu toplamı kullanır.

**Gerçekleşen toplam**:
PDKS günlük kayıt sürelerinin toplamı. Ekrandaki haftalık toplam buna canlı ek tahmini de bir kez ekler; ayrım süre çubuğu ve ayrıntılarda gösterilir.

**Beklenen toplam**:
Tamamlanan günlerin gerçekleşen süreleri ile tamamlanmamış günlerin güncel gereken sürelerinin toplamı.

**Çıkış hedefi**:
İlk girişe etkin günlük hedefin eklenmesiyle bulunan çıkış saati.

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

**Açık çalışma günü**:
Mesai planına dahil olan hafta günü. Gereken süresi sıfır olsa da çalışma planında açıktır.

**Kapalı gün**:
Çalışma planına dahil olmayan gün. Haftalık izinli gün ve varsayılan şablonda kapalı gün bu kapsamdadır.

**Seçili gün**:
Plan düzenleyicisinde ayrıntıları ve süre kontrolleri gösterilen gün.

**Pofi notu**:
Mesai kaydından bağımsız, belirli bir tarih ve kişi anahtarı için seçilen günlük metni.
_Avoid_: PDKS kaydı

**Not teması**:
Giriş, gelişme ve kapanış metin parçalarını bir araya getiren içerik ailesi.
_Avoid_: Arayüz renk teması

**Not havuzu**:
Tüm tarihlerde günlük seçim için kullanılan güncel normal Pofi notlarının bütünü.
_Avoid_: Tarihli not yayını, arşiv havuzu
