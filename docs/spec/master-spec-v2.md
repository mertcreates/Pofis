# POFIS — MASTER PRODUCT & ENGINEERING SPECIFICATION
# Spec Kit / Zero-to-One Build & Verification Blueprint

> Kaynak belge: 15 Ekim 2026'da kullanıcıdan alınan başlangıç spesifikasyonu; özgün içeriği aşağıda korunur. Güncel kapsam ve sonraki kararlar için [PRODUCT](../../PRODUCT.md), [tasarım](../../DESIGN.md) ve [kural haritasını](../rules/README.md) kullanın. Kişisel/full sürüm ayrımı, personel arama ve eski altyapı önerileri güncel ürün kapsamını belirlemez.

Sürüm: 2.0 (Birleştirilmiş Master Spesifikasyon)
Tarih: 15 Ekim 2026
Durum: Sıfırdan İnşa ve Tam Doğrulama Referansı (Zero-Legacy)
Ürün: Pofis
Slogan: Mesaiye biraz Pofi.
Maskot: Pofi

============================================================
00. BELGENİN AMACI VE ÇALIŞMA MODU
============================================================

Bu belge; Pofis hakkında bugüne kadar alınmış tüm ürün,
tasarım, içerik, mikro metin (microcopy), not defteri hikâyeleri,
teknik mimari ve dağıtım kararlarını tek bir kaynakta toplar.

Bu doküman iki amaçla kullanılır:
1. Sıfırdan (greenfield) temiz, hiçbir "legacy" uyumluluk katmanı
   barındırmayan v1.0.0 kod tabanını inşa etmek.
2. Mevcut/inşa edilen kod tabanını denetlemek ve kabul kriterlerini
   doğrulamak.

Denetim aşamasında her özellik şu durumlarla takip edilir:
- IMPLEMENTED: Kodda mevcut ve beklendiği şekilde çalışıyor.
- PARTIAL: Mevcut fakat eksik veya hatalı.
- MISSING: Henüz uygulanmamış.
- UNVERIFIED: Kodda mevcut fakat davranışı test edilmemiş.
- BLOCKED: Dış ortam engeli nedeniyle tamamlanamıyor.

ALTIN KURAL (ZERO-LEGACY):
Henüz yayınlanmamış bir ürün olduğu için kod tabanında eski veri
şeması dönüştürücüler, geriye dönük fallback katmanları veya
kullanılmayan ölü kodlar (dead code) kesinlikle bulundurulmaz.

============================================================
01. ÜRÜN VİZYONU VE KONUMLANDIRMA
============================================================

1.1. Pofis nedir?
Pofis, mevcut PDKS sistemindeki (`PizzyKurumWeb`) giriş–çıkış
kayıtlarını kullanarak kişisel mesai takibini kolaylaştıran,
hem kullanıcı bilgisayarında yerel olarak hem de kurum içi ağda
(internal pod/container) çalışabilen modern bir web uygulamasıdır.

Kullanıcıların şu sorulara tek bakışta cevap bulmasını sağlar:
- Bugün ne kadar mesai yaptım?
- Günlük hedefime ne kadar kaldı?
- Bugünkü hedef çıkış saatim kaç?
- Bu hafta toplam ne kadar çalıştım ve hedefimin neresindeyim?
- Gün içindeki giriş–çıkış hareketlerim ve açık girişim nedir?
- Geçmiş haftalarda mesai tablom nasıldı?

Bunlara ek olarak, mevcut PDKS erişiminin izin verdiği ölçüde
personel arama ve raporlama özelliklerini anlaşılır bir arayüzde sunar.

1.2. Ürün konumlandırması
- Kişisel, gayriresmî fakat mühendislik ve tasarım açısından özenli bir üründür.
- Mevcut PDKS'nin yerine geçmez ve PDKS'deki kayıtları değiştirmez.
- Yalnızca PDKS'de var olan verileri okur, işler ve görselleştirir.
- Her kullanıcı kendi PDKS hesabıyla bağlanır; Pofis yeni yetki üretmez.

1.3. Ürün karakteri
Temel yaklaşım:
"İşlevde ciddiyet, ifadede doğallık, ayrıntılarda küçük bir gülümseme."
Sistem gerçeği söyler, Pofi ona eşlik eder.

============================================================
02. ÜRÜN GELİŞTİRME İLKELERİ
============================================================

2.1. "Anlatma, Göster" (Önce Kullanılabilirlik)
Kullanıcı bir ekrana baktığında gösterilen bilgiyi fazladan açıklama
okumadan anlamalıdır ("Bu nedir?" dememelidir). Kritik bilgiler
tooltip arkasına saklanmaz.

2.2. Bilgi yoğunluğunda ölçülülük
Aynı bilgiyi farklı kartlarda veya aynı kart içinde farklı formatlarla
tekrar etme. Boşluk doldurmak için gereksiz metin ekleme.

2.3. Hesaplama ve veri dürüstlüğü
Kayıtlı süre (kesinleşmiş), anlık tahmin (devam eden) ve hedef süre
birbirinden hem metinsel hem görsel olarak net biçimde ayrılır.

2.4. Görsel sadelik ve özen
Gereksiz animasyonlar, rozetler, altı çizili (`underline`) HTML linkleri,
tarayıcı varsayılanı (`native`) kaba form elemanları ve çift katmanlı
odak halkaları (`focus-within` karmaşası) kullanılmaz.

2.5. Pofi'nin rolü
Pofi kullanıcının çalışkanlığını, üretkenliğini veya yorgunluğunu
yargılamaz; kullanıcıya davranış dayatmaz ("dinlenmeyi hak ettin" vb.
demez). Sakin bir mesai arkadaşı olarak eşlik eder.

============================================================
03. TASARIM SİSTEMİ VE GÖRSEL DİL
============================================================

3.1. Görsel yön ve Tema
Linear / Vercel / Shadcn UI kalitesinde minimalist, ferah ve düzenli
bir arayüz. Varsayılan olarak Light Mode açılır; sol menünün altındaki
kompakt `Görünüm` anahtarı (switch) ile Dark Mode geçişi desteklenir.

3.2. Renk Tokenları (Light Mode Referansı)
- Sayfa arka planı (Page background): `#F7F8FA`
- Kart yüzeyi (Surface): `#FFFFFF` / `#FCFCFD`
- Kart kenarlığı (Border): `1px solid #E2E8F0` / `#ECE9F8`
- Ana mor vurgu (Primary purple): `#6D28D9` / `#6554C0`
- Yumuşak lavanta (Soft lavender): `#8B7CFF` / `#C4B5FD`
- Açık lavanta yüzey (Pale lavender): `#F5F2FF` / `#EDE9FE`
- Ana metin: `#0F172A`
- İkincil metin: `#475569` / `#64748B`
- Soluk metin (Muted): `#94A3B8`

3.3. Tipografi (Geist Sans / Geist Mono)
Tüm sayısal metriklerde `font-variant-numeric: tabular-nums` zorunludur.
Saat ve dakika birincil önem taşır; saniyeler korunur ancak görsel
olarak daha küçük ve ikincil ağırlıkta gösterilir:
- Süre örneği: `7 sa 45 dk 51 sn` (`7` ve `45` büyük/kalın; `sa` ve `dk` orta; `51 sn` daha küçük ve sakin).
- Saat örneği: `13:57:32` (`13:57` baskın; `:32` daha küçük ve ikincil).
- Türkçe ondalık gösterimlerinde nokta yerine her zaman virgül kullanılır (`7,5 sa`, `8,5 sa`).
- Kesme işaretlerinde tipografik kesme (`’`) ve saat/tarih aralıklarında kısa tire (`–`) kullanılır (`12 – 18 Ekim`, `Giriş–çıkış raporu`).

3.4. Odak (Focus) ve Form Disiplini
- Modal veya sayfa açılışında ilk butona/input'a otomatik odaklanma (`autoFocus`) yapılarak mor çerçeve bırakılmaz.
- Kapsayıcılarda çift çerçeve yaratan `:focus-within` halkaları kullanılmaz.
- Hiçbir aksiyon butonunda veya bağlantıda `text-decoration: underline` kullanılmaz.
- Tüm form kontrolleri (Segmented Control, Number Stepper, Switch, Gün Hapları) Pofis'in özel (custom) tasarım diline uyar; tarayıcının varsayılan `<select>` veya `<input type="number">` okları (spinners) tamamen gizlenir.

============================================================
04. UYGULAMA İSKELETİ VE HAFTAYA DUYARLI DASHBOARD
============================================================

4.1. Sol Yan Menü (Sidebar)
- Üst: Pofi ikonu + `pofis.` wordmark.
- Ana Navigasyon:
  - `Mesaim` (Ana hafta bazlı dashboard)
  - `Ayarlar` (Mesai planı ve uygulama ayarları)
  - *(PDKS yetkisi/kapsamı dahilinde)* `Personel ara` ve `Personel raporları`
- Alt Kontroller:
  - `Görünüm` (Kompakt, zarif boyutlu `36x20px` tema anahtarı)
  - `Bağlantıyı kes` (ve gerektiğinde `PDKS’yi aç`)
- Sayfa Altbilgisi (Footer):
  - Sol: `Pofis · Mesaiye biraz Pofi.`
  - Sağ: `v1.0.0 · mertcreates.` (`https://mertcreates.com` bağlantılı)

4.2. Üst Başlık (Dashboard Header)
- Sol:
  - Üst küçük etiket: `MESAİM`
  - Ana başlık: Seçili haftanın tarih aralığı (`12 – 18 Ekim`)
  - Alt başlık: Oturum sahibinin adı (`MERT ERCAN`)
- Sağ:
  - Hafta seçici kontrol: `<` `Bu hafta` (veya tarih aralığı açılır seçicisi) `>`
  - Güncelleme durumu: `Son güncelleme: 13:42` + dairesel yenileme (`↻`) ikonu butonu.
  - Mevcut haftadan gelecekteki haftalara gereksiz navigasyon açılmaz.

4.3. Mevcut Hafta Görünümü (`selectedWeek` = İçinde Bulunulan Hafta)
Ayrı bir "Bugün / Haftalık" sekmesi yoktur; mevcut hafta seçiliyken
ekran 4 satırlık şu hiyerarşiyle sunulur:

