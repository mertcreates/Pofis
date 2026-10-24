# Test değeri ve bakım maliyeti

Bu belge 24 Ekim 2026 denetiminin karar kaydıdır. Ürün kurallarının sahibi [kural haritası](rules/README.md), çalıştırma ve kabul yöntemlerinin sahibi [doğrulama rehberidir](verification.md). Test sayısı veya coverage için artırma/azaltma hedefi kullanılmaz. Aşağıdaki envanter ve sayılar denetim tarihindeki yerel paketi anlatır; güncel test sayısı taahhüdü veya zorunlu test şablonu değildir.

## Karar ölçütü

Her dosya ve içindeki senaryo grupları için korunan davranış, yanlış sonuçta beklentinin değişmesi, başka testte aynı riskin korunması, gerçek kod ile fixture sınırı, davranış korunurken kırılma ihtimali ve bakım karşılığı incelendi. Basit bir sınır testi de gerçek bir regresyonu yakalıyorsa korunur. Aynı fonksiyonu çağırmak tekrar sayılmaz: farklı sınır, hata yolu, tüketici veya kalıcılık aşaması ayrı risk olabilir.

| Sınıf | Karar |
| --- | --- |
| K — Kritik davranış ve iş kuralı | Hesap, kimlik, izolasyon, güvenlik, veri kaybı ve kullanıcıya yanlış sonuç verme riskleri korunur. |
| E — Değerli entegrasyon ve regresyon | Gerçek modülün tüketici, taşıma, depolama veya sunum sınırındaki sonucu korunur. |
| B — Birleştirilebilir veya tekrarlanan | Aynı risk ve aynı üretim yolu için kalan somut tanık gösterilerek kaldırılır veya birleştirilir. |
| T — Tautolojik | Beklentisi yalnız kendi kurgusundan türeyen test kaldırılır. Bu denetimde bütünü bu tanıma uyan doğrulanmış bir test bulunmadı. |
| İ — Implementasyona aşırı bağımlı | Kullanıcı sözleşmesi taşımayan ikon, iç sınıf ve çocuk düğüm sayısı beklentileri temizlenir. Kaynak dönüşümüne bağlı politika testleri için davranış değeri ayrıca değerlendirilir. |
| D — Düşük regresyon değeri | Adındaki yolu çalıştırmayan veya yalnız değişken içerik sayısını sabitleyen beklenti sadeleştirilir. |

Sınıflar birlikte kullanılabilir. Aşağıdaki K/E kararları gerçek üretim fonksiyonu veya bileşenine yönelen bağımsız beklentilere dayanır; her kalan testin kasıtlı hatayla sınandığı anlamına gelmez. Kaynak okuması duyarlılık için kanıttır, kapsamlı mutation testi değildir.

## Somut sadeleştirmeler

