# Pofi karakter kaynakları ve prototip

Bu klasör özgün karakter dosyalarını, üretim referanslarını ve bağımsız arayüz prototipini içerir. Güncel Pofis kapsamı [PRODUCT](../../PRODUCT.md), tasarım kararları [DESIGN](../../DESIGN.md), dil ve slogan [ton rehberi](../../docs/brand/pofi-tone-guide.md) sahibindedir. Etkin uygulama görselleri [görsel kaynaklar](../../docs/brand/assets.md) belgesinde listelenir.

**Pofis** için Soft Lavender / light-mode, statik kedi maskotlu, çevrimdışı çalışabilen tasarım prototipi.

## Başlangıç

`index.html` dosyasını modern bir tarayıcıda açın. Dashboard örnek verilerle çalışır. Ayarlar'dan günlük/haftalık hedefleri değiştirebilir, Raporlar'dan CSV indirebilirsiniz. Gerçek PDKS sistemiyle herhangi bir bağlantı **yoktur**.

Önizleme dosyaları: `preview/dashboard-desktop.png`, `preview/dashboard-mobile.png`, `preview/character-sheet.png`.

## Dosyalar

- `index.html` — Çalışan dashboard prototipi
- `styles.css` — Light-mode renkler, düzen, responsive bileşenler
- `app.js` — Tutarlı demo hesaplamaları, modal ve CSV davranışı
- `assets/pofi-full.webp` — Kanonik tam gövde, web için optimize
- `assets/pofi-full-512.webp` — Dashboard için küçük tam gövde
- `assets/pofi-full.png` — Şeffaf yüksek çözünürlüklü kayıpsız kaynak
- `character-sheet.html` — Karakter kimliği kontrol sayfası
- `docs/CHARACTER_BIBLE.md` — Değişmeyen karakter özellikleri
- `docs/MASTER_PROMPT.md` — Referans dosyalı üretim promptu
- `references/` — Orijinal logo ve keşif görselleri, üretim referansları

## Prototipin kapsamı

Demo verileri `app.js` içindeki `sample` objesindedir. Mola düşen hesap ve CSV dışa aktarma bu bağımsız prototipe aittir. Uygulamanın [kayıtlı süre](../../docs/rules/recorded-time.md) hesabı ilk giriş–son çıkışı kullanır; ara molaları düşmez. Güncel ekranı incelemek için uygulamanın [Mesaim demosunu](../../docs/demo.md) kullanın.

## Önemli sınırlamalar

Pofi'nin **önden tam gövde** illüstrasyonu yüz ve karakter kimliğinin referansıdır; yeni üretimlerin dik duruşu karakter kurallarında tanımlanır. Diğer AI üretimi perspektif görsellerde küçük şekil farkları bulunabilir. Uygulamanın marka simgesi `public/pofi/pofi-mark-256.png` dosyasıdır. Personel kartındaki küçük logo görsel üretiminden geldiği için gerçek logo referansıyla karşılaştırılmalıdır.

`references/pofi-original-ai-sheet.png` üzerindeki “tabii Mascot” başlığı eski AI çıktısından gelmiştir ve ürün adı olarak doğru değildir. Nihai adlar **Pofis / Pofi** olarak bu pakette düzeltilmiştir.