SATIR 1 — ÜÇ ÜST METRİK KARTI (3 Sütunlu Grid):
1. `Bugünkü süre`:
   - Üst: Saat ikonu + `Bugünkü süre` + sağda yüzde rozeti (`%97`).
   - Orta: Büyük süre (`7 sa 45 dk 51 sn`) + altında tam genişlikte mor ilerleme çubuğu (hedef aşıldığında bar `%100`'de kalır, hata rengi almaz).
   - Alt: Sol `Hedef`, Sağ `8 sa 00 dk`.
2. `Bugünkü hedef çıkış` (veya `Hedef çıkış`):
   - Üst: Saat ikonu + `Bugünkü hedef çıkış`.
   - Orta: Büyük hedef çıkış saati (`13:57:32`).
   - Alt Satır 1: Hedef öncesinde `Hedefe kalan` (`0 sa 14 dk 08 sn`); hedef geçildiğinde bu satır `Hedefin üzerinde` (`+10 dk 54 sn`) olur ("Hedefe kalan 0 sa 00 dk" olarak kalmaz).
   - Alt Satır 2: Sol `İlk giriş`, Sağ `05:57:32`.
3. `Haftalık toplam`:
   - Üst: Grafik ikonu + `Haftalık toplam` + sağda yüzde rozeti (`%61`).
   - Orta: Büyük süre (`24 sa 31 dk 43 sn`) + ilerleme çubuğu.
   - Alt Satır 1: Sol `Hedef`, Sağ `40 sa 00 dk`.
   - Alt Satır 2: Sol `Kalan` (veya `Hedef üzeri`), Sağ `15 sa 28 dk 17 sn`.

SATIR 2 — GÜNÜN AKIŞI (Sol ~2/3) VE POFİ (Sağ ~1/3):
1. `Günün akışı` Kartı:
   - Üst: Sol `Günün akışı` ve altında `14 Ekim · Çarşamba`; Sağ üstte durum (`Mesai devam ediyor`).
   - Orta (Zaman Çizelgesi Barı):
     - İlk giriş saatinden (`05:57:32`) hedef çıkışa (`13:57:32`) ve eğer aşıldıysa `Şimdi` işaretine kadar uzanan yatay bar.
     - Kesinleşmiş `Kayıtlı süre` düz mor dolguyla; son kayıttan `Şimdi` anına kadar olan `Anlık tahmin` bölümü ise **diyagonal çizgili (taramalı) mor dokuyla** gösterilir.
     - Bar üzerinde `Son kayıt`, `Şimdi` ve `Hedef` (`13:57:32`) işaretçileri birbirine binmeden gösterilir.
     - Alt lejant: `● Kayıtlı süre` ve `⊘ Anlık tahmin`.
   - Alt Özet Kutusu (İki sütunlu iç kart):
     - Sol: Saat ikonu + `İlk giriş` (`05:57:32`)
     - Sağ: Kapı/çıkış ikonu + `Son çıkış kaydı` (`13:24:46`)
2. `Pofi` Kartı:
   - Üst: `Pofi` başlığı.
   - Orta: Duruma uygun statik Pofi illüstrasyonu (üzerine tek tıklandığında `Pofi’nin odası` modalını açar).
   - Alt: Açık lavanta (`#F5F2FF`) kutu içinde sistemin durum başlığı ve Pofi'nin 1. tekil şahıs mesajı (Örn: `"Hedefe az kaldı. Saate bir kez daha baktım."`).

SATIR 3 — BU HAFTANIN GÖRÜNÜMÜ (Sol ~1/2) VE GÜNÜN KAYITLARI (Sağ ~1/2):
1. `Bu haftanın görünümü` (Dikey Sütun Grafiği):
   - Üst: Sol `Bu haftanın görünümü`, Sağda tarih rozeti (`12 – 18 Ekim`).
   - Grafik: `Pzt`, `Sal`, `Çar`, `Per`, `Cum` (ve varsa hafta sonu) sütunları.
   - Tamamlanmış günler açık lavanta sütun; bugünün sütunu koyu mor ve üst ucundaki `Anlık tahmin` payı diyagonal taramalı dokuda.
   - Sütunların altında günün süresi (`08:03:31`, `08:42:21`, `07:45:51` veya `-`), gün kısaltması (`Pzt`, `Sal`, `Çar`) ve bugünün altında `Anlık` etiketi.
   - Alt lejant: Sol `● Günlük kayıtlı süre`, Sağ `⊘ Anlık tahmin`.
2. `14 Ekim kayıtları` (Seçili Günün Kayıtları Kartı):
   - Üst: Sol `14 Ekim kayıtları`, Sağ `Tüm kayıtlar >` aksiyonu.
   - Alt başlık: `11 hareket · 5 giriş–çıkış aralığı`.
   - Liste: Kronolojik (veya ters kronolojik) eşleştirilmiş giriş–çıkış satırları.
   - Açık giriş varsa en üstte: Sol `Giriş 13:29:31 / Açık giriş`, Sağ `Çıkış / Henüz kayıt yok`.

SATIR 4 — GİRİŞ–ÇIKIŞ RAPORU (Tam Genişlikte Tablo Kartı):
- Başlık: `Giriş–çıkış raporu`
- Sütunlar:
  1. `Gün` (`12 Ekim / Pazartesi`, bugünse sol kenarda mor dikey çizgi vurgusu ve `14 Ekim / Çarşamba · Bugün`)
  2. Geçiş sayısı açılır detayı (`20 geçiş ⌄`, `16 geçiş ⌄`, `11 geçiş ⌄` — tıklandığında o günün aralıklarını açar)
  3. `İlk giriş` (`06:00:02` veya `-`)
  4. `Son çıkış` (`14:03:33` veya `-`)
  5. `Kayıtlı süre` (`08:03:31` kalın, veya `-`)
  6. `Hedef farkı` (`3 dakika 31 saniye fazla`, `32 dakika 46 saniye eksik`, `Hedefle aynı` veya `-`)
  7. `Kayıt durumu` (`Giriş–çıkış kaydı var`, `Mesai devam ediyor`, `Gelecek gün`, `Çalışma günü değil`, `Kayıtlarda belirsizlik var`)

4.4. Geçmiş Hafta Görünümü (`selectedWeek` < İçinde Bulunulan Hafta)
- Geçmiş bir hafta seçildiğinde üstteki canlı günlük kartların (`Bugünkü süre`, `Bugünkü hedef çıkış`) ve canlı `Pofi` durumunun yerine haftalık özet metrikleri (`Haftalık toplam`, `Haftalık hedef`, `Hedef farkı`, `Kayıtlı gün sayısı`) geçer.
- Alt bölümde seçili haftanın grafiği, seçilen günün kayıtları ve haftalık giriş–çıkış raporu yer alır.

============================================================
05. PDKS İŞ VE HESAPLAMA KURALLARI (KRİTİK)
============================================================

5.1. Günlük Mesai Süresi (İlk Giriş – Son Çıkış Kuralı)
- Pofis'in temel iş kuralı: Günlük mesai süresi, o günkü **ilk giriş ile son çıkış arasındaki toplam süredir**.
- Gün içindeki ara giriş–çıkış süreleri toplam mesai süresinden DÜŞÜLMEZ.
- Örnek: İlk giriş `05:52:51`, ara çıkış/girişler var, son çıkış `14:03:45` -> Günlük kayıtlı süre = `14:03:45 - 05:52:51`.

5.2. Devam Eden Mesai ve Anlık Tahmin
- Son geçerli hareket `Giriş` ise kullanıcı içeride kabul edilir ve `Mesai devam ediyor` durumu gösterilir.
- Anlık süre = `Şimdiki zaman (Europe/Istanbul) - İlk giriş`.
- Bu değer grafikte ve metriklerde `Anlık tahmin` olarak işaretlenir; PDKS'deki kesinleşmiş `Kayıtlı süre` (`Son çıkış - İlk giriş`) ile karıştırılmaz.

5.3. Son Hareket Çıkışsa
- Kayıtlı süre olarak `Son çıkış - İlk giriş` gösterilir.
- Kullanıcının gün içinde tekrar giriş yapma ihtimali olduğundan "Mesai bitti / Gün sona erdi" gibi kesin yargılar yerine `Son hareket çıkış kaydı` ifadesi kullanılır.

5.4. Hedef Çıkış ve Haftalık Devir (Carryover)
- Günlük bazda hedef çıkış = `İlk giriş + O günün hedef süresi`.
- Haftalık planda önceki günlerden biriken fazla/eksik sürelerin haftanın son mesai gününe (veya kalan günlere) yansıtılması mevcut hesaplama kuralına uygun şekilde korunur.

5.5. İlerleme Yüzdesi
- `Oran = (Süre / Hedef) * 100`, standart matematiksel yuvarlama (`Math.round`) ile tam sayı olarak gösterilir (`%69,98 -> %70`).
- Hedef aşıldığında rozet `%100` üzerine çıkabilir (`%102`), ancak progress bar genişliği `100%` ile sınırlandırılır.

5.6. Kayıt Belirsizlikleri
- Hiç giriş olmaması, eşleşmeyen/mükerrer kayıt, gelecek gün veya çalışma dışı gün durumları birbirinden ayrılır. Eksik veri devamsızlık olarak etiketlenmez; `Kayıtlarda belirsizlik var` durumu gösterilir.

============================================================
06. MESAI PLANI MODALI (AYARLAR) — BLUEPRINT UI/UX SPEC
============================================================

Varsayılan çalışma planı kurulum anında hazır gelir:
**Pazartesi–Cuma açık, günde 8 saat, haftalık toplam 40 saat.**
Kullanıcı hiçbir ayar yapmadan uygulamayı ilk açtığında bu planla çalışır.

Kullanıcı `Mesai planı` modalını açtığında "Anlatma, göster" ilkesine
dayanan, 6 bölümlü şu özel (custom) yapı birebir uygulanır:

6.1. Global Reset ve Tipografi Kuralları
- Modal açıldığında hiçbir butona/input'a otomatik odaklanma (`autoFocus`) yapılmaz; çift katmanlı `:focus-within` çerçeveleri kesinlikle kullanılmaz.
- Modal içindeki hiçbir butonda `text-decoration: underline` kullanılmaz (`text-decoration: none !important`).
- Küçük hap butonların global buton stillerinden etkilenmemesi için `min-height: 0; box-sizing: border-box;` uygulanır.
- Ondalık saatler her yerde virgülle gösterilir (`7,5 sa`, `8,5 sa`).

6.2. Bölüm 1: Modal Header
- `padding: 20px 24px 16px`, `border-bottom: 1px solid #F1F5F9`, `display: flex`, `align-items: center`, `justify-content: space-between`.
- Sol: `Mesai planı` (`20px`, `font-weight: 700`, `#0F172A`). Altında sabit tarih alt başlığı YER ALMAZ.
- Sağ: Kapatma (`✕`) butonu (`32x32px`, `border-radius: 8px`, `background: #F8FAFC`, `border: 1px solid #E2E8F0`).

6.3. Bölüm 2: Segmented Control (Plan Kapsamı Sekmeleri)
- Kapsayıcı: `height: 40px`, `padding: 4px`, `border-radius: 10px`, `background: #F3F2F8`, `border: 1px solid #E9E5F5`, `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 4px`.
- Sol Sekme: `Varsayılan plan`
- Sağ Sekme: `Bu hafta · 12 – 18 Eki` (Seçili haftanın kısa tarihi).
- Aktif sekme: `background: #FFFFFF`, `color: #4C1D95`, `box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06)`, `border-radius: 7px`.
- Pasif sekme: `background: transparent`, `color: #64748B`.
- Fark Noktası: Seçili haftanın planı varsayılan plandan farklıysa, sağ sekme metninin yanında `6px` çapında mor bir nokta (`#6D28D9`) gösterilir.

6.4. Bölüm 3: Çalışma Günleri Başlık Satırı (Tek Satırda Kalır)
- `display: flex`, `align-items: center`, `justify-content: space-between`, `white-space: nowrap`, `margin: 18px 0 10px`.
- Sol: `Çalışma günleri` (`14px`, `font-weight: 600`, `#0F172A`).
- Sağ (Canlı Toplam): `Toplam · 40 saat` (`13px`, `font-weight: 600`, `#475569`).
  - Eğer `Bu hafta` toplamı varsayılan toplamdan farklıysa: Solunda üstü çizili soluk varsayılan değer (`<s>40 sa</s>`, `#94A3B8`) ve yanında `Toplam · 39 sa 30 dk` (`#4C1D95`) gösterilir. Bu satıra buton konulmaz.

6.5. Bölüm 4: 7 Gün Kartı (İki Satırlı İnteraktif Grid)
- `display: grid`, `grid-template-columns: repeat(7, minmax(0, 1fr))`, `gap: 8px`.
- Her gün kartı (`height: 58px`, `border-radius: 10px`, `position: relative`):
  - Üst satır: Gün kısaltması (`Pzt`, `Sal`, `Çar`, `Per`, `Cum`, `Cmt`, `Paz` — `13px`, `font-weight: 600`).
  - Alt satır: O günün hedef saati (`8 sa`, `7,5 sa`, `4 sa` veya kapalıysa `–` — `11px`, `font-weight: 500`).
- 3 Görsel Durum:
  1. Açık çalışma günü (`saat > 0`, seçili değil): `background: #F5F2FF`, `border: 1px solid #DDD6FE`, metin `#4C1D95` / `#6D28D9`.
  2. Kapalı gün (`saat === 0`, seçili değil): `background: #F8FAFC`, `border: 1px solid #E2E8F0`, metin `#64748B` / `#94A3B8`.
  3. Şu an düzenlenen (seçili) gün: `background: #EDE9FE`, `border: 1.5px solid #6D28D9`, `box-shadow: 0 0 0 2px rgba(109, 40, 217, 0.10)`, metin `#3B0764`, `font-weight: 700`.
- Fark İşareti: `Bu hafta` sekmesinde saati varsayılan plandan farklı olan gün kartlarının sağ üst iç köşesinde (`top: 6px; right: 6px`) `5px` mor nokta (`#6D28D9`) yer alır.

6.6. Bölüm 5: Seçili Gün Düzenleme Kartı (Alt Kutu)
- Kapsayıcı: `margin-top: 12px`, `padding: 14px 16px`, `border-radius: 12px`, `background: #F8FAFC`, `border: 1px solid #E2E8F0`, `display: flex`, `flex-direction: column`, `gap: 12px`.
- Üst Satır (`justify-content: space-between`):
  - Sol: Seçili günün tam adı (`Cuma`, `15px`, `font-weight: 700`) + eğer varsayılandan farklıysa yanında `· Varsayılan: 8 sa` (`12px`, `#64748B`).
  - Sağ (Custom Stepper `[ − | 7,5 sa | + ]`): `height: 34px`, `padding: 2px`, `border-radius: 8px`, `background: #FFFFFF`, `border: 1px solid #CBD5E1`, `display: inline-flex`, `align-items: center`.
    - `−` ve `+` butonları: `28x28px`, `border-radius: 6px`, `background: #F1F5F9`, `color: #334155`. Adım (`step`): `0.5` saat (`30 dk`), `min: 0`, `max: 16`.
    - Orta değer alanı: `min-width: 64px`, `text-align: center`, arka planı şeffaf (`background: transparent`), `13px`, `font-weight: 700` (`7,5 sa`).
- Alt Satır (`padding-top: 10px`, `border-top: 1px solid #E2E8F0`, `justify-content: space-between`):
  - Sol (Hızlı seçim hapları): `Kapalı`, `4 sa`, `8 sa` (`height: 28px`, `padding: 0 10px`, `border-radius: 6px`, `font-size: 12px`, `font-weight: 600`). Aktif olan `#EDE9FE` zemin ve `#C4B5FD` kenarlık alır.
  - Sağ: `Açık günlere uygula` ghost hap butonu (`height: 28px`, `padding: 0 10px`, `border-radius: 6px`, `color: #5B21B6`, `font-size: 12px`, `font-weight: 600`, altı çizili değil, hover'da `#F3EFFC`).

6.7. Bölüm 6: Haftalık Fark Aksiyon Çubuğu (Yalnızca Fark Varsa Görünür)
- `Bu hafta` sekmesinde plan varsayılandan farklılaştığında alt kutunun altında (`margin-top: 10px`) beliren tek satırlık lavanta bar (`padding: 10px 12px`, `border-radius: 10px`, `background: #F5F2FF`, `border: 1px solid #DDD6FE`):
  - Sol metin (`12px`, `#4C1D95`): Toplam farklıysa `Varsayılan plandan 30 dk eksik` (veya `fazla`); toplam aynı ama dağılım farklıysa `Bu hafta için özel gün dağılımı`.
  - Sağ butonlar (`gap: 6px`):
    - Toplam farklıysa: `40 saate tamamla` (`height: 26px`, `padding: 0 10px`, `border-radius: 6px`, `background: #6D28D9`, `color: #FFFFFF`, `font-size: 12px`, `font-weight: 600` — farkı açık günlere dağıtır).
    - Her durumda: `Sıfırla` (`height: 26px`, `padding: 0 10px`, `border-radius: 6px`, `background: #FFFFFF`, `color: #4C1D95`, `border: 1px solid #C4B5FD`, `font-size: 12px`, `font-weight: 600` — bu haftayı varsayılan plana döndürür).

============================================================
07. PERSONEL ARAMA VE PERSONEL RAPORLARI
============================================================

7.1. Personel Arama
- Kullanıcının mevcut PDKS yetkisi dahilinde ad/soyad ile arama yapmasını ve seçilen kişinin erişilebilir mesai kayıtlarını görüntülemesini sağlar.

7.2. Personel Raporları
- Birim seçimi, hafta seçimi, sıralama, sayfa içi arama, sayfalama ve personel bazında günlük ayrıntıları içerir.
- Kaynak PDKS raporunun anlamları korunur; devam/devamsızlık ifadeleri yalnızca kayıt yokluğundan türetilmez.

============================================================
08. POFI — MASKOT, DİL, ODA VE EASTER EGG SİSTEMİ
============================================================

8.1. Kimlik ve Görsel Kurallar
- Krem renkli tüyler, lavanta tonlarında kulaklar/patiler/kuyruk, başında kıvrık bir tutam, lavanta boyun askısı ve `tabii` işaretli beyaz personel kartı.
- Statik, yüksek kaliteli pastel 3D illüstrasyonlar kullanılır (`idle`, `working`, `break`, `tired`, `completed`, `overworked`, `error`). Simitli eski görsel kullanılmaz.

8.2. İki Ayrı Ses Kuralı ("Sistem gerçeği söyler, Pofi ona eşlik eder")
- Sistemin sesi (`Pofis`): Açık, kısa, teknik olarak doğru, ünlemsiz.
- Maskotun sesi (`Pofi`): 1. tekil şahısla konuşur (`"Ben de yerime geçtim."`, `"Saate bir kez daha baktım."`). Sakin, meraklı, kuru ve abartısız bir mizaha sahiptir. Kendini komik bulmaz, şakayı açıklamaz, kullanıcıyı değerlendirmez.

8.3. Pofi'nin Odası
- Ana dashboard'daki Pofi illüstrasyonuna **tek tıklamayla** açılır (10 tıklama şartı yoktur).
- 4 Ana Bölüm:
  1. `Fotoğraf albümü` (Sonunda Pofi'nin görünmediği `"Benim çektiğim fotoğraf"` / `"Fotoğrafı ben çektim. İçinde yokum."` kartı yer alır).
  2. `Not defteri` (Takvim gününe göre deterministik çalışan 3 parçalı günlük Pofi notları).
  3. `Personel kartı` (Ad: Pofi, Görev: Mesai arkadaşı, Uzmanlık alanı: Küçük şeyleri fark etmek, İmza: Mesaiye biraz Pofi. — pati izi etkileşimli).
  4. `Pofi’nin mesaisi` (`"Kendi tuttuğum küçük kayıtlar."` — Pencere nöbeti, Mola kontrolü, Mesai arkadaşlığı).

8.4. Kesinleşmiş Easter Egg'ler
1. **Klavyede `pofi` yazılması** (aktif bir input/şifre alanında değilken): `"Beni mi çağırdın?"` / `"Buradayım."`
2. **Hakkında / Sürüm Notu:** `"Aslında sadece mesai saatlerine bakacaktım."` / `"Sonra Pofi geldi."` / `"Biraz uzadı."`
3. **Kırık Laptop Görseli Notu:** `"Bunu Codex’e anlatmak biraz sürdü."` ve `"Bir de fazladan patim olmuştu.\nOnu da düzelttik."`
4. **Saat `12:34`:** Saat 12:34 olduğunda Pofi'nin mesajı kısa süreliğine `"12:34. Her şey sırayla."` olur.
5. **8 Aralık Özel Notu:** Not defterinde 8 Aralık günü `"Takvimin kenarına bugün için küçük bir yıldız çizdim."` / `"Biri nedenini sordu."` / `"'İyi ki,' dedim."` metni gösterilir.
6. **Developer Console Mesajı (Değiştirilemez):**
   ```text
   Buraya kadar geldiysen,
   sen de küçük detayları seviyorsun demektir.

   Ben de.

   Mesaiye biraz Pofi.
   mertercan.com

```

# ============================================================
09. KESİNLEŞMİŞ UI METİNLERİ SÖZLÜĞÜ (src/copy/ui.js)

Aşağıdaki metinler rehber ilkelerine göre son hâline getirilmiştir ve
uygulamada birebir kullanılır:

```javascript
export const product = {
  wordmark: 'pofis',
  name: 'Pofis',
  mascotName: 'Pofi',
  tagline: 'Mesaiye biraz Pofi.',
  description: 'Mesai kayıtları ve çalışma süresi takibi.',
  creditLabel: 'mertcreates.',
  creditUrl: '[https://mertcreates.com](https://mertcreates.com)',
  pdksUrl: '[https://pdks.trt.net.tr/PizzyKurumWeb/index.html](https://pdks.trt.net.tr/PizzyKurumWeb/index.html)',
};

export const ui = {
  pofiCall: ['Beni mi çağırdın?', 'Buradayım.'],
  pofiWrongDoor: 'Ben de yanlış kapıyı açmışım.',
  about: {
    title: 'Pofis hakkında',
    version: (version) => `Sürüm ${version}`,
    noteTitle: 'Küçük bir not',
    note: [
      'Aslında sadece mesai saatlerine bakacaktım.',
      'Sonra Pofi geldi.',
      'Biraz uzadı.',
    ],
  },
  pofiRoom: {
    title: 'Pofi’nin odası',
    description: 'Burası biraz da Pofi’nin dünyası.',
    welcomeTitle: 'Beni buldun.',
    welcome: 'Aslında burada saklanmıyordum. Biraz oturuyordum.',
    back: 'Odaya dön',
    backToAlbum: 'Albüme dön',
    sections: [
      {
        id: 'album',
        icon: 'layout',
        title: 'Fotoğraf albümü',
        description: 'Günün farklı saatleri',
      },
      {
        id: 'notes',
        icon: 'file',
        title: 'Not defteri',
        description: 'Bazen bir şeyler yazıyorum.',
        heading: 'Pofi’nin not defteri',
        subtitle: 'Bazı şeyleri unutmamak için yazdım.',
      },
      {
        id: 'identity',
        icon: 'file',
        title: 'Personel kartı',
        description: 'Boynumdaki kartta yazanlar',
      },
      {
        id: 'work',
        icon: 'clock',
        title: 'Pofi’nin mesaisi',
        description: 'Bugün kendi çapımda yaptıklarım',
      },
    ],
    album: {
      idle: 'Güne başlamadan',
      working: 'İş başında',
      break: 'Küçük bir mola',
      tired: 'Biraz yorulunca',
      completed: 'Mesai tamam',
      overworked: 'Mesai uzayınca',
      error: 'Bir şeyler karışınca',
      missing: 'Benim çektiğim fotoğraf',
    },
    missingPhotoDescription: 'Fotoğrafı ben çektim. İçinde yokum.',
    missingPhotoNote: 'Bence güzel çıkmış.',
    brokenLaptopNote: 'Bunu Codex’e anlatmak biraz sürdü.',
    extraPawNote: 'Bir de fazladan patim olmuştu.\nOnu da düzelttik.',
    signatureNote: 'İmza yerine pati bastım.\nDaha resmî oldu.',
    performanceNote: 'Bu raporu ben hazırladım.\nKendimden memnunum.',
    idleTitle: 'Bir süredir bakışıyoruz.',
    idleNote: 'Benim acelem yok.',
    previousNote: 'Önceki',
    nextNote: 'Sonraki',
    latestWeekdayNote: 'Son hafta içi notu',
    notesUnavailable: 'Bu tarihin notu bulunamadı.',
    notebookNavigation: 'Not defteri günleri',
    identity: [
      ['Ad', 'Pofi'],
      ['Görev', 'Mesai arkadaşı'],
      ['Uzmanlık alanı', 'Küçük şeyleri fark etmek'],
      ['İmza', 'Mesaiye biraz Pofi.', 'signature'],
    ],
    workIntro: 'Kendi tuttuğum küçük kayıtlar.',
    work: [
      ['Pencere nöbeti', 'Güneşli köşe bulundu.'],
      ['Mola kontrolü', 'Esneme tamamlandı.'],
      ['Mesai arkadaşlığı', 'Yanındayım.'],
    ],
  },
  weekdays: [
    { short: 'Pzt', long: 'Pazartesi' },
    { short: 'Sal', long: 'Salı' },
    { short: 'Çar', long: 'Çarşamba' },
    { short: 'Per', long: 'Perşembe' },
    { short: 'Cum', long: 'Cuma' },
    { short: 'Cmt', long: 'Cumartesi' },
    { short: 'Paz', long: 'Pazar' },
  ],
  emptyValue: '-',
  connect: 'PDKS’ye bağlan',
  username: 'Kullanıcı adı',
  password: 'Şifre',
  verifyingSession: 'Oturum doğrulanıyor…',
  loadingApp: 'Yükleniyor…',
  checkingSession: 'Oturum kontrol ediliyor…',
  disconnect: 'Bağlantıyı kes',
  openPdks: 'PDKS’yi aç',
  reconnectPdks: 'PDKS’ye yeniden bağlan',
  overview: 'Mesaim',
  thisWeekView: 'Bu haftanın görünümü',
  selectedWeekView: 'Seçili haftanın görünümü',
  entryExitReport: 'Giriş–çıkış raporu',
  recordedDays: 'Kayıtlı gün sayısı',
  targetDifference: 'Hedef farkı',
  targetExtra: (duration) => `${duration} fazla`,
  targetMissing: (duration) => `${duration} eksik`,
  targetEqual: 'Hedefle aynı',
  recordsForDate: (date) => `${date} kayıtları`,
  settings: 'Ayarlar',
  updatedAt: (time) => `Son güncelleme: ${time}`,
  mainMenu: 'Ana menü',
  openMenu: 'Menüyü aç',
  closeMenu: 'Menüyü kapat',
  today: 'Bugün',
  weeklyView: 'Haftalık görünüm',
  todayDuration: 'Bugünkü süre',
  weeklyTotal: 'Haftalık toplam',
  targetLabel: 'Hedef',
  remainingLabel: 'Kalan',
  excessLabel: 'Hedef üzeri',
  dailyGoalPrefix: 'Günlük hedef:',
  liveEstimateLabel: 'Anlık tahmin',
  incompleteRecord: 'Kayıtlarda belirsizlik var',
  incompleteRecordHint: 'Giriş–çıkış kayıtlarını kontrol et.',
  awaitingEntry: 'Giriş bekleniyor',
  mesaiOngoing: 'Mesai devam ediyor',
  noExitYet: 'Henüz yok',
  hourShort: 'sa',
  minuteShort: 'dk',
  secondShort: 'sn',
  dayFlow: 'Günün akışı',
  noRecordedDuration: 'Kayıtlı süre yok',
  lastRecord: 'Son kayıt',
  weeklyViewLabel: (dates) => `${dates} haftalık görünüm`,
  dailyRecordedDuration: 'Günlük kayıtlı süre',
  inside: 'İçeride',
  outside: 'Dışarıda',
  live: 'Anlık',
  lastExitRecord: 'Son çıkış kaydı',
  now: 'Şimdi',
  entry: 'Giriş',
  exit: 'Çıkış',
  passageCount: (count) => `${count} geçiş`,
  passageDetails: (start, end, duration) => `${start}–${end} · ${duration}`,
  allRecords: 'Tüm kayıtlar',
  passageOverview: (count, intervals) =>
    `${count} hareket${intervals ? ` · ${intervals} giriş–çıkış aralığı` : ''}`,
  openEntryRecord: 'Açık giriş',
  unmatchedRecord: 'Eşleşmeyen kayıt',
  noPassageYet: 'Henüz kayıt yok',
  pofi: {
    clockSurprise: '12:34. Her şey sırayla.',
    nonWorkingTitle: 'Bugün planlı mesai yok.',
    nonWorking: 'Seçili gün çalışma planında yer almıyor.',
    staying: 'Ben biraz daha oturuyorum.',
    breakRemaining: (duration, lastExit) =>
      lastExit
        ? `Son çıkış kaydı: ${lastExit}. Günlük hedefe ${duration} kaldı.`
        : `Son hareket çıkış kaydı. Günlük hedefe ${duration} kaldı.`,
    states: {
      idle: {
        title: 'Henüz giriş kaydı yok.',
        message: 'İlk giriş kaydın geldiğinde süre burada görünür.',
      },
      working: {
        title: 'Mesai devam ediyor.',
        message: 'Ben de yerime geçtim.',
      },
      break: {
        title: 'Son hareket çıkış kaydı.',
        message: 'Bir sonraki kaydı bekliyorum.',
      },
      tired: {
        title: 'Hedefe az kaldı.',
        message: 'Saate bir kez daha baktım.',
      },
      completed: {
        title: 'Hedef tamam.',
        message: 'Hesabı kontrol ettim. Tamam.',
      },
      overworked: {
        title: 'Hedefin üzerindesin.',
        message: 'Farkı bir kenara not ettim.',
      },
      error: {
        title: 'Kayıtlarda belirsizlik var.',
        message: 'Giriş–çıkış saatlerine birlikte bakalım.',
      },
    },
  },
  noRecord: 'Kayıt bulunamadı',
  availableRecordsTotal: 'Mevcut kayıtların toplamı',
  incompletePassage: 'Eksik geçiş',
  recordedDay: 'Giriş–çıkış kaydı var',
  future: 'Gelecek gün',
  exceeded: 'Hedef aşıldı',
  targetRemaining: 'Hedefe kalan',
  targetOver: 'Hedefin üzerinde',
  notCalculated: 'Hesaplanmadı',
  refreshInstruction: 'Raporu yenile.',
  daysLater: (days) => ` (${days} gün sonra)`,
  liveEstimate: (label) => `${label} · anlık tahmin`,
  personRecords: (name) => `${name} mesai kayıtları`,
  recordedTime: 'Kayıtlı süre',
  weeklyGoal: 'Haftalık hedef:',
  hours: 'saat',
  minutes: 'dakika',
  seconds: 'saniye',
  partialWeek: 'Kısmi hafta',
  firstEntry: 'İlk giriş',
  lastExit: 'Son çıkış',
  nonWorkingDay: 'Çalışma günü değil',
  targetExit: 'Hedef çıkış',
  todayTargetExit: 'Bugünkü hedef çıkış',
  noEntryYet: 'Henüz giriş kaydı yok',
  exitAwaitingHint: 'Giriş kaydıyla hesaplanacak.',
  workPlan: 'Mesai planı',
  hoursPerDays: 'saat /',
  days: 'gün',
  dailyGoal: 'Günlük hedef',
  dailyRequired: 'Gün başına gereken',
  selectCurrentWeek: 'Bu haftayı seç.',
  selectWholeWeek: 'Haftanın tamamını seç.',
  missingRecords: 'Eksik kayıtlar var.',
  noRemainingDays: 'Seçili çalışma günü kalmadı.',
  day: 'Gün',
  recordStatus: 'Kayıt durumu',
  storageReadError: 'Kaydedilen mesai ayarları okunamadı.',
  storageWriteError: 'Mesai ayarları bu tarayıcıya kaydedilemedi.',
  reportPeriod: 'Rapor dönemi',
  previousWeek: 'Önceki hafta',
  nextWeek: 'Sonraki hafta',
  currentWeek: 'Bu hafta',
  chooseWeek: 'Hafta seç',
  previousMonth: 'Önceki ay',
  nextMonth: 'Sonraki ay',
  returnToCurrentWeek: 'Bu haftaya dön',
  updating: 'Güncelleniyor…',
  refreshReport: 'Raporu yenile',
  staleReport: 'Son başarılı rapor · veriler güncel olmayabilir',
  loadingSelf: 'Kendi mesai kayıtların getiriliyor…',
  reportFailed: 'Rapor alınamadı',
  retry: 'Yeniden dene',
  close: 'Kapat',
  workingDays: 'Çalışma günleri',
  weeklyHours: 'Haftalık saat',
  dailyHours: 'Günlük saat',
  validHours: 'Geçerli bir saat gir.',
  hoursDoNotFit: 'Haftalık saat seçilen günlere sığmıyor.',
  notFound: 'Sayfa bulunamadı',
  returnSelf: 'Mesaim’e dön',
  expired: 'PDKS oturumun sona erdi',
  requestFailed: 'İşlem tamamlanamadı',
  errorCode: 'Hata kodu',
  apiStatus: 'API HTTP durumu',
  noResponse: 'Yanıt alınamadı',
  retrying: 'Yeniden deneniyor…',
  reconnect: 'Yeniden bağlan',
  apiPath: 'API isteği',
  apiMethod: 'API yöntemi',
  sourceStatus: 'PDKS HTTP durumu',
  sessionCheck: 'PDKS oturum kontrolü',
  sessionCheckStatus: 'Oturum kontrolü HTTP durumu',
  sessionCheckCode: 'Oturum kontrolü hata kodu',
  recoveryAttempts: 'Rapor sayfasını yeniden açma denemesi',
  sessionChecks: {
    active: 'Oturum sahibi doğrulandı',
    expired: 'Oturum sona erdi',
    unverified: 'Oturum doğrulanamadı',
  },
  stage: 'İşlem aşaması',
  method: 'İstek yöntemi',
  path: 'İstek yolu',
  type: 'Hata türü',
  diagnostic: 'Teknik ayrıntı',
  causeCode: 'Bağlantı hata kodu',
  occurredAt: 'Hata zamanı',
  dataAgeJustNow: 'Veriler az önce alındı',
  dataAgeMinutes: (minutes) => `Veriler ${minutes} dakika önce alındı`,
  dataAgeHours: (hours, minutes) =>
    `Veriler ${hours} saat${minutes ? ` ${minutes} dakika` : ''} önce alındı`,
  sourceErrors: {
    formUnreadable:
      'PDKS formu okunamadı. PDKS ekranını kontrol edip yeniden dene.',
    formStateUnreadable: 'PDKS form durumu okunamadı.',
    reportStructureChanged:
      'PDKS raporunun yapısı değişmiş görünüyor. Kaynak ekranı kontrol et.',
    reportColumnMissing: 'PDKS raporunda gerekli sütun bulunamadı.',
    personFilterNotApplied:
      'PDKS kişi filtresini uygulamadı. Yeniden bağlan.',
    tooManyRows: 'Çok fazla kayıt var. Tarih aralığını daralt.',
    reportDateUnreadable: 'Rapordaki tarih okunamadı.',
    passageDirectionUnreadable: 'Geçiş kaydının giriş–çıkış yönü okunamadı.',
    dateFilterUnreadable: 'Tarih filtresi okunamadı.',
    unexpectedRedirect: 'PDKS beklenmeyen bir adrese yönlendirdi.',
    connectionFailed:
      'PDKS’ye bağlanılamadı. Kurum ağı veya VPN bağlantısını kontrol et.',
    connectionTimeout: 'PDKS yanıtı 30 saniye içinde gelmedi.',
    connectionUnavailable: 'PDKS bağlantısı kurulamadı.',
    sessionExpired: 'PDKS oturumun sona erdi. Yeniden bağlan.',
    redirectAddressMissing: 'PDKS yönlendirme adresi eksik.',
    unknownException: 'PDKS beklenmeyen bir hata döndürdü.',
    redirectFailed: 'PDKS yönlendirmesi tamamlanamadı. Yeniden bağlan.',
    authFailed: 'Oturum doğrulanamadı. Giriş bilgilerini kontrol et.',
    reportNextPageUnreadable:
      'PDKS raporunun sonraki sayfası okunamadı. Tarih veya arama aralığını daralt.',
    reportPagesIncomplete: 'PDKS sonuçlarının tamamı alınamadı. Yeniden dene.',
    selfReportUnverified:
      'Kişisel rapor doğrulanamadı. Yeniden bağlan.',
    reportButtonUnreadable: 'Rapor düğmesi okunamadı.',
    dateRangeNotApplied:
      'PDKS istenen tarih aralığını uygulamadı. Yeniden dene.',
    callbackResponseUnreadable: 'Rapor yanıtı okunamadı. Yeniden dene.',
    callbackEncodingUnreadable: 'Rapor yanıtının kodlaması okunamadı.',
    callbackResponseIncomplete: 'Rapor yanıtı eksik geldi.',
    callbackAreaMissing: 'Rapor alanı bulunamadı.',
    duplicateDate:
      'Aynı gün için birden fazla kayıt geldi. Toplam hesaplanmadı.',
    httpFailure: (status) =>
      `PDKS isteğe hata yanıtı verdi (HTTP ${status}). Yeniden dene.`,
  },
  apiErrors: {
    invalidPerson: 'Geçerli bir kişi kimliği gerekli.',
    localOnly: 'Bu uygulama yalnızca izin verilen ağda kullanılabilir.',
    submitFromApp: 'İsteği uygulama ekranından yeniden gönder.',
    sessionRequired: 'Önce PDKS’ye bağlan.',
    sessionLimit:
      'Açık oturum sınırına ulaşıldı. Kullanmadığın oturumları kapat.',
    credentialsRequired: 'Kullanıcı adı ve şifreyi gir.',
    invalidDateRange: 'Geçerli bir başlangıç ve bitiş tarihi seç.',
    dateRangeTooLong: 'Bir sorguda en fazla 93 günlük aralık seç.',
    jsonRequired: 'JSON biçiminde bir istek gönder.',
    emptyRequest: 'İstek boş.',
    requestTooLarge: 'İstek çok büyük.',
    requestUnreadable: 'İstek okunamadı.',
    requestFailed: 'İşlem tamamlanamadı. Yeniden dene.',
    unexpectedServerError: 'Uygulama sunucusunda beklenmeyen bir hata oluştu.',
    appUnavailable: 'Uygulamaya bağlanılamadı.',
    browserRequestFailed: 'Tarayıcı API isteğini tamamlayamadı.',
    responseUnreadable: 'Sunucu yanıtı okunamadı.',
    invalidJsonResponse: 'API yanıtı geçerli JSON içermiyor.',
  },
};

export const pageTitle = (label) => `${product.name} · ${label}`;

```

# ============================================================
10. POFİ'NİN GÜNLÜK NOT DEFTERİ — 20 KESİNLEŞMİŞ TEMA

Not defteri deterministik çalışır: Aynı takvim günü (`MM-DD`) her zaman,
her cihazda aynı notu üretir. Aşağıdaki 20 temanın tüm `i + d + e`
kombinasyonları (1.280 kombinasyon) çapraz kontrol edilmiş ve
onaylanmıştır:

```javascript
export const notebookThemes = [
  {
    "id": "chair",
    "title": "Sandalye",
    "premise": "Pofi sandalyesinin konumunu bir türlü tam ayarlayamıyor.",
    "intros": {
      "i1": "Sandalyemi masaya biraz yaklaştırdım.",
      "i2": "Masaya oturmadan önce sandalyenin yerini düzelttim.",
      "i3": "Sandalyemi masaya göre hizaladım.",
      "i4": "Masayla sandalyenin arasındaki boşluğa baktım."
    },
    "developments": {
      "d1": "Oturunca masaya yine biraz uzak kaldım.",
      "d2": "Kendime doğru çekince bu sefer fazla yaklaştı.",
      "d3": "Sandalye biraz döndü. Ben de onunla birlikte döndüm.",
      "d4": "Masayı oynatmak daha kolay olur mu diye düşündüm."
    },
    "endings": {
      "e1": "Sonunda yerleşebildim.",
      "e2": "Bir süre yerimi değiştirmedim.",
      "e3": "Sandalyeyle bugünlük anlaştık.",
      "e4": "Daha fazla kurcalamadım."
    }
  },
  {
    "id": "coffee",
    "title": "Kahve",
    "premise": "Pofi kahvesiyle kısa bir mola verirken kupa veya mola hakkında küçük bir ayrıntı fark eder.",
    "intros": {
      "i1": "Kahve kupamı alıp masama oturdum.",
      "i2": "Sabah kupamı doldurup pencerenin yanına geçtim.",
      "i3": "Kahvemi yanıma bıraktım.",
      "i4": "Kahvemi alıp sandalyeme yerleştim."
    },
    "developments": {
      "d1": "İçmeden önce kupayı iki elimle biraz tuttum.",
      "d2": "Kupayı başka bir yere koydum. Sonra gözüm onu eski yerinde aradı.",
      "d3": "Kahvenin üstünde küçük bir köpük halkası vardı. Uzun süre durmadı.",
      "d4": "Bir yudum aldım. Sandığımdan sıcaktı."
    },
    "endings": {
      "e1": "Sonra yavaş yavaş içtim.",
      "e2": "Kupanın kulpunu kendime doğru çevirdim.",
      "e3": "Bir süre sonra kupam boşaldı. Son yudumu hatırlamıyorum.",
      "e4": "Bitince de kupayı hemen kaldırmadım."
    }
  },
  {
    "id": "computer",
    "title": "Bilgisayar",
    "premise": "Pofi bilgisayarda küçük bir işe başlarken ekranda beklemediği bir ayrıntıyla karşılaşır.",
    "intros": {
      "i1": "Sabah bilgisayarın başına geçtim.",
      "i2": "Bilgisayarımı açıp bekleyen işlerden birine baktım.",
      "i3": "Masama oturunca ilk iş ekranı açtım.",
      "i4": "Bilgisayarda kısa sürecek bir işim vardı."
    },
    "developments": {
      "d1": "Yeni bir pencere açtım. Neden açtığımı hemen hatırlayamadım.",
      "d2": "İmleç dönmeye başladı. Ne zaman duracağını merak ettim.",
      "d3": "Bir dosyayı uzun süre aradım. Adını geçen hafta kendim değiştirmişim.",
      "d4": "Ekranda küçük bir uyarı belirdi. Okuyamadan kayboldu."
    },
    "endings": {
      "e1": "Biraz durup kaldığım yerden devam ettim.",
      "e2": "Açık pencereleri üst üste hizaladım.",
      "e3": "Bir daha baktım. Bu kez her şey yerindeydi.",
      "e4": "Bilgisayar çalışmaya devam etti. Ben de ettim."
    }
  },
  {
    "id": "desk-lamp",
    "title": "Masa lambası",
    "premise": "Pofi ışığın yönünü ayarlarken küçük gölgelerle uğraşıyor.",
    "intros": {
      "i1": "Lambayı masanın kenarına çektim.",
      "i2": "Masa lambasını yakıp ışığına baktım.",
      "i3": "Lambayı kendime doğru biraz çevirdim.",
      "i4": "Lambanın başlığını biraz aşağı eğdim."
    },
    "developments": {
      "d1": "Işık defterime değil, yanındaki boşluğa düştü.",
      "d2": "Biraz dokununca masadaki gölge de yer değiştirdi.",
      "d3": "Masada bir şey parladı. Kendi personel kartımmış.",
      "d4": "Güneş de camdan içeri giriyordu. Onun ışığı daha genişti."
    },
    "endings": {
      "e1": "Lambayı olduğu gibi bıraktım.",
      "e2": "Masam biraz farklı göründü.",
      "e3": "Biraz daha bakınca alıştım.",
      "e4": "Bugünlük yerini değiştirmedim."
    }
  },
  {
    "id": "desk",
    "title": "Masa",
    "premise": "Pofi masasında küçük bir düzenleme yapar ve eşyaların arasında yeni bir ayrıntı fark eder.",
    "intros": {
      "i1": "Masama oturunca üstündeki eşyalara baktım.",
      "i2": "Masamın üstünü biraz düzeltmeye başladım.",
      "i3": "İşe başlamadan önce masanın üstünü biraz topladım.",
      "i4": "Masadaki eşyaların yerini biraz değiştirdim."
    },
    "developments": {
      "d1": "Defteri sağa aldım. Üstündeki kalem de onunla gitti.",
      "d2": "Kupayı kaldırınca altında eski bir not buldum.",
      "d3": "Orta kısımda küçük bir boşluk açıldı. Oraya bir şey koymadım.",
      "d4": "Bir köşeyi topladım. Öteki köşe hâlâ aynıydı."
    },
    "endings": {
      "e1": "Kollarımı masaya koyup yeni hâline baktım.",
      "e2": "Masam pek değişmemişti. Farkı ben biliyordum.",
      "e3": "Kalemi defterin yanına hizaladım.",
      "e4": "Sandalyemi masaya biraz yaklaştırdım."
    }
  },
  {
    "id": "door",
    "title": "Kapı",
    "premise": "Pofi kapıyı birisi geçsin diye tutuyor; herkesin kendi planı var.",
    "intros": {
      "i1": "Ofisin kapısını açıp kenara çekildim.",
      "i2": "Kapıyı açıp arkamdan gelen var mı diye baktım.",
      "i3": "Koridora çıkarken kapıyı açık tuttum.",
      "i4": "Kapıyı aralayıp yanında biraz durdum."
    },
    "developments": {
      "d1": "Ayak sesleri yaklaştı. Sonra başka yöne gittiler.",
      "d2": "Birisi uzaktan elini kaldırdı. Ben de kaldırdım.",
      "d3": "Kapı ağır ağır kapanmaya başladı. Tekrar tuttum.",
      "d4": "Gelen kişi yan odanın kapısından içeri girdi."
    },
    "endings": {
      "e1": "Kapıyı yavaşça bıraktım.",
      "e2": "Sonunda kendim geçtim.",
      "e3": "Koridora bir kez daha bakıp yürüdüm.",
      "e4": "Kapı arkamdan sessizce kapandı."
    }
  },
  {
    "id": "drawer",
    "title": "Çekmece",
    "premise": "Pofi kaybolan kalemini ararken çekmecede başka küçük şeyler buluyor.",
    "intros": {
      "i1": "Kalemim ortalıkta yoktu. Çekmeceyi açtım.",
      "i2": "Bir kalem arıyordum. Önce çekmeceye baktım.",
      "i3": "Kalemi en son nereye koyduğumu düşündüm. Sonra çekmeceyi açtım.",
      "i4": "Çekmecede yedek bir kalem vardır diye baktım."
    },
    "developments": {
      "d1": "En arkada katlanmış küçük bir kâğıt vardı.",
      "d2": "İki ataş buldum. Birbirine tutunmuşlardı.",
      "d3": "Eski bir fiş buldum. Ne aldığımı hatırlamadım.",
      "d4": "En dipte tek başına duran bir düğme vardı."
    },
    "endings": {
      "e1": "Kalemi bulamadım. Çekmeceyi kapattım.",
      "e2": "Çekmeceyi kapatınca kalemi defterin yanında gördüm.",
      "e3": "Hiçbirinin yerini bozmadım.",
      "e4": "Kalemi masanın üstünde aramaya devam ettim."
    }
  },
  {
    "id": "elevator",
    "title": "Asansör",
    "premise": "Pofi asansöre biner; kısa yolculukta dikkatini küçük, beklenmedik bir ayrıntı çeker.",
    "intros": {
      "i1": "Üst kata çıkmak için asansöre bindim.",
      "i2": "Sabah asansöre binip kapının yanında durdum.",
      "i3": "Asansörün kapısı açılınca içeri geçtim.",
      "i4": "Bir dosya götürmek için asansöre bindim."
    },
    "developments": {
      "d1": "Kapı kapanırken yeniden açıldı. Dışarıda kimse yoktu.",
      "d2": "Aynada kendime baktım. Personel kartım ters dönmüştü.",
      "d3": "Asansör ara katta durdu. Kapı açıldı, koridor boştu.",
      "d4": "Yanımdaki biri benim gideceğim kata bastı. Elimi geri çektim."
    },
    "endings": {
      "e1": "Kendi katıma gelince indim.",
      "e2": "İnmeden önce düğmelere son bir kez baktım.",
      "e3": "Kat numaralarının değişmesini izledim.",
      "e4": "Ben inince asansör yoluna devam etti."
    }
  },
  {
    "id": "file-name",
    "title": "Dosya adı",
    "premise": "Pofi hazırladığı dosyaya ad koymakta beklediğinden fazla vakit harcıyor.",
    "intros": {
      "i1": "Yeni dosyamı kaydetmek için bir isim aradım.",
      "i2": "Hazırladığım belgeye ad vermem gerekiyordu.",
      "i3": "Kaydet düğmesine bastım. Ad kısmı boştu.",
      "i4": "Dosyayı bitirdim. Sıra adına gelmişti."
    },
    "developments": {
      "d1": "İlk aklıma gelen adı yazdım. Biraz uzun oldu.",
      "d2": "Birkaç farklı isim denedim. Hepsi birbirine benzedi.",
      "d3": "Takvime bakıp sonuna bugünün tarihini ekledim.",
      "d4": "Bir kelime yazıp sildim. Yerine daha kısa bir şey yazdım."
    },
    "endings": {
      "e1": "Son hâline dokunmadan kaydettim.",
      "e2": "Dosyanın bir itirazı olmadı.",
      "e3": "Klasördeki diğer dosyaların yanına yerleşti.",
      "e4": "Kaydedip pencereyi kapattım."
    }
  },
  {
    "id": "headphones",
    "title": "Kulaklık",
    "premise": "Pofi kulaklığını takıp bir ses bekliyor; ses pek acele etmiyor.",
    "intros": {
      "i1": "Kulaklığımı takıp masama oturdum.",
      "i2": "Kulaklığımı takıp iki elimle düzelttim.",
      "i3": "Bilgisayarın karşısına geçip kulaklığımı taktım.",
      "i4": "Kulaklığın sağını solunu kontrol edip taktım."
    },
    "developments": {
      "d1": "Bir süre ses gelmedi. Bilgisayara bağlamamışım.",
      "d2": "İnce bir ses duydum. Sandalyem gıcırdamış.",
      "d3": "Sesi biraz açtım. Sessizlik aynı kaldı.",
      "d4": "Açtığım kayıtta bir süre kimse konuşmadı."
    },
    "endings": {
      "e1": "Kulaklığı yine de çıkarmadım.",
      "e2": "Bir süre öylece dinledim.",
      "e3": "Kulaklık yerinde duruyordu. Ben de durdum.",
      "e4": "Kabloyu masanın kenarından düzelttim."
    }
  },
  {
    "id": "lunch",
    "title": "Öğle yemeği",
    "premise": "Pofi öğle molasında yemeğiyle ilgilenirken masasında ufak bir şey yaşanır.",
    "intros": {
      "i1": "Öğle arasında yemeğimi alıp masaya oturdum.",
      "i2": "Öğlen olunca tabağımı alıp bir masaya geçtim.",
      "i3": "Öğle yemeği için cam kenarındaki masaya oturdum.",
      "i4": "Yemekhanede sakin bir köşe bulup yerleştim."
    },
    "developments": {
      "d1": "İlk lokmayı alırken \"Afiyet olsun,\" dediler. Ağzım doluydu.",
      "d2": "Masanın diğer ucunda biri tuzluğu arıyordu. Önüne uzattım.",
      "d3": "Bir lokma tabağın kenarına kaçmıştı. Çatalımla geri aldım.",
      "d4": "Peçeteyi unuttuğumu fark edip bir tane aldım."
    },
    "endings": {
      "e1": "Yemeğime kaldığım yerden devam ettim.",
      "e2": "Molam bitince sandalyeyi yerine çektim.",
      "e3": "Son lokmayı acele etmeden yedim.",
      "e4": "Tabağımı götürürken masaya bir daha baktım."
    }
  },
  {
    "id": "meeting",
    "title": "Toplantı",
    "premise": "Pofi toplantıda küçük bir defterle yerini alır; konuşmalar sırasında ufak bir ayrıntı dikkatini çeker.",
    "intros": {
      "i1": "Toplantıya küçük defterimi götürdüm.",
      "i2": "Toplantı başlamadan yerime oturup defterimi açtım.",
      "i3": "Toplantı için kalemimi ve defterimi hazırladım.",
      "i4": "Masada boş bir yer bulup defterimi önüme koydum."
    },
    "developments": {
      "d1": "İlk cümleyi yazdım. Sonra sadece dinledim.",
      "d2": "Birisi tahtaya bir ok çizdi. Okun nereye gittiğine baktım.",
      "d3": "Yanımdaki kişi kalemini düşürdü. Eğilip aldım, ona uzattım.",
      "d4": "Aynı kelime birkaç kez geçince not alıp altını çizdim."
    },
    "endings": {
      "e1": "Sayfanın geri kalanı boş kaldı.",
      "e2": "Toplantı bitince sandalyemi yerine ittim.",
      "e3": "Çıkmadan önce sayfanın köşesine tarihi yazdım.",
      "e4": "Kalemimin kapağını kapatıp defterin yanına koydum."
    }
  },
  {
    "id": "office-silence",
    "title": "Ofisin sessizliği",
    "premise": "Pofi sessiz ofiste tek tük sesleri fark ediyor.",
    "intros": {
      "i1": "Sabah ofise geldiğimde ortalık sakindi.",
      "i2": "Masama oturunca etrafın sessiz olduğunu fark ettim.",
      "i3": "Bilgisayarımı açmadan önce bir an durdum. Hiç ses yoktu.",
      "i4": "Koridordan masama döndüm. Herkes bir şeye dalmıştı."
    },
    "developments": {
      "d1": "Uzakta bir sandalye gıcırdadı. Sonra o da durdu.",
      "d2": "Birisi hafifçe öksürdü. Kimse dönüp bakmadı.",
      "d3": "Karşı masadan tek bir tuş sesi geldi.",
      "d4": "Duvardaki saatin sesini duydum. Sonra onu da unuttum."
    },
    "endings": {
      "e1": "Fareyi yavaşça hareket ettirdim.",
      "e2": "Kupamı masaya sessizce bıraktım.",
      "e3": "Ben de önümdeki işe döndüm.",
      "e4": "Bir süre sonra koridordan sesler gelmeye başladı."
    }
  },
  {
    "id": "paperclips",
    "title": "Ataşlar",
    "premise": "Pofi masasında iki ataşla ilgileniyor ve onların neden orada olduğunu düşünmüyor.",
    "intros": {
      "i1": "Masamın üstünde iki ataş buldum.",
      "i2": "Küçük kutudan iki ataş çıkardım.",
      "i3": "Defterimin arasından iki ataş düştü.",
      "i4": "Kalemliğin yanında duran iki ataşı önüme aldım."
    },
    "developments": {
      "d1": "Birbirlerine geçmişlerdi. Ayırmak biraz sürdü.",
      "d2": "Biri diğerinden biraz daha büyüktü. Uçlarını hizaladım.",
      "d3": "Birini sağa çevirdim. Ötekinin yeri değişmedi.",
      "d4": "İkisini yan yana koydum. Hangisini önce aldığımı unuttum."
    },
    "endings": {
      "e1": "İkisini de masanın köşesinde bıraktım.",
      "e2": "Şimdilik kâğıda ihtiyaçları yoktu.",
      "e3": "Bir daha saydım. Yine iki taneydiler.",
      "e4": "Küçük bir işleri varmış gibi duruyorlardı."
    }
  },
  {
    "id": "plant",
    "title": "Ofis bitkisi",
    "premise": "Pofi masayı paylaştığı bitkinin küçük değişikliklerini fark eder; ona sessizce eşlik eder.",
    "intros": {
      "i1": "Sabah masamdaki bitkiye baktım.",
      "i2": "Çalışmaya başlamadan önce masamdaki saksıyı kontrol ettim.",
      "i3": "Masamda benimle duran küçük bitkiye baktım.",
      "i4": "Masamdaki bitkiye biraz daha yakından baktım."
    },
    "developments": {
      "d1": "En uçtaki yaprağı biraz kıvrılmıştı.",
      "d2": "Bir yaprağının gölgesi defterimin üstüne düşmüştü.",
      "d3": "Alt taraftan yeni, küçücük bir yaprak çıkmıştı.",
      "d4": "Yaprakları biraz pencereye doğru dönmüştü."
    },
    "endings": {
      "e1": "Saksıyı hafifçe düzelttim. Fazlasına karışmadım.",
      "e2": "Olduğu gibi bıraktım. Hâlinden memnun görünüyordu.",
      "e3": "Bir süre yanında durdum. İkimiz de sessizdik.",
      "e4": "Bilgisayarımı açtım. Gün boyu masayı paylaştık."
    }
  },
  {
    "id": "sticky-note",
    "title": "Yapışkan not",
    "premise": "Pofi unutmamak için küçük bir not bırakıyor; not artık kendi başına bir nesneye dönüşüyor.",
    "intros": {
      "i1": "Unutmamak için sarı bir kâğıda kısa bir not yazdım.",
      "i2": "Masamdaki yapışkan notlardan birine birkaç kelime yazdım.",
      "i3": "Aklımdaki işi küçük bir not kâğıdına geçirdim.",
      "i4": "Yapışkan notlardan birini ayırıp üstüne tek bir kelime yazdım."
    },
    "developments": {
      "d1": "Notu monitörün alt kenarına yapıştırdım.",
      "d2": "Yazdığımı bir kez okuyup masanın köşesine iliştirdim.",
      "d3": "Ekranın yanına yapıştırdım. Hafifçe eğri durdu.",
      "d4": "Masaya yapıştırdım. Bir köşesi hemen yukarı kalktı."
    },
    "endings": {
      "e1": "Artık unutmamam gereken şeyin de bir yeri vardı.",
      "e2": "Düşmesin diye ucuna hafifçe bastırdım.",
      "e3": "Arada bir yerinde duruyor mu diye baktım.",
      "e4": "Bir süre yan yana çalıştık."
    }
  },
  {
    "id": "todo",
    "title": "Yapılacaklar listesi",
    "premise": "Pofi yapacaklarını yazıp düzenlerken listenin kendisi de küçük bir işe dönüşür.",
    "intros": {
      "i1": "Sabah yapacaklarımı küçük bir listeye yazdım.",
      "i2": "Bir kâğıt çıkarıp günün işlerini sıraladım.",
      "i3": "Bugün unutmamam gerekenleri alt alta not ettim.",
      "i4": "Yapılacaklar listemi yazıp masamın kenarına koydum."
    },
    "developments": {
      "d1": "Bir maddeyi bitirdim. Yanına küçük bir işaret koydum.",
      "d2": "İki madde aynı şeyi söylüyordu. Birinin üstünü çizdim.",
      "d3": "Yeni bir iş çıktı. Listenin en altına ekledim.",
      "d4": "Listeye tekrar baktım. Kendi yazımı çözmem biraz sürdü."
    },
    "endings": {
      "e1": "Kâğıdı katlamadan ekranın yanına bıraktım.",
      "e2": "Liste şimdi biraz daha düzenli göründü.",
      "e3": "Kalemi listenin yanına hizaladım.",
      "e4": "Sıradaki maddeye geçtim."
    }
  },
  {
    "id": "umbrella",
    "title": "Şemsiye",
    "premise": "Pofi şemsiyesine bir yer buluyor, çıkarken unutmamaya çalışıyor.",
    "intros": {
      "i1": "Sabah ofise şemsiyemle geldim.",
      "i2": "Masama geçince şemsiyeyi nereye koyacağıma baktım.",
      "i3": "Elimdeki şemsiyeyle masamın yanına geldim.",
      "i4": "Şemsiyemi unutmamak için yanıma aldım."
    },
    "developments": {
      "d1": "Sapını sandalyenin kenarına astım. Biraz sallandı.",
      "d2": "Köşeye bıraktım. Orada başka bir şemsiye daha vardı.",
      "d3": "Masanın yanına dayadım. Yavaşça kayıp yere indi.",
      "d4": "Üzerindeki şeridi bağladım. Kendi kendine yine açıldı."
    },
    "endings": {
      "e1": "Şimdilik nerede olduğunu biliyorum.",
      "e2": "Gün boyu olduğu yerde bekledi.",
      "e3": "Akşama kadar bir daha açmam gerekmedi.",
      "e4": "Çıkarken almayı aklımda tuttum."
    }
  },
  {
    "id": "wall-clock",
    "title": "Duvar saati",
    "premise": "Pofi saati öğrenmek için duvar saatine bakıyor ve biraz oyalanıyor.",
    "intros": {
      "i1": "Çalışırken gözüm duvardaki saate takıldı.",
      "i2": "Başımı kaldırıp duvardaki saate baktım.",
      "i3": "Günün ne kadar ilerlediğini görmek için saate baktım.",
      "i4": "Saatin olduğu duvara doğru döndüm."
    },
    "developments": {
      "d1": "Yelkovanı gördüm. Akrebi bir süre aradım.",
      "d2": "Saniye kolu ilerliyordu. Ben bakarken de ilerledi.",
      "d3": "Saniye kolunun on ikiye gelmesini bekledim.",
      "d4": "Saati gördüm. Önüme dönünce kaç olduğunu unutup bir daha baktım."
    },
    "endings": {
      "e1": "Sonra ekranıma geri döndüm.",
      "e2": "Bir süre daha saate bakmadım.",
      "e3": "Saat kendi işine devam etti.",
      "e4": "Ben de şimdilik kendi işime döndüm."
    }
  },
  {
    "id": "water-glass",
    "title": "Su bardağı",
    "premise": "Pofi masasında bir bardak su için uygun yeri bulmaya çalışıyor.",
    "intros": {
      "i1": "Masama bir bardak su koydum.",
      "i2": "Su almak için kalktım. Dolu bir bardakla döndüm.",
      "i3": "Yanıma bir bardak su alıp masama geçtim.",
      "i4": "Su bardağını masanın boş bir köşesine bıraktım."
    },
    "developments": {
      "d1": "Klavyeye biraz yakın duruyordu. Bardağı sağ tarafa aldım.",
      "d2": "Bir yudum alacaktım. Önce bardağın yerini değiştirdim.",
      "d3": "Altına bir peçete koydum. Peçete biraz küçüktü.",
      "d4": "Defteri açınca bardağın yerini bir kez daha değiştirdim."
    },
    "endings": {
      "e1": "Bir yudum alıp işime başladım.",
      "e2": "Bardağın da masada kendi yeri oldu.",
      "e3": "Arada bir uzanıp bir yudum aldım.",
      "e4": "Susayınca uzanması kolay oldu."
    }
  }
];

```

# ============================================================
11. TEKNİK MİMARİ VE ÇİFT HEDEFLİ DAĞITIM (YEREL + POD)

11.1. Teknoloji Yığını

* Next.js (Standalone / Server çıktısı) + React + Bun.
* Tek bir kod tabanı hem yerel çalıştırılabilir paket (`bun build --compile`) hem de kurum içi Kubernetes Pod / Docker container olarak çalışabilecek şekilde tasarlanır.

11.2. Çoklu Kullanıcı, Oturum ve Bellek Yönetimi (200+ Eşzamanlı Kullanıcı)

* **Yapay Oturum Sınırı Yoktur:** Sabit ve düşük bir `sessionLimit` uygulanmaz; sistem en az **200+ eşzamanlı kullanıcıyı** rahatlıkla destekler.
* **Oturum İzolasyonu ve Güvenlik:**
* Kullanıcı şifreleri sunucu belleğinde, diskte veya hata loglarında (`diagnostic`) KESİNLİKLE saklanmaz; yalnızca ilk bağlantıda PDKS oturum çerezini almak için kullanılır.
* Her kullanıcının PDKS oturum durumu istemcideki imzalı/şifreli `HttpOnly` çerezle eşleşir; A kullanıcısının verisi B kullanıcısına asla sızmaz.


* **ASP.NET `__VIEWSTATE` Bellek Temizliği (Garbage Collection):**
* PDKS sayfalarındaki büyük `__VIEWSTATE` verilerinin sunucu RAM'ini şişirmemesi için sunucu tarafı oturum önbelleğinde **TTL + periyodik temizleyici (cleanup timer / LRU)** bulunur.


* **Reverse Proxy ve Protokol Uyumu:**
* İç ağda Ingress / Reverse Proxy (`trt` domaini) arkasında çalışırken `X-Forwarded-Proto` ve `X-Forwarded-Host` başlıkları dikkate alınır; `localOnly` kısıtlaması iç ağ domainini reddetmez, çerezlerin `Secure` bayrağı ortam protokolüne uyum sağlar.


* **Zaman Dilimi Kilidi (`TZ=Europe/Istanbul`):**
* Sunucu ve istemci tarafındaki tüm gün/hafta/saat hesaplamaları `Europe/Istanbul` zaman dilimine göre çalışır; UTC container ortamlarında 3 saatlik kayma yaşanmaz.


* **PDKS Koruma (Cooldown) ve Sağlık Ucu:**
* Aynı kullanıcının PDKS'ye art arda aşırı istek atmasını önlemek için kısa süreli (15–20 sn) yenileme koruması (debounce/cooldown) uygulanır.
* Kubernetes `liveness` / `readiness` kontrolleri için PDKS'ye gitmeyen hafif `/api/health` (`200 OK`) ucu bulunur.



11.3. Kesintisiz İstemci Deneyimi (Resilience)

* **Son Başarılı Raporu Koruma (`staleReport`):** Bağlantı hatası veya PDKS zaman aşımı yaşandığında mevcut ekran sıfırlanmaz; son başarılı rapor ekranda tutulur ve üstte `"Son başarılı rapor · veriler güncel olmayabilir"` uyarısı gösterilir.
* **Arka Plan Sekmesi Uyanışı (`visibilitychange`):** Yan sekmede saatlerce açık kalan Pofis sekmesine geri dönüldüğünde canlı sayaçlar `Şimdiki zaman - İlk giriş` farkından anında doğru değeri gösterir; veri eskiyse sessizce güncellenir ve gece yarısı geçildiyse "Bugün" vurgusu yeni güne aktarılır.

11.4. Yerel macOS Dağıtımı

* Hedef: macOS Apple Silicon & Intel (`macOS 13+`), ücretli Apple Developer sertifikası olmadan.
* Kurulum konumu: `~/Applications/Pofis` (`releases/<buildId>`, `current` sembolik bağı ve `Pofis.command` başlatıcısı).
* Kullanıcı Node.js veya Bun kurmaz; sürüm güncellemeleri kullanıcının yerel mesai planı ayarlarını silmez.

# ============================================================
12. UYGULAMA VE İNŞA PLANI (FAZLAR)

FAZ 1 — ÇEKİRDEK VE VERİ KATMANI

* Next.js + Bun proje iskeletinin ve `TZ=Europe/Istanbul` zaman yardımcıların kurulması.
* PDKS (`PizzyKurumWeb`) oturum, HTML/form ayrıştırma, 200+ kişilik izole oturum yönetimi ve `/api/health` uçlarının yazılması.
* Mesai hesaplama motorunun (ilk giriş–son çıkış, anlık tahmin, hedef çıkış, haftalık devir) ve birim testlerinin tamamlanması.

FAZ 2 — TASARIM SİSTEMİ VE METİN ENTEGRASYONU

* Geist tipografisi, Light/Dark renk tokenları, sol yan menü ve üst başlık bileşenlerinin kodlanması.
* Bölüm 09'daki `ui.js` sözlüğünün ve Bölüm 10'daki 20 not defteri temasının (`notebookThemes`) projeye eksiksiz eklenmesi.

FAZ 3 — HAFTAYA DUYARLI DASHBOARD VE GRAFİKLER

* Üç üst metrik kartı (`Bugünkü süre`, `Bugünkü hedef çıkış`, `Haftalık toplam`).
* `Günün akışı` (taramalı `Anlık tahmin` barı ile) ve `Pofi` durum kartı.
* `Bu haftanın görünümü` sütun grafiği, `Günlük kayıtlar` kartı ve `Giriş–çıkış raporu` tablosu.
* `staleReport` (bağlantı kopmasında son raporu tutma) ve `visibilitychange` senkronizasyonu.

FAZ 4 — MESAI PLANI MODALI (BLUEPRINT UX) VE PERSONEL EKRANLARI

* Bölüm 06'daki spesifikasyona birebir uygun `Mesai planı` modalının (Segmented Control, 2 satırlı 7 gün kartları, Custom Stepper, fark noktaları ve alt aksiyon çubuğu) kodlanması.
* Personel arama ve personel raporları ekranlarının bağlanması.

FAZ 5 — POFI'NİN ODASI VE EASTER EGG'LER

* Tek tıklamayla açılan `Pofi’nin odası` modalı (Albüm, deterministik Not Defteri, Personel Kartı, Pofi'nin Mesaisi).
* `pofi` klavye sürprizi, `12:34`, `8 Aralık`, kırık laptop notu ve console mesajının eklenmesi.

FAZ 6 — DAĞITIM PAKETLEME (DOCKER/POD & MACOS BUNDLE) VE SON KABUL

* İç ağ pod dağıtımı için `Dockerfile` ve ortam değişkenlerinin doğrulanması.
* Yerel dağıtım için `Kurulum.command` ve `Pofis.command` paketlemesinin ve testlerinin tamamlanması.

# ============================================================
13. TANITIM METNİ (SLACK / DUYURU İÇİN HAZIR METİN)

> **Pofis · Mesaiye biraz Pofi.**
> Aslında sadece giriş–çıkış kayıtlarına bakacaktım. Sonra Pofi geldi, konu biraz uzadı.
> Günlük ve haftalık mesai takibiyle birlikte birkaç küçük ayrıntı daha eklendi.
> Sonuçta PDKS’nin mevcut kayıtlarını derleyen, kendi hâlinde küçük bir uygulama çıktı. :)

# ============================================================
END OF SPECIFICATION
