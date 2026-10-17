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

Masaüstünde 230px sol menü, en fazla 1530px ana içerik alanı vardır. Güncel haftada üç özet kartı, ardından 1,65:1 oranında gün akışı/Pofi ve haftalık grafik/gün kayıtları satırları bulunur. Giriş–çıkış tablosu alttadır. Geçmiş haftada dört metrik ve alt alta haftalık grafik/rapor tablosu gösterilir.

1170px altında orta/alt satırlar tek sütuna iner. 1000px altında sol menü üstte açılır menüye dönüşür. 700px altında güncel hafta metrikleri tek sütundur. 600px altında rapor tablosu etiketli gün kartlarına dönüşür. Diğer kırılımların ve boşlukların yürütülen kaynağı CSS'dir.

## Sürelerin gösterimi

Günlük/haftalık ilerleme ve gün akışı ortak [DurationTrack](src/components/primitives.tsx) kullanır. [current-contracts.css](src/app/current-contracts.css) üç bilgiyi sunar:

1. Kayda dayalı süre: `#8b7bff`.
2. Ek anlık tahmin: açık temada `#c9c2f2`, koyuda `#514a73`.
3. Hedef: nötr çizgi; kalan alan yüzey tonudur.

İki bölüm düz renktir. Süre bölümlerinin hesap sahibi [süre kuralıdır](docs/rules/duration.md). Hedefler [plan sahibinden](docs/rules/work-plan.md), ölçek [ilerleme sahibinden](docs/rules/progress.md) gelir. Belirsiz değer çizgi ve durum metniyle gösterilir.

Haftalık grafik kaynak sütun yapısını kullanır: geçmiş günlerde `--chart-past`, bugün `--accent`; hedef çizgisi/lejantı bulunmaz. Sütun genişliği `min(51%, 49px)`, üst köşeler 5px'tir. [Ölçek sahibi](docs/rules/progress.md) yalnız gösterilen süreleri kullanır. Boş gün sıfır yüksekliktedir. Canlı günde kayıtlı bölümün üstüne ek tahmin yerleşir; tooltip kayıtlı süre ve tahmini toplamı gösterir. Lejant “Günlük kayıtlı süre”dir.

## Etkileşimler

- **Metin seçimi:** butonlarda ve `.button-link` eylem bağlantılarında metin seçimi kapalıdır. Normal metin bağlantıları, başlıklar, açıklamalar, form girdileri ve teknik ayrıntılar seçilebilir kalır. Bu davranış [ortak CSS](src/app/globals.css) sahibindedir; klavye odağını ve ekran okuyucu etiketlerini değiştirmez.

