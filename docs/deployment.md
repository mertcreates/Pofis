# Tek pod / tek süreç dağıtımı

pofis.app landing ve public dağıtım dosyaları bağımsız `pofis-landing` projesinde Cloudflare Pages, ZIP'ler GitHub Releases için hazırlanır. Ana kaynak deposu private kalır. [Yerel yayın hazırlığı ve canlı kabul](desktop.md#pofisapp-yayın-hazırlığı).

Masaüstünde Windows/macOS ortak Electron kabuğu aynı Next standalone uygulamasını dahili Node.js UtilityProcess ile çalıştırır; paket ve SHA-256 manifesti aynı araçlarla üretilir. Son kullanıcıda Node/Bun kurulumu gerekmez. Windows tek komut kurulum/güncellemesi yerelde doğrulanmıştır; macOS native paket/cihaz kabulü ve macOS kurulum betiği bekler. Hosting henüz yayımlanmamıştır. [Platform komutları, veri dizini ve geri dönüş sözleşmesi](desktop.md).

Uygulama tek Bun süreci ve kalıcı oturum diziniyle çalışır. Her kullanıcı kendi PDKS istemcisi, CookieJar ve kısa rapor önbelleğine sahiptir. Kubernetes'te bir replica kullanılır; güncellemede eski pod durduktan sonra yenisi başlatılır (`Recreate`). Aynı dizini iki süreçten kullanmak için ortak kilit/iptal koordinasyonu henüz yoktur.

## Çalışma zamanı ayarları

