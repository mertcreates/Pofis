# Pofis — Asset ve UI QA v1.0

> Kullanıcı kaynak paketinin özgün QA kaydıdır; yalnız marka kiti prototipine aittir. Mola düşen örnek hesaplar ve eski görsel sonuçlar güncel Pofis kabulü sayılmaz. Güncel [süre kuralı](../../../docs/rules/recorded-time.md) ve [doğrulama yöntemi](../../../docs/verification.md) kendi sahiplerindedir.

## Gerçekleştirilen kontroller

- [x] Tam gövde kanonik görsel mevcut: şeffaf PNG ve WebP
- [x] 512 ve 256 px web varyantları oluşturuldu
- [x] Küçük kafa sembolü gerçek SVG olarak çizildi, 32/64/192/512 px raster türevleri üretildi
- [x] Logo referansının asıl rengi ölçüldü: `#00FF99`
- [x] Yüz, kıvrım, kulak, pati, kart ve kuyruk önden referansta korundu
- [x] Dashboard'da aynı statik Pofi asset'i kullanıldı
- [x] Light-mode desktop ve mobile önizlemeleri üretildi
- [x] Masaüstü demo verilerindeki hedef, haftalık toplam, mola ve çıkış hesapları uyumlu
- [x] Hedef ayarları güncellenince yüzdeler ve tahmini çıkış yeniden hesaplanıyor
- [x] Rapor CSV indirme ve örnek kayıt penceresi çalışıyor
- [x] 390 px mobil görünümde yatay overflow yok
- [x] JavaScript hata kontrolünden geçildi

## Ölçülen kontrast örnekleri

| Metin / arka plan | Oran |
| --- | ---: |
| Primary / Primary Content | 5.72:1 |
| Text Secondary / Surface | 6.70:1 |
| Text Muted / Surface | 5.65:1 |
| Accent Text / Accent Soft | 7.22:1 |
| Border Strong / Surface | 3.40:1 |

**Sınırlar:** Bu kontroller tam otomatik WCAG denetimi değildir. Bütün gerçek PDKS durumları ve arayüz varyantları için ayrıca test gerekir. Açı görselleri tamamen eşit geometri garantisi vermez. AI üretimindeki personel kartı logosunun piksel-birebir doğruluğu teyit edilmemiştir; resmi kullanımda kullanıcının sağladığı orijinal logo ile son eşleştirme gerekir.

## Demo veri tutarlılığı

- 08:57 → 12:31 = 3 sa 34 dk çalışma
- 12:31 → 13:23 = 52 dk mola
- 13:23 → 16:13 = 2 sa 50 dk çalışma
- Toplam çalışma = 6 sa 24 dk
- Günlük hedef = 8 sa → kalan 1 sa 36 dk
- Çıkış tahmini = 17:49
- Hafta toplamı = 36 sa 20 dk (günlerin toplamı)
- Haftalık hedef = 40 sa → %90.8 ≈ %91

Verilerin tümü örnektir; gerçek PDKS giriş/çıkış kaydı değildir.
