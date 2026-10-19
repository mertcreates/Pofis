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

## Görsel yön ve sahipler

Sakin, anlaşılır ve kullanıcıyı yargılamayan mesai ekranı. Açık yüzeyler, ölçülü lavanta ve özgün Pofi karakteri kullanılır. Sistem sayısal gerçeği söyler; Pofi ona eşlik eder.

Görsel kararlar bu belgede yönetilir. [Arayüz sahipleri](docs/architecture/ui-components.md), [görsel kaynaklar](docs/brand/assets.md) ve [ton rehberi](docs/brand/pofi-tone-guide.md) ilgili kod ve içerik sahiplerini gösterir.

| Alan | Yürütülen kaynak |
| --- | --- |
| Semantik renkler, metin seçimi ve ortak odak | [globals.css](src/app/globals.css) |
| Yerleşim, kartlar ve duyarlı kırılımlar | [pofis.css](src/app/pofis.css) |
| Süre ve grafik görünümü | [current-contracts.css](src/app/current-contracts.css) |
| Dialog | [modal.css](src/app/modal.css) |
| Plan kontrolleri | [plan-editor.css](src/components/plan-editor.css) |
| Pofi odası | [room.css](src/components/pofi/room.css) |

Renkler `light-dark()` ve semantik CSS değişkenlerinden gelir. `html[data-theme]` açık/koyu/sistem tercihini taşır. Geist Sans yerel paketten yüklenir. Statik görseller boyutları belirtilmiş standart `<img>` ile sunulur; Next görsel optimizasyonu kapalıdır. Ana giriş/panel Pofi görseli yüksek yükleme önceliği kullanır. Hareketler reduced-motion tercihine uyar.

## Yerleşim

- **Giriş ve hata:** üst marka ve içerik ortak 920px alana hizalanır. Kenar boşluğu masaüstünde 32px, 780px altında 16px'tir.
- **Güncel hafta:** üstte günün akışı ve haftalık toplam; altında akordeon giriş–çıkış raporu ve Pofi. Pofi kartı üstte hizalanır, raporun yüksekliğine esnemez.
- **Geçmiş hafta:** güncel haftayla aynı iki sütunlu üst satırda günlük dağılım grafiği ve haftalık toplam; altında açılır günlük kayıt raporu. Hedef ve hedef farkı toplam kartında bir kez gösterilir. Toplam kartı içeriği kadar yükselir; grafiğe esnemez. Geçmiş haftada günlük cetvel gösterilmez; mobilde toplam kartı grafikten önce gelir.
- **Duyarlı düzen:** masaüstünde 230px sol menü ve en fazla 1530px ana alan; 1170px altında orta satır tek sütun, 1000px altında menü üstte açılır, 700px altında üst kartlar tek sütun olur. Kart yüksekliği içeriği izler. Diğer ölçüler CSS sahibinde tutulur.

Canlı ekranda [ReportContent](src/components/dashboard/report-content.tsx) güncel haftanın saniyelik saatini, dış [Dashboard](src/components/dashboard.tsx) İstanbul gün değişimini yönetir. Gizli sekmeden dönüşte gerçek saat okunur. Demo kendi sanal saatini sağlar. Ayarlar ve Pofi odası doğrudan yüklenir.

## Sayılar ve süreler

Sayısal veriler tabular gösterilir. Saat/dakika baskın, saniye ikincildir. Birimli süreler `8 sa 3 dk 31 sn` biçimindedir; sıfır birimler atlanır, tam sıfır `0 sn`, bilinmeyen süre çizgiyle gösterilir. Giriş/çıkış saatleri `HH:mm:ss` biçimini korur. Plan kontrolleri dakika hassasiyetinde kısa gösterim kullanır; sıfır süreli açık gün `0 sa` olarak görünür. Tarihler İstanbul takviminden gelir; seçili aralık başka yıldaysa yıl görünür.

### Günün akışı

[DayFlow](src/components/attendance/day-flow.tsx), geçen süreyi “Bugünkü mesai”, yanındaki küçük farkı “Hedefe kalan / Hedefin üzerinde” olarak gösterir. Tarih başlık yanındadır; canlı durum ve altta tekrarlayan saat özeti gösterilmez.