| Dosya / grup | Karar ve gerekçe | Kalan regresyon tanığı |
| --- | --- | --- |
| `work-plan-open-days`: “fazla süre seçili gün … Cuma'dan azaltılır” | D: dört parametre vakası kaldırıldı. Üç tamamlanmış ve iki kalan sekizer saat zaten 40 saat eder. Kaydedilmiş 41 saat hedefe rağmen dağıtımın karşılaştırdığı beklenen toplam 40 saattir; azaltma yolu çalışmaz. | `work-plan`: gerçek 41:09:17 fazlasının Cuma'dan düşmesi ve alt sınıra taşan fazlanın önceki güne aktarılması; `work-plan-audit`: saniyeli eksik/fazla, tekrar tamamlama. |
| `work-plan`: “son gün hedefi sıfırın altına inmez…” | B: bir vaka kaldırıldı; sıfır alt sınırı ve kapasite için yeni risk eklemiyordu. | “tek kalan güne devir…” sıfır hedef/uygun gün kalmaması; “fazla süre son günün alt sınırını aşınca…” iki günün sıfıra inmesi; kapasite sınırları. |
| `work-plan`: seçili gün dışına dağıtım / seçili Çarşamba, seçim yok | B: iki test bir teste birleştirildi. Aynı dağıtım riski iki ayrı kurulumla sınanıyordu. | Birleşik test gerçek tamamlanmış günleri kullanır; seçili gün korununca `[480,480,240,600,600,0,0]`, seçim yokken `[480,480,330,570,540,0,0]` ve girdinin değişmemesi birlikte doğrulanır. |
| `report`: “notlar kişi bazında sabit…” | B: bir vaka ve yalnız bu vaka için server importu kaldırıldı. Rapor sunumu yerine not defteri yardımcısını yeniden sınamaktaydı. | `notebook`: hesap, hafta, tekrar ve 8 Aralık içeriği; `server/routes`: giriş → gerçek rapor üretimi → not defteri → geri yüklenen oturum. |
| `meals/dates`: “Istanbul midnight…” | B: bir vaka ve kullanılmayan import kaldırıldı. Aynı fonksiyon, aynı `2026-10-19T22:30:00Z` girdisi ve `2026-10-20` beklentisi tekrar ediyordu. | `policy-consumers` aynı somut sınırı ve sahibi değişen politikayı; `domain/time` tarih sınırlarını korur. |
| `external-links`: izinli yalın `https://mertercan.com/` satırı | B: bir parametre vakası kaldırıldı. | Aynı dosyada gerçek `product.creditUrl` → tam beklenen URL ile dış tarayıcı çağrısı ve Electron penceresinin reddi. Yol/sorgu/hash ve tüm yasak URL grupları korunur. |
| `plan-editor` | İ: iki Lucide sınıfı ve erişilebilir adla tekrarlanan iki title beklentisi kaldırıldı; test vakası silinmedi. | Erişilebilir ad, basılı durum, sabit süre, kilit/devre dışı kontrol ve eylem sırası korunur. |
| `plan-time-planner` | İ: boş SVG, iç sınıf sırası, doğrudan span ve output çocuk sayısı beklentileri kaldırıldı; test vakası silinmedi. | Alan değerleri, tek seçim, iç içe düğme olmaması, boş/devre dışı durumlar, saat eki ve gün geçişleri korunur. |
| `dashboard/weekly-total` | İ: üç SVG sayısı beklentisi kaldırıldı; test vakası silinmedi. Uyarının belirli bir ikonla çizilmesi davranış sözleşmesi değildir. | Kayıt sorunu durumu, erişilebilir açıklama, kayıt/hedef oranı ve tutarlı kayıtta uyarı olmaması korunur. |
| `pofi-notes/cli` | D: tema/not/özel gün için 16/1024/13 sabit sayıları kaldırıldı. Geçerli içerik eklenmesi CLI sözleşmesini bozmamalı. Adındaki kanıtlanmayan “without writing” iddiası düzeltildi. | Gerçek CLI listeleme, doğrulama, önizleme, başarılı çıkış ve desteklenmeyen komut hatası; katalog bütünlüğü ve seçim davranışı kendi sahiplerinde kalır. |

Kaldırılan dört no-op plan vakası, yalnız bellekte `completeWeekPlan` tamamen `return plan` yapıldığında da **4/4 geçti**. Kalan gerçek fazla süre ve seçili gün dağıtım testleri aynı kasıtlı hatada **2/2 başarısız oldu**. Bu deney azaltma grubunun duyarsızlığını ve kalan iki tanığın o hatayı yakaladığını gösterir; üretim dosyası değiştirilmedi.

## Dosya ve grup envanteri

Yollar depo köküne göredir. Noktalı virgülle ayrılan davranışlar dosyanın değerlendirilen senaryo gruplarıdır. “Koru” kararı tüm bu grupları kapsar; yukarıdaki tabloda belirtilen alt gruplar istisnadır. Test sayıları denetim ortamına aittir; başka bir checkout'ta farklı olabilir.

