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

Yerelde `build` doğrudan `next build`, `start` ise `next start --hostname 127.0.0.1` çalıştırır. Komutlardaki `bun --bun` öneki Next'i Bun çalışma zamanıyla çalıştırır. Dinleme adresi `bun run start --hostname 0.0.0.0` ile değiştirilebilir. Dockerfile standalone çıktıyı üretir, statik dosyaları imaja kopyalar ve `bun server.js` ile başlatır. Docker dağıtımı tek Bun süreci ve kalıcı oturum dizini kullanır. [Ortam ayarları ve dağıtım kabulü](docs/deployment.md).

## Masaüstü altyapısı

Pofis mevcut Next standalone uygulamasını Electron’un dahili Node.js runtime’ıyla kendi Electron penceresinde açar. Windows x64 ve macOS Apple Silicon/Intel ortak kabuk, sunucu, paketleyici ve manifest üreticisini kullanır; son kullanıcıda Node/Bun kurulumu gerekmez. `desktop:prepare`, `desktop`, `desktop:package`, `desktop:release` komutları hedef işletim sisteminde aynı şekilde çalışır. Windows için tek komut kurulum/güncelleme ve geri dönüş uygulanır. macOS kod altyapısı hazırdır; gerçek macOS paket/cihaz kabulü ve macOS kurulum betiği bekler. Hosting henüz yayımlanmış değildir. [Platformlar, yerel kurulum komutu ve kabul listesi](docs/desktop.md).

Landing bağımsız `../pofis-landing` projesindedir. Cloudflare Pages + GitHub Releases girdilerini, yerel release sonrasında `bun run desktop:site` hazırlar. [Yayın sırası ve kabul](docs/desktop.md#pofisapp-yayın-hazırlığı).

## Belgeler

- [Belge haritası](docs/README.md): konu sahipleri ve okuma yolları.
- [Ürün kapsamı](PRODUCT.md), [tasarım](DESIGN.md) ve [ortak terimler](GLOSSARY.md).
- [Ürün kuralları ve kod sahipleri](docs/rules/README.md).
- [Çok kullanıcılı oturum yapısı](docs/architecture/multi-user-sessions.md).
- [Doğrulama rehberi](docs/verification.md) ve [açık işler](tasks/todo.md).
