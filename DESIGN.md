---
name: Pofis
description: Mesaiye biraz Pofi.
colors:
  primary: "#6554c0"
  primary-hover: "#5140ab"
  primary-content: "#fcfcfd"
  soft: "#f1eeff"
  accent-text: "#4f3fa0"
  duration-recorded: "#8b7bff"
  duration-estimated: "#c9c2f2"
  dark-duration-recorded: "#8b7bff"
  dark-duration-estimated: "#514a73"
  page: "#f7f8fa"
  sidebar: "#f8f9fb"
  surface: "#fcfcfd"
  subtle: "#f1f3f7"
  border: "#e2e6ee"
  text: "#151821"
  secondary: "#515b6b"
  muted: "#5d6676"
  success: "#167e5f"
  warning: "#ae5b0a"
  error: "#b6494f"
  dark-page: "#17151d"
  dark-sidebar: "#1c1923"
  dark-surface: "#221f2a"
  dark-subtle: "#2b2636"
  dark-border: "#3c3749"
  dark-text: "#f1eff7"
  dark-secondary: "#b8b3c6"
  dark-muted: "#aaa4ba"
  dark-primary: "#b4a5fa"
  dark-soft: "#322a45"
typography:
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "14px"
  metric:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "29px"
    fontWeight: 730
    fontVariantNumeric: "tabular-nums"
rounded:
  control: "8px"
  panel: "12px"
spacing:
  sm: "8px"
  md: "16px"
  panel: "24px"
---

# Design System: Pofis

## Görsel kaynak ve yön

Gündelik mesaiyi sakin, anlaşılır ve yargılamayan bir dille sunan çalışma ekranı. “Mesaiye biraz Pofi.” Açık yüzeyler, ölçülü lavanta ve özgün Pofi karakteri birlikte kullanılır. Sistem sayısal gerçeği söyler; Pofi ona eşlik eder.

16 Ekim 2026 kullanıcı kararıyla ekran yerleşimi ve bileşen görünümleri `pofis-1.0.0-docker-source.zip` kaynağından taşındı. [Bileşen eşlemesi ve sözleşmeler](docs/ui-source-migration.md) güncel sahipleri gösterir. Önceki [dashboard referansı](docs/screenshots/dashboard-reference.png) tasarım geçmişidir. Marka kaynağı `extras/pofis-brand-kit`, dil kaynağı [Pofi ton rehberidir](docs/brand/pofi-tone-guide.md).

## Tema ve tipografi

Görseller standart `<img>` ile doğrudan statik dosyadan sunulur; `next/image` kullanılmaz ve Next.js görsel optimizasyonu kapalıdır. Boyut öznitelikleri yerleşim alanını korur; giriş ve paneldeki ana Pofi görseli `fetchPriority="high"` kullanır.

[globals.css](src/app/globals.css) semantik renkleri `light-dark()` ile tanımlar. `html[data-theme]` açık/koyu/sistem tercihini taşır. [pofis.css](src/app/pofis.css) kaynak yerleşim, tipografi, kart ve duyarlı ekran stillerini içerir. [modal.css](src/app/modal.css) ortak dialog sahibidir; [oda CSS](src/components/pofi/room.css) Pofi etkileşimlerini tanımlar. Bu sıra ana yerleşimden yüklenir.

Geist Sans yerel paketten gelir. Sayısal süreler tabular gösterilir; saat/dakika baskın, saniye ikincildir. Birimli sürelerde yalnız sıfırdan büyük birimler yazılır; `0 sa 03 dk 31 sn` yerine `3 dk 31 sn` gösterilir. Tam sıfır `0 sn`, bilinmeyen süre çizgiyle gösterilir. Saat biçimindeki `HH:mm:ss` değerleri korunur. Kaynak kart tipografisi ve mobil küçülme kuralları kullanılır. Türkçe tarih aralıkları İstanbul takviminden gelir; başka yıl seçildiğinde yıl görünür.

## Yerleşim

Masaüstünde 230px sol menü, en fazla 1530px ana içerik alanı vardır. Güncel haftanın üst satırında gün akışı ve haftalık toplam bulunur. Ardından 1,65:1 oranında akordeon giriş–çıkış raporu/Pofi satırı gelir. Pofi kartı üstte hizalanır ve raporun yüksekliğine esnemez. Güncel haftada grafik ve ikinci bir rapor bulunmaz. Geçmiş haftada dört metrik ve alt alta haftalık grafik/rapor tablosu gösterilir.