- **Hafta seçici:** aylar üzerinden gezinilen native popover, kesişen pazartesi haftaları, güncel haftaya dönüş. Gelecekteki haftalar devre dışıdır. Demo haftaları yakalama aralığıyla sınırlıdır. Seçim kapanır ve odağı tetikleyiciye verir.
- **Demo gün seçici:** beş hafta içi gün düğmesi ve anlık ek süre sürgüsü; seçili gün lavanta tonuyla belirtilir. Dar ekranda günler tek satırda, açıklama alt satırda gösterilir. Tarih/saat ve sanal süre davranışı [demo sözleşmesindedir](docs/demo.md).
- **Ayarlar:** kaynak plan modalını açar. Geçerli gün/haftalık saat/günlük saat değişiklikleri anında kaydedilir. Kapatma ve Escape kayıtlı sonucu korur; yazma hatası gösterilir.
- **Rapor:** altı sütun, her günde bağımsız açılan kronolojik ham geçiş listesi. [Kayıt durumu](docs/rules/record-status.md) gün akışıyla ortak etiketi kullanır. Hedef altı süre ayrı fark alanında kalır; belirsiz geçişte bilinen kayıtlı süre korunur, hedef farkı çizgiyle gösterilir. Günün kayıt kartı son dört aralığı gösterir; dolu günde tümünü modalda açar.
- **Modal:** native dialog, kapatma düğmesine başlangıç odağı, Escape ve açan kontrole odak dönüşü. İçerik kendi içinde kayar. Mobil tutamağı aşağı sürükleyerek kapatılır.
- **Pofi:** kanonik 156px durum görseli, kaynak rozet/metin düzeni, maskota basarak oda. Albüm, not defteri, kart, Pofi mesaisi ve sürprizler mevcut ortak sahipleri kullanır.
- **Tema:** kaynak çizimli/animasyonlu switch ve ortak tarayıcı tercihi. Reduced-motion CSS hareketi sınırlar.
- **Odak:** kullanıcı tercihiyle ton, metin alt çizgisi ve 2px iç kenar kullanılır. Dış outline eklenmez.
- **Grafik tooltip'i:** tahmin bölümüne CSS anchor positioning ile bağlanır. Ortalanan kutu yatayda görünür alana kayar; üstte yer yoksa `flip-block` ile aşağı açılır. Hover/klavye odağı gösterir, Escape kapatır. Konumlandırma `pofis.css`, Escape davranışı `use-chart-tooltip.ts` sahibindedir.
- **Gün akışı hedefi:** eksen ilk girişten son kayıt/şimdi ile hedefin en ilerisine uzanır. Kaynak `timeline-target-marker` ince hedef çizgisini, `--target-position` hedef etiketinin ortalanıp kart içinde kalmasını yönetir. Hedef eksenin sonundaysa saat eksende bir kez gösterilir; içerideyse hedef yazısının altında yer alır. Süre hesabı ortak sahibinde, bu konumlandırma [DayFlow](src/components/attendance/day-flow.tsx) içindedir.
- **Yardımcı ekranlar:** kaynak giriş kartı, hata/tanı görünümü, yükleme maskotu, 404 ve sürüm notu aynı shell ve temayı kullanır. Yanlış giriş bilgileri şifre alanının altında kısa metin ve iki alanda ince hata kenarıyla gösterilir; odak şifreye döner, kullanıcı adı açık formda korunur. Sistem hataları giriş kartının yerini normal hata ekranıyla alır; kart içinde hata kartı bulunmaz. “Girişe dön” boş formu açar, giriş isteğini tekrarlamaz. Oturum bitişi formda kutusuz, nötr durum metniyle sunulur. Pofi yanlış bilgide normal, sistem hatasında hata duruşunu kullanır; beklenen giriş/oturum hataları teknik tanı içermez. Sistem hatasının teknik ayrıntıları İz kaydı düzeninde sürekli görünür. Eski rapor varsa hata kısa bildirim olarak raporun üzerinde kalır; rapor yoksa tek hata görünümü sunulur. Her yeniden deneme hatayı üreten işlemi çalıştırır. [Hata sözleşmesi](docs/pdks-errors.md).
- **Tam sayfa hata hiyerarşisi:** lavanta Pofi sahnesinde başlık, kısa açıklama ve işleme uygun ana düğme; masaüstünde metin solda ve Pofi sağda, dar ekranda Pofi üsttedir. Teknik ayrıntılar altta çerçevesiz İz kaydı düzeninde sürekli görünür. Demo ve canlı ekranlar aynı [RequestError](src/components/request-error.js) bileşenini ve stillerini kullanır.
- **Teknik ayrıntı yerleşimi:** “Sorunun nedeni” açıklama, kod ve kısa İstanbul zamanını; “İstek ayrıntıları” Pofis API ve PDKS alanlarını kendi altında toplar. Boş kaynak grubu çizilmez; API HTTP durumu kaynak yanıtı olarak sunulmaz. Alanlar yalnız boşlukla gruplanır, uzun değerler satır kırar. [Tanı bileşeni](src/components/request-error-details.tsx) izinli veriyi sunar; kopyalama özgün zaman damgasını korur.

Bildirim hatalarında Pofi Sahne düzeni kullanılır: lavanta yüzeyde mesaj ve işleme uygun eylem, sağda küçük Pofi, altta açık İz kaydı. Canlı ekranlar ve demo ortak RequestError bileşenini kullanır; alternatif tasarımlar tutulmaz.

Yerel ayar hataları ve eski rapor bilgisi [InlineNotice](src/components/inline-notice.tsx) ile kompakt gösterilir. Depolama sorunu nötr yüzeyde uyarı simgesiyle, eski rapor lavanta durum satırıyla sunulur; teknik tanı ve büyük Pofi sahnesi kullanılmaz. Plan doğrulaması ilgili alanın altında kalır. Not defterinde içerik eksikliği tarih ve gezinmeyi koruyan nötr metindir. 404 ortak lavanta sayfa sahnesini, Mesaim'e dönüşü ve mevcut Pofi sürprizini kullanır. Bu alanların sözleşmesi [hata rehberindedir](docs/pdks-errors.md#uygulama-içi-hata-ve-yerel-bildirimler).
