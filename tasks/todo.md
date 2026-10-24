# Açık işler

Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul durumu ve yöntemleri [doğrulama rehberindedir](../docs/verification.md#kabul-durumu).

## Sonraki işler

- [ ] Referans dosyası ve Pofi görsellerindeki tabii logosunun public dağıtım koşullarını TRT ile netleştir. [Lisans kapsamı](../ASSET-LICENSE.md#tabii-logosu).
- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.

Kurum sunucusunda dağıtım gündeme geldiğinde Docker, HTTPS/ingress, kalıcı oturum, disk izinleri ve kapasite kontrollerini [dağıtım rehberinden](../docs/deployment.md#dağıtım-kabulü) aç. [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md) bu dağıtımın sözleşmesidir.
