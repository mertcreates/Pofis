# Pofis

Mesaiye biraz Pofi

Next.js + React + Bun ile kişisel PDKS mesai takibi. Her kullanıcı kendi hesabıyla çalışır.

## Çalıştırma

Bun 1.4.3 ile:

```powershell
bun install --frozen-lockfile
bun run dev
```

Adres: http://127.0.0.1:3000. Görsel geliştirme dev/hot reload üzerinden yapılır.

[Mesaim demosu](http://127.0.0.1:3000/demo), giriş gerektirmeden aynı ekranı örnek kayıtlarla açar. [Demo rehberi](docs/demo.md).

## Doğrulama ve üretim çalıştırması

```powershell
bun test
bun run typecheck
bun run build
bun run start
```

`build` ve `start`, Next'i Bun çalışma zamanıyla çalıştırır. Üretim adresi varsayılan olarak `127.0.0.1:3000` olur; `bun run start --hostname 0.0.0.0` ile değiştirilebilir. Kontrol seçimi [doğrulama rehberinde](docs/verification.md), Docker ve ortam ayarları [dağıtım rehberindedir](docs/deployment.md).

## Masaüstü altyapısı

Electron kabuğu aynı uygulamayı paketle gelen Node.js ile açar. Desteklenen platformlar, paketleme, kurulum ve güncelleme [masaüstü rehberinde](docs/desktop.md); GitHub Actions/Workers akışı [sürüm yayınındadır](docs/release.md).

## Belgeler

[Belge haritası](docs/README.md) konu sahiplerini, [ürün kapsamı](PRODUCT.md) özellikleri, [görev listesi](tasks/todo.md) açık işleri gösterir.
