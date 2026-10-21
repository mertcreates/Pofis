# Pofi yemek yorumları

## Sonuç ve kapsam

Yemek yorumu havuzu, eşleştirme/seçim motoru ve mevcut API/modal bağlantısı tamamlandı. Güncel davranış, içerik sahipleri ve bakım komutları [yemek menüsü sözleşmesinde](../docs/rules/meal-menu.md) yönetilir. Pofi metinlerinin sahibi [ton rehberidir](../docs/brand/pofi-tone-guide.md).

- Havuz 99 senaryo ve 250 bütün not içerir; her senaryonun 2–3 varyantı vardır.
- Öncelik: birliktelikler → ana yemek/vejetaryen → diğer yemekler → içecek → sofra sahneleri.
- Hesap anahtarı ve seçili gün aynı menü/katalog için aynı notu verir. Hesap anahtarı sunucuda kalır.
- Menü ayrıştırması ve kalori kapsamı korunur. Gösterimde Türkçe harf düzeni uygulanır; kaynak kayıtları korunur.
- Gün geçişlerinde statik skeleton ve genişliğe göre sıfırlanan yükseklik koruması kullanılır.

## Korunan araştırma verisi

Kullanıcının isteğiyle 20 Nisan–20 Ekim 2026 aralığındaki 184 gün/186 kayıt saklanır. Aynı günün farklı kayıtları birlikte korunur; sıklıklar öğenin bulunduğu farklı gün sayısıdır. Bu dosyalar çalışma zamanında yüklenmez ve canlı menü için yedek olarak kullanılmaz.

- [Kaynak arşivi](../data/meals/history.json)
- [Toplama durumu](../data/meals/collection.json)
- [Öğe sıklıkları](../data/meals/frequencies.json)
- [Önceki 31 günlük örnek](../src/lib/meals/history-sample.json)

## Kalan kabul

Kod ve içerik kontrolleri tamamlandı. Tarayıcı kabulü kullanıcının isteğiyle kendisinde; menü açma, gün değiştirme, yükleme/boş/hata durumları ve dar ekran kontrolü [görev listesinde](todo.md#arayüz-kabulü) izlenir.

21 Ekim 2026 tarihli kullanıcı talimatı, yemek menüsü kapsamındaki temizlik, doküman güncellemesi, stage ve yerel commit işlemlerini kapsar.
