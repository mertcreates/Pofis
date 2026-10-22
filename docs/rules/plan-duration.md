# Plan süresi girişi

[Kural haritası](README.md) · [Mesai planı](work-plan.md)

## Sahiplik

[plan-duration.ts](../../src/domain/rules/plan-duration.ts), `parsePlanDuration` ile serbest metni dakikaya çevirir; `stepPlanDuration` ile +/- adımını, `planDisplayMinutes` ile güvenli dakika gösterimini hesaplar. [PlanEditor](../../src/components/plan-editor.tsx) bu sonuçları plan düzenlemesine bağlar. Günlük sınır ve adım büyüklüğü [plan sahibindeki](../../src/domain/rules/work-plan.ts) `PLAN_LIMITS` değerlerinden alınır.

## Giriş sözleşmesi

- Sonuç 0–960 arasında tam dakikadır. Boş, tanınmayan, negatif veya sınır dışı giriş `null` döndürür; mevcut süre korunur.
- Birimsiz sayı saat olarak okunur. `8,5` ve `8.5`, 510 dakikadır.
- `8:13`, 493 dakikadır; iki nokta sonrasındaki dakika 0–59 olmalıdır.
- Saat birimleri: `saat`, `sa`, `h`, `hr`, `hrs`, `hour`, `hours`.
- Dakika birimleri: `dakika`, `dak`, `dk`, `m`, `min`, `mins`, `minute`, `minutes`.
- Saat ve dakika parçaları her iki sırada yazılabilir; aralarındaki boşluk isteğe bağlıdır. Her birim türü bir kez kullanılabilir. `8 saat 13 dakika`, `8sa13dk` ve `13m 8h`, 493 dakikadır.

## +/- adımı

Artı sonraki, eksi önceki 30 dakikalık çizgiye gider. `8 sa 13 dk` için artı `8 sa 30 dk`, eksi `8 sa` üretir. Tam çizgideki `8 sa` için artı `8 sa 30 dk`, eksi `7 sa 30 dk` üretir. Sonuç günlük sınırlar içinde kalır.

## Güvenli dakika gösterimi

Gereken süre ve hedefe kalan fark, dakika gösteriminde `ceil(saniye / 60)` ile yukarı yuvarlanır. Gerçekleşen süre ve hedef üzerindeki fark dakika gösteriminde `floor(saniye / 60)` ile aşağı yuvarlanır. Dakikadan küçük pozitif fazla süre sıfır gibi gösterilmek yerine saniyesiyle gösterilir. Tam dakika ve tam sıfır değişmez; gereken 1 saniye `1 dk`, gerçekleşen 8 sa 3 dk 59 sn `8 sa 3 dk` görünür.

Tamamla hesabı ve kaydedilen hafta planı saniye hassasiyetini korur. Örneğin Tamamla sonucu 6 sa 50 dk 43 sn ise günlük kart ve süre alanı `6 sa 51 dk` gösterir; bu gösterimi izleyen kullanıcı 17 saniye tampon bırakır. Bu, gereken günlük süre başına en fazla 59 saniyedir. Gerçekleşen kayıt yuvarlanarak tekrar kaydedilmez. Beklenen toplam kaynak hassasiyetiyle hesaplanır; kartlardaki yuvarlanmış değerler toplanarak üretilmez.

Süre alanına yalnız odaklanıp çıkmak, yuvarlanmış gösterimi plana kaydetmez. Artı/eksi görünür dakikayı baz alır; gereken 7 sa 59 dk 59 sn ekranda 8 sa görünür ve artı 8 sa 30 dk'ya gider. Kilitleme ve açık günlere uygulama görünür gereken dakikayı kullanır. Elle yeni süre seçilmesi normal düzenleme akışıyla haftalık hedefi seçilen değişim kadar günceller.

[Davranış testleri](../../src/domain/rules/plan-duration.test.ts) giriş biçimlerini, geçersiz değerleri ve adım sınırlarını doğrular.
