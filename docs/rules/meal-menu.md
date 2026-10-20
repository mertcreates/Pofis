# Yemek menüsü

Ana ekrandaki **Yemek menüsü** yalnız açık oturumda görünür. Seçilen İstanbul takvim günü, bugünden bir takvim ayı öncesi ile 15 gün sonrası arasında olabilir. Menü TRT İstanbul `get_meal.php` kaynağından `date=YYYY-MM-DD` parametresiyle alınır. [Sunucu adaptörü](../../src/server/meals.ts) gün ve yanıtı doğrular, aynı güne eşzamanlı istekleri birleştirir ve başarılı yanıtı (boş gün dahil) bir saat bellekte tutar. Kaynak hatası önbelleğe alınmaz. Önbellek süreç belleğindedir; yeniden başlatmada boşalır.

[Ayrıştırıcı](../../src/lib/meals/presentation.ts), gözlenen altı satırlı kayıtta ana yemek seçeneklerini, `VJT.` işaretli vejetaryen yemeği, ortak pilavı/yan yemeği ve alt seçenekleri ayırır. İşaretler veya sıra güven vermediğinde tüm kaynak satırlarını olduğu gibi gösterir. Birleşik satırın kalorisi seçeneklere paylaştırılmaz. [Modal](../../src/components/meals/menu-modal.tsx) yükleme, boş gün ve kaynak hatasını ayrı gösterir; Pofi notu seçilen menü adlarından [yorum sahibiyle](../../src/lib/meals/commentary.ts) üretilir.

20 Eylül–20 Ekim 2026 arasındaki [31 günlük kaynak kaydı](../../src/lib/meals/history-sample.json), Pofi metin çalışmaları ve ayrıştırma testleri için korunur. Canlı menü yanıtı olarak kullanılmaz; sonraki aylar için otomatik arşivleme sözleşmesi yoktur.
