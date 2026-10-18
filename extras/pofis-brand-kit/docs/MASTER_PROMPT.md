# Pofi — Canonical generation prompt

## Girdi sırası

1. **Image A:** `assets/pofi-full.png` (yüz, renk, materyal ve aksesuar kimliği)
2. **Image B:** `references/tabii-logo-provided.png` (kart görünüyorsa)
3. **Image C:** İsteğe bağlı kompozisyon / arayüz referansı

## Yeni görünüm veya poz için kopyalanabilir prompt

```text
Use Image A for Pofi's face and head proportions, fur colors and material, tail,
lanyard and badge design. Follow the upright bipedal pose described below for
the full-body composition.

Character identity: a chubby kitten standing naturally on two hind feet, with a
short rounded torso and two short forepaws acting as arms. Preserve Pofi's
oversized rounded ivory head, large triangular ears with lavender inner coloring,
one centered curled tuft, two dark oval eyes with tiny highlights, small dark
triangular nose, subtle cat smile, pink rounded cheeks, lavender whiskers and
large rounded lavender tail on Pofi's left. Show exactly four animal limbs: two
hind feet supporting the stance and two simple rounded front paws.

Accessories: lavender V-shaped employee lanyard and white rounded ID badge with
the mint-green tabii mark from Image B. Place the badge naturally on the chest
with a size consistent with Image A.

Style: premium soft-flat 2D mascot art, warm ivory fur, muted lavender shading,
soft matte gradient, simple forms and a calm expression. Match Image A's eye
spacing, ear angles, curl silhouette, face proportions and material.

Pose and prop placement: keep Pofi balanced on both hind feet. Describe each
scene object's position relative to Pofi. For an open umbrella, place the canopy
high above and to one side of the head, leaving a clear margin around the face,
ears and curl. Run the shaft through open space beside the head and cheek
silhouette to the paw holding it near shoulder height. Keep the full face and
badge visible.

Task-specific change: [DESCRIBE THE REQUESTED SCENE AND ITS SPATIAL LAYOUT]

Use a light neutral background or genuine transparency. Deliver one full-body
asset with Pofi's recognized identity. Keep the tabii badge mark visually faithful
to Image B and check legibility at small UI sizes.
```

## Dashboard kullanımında prompt yerine gerçek asset

Uygulamada kullanılacak mevcut dosyalar [görsel kaynaklar](../../../docs/brand/assets.md) belgesinden seçilir. Panel durum görselleri, tam gövde ve marka simgesi kendi kullanım alanlarında korunur. Yeni üretimler inceleme ve kullanıcı seçimi sonrasında uygulamaya alınır.

## Görsel inceleme kapısı

- Kıvrımın konumu ve yönü aynı mı?
- Kulakların biçimi ve kafa/genişlik oranı aynı mı?
- Göz aralığı, burun, ağız ve bıyıklar benziyor mu?
- Pofi iki arka ayağı üzerinde dengeli ve doğal biçimde duruyor mu?
- İki kısa ön pati, kısa tombul gövdeye bağlı mı ve toplam dört uzuv okunuyor mu?
- Yüz, kulaklar, alın kıvrımı ve kart sahne nesnelerinden tamamen görünür mü?
- Şemsiye başın üstünde ve yanında mı; şaft baş ve yanak siluetinin dışından mı geçiyor?
- Krem-lavanta renk sistemi tutarlı mı?
- Kart ve gerçek tabii işareti doğru mu?
- 64, 128, 160 px'de silüet ve yüz okunuyor mu?

Herhangi bir ana özellik kayarsa yeni çıktı kanonik dosyanın yerini almaz.
