# Plan süresi girişi

[Kural haritası](README.md) · [Mesai planı](work-plan.md)

## Sahiplik

[plan-duration.ts](../../src/domain/rules/plan-duration.ts), `parsePlanDuration` ile serbest metni dakikaya çevirir; `stepPlanDuration` ile +/- adımını, `planDisplayMinutes` ile güvenli dakika gösterimini hesaplar. [PlanEditor](../../src/components/plan-editor.tsx) bu sonuçları plan düzenlemesine bağlar. Günlük sınır ve adım büyüklüğü [plan sahibindeki](../../src/domain/rules/work-plan.ts) `PLAN_LIMITS` değerlerinden alınır.

Plan doğrulamasındaki ve süre alanındaki hata metinleri, üst sınırı aynı `maxDailyMinutes` değerinden saat olarak alır. Metin kataloğu sayısal sınırı parametre olarak biçimlendirir.

## Giriş sözleşmesi

- Sonuç 0–960 arasında tam dakikadır. Boş, tanınmayan, negatif veya sınır dışı giriş `null` döndürür; mevcut süre korunur.
- Birimsiz sayı saat olarak okunur. `8,2` 492, `8.5` 510 dakikadır.
- `8:13`, 493 dakikadır; iki nokta sonrasındaki dakika 0–59 olmalıdır.
- Saat birimleri: `saat`, `sa`, `h`, `hr`, `hrs`, `hour`, `hours`.
- Dakika birimleri: `dakika`, `dak`, `dk`, `m`, `min`, `mins`, `minute`, `minutes`.
- Saat ve dakika parçaları her iki sırada yazılabilir; aralarındaki boşluk isteğe bağlıdır. Her birim türü bir kez kullanılabilir. `8 saat 13 dakika`, `8sa13dk` ve `13m 8h`, 493 dakikadır.

## +/- adımı

Artı sonraki, eksi önceki 30 dakikalık çizgiye gider. `8 sa 13 dk` için artı `8 sa 30 dk`, eksi `8 sa` üretir. Tam çizgideki `8 sa` için artı `8 sa 30 dk`, eksi `7 sa 30 dk` üretir. Sonuç günlük sınırlar içinde kalır.

## Güvenli dakika gösterimi

Gereken süre ve hedefe kalan fark, dakika gösteriminde `ceil(saniye / 60)` ile yukarı yuvarlanır. Gerçekleşen süre ve hedef üzerindeki fark dakika gösteriminde `floor(saniye / 60)` ile aşağı yuvarlanır. Dakikadan küçük pozitif fazla süre saniyesiyle gösterilir. Tam dakika ve tam sıfır değişmez; gereken 1 saniye `1 dk`, gerçekleşen 8 sa 3 dk 59 sn `8 sa 3 dk` görünür.

Tamamla hesabı ve kaydedilen hafta planı saniye hassasiyetini korur. Örneğin Tamamla sonucu 6 sa 50 dk 43 sn ise günlük kart ve süre alanı `6 sa 51 dk` gösterir; bu gösterimi izleyen kullanıcı 17 saniye tampon bırakır. Bu, gereken günlük süre başına en fazla 59 saniyedir. Gerçekleşen kayıt korunur ve beklenen toplam kaynak hassasiyetiyle hesaplanır.

Süre alanına yalnız odaklanıp çıkmak, yuvarlanmış gösterimi plana kaydetmez. Artı/eksi görünür dakikayı baz alır; gereken 7 sa 59 dk 59 sn ekranda 8 sa görünür ve artı 8 sa 30 dk'ya gider. Kilitleme ve açık günlere uygulama görünür gereken dakikayı kullanır. Elle yeni süre seçilmesi normal düzenleme akışıyla haftalık hedefi seçilen değişim kadar günceller. Alan, işlemden sonra hesaplanan gereken süreyi gösterir; kayıt başarısızsa son başarılı değere döner.

[Davranış testleri](../../src/domain/rules/plan-duration.test.ts) giriş biçimlerini, geçersiz değerleri ve adım sınırlarını doğrular.

## Planlanan saat hesabı

Saat/dakika bölümlerinin yazma, silme, odak, ok tuşları ve yapıştırma davranışı [PlanTimeInput](../../src/components/plan-time-input.tsx) bileşenindedir. Etkileşim sözleşmesi [haftalık saat seçimi](work-plan.md#haftalık-girişçıkış-saati) bölümünde tanımlıdır; bu kural sahibi yalnız tamamlanmış saati ayrıştırır ve karşı saati hesaplar.

`parsePlanClock`, `H:mm`, `HH:mm` ve dört rakamlı `HHmm` girişini 0–1439 arasında tam dakikaya çevirir. Başta ve sonda boşluklar temizlenir. `9:00`, `09:00` ve `0900`, 540 dakikadır; geçerli aralık `00:00`–`23:59` olur. Boş, eksik, tanınmayan veya sınır dışı giriş `null` döndürür. `9:0`, `900`, `24:00` ve `2360` geçersizdir. Boş taslağın seçimi temizlemesi, geçersiz taslağın korunması ve kaydetme anı [haftalık saat seçimi sözleşmesinde](work-plan.md#haftalık-girişçıkış-saati) yönetilir.

`planClockTimes`, haftanın seçili giriş veya çıkış saatini görünür gereken dakikayla birleştirir; karşı saati `HH:mm` ve gün farkıyla döndürür. Seçim yoksa sonuç `null` olur. Gece yarısı sonrası çıkış ertesi güne, gece yarısından geriye düşen giriş önceki güne aittir. Etkileşim ve kalıcılık [haftalık saat seçimi sözleşmesindedir](work-plan.md#haftalık-girişçıkış-saati).

## Saat taslağının tamamlanması

`planClockInputState`, bölümlü saat alanındaki boş, tamamlanmamış, tamamlanmış ve geçersiz taslakları ayırır. `14:0` ve `1:00` yazım sırasında tamamlanmamıştır; `14:00` tamamlanmıştır. Planlama’da eksik alan yazılırken hata gösterilmez; saat grubundan çıkışta veya Enter ile eksiklik bildirilir. Günlük kapasite yalnız tamamlanmış, geçerli saatlerden hesaplanır. Eksik taslak kesin haftalık toplam üretmez.
