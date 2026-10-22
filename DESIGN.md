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

Pofis'in görsel karakteri sakin, güvenilir, özenli ve hafif oyuncudur. Lavanta/mor, markayı ve seçili etkileşimleri temsil eder; tüm arayüzü boyamak için kullanılmaz. Nötr, hafif kırık beyaz yüzeyler ve koyu metinler arayüzün omurgasıdır.

Renklerin duyguya etkisi bağlama göre değişir; bu nedenle "mor güven verir" gibi evrensel bir iddia yerine, tutarlı kullanım hedeflenir:

- **Mor/lavanta:** Marka kimliği, seçili durum, odak ve birincil eylem. Sürekli dikkat çekmek için değil, kullanıcıya yön göstermek için.
- **Nötr tonlar:** İçerik, raporlar, formlar ve sakin boşluk. Saf beyaz yüzeyleri gereksiz yere çoğaltma.
- **Yeşil:** Gerçekten başarılı sonuç veya bağlı/başarılı durum. Mesai hedefinin aşılması otomatik olarak başarı mesajı gerektirmez.
- **Turuncu:** Gerçekten dikkat gerektiren durum.
- **Kırmızı:** Hata veya başarısız işlem. Eksik mesai, hedefe kalan süre ya da fazla çalışma kendiliğinden hata değildir.

Renk mesajın tek taşıyıcısı olamaz. Durumlar metin, simge veya doku ile de anlaşılmalıdır.

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
| `muted` / `dark-muted` | Yardımcı metin, tarih, birim ve düşük öncelikli bilgi; gerekli metni okunmaz hâle getirme. |
| `primary` / `dark-primary` | Birincil buton, seçili kontrol, vurgu. |
| `primary-content` / `dark-primary-content` | Dolgulu birincil butonun **üzerindeki metin/simge**. |
| `soft` / `dark-soft` | Seçili satır, hafif mor etkileşim zemini, Pofi'ye ait küçük ayrıntılar. |
| `accent-text` / `dark-accent-text` | `soft` yüzey üzerindeki metin ve bağlantılar. |
| `success`, `warning`, `error` | Yalnızca gerçek durum semantiği; koyu temada `dark-*` eşleri. |

Metin hiyerarşisi `text → secondary → muted` sırasını izler. `secondary`, açık temada `#595565`, koyu temada `#b8b3c6` olarak ortak token üzerinden uygulanır. Marka vurgusu `primary` ve `accent-text`, süre çubuğunun tahmin dolgusu ise `duration-estimated` rolündedir.

**Tema kuralı:** Light tokenlar temel görsel yönü tanımlar. Koyu tokenlar varsa aynı anlamsal rolleri sürdürür; sırf bu belgede bulundukları için yeni tema özelliği eklenmez. Koyu temada açık mor dolgulu butonların metni de açık renk olamaz: `dark-primary-content` kullanılır.

Kontrol sınırı bileşenin rolüne göre seçilir:

| Bileşen | Sınır ve durum |
| --- | --- |
| Kart/panel | Dekoratif `border`. |
| Segmentli seçim kapsayıcısı | `border` veya `subtle` yüzey. |
| Metinli ikincil buton, +/−, kapatma | Metin/simge kontrolü tanımlar; hafif `border`, sade yüzey veya çerçevesiz görünüm. |
| Boş input/select | `control-border`; sınırın komşu zemine kontrastı en az 3:1. |
| Seçilebilir gün | Nötr sınır; seçimde `soft`, `accent-text`, gerektiğinde `primary`; seçimi erişilebilir durum ve işaret de bildirir. |
| Klavye odağı | Kontrolün sınır rengi, zemini, metin rengi veya alt çizgisiyle görünür olur; ayrı odak halkası oluşturulmaz. |

Mevcut `muted` ve koyu tema paleti korunur. Sınır kuralları ve hedef boyutları [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) ve [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) ayrımını izler.

Açık temada `control-border`, `surface` üzerinde 3,15:1 ve `page` üzerinde 3:1 üzerindedir; `subtle` üzerinde 2,90:1'dir. Bu nedenle sınırı gerekli input'un yakın dış zemini `surface` veya `page` olmalıdır. Plan süre alanının çevresini stepper'ın `surface` zemini sağlar; +/- butonları kendi hafif yüzeylerini kullanır.

### Kayıtlı ve tahmini süre