- Ortak [DurationTrack](src/components/primitives.tsx): kayıtlı bölüm mor, ek tahmin açık lavanta ve düz dolgu; hedef nötr çizgidir. Lejant “Kayıtlı / Tahmini” der, süreleri tekrarlamaz.
- Uç etiketi canlı günde “Şimdi”, hedefi aşan kapalı günde “Çıkış”, diğer kapalı günlerde “Son kayıt” olur. Lavanta etiket metin kadar geniştir; kaydırma tutamacı/top bulunmaz.
- “Hedef çıkış” saat ve nötr kesik bağlantıyla rayın altında yer alır; bağlantı rayın üst kenarından başlar. Satır mutlak konumlanır, lejant için alan ayrılır.
- İşaret çizgileri gerçek zaman konumunu korur; etiketler rayın kenarlarında içeri kayar. Eksen saatleri opak kart zeminiyle okunur. Eksen ilk girişten son kayıt/şimdi ile hedefin en ilerisine uzanır; hedef sondaysa saat yalnız hedef etiketinde görünür.

[Süre](docs/rules/duration.md), [hedef](docs/rules/work-plan.md) ve [ölçek](docs/rules/progress.md) hesapları kural sahiplerinden gelir. [Yerleşim stilleri](src/components/attendance/day-flow.css) demo ve canlıda ortaktır.

### Haftalık toplam ve grafik

[WeeklyTotal](src/components/dashboard/weekly-total.tsx), toplam ve sakin hedefi aynı satırda “toplam / hedef” olarak sunar. Yüzde başlıkta dolgusuz mor metindir; kalan/aşan süre alta yaslanır. Hedefe tam eşit toplam “Hedefle eşit” olarak sunulur. Yaklaşık yüzde ve farkın erişilebilir etiketleri kayıt eksikliği veya belirsizliğini açıklar. Tamamlanmış haftada hedefin altındaki süre “Hedefin altında” etiketiyle gösterilir. Eksik veya belirsiz kayıtlarda geçmiş haftanın farkı ve yüzdesi yaklaşık işaretiyle sunulur; güncel haftada fark gösterilmez.

Yalnız güncel haftada gösterilen cetvelde her açık gün eşit genişliktedir. Bölümler kendi etkin günlük hedeflerine göre dolar; günlük hedefler farklıysa eşit bölümler haftalık toplamın eşit paylarını temsil etmez. Hedef aşımı sonraki bölüme taşmaz. Sıfır süreli açık gün görünür kalır; bilinmeyen süre sıfır diye adlandırılmaz. Gün adı, süre ve hedef ortak tooltip'te görünür.

[Haftalık grafik](src/components/attendance/week-chart.tsx) geçmiş haftada günlük süre sütunlarını gösterir. Geçmiş günler `--chart-past`, bugün `--accent` kullanır; hedef çizgisi yoktur. Ölçek yalnız görünen sürelerden gelir. Canlı girdi verildiğinde kayıtlı bölümün üstüne açık tahmin eklenir; tooltip kayıtlı süre ve canlı toplamı ayırır. Lejant “Günlük kayıtlı süre”dir.

## Gezinme ve kontroller

