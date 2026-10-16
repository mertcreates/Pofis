# Doğrulama rehberi

Kontrolü değişen davranışa göre seçin. Beklenen sonucu ürün sözleşmesinden alın; otomatik test, fixture tarayıcı kabulü ve gerçek kaynak kabulünün kapsamlarını ayrı belirtin.

## Yerel kontroller

```powershell
bun test
bun run typecheck
bun run build
```

Önce etkilenen test dosyalarını çalıştırın. Hesap ve ortak politika değişikliklerinde ilgili bağımlı davranışları da kontrol edin. Üretim derlemesi, derleme veya çalışma zamanı etkisi olan değişikliklerin son kontrolüdür; görsel iterasyon `bun run dev` ile yapılır.

| Değişiklik | Kontrol |
| --- | --- |
| Ürün kuralı | [Kural belgesindeki](rules/README.md) somut senaryolar ve bağımlı davranış testleri |
| Tipli kod | Tür kontrolü |
| Görünür akış | Tarayıcıda ilgili giriş → işlem → sonuç zinciri; etkilenen boş/hata/mobil durumları |
| Oturum veya kaynak erişimi | İzolasyon, iptal/TTL, kalıcılık ve kaynak hata testleri; gerekli gerçek hesap kabulü |
| Dağıtım | [Kurum ortamı kabulü](deployment.md#dağıtım-kabulü) |
| Belge | Diff, yerel bağlantılar, kod sahibiyle tutarlılık ve `bun test src/domain/rules/rules.test.ts` |

[Kurallar testi](../src/domain/rules/rules.test.ts) modül belgelerini, kural bağlantılarını ve bağımlılık sınırlarını denetler. Serbest metin ile kodun anlamca tutarlılığı ayrıca incelenir.

## Tarayıcı ve gerçek kaynak

[Mesaim demosu](demo.md) ortak bileşenleri yakalanmış verilerle incelemek içindir. [Fixture kabul betiği](../scripts/acceptance/archive-behavior.js) giriş, rapor, plan, Pofi ve hata akışlarını sahte API yanıtlarıyla sınar. Bu kontroller canlı PDKS erişimini veya kurum kapasitesini kanıtlamaz.

Gerçek kaynak ve dağıtım kabulünde kurum ağı, kullanıcı hesabı ve hedef çalışma ortamı kullanılır. `/api/health` uygulamanın ayakta olduğunu gösterir; PDKS bağlantısını kanıtlamaz. Bekleyen senaryolar [görev listesinde](../tasks/todo.md) yönetilir.

Yerel oturum ölçümü için `bun scripts/benchmark-sessions.ts 100` çalıştırılabilir. [Betik](../scripts/benchmark-sessions.ts) sahte kaynak ve izole oturum dosyaları kullanır; geçici sonuç `work/session-benchmark/latest.json` dosyasına yazılır. Sonuç incelendikten sonra temizlenir; gerçek PDKS iş yükü ayrıca ölçülür.

## Sonuçların yönetimi

Sonucu ve kanıtın sınırlarını kullanıcıya bildirin. Tamamlanan doğrulamaların rapor, ekran görüntüsü ve ölçüm çıktılarını temizleyin. Geçerli ürün kararlarını ilgili sözleşmeye, açık bulguları görev listesine taşıyın. Test kodu ve tekrar kullanılabilir kabul betikleri doğrulama yönteminin parçasıdır.
