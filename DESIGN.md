---
name: Pofis
description: Mesaiye biraz Pofi
colors:
  primary: "#6554c0"
  primary-hover: "#5140ab"
  primary-content: "#fcfcfd"
  soft: "#f1eeff"
  accent-text: "#4f3fa0"
  duration-recorded: "#6554c0"
  duration-estimated: "#9182ba"
  dark-duration-recorded: "#b4a5fa"
  dark-duration-estimated: "#8278ab"
  page: "#f7f8fa"
  sidebar: "#fcfcfd"
  surface: "#fcfcfd"
  subtle: "#f1f3f7"
  border: "#e2e6ee"
  control-border: "#8690a0"
  text: "#151821"
  secondary: "#595565"
  muted: "#646c7d"
  success: "#15795b"
  warning: "#a65308"
  error: "#b6494f"
  dark-page: "#17151d"
  dark-sidebar: "#1c1923"
  dark-surface: "#221f2a"
  dark-subtle: "#2b2636"
  dark-border: "#3c3749"
  dark-control-border: "#777184"
  dark-text: "#f1eff7"
  dark-secondary: "#b8b3c6"
  dark-muted: "#9992ab"
  dark-primary: "#b4a5fa"
  dark-primary-hover: "#c6bbff"
  dark-primary-content: "#17151d"
  dark-soft: "#322a45"
  dark-accent-text: "#d4c9ff"
  dark-success: "#81c9a6"
  dark-warning: "#e8ae72"
  dark-error: "#ea9a9d"
typography:
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  page-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  section-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  modal-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  helper:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "12px"
    lineHeight: 1.4
  compact:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "13px"
    lineHeight: 1.4
  card-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  character-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "26px"
    fontWeight: 600
  identity-name:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 600
  metric:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "29px"
    fontWeight: 700
    fontVariantNumeric: "tabular-nums"
    lineHeight: 1.15
  metric-unit:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    fontVariantNumeric: "tabular-nums"
rounded:
  indicator: "4px"
  control: "8px"
  panel: "12px"
  modal: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  control: "12px"
  md: "16px"
  panel: "24px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-content}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "8px 16px"
  control-compact:
    height: "36px"
  control-small:
    height: "28px"
  icon-button-small:
    width: "32px"
    height: "32px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Pofis — Tasarım sözleşmesi

## Overview

Pofis'in görsel karakteri sakin, özenli ve hafif oyuncudur. Nötr, hafif kırık beyaz yüzeyler ve koyu metinler arayüzün omurgasıdır. Renkler tutarlı rollerle kullanılır:

- **Mor/lavanta:** Marka kimliği, seçili durum, odak ve birincil eylem.
- **Nötr tonlar:** İçerik, raporlar, formlar ve boşluklar.
- **Yeşil:** Başarılı işlem veya bağlı durum.
- **Turuncu:** Dikkat gerektiren durum.
- **Kırmızı:** Hata veya başarısız işlem. Mesai farkları süreye ait nötr/marka rollerini kullanır.

Durumlar renk yanında metin, simge veya dokuyla da anlaşılır.

## Colors

| Rol | Kullanım |
| --- | --- |
| `page` / `dark-page` | Sayfa zemini. |
| `sidebar` / `dark-sidebar` | Açık temada `surface` ile aynı navigasyon zemini ve ince sağ ayraç; koyu temada mevcut mürdüm tonu. |
| `surface` / `dark-surface` | Kart, modal ve form yüzeyleri. |
| `subtle` / `dark-subtle` | Yardımcı yüzey, hover zemini, pasif ilerleme izi. |
| `border` / `dark-border` | Dekoratif ayraçlar ve kart sınırları; düşük kontrast bilinçlidir. |
| `control-border` / `dark-control-border` | Boş metin/sayı alanının veya seçicinin varlığını tanımlayan gerekli sınır. |
| `text` / `dark-text` | Ana içerik, süre, yemek adı, hesap sonucu. |
| `secondary` / `dark-secondary` | Etiketler, destekleyici simgeler ve ikincil ancak önemli açıklamalar; hafif mor alt tonlu nötr gri. |
| `muted` / `dark-muted` | Okunur kontrastı koruyan yardımcı metin, tarih, birim ve düşük öncelikli bilgi. |
| `primary` / `dark-primary` | Birincil buton, seçili kontrol, vurgu. |
| `primary-content` / `dark-primary-content` | Dolgulu birincil butonun **üzerindeki metin/simge**. |
| `soft` / `dark-soft` | Seçili satır, hafif mor etkileşim zemini, Pofi'ye ait küçük ayrıntılar. |
| `accent-text` / `dark-accent-text` | `soft` yüzey üzerindeki metin ve bağlantılar. |
| `success`, `warning`, `error` | Yalnızca gerçek durum semantiği; koyu temada `dark-*` eşleri. |

Metin hiyerarşisi `text → secondary → muted` sırasını izler. `secondary`, açık temada `#595565`, koyu temada `#b8b3c6` olarak ortak token üzerinden uygulanır. Marka vurgusu `primary` ve `accent-text`, süre çubuğunun tahmin dolgusu ise `duration-estimated` rolündedir.

**Tema kuralı:** Açık ve koyu tokenlar aynı anlamsal rolleri sürdürür. Koyu temada açık mor dolgulu butonların metin/simgesi `dark-primary-content` kullanır.

Kontrol sınırı bileşenin rolüne göre seçilir:

| Bileşen | Sınır ve durum |
| --- | --- |
| Kart/panel | Dekoratif `border`. |
| Segmentli seçim kapsayıcısı | `border` veya `subtle` yüzey. |
| Metinli ikincil buton, +/−, kapatma | Metin/simge kontrolü tanımlar; hafif `border`, sade yüzey veya çerçevesiz görünüm. |
| Boş input/select | `control-border`; sınırın komşu zemine kontrastı en az 3:1. |
| Seçilebilir gün | Nötr sınır; seçimde `soft`, `accent-text`, gerektiğinde `primary`; seçimi erişilebilir durum ve işaret de bildirir. |
| Klavye odağı | Kontrolün sınır rengi, zemini, metin rengi veya alt çizgisiyle görünür olur. |