### Alan kuralları ve rapor

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `src/domain/time.test.ts` | K; İstanbul tarihi, hafta/tarih ve süre biçimleri/sınırları. Gerçek zaman yardımcılarına sabit beklenen sonuç; koru. |
| `src/domain/changelog.test.ts` | E; sürüm/tarih doğrulama, sıralama, seçme ve bozuk/eski katalogda dönüş. Gerçek katalog işleme; koru. |
| `src/domain/report.test.ts` | K/E/B; hazırlanmış rapor, canlı tick/tazelik, günlük/haftalık hesap, hedef çıkış, izin ve Pofi. Referans eşitliği tekrar hesaplamama sözleşmesini korur. Not defteri tekrarı kaldırıldı. Kapalı/eski rapor vakası `record-status` ile örtüşür; haftalık rapor fixture'ında canlı tahminin durması ve kayıtlı sürenin korunmasına yönelik kısa kontrol tutuldu. |
| `src/domain/rules/notifications.test.ts` | K; zaman penceresi, uygun rapor/hedef, tek gönderim ve tercih koşulları. Sahte zamanla gerçek karar; koru. |
| `src/domain/rules/plan-duration.test.ts` | K; birim/ondalık/saat girişi, geçersiz ve sınır değerler, yuvarlama, karşı saat ve gün geçişi. Gerçek parser/hesap; basit vakalar farklı giriş risklerini korur. |
| `src/domain/rules/policy-adapters.test.ts` | K/E/İ; kimlik, heartbeat iptali, demo adımı, Telegram sınırı ve masaüstü oturum bitişi. Gerçek adaptörler/izole modüller, taklit HTTP/köprü; koru. Kaynak dönüşümü kırılgan ama ortak sahibin tüketimini kanıtlıyor. |
| `src/domain/rules/policy-consumers.test.ts` | K/E/İ; bildirim varsayılanları/form, plan/rapor limitleri, hata metinleri ve yemek takvimi. Sahibi bellekte değiştirip bağımsız yeni sonuç bekler; sabitlerin kopyalanmasını yakalar. Dönüşüm maliyetine rağmen koru. |
| `src/domain/rules/record-status.test.ts` | K; kayıtsız, açık/kapalı, eski, güvenilir/belirsiz kayıt; canlı tahminin durması veya sürmesi. Gerçek rapor tüketimi de var; koru. |
| `src/domain/rules/recorded-time.test.ts` | K; giriş/çıkış eşleme, tekrar ve eşleşmeyen çıkış, süre/güven/uyarı. Somut geçiş dizileri farklı hata sınıfları; koru. |
| `src/domain/rules/rules.test.ts` | K/E; ortak kuralın rapor/Pofi/toplam tüketimi; belge/kod sahipliği ve import sınırları. Kaynak kontrolleri burada mimari sözleşmenin kendisi; koru. |
| `src/domain/rules/work-plan.test.ts` | K/B; miras, devir, özel hedef, kilit, tamamlama/azaltma, kapasite ve sınırlar. Bir tekrar silindi, iki dağıtım testi birleşti; sayısal bağımsız sonuçları koru. |
| `src/domain/rules/work-plan-audit.test.ts` | K/E; saniyeli eksik/fazla, iki dağıtım, izin/kilit, kaydet-yükle, idempotans ve reset. Aynı hesaba farklı durum geçişleri ekler; koru. |
| `src/domain/rules/work-plan-leave.test.ts` | K; izin şablon karşılığı, açma/reset ve kapasiteye dağıtım. Gerçek plan akışı; koru. |
| `src/domain/rules/work-plan-locks.test.ts` | K/E; kilitli süreyi devir/tamamlamada koruma, kalıcılık ve reset. Sadece sayısal hesap değil kilit yaşam döngüsü; koru. |
| `src/domain/rules/work-plan-open-days.test.ts` | K/E/D; sıfır hedefli açık gün, yeni kayıtla dengeleme, izin/şablon/reset ve kalıcılık. Gerçek durum geçişlerini koru; azaltmaya girmeyen dört vaka kaldırıldı. |
| `src/domain/rules/work-plan-surplus.test.ts` | K; fazla süreyi ayrı tutma ayarı, eksik dağıtımı, izin, elle değişim ve Tamamla. Eski azaltma ayarından farklı sözleşme; koru. |

### İstemci verisi ve sunum