1170px altında orta/alt satırlar tek sütuna iner. 1000px altında sol menü üstte açılır menüye dönüşür. 700px altında güncel hafta metrikleri tek sütundur; metrik kartları ve sayı alanları sabit asgari yükseklik ayırmaz, içeriklerine göre boyutlanır. Mobilde gün akışının lejantı sığdığı sürece yan yana kalır. 600px altında rapor tablosu etiketli gün kartlarına dönüşür. Diğer kırılımların ve boşlukların yürütülen kaynağı CSS'dir.

## Sürelerin gösterimi

Gün akışı ortak [DurationTrack](src/components/primitives.tsx) kullanır. [current-contracts.css](src/app/current-contracts.css) üç bilgiyi sunar:

1. Kayda dayalı süre: `#8b7bff`.
2. Ek anlık tahmin: açık temada `#c9c2f2`, koyuda `#514a73`.
3. Hedef: nötr çizgi; kalan alan yüzey tonudur.

İki bölüm düz renktir. Süre bölümlerinin hesap sahibi [süre kuralıdır](docs/rules/duration.md). Hedefler [plan sahibinden](docs/rules/work-plan.md), ölçek [ilerleme sahibinden](docs/rules/progress.md) gelir. Belirsiz değer çizgi ve durum metniyle gösterilir.

Haftalık toplam kartı toplamı ve hedefi aynı satırda “toplam / hedef” olarak gösterir; hedef daha küçük ve ikincil renktedir, yüzde başlıktadır. Altındaki cetvelde plandaki her açık gün eşit genişliktedir; her bölüm yalnız o günün kayıtlı ve tahmini süresini ortak plan sahibinden gelen etkin günlük hedefe göre gösterir. Hedef aşımı sonraki güne taşan bir dolgu üretmez. Sıfır süreli açık gün görünür kalır; süre yoksa bölüm boştur. Gün adı, gerçekleşen süre ve günlük hedef ortak [Tooltip](src/components/tooltip.tsx) bileşeniyle sunulur; eksik süre sıfır olarak adlandırılmaz. Haftalık yüzde toplam hedef üzerinden hesaplanır. Gün adları bölümlerin altında yer alır; güncel haftada kalan/aşan süre kartın altına yaslanır. [Bileşen](src/components/dashboard/weekly-total.tsx) demo ve canlı ekran için ortaktır.

Haftalık grafik kaynak sütun yapısını kullanır: geçmiş günlerde `--chart-past`, bugün `--accent`; hedef çizgisi/lejantı bulunmaz. Sütun genişliği `min(51%, 49px)`, üst köşeler 5px'tir. [Ölçek sahibi](docs/rules/progress.md) yalnız gösterilen süreleri kullanır. Boş gün sıfır yüksekliktedir. Canlı günde kayıtlı bölümün üstüne anlık tahmin yerleşir; tooltip kayıtlı süre ve tahmini toplamı gösterir. Lejant “Günlük kayıtlı süre”dir.

## Etkileşimler

- **Metin seçimi:** butonlarda ve `.button-link` eylem bağlantılarında metin seçimi kapalıdır. Normal metin bağlantıları, başlıklar, açıklamalar, form girdileri ve teknik ayrıntılar seçilebilir kalır. Bu davranış [ortak CSS](src/app/globals.css) sahibindedir; klavye odağını ve ekran okuyucu etiketlerini değiştirmez.

