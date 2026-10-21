# Plan süresi girişi

[Kural haritası](README.md) · [Mesai planı](work-plan.md)

## Sahiplik

[plan-duration.ts](../../src/domain/rules/plan-duration.ts), `parsePlanDuration` ile serbest metni dakikaya çevirir; `stepPlanDuration` ile +/- adımını hesaplar. [PlanEditor](../../src/components/plan-editor.tsx) bu sonuçları plan düzenlemesine bağlar. Günlük sınır ve adım büyüklüğü [plan sahibindeki](../../src/domain/rules/work-plan.ts) `PLAN_LIMITS` değerlerinden alınır.

## Giriş sözleşmesi

- Sonuç 0–960 arasında tam dakikadır. Boş, tanınmayan, negatif veya sınır dışı giriş `null` döndürür; mevcut süre korunur.
- Birimsiz sayı saat olarak okunur. `8,5` ve `8.5`, 510 dakikadır.
- `8:13`, 493 dakikadır; iki nokta sonrasındaki dakika 0–59 olmalıdır.
- Saat birimleri: `saat`, `sa`, `h`, `hr`, `hrs`, `hour`, `hours`.
- Dakika birimleri: `dakika`, `dak`, `dk`, `m`, `min`, `mins`, `minute`, `minutes`.
- Saat ve dakika parçaları her iki sırada yazılabilir; aralarındaki boşluk isteğe bağlıdır. Her birim türü bir kez kullanılabilir. `8 saat 13 dakika`, `8sa13dk` ve `13m 8h`, 493 dakikadır.

## +/- adımı

Artı sonraki, eksi önceki 30 dakikalık çizgiye gider. `8 sa 13 dk` için artı `8 sa 30 dk`, eksi `8 sa` üretir. Tam çizgideki `8 sa` için artı `8 sa 30 dk`, eksi `7 sa 30 dk` üretir. Sonuç günlük sınırlar içinde kalır.

[Davranış testleri](../../src/domain/rules/plan-duration.test.ts) giriş biçimlerini, geçersiz değerleri ve adım sınırlarını doğrular.
