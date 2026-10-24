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

Gün/hafta/saat hesapları [takvim sahibinin](rules/calendar.md) İstanbul saat dilimini kullanır; aktarım ve gösterim biçimleri aynı sözleşmede tanımlıdır.

Kalıcı dizinin yazı hataları için [oturum politikasındaki](rules/session-policy.md) API ve yeniden deneme sözleşmesini doğrulayın; kaynak hatasıyla birlikte oluşan disk hatasının tanısı sunucu loglarında izlenir.

## Proxy / ingress

TLS ingress üzerinde sonlanabilir; pod HTTP dinler. Ingress, `X-Forwarded-Proto` başlığını tarayıcının bağlantı protokolüne göre yeniden yazmalı ve Host bilgisini doğru iletmelidir. Pod erişimini kurumun ingress ağıyla sınırlandırın. Secure çerezinin koşulları [oturum politikasındadır](rules/session-policy.md). Erişim loglarında yöntem, yol, durum ve süre gibi operasyon alanlarını tutun; hassas gövde ve çerez alanlarını maskeleyin.

Ingress/CDN, kişisel API yanıtlarındaki `Cache-Control: no-store` başlığını uygulamalıdır. Uygulama içi önbellekler [kaynak](rules/source-policy.md) ve [yemek](rules/meal-menu.md) sözleşmelerine aittir.

PDKS giriş/profil, turnike sorgusu ve sayfalama callback'leri kurum ağından erişilebilir olmalıdır.

Kaynak kabulünde DNS/bağlantı hatası, PDKS HTTP hatası ve oturum bitişini [hata sözleşmesindeki](pdks-errors.md) ayrı sonuçlarla doğrulayın.

## Docker

Yerel üretim önizlemesi [README'deki](../README.md#doğrulama-ve-üretim-çalıştırması) standart Next komutlarını kullanır.

Dockerfile derleme sırasında `POFIS_STANDALONE=1` ayarlar. Çalışma imajına standalone sunucuyu, `public` ve `.next/static` dizinlerini ayrı ayrı kopyalar; sunucu `bun server.js` ile başlar.

Çalışma imajı, `/app` altında [LICENSE](../LICENSE) ve [görsel lisans bildirimi](../ASSET-LICENSE.md) dosyalarını da içerir.

Oturumsuz erişilen statik `/demo` aynı derlemeye dahildir. Veri kapsamı ve erişim sınırı [demo rehberindedir](demo.md#veri-ve-zaman).

```sh
docker build -t pofis:local .
docker run --rm -p 127.0.0.1:3000:3000 \
  -v pofis-sessions:/var/lib/pofis/sessions \
  pofis:local
```

Yerel Docker denemesi HTTP kullanır. Kurum dağıtımında pod 3000 portuyla Service/Ingress'e bağlanır; TLS ingress özgün bağlantı protokolünü yukarıdaki başlıkla iletir. Dockerfile uygulamayı `bun` kullanıcısıyla çalıştırır. Kubernetes volume izinlerini bu kullanıcıya göre ayarlayın; oturum dosyaları hassas kaynak çerezleri içerir.

## Dağıtım kabulü

Giriş kabulünde kısa kullanıcı adı ve e-posta biçiminin [ortak normalizasyon kuralını](rules/session-policy.md#güvenceler) izlediğini doğrulayın.

- İmajı kurum ortamında derleyip `TZ`, dinleme adresi ve kalıcı dizinin yazılabildiğini kontrol edin.
- Dış HTTPS adresinden giriş, rapor, yenileme ve çıkışı; Secure/HttpOnly/SameSite çerezini doğrulayın.
- İki ayrı tarayıcı/hesapla kimlik ve rapor ayrımını, pod yeniden başlatmasında oturum devamlılığını kontrol edin.
- Kurum ağı/DNS/CA ile gerçek PDKS erişimini ve kurumun kabul ettiği iş yükünü ölçün. `/api/health` yalnız uygulamanın çalıştığını gösterir.

Dağıtım ortamı değiştiğinde bu kabulü tekrarlayın. Yerel kontrol yöntemi [doğrulama rehberindedir](verification.md).

Next.js çalışma zamanı kaynakları: kurulu sürümün `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` ve `03-api-reference/05-config/01-next-config-js/output.md` belgeleri. [Resmî self-hosting rehberi](https://nextjs.org/docs/app/guides/self-hosting).

## Masaüstü bildirimleri

[Mesai bildirimlerinin](rules/notifications.md) zamanlayıcısı ve Telegram bağlantısı kullanıcının çalışan Electron uygulamasında yönetilir.
