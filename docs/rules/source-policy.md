# PDKS erişimi ve HTTP sınırları

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/source-policy.ts](../../src/domain/rules/source-policy.ts)

Arayüz: `SOURCE_POLICY`, `HTTP_POLICY`.

## Sözleşme

`SOURCE_POLICY` kaynak erişimini, `HTTP_POLICY` API gövde sınırını tanımlar:

| Ayar | Değer |
| --- | --- |
| Kaynak origin | `https://pdks.trt.net.tr` |
| HTTP isteği zaman aşımı | 30 saniye |
| Rapor önbelleği | 20 saniye |
| Kurtarma bekleme süresi | 60 saniye |
| En fazla sayfa / yönlendirme | 20 / 6 |
| En fazla JSON gövdesi | 32.768 bayt |

UI kaynak bağlantısı aynı origin üzerinden üretilir. WebForms alan/sütun adları ve callback kodlaması kaynak adaptöründe yönetilir.

Mesai raporunun tek veri kaynağı kişisel turnike geçişleridir. `PdksClient` tarih aralığını, tam gün saat filtresini ve tüm işlem noktalarını seçer; ardından bütün sayfaları toplar. Sayfa kimliği/sayısı, sıra ve toplam kayıt sayısı tutarlı olmalı; bütün hareketler istenen aralıkta kalmalıdır. Eksik veya değişen sayfalama `SOURCE_CHANGED` üretir ve başarı önbelleğine girmez. API raporu zorunlu `passages` listesini taşır; günlük ilk giriş–son çıkış hesabı [kayıtlı süre sahibindedir](recorded-time.md).

Arayüz haftalık sorgular. Sayfa boyutu kurumun DevExpress ayarıdır; uygulama kaynağın Türkçe `Sayfa 1 / 2 (4 öğe)` veya İngilizce `Page 1 of 2 (4 items)` sayfalama bilgisini izler. Sayfalayıcı görünmüyorsa grid metaverisi okunur.

Giriş doğrulaması `PizzyMain.aspx` profilinde tek ve boş olmayan kişi adını doğrular. Yönetici hesapları dahil kişisel turnike raporu doğrudan açılır. Rapor yalnız `self` kişisine açılır; kaynak kişi kapsamını kendi oturumundan belirler. Pofi hesap anahtarı başarılı girişten sonra kaynak adaptöründe üretilir; ayrıntılar [not sözleşmesindedir](../pofi-notes.md#hesap-anahtarı).

Farklı oturumların kaynak istekleri bağımsız başlar. Aynı oturumdaki WebForms işlemleri kendi istemcisinin `run` kuyruğunda yürür; böylece çerez ve form durumu tutarlı kalır. Her HTTP isteği politika zaman aşımını ve oturum iptal sinyalini kullanır.

Kaynak HTTP hatası, bağlantı hatası, oturum bitişi, iptal ve bozuk kaynak yapısının sınıflandırması [ortak hata sözleşmesindedir](../pdks-errors.md).

Oturuma ait PDKS istemcisi son başarılı raporu `reportCacheMs` boyunca süreç belleğinde tutar. Anahtar kişi kapsamı, tarih aralığı ve İstanbul gününü içerir. Aynı anahtarın eşzamanlı çağrıları tek işe birleşir. Özgün alınma zamanı korunur; dönen nesneler bağımsız kopyadır. Aralık/gün değişimi ve süre dolumu yeni kaynak işi başlatır. HTTP yanıtı `Cache-Control: no-store` taşır.

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