[Kayıtlı süre ve anlık tahmin](docs/rules/duration.md) görsel olarak şu rollerle ayrılır:

- **Kayıtlı:** Daha koyu marka moru, `duration-recorded` (`#6554C0`).
- **Tahmini:** Daha sakin, daha düşük doygunluklu lavanta, `duration-estimated`.
- Koyu temada `dark-duration-recorded` ve `dark-duration-estimated` kullanılır.
- Süre çubuklarında kayıtlı ve tahmini bölümleri bitişik, kesintisiz iki düz tonla göster. Günün akışında lejant `Kayıtlı / Tahmini` etiketlerini gösterir. Toplam süre ana okumada yer alır; günlük süre ve hedef fare, klavye ve dokunmayla açılan tooltip'te sunulur.
- Zemin ile anlamlı grafik bölümleri arasında en az **3:1** kontrast hedefle. Dolgu anlamları lejant etiketleriyle açıklanır.
- Yüzdeler %100'ü aşabilir, fakat ilerleme çubuğu genişliği en fazla %100 olabilir. Fazla mesaiyi hata kırmızısıyla gösterme.
- Hesaplarda saniye hassasiyetini koru. Büyük sayıda saat/dakika baskın, saniye ve birimler ikincil kalsın.

Renk değerleri frontmatter'da, uygulama karşılıkları ortak süre tokenlarındadır.

## Typography

- **Sayfa başlığı:** `page-title`; sayfa başına bir ana başlık.
- **Bölüm başlığı:** `section-title`; gerektiğinde semantik hiyerarşi korunarak daha küçük kart başlığı kullanılabilir.
- **Modal başlığı:** `modal-title` (20 px/600, 1.3); bölüm başlığından ayrı basamaktır.
- **Ana metin:** `body` (14 px). Önemli içeriği yalnızca 12 px yardımcı metinle verme.
- **Etiket/kontrol metni:** `label`.
- **Yardımcı metin:** `helper` (12 px), yalnızca gerçekten ikincil bilgi.
- **Metrikler:** `metric`; sayıların arasında genişlik atlamaması için `tabular-nums`.
- **Metrik birimi:** büyük metriklerde `metric-unit` (15 px/500); kompakt veya dar kartlarda ana rakama göre 12–13 px olabilir. Saniye ikincil hiyerarşisini korur.
- Yazı ağırlıkları: gövde ve menü seçenekleri **400**, etiket ve düğmeler **500**, bölüm/modal başlıkları ve kısa vurgular **600**, sayfa başlıkları ve ana metrikler **700**. Marka yazısı kendi çizimini korur. `card-title` iç içe kart başlıkları ve ikincil metriklerde, `compact` kısa destek bilgisinde kullanılır. `character-title` Pofi odasının karşılama başlığına, `identity-name` kimlik kartındaki ada aittir; ana ürün başlıklarının yerine geçmez.
- Form metni masaüstünde `body` ölçüsünü kullanır. Dokunmatik kullanımda düzenlenebilir alanlar 16 px'e çıkar; bu, küçük yazılı alanlarda otomatik odak yakınlaşması yapan mobil tarayıcılar için ürün tercihidir. WCAG'nin genel bir asgari yazı boyutu değildir. Tarayıcı yakınlaştırması açık kalır.

Dil kısa ve anlaşılır olmalı. Pofis'in sistem metinleri açık konuşur, Pofi'nin mizahı ise kendi küçük alanında kalır. Yalnızca bir tasarım boşluğunu doldurmak için açıklama ekleme.

## Layout