- **Hafta seçici:** aylar üzerinden gezinilen native popover, kesişen pazartesi haftaları, güncel haftaya dönüş. Gelecekteki haftalar devre dışıdır. Demo haftaları yakalama aralığıyla sınırlıdır. Seçim kapanır ve odağı tetikleyiciye verir.
- **Demo gün seçici:** beş hafta içi gün düğmesi ve anlık ek süre sürgüsü; seçili gün lavanta tonuyla belirtilir. Dar ekranda günler tek satırda, açıklama alt satırda gösterilir. Tarih/saat ve sanal süre davranışı [demo sözleşmesindedir](docs/demo.md).
- **Ayarlar:** [PlanEditor](src/components/plan-editor.tsx), “Varsayılan plan” ve tarih aralığı etiketli hafta sekmelerini kullanır. Hesap ve kayıt davranışı [plan sözleşmesindedir](docs/rules/work-plan.md).
  - **Gün kartları:** Pazartesi–cuma tek sırada, 58px yüksekliğinde gösterilir. Açık gün nötr kâğıt zemini/ana metin; tamamlanan gün hafif lavanta (#F6F4FF, #DDD6FE, #4F3FA0) ve kilit; kapalı gün nötr ton (#F8F9FB, #E2E6EE, #64748B) kullanır. Seçili gün #EDE9FE zemin, 1.5px #6554C0 çerçeve ve #3B0764 metinle ayrılır. Koyu tema aynı durumların tema karşılıklarını kullanır. Süreler 12px/500’dür. Özel plan noktası hafta sekmesindedir.
  - **Gün düzenleme:** Gün adı ve hemen sağındaki sabit 56px genişlikli düğme solda, stepper sağda gösterilir. Haftalık sekmede “İzin / Aç”, varsayılan sekmesinde “Kapat / Aç” kullanılır. Düğmenin erişilebilir adı ilgili günü ve eylemi belirtir. Süre alanı, açık/kapalı durumda aynı minimum genişliği ve yüksekliği korur. Günlük kartın iç boşluğu 12px 16px’tir. Hafta kartı ve stepper aynı gereken süreyi saat/dakika olarak gösterir; erişilebilir adı gün ve çalışma süresini belirtir. Varsayılan sekmesinde kompakt şablon süreleri kullanılır. İzinli günde kartta ve stepper yerinde “İzinli”, şablondan kapalı günde süre alanında “Kapalı” görünür. “Açık günlere uygula” gerektiğinde stepper’ın hemen solunda gösterilir. Kilitli günde gerçekleşen süre metin, kayıtlı plan ve farklıysa varsayılan süre alt bilgi olarak gösterilir.
  - **Haftalık eylemler:** Ana toplam “Toplam”, farklı beklenen toplam “Beklenen toplam” etiketini taşır. İzin sonrası referans hedef farklıysa üzeri çizili gösterilir. Gün düzenleme alanı #F8F9FB zemin, 1px #E2E6EE kenar ve 12px yarıçap kullanır. Haftalık bar 10px üst aralık, 10px 14px iç boşluk, #F5F2FF zemin, 1px #DDD6FE kenar ve 10px yarıçap kullanır; koyu temada aynı yüzeyin tema karşılıkları uygulanır. Soldaki 13px/500 metin hedefe kalan/aşan süreyi belirtir. Sağda izin sonrası referans hedefi belirten tamamlama düğmesi ve uygulanabilir sıfırlama bulunduğunda “Sıfırla” yer alır. Tamamlanmamış günler şablona döndüğünde ve hedef sıfırlama sonucuyla eşleştiğinde sıfırlama tamamlanmıştır; haftalık bar uygulanabilir eylem olduğunda görünür. Düğmeler 12px/600, 30px yükseklik ve 7px yarıçap kullanır; tamamlama mor, sıfırlama açık yüzey ve lavanta kenardır.
  - **Kontroller ve mobil:** Toplam/stepper 13px/600; eksi/artı aynı nötr zemindedir. [Plan CSS](src/components/plan-editor.css) günlük kontrolleri farede 32px, haftalık düğmeleri 30px, dokunmatikte 44px tutar. Dar alanda günler tek sırada kalır; sayı ile birimi birlikte satır kırar. Gün bilgisi, kontroller ve haftalık eylemler satır kırabilir. Tam süreler erişilebilir etiketlerde ve üzerine gelindiğinde korunur.
  - **Sıfır süreli açık gün:** Otomatik hesapla süresi sıfıra inen açık gün, kaydedildikten sonra da kartta ve stepper'da `0 sa` gösterir. Açık gün renkleri, süreyi artırma ve “İzin” eylemi korunur.
- **Rapor:** güncel haftada bağımsız açılan native akordeon günlerinden oluşur. Kapalı satır gün, süre ve küçük ilk giriş/son çıkış özetini gösterir; canlı sürede “Anlık”, diğer sürelerde “Kayıtlı süre” etiketi bulunur. Belirsiz kayıt uyarısı kapalı satırda da görünür. Hedef farkı, kayıtlı süre, kayıt durumu ve ham hareketler ayrıntıdadır. Kaydı olmayan günlerde de durum ayrıntısı açılabilir. Geçmiş haftada altı sütun korunur. Her günde bağımsız açılan kronolojik ham geçiş listesi bulunur. Cumartesi/pazar yalnız ham geçiş veya kayıtlı/canlı süre verisi varsa görünür. [Kayıt durumu](docs/rules/record-status.md) gün akışıyla ortak etiketi kullanır. Hedef altı süre ayrı fark alanında kalır; belirsiz geçişte bilinen kayıtlı süre korunur, hedef farkı çizgiyle gösterilir. Kayıt ayrıntıları rapor satırından açılır.
- **Modal:** native dialog, varsayılan olarak kapatma düğmesine başlangıç odağı, Escape ve açan kontrole odak dönüşü. Plan modalında başlangıç odağı başlıktadır; hiçbir düzenleme düğmesi açılışta seçili odak görünümü almaz. Klavye odağı iç kenarla korunur; plan eylemlerinde alt çizgi veya focus-within halkası kullanılmaz. İçerik kendi içinde kayar. Mobil tutamağı aşağı sürükleyerek kapatılır.
- **Pofi:** kanonik 156px durum görseli, kaynak rozet/metin düzeni, maskota basarak oda. Albüm, not defteri, kart, Pofi mesaisi ve sürprizler mevcut ortak sahipleri kullanır.
- **Tema:** kaynak çizimli/animasyonlu switch ve ortak tarayıcı tercihi. Reduced-motion CSS hareketi sınırlar.
- **Odak:** kullanıcı tercihiyle ton, metin alt çizgisi ve 2px iç kenar kullanılır. Dış outline eklenmez. Rapor akordeonunda metin rengi ve alt çizgisi odakta değişmez; klavye odağı satırın tamamını çevreleyen 2px iç kenarla gösterilir. Fare tıklaması klavye odak kenarını göstermez.
- **Grafik tooltip'i:** ortak [Tooltip](src/components/tooltip.tsx) bileşenini kullanır. Sütunun tamamı fare/klavye tetikleyicisidir; konum görünen tahmin bölümünün üstünden ölçülür. Ortalanan kutu ekran kenarlarında kayar, üstte yer yoksa aşağı açılır. Escape kapatır. Konum hesabı [tooltip-position.ts](src/components/tooltip-position.ts), tema stilleri [tooltip.css](src/components/tooltip.css) sahibindedir.
- **Gün akışı / Zaman rayı:** [DayFlow](src/components/attendance/day-flow.tsx) geçen süreyi “Bugünkü mesai” başlığıyla gösterir; kayıtlı ve anlık tahmin bölümlerini tek rayda birleştirir. Hedefe kalan/aşan süre, geçen sürenin yanında küçük bir bilgi olarak yer alır; ayrı hedef çıkış kartı bulunmaz. Uçta kesik dikey çizgi ve metin genişliğinde lavanta etiket bulunur: canlı günde “Şimdi”, hedefi aşan kapalı günde “Çıkış”, diğer kapalı günlerde “Son kayıt”. Hedef çıkış, rayın altında nötr açık zeminli “Hedef çıkış” etiketi, ikincil metin renginde saat ve nötr kesik bağlantıyla gösterilir. Şimdi/çıkış etiketi lavanta vurgusunu korur. Haftalık yüzde dolgusuz, mor metin renginde ve 700 ağırlığındadır; masaüstünde 12px, dar ekranda 11px gösterilir. Hedef bağlantısı rayın üst kenarından başlar. Hedef satırı raya göre mutlak konumlanır; lejant için çakışmayı önleyen boşluk ayrılır. Etiketler çizgiye ortalanır, rayın kenarında içeride kalacak kadar kayar; çizgiler gerçek zaman konumlarını korur. Eksen saatleri kesik çizgilerin üzerinde opak kart zeminiyle okunur. Lejant “Kayıtlı” ve “Tahmini” etiketleriyle süre bölümlerini adlandırır; sayısal süreleri tekrarlamaz. Haftalık kartın hedefe kalan satırı “Kalan” olarak adlandırılır. Canlı günde başlık yanında durum metni gösterilmez. Eksen ilk girişten son kayıt/şimdi ile hedefin en ilerisine uzanır; hedef eksenin sonundaysa saat yalnız hedef etiketinde gösterilir. Saatler ray üzerinde gösterilir; altta tekrarlayan saat özeti bulunmaz. [Stiller](src/components/attendance/day-flow.css) tema belirteçlerini kullanır. Demo ve canlı ekran aynı bileşeni kullanır.
- **Yardımcı ekranlar:** kaynak giriş kartı, hata/tanı görünümü, yükleme maskotu, 404 ve sürüm notu aynı shell ve temayı kullanır. Yanlış giriş bilgileri şifre alanının altında kısa metin ve iki alanda ince hata kenarıyla gösterilir; odak şifreye döner, kullanıcı adı açık formda korunur. Sistem hataları giriş kartının yerini normal hata ekranıyla alır; kart içinde hata kartı bulunmaz. “Girişe dön” boş formu açar, giriş isteğini tekrarlamaz. Oturum bitişi formda kutusuz, nötr durum metniyle sunulur. Pofi yanlış bilgide normal, sistem hatasında hata duruşunu kullanır; beklenen giriş/oturum hataları teknik tanı içermez. Sistem hatasının teknik ayrıntıları İz kaydı düzeninde sürekli görünür. Eski rapor varsa hata kısa bildirim olarak raporun üzerinde kalır; rapor yoksa tek hata görünümü sunulur. Her yeniden deneme hatayı üreten işlemi çalıştırır. [Hata sözleşmesi](docs/pdks-errors.md).
- **Tam sayfa hata hiyerarşisi:** lavanta Pofi sahnesinde başlık, kısa açıklama ve işleme uygun ana düğme; masaüstünde metin solda ve Pofi sağda, dar ekranda Pofi üsttedir. Teknik ayrıntılar altta çerçevesiz İz kaydı düzeninde sürekli görünür. Demo ve canlı ekranlar aynı [RequestError](src/components/request-error.js) bileşenini ve stillerini kullanır.
- **Teknik ayrıntı yerleşimi:** “Sorunun nedeni” açıklama, kod ve kısa İstanbul zamanını; “İstek ayrıntıları” Pofis API ve PDKS alanlarını kendi altında toplar. Boş kaynak grubu çizilmez; API HTTP durumu kaynak yanıtı olarak sunulmaz. Alanlar yalnız boşlukla gruplanır, uzun değerler satır kırar. [Tanı bileşeni](src/components/request-error-details.tsx) izinli veriyi sunar; kopyalama özgün zaman damgasını korur.

Bildirim hatalarında Pofi Sahne düzeni kullanılır: lavanta yüzeyde mesaj ve işleme uygun eylem, sağda küçük Pofi, altta açık İz kaydı. Canlı ekranlar ve demo ortak RequestError bileşenini kullanır; alternatif tasarımlar tutulmaz.

Yerel ayar hataları ve eski rapor bilgisi [InlineNotice](src/components/inline-notice.tsx) ile kompakt gösterilir. Depolama sorunu nötr yüzeyde uyarı simgesiyle, eski rapor lavanta durum satırıyla sunulur; teknik tanı ve büyük Pofi sahnesi kullanılmaz. Plan doğrulaması ilgili alanın altında kalır. Not defterinde içerik eksikliği tarih ve gezinmeyi koruyan nötr metindir. 404 ortak lavanta sayfa sahnesini, Mesaim'e dönüşü ve mevcut Pofi sürprizini kullanır. Bu alanların sözleşmesi [hata rehberindedir](docs/pdks-errors.md#uygulama-içi-hata-ve-yerel-bildirimler).

Ortak tooltip portal üzerinden çizilir; kart taşma sınırlarından bağımsızdır. Fare ve klavye odağıyla açılır; dokunmada açılıp kapanır. Escape ve dışarı dokunma kapatır. Ekran kenarlarında yatay kaydırma ve üst/alt yön seçimi uygulanır; kaydırma, boyut değişimi ve canlı içerik güncellemesinde konum yeniden ölçülür. Haftalık cetvel ve canlı haftalık grafik aynı bileşeni kullanır.
