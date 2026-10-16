# Pofis — Brand & UI Kit v1.0

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
- `assets/pofi-mark.svg` — Gerçek vektör, basitleştirilmiş Pofi kafa sembolü
- `assets/pofi-mark-64.webp` — Küçük raster sembol
- `assets/pofi-mark-32.png` — Favicon
- `character-sheet.html` — Karakter kimliği kontrol sayfası
- `docs/CHARACTER_BIBLE.md` — Değişmeyen karakter özellikleri
- `docs/MASTER_PROMPT.md` — Referans dosyalı üretim promptu
- `docs/BRAND_GUIDE.md` — Kullanılan tasarım token'ları
- `references/` — Orijinal logo ve keşif görselleri, üretim referansları

## Gerçek PDKS entegrasyonu

Demo verileri `app.js` içindeki `sample` objesindedir. Gerçek uygulamada statik örnek kayıtlar yerine **yetkili PDKS veri kaynağından** gelen giriş, çıkış ve mola kayıtları kullanılmalıdır. Hesaplamalar kullanıcı hedefi, mola kuralı, vardiya ve saat dilimi dikkate alınarak yeniden doğrulanmalıdır. Tahmini çıkış ile gerçekleşmiş çıkış ayrı alanlarda tutulmalıdır.

## Önemli sınırlamalar

Pofi'nin **önden tam gövde** illüstrasyonu kanoniktir. Diğer AI üretimi perspektif görsellerde küçük şekil farkları bulunabilir. `pofi-mark.svg` basitleştirilmiş bir vektör sembolüdür ve tam gövde illüstrasyonunun birebir vektör sürümü değildir. Personel kartındaki küçük logo görsel üretiminden geldiği için gerçek logo referansıyla karşılaştırılmalıdır.

`references/pofi-original-ai-sheet.png` üzerindeki “tabii Mascot” başlığı eski AI çıktısından gelmiştir ve ürün adı olarak doğru değildir. Nihai adlar **Pofis / Pofi** olarak bu pakette düzeltilmiştir.
