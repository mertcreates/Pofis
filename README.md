# Pofis

Mesaiye biraz Pofi.

Next.js + React + Bun ile kişisel PDKS mesai takibi. Her kullanıcı kendi hesabıyla çalışır; tek uygulama ve tek özellik kapsamı vardır.

## Çalıştırma

Bun 1.4.3 ile:

```powershell
bun install --frozen-lockfile
bun run dev
```

Adres: http://127.0.0.1:3000. Görsel geliştirme dev/hot reload üzerinden yapılır.

[Mesaim demosu](http://127.0.0.1:3000/demo), giriş gerektirmeden aynı ekranı yakalanmış turnike verisiyle açar. Gün ve hafta seçimi, sanal ek süre ve ayrı demo planları [demo rehberinde](docs/demo.md) açıklanır.

## Doğrulama ve üretim çalıştırması

```powershell
bun test
bun run typecheck
bun run build
bun run start
```

Build, statik varlıkları standalone çıktısına taşır. Start varsayılan olarak `127.0.0.1` dinler; `POFIS_HOSTNAME` ile değiştirilebilir. Docker dağıtımı tek Bun süreci ve kalıcı oturum dizini kullanır. [Ortam ayarları ve dağıtım kabulü](docs/deployment.md).

## Belgeler

- [Belge haritası](docs/README.md): konu sahipleri ve okuma yolları.
- [Ürün kapsamı](PRODUCT.md), [tasarım](DESIGN.md) ve [ortak terimler](GLOSSARY.md).
- [Ürün kuralları ve kod sahipleri](docs/rules/README.md).
- [Çok kullanıcılı oturum yapısı](docs/architecture/multi-user-sessions.md).
- [Doğrulama rehberi](docs/verification.md) ve [açık işler](tasks/todo.md).