Statik React sunumu gerçek bileşenin görünen sonucunu sınar. Boş callback'ler tıklama, kayıt, odak veya effect yaşam döngüsünün kanıtı değildir. Bu sınırlama statik durum beklentilerini değersiz yapmaz.

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `src/data/clock.test.ts` | E; gizliyken timer kurmama, görünürlükte güncel saat ve temizleme. Gerçek saat denetimi, taklit zaman/olay; koru. |
| `src/data/pdks-lifecycle.test.ts` | K/E; HTTP/olay yarışı, eski/eşit yanıt, arka plan hatası/toparlanma, görünürlük, hafta/hesap değişimi ve temizleme. Gerçek hook izole Electron'da çalışır; fixture başarı çıktısından önce davranış assertion'ları vardır, tautoloji değil. |
| `src/data/pdks-state.test.ts` | K; yükleme, yenileme, hata, oturum ve eski yanıt geçişleri. Gerçek reducer; lifecycle entegrasyonu ile farklı sınır, koru. |
| `src/data/report-response.test.ts` | K/E; rapor yanıtının geçerliliği, hafta/kimlik/zaman uyumu ve reddi. Taşıma sınırında gerçek karar; koru. |
| `src/data/work-plans.test.ts` | K/E; doğrulama, yazma hatası, hesap/hafta, canlı/demo, pencere değişimi, bozuk kayıt ve abonelik temizliği. Taklit depolamada gerçek store; koru. |
| `src/components/duration-segments.test.tsx` | E; süre parçaları, sıfır/saniye ve görünür metin. Küçük ama ortak süre sunumunda regresyon yakalar; koru. |
| `src/components/plan-editor.test.tsx` | K/E/İ; toplam/fark hassasiyeti, Tamamla/Ayarla/kapasite, reset, tamamlanmış/izinli/kilitli gün ve kontrol sırası. İkon/title tekrarları temizlendi; davranış grupları korundu. |
| `src/components/plan-time-input.test.tsx` | E; bölüm girişi/silme, rakam belirsizliği, eksik/geçersiz değer, yapıştırma ve ok tuşu/gece yarısı. Gerçek giriş geçiş yardımcıları; DOM odak kabulü değil, koru. |
| `src/components/plan-time-planner.test.tsx` | E/İ; tek giriş/çıkış seçimi, karşı saat, Türkçe ek, gün/hafta sınırı, yuvarlama, boş/devre dışı durum. İç düğüm yapısı gevşetildi; koru. |
| `src/components/attendance/day-flow.test.tsx` | K/E; kayıtsız/eski/belirsiz/canlı durum, Şimdi/Son çıkış, hedef konumu, saniye ve tarih. Statik çıktı; konum oranları kullanıcıya doğru zamanı sunma sözleşmesi, koru. |
| `src/components/attendance/report-table.test.tsx` | E; gelecek/izinli/kayıtsız satır, süre ve ayrıntı/uyarı. Gerçek tablo çıktısı; koru. |
| `src/components/dashboard/pofi-panel.test.tsx` | E; Pofi durumu, görünür metin/eylemler. Statik bileşen; içerik üretiminden farklı sunum riski, koru. |
| `src/components/dashboard/weekly-total.test.tsx` | K/E; kayıtsız/belirsiz günü sıfır çalışma sanmama, kayıt/hedef oranları ve erişilebilir gezinme. Gerçek cetvel; davranış gruplarını koru. |
| `src/components/meals/calendar-position.test.ts` | E; takvim konumlandırma ve ekran sınırları. Gerçek geometri hesabı; tarayıcı yerleşimi değil, koru. |
| `src/components/meals/menu-height.test.ts` | E; menü yüksekliği/taşma hesabı. Gerçek yardımcı ve sınır girdileri; CSS kabulü değil, koru. |
| `src/components/mini/mini-dashboard.test.tsx` | K/E; yükleniyor/bağlantısız/hata, canlı hedef/kalan/aşan, tamamlanma, izin ve hafta. Gerçek Mini sunumu; effect/native pencere kabulü değil, koru. |
| `src/demo/navigation.test.ts` | E; demo tarih/hafta ve gezinme sınırları. Gerçek demo davranışı; canlı hesap akışına eşdeğer sayılmaz, koru. |

