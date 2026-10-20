# PDKS erişimi ve HTTP sınırları

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/source-policy.ts](../../src/domain/rules/source-policy.ts)

Arayüz: `SOURCE_POLICY`, `HTTP_POLICY`.

## Sözleşme

Kurum origin, kaynak isteği timeout, kısa rapor önbelleği, kurtarma cooldown, sayfa ve yönlendirme sınırları tek politikadadır. UI kaynak bağlantısı aynı origin üzerinden üretilir. JSON gövde boyutu burada tanımlıdır. WebForms alan/sütun adları ve callback kodlaması kaynak adaptörünün protokol bilgisidir; kaynak adaptöründe yönetilir.

Mesai raporunun tek veri kaynağı kişisel turnike geçişleridir. `PdksClient` tarih aralığını, tam gün saat filtresini ve tüm işlem noktalarını seçer; ardından bütün sayfaları toplar. Sayfa kimliği/sayısı, sıra ve toplam kayıt sayısı tutarlı olmalı; bütün hareketler istenen aralıkta kalmalıdır. Eksik veya değişen sayfalama `SOURCE_CHANGED` üretir ve başarı önbelleğine girmez. API raporu zorunlu `passages` listesini taşır; günlük ilk giriş–son çıkış hesabı [kayıtlı süre sahibindedir](recorded-time.md).

Arayüz haftalık sorgular. Sayfa boyutu kurumun DevExpress ayarıdır; uygulama kaynağın sayfalama bilgisini izler.

Giriş doğrulaması `PizzyMain.aspx` profilinde tek ve boş olmayan kişi adını doğrular. Yönetici hesapları dahil kişisel turnike raporu doğrudan açılır. Rapor yalnız `self` kişisine açılır; kaynak kişi kapsamını kendi oturumundan belirler. Pofi hesap anahtarı başarılı girişten sonra kaynak adaptöründe üretilir; ayrıntılar [not sözleşmesindedir](../pofi-notes.md#hesap-anahtarı).

Farklı oturumların kaynak istekleri birbirinden bağımsız başlar. Kaynak işlemlerinin sırası her oturumun kendi istemcisinde yönetilir. Aynı oturumdaki WebForms işlemleri kendi istemcisinin `run` sırasında yürür; böylece çerez ve form durumu tutarlı kalır. Her HTTP isteği 30 saniyelik zaman aşımı ve oturum iptal sinyalini kullanır.

Kaynak HTTP hatası, bağlantı hatası ve bozuk kaynak yapısı [ortak hata sözleşmesinde](../pdks-errors.md) ayrılır. Başarılı HTTP yanıtındaki giriş sayfası ve kaynak 401 yanıtı oturum bitişi olarak sınıflandırılır. Diğer başarısız HTTP yanıtları kaynak HTTP hatası olarak işlenir. Oturum iptali özgün iptal nedenini korur; zaman aşımı bağlantı hatasıdır. Hazırlık aşamasındaki uygulama hataları kendi uygulama hatası sınıfıyla işlenir.

Başarılı raporun oturuma ait PDKS istemcisinde en son tek kopyası 20 saniye tutulur (`reportCacheMs`). Anahtar kişi kapsamı, tarih aralığı ve İstanbul gününü içerir. Aynı anahtarın eşzamanlı çağrıları tek işe birleşir. Özgün alınma zamanı korunur; dönen nesneler bağımsız kopyadır. Aralık/gün değişimi ve süre dolumu yeni kaynak işi başlatır. Önbellek yalnız başarılı raporları süreç belleğinde tutar. Ortak HTTP yanıt önbelleği `no-store` kalır.

Giriş, heartbeat ve çıkış uçları Origin/Sec-Fetch-Site değerlerinden bağımsız çalışır. Kimlik doğrulama ve kişi kapsamı [oturum politikasına](session-policy.md) aittir. HTTPS çerezinin proxy protokolüne uyarlanması [dağıtım rehberinde](../deployment.md) açıklanır.

## Bağımlılıklar

Önbellek gün anahtarı [İstanbul takvimine](calendar.md) bağlıdır.

## Kullanan yerler

- [pdks.js](../../src/server/pdks.js)
- [http.js](../../src/server/http.js)
- [ui-text.js](../../src/lib/ui-text.js)

## Testler

- [pdks-concurrency.test.js](../../src/server/pdks-concurrency.test.js)
- [pdks.test.js](../../src/server/pdks.test.js)
- [http.test.js](../../src/server/http.test.js)