Mevcut `muted` ve koyu tema paleti korunur. Sınır kuralları ve hedef boyutları [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) ve [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) ayrımını izler.

Açık temada `control-border`, `surface` üzerinde 3,15:1 ve `page` üzerinde 3:1 üzerindedir; `subtle` üzerinde 2,90:1'dir. Bu nedenle sınırı gerekli input'un yakın dış zemini `surface` veya `page` olmalıdır. Plan süre alanının çevresini stepper'ın `surface` zemini sağlar; +/- butonları kendi hafif yüzeylerini kullanır.

### Kayıtlı ve tahmini süre

[Kayıtlı süre ve anlık tahmin](docs/rules/duration.md) görsel olarak şu rollerle ayrılır:

- **Kayıtlı:** Daha koyu marka moru, `duration-recorded` (`#6554C0`).
- **Tahmini:** Daha sakin, daha düşük doygunluklu lavanta, `duration-estimated`.
- Koyu temada `dark-duration-recorded` ve `dark-duration-estimated` kullanılır.
- Süre çubuklarında kayıtlı ve tahmini bölümleri bitişik, kesintisiz iki düz tonla göster. Günün akışında lejant `Kayıtlı / Tahmini` etiketlerini gösterir. Toplam süre ana okumada yer alır; günlük süre ve hedef fare, klavye ve dokunmayla açılan tooltip'te sunulur.
- Zemin ile anlamlı grafik bölümleri arasında en az **3:1** kontrast hedefle. Dolgu anlamları lejant etiketleriyle açıklanır.
- Yüzdeler %100'ü aşabilir; ilerleme çubuğunun genişliği en fazla %100'dür. Hedef üzerindeki süre aynı süre paletini kullanır.
- Hesaplarda saniye hassasiyetini koru. Büyük sayıda saat/dakika baskın, saniye ve birimler ikincil kalsın.

Renk değerleri frontmatter'da, uygulama karşılıkları ortak süre tokenlarındadır.

## Typography

- **Sayfa başlığı:** `page-title`; sayfa başına bir ana başlık.
- **Bölüm başlığı:** `section-title`; gerektiğinde semantik hiyerarşi korunarak daha küçük kart başlığı kullanılabilir.
- **Dashboard kart başlıkları:** Günün akışı, Haftalık toplam, Giriş-çıkış raporu ve Pofi aynı `h2` rolünü kullanır: `section-title` (18 px/600, 1.3), −0.5 px harf aralığı, `ink` rengi ve sıfır dış boşluk. Tarih, yüzde ve rozetler ayrı ikincil bilgi olarak kalır. Ortak stil [dashboard stillerinde](src/app/pofis.css) tanımlıdır.
- **Modal başlığı:** `modal-title` (20 px/600, 1.3); bölüm başlığından ayrı basamaktır.
- **Ana metin:** `body` (14 px).
- **Etiket/kontrol metni:** `label`.
- **Yardımcı metin:** `helper` (12 px), yalnızca gerçekten ikincil bilgi.
- **Metrikler:** `metric`; sayıların arasında genişlik atlamaması için `tabular-nums`.
- **Metrik birimi:** büyük metriklerde `metric-unit` (15 px/500); kompakt veya dar kartlarda ana rakama göre 12–13 px olabilir. Saniye ikincil hiyerarşisini korur.
- Yazı ağırlıkları: gövde ve menü seçenekleri **400**, etiket ve düğmeler **500**, bölüm/modal başlıkları ve kısa vurgular **600**, sayfa başlıkları ve ana metrikler **700**. Marka yazısı kendi çizimini korur. `card-title` iç içe kart başlıkları ve ikincil metriklerde, `compact` kısa destek bilgisinde kullanılır. `character-title` Pofi odasının karşılama başlığına, `identity-name` kimlik kartındaki ada aittir; ana ürün başlıklarının yerine geçmez.
- Form metni masaüstünde `body` ölçüsünü kullanır. Dokunmatik kullanımda düzenlenebilir alanlar 16 px'e çıkar; bu, küçük yazılı alanlarda otomatik odak yakınlaşması yapan mobil tarayıcılar için ürün tercihidir. Tarayıcı yakınlaştırması açık kalır.

Metin, kullanıcının mevcut bilgiyi anlamasına veya sonraki eylemi seçmesine yardım eder. Sistem ve Pofi sesleri [ton rehberinde](docs/brand/pofi-tone-guide.md) yönetilir.

## Layout

- **4 / 8 / 12 / 16 / 24 / 32 px** ortak aralık ölçeğidir. Grafik konumu, ikon hizası ve metin ölçüleri kendi geometrisini korur. Bileşen istisnasını kendi CSS sahibinde gerekçesiyle yönet; aynı ihtiyaç tekrarlandığında ortak role taşı.
- Kart iç boşluğu varsayılan `spacing.panel` (24 px); büyük modal veya geniş alanlarda gerekirse 32 px.
- Başlık ile açıklama arasında çoğunlukla 4–8 px; açıklama ile ilgili kontrol arasında 12–16 px.
- Aynı kontrol grubunda 8–12 px; ayrı içerik gruplarında 24–32 px.
- Input ve ana kontrol için varsayılan minimum yükseklik 40 px, kompakt kontrol için 36 px, küçük metinli kontrol için 28 px'tir. İkon butonu varsayılan 40 px; modal kapatma/geri ve kompakt +/- için küçük basamak 32 px'tir. Yemek modalının kapatması tarih kontrolleriyle hizalanmak için standart 40 px basamağını kullanır. Metin büyüdüğünde kontroller içerikle uzar. Görsel boyut ile tıklama hedefi ayrı değerlendirilir: WCAG 2.5.8 hedefi en az 24×24 CSS px veya geçerli istisnadır. Pofis'in dokunmatik kullanım tercihi 44 px hedeftir.
- Kartlar içerik kadar uzar.
- Kart, modal ve kontrol radius'ları kendi rollerinde tutarlı kalır. Rozetler/pill'ler yalnızca anlamlı bir seçili durum için kullanılabilir.
- Sütun sayısını ve içerik genişliğini göreve ve okunabilirliğe göre seç.
- Yedi sütunlu tarih seçiminde hücreler en az 24 px genişlik ve standart kontrol yüksekliğini sağlar. Dokunmatikte 44 px yükseklik korunur; yedi hücre yatay kaydırma gerektirmeden ekrana sığar.

