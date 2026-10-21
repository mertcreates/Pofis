# Pofis

Kişisel PDKS mesaisini takip ederken kullanılan ortak terimler.

## Language

**Kayıtlı süre**:
Turnike hareketlerinden türetilen günlük ilk giriş ile son çıkış arasındaki süre.
_Gösterim_: Kayıtlı süre

**Canlı toplam**:
Güncel ve güvenilir açık giriş bulunduğunda, ilk girişten şimdiki ana kadar uzanan toplam süre.
_Gösterim_: Canlı toplam

**Anlık tahmin**:
Canlı toplamın kayıtlı süreyi aşan bölümü; süre çubuğunun açık tonlu parçası.
_Gösterim_: Anlık tahmin; günün akışında Tahmini

**Planlanan günlük hedef**:
Varsayılan veya özel hafta planında belirlenen günlük çalışma süresi.

**Etkin günlük hedef**:
Güncel gereken çalışma süresi; haftalık hedef ve tamamlanan günlerin kayıtlarıyla dengelenmiş günlük hedef.

**Devir**:
Tamamlanan günlerin gerçekleşen süreleri ile kayıtlı günlük planları arasındaki net farkın plan politikasına göre değerlendirilmesi. Eksik süre kalan uygun günlere aktarılır; güncel politikada fazla süre ayrı gösterilir ve kalan günlük planlar korunur. Otomatik azaltma `WORK_PLAN_POLICY.autoReduceSurplus` ile açılabilir.

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
_Kapsam_: Son hareketin giriş olması ve kayıt güvenilirliği

**Belirsiz kayıt**:
Tutarlı bir giriş/çıkış yorumu yapılamayan hareket bilgisi veya türetilmiş günlük kayıt.
_Gösterim_: Kayıt bütünlüğüne ait belirsizlik

**Kayıt durumu**:
Günlük geçiş bütünlüğü, raporun İstanbul tarihi, açık giriş ve çalışma planı bağlamından seçilen durum. Hedefin altında veya üzerinde kalmak ayrı bir süre karşılaştırmasıdır.
_Kapsam_: Turnike kaydının bütünlüğü

**Eski rapor**:
Kaynak yenilemesi başarısız olduğu için güncelliği doğrulanamayan son rapor.
_Gösterim_: Son alınan rapor ve güncellik uyarısı

**Açık çalışma günü**:
Mesai planına dahil olan hafta günü. Gereken süresi sıfır olsa da çalışma planında açıktır.

**Kapalı gün**:
Çalışma planına dahil olmayan gün. Haftalık izinli gün ve varsayılan şablonda kapalı gün bu kapsamdadır.

**Seçili gün**:
Plan düzenleyicisinde ayrıntıları ve süre kontrolleri gösterilen gün.

**Manuel gün kilidi**:
Kullanıcının haftalık planda günün gereken süresini korumak için koyduğu kilit. Otomatik devir ve toplu düzenlemeler o günü korur; Planı sıfırla kilidi kaldırır. Tamamlanmış günün PDKS kaydı nedeniyle oluşan kilidi kayıt sahibine bağlıdır.

**Pofi notu**:
Mesai kaydından bağımsız, belirli bir tarih ve kişi anahtarı için seçilen günlük metni.
_Kapsam_: Pofi'nin günlük metni

**Yemek yorumu**:
Seçilen menüdeki yemek ve rol koşullarına uyan bütün metinler arasından hesap anahtarı ve tarih için seçilen kısa Pofi metni.
_Kapsam_: Yemek menüsünün altındaki Pofi notu

**Not teması**:
Giriş, gelişme ve kapanış metin parçalarını bir araya getiren içerik ailesi.
_Kapsam_: Notun konusu ve anlatı parçaları

**Not havuzu**:
Tüm tarihlerde günlük seçim için kullanılan güncel normal Pofi notlarının bütünü.
_Kapsam_: Geçmiş ve güncel tarihler için tek güncel katalog
