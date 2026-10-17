# Uygulama planı

## Mevcut yapı

| Alan | Uygulanan kapsam |
| --- | --- |
| Mesai verisi | Kişisel turnike listesinin bütün sayfaları; tek günlük özet, süre ve kayıt durumu sahipleri |
| Mesaim | Kaynak ekran düzeni, hafta seçici, metrikler, gün akışı, grafik, ham kayıtlar ve plan modalı |
| Demo | Aynı görünüm ve kurallar; dört haftalık yakalama, gün seçimi ve sanal ek süre |
| Plan | Anında yerel kayıt; seçili günlere dağılım ve son çalışma gününde haftalık denge |
| Pofi | Kaynak durum görselleri, albüm, sürprizler ve tek havuzlu not yönetimi |
| Oturum | Kullanıcı başına PDKS istemcisi, sabit TTL, JSON kalıcılığı ve kısa kişisel rapor önbelleği |
| Dağıtım | Tek Bun süreci, standalone çıktı, Dockerfile ve kalıcı oturum dizini |

[Kural sahipleri](rules/README.md) · [Arayüz sahipleri](ui-source-migration.md) · [Oturum mimarisi](architecture/multi-user-sessions.md).

## Sonraki aşama

Gerçek kaynakta açık giriş ve oturum yaşam döngüsünü, ardından kurum ortamında dağıtım ve kapasiteyi doğrulayın. Tek süreç başlangıç noktasıdır; ortak depo ve çoklu replica ihtiyacı ölçüm veya yüksek erişilebilirlik gereksinimine göre değerlendirilir.

İzlenecek bütün kabul ve geliştirme işleri [görev listesinde](../tasks/todo.md) tutulur. Kontrol yöntemi [doğrulama rehberindedir](verification.md).