Electron'da 3210 doluysa sunucu boş bir loopback portu seçer. Kabuk sabit tarayıcı origin'ini koruyarak istekleri bu porta iletir; port seçimi ve süreç sahipliği [masaüstü yaşam döngüsünde](desktop.md#yaşam-döngüsü-ve-sorumluluklar) yönetilir.

| Ayar                  | Değer / görev                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TZ`                  | `Europe/Istanbul`; Dockerfile içinde TZ ve tzdata kurulumu tanımlı                                                                                                           |
| `HOSTNAME`            | Docker standalone sunucusunda `0.0.0.0`                                                                                                                                      |
| `POFIS_STANDALONE`    | Dockerfile derleme adımında `1`; Next standalone çıktısını açar. Yerel derlemede ayarlanmaz.                                                                                   |
| `PORT`                | Varsayılan `3000`                                                                                                                                                            |
| `POFIS_SESSION_DIR`   | Docker'da `/var/lib/pofis/sessions`; uygulama kullanıcısının yazabildiği kalıcı volume                                                                                       |

Ürün gün/hafta/saat hesapları [takvim sahibinde](../src/domain/rules/calendar.ts) açıkça İstanbul saat dilimini kullanır. İşletim sisteminin TZ ayarı ürün hesabının yerine geçmez. `fetchedAt` ve tanı zamanları UTC ISO olarak taşınır; arayüz İstanbul saatine çevirir.

Kalıcı dizinin yazı hataları için [oturum politikasındaki](rules/session-policy.md) API ve yeniden deneme sözleşmesini doğrulayın; kaynak hatasıyla birlikte oluşan disk hatasının tanısı sunucu loglarında izlenir.

## Proxy / ingress

TLS ingress üzerinde sonlanabilir; pod HTTP dinler. Secure çerezi doğrudan HTTPS bağlantısında veya `X-Forwarded-Proto` başlığının ilk değeri `https` olduğunda kullanılır. Ingress bu başlığı tarayıcının bağlantı protokolüne göre yeniden yazmalı, Host bilgisini doğru iletmeli ve pod'a erişim kurumun ingress ağıyla sınırlandırılmalıdır. Giriş, heartbeat ve çıkış uçları Origin/Sec-Fetch-Site değerlerinden bağımsız çalışır; dış adres ayarı gerekmez. Ingress erişim logları parola/gövde, Cookie ve Set-Cookie alanlarını kaydetmemelidir.

Kişisel API yanıtlarında `Cache-Control: no-store` vardır; ingress/CDN bu yanıtları ortak önbelleğe almamalıdır. 20 saniyelik rapor önbelleği sunucudaki ilgili oturuma aittir. Aynı tarih aralığındaki eşzamanlı raporlar birleşir; farklı kullanıcılar bağımsız çalışır. Kaynak [sözleşmesi](rules/source-policy.md).

Haftalık mesai raporu kişisel turnike listesinin bütün sayfalarını toplar. Kaynaktaki sayfa boyutu uygulamanın ortam ayarı değildir; adaptör kaynağın sayfalama bilgisini izler. Giriş/profil, turnike sorgusu ve sayfa callback'leri kurum ağı üzerinden erişilebilir olmalıdır.

Kaynak erişim kabulünde bağlantı/DNS hatası (`CONNECTION_FAILED`) ile PDKS HTTP hata yanıtını (`SOURCE_ERROR`) ayrı doğrulayın. `ENOTFOUND` DNS çözümlemesinin başarısız olduğunu belirtir; tek başına VPN durumunu belirlemez. Kaynağın `403/429/5xx` hata sayfası oturumu düşürmemelidir. [Hata sözleşmesi](pdks-errors.md).

## Docker

Yerelde `bun run build` standart Next çıktısı üretir; `bun run start` bunu `next start --hostname 127.0.0.1` ile çalıştırır. Başka bir dinleme adresi için `bun run start --hostname 0.0.0.0` kullanılır. İki komutun `bun --bun` öneki Next'i Bun çalışma zamanıyla çalıştırır.

Dockerfile derleme sırasında `POFIS_STANDALONE=1` ayarlar. Çalışma imajına standalone sunucuyu, `public` ve `.next/static` dizinlerini ayrı ayrı kopyalar; sunucu `bun server.js` ile başlar.

`/demo` statik sayfası aynı derlemeye dahildir ve oturum gerektirmez. Yakalanan veride kişi adı/kimliği çıkarılmış, gerçek geçiş tarihleri/saatleri korunmuştur. `noindex, nofollow` erişim kontrolü değildir. [Veri kapsamı ve sahipliği](demo.md).

```sh
docker build -t pofis:local .
docker run --rm -p 127.0.0.1:3000:3000 \
  -v pofis-sessions:/var/lib/pofis/sessions \
  pofis:local
```

Yerel Docker denemesi HTTP kullanır. Kurum dağıtımında pod 3000 portuyla Service/Ingress'e bağlanır; TLS ingress özgün bağlantı protokolünü yukarıdaki başlıkla iletir. Dockerfile uygulamayı `bun` kullanıcısıyla çalıştırır. Kubernetes volume izinlerini bu kullanıcıya göre ayarlayın; oturum dosyaları hassas kaynak çerezleri içerir.

## Dağıtım kabulü

- İmajı kurum ortamında derleyip `TZ`, dinleme adresi ve kalıcı dizinin yazılabildiğini kontrol edin.
- Dış HTTPS adresinden giriş, rapor, yenileme ve çıkışı; Secure/HttpOnly/SameSite çerezini doğrulayın.
- İki ayrı tarayıcı/hesapla kimlik ve rapor ayrımını, pod yeniden başlatmasında oturum devamlılığını kontrol edin.
- Kurum ağı/DNS/CA ile gerçek PDKS erişimini ve kurumun kabul ettiği iş yükünü ölçün. `/api/health` yalnız uygulamanın çalıştığını gösterir.

Bekleyen dağıtım kabulünü [görev listesinde](../tasks/todo.md) yönetin. Yerel kontrol yöntemi [doğrulama rehberindedir](verification.md).

Next.js çalışma zamanı kaynakları: kurulu sürümün `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` ve `03-api-reference/05-config/01-next-config-js/output.md` belgeleri. [Resmî self-hosting rehberi](https://nextjs.org/docs/app/guides/self-hosting).
