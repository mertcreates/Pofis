# Pofi — Canonical generation prompt

## Girdi sırası

1. **Image A:** `assets/pofi-full.png` (zorunlu kanonik önden görünüm)
2. **Image B:** `references/tabii-logo-provided.png` (kart görünüyorsa)
3. **Image C:** İsteğe bağlı kompozisyon / arayüz referansı

## Yeni görünüm veya poz için kopyalanabilir prompt

```text
Use Image A as the canonical identity reference of Pofi, the static mascot of Pofis.
Keep the SAME specific mascot identity as Image A, not a redesign.

Character identity: a seated chubby kitten with an oversized rounded ivory head,
short rounded body, large triangular ears with lavender inner coloring, a single
large curled tuft centered above the forehead, two dark oval eyes with tiny
highlights, a small dark triangular nose, subtle cat smile, pink rounded cheeks,
a few lavender whisker lines, two visible front paws close together, small seated
feet and a large rounded lavender tail on its left side.

Accessories: lavender V-shaped employee lanyard, white rounded ID badge with the
mint-green tabii mark from Image B. Keep the badge scale and placement from Image A.

Style: premium soft-flat 2D mascot art, warm ivory fur, muted lavender shading,
soft matte gradient, light neutral background or genuine transparency, simple
forms, static expression. Match eye spacing, ear angles, curl silhouette, face
proportions, paw placement and body ratio to Image A.

Task-specific change: [SPECIFY ONLY THE REQUIRED CHANGE HERE]

Deliver exactly one asset and preserve Pofi's identity. The change should concern
the requested context or view, not the mascot's underlying design. Keep the badge
logo visually faithful to Image B, and check the result at small UI sizes.
```

## Dashboard kullanımında prompt yerine gerçek asset

Dashboard, sidebar ve rapor kartlarında yeni görsel üretmek yerine `pofi-full-512.webp` ve `pofi-mark.svg` doğrudan kullanılır. Böylece tasarım sürekliliği için üretken modele bağımlılık ortadan kalkar.

## Görsel inceleme kapısı

- Kıvrımın konumu ve yönü aynı mı?
- Kulakların biçimi ve kafa/genişlik oranı aynı mı?
- Göz aralığı, burun, ağız ve bıyıklar benziyor mu?
- Pati sayısı/konumu, oturuş, kuyruk formu aynı mı?
- Krem-lavanta renk sistemi tutarlı mı?
- Kart ve gerçek tabii işareti doğru mu?
- 64, 128, 160 px'de silüet ve yüz okunuyor mu?

Herhangi bir ana özellik kayarsa yeni çıktı kanonik dosyanın yerini almaz.
