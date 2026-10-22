# Açık işler

Davranış sözleşmeleri [kural haritasında](../docs/rules/README.md), kabul durumu ve yöntemleri [doğrulama rehberindedir](../docs/verification.md#kabul-durumu).

## Sonraki işler

- [ ] [Mevcut Pofi görsel setlerinin](../docs/brand/pofi-review-2026-10-15/README.md) uygulamaya alınacak dosyalarını kullanıcıyla belirle; yeni üretim ihtiyacını bu seçime göre netleştir.
- [ ] Masaüstü heartbeat zaman aşımını [ortak oturum politikasına](../src/domain/rules/session-policy.ts) bağla. [Masaüstü adaptöründeki](../src/desktop/install-notifications.ts) sabit 10 saniye yerine `heartbeatTimeoutMs` kullan; politika değişikliğini web ve masaüstü tüketicilerinde davranış testiyle doğrula.
- [ ] [Süre çubuğu](../src/components/primitives.tsx) ve [haftalık cetvelin](../src/components/dashboard/weekly-ruler.ts) ortak ölçek/oran hesabını [ilerleme sahibinde](../src/domain/rules/progress.js) yönet; sıfır hedef, hedef altı/üstü ve kayıtlı/tahmini parçaları iki görünümde birlikte doğrula.

Kurum sunucusunda dağıtım gündeme geldiğinde Docker, HTTPS/ingress, kalıcı oturum, disk izinleri ve kapasite kontrollerini [dağıtım rehberinden](../docs/deployment.md#dağıtım-kabulü) aç. [Tek süreç sınırları](../docs/architecture/multi-user-sessions.md) bu dağıtımın sözleşmesidir.
