# Hesap kimliği

[Kural haritası](README.md) · [Oturum politikası](session-policy.md)

## Sahip ve sözleşme

[account-identity.ts](../../src/domain/rules/account-identity.ts) giriş ve hesap adı dönüşümlerini ve hesap anahtarı biçimini tanımlar. Giriş adı ilk `@` öncesindeki bölümün çevresindeki boşluklar temizlenerek elde edilir ve harf biçimi korunarak PDKS'ye gönderilir. Boş giriş adı reddedilir.

Hesap adı aynı giriş adındaki yalnız ASCII `A–Z` harfleri küçültülerek oluşturulur. Örneğin `KULLANICI@trt.net.tr` ve `kullanici` aynı hesap adını verir. ASCII dışındaki karakterler korunur.

[PDKS adaptörü](../../src/server/pdks.js) başarılı doğrulamada `SHA-256(JSON.stringify(["pofis:pofi-account:v1", kaynakOrigin, hesapAdı]))` hesaplar ve sonucu sunucu oturumunda `self.accountKey` olarak saklar. Anahtar 64 küçük onaltılık karakterden oluşur. Aynı kaynak ve hesap adı, farklı oturum ve cihazlarda aynı anahtarı üretir. Rapor erişimini PDKS oturumu belirler.

## Kullanım

- [Electron planı](work-plan.md#kalıcılık-ve-navigasyon), [Pofi notları](../pofi-notes.md#hesap-anahtarı) ve [yemek yorumları](meal-menu.md#pofi-yemek-yorumları) hesap anahtarını kullanır.
- [Bildirim](notifications.md#gönderim-ve-hesap-ayrımı) ve [analitik](../analytics.md#hesap-kimliği) kendi kimliklerini bu anahtardan türetir.
- [Oturum token'ı](session-policy.md) her oturum için ayrı üretilen rastgele değerdir.

Hesap anahtarı bulunmayan veya bozuk olan oturum yeniden giriş gerektirir.

## Doğrulama

[Hesap adı testi](../../src/domain/rules/account-identity.test.ts), [PDKS testi](../../src/server/pdks.test.js) ve [plan route testi](../../src/server/work-plan-route.test.js) dönüşüm ve tüketiciler arasındaki eşleşmeyi sınar. Gerçek hesap ve paketli uygulama kabulü [doğrulama rehberindedir](../verification.md#plan-doğrulaması).
