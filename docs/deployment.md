# Tek pod / tek süreç dağıtımı

Bu rehber kurum sunucusundaki Docker/ingress dağıtımını yönetir. Electron paketleri ve Windows kurulumu [masaüstü rehberinde](desktop.md), GitHub Actions/Workers otomasyonu [sürüm yayınında](release.md) açıklanır.

Uygulama tek Bun süreci ve kalıcı oturum diziniyle çalışır. Kubernetes'te bir replica ve `Recreate` stratejisi kullanılır. Oturum izolasyonu, kalıcılık ve hesap anahtarı geçişi [oturum mimarisinde](architecture/multi-user-sessions.md) yönetilir.

## Çalışma zamanı ayarları

Üretim arayüzünde [GA4 kullanım ölçümü](analytics.md) çalışır; ek ortam sırrı gerekmez. İstemcinin Google etiketine ve ölçüm uçlarına HTTPS erişimi ölçüm için gereklidir. Kurum ağı bu erişimi kapattığında uygulama çalışmayı sürdürür.

| Ayar                  | Değer / görev                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TZ`                  | `Europe/Istanbul`; Dockerfile içinde TZ ve tzdata kurulumu tanımlı                                                                                                           |
| `HOSTNAME`            | Docker standalone sunucusunda `0.0.0.0`                                                                                                                                      |
| `POFIS_STANDALONE`    | Dockerfile derleme adımında `1`; Next standalone çıktısını açar. Yerel derlemede ayarlanmaz.                                                                                   |
| `PORT`                | Varsayılan `3000`                                                                                                                                                            |
| `POFIS_SESSION_DIR`   | Docker'da `/var/lib/pofis/sessions`; uygulama kullanıcısının yazabildiği kalıcı volume                                                                                       |

Ürün gün/hafta/saat hesapları [takvim sahibinde](../src/domain/rules/calendar.ts) açıkça İstanbul saat dilimini kullanır. Ürün hesaplarında bu açık saat dilimi tanımı esas alınır. `fetchedAt` ve tanı zamanları UTC ISO olarak taşınır; arayüz İstanbul saatine çevirir.

Kalıcı dizinin yazı hataları için [oturum politikasındaki](rules/session-policy.md) API ve yeniden deneme sözleşmesini doğrulayın; kaynak hatasıyla birlikte oluşan disk hatasının tanısı sunucu loglarında izlenir.

## Proxy / ingress

TLS ingress üzerinde sonlanabilir; pod HTTP dinler. Secure çerezi doğrudan HTTPS bağlantısında veya `X-Forwarded-Proto` başlığının ilk değeri `https` olduğunda kullanılır. Ingress bu başlığı tarayıcının bağlantı protokolüne göre yeniden yazmalı, Host bilgisini doğru iletmeli ve pod'a erişim kurumun ingress ağıyla sınırlandırılmalıdır. Giriş, heartbeat ve çıkış uçları Origin/Sec-Fetch-Site değerlerinden bağımsız çalışır; bağlantı protokolü istekten belirlenir. Ingress erişim loglarını yöntem, yol, durum ve süre gibi operasyon alanlarıyla sınırlandırın; hassas gövde ve çerez alanlarını maskeleyin.

Kişisel API yanıtlarındaki `Cache-Control: no-store` başlığı korunmalı; ingress/CDN bu yanıtları ortak önbelleğe almamalıdır. Uygulama içi önbellekler [kaynak](rules/source-policy.md) ve [yemek](rules/meal-menu.md) sözleşmelerine aittir.

PDKS giriş/profil, turnike sorgusu ve sayfalama callback'leri kurum ağından erişilebilir olmalıdır.

Kaynak erişim kabulünde bağlantı/DNS hatası (`CONNECTION_FAILED`) ile PDKS HTTP hata yanıtını (`SOURCE_ERROR`) ayrı doğrulayın. `ENOTFOUND` DNS çözümlemesinin başarısız olduğunu belirtir; tek başına VPN durumunu belirlemez. Kaynağın `403/429/5xx` hata sayfası oturumu düşürmemelidir. [Hata sözleşmesi](pdks-errors.md).

## Docker

Yerel üretim önizlemesi [README'deki](../README.md#doğrulama-ve-üretim-çalıştırması) standart Next komutlarını kullanır.

Dockerfile derleme sırasında `POFIS_STANDALONE=1` ayarlar. Çalışma imajına standalone sunucuyu, `public` ve `.next/static` dizinlerini ayrı ayrı kopyalar; sunucu `bun server.js` ile başlar.

Oturumsuz erişilen statik `/demo` aynı derlemeye dahildir. Veri kapsamı ve erişim sınırı [demo rehberindedir](demo.md#veri-ve-zaman).

```sh
docker build -t pofis:local .
docker run --rm -p 127.0.0.1:3000:3000 \
  -v pofis-sessions:/var/lib/pofis/sessions \
  pofis:local
```

Yerel Docker denemesi HTTP kullanır. Kurum dağıtımında pod 3000 portuyla Service/Ingress'e bağlanır; TLS ingress özgün bağlantı protokolünü yukarıdaki başlıkla iletir. Dockerfile uygulamayı `bun` kullanıcısıyla çalıştırır. Kubernetes volume izinlerini bu kullanıcıya göre ayarlayın; oturum dosyaları hassas kaynak çerezleri içerir.

## Dağıtım kabulü

Giriş kabulünde `mert.ercan` ve `mert.ercan@trt.net.tr` biçimlerinin aynı kullanıcı adıyla kaynak girişine ulaştığını doğrulayın; dönüşüm web ve masaüstünün ortak [oturum yöneticisinde](../src/server/session-manager.js) yapılır.

- İmajı kurum ortamında derleyip `TZ`, dinleme adresi ve kalıcı dizinin yazılabildiğini kontrol edin.
- Dış HTTPS adresinden giriş, rapor, yenileme ve çıkışı; Secure/HttpOnly/SameSite çerezini doğrulayın.
- İki ayrı tarayıcı/hesapla kimlik ve rapor ayrımını, pod yeniden başlatmasında oturum devamlılığını kontrol edin.
- Kurum ağı/DNS/CA ile gerçek PDKS erişimini ve kurumun kabul ettiği iş yükünü ölçün. `/api/health` yalnız uygulamanın çalıştığını gösterir.

Dağıtım ortamı değiştiğinde bu kabulü tekrarlayın. Yerel kontrol yöntemi [doğrulama rehberindedir](verification.md).

Next.js çalışma zamanı kaynakları: kurulu sürümün `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` ve `03-api-reference/05-config/01-next-config-js/output.md` belgeleri. [Resmî self-hosting rehberi](https://nextjs.org/docs/app/guides/self-hosting).

## Masaüstü bildirimleri

[Mesai bildirimleri](rules/notifications.md) çalışan Electron uygulamasında üretilir. Telegram bağlantısını her kullanıcı kendi botuyla cihazında kurar; kanal tercihleri ve şifreli bağlantı profilinde saklanır. Kurum sunucusunda bildirim işçisi kurulmaz.