## Elevation & Depth

Yüzeyler zemin ve ince sınırla ayrılır. Kartın hafif gölgesi, popover ve modal gölgesi ortak CSS tokenlarından gelir: `--card-shadow`, `--popover-shadow`, `--modal-shadow`. Odak ve kontrol sınırları [etkileşim kurallarını](#etkileşim-ve-formlar) kullanır.

## Shapes

Kontroller `rounded.control`, paneller `rounded.panel`, modallar `rounded.modal` kullanır. Grafik uçları ve küçük işaretler `rounded.indicator` basamağındadır. İç içe sınırların optik hizası için dış radius eksi sınır kalınlığı hesaplanabilir. Daireler ve kapsül biçimleri işaret, anahtar ve belirgin gezinme kontrollerinde kullanılır.

Yerel görsel ölçüler: haftalık grafik sütunlarının üst köşeleri 5 px, Pofi not defterinin önceki/sonraki gezinme düğmeleri 24 px radius kullanır. Dar ekran marka yazısı 23 px'tir; bu ölçü metin hiyerarşisinden ayrı marka yerleşimine aittir.

## Components

### Etkileşim ve formlar

- **Eylem hiyerarşisi:** Birincil eylem mor dolgulu; ikincil eylem hafif çerçeveli veya sade metin; tehlikeli eylem kırmızı ancak gerçekten tehlikeliyse.
- **Seçili durum:** `soft` yüzey + `accent-text` ve gerektiğinde birincil kontur; erişilebilir seçim durumu ve görünür işaret.
- **Hover:** Hafif yüzey veya `primary-hover`; kontrolün konumu ve boyutu değişmez.
- **Focus-visible:** Klavyeyle erişilebilen kontrollerde mevcut sınır rengi, zemin, metin rengi veya alt çizgi değişerek odağı belirginleştirir. Gölge yüzey derinliği için kullanılır.
- **Input:** `surface` zemini, `control-border` sınırı, tutarlı etiket ve yardımcı metin. Metin, sayı ve seçim alanları hem fare hem klavye odağında mevcut sınırı `accent-text`, zemini `soft` yapar; boyut ve sınır kalınlığı değişmez. Birimli alanlarda odak görünümünü dış kontrol taşır, iç input saydam kalır. Hatalı alanın odağı kırmızı sınır ve `error-soft` zeminle gösterilir. Sayı alanları ortak form stillerini ve erişilebilir giriş davranışını kullanır.
- **Segmented control:** Hazır seçenekleri tek grupta göster. `Özel` gibi ek değer girişlerini aynı gruba bağlı popover'da sun.
- **Checkbox / switch:** Checkbox çoklu seçimi, switch açık/kapalı tercihi gösterir. Tercihin uygulanma anını ilgili kaydetme akışı belirler.
- **Popover / modal:** Yerel, kısa seçim popover'da; çok adımlı bağlantı/kurulum akışı modaldadır. Kapatma, Escape, klavye odağı ve dar ekran davranışı net olmalıdır.
- **Durum geri bildirimi:** `Kaydedildi`, `Bağlandı`, `Hata` gibi ifadeleri gerçek işlem sonucuyla ilgili eylemin yanında göster.

### Görsel yön ve sahipler

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

### Yerleşim

- **Giriş ve hata:** üst marka ve içerik ortak 920px alana hizalanır. Kenar boşluğu masaüstünde 32px, 780px altında 16px'tir.
- **Güncel hafta:** üstte günün akışı ve haftalık toplam; altında akordeon giriş–çıkış raporu ve Pofi. Pofi kartı üstte hizalanır, raporun yüksekliğine esnemez.
- **Geçmiş hafta:** güncel haftayla aynı iki sütunlu üst satırda günlük dağılım grafiği ve haftalık toplam; altında açılır günlük kayıt raporu. Hedef ve hedef farkı toplam kartında bir kez gösterilir. Toplam kartı içeriği kadar yükselir; grafiğe esnemez. Geçmiş haftada günlük cetvel gösterilmez; mobilde toplam kartı grafikten önce gelir.
- **Duyarlı düzen:** masaüstünde 230px sol menü ve en fazla 1530px ana alan; 1170px altında orta satır tek sütun, 1000px altında menü üstte açılır, 700px altında üst kartlar tek sütun olur. Kart yüksekliği içeriği izler. Diğer ölçüler CSS sahibinde tutulur.

Canlı ve demo saatinin kod sahipleri [arayüz haritasındadır](docs/architecture/ui-components.md). Gizli sekmeden dönüşte gerçek saat okunur. Ayarlar ve Pofi odası doğrudan yüklenir.

### Sayılar ve süreler

Sayısal veriler tabular gösterilir. Saat/dakika baskın, saniye ikincildir. Birimli süreler `8 sa 3 dk 31 sn` biçimindedir; sıfır birimler atlanır, tam sıfır `0 sn`, bilinmeyen süre çizgiyle gösterilir. Giriş–çıkış raporundaki saatler `HH:mm:ss` biçimini korur. Plan kontrolleri [güvenli dakika gösterimini](docs/rules/plan-duration.md#güvenli-dakika-gösterimi) kullanır; günlük kart ve süre alanı aynı yuvarlamayı izler. Sıfır süreli açık gün `0 sa` görünür. Haftalık özet, hedefi ve beklenen toplamı farkla aynı saniye hassasiyetinde gösterir. Tarihler İstanbul takviminden gelir; seçili aralık başka yıldaysa yıl görünür.

#### Günün akışı

[DayFlow](src/components/attendance/day-flow.tsx), “Bugünkü mesai” değerini üstte, “Hedefe kalan / Hedefi aşan” farkını yanında ikincil bilgi olarak gösterir; hedef tam karşılanınca “Hedefle aynı” görünür. Tarih başlık yanındadır. Dar kapsayıcıda üst bilgiler alt alta geçer.

- Ortak [DurationTrack](src/components/primitives.tsx), [kayıtlı/tahmini süre](#kayıtlı-ve-tahmini-süre) rollerini kullanır. Hedef nötr çizgidir.
- “Şimdi” etiketi ve saati canlı süre çubuğunun ucunu takip eder; çıkış kaydında “Son çıkış” olur. “Hedef çıkış” etiketi ve saati kendi hedef işaretine bağlıdır; hedef aşılana kadar eksenin sonunda, aşıldığında geride kalır. İlk giriş bilgisi eksenin başındadır. Çıkış kaydı günün tamamlandığını söylemez. Sıfır olmayan saniyeler saat/dakikadan daha küçük, ikincil renkle görünür; tam değer erişilebilir ad ve başlıkta korunur. Hedef başka güne geçerse tarihi ayrıca gösterilir.
- İşaret çizgileri gerçek zaman konumunu korur. Ölçek ilk girişten kayıtlı/canlı süre ile hedefin en ilerisine uzanır. Hedef nötr kesik çizgi, mevcut süre ucu vurgu çizgisidir. Etiketler kendi işaretlerini takip eder; kenarlarda metin kapsayıcı içine kayar. Canlı etiket üstte, hedef etiketi çubuğun hemen altındadır. İlk giriş başlangıçta kalır; hedef ilk beşte birlik alandaysa veya kapsayıcı 360 piksel ve altındaysa olası çakışmayı önlemek için hedef etiketi sonraki satıra geçer. Etiketler normal akışta içerikleri kadar yükseklik alır; sabit üst/alt dolgu ile boş alan ayrılmaz. Hedef saat üst özette tekrar edilmez.
- Giriş kaydı ve bilinen süre yoksa grafik, sıfır süre ve lejant gösterilmez; kısa kayıt durumu kalır. Süre bilinmese de ilk girişten hesaplanabilen hedef çıkış korunur; bilinmeyen mesai süresi çizgidir, kalan süre üretilmez.
- Belirsiz durumda kullanılabilir kayıtlı/anlık süre yoksa veya okunamayan kayıt ya da geçmişte eksik çıkış gibi hesabı etkileyen neden varsa kısa “Kayıtlarda belirsizlik var” uyarısı ve “Kayıtları aç” eylemi görünür; eylem bugünün rapor satırını açıp odaklar. Çift giriş/çıkış ve süresi bilinen güne ait eşleşmeyen ara çıkış Günün akışı'nda tek başına uyarı üretmez; ayrıntılı nedenler rapor ayrıntısında kalır. Bilinen süre ve güvenilir açık girişe dayanan canlı tahmin korunur. Lejant yalnız mevcut kayıtlı/anlık bölümler için gösterilir.

[Süre](docs/rules/duration.md), [hedef](docs/rules/work-plan.md) ve [ölçek](docs/rules/progress.md) hesapları kural sahiplerinden gelir. [Yerleşim stilleri](src/components/attendance/day-flow.css) demo ve canlıda ortaktır.

#### Haftalık toplam ve grafik

[WeeklyTotal](src/components/dashboard/weekly-total.tsx), toplam ve sakin hedefi aynı satırda “toplam / hedef” olarak sunar. Yüzde başlıkta dolgusuz mor metindir; kalan/aşan süre alta yaslanır. Hedefe tam eşit toplam “Hedefle eşit” olarak sunulur. Yaklaşık yüzde ve farkın erişilebilir etiketleri kayıt eksikliği veya belirsizliğini açıklar. Tamamlanmış haftada hedefin altındaki süre “Hedefin altında” etiketiyle gösterilir. Eksik veya belirsiz kayıtlarda geçmiş haftanın farkı ve yüzdesi yaklaşık işaretiyle sunulur; güncel haftada fark gösterilmez.

Yalnız güncel haftada gösterilen cetvelde açık ve izinli günler takvim sırasıyla eşit genişliktedir. İzinli gün nötr zeminli, kenarlıksız ve “İzinli” yazan dolgusuz bölüm olarak görünür; gün adı altında korunur. Normal kapalı günler eklenmez. Çubuklar üst kenardan, gün adları ortak satırdan hizalanır; ek süre bilgisi bu hizayı değiştirmeden aşağı doğru büyür. İzinli günde bilinen pozitif çalışma süresi varsa gün adının altında 12 piksel ikincil metinle saat/dakika olarak görünür; bir dakikanın altındaki pozitif süre “< 1 dk” gösterilir. Tam saniyeli süre tooltip ve erişilebilir etikette korunur. İzin işareti haftalık toplam veya hedef hesabını değiştirmez. Bölümler [ortak ilerleme ölçeğiyle](docs/rules/progress.md) kendi sınırlarında dolar. Sıfır süreli açık gün görünür kalır; bilinmeyen süre belirsiz olarak gösterilir. Bugünün gün adı koyu ve 600 ağırlığındadır; tooltip başlığı ve erişilebilir etiketi Bugün bilgisini içerir. Kaydı olmayan gelecek günlerin çubuğu nötrdür; tooltip ve erişilebilir etikette kayıt yok mesajı yerine “Planlanan · 8 sa” gibi gereken süre görünür. Gelecek izinli günün öncelikli durumu İzinli olarak kalır. Gün adı ortak tooltip başlığındadır; gerçekleşen veya bugünkü günlerde süre ile hedef, “Çalışılan” ve “Hedef” satırlarında etiket ve sağda belirgin değer olarak sunulur. İzinli günde hedef satırı gösterilmez; bilinen süre varsa Çalışılan satırı korunur. `missing` ve `uncertain` günler uyarı renkli ince bar kenarlığı ve gün adının yanındaki uyarı simgesiyle ayrışır; mevcut kayıt durumunun kısa etiketi tooltip ve erişilebilir etikette görünür. Bilinmeyen süre sıfır gibi gösterilmez; belirsiz ama bilinen süre yaklaşık işareti ve mevcut dolguyla korunur. Hedef altındaki tutarlı kayıt uyarı almaz. Bar ve gün adını birlikte kapsayan alan en az 44 piksel yüksekliğinde tek bir yerel düğmedir. Tooltip hover veya klavye odağıyla açılır. Tıklama, tek dokunma, Enter veya Space geçmiş günün giriş–çıkış raporunu açar; bugün ve gelecek günlerde Mesai planını ilgili gün seçili olarak açar. Tarih ayrımı kayıt durumundan bağımsızdır: kayıtsız/belirsiz geçmiş gün rapora, çıkış kaydı bulunan bugün plana gider. İzinli gelecek gün doğrudan seçilebilir. Rapor günü açılıp odaklanır ve görünür alana kaydırılır; azaltılmış hareket tercihinde kaydırma anlıktır. Aynı gün tekrar seçildiğinde yeniden açılır; saniyelik saat güncellemesi gün açmaz veya kaydırmaz. Plan kapanınca odak kaynak gün düğmesine döner.

[Haftalık grafik](src/components/attendance/week-chart.tsx) geçmiş haftada günlük süre sütunlarını gösterir. Geçmiş günler `--chart-past`, bugün `--accent` kullanır; ölçek yalnız görünen sürelerden gelir. Canlı girdi verildiğinde kayıtlı bölümün üstüne açık tahmin eklenir; tooltip kayıtlı süre ve canlı toplamı ayırır. Lejant “Günlük kayıtlı süre”dir. 400 px ve altında sütunların süre metni komşu sütuna taşmaması için gizlenir; tam süre klavye ve dokunmayla açılan tooltip ile erişilebilir etikette korunur.

### Gezinme ve kontroller

- **Görünüm:** girişte 40×40px kompakt ikon düğmesi, yan menü ve mobil menüde “Görünüm” yazısı ve aynı ikon kullanılır. Güneş açık, ay koyu görünümü belirtir; erişilebilir ad ve ipucu geçilecek görünümü söyler. Klavye odağı tema renginde belirgindir. Tema tercihi mevcut depolama sahibinde tutulur.
- **Giriş:** kullanıcı adı ve boş parola alanının placeholder'ı 14 px/400 ağırlık ve doğal harf aralığı kullanır; placeholder rengi `muted` tokenıdır. Kullanıcı adı ve açığa çıkarılan parola aynı 14 px/400 metin stilini korur. Yazılmış gizli parolanın maskesindeki noktalar 12 px görünür ve aralıklıdır. Şifre alanının sağındaki göz düğmesi şifreyi gösterir/gizler. Başlangıçta ve form gönderildiğinde şifre gizlidir. Düğme mevcut ikon, tema ve klavye odağı dilini kullanır; erişilebilir adı yapacağı eylemi söyler. Oturum doğrulanırken alan ve düğme devre dışıdır.
- **Hafta seçici:** aylık native popover, ayla kesişen pazartesi haftaları ve güncel haftaya dönüş. Gelecek haftalar kapalıdır; demo yakalama aralığıyla sınırlıdır. Seçim kapanır ve odağı tetikleyiciye döndürür.
- **Demo:** gün seçimi, sanal saat, hata ve durum mesajı senaryoları [demo rehberinde](docs/demo.md) yönetilir. Karşılaştırma demoları karar sonrasında temizlenir; durum demoları korunur.
- **Bildirim bağlantısı:** uygulamadaki Telegram kurulumu ortak modalda açılır. Yardım, token, sohbet seçimi ve işlem geri bildirimi aynı modalda yer alır; Escape ve kapatma odağı başlatan düğmeye döndürür.
- **Plan:** [PlanEditor](src/components/plan-editor.tsx), varsayılan plan ve tarih etiketli hafta sekmelerini üstte gösterir; seçilen kapsama ait bilgilendirme sekmelerin altında, çalışma günlerinden önce yer alır. Özel hafta noktası sekmededir. Pazartesi–cuma kartları tek sırada kalır. Açık gün nötr, gerçekleşmiş veya elle kilitlenmiş gün hafif nötr zemin ve kilit ikonlu, kapalı gün sakin nötrdür. Lavanta zemin, mor kenarlık ve mor metin yalnız seçili güne aittir. Seçili olmayan kilitli günün süre ve kilit ikonu ikincil renktedir; klavye odağı seçim rengine boyanmadan kenarlıkla görünür.
- **Plan düzenleme:** Gün adı ve İzin → Kilitle → Planlayıcı eylemleri solda, serbest süre girişi ile +/- sağdadır. Eylemler aynı yükseklikte, çerçevesiz ve nötr renkle sunulur; seçili İzinli/Kilitli durumu ve açık Planlayıcı yumuşak vurgu zemini kullanır. Gün adıyla eylemler arasında 16 piksel boşluk bulunur. Gün adı, eylemler ve süre kontrolü aynı üst satırda dikey ortalanır. Açık günlere uygula, ayrı alt satırda süre kontrolünün altında sağa hizalı, 12 piksel nötr metin eylemidir; üst satırın dikey hizasını değiştirmez; süreyle aynı yatay alanı paylaşmaz. Zemin normal, hover ve odak durumlarında şeffaf kalır; klavye odağı kenarlık ve alt çizgiyle görünür. Dokunmatik hedef yüksekliği 44 pikseldir. Giriş tam dakika kabul eder; +/- 30 dakikalık çizgilere ilerler. Varsayılan sekmesinde Kapat–Aç kullanılır. Haftalık kart ve süre alanı aynı gereken süreyi gösterir. İzinli gün “İzinli”, şablondan kapalı gün “Kapalı”, sıfır süreli açık gün `0 sa` der. Kullanıcı kilidi yalnız ikonlu düğmeyle yönetilir; görünür Kilitle/Kilitli metni yoktur. Açık kilit düzenlenebilir, vurgulu kapalı kilit kilitli durumu gösterir. Düğmenin açıklaması ve erişilebilir adı Süreyi kilitle / Kilidi aç olur. Sabit düğme genişliği masaüstünde 36, dokunmatikte 44 pikseldir; durum değişimi düğmenin ölçüsünü değiştirmez. Kilitli günde süre düzenleyicisinin yerinde kilit ikonlu sabit süre görünür. Süre alanının ortak minimum yüksekliği düzenlenebilir, kilitli, izinli ve kapalı görünümde korunur; süre inputu genel form alanlarının üst marjını sıfırlar, kilitleme satır yüksekliğini değiştirmez. İzinli düğmesi durumu gösterir ve izni kaldırır; sağdaki süre alanı boş kalır, minimum yüksekliği korunur ve aynı durum metni tekrarlanmaz. Geçmiş turnike kaydı bulunan gün ayrı kilitli gösterilir; gerçekleşen süre hesaplanamıyorsa “Süre belirsiz” görünür. Kayıtlı plan ve farklıysa şablon alt bilgide görünür.
- **Plan toplamları:** Modalın adı “Mesai planı”, genel şablon sekmesinin adı “Çalışma düzeni”dir. Haftalık sekme güncel haftada “Bu hafta”, diğer haftalarda “Seçili hafta” ve tarih aralığını gösterir. Çalışma düzenindeki şablon toplamı “Haftalık süre”, seçili haftadaki izin sonrası referans “Haftalık hedef” olarak adlandırılır. Seçili haftada günlerden önce çerçevesiz tek özette “Haftalık hedef”, “Beklenen toplam” ve fark varsa “Hedefe kalan” veya “Hedefi aşan” bulunur. Hedef izin sonrası referanstır; kayıtlı özel hedef değişse de karşılaştırmanın dayanağı görünür kalır. Etiketler 12 piksel normal ağırlıkta, sağa hizalı süreler 14 piksel ve 600 ağırlığındadır; bütün değerler saniye hassasiyetindedir. Dar ekranda etiketler gizlenmez. Alt eylem alanı nötrdür; ana düğme 14 piksel ve vurgu rengindedir. Eylem sırası Planı sıfırla → hedefe düzenlemedir. Beklenen toplam hedefin altındaysa “40 saate tamamla”, hedefte veya üzerindeyse “40 saate ayarla” kullanılır; eşit toplam ve eşit kayıtlı hedefte ana eylem görünmez. Düğme iki dağıtım seçeneğini üstünde popover olarak açar; seçim, dışarı tıklama, odak çıkışı veya Escape kapatır. Kapasite yetmiyorsa eylem açıklamayla devre dışıdır. Üstte yalnız depolama hatası veya dağıtılamayan süre gibi sorunlar gösterilir. Görünürlük, hesap ve kayıt koşulları [plan sözleşmesindedir](docs/rules/work-plan.md).
- **Mobil plan:** kontroller ve eylemler satır kırabilir; sayı ile birimi birlikte kalır. Dokunmatik kontroller 44px olur; diğer ölçüler plan CSS sahibindedir. Tam süreler erişilebilir etiketlerde korunur.
- **Plan saati:** “Planlayıcı” düğmesi, seçili günün İzin/Kilitle eylemlerinin sağında aynı eylem grubunda yer alır. Bölüm açıldığında “[saat]’te girersem” veya “[saat]’te çıkmak için” cümlesi içinde saat/dakika alanı ve temizleme doğrudan görünür. Saat alanının altında tek bir girersem/çıkmak için seçimi bulunur ve geçerli saat girilene kadar sonuç gizlidir; saat için ikinci açılır katman yoktur. Kontroller içerik kadar geniş, ek çerçeve veya kapsayıcı zemin olmadan durur; saat alanı kalan boşluğu dolduracak şekilde büyümez. Saatin altındaki girersem/çıkmak için seçimi alt çizgiyle belirtilir. Karşı saat, “14:30’da çıkarım” veya “10:00’da girmeliyim” biçiminde yazarken güncellenen cümle sonucudur; satırın sağına, saat/sonuç/gün farkı kendi içinde sağa hizalanır ve ikinci bir saat alanı olarak sunulmaz. Saat/dakika bölümlerinin çevresindeki boşluğa tıklamak en yakın bölümü odaklar; bölüm hedefleri masaüstünde en az 36 piksel genişlikte, dokunmatikte en az 44 × 44 pikseldir. Odaklanan bölümün zemini vurgulanır ve içeriği seçilir. Gece yarısı aşımında sonuç cümlesinde ilgili günün tam adı görünür: Perşembe için “22:30’da / Çarşamba girmeliyim” veya “04:00’te / Cuma çıkarım”. Sonuç iki satırda kalır; gün farkı simgesi kullanılmaz. Seçim ve odak `--accent-soft` / `--accent-text` kullanır. Dar ekranda kontroller ve sonuç satır kırar; sonuç sağ hizada kalır. [Düzenleme, görünürlük ve hafta bazında kayıt](docs/rules/work-plan.md#haftalık-girişçıkış-saati) plan sahibindedir.
- **Rapor:** bugün ve geçmiş günler bağımsız native akordeondur. Kapalı satır gün, süre ve ilk giriş/son çıkış özetini gösterir. Gelecek günler her iki rapor görünümünde yalnız tarih, gün adı ve “Henüz gelmedi” yazan, açılmayan sade satırdır; haftalık planda izinli işaretlenmiş gelecek günlerde bu etiket “İzinli” olur. Saat, süre, hedef farkı ve detay oku gösterilmez. İstanbul takviminde gün geldiğinde normal rapor satırına geçer. Turnike uyarıları, hedef farkı, kayıtlı süre, durum ve ham hareketler ayrıntıdadır. Geniş tablonun ana satırında kısa kayıt durumu, açılan ayrıntısında turnike uyarıları bulunur. Hafta sonları yalnız kayıt/süre verisi varsa görünür. Ham liste ilk açılışta oluşturulur ve korunur. [Kayıt durumu sözleşmesi](docs/rules/record-status.md) ortaktır.
- **Pofi:** 156px durum görseli ve ortak başlık/mesaj düzeni; maskota basınca oda açılır. Albüm, notlar, kart, Pofi mesaisi ve sürprizler kendi sahiplerini kullanır.

### Odak, modal ve tooltip

Masaüstü güncellemesi ortak modalı kullanır. Stil sahibi [desktop-update.css](src/components/shell/desktop-update.css), düğme ve komut akışının sahibi [masaüstü sözleşmesidir](docs/desktop.md#açılışta-sürüm-denetimi).

Seçim vurgusu `--accent` zemin ve `--accent-content` metin kullanır; bilgi kutularının `--accent-soft` zemini üzerinde de ayırt edilir. Metin seçimi normal bağlantılar, açıklamalar, girdiler ve teknik ayrıntılarda açıktır; buton ve `.button-link` üzerinde kapalıdır. Rapor akordeonunda klavye odağı metin rengi, zemin ve alt çizgi değişimiyle tüm satırda görünür; ortak odak kuralı [etkileşim ve formlar](#etkileşim-ve-formlar) bölümündedir.

Ortak [Modal](src/components/modal.js) native dialog kullanır: Escape, kapatma düğmesi, açan kontrole odak dönüşü ve içeride kaydırma. Masaüstünde (700 px ve üzeri) yatayda ortalanır, üst kenarı ekranın üstünden 32 px uzaklıkta sabit kalır; sekme ve içerik değişimleri aşağı doğru büyür. Alt kenarda en az 32 px boşluk kalır, uzun içerik modal içinde kayar. Varsayılan başlangıç odağı kapatma düğmesinde, plan modalında başlıktadır. Mobil tutamak aşağı sürükleyerek kapatır. Modal köşeleri `rounded.modal`, başlıkları `modal-title`, dairesel kapatma düğmesi ve geri düğmesi varsayılan küçük ikon basamağını kullanır; yemek modalında standart kontrol basamağıyla hizalanır. Dokunmatik hedefler 44 px'tir.

Güncelleme modalında kopyalama sonucu kalıcı `role="status"` alanıyla duyurulur. Başarı duyurusu görsel olarak gizlidir; hata açıklaması komutun altında görünür. Dar menüden açılan modal kapanınca odak menü düğmesine döner.

Ortak [Tooltip](src/components/tooltip.tsx) portal üzerinden çizilir. Fare/klavye odağıyla açılır; yalnız bilgi veren tetikleyici dokunmayla açılıp kapanır. Eylemli tetikleyici yerel düğmedir; ilk dokunuş eylemi çalıştırır ve tooltip kapanır. Escape ve dışarı dokunma kapatır. Ekran kenarında yatay kayar, üstte yer yoksa alta açılır. Kaydırma, boyut ve canlı içerik değişiminde yeniden ölçülür; dinleyiciler içerik değişiminde yeniden kurulmaz. Grafik sütununun tamamı tetikleyicidir; konum görünen bölümden ölçülür. [Konum hesabı](src/components/tooltip-position.ts) ve [tema stilleri](src/components/tooltip.css) ortaktır.

### Hata ve yardımcı ekranlar

Giriş, hata, yükleme ve 404 ortak shell/temayı kullanır. Beklenen giriş hatası formda; sistem hatası normal hata ekranında; rapor varken yenileme hatası rapor üzerinde sunulur. Yerel plan/tema sorunları kompakt [InlineNotice](src/components/inline-notice.tsx) kullanır.

[RequestError](src/components/request-error.js) lavanta Pofi sahnesini, işleme uygun eylemi ve sürekli açık İz kaydını sunar. Tam sayfada Pofi masaüstünde sağda, dar ekranda üsttedir; bildirimde küçük Pofi sağda kalır. Teknik ayrıntılar kutusuz gruplar kullanır, uzun değerler satır kırar. Demo ve canlı ekranlar aynı bileşenleri kullanır.

Hata sınıfları, form odağı, eski rapor, kopyalama ve yeniden deneme davranışı [hata sözleşmesinde](docs/pdks-errors.md); doğrulama yöntemi [doğrulama rehberinde](docs/verification.md) yönetilir.

### Bildirim kontrolleri

Bildirim ekranı masaüstü, web ve demoda ortak `NotificationSettings` bileşenini kullanır. Demo aynı kontrolleri ve akışları bellekte çalışan örnek bağlantı/kayıt işlemleriyle sunar. Geniş ekranda Hatırlatmalar ve Bildirim kanalları 65/35 oranlı iki sütunda, dar ekranda tek sütunda görünür. Her hatırlatmanın altında Masaüstü ve Telegram switch’leri bulunur. Telegram bağlantısı yalnız Bildirim kanalları bölümünden açılır. Bağlı olmayan Telegram, hatırlatmalar altında pasif kanal seçeneği olarak görünür; kayıtlı tercihler korunur. Hatırlatma öncesi tek segmented control içinde 5 / 10 / 15 / 30 dakika ve Özel seçenekleri bulunur; Özel, tetikleyiciye bağlı küçük giriş popover’ı açar. Hatırlatma süreleri ve kanal tercihleri mevcut açık kaydetme eylemini kullanır. Telegram kurulumu masaüstünde en fazla 480 px genişliğindeki ortak modalda kademeli açılır: önce token ve Sohbeti bul, ardından sohbet seçimi ve Bağla. Elle sohbet kimliği girişi gerektiğinde açılır; hatalar ilgili formda kalır. [Davranış sahibi](docs/rules/notifications.md).

### Sürüm geçmişi

Sürüm geçmişi footer sürümünden ve güncelleme modalından açılan bağımsız bir okuma yüzeyidir. Footer'daki sürüm butonunda yeni sürüm açılana kadar beliren sakin bir vurgu noktası yer alır; tıklandığında okundu kaydedilir ve nokta kalkar. Katalogdaki sürümler yeniden eskiye tek sütunlu dikey zaman çizgisinde gösterilir. İnce nötr çizgi ve küçük işaretler tarihsel akışı taşır; en yeni veya doğrudan hedeflenen sürüm vurgu rengini kullanır. Büyük kart yığınları, konu filtreleri ve dekoratif rozetler kullanılmaz.

Her durakta sürüm numarası ana başlık, yayın tarihi ikincil bilgi olur. İçerik yalnız dolu **Yenilikler**, **Düzeltmeler** ve **Bakım** gruplarını gösterir; masaüstünde grup adı ile maddeler iki sütunda, 600 px altında tek sütunda akar. Kurulu sürüm katalogda bulunuyorsa küçük **Bu sürüm** işareti taşır. Footer kurulu sürümün durağına, güncelleme modalı yeni sürümün durağına odaklanır. Hedef public katalogda da bulunamazsa en yeni bilinen sürüm açılır. Giriş ekranından footer ile açıldığında **Girişe dön** eylemi görünür.

### Pofi Mini

Panel başlığında ürün adı **Pofis** bulunur; özellik adı menülerde **Pofi Mini** olarak kalır. Günlük içerik mevcut rapor ve plan sonuçlarına göre biçim değiştirir:

- Planlı mesai yoksa **Bugün planlı mesai yok.** özeti görünür; boş mesai/hedef kutuları gösterilmez. O gün çalışma varsa süre, kayıt belirsizse uyarı özette korunur.
- Mesai gününde bugünkü süre, kayıt durumu, hedef çıkış ve hedef farkı görünür. Bugünkü süre bütün günlük görünümlerde `7 sa 59 dk 43 sn` biçiminde yazılır; sıfır birimler atlanır. Hedef çıkış günün saati olarak `16:00:17` biçimini korur. Bu alanlar ek kartlara bölünmez.
- Güncel ve belirsiz olmayan veride günlük hedefe ulaşıldığında **Bugünkü hedef tamamlandı.** ve bugünkü süre görünür; hedef çıkış/fark alanları kaldırılır. Güncel olmayan veya belirsiz kayıtta normal metrikler ve kayıt durumu korunur.

Başlıktaki sabitleme düğmesi yalnız ikondur; kalıcı çerçeve veya zemin kullanmaz. Üzerine gelindiğinde hafif vurgu zemini görünür, sabitlenmiş durumda ikon vurgu rengini alır. 32 px tıklama alanı, açıklama balonu, erişilebilir ad, basılı durum ve görünür klavye odağı korunur.

Haftalık toplam, ilerleme ve **Pofis’i aç** eylemi bütün günlük görünümlerde kalır. Haftalık toplam hedefe ulaşmış ve kayıtlar eksiksizse **Haftalık hedef tamamlandı** görünür; eksik kayıtta öncelik kayıt uyarısındadır. İçerik tek yüzeyde akar; günlük ve haftalık bilgiler kart zemini, çevre çerçevesi veya yuvarlatılmış kapsayıcı kullanmaz. Başlık ve haftalık bölüm ince ayraçlarla ayrılır; renkler ve tipografi mevcut tema tokenlarını kullanır. Ana eylem içeriği izler, pencerenin altına itilmez. Pencere genişliği sabit, yüksekliği içeriğe bağlıdır; [boyut sınırları](docs/desktop.md#pofi-mini-ve-macos-menü-çubuğu) ana süreçte uygulanır.

## Bileşen kabulü

### Bileşen kalitesi ve tutarlılık

1. Mevcut kart, input, buton, navigasyon ve overlay bileşenlerini kullan; yeni ihtiyaçta ilgili sahibini genişlet.
2. Yemek, durum ve bilgi satırlarında içerik görünümünü; işlem yapılan yerde kontrol görünümünü kullan.
3. Bölümlerin önemini sıralama, tipografi ve boşlukla anlat. Pofi ana mesai bilgisini destekleyen alanda kalır.
4. Masaüstü ve mobilde aynı bilgi hiyerarşisini koru; dar ekranda içeriği yeniden akıt.
5. Ortak roller için mevcut tokenları kullan; değişiklikten önce kullanan bileşenleri kontrol et.

### Kabul kriterleri

- Normal metin için en az **4.5:1**, büyük metin için en az **3:1** kontrast; anlamlı kontroller/grafik işaretleri için en az **3:1** hedeflenir.
- Kontrast ölçümünde kontrolü veya durumu tanımlayan gerekli sınır ve işaretleri değerlendirin; kart ayraçları dekoratif roldedir.
- Açık ve koyu temada gerçek bileşenlerin metin, kontrol ve durum kontrastını ölç; durumları metin/simgeyle de doğrula.
- Hızlı taranabilirlik korunur: önce içerik/mesai bilgisi, sonra ayarlar ve yardımcı açıklamalar.
- %200 metin büyütmede içerik ve eylemler korunur. 320 CSS px genişlikte (1280 px pencerenin %400 yakınlaştırılmasına eşdeğer yeniden akış genişliği) sayfa iki yönde kaydırma gerektirmez; anlamı için iki boyut isteyen içerik ayrı değerlendirilir. [Metin büyütme](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) ve [yeniden akış](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) kabulde ayrı kontrol edilir.
- Klavye ile menü, form, modal ve tooltip'e ulaşılır; odak görünür kalır ve kapatmada anlamlı yere döner. Grafik bilgisi lejant ve metinlerle açıklanır. `prefers-reduced-motion` altında açılma/kapanma sonucu animasyona bağlı değildir.