- **Giriş:** şifre alanının sağındaki göz düğmesi şifreyi gösterir/gizler. Başlangıçta ve form gönderildiğinde şifre gizlidir. Düğme mevcut ikon, tema ve klavye odağı dilini kullanır; erişilebilir adı yapacağı eylemi söyler. Oturum doğrulanırken alan ve düğme devre dışıdır.
- **Hafta seçici:** aylık native popover, ayla kesişen pazartesi haftaları ve güncel haftaya dönüş. Gelecek haftalar kapalıdır; demo yakalama aralığıyla sınırlıdır. Seçim kapanır ve odağı tetikleyiciye döndürür.
- **Demo:** gün seçimi, sanal saat, hata ve bildirim senaryoları [demo rehberinde](docs/demo.md) yönetilir. Karşılaştırma demoları karar sonrasında temizlenir; durum demoları korunur.
- **Plan:** [PlanEditor](src/components/plan-editor.tsx), varsayılan plan ve tarih etiketli hafta sekmelerini kullanır; özel hafta noktası sekmededir. Pazartesi–cuma kartları tek sırada kalır. Açık gün nötr, kilitli gün lavanta ve kilit ikonlu, kapalı gün sakin nötr, seçili gün mor kenarlıdır.
- **Plan düzenleme:** gün adı/İzin–Aç eylemi solda, stepper sağdadır. Varsayılan sekmesinde Kapat–Aç kullanılır. Haftalık kart ve stepper aynı gereken süreyi gösterir. İzinli gün “İzinli”, şablondan kapalı gün “Kapalı”, sıfır süreli açık gün `0 sa` der. Kilitli gerçekleşen süre düzenlenmez; kayıtlı plan ve farklıysa şablon alt bilgide görünür.
- **Plan toplamları:** ana toplam hedeftir; beklenen toplam farklıysa ayrıca gösterilir. Tamamla ve Sıfırla uygulanabilir olduklarında görünür; kapasite yetmiyorsa açıklama sunulur. [Hesap ve kayıt sözleşmesi](docs/rules/work-plan.md) bu belgedeki görsel kararlardan ayrıdır.
- **Mobil plan:** kontroller ve eylemler satır kırabilir; sayı ile birimi birlikte kalır. Dokunmatik kontroller 44px olur; diğer ölçüler plan CSS sahibindedir. Tam süreler erişilebilir etiketlerde korunur.
- **Rapor:** güncel ve geçmiş hafta günleri bağımsız native akordeondur. Kapalı satır gün, süre ve ilk giriş/son çıkış özetini gösterir; belirsizlik uyarısı görünür kalır. Hedef farkı, kayıtlı süre, durum ve ham hareketler ayrıntıdadır. Hafta sonları yalnız kayıt/süre verisi varsa görünür. Ham liste ilk açılışta oluşturulur ve korunur. [Kayıt durumu sözleşmesi](docs/rules/record-status.md) ortaktır.
- **Pofi:** 156px durum görseli ve ortak başlık/mesaj düzeni; maskota basınca oda açılır. Albüm, notlar, kart, Pofi mesaisi ve sürprizler kendi sahiplerini kullanır.

## Odak, modal ve tooltip

Buton ve `.button-link` metni seçilmez; normal bağlantılar, açıklamalar, girdiler ve teknik ayrıntılar seçilebilir. Klavye odağı ton, alt çizgi ve 2px iç kenarla gösterilir; dış halka eklenmez. Rapor akordeonunda metin rengi ve alt çizgi değişmez, iç kenar tüm satırı çevreler. Fare tıklaması klavye halkasını göstermez.

Ortak [Modal](src/components/modal.js) native dialog kullanır: Escape, kapatma düğmesi, açan kontrole odak dönüşü ve içeride kaydırma. Varsayılan başlangıç odağı kapatma düğmesinde, plan modalında başlıktadır. Mobil tutamak aşağı sürükleyerek kapatır.

Ortak [Tooltip](src/components/tooltip.tsx) portal üzerinden çizilir. Fare/klavye odağıyla açılır; dokunmayla açılıp kapanır. Escape ve dışarı dokunma kapatır. Ekran kenarında yatay kayar, üstte yer yoksa alta açılır. Kaydırma, boyut ve canlı içerik değişiminde yeniden ölçülür; dinleyiciler içerik değişiminde yeniden kurulmaz. Grafik sütununun tamamı tetikleyicidir; konum görünen bölümden ölçülür. [Konum hesabı](src/components/tooltip-position.ts) ve [tema stilleri](src/components/tooltip.css) ortaktır.

## Hata ve yardımcı ekranlar

Giriş, hata, yükleme ve 404 ortak shell/temayı kullanır. Beklenen giriş hatası formda; sistem hatası normal hata ekranında; rapor varken yenileme hatası rapor üzerinde sunulur. Yerel plan/tema sorunları kompakt [InlineNotice](src/components/inline-notice.tsx) kullanır.

[RequestError](src/components/request-error.js) lavanta Pofi sahnesini, işleme uygun eylemi ve sürekli açık İz kaydını sunar. Tam sayfada Pofi masaüstünde sağda, dar ekranda üsttedir; bildirimde küçük Pofi sağda kalır. Teknik ayrıntılar kutusuz gruplar kullanır, uzun değerler satır kırar. Demo ve canlı ekranlar aynı bileşenleri kullanır.

Hata sınıfları, form odağı, eski rapor, kopyalama ve yeniden deneme davranışı [hata sözleşmesinde](docs/pdks-errors.md); doğrulama yöntemi [doğrulama rehberinde](docs/verification.md) yönetilir.