### Yardımcılar, içerik ve masaüstü uygulama akışları

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `src/lib/analytics.test.ts` | K/E; olay alanları, izin/veri sınırı, kimlik yaşam döngüsü ve filtreleme. Taklit dataLayer ile gerçek gönderim kodu; canlı GA4 kanıtı değil, koru. |
| `src/lib/pdks-failure.test.ts` | K; hata sınıfı, kullanıcı metni ve toparlanma kararları. Gerçek hata eşleme; koru. |
| `src/lib/session-heartbeat.test.js` | K/E; yenileme, aralık, iptal ve oturum hatası. Taklit taşıma/zaman, gerçek döngü; koru. |
| `src/lib/session-response.test.ts` | K; yanıt/oturum ayrımı ve geçersiz yanıt. Gerçek protokol sınırı; koru. |
| `src/lib/telegram-input.test.ts` | K; token/chat girdisi ve geçersiz/sınır değerler. Basit doğrulamalar yetki/taşıma sınırını korur; koru. |
| `src/lib/meals/commentary-catalogue.test.ts` | E; yorum kataloğu bütünlüğü ve kapsadığı durumlar. Gerçek içerik sözleşmesi; koru. |
| `src/lib/meals/commentary-selection.test.ts` | E; deterministik seçim, çeşitlilik ve tekrar sınırları. Gerçek seçici; aynı fonksiyonu tekrar çağırma burada kararlılık sözleşmesi, tautoloji değil. |
| `src/lib/meals/commentary.test.ts` | E; menü/tarih durumundan doğru yorum üretimi. Sabit senaryolu gerçek yorumlayıcı; koru. |
| `src/lib/meals/dates.test.ts` | K/E/B; yemek tarihi ve takvim seçimi. Aynı İstanbul sınırı tekrarı kaldırıldı; diğer seçim/sınır grupları korundu. |
| `src/lib/meals/presentation.test.ts` | E; menü öğesi, etiket ve boş durum sunumu. Parser'dan farklı tüketici riski; koru. |
| `src/lib/meals/response.test.ts` | K/E; taşıma yanıtı/hata/bozuk içerik. Gerçek yanıt doğrulama; koru. |
| `src/lib/pofi-notes/cli.test.ts` | E/D; gerçek CLI listeleme/validate/preview ve desteklenmeyen komut. Katalog boyutu sabitlemesi kaldırıldı; komut sonucu korundu. |
| `src/lib/pofi-notes/notebook.test.ts` | E; hafta/tarih, hesap seçimi, deterministik tekrar, özel gün ve geçersiz anahtar. 8 Aralık tam metni ürün kararıdır; değişken katalog sayısı ile aynı risk değil, koru. |
| `src/lib/pofi-work/catalogue.test.ts` | E; faaliyet kataloğu, uygun seçim ve içerik bütünlüğü. Gerçek katalog tüketimi; koru. |
| `src/desktop/install-notifications.test.ts` | K/E; rapor/hesap/oturum olayları, Mini yenileme yetkisi ve abonelik. Gerçek adaptör, taklit köprü; koru. |
| `src/desktop/notification-runtime.test.ts` | K; zamanlama, tekrar engeli, hata/başarı ve hesap ayrımı. Gerçek runtime, sahte saat/sağlayıcı; koru. |
| `src/desktop/notification-store.test.ts` | K/E; tercih/gönderim kaydı, yeniden yükleme, reset ve hata. İzole disk/gerçek store; koru. |
| `src/desktop/scenario-runtime.test.ts` | K/E; senaryo saati, hesap/rapor ve plan revizyonu izolasyonu. Gerçek runtime; gerçek PDKS yerine kontrollü girdiler, koru. |
| `src/desktop/secure-storage.test.ts` | K; şifreli kayıt ve güvenli depolama hata davranışı. Gerçek adaptör, taklit sistem sağlayıcısı; native anahtarlık kanıtı değil, koru. |
| `src/desktop/telegram.test.ts` | K/E; keşif/gönderim, yanıt ve hata. Gerçek istemci, taklit ağ; canlı mesaj göndermez, koru. |