- **4 / 8 / 12 / 16 / 24 / 32 px** ortak aralık ölçeğidir. Grafik işaretinin gerçek zaman konumu, ikon hizası ve metin ölçüsüne bağlı yerel hesaplar bu ölçeğe yuvarlanmaz. Bileşen istisnasını kendi CSS sahibinde gerekçesiyle yönet; aynı ihtiyaç tekrarlandığında ortak role taşı.
- Kart iç boşluğu varsayılan `spacing.panel` (24 px); büyük modal veya geniş alanlarda gerekirse 32 px.
- Başlık ile açıklama arasında çoğunlukla 4–8 px; açıklama ile ilgili kontrol arasında 12–16 px.
- Aynı kontrol grubunda 8–12 px; ayrı içerik gruplarında 24–32 px.
- Input ve ana kontrol için varsayılan minimum yükseklik 40 px, kompakt kontrol için 36 px, küçük metinli kontrol için 28 px'tir. İkon butonu varsayılan 40 px; modal kapatma/geri ve kompakt +/- için küçük basamak 32 px'tir. Yemek modalının kapatması tarih kontrolleriyle hizalanmak için standart 40 px basamağını kullanır. Metin büyüdüğünde kontroller içerikle uzayabilir; metni sabit yüksekliğe sıkıştırma. Görsel boyut ile tıklama hedefi ayrı değerlendirilir: WCAG 2.5.8 hedefi en az 24×24 CSS px veya geçerli istisnadır. Pofis dokunmatik kullanımda 44 px hedefi tercih eder; bu ürün tercihi WCAG AA eşiğiyle karıştırılmaz.
- Kartlar içerik kadar uzar. Yalnızca simetri için kısa kartları uzun kartlarla eşit yüksekliğe zorlama.
- Kart, modal ve kontrol radius'ları kendi rollerinde tutarlı kalır. Rozetler/pill'ler yalnızca anlamlı bir seçili durum için kullanılabilir.
- Sayfa genişliğini doldurmak zorunda değilsin; çok dar tek kolon ile geniş ve boş iki kolon arasında görev odaklı denge kur.
- Yedi sütunlu tarih seçiminde dar ekranın genişliğini koru: hücreler en az 24 px genişlik ve standart kontrol yüksekliğini sağlar. Dokunmatikte 44 px yükseklik korunur; yedi hücrenin genişliği ekrana sığacak şekilde paylaşılır. Takvim içinde yatay kaydırma oluşturma.

## Elevation & Depth

Yüzeyler zemin ve ince sınırla ayrılır. Kartın hafif gölgesi, popover ve modal gölgesi ortak CSS tokenlarından gelir: `--card-shadow`, `--popover-shadow`, `--modal-shadow`. Gölge odak göstergesinin veya kontrol sınırının yerine geçmez.

## Shapes

Kontroller `rounded.control`, paneller `rounded.panel`, modallar `rounded.modal` kullanır. Grafik uçları ve küçük işaretler `rounded.indicator` basamağındadır. İç içe sınırların optik hizası için dış radius eksi sınır kalınlığı hesaplanabilir. Daireler ve kapsül biçimleri yalnız işaret, anahtar veya belirgin gezinme biçiminde kullanılır; genel kartların yerine geçmez.

## Components

### Etkileşim ve formlar

- **Eylem hiyerarşisi:** Birincil eylem mor dolgulu; ikincil eylem hafif çerçeveli veya sade metin; tehlikeli eylem kırmızı ancak gerçekten tehlikeliyse.
- **Seçili durum:** `soft` yüzey + `accent-text` ve gerektiğinde birincil kontur. Yalnızca renkle seçim bildirme.
- **Hover:** Hafif yüzey veya `primary-hover`; kontrolün konumu ve boyutu değişmez.
- **Focus-visible:** Klavyeyle erişilebilen kontrollerde mevcut sınır rengi, zemin, metin rengi veya alt çizgi değişerek odağı belirginleştirir. Odak göstergesi olarak `box-shadow` kullanma.
- **Input:** `surface` zemini, `control-border` sınırı, tutarlı etiket ve yardımcı metin. Metin, sayı ve seçim alanları hem fare hem klavye odağında mevcut sınırı `accent-text`, zemini `soft` yapar; boyut ve sınır kalınlığı değişmez. Birimli alanlarda odak görünümünü dış kontrol taşır, iç input saydam kalır. Hatalı alanın odağı kırmızı sınır ve `error-soft` zeminle gösterilir. Tarayıcının varsayılan spinner'ı gibi tasarımdan kopuk görünümler gösterilmez. Erişilebilir form davranışı korunur.
- **Segmented control:** Hazır seçenekleri tek grupta göster. `Özel` gibi ek değer girişleri gerekiyorsa kontrolle ilişkili popover kullan; aynı ayar için iki eşzamanlı seçici gösterme.
- **Checkbox / switch:** Checkbox çoklu seçime, switch anlık aç/kapat durumuna uygun olduğunda kullanılır; ikisini görsel butonmuş gibi rastgele karıştırma.
- **Popover / modal:** Yerel, kısa seçim popover'da; çok adımlı bağlantı/kurulum akışı modaldadır. Kapatma, Escape, klavye odağı ve dar ekran davranışı net olmalıdır.
- **Durum geri bildirimi:** `Kaydedildi`, `Bağlandı`, `Hata` gibi ifadeler gerçek işlem sonucunu yansıtmalı; gereksiz kalıcı rozetlere dönüşmemeli.

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

