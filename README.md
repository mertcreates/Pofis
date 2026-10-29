# Pofis

Mesaiye biraz Pofi

PDKS kayıtlarından günlük ve haftalık mesaiyi takip eden web ve masaüstü uygulaması. Mesai planı, çıkış hedefi ve isteğe bağlı hatırlatıcılar içerir; Pofi de mesaiye eşlik eder.

[Site ve masaüstü kurulumu](https://pofis.app) · [Belge haritası](docs/README.md)

## Nasıl başladı?

> Sadece kaçta çıkabileceğimi görmek istiyordum.

Pofis bu cümleyle başladı. Birkaç gün sonra [mesai planı kuralları](docs/rules/work-plan.md) 28 KB'lık bir belge olmuştu.

Çıkış saatini artık görebiliyorum.

## Çalıştırma

Gereksinim: [Bun](https://bun.sh), `package.json` içindeki `packageManager` sürümü. Uygulama Next.js ve React kullanır.

```powershell
bun install --frozen-lockfile
bun run dev
```

Adres: [127.0.0.1:3000](http://127.0.0.1:3000).

[Mesaim demosu](http://127.0.0.1:3000/demo), giriş gerektirmeden aynı ekranı örnek kayıtlarla açar. [Demo rehberi](docs/demo.md).

Canlı giriş, TRT PDKS hesabı ve kurum kaynağına ağ erişimi gerektirir. Kaynak adresi ve protokolü [PDKS adaptörüne](docs/rules/source-policy.md) bağlıdır. Her kullanıcı kendi hesabıyla çalışır. Ortam ayarları [.env.example](.env.example) dosyasında, kalıcı oturum ve Docker kurulumu [dağıtım rehberindedir](docs/deployment.md).

## Doğrulama ve üretim çalıştırması

```powershell
bun test ./src ./electron ./scripts/electron
bun run typecheck
bun run build
bun run start
```

`build` ve `start`, Next'i Bun çalışma zamanıyla çalıştırır. Üretim adresi varsayılan olarak `127.0.0.1:3000` olur; `bun run start --hostname 0.0.0.0` ile değiştirilebilir. Kontrol seçimi [doğrulama rehberinde](docs/verification.md), Docker ve ortam ayarları [dağıtım rehberindedir](docs/deployment.md).

## Masaüstü altyapısı

Electron kabuğu aynı uygulamayı paketle gelen Node.js ile açar. Desteklenen platformlar, paketleme, kurulum ve güncelleme [masaüstü rehberinde](docs/desktop.md); GitHub Actions/Workers akışı [sürüm yayınındadır](docs/release.md).

## Belgeler

[Belge haritası](docs/README.md) konu sahiplerini, [ürün kapsamı](PRODUCT.md) özellikleri, [görev listesi](tasks/todo.md) açık işleri gösterir.

Bir değişiklik yaparken ilgili [kural sahibini](docs/rules/README.md) izleyin; davranışı, sözleşmeyi ve testlerini birlikte güncelleyin. Çalışma talimatları [AGENTS.md](AGENTS.md) dosyasındadır.

## Veri ve lisans

Üretim derlemeleri, depodan alınan bağımsız derlemeler dahil, Pofis'in GA4 akışını kullanır. Toplanan alanlar ve hesap eşleştirmesi [kullanım ölçümü rehberinde](docs/analytics.md) açıklanır.

Kaynak kod ve teknik belgeler [MIT lisansıyla](LICENSE) sunulur. Pofi görselleri bu lisansın kapsamı dışındadır. Lisans sınırları [görsel lisans bildiriminde](ASSET-LICENSE.md), dosya kaynakları [görsel rehberinde](docs/brand/assets.md) açıklanır.
