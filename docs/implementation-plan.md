# Uygulama planı

## Mevcut yapı

| Alan | Uygulanan kapsam |
| --- | --- |
| Mesai verisi | Kişisel turnike listesinin bütün sayfaları; tek günlük özet, süre ve kayıt durumu sahipleri |
| Mesaim | Güncel haftada gün akışı, günlük cetvelli haftalık toplam ve akordeon rapor/Pofi; geçmiş haftada dört metrik, grafik ve tablo; ortak hafta seçici ve plan modalı |
| Demo | Aynı görünüm ve kurallar; dört haftalık yakalama, gün seçimi ve sanal ek süre |
| Plan | Varsayılan şablon, gereken süre üzerinden hafta düzenleme ve yerel kayıt; hesap ve dağıtım ayrıntıları [plan sözleşmesinde](rules/work-plan.md) |
| Pofi | Kaynak durum görselleri, albüm, sürprizler ve tek havuzlu not yönetimi |
| Oturum | Kullanıcı başına PDKS istemcisi, sabit TTL, JSON kalıcılığı ve kısa kişisel rapor önbelleği |
| Dağıtım | Yerelde standart Next komutları; Docker'da tek Bun süreci, standalone çıktı ve kalıcı oturum dizini |
| Masaüstü | [Ortak Electron kabuğu, paketleme, kurulum/güncelleme ve kaldırma](desktop.md); eski paketler açılış öncesi temizlenir. [Üç hedefli release otomasyonu](release.md) yerelde hazır, native CI/canlı yayın kabulü görev listesinde |

[Kural sahipleri](rules/README.md) · [Arayüz sahipleri](ui-source-migration.md) · [Oturum mimarisi](architecture/multi-user-sessions.md).

## Sonraki aşama

Gerçek kaynakta açık giriş ve oturum yaşam döngüsünü, ardından kurum ortamında dağıtım ve kapasiteyi doğrulayın. Tek süreç başlangıç noktasıdır; ortak depo ve çoklu replica ihtiyacı ölçüm veya yüksek erişilebilirlik gereksinimine göre değerlendirilir.

İzlenecek bütün kabul ve geliştirme işleri [görev listesinde](../tasks/todo.md) tutulur. Kontrol yöntemi [doğrulama rehberindedir](verification.md).