### Sunucu ve HTTP

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `src/app/api/changelog/route.test.ts` | E; public katalog, eski/bozuk/ağ hatasında paket kataloğu. Gerçek route, fixture ağ; alan katalog testinden farklı sınır, koru. |
| `src/server/analytics-identity.test.ts` | K; kararlı türetilmiş hesap kimliği ve ayrım. Tam hash beklentisi deterministik kimlik sözleşmesidir; koru. |
| `src/server/health.test.ts` | E; sağlık yanıtı ve erişim sınırı. Gerçek HTTP davranışı; koru. |
| `src/server/http.test.js` | K/E; HTTP yardımcıları, istek/yanıt ve hata sınırları. Gerçek sunucu kodu; koru. |
| `src/server/meals-route.test.ts` | K/E; menü endpoint'i, erişim, başarı/hata. Gerçek route, fixture kaynak; koru. |
| `src/server/meals.test.ts` | K/E; gerçek HTML menü ayrıştırma, farklı tablo/başlık/tarih/kalori biçimleri ve kaynak/cache hataları. Yakalanmış içerikte bağımsız beklentiler; çok sayıda biçim aynı risk değil, koru. |
| `src/server/notification-identity.test.ts` | K; bildirim hesap kimliği ve ayrım. Gerçek türetim; koru. |
| `src/server/pdks-concurrency.test.js` | K/E; eşzamanlı kaynak çağrısı, cache ve hesap ayrımı. Gerçek koordinasyon, fixture kaynak; koru. |
| `src/server/pdks.test.js` | K/E; giriş, rapor/kişi/turnike ayrıştırma, notlar, kaynak hatası ve oturum. Gerçek istemci/parser, yakalanmış HTTP; koru. |
| `src/server/routes.test.js` | K/E; giriş → rapor → notlar, oturum geri yükleme/çıkış, erişim ve hata yanıtları. Gerçek route ve iş akışı, fixture PDKS; koru. |
| `src/server/session-manager.test.js` | K; oturum üretme/doğrulama, TTL/iptal/kapasite ve eşzamanlı kullanıcı ayrımı. 2000 oturum gerçek manager/CookieJar ayrımını sınar; sırf sayı büyük diye azaltılmaz. |
| `src/server/session-storage.test.js` | K/E; kaydet/yükle, bozuk veri, erişim/hata ve temizleme. Geçici diskte gerçek depolama; koru. |

### Electron sınırları

Bu gruplar gerçek uygulama modüllerini taklit Electron/sistem adaptörleriyle çalıştırır. Pencere/IPC güveni ve çağrı sırası için değerlidir; işletim sisteminin gerçek görüntüsü, izin diyaloğu ve Spaces kabulü değildir.

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `electron/acceptance-network.test.cjs` | K; kabul modunda dış ağ/analitik engeli ve loopback izni. Gerçek ağ politikası; koru. |
| `electron/background.test.cjs` | E; tray tıkları, ana pencere, gizleme/çıkış ve temizleme. Eşzamanlı çalışmada eklenen üç vaka global kısayol kaydının false/throw/başarı sonucunu, tanıyı ve callback'i gerçek yardımcı üzerinden sınar; koru. |
| `electron/external-links.test.cjs` | K/E/B; izinli HTTPS, yasak URL/şema, footer köprüsü ve tarayıcı hatası. Tek yalın URL tekrarı kaldırıldı; güvenlik sınırları korundu. |
| `electron/menu-clock.test.cjs` | K/E; canlı hedef/geri sayım, aşım, stale/çıkış/gün/oturum ve tercih. Gerçek menü saati; koru. |
| `electron/mini-window.test.cjs` | K/E; tek pencere, konum/boyut, sabitleme, yükleme/renderer hatası, geç eski yükleme, hızlı aç/kapat, ekran ve IPC göndereni. Farklı yarış/izin riskleri; koru. |
| `electron/permissions.test.cjs` | K; pencere/origin/frame ve IPC erişimi, reddedilen izinler. Gerçek yetki kararları; koru. |
| `electron/platform.test.cjs` | E; platforma göre yol/uygulama davranışı. Gerçek seçim; native işletim sistemi kabulü değil, koru. |
| `electron/scenarios.test.cjs` | K/E; senaryo kaynağı, HTTP/hesap ayrımı, native menü/IPC ve geç yanıt. Gerçek adaptör; koru. |
| `electron/server.test.cjs` | K/E; sunucu başlatma/sağlık, hata ve durdurma. Gerçek süreç denetimi, kontrollü süreç/taşıma; koru. |
| `electron/startup.test.cjs` | E; açılış tercihi, sistem API'si ve hata. Gerçek adaptör; koru. |
| `electron/transport.test.cjs` | K; oturum/kimlik, istek/yanıt ve taşıma güven sınırları. Gerçek köprü, fixture yanıt; koru. |
| `electron/updates.test.cjs` | K/E; sürüm/kanal seçimi, paket doğrulama, indirme ve hata. Gerçek güncelleme mantığı, fixture dış kaynak; canlı yayın kanıtı değil, koru. |