Sayısal veriler tabular gösterilir. Saat/dakika baskın, saniye ikincildir. Birimli süreler `8 sa 3 dk 31 sn` biçimindedir; sıfır birimler atlanır, tam sıfır `0 sn`, bilinmeyen süre çizgiyle gösterilir. Giriş/çıkış saatleri `HH:mm:ss` biçimini korur. Plan kontrolleri dakika hassasiyetinde kısa gösterim kullanır; sıfır süreli açık gün `0 sa` olarak görünür. Tarihler İstanbul takviminden gelir; seçili aralık başka yıldaysa yıl görünür.

#### Günün akışı

[DayFlow](src/components/attendance/day-flow.tsx), geçen süreyi “Bugünkü mesai”, yanındaki küçük farkı “Hedefe kalan / Hedefin üzerinde” olarak gösterir. Tarih başlık yanındadır; canlı durum ve altta tekrarlayan saat özeti gösterilmez.

- Ortak [DurationTrack](src/components/primitives.tsx), [kayıtlı/tahmini süre](#kayıtlı-ve-tahmini-süre) rollerini kullanır. Hedef nötr çizgidir.
- Uç etiketi canlı günde “Şimdi”, hedefi aşan kapalı günde “Çıkış”, diğer kapalı günlerde “Son kayıt” olur. Lavanta uç etiketi metin kadar geniştir.
- “Hedef çıkış” saat ve nötr kesik bağlantıyla rayın altında yer alır; bağlantı rayın üst kenarından başlar. Satır mutlak konumlanır, lejant için alan ayrılır.
- İşaret çizgileri gerçek zaman konumunu korur; etiketler rayın kenarlarında içeri kayar. Eksen saatleri opak kart zeminiyle okunur. Eksen ilk girişten son kayıt/şimdi ile hedefin en ilerisine uzanır; hedef sondaysa saat yalnız hedef etiketinde görünür.

[Süre](docs/rules/duration.md), [hedef](docs/rules/work-plan.md) ve [ölçek](docs/rules/progress.md) hesapları kural sahiplerinden gelir. [Yerleşim stilleri](src/components/attendance/day-flow.css) demo ve canlıda ortaktır.

#### Haftalık toplam ve grafik

[WeeklyTotal](src/components/dashboard/weekly-total.tsx), toplam ve sakin hedefi aynı satırda “toplam / hedef” olarak sunar. Yüzde başlıkta dolgusuz mor metindir; kalan/aşan süre alta yaslanır. Hedefe tam eşit toplam “Hedefle eşit” olarak sunulur. Yaklaşık yüzde ve farkın erişilebilir etiketleri kayıt eksikliği veya belirsizliğini açıklar. Tamamlanmış haftada hedefin altındaki süre “Hedefin altında” etiketiyle gösterilir. Eksik veya belirsiz kayıtlarda geçmiş haftanın farkı ve yüzdesi yaklaşık işaretiyle sunulur; güncel haftada fark gösterilmez.

Yalnız güncel haftada gösterilen cetvelde her açık gün eşit genişliktedir. Bölümler kendi etkin günlük hedeflerine göre dolar; her bölümün doluluğu kendi günlük hedefine göre hesaplanır ve kendi sınırında kalır. Sıfır süreli açık gün görünür kalır; bilinmeyen süre belirsiz olarak gösterilir. Gün adı, toplam süre ve hedef ortak tooltip'te görünür.

[Haftalık grafik](src/components/attendance/week-chart.tsx) geçmiş haftada günlük süre sütunlarını gösterir. Geçmiş günler `--chart-past`, bugün `--accent` kullanır; ölçek yalnız görünen sürelerden gelir. Canlı girdi verildiğinde kayıtlı bölümün üstüne açık tahmin eklenir; tooltip kayıtlı süre ve canlı toplamı ayırır. Lejant “Günlük kayıtlı süre”dir. 400 px ve altında sütunların süre metni komşu sütuna taşmaması için gizlenir; tam süre klavye ve dokunmayla açılan tooltip ile erişilebilir etikette korunur.

### Gezinme ve kontroller

- **Görünüm:** girişte 40×40px kompakt ikon düğmesi, yan menü ve mobil menüde “Görünüm” yazısı ve aynı ikon kullanılır. Güneş açık, ay koyu görünümü belirtir; erişilebilir ad ve ipucu geçilecek görünümü söyler. Klavye odağı tema renginde belirgindir. Tema tercihi mevcut depolama sahibinde tutulur.
- **Giriş:** kullanıcı adı ve boş parola alanının placeholder'ı 14 px/400 ağırlık ve doğal harf aralığı kullanır; placeholder rengi `muted` tokenıdır. Kullanıcı adı ve açığa çıkarılan parola aynı 14 px/400 metin stilini korur. Yazılmış gizli parolanın maskesindeki noktalar 12 px görünür ve aralıklıdır. Şifre alanının sağındaki göz düğmesi şifreyi gösterir/gizler. Başlangıçta ve form gönderildiğinde şifre gizlidir. Düğme mevcut ikon, tema ve klavye odağı dilini kullanır; erişilebilir adı yapacağı eylemi söyler. Oturum doğrulanırken alan ve düğme devre dışıdır.
- **Hafta seçici:** aylık native popover, ayla kesişen pazartesi haftaları ve güncel haftaya dönüş. Gelecek haftalar kapalıdır; demo yakalama aralığıyla sınırlıdır. Seçim kapanır ve odağı tetikleyiciye döndürür.
- **Demo:** gün seçimi, sanal saat, hata ve durum mesajı senaryoları [demo rehberinde](docs/demo.md) yönetilir. Karşılaştırma demoları karar sonrasında temizlenir; durum demoları korunur.
- **Bildirim bağlantısı:** uygulamadaki Telegram kurulumu ortak modalda açılır. Yardım, token, sohbet seçimi ve işlem geri bildirimi aynı modalda yer alır; Escape ve kapatma odağı başlatan düğmeye döndürür.
- **Plan:** [PlanEditor](src/components/plan-editor.tsx), varsayılan plan ve tarih etiketli hafta sekmelerini üstte gösterir; seçilen kapsama ait bilgilendirme sekmelerin altında, çalışma günlerinden önce yer alır. Özel hafta noktası sekmededir. Pazartesi–cuma kartları tek sırada kalır. Açık gün nötr, kilitli gün lavanta ve kilit ikonlu, kapalı gün sakin nötr, seçili gün mor kenarlıdır.
- **Plan düzenleme:** gün adı/İzin–Aç eylemi ve kullanıcı kilidi solda, serbest süre girişi ile +/- sağdadır. Giriş tam dakika kabul eder; +/- 30 dakikalık çizgilere ilerler. Varsayılan sekmesinde Kapat–Aç kullanılır. Haftalık kart ve süre alanı aynı gereken süreyi gösterir. İzinli gün “İzinli”, şablondan kapalı gün “Kapalı”, sıfır süreli açık gün `0 sa` der. Kullanıcı kilidi süreyi korur ve açıkça kaldırılabilir. Geçmiş turnike kaydı bulunan gün ayrı kilitli gösterilir; gerçekleşen süre hesaplanamıyorsa “Süre belirsiz” görünür. Kayıtlı plan ve farklıysa şablon alt bilgide görünür.
- **Plan toplamları:** üstteki değer “Haftalık plan” etiketini taşır. Planın izin sonrası referans hedefe farkı alttaki eylem alanında “40 sa hedefine kalan: 1 sa” gibi gösterilir. Eylem sırası Planı sıfırla → Tamamla şeklindedir. Tamamla, Günlere eşit dağıt ve Son mesai gününe dağıt seçeneklerini düğmenin üstünde, yerleşimde alan açmadan gösterir. Seçim, dışarı tıklama, odak çıkışı veya Escape seçenekleri kapatır. Sıfırla manuel kilitleri kaldırır; kapasite yetmiyorsa Tamamla açıklamayla devre dışı görünür. [Hesap ve kayıt sözleşmesi](docs/rules/work-plan.md) bu belgedeki görsel kararlardan ayrıdır.
- **Mobil plan:** kontroller ve eylemler satır kırabilir; sayı ile birimi birlikte kalır. Dokunmatik kontroller 44px olur; diğer ölçüler plan CSS sahibindedir. Tam süreler erişilebilir etiketlerde korunur.
- **Rapor:** bugün ve geçmiş günler bağımsız native akordeondur. Kapalı satır gün, süre ve ilk giriş/son çıkış özetini gösterir. Gelecek günler her iki rapor görünümünde yalnız tarih, gün adı ve “Henüz gelmedi” yazan, açılmayan sade satırdır; saat, süre, hedef farkı ve detay oku gösterilmez. İstanbul takviminde gün geldiğinde normal rapor satırına geçer. Turnike uyarıları, hedef farkı, kayıtlı süre, durum ve ham hareketler ayrıntıdadır. Geniş tablonun ana satırında kısa kayıt durumu, açılan ayrıntısında turnike uyarıları bulunur. Hafta sonları yalnız kayıt/süre verisi varsa görünür. Ham liste ilk açılışta oluşturulur ve korunur. [Kayıt durumu sözleşmesi](docs/rules/record-status.md) ortaktır.
- **Pofi:** 156px durum görseli ve ortak başlık/mesaj düzeni; maskota basınca oda açılır. Albüm, notlar, kart, Pofi mesaisi ve sürprizler kendi sahiplerini kullanır.

### Odak, modal ve tooltip

Masaüstü güncellemesi ortak modalı kullanır. Stil sahibi [desktop-update.css](src/components/shell/desktop-update.css), düğme ve komut akışının sahibi [masaüstü sözleşmesidir](docs/desktop.md#açılışta-sürüm-denetimi).

Seçim vurgusu `--accent` zemin ve `--accent-content` metin kullanır; bilgi kutularının `--accent-soft` zemini üzerinde de ayırt edilir. Metin seçimi normal bağlantılar, açıklamalar, girdiler ve teknik ayrıntılarda açıktır; buton ve `.button-link` üzerinde kapalıdır. Rapor akordeonunda klavye odağı metin rengi, zemin ve alt çizgi değişimiyle tüm satırda görünür; ortak odak kuralı [etkileşim ve formlar](#etkileşim-ve-formlar) bölümündedir.

Ortak [Modal](src/components/modal.js) native dialog kullanır: Escape, kapatma düğmesi, açan kontrole odak dönüşü ve içeride kaydırma. Masaüstünde (700 px ve üzeri) yatayda ortalanır, üst kenarı ekranın üstünden 32 px uzaklıkta sabit kalır; sekme ve içerik değişimleri aşağı doğru büyür. Alt kenarda en az 32 px boşluk kalır, uzun içerik modal içinde kayar. Varsayılan başlangıç odağı kapatma düğmesinde, plan modalında başlıktadır. Mobil tutamak aşağı sürükleyerek kapatır. Modal köşeleri `rounded.modal`, başlıkları `modal-title`, dairesel kapatma düğmesi ve geri düğmesi varsayılan küçük ikon basamağını kullanır; yemek modalında standart kontrol basamağıyla hizalanır. Dokunmatik hedefler 44 px'tir.

Güncelleme modalında kopyalama sonucu kalıcı `role="status"` alanıyla duyurulur. Başarı duyurusu görsel olarak gizlidir; hata açıklaması komutun altında görünür. Dar menüden açılan modal kapanınca odak menü düğmesine döner.

Ortak [Tooltip](src/components/tooltip.tsx) portal üzerinden çizilir. Fare/klavye odağıyla açılır; dokunmayla açılıp kapanır. Escape ve dışarı dokunma kapatır. Ekran kenarında yatay kayar, üstte yer yoksa alta açılır. Kaydırma, boyut ve canlı içerik değişiminde yeniden ölçülür; dinleyiciler içerik değişiminde yeniden kurulmaz. Grafik sütununun tamamı tetikleyicidir; konum görünen bölümden ölçülür. [Konum hesabı](src/components/tooltip-position.ts) ve [tema stilleri](src/components/tooltip.css) ortaktır.

### Hata ve yardımcı ekranlar

Giriş, hata, yükleme ve 404 ortak shell/temayı kullanır. Beklenen giriş hatası formda; sistem hatası normal hata ekranında; rapor varken yenileme hatası rapor üzerinde sunulur. Yerel plan/tema sorunları kompakt [InlineNotice](src/components/inline-notice.tsx) kullanır.

[RequestError](src/components/request-error.js) lavanta Pofi sahnesini, işleme uygun eylemi ve sürekli açık İz kaydını sunar. Tam sayfada Pofi masaüstünde sağda, dar ekranda üsttedir; bildirimde küçük Pofi sağda kalır. Teknik ayrıntılar kutusuz gruplar kullanır, uzun değerler satır kırar. Demo ve canlı ekranlar aynı bileşenleri kullanır.

Hata sınıfları, form odağı, eski rapor, kopyalama ve yeniden deneme davranışı [hata sözleşmesinde](docs/pdks-errors.md); doğrulama yöntemi [doğrulama rehberinde](docs/verification.md) yönetilir.

### Bildirim kontrolleri

Bildirim ekranı masaüstü, web ve demoda ortak `NotificationSettings` bileşenini kullanır. Demo aynı kontrolleri ve akışları bellekte çalışan örnek bağlantı/kayıt işlemleriyle sunar. Geniş ekranda Hatırlatmalar ve Bildirim kanalları 65/35 oranlı iki sütunda, dar ekranda tek sütunda görünür. Her hatırlatmanın altında Masaüstü ve Telegram switch’leri bulunur. Telegram bağlantısı yalnız Bildirim kanalları bölümünden açılır. Bağlı olmayan Telegram, hatırlatmalar altında pasif kanal seçeneği olarak görünür; kayıtlı tercihler korunur. Hatırlatma öncesi tek segmented control içinde 5 / 10 / 15 / 30 dakika ve Özel seçenekleri bulunur; Özel, tetikleyiciye bağlı küçük giriş popover’ı açar. Hatırlatma süreleri ve kanal tercihleri mevcut açık kaydetme eylemini kullanır. Telegram kurulumu masaüstünde en fazla 480 px genişliğindeki ortak modalda kademeli açılır: önce token ve Sohbeti bul, ardından sohbet seçimi ve Bağla. Elle sohbet kimliği girişi gerektiğinde açılır; hatalar ilgili formda kalır. [Davranış sahibi](docs/rules/notifications.md).

## Do's and Don'ts

### Bileşen kalitesi ve tutarlılık

1. Yeni arayüz oluşturmadan önce mevcut Pofis kart, input, buton, navigasyon ve overlay bileşenlerini incele; varsa yeniden kullan.
2. Etkileşimli olmayan yemek, durum ve bilgi satırlarını buton veya seçilebilir kutu gibi gösterme.
3. Bir bölümün önemini çerçeve kalınlığıyla değil, sıralama, tipografi ve boşlukla anlat.
4. Pofi illüstrasyonu kullanıcının asıl işini gölgelememeli; yardımcı not olarak sıcaklık katmalıdır.
5. Masaüstü ve mobil düzen aynı bilgi hiyerarşisini taşımalı. Dar ekranda taşma ve iç içe gereksiz scroll yaratma.
6. Anahtar adı, palet veya bileşen değiştirmeden önce mevcut kullanımları kontrol et; aynı role ait yeni eşanlamlı token oluşturma.

### Kabul kriterleri

- Normal metin için en az **4.5:1**, büyük metin için en az **3:1** kontrast; anlamlı kontroller/grafik işaretleri için en az **3:1** hedeflenir.
- İnce dekoratif kart border'ı tek başına bilgi taşımıyorsa 3:1 olmak zorunda değildir; input sınırı veya kritik durum işareti bununla karıştırılmaz.
- Light ve varsa dark temada gerçek bileşenler kontrol edilir; token çiftlerinin kontrastını ölçmek tek başına bütün ekranın erişilebilir olduğunu kanıtlamaz.
- Yalnızca mor tonuna, yeşil renge veya kırmızıya bakılarak anlam çıkarmak gerekmemelidir.
- Hızlı taranabilirlik korunur: önce içerik/mesai bilgisi, sonra ayarlar ve yardımcı açıklamalar.
- Yeni bağımlılık, yeni tema, yeni kart veya yeni bileşen yalnızca görsel boşluk doldurmak için eklenmez.
- %200 metin büyütmede içerik ve eylemler korunur. 320 CSS px genişlikte (1280 px pencerenin %400 yakınlaştırılmasına eşdeğer yeniden akış genişliği) sayfa iki yönde kaydırma gerektirmez; anlamı için iki boyut isteyen içerik ayrı değerlendirilir. [Metin büyütme](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) ve [yeniden akış](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) kabulde ayrı kontrol edilir.
- Klavye ile menü, form, modal ve tooltip'e ulaşılır; odak görünür kalır ve kapatmada anlamlı yere döner. Grafik bilgisi lejant ve metinlerle açıklanır. `prefers-reduced-motion` altında açılma/kapanma sonucu animasyona bağlı değildir.
