# Ortak terimler

Kişisel PDKS mesaisini takip ederken kullanılan ortak terimler.

## Hesap ve oturum

**Hesap anahtarı**:
Doğrulanmış PDKS hesabından türetilen, plan ve kişisel içeriklerin kullandığı ortak değer. [Hesap kimliği kuralı](docs/rules/account-identity.md).

## Mesai ve plan

**Kayıtlı süre**:
Turnike hareketlerinden türetilen günlük ilk giriş ile son çıkış arasındaki süre.

**Canlı toplam**:
Güncel ve güvenilir açık giriş bulunduğunda, ilk girişten şimdiki ana kadar uzanan toplam süre.

**Anlık tahmin**:
Canlı toplamın kayıtlı süreyi aşan bölümü; süre çubuğunun açık tonlu parçası.
_Gösterim_: Anlık tahmin; günün akışında Tahmini

**Planlanan günlük hedef**:
Varsayılan veya özel hafta planında belirlenen günlük çalışma süresi.

**Etkin günlük hedef**:
Güncel gereken çalışma süresi; haftalık hedef ve tamamlanan günlerin kayıtlarıyla dengelenmiş günlük hedef.

**Devir**:
Tamamlanan günlerin gerçekleşen süreleri ile kayıtlı planları arasındaki net farkın kalan günlere etkisi. Dağıtım ve fazla süre politikası [plan sözleşmesindedir](docs/rules/work-plan.md#otomatik-devir).

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

**Belirsiz kayıt**:
Tutarlı bir giriş/çıkış yorumu yapılamayan hareket bilgisi veya türetilmiş günlük kayıt.

**Kayıt durumu**:
Günlük geçiş bütünlüğü, raporun İstanbul tarihi, açık giriş ve çalışma planı bağlamından seçilen durum. Hedefin altında veya üzerinde kalmak ayrı bir süre karşılaştırmasıdır.

**Eski rapor**:
Kaynak yenilemesi başarısız olduğu için güncelliği doğrulanamayan son rapor.

**Açık çalışma günü**:
Mesai planına dahil olan hafta günü. Gereken süresi sıfır olsa da çalışma planında açıktır.

**Kapalı gün**:
Çalışma planına dahil olmayan gün. Haftalık izinli gün ve varsayılan şablonda kapalı gün bu kapsamdadır.

**Seçili gün**:
Plan düzenleyicisinde ayrıntıları ve süre kontrolleri gösterilen gün.

**Planlama**:
Mesai planında giriş ve çıkış saatleriyle haftalık süreyi deneme sekmesi. **Bu hafta** raporda açık olan haftayı kullanır. **Yeni hafta** çalışma düzeninden başlayan, ayrı saklanan bir taslaktır. [Haftalık saat denemesi](docs/rules/week-schedule.md).

**Manuel gün kilidi**:
Kullanıcının haftalık planda günün gereken süresini korumak için koyduğu kilit. Otomatik devir ve toplu düzenlemeler o günü korur; Planı sıfırla kilidi kaldırır. Tamamlanmış günün PDKS kaydı nedeniyle oluşan kilidi kayıt sahibine bağlıdır.

## Pofi içeriği

**Pofi notu**:
Mesai kaydından bağımsız, belirli bir tarih ve hesap anahtarı için seçilen günlük metni.

**Pofi faaliyet kaydı**:
Odadaki “Pofi’nin mesaisi” ekranında tarih için seçilen üç kurgusal faaliyetten biri. Aynı gün herkes aynı kayıtları görür.

**Yemek yorumu**:
Seçilen menüdeki yemek ve rol koşullarına uyan bütün metinler arasından hesap anahtarı ve tarih için seçilen kısa Pofi metni.

**Not teması**:
Giriş, gelişme ve kapanış metin parçalarını bir araya getiren içerik ailesi.

**Not havuzu**:
Tüm tarihlerde günlük seçim için kullanılan güncel normal Pofi notlarının bütünü.