### Paketleme, kurulum ve yayın araçları

Fixture dosyaları/geçici depolar ve kontrollü alt süreçler gerçek script fonksiyonlarını çalıştırır. CI/yayın testleri workflow veya komut üretimini ve hata aktarımını sınar; GitHub Actions tetiklemez. Publish testlerindeki fetch ve token fixture'dır, canlı yayın yapmaz. macOS imza/Keychain taklitleri native kabul yerine geçmez.

| Dosya | Sınıf; davranış / sınır ve karar |
| --- | --- |
| `scripts/electron/acceptance-wait.test.cjs` | E; kabul tamamlanması, hata/erken çıkış ve zaman aşımı. Gerçek bekleyici, kontrollü süreç; koru. |
| `scripts/electron/archive.test.cjs` | K/E; arşiv üretme/açma, dosya/izin ve hata sınırları. İzole gerçek dosyalar; koru. |
| `scripts/electron/build.test.cjs` | E; derleme girdileri, komut/sıra ve hata aktarımı. Gerçek orchestration, taklit çalıştırıcı; koru. |
| `scripts/electron/cdp.test.cjs` | E; CDP bağlantı/yanıt ve hata. Gerçek istemci, kontrollü endpoint; koru. |
| `scripts/electron/checkout-site.test.cjs` | K/E; yayın checkout kaynağı, revizyon ve kirli/eksik durum. Geçici Git depolarında gerçek seçim; koru. |
| `scripts/electron/ci-build.test.cjs` | K/E; platform build sırası, kaynak/env, cache ve hata/iptal. Taklit komut sınırı; koru. |
| `scripts/electron/ci-processes.test.cjs` | K; alt süreç iptal/temizlik ve dış süreci koruma. Gerçek süreç sahibi sözleşmesi, izole süreçler; koru. |
| `scripts/electron/install-archive.test.cjs` | K; arşiv yolu/içeriği, yanlış/tehlikeli paket reddi. Geçici paketler ve gerçek doğrulama; koru. |
| `scripts/electron/install-close.test.cjs` | K; kurulumdaki süreci kapatma ve dış süreci koruma. İzole süreç/yol; kullanıcı uygulamalarını hedeflemez, koru. |
| `scripts/electron/install-command.test.cjs` | K/E; kurulum komutu/argüman/yol ve hata aktarımı. Gerçek komut üretimi; koru. |
| `scripts/electron/install-download.test.cjs` | K; sürüm/manifest/indirme doğrulama, hata ve bozuk paket reddi. Fixture HTTP/disk, gerçek indirme kodu; koru. |
| `scripts/electron/install-linux.test.cjs` | K/E; Linux platform seçimi, kurulum sözleşmesi ve Python installer test köprüsü. Gerçek script, izole fixture; koru. |
| `scripts/electron/install-macos.test.cjs` | K/E; macOS kurulum/güncelleme, hata/geri alma ve profil. Sistem adaptörleri taklit; koru. |
| `scripts/electron/linux-installer.test.py` | K/E; gerçek installer'ın çıkarılmış Python kodunda transaction/rollback, profil/yol/hash/mimari ve onay. 19 alt test; Windows'ta fcntl/sandbox/Popen sınırları taklit, native flock atlanır. Koru. |
| `scripts/electron/linux-static-check.test.cjs` | K/E; Linux helper/preload/sunucu/mimari/izin sözleşmesi. Gerçek paket fixture'ı; native izin grubu Windows'ta atlanır, koru. |
| `scripts/electron/macos-static-check.test.cjs` | K/E; uygulama paketi/mimari ve eksik/yanlış dosya reddi. Statik gerçek doğrulayıcı; koru. |
| `scripts/electron/macos-test-processes.test.cjs` | K; macOS süreç seçimi, sahiplik ve temizlik. Taklit süreç tablosu; yanlış uygulamayı kapatma riskini korur. |
| `scripts/electron/macos.test.cjs` | K/E; macOS paket/imza/Keychain, komut sırası ve hata aktarımı. Gerçek araç mantığı, taklit sistem komutları; koru. |
| `scripts/electron/pack-server.test.cjs` | E; standalone sunucuyu paketleme, dosya/çalıştırma ve hata. Geçici dosyalarla gerçek araç; koru. |
| `scripts/electron/package.test.cjs` | K/E; platform paket içeriği, sürüm/mimari ve eksik girdi reddi. Gerçek paket üretimi/fixture; koru. |
| `scripts/electron/prepare-site.test.cjs` | K/E; public sürüm/katalog/kurulum dosyalarını hazırlama, yanlış/eski kaynak reddi. Geçici site ve gerçek araç; koru. |
| `scripts/electron/publish.test.cjs` | K/E; hazırlanan kaynak/revizyon/katalog doğrulama, upload sırası ve hata. Gerçek yayın kodu, taklit fetch; bozuk/değişmiş girdiyi yayına taşımama riskini korur. |
| `scripts/electron/release-notes.test.cjs` | E; sürüm notu ayrıştırma, hedef sürüm ve bozuk/eksik içerik. Gerçek parser; koru. |
| `scripts/electron/standalone.test.cjs` | E; standalone hazırlama ve çalışma dosyaları/sınırları. Geçici paketlerde gerçek araç; koru. |
| `scripts/electron/uninstall.test.cjs` | K; kaldırma kapsamı ve profil koruma. İzole kurulum dizini/fixture; veri kaybını önleyen sınır, koru. |
| `scripts/electron/unix-installer.test.cjs` | K/E; ortak Unix/platform seçimi, argüman/çıkış kodu ve karşı platform kodunu çalıştırmama. Gerçek shell girişi, kontrollü komutlar; koru. |
| `scripts/electron/windows-branding.test.cjs` | E; ürün adı/ikon ve Electron motor sürümünü koruma. Gerçek paket çıktısı, public dağıtım kimliği sözleşmesi; koru. |

## Sayım ve doğrulama

| Ölçüm | Sonuç |
| --- | ---: |
| Başlangıç Bun vaka sayısı | 853 |
| Doğrudan kaldırılan vaka | 8 |
| Birleştirilen test | 2 → 1 (net −1) |
| Denetim sadeleştirmesinden sonra | 844 |
| Eşzamanlı başka çalışmada eklenen vaka | 3 |
| Denetim sonunda yerel Bun vaka sayısı | 847 |
| İncelenen dosya | 104 Bun + 1 Python |

Sayım `.each` ve döngüyle üretilen vakaların açılmış halidir. Python'ın 19 alt testi Bun köprüsünün içinde çalışır; Bun toplamına tekrar eklenmez. Assertion temizliği vaka kaldırma sayısına dahil değildir.

Denetim sonunda Windows'ta yerel tam paket koşusunda **846 geçti, 1 atlandı, 0 hata**. Tür kontrolü başarılı. Ayrı Python koşusu **18 geçti, 1 native flock testi atlandı**; aynı alt paket tam koşudaki köprüde de çalıştı. Windows'ta atlanan Bun vakası Linux paketinin native çalıştırma izni kontrolüdür. Belge/kural mimarisi testi ve yerel dosya bağlantıları da doğrulandı.

Ortam Bun 1.4.4, Git Bash ve gerçek Python executable kullandı; Windows Store Python yönlendirmesi kullanılmadı. Windows'taki Bash/Python seçimi ve yeniden çalıştırma komutları [doğrulama rehberindedir](verification.md#linux-ve-ortak-unix-installer-kabulü).

Denetimin değişiklikleri test ve belgelerdedir. Bu sonuç yeni tarayıcı/DOM etkileşimi, CSS, gerçek PDKS, native Linux/macOS veya dağıtım kabulü sağlamaz. GitHub Actions çalıştırılmadı. Bu sınırlar için mevcut kabul yöntemleri geçerlidir.
