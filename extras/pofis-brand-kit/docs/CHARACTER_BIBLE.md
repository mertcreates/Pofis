# Pofi — Character Bible v1.0

**Ürün:** Pofis  
**Maskot:** Pofi  
**Statü:** Kanonik varsayılan tam gövde pozu, iki arka ayağı üzerinde doğal dik duruştur.

## Kanonik referans

`assets/pofi-full.png` ve `assets/pofi-full.webp`, yüz kimliği, kafa oranları, renkler, materyal ve aksesuarlar için öncelikli görsel referanslardır. Yeni tam gövde üretimlerinde kanonik dik duruş izlenir.

Pofi, açık krem gövdeli, yumuşak lavanta ayrıntılı, iki arka ayağı üzerinde doğal biçimde dik duran tombul bir kedi maskotudur. Gövdesi kısa ve yuvarlak kalır; iki kısa ön pati kol gibi doğal durur. Büyük ve yuvarlak kafa, iki üçgen kulak, alında tek kıvrımlı tüy, iri koyu oval gözler, küçük burun ve gülümseme, pembe yanaklar, yanlarda ince bıyıklar ve sol yanda dolgun lavanta kuyruk karakterin değişmez özellikleridir. Boynunda lavanta renkli bir kart askısı ve beyaz personel kartı bulunur.

## Tasarım dili

Bu belge görsel kimliği, oranları ve sahne yerleşimini tanımlar. Pofi'nin sesi, mizahı ve davranışlarının anlatımı [ton rehberinde](../../../docs/brand/pofi-tone-guide.md) yönetilir. Sahne seçiminde oradaki merak, küçük yardımlar, öğrenme ve gündelik gözlem örnekleri kullanılır; ifade ve nesneler sahnedeki eylemi okunur kılar.

- Yumuşak, neredeyse mat, hacim hissi veren 2D illüstrasyon
- Açık krem ve lavanta tonları, düşük kontrastlı doğal gölgeler
- Sakin ve hafif gülümseyen yüz
- Tam gövde, dengeli ve doğal iki ayaklı dik duruş
- Statik illüstrasyon
- Karakterin yüzü, gövdesi ve kartı bir bütün olarak kullanılır

## Karakter renkleri

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--pofi-fur` | `#FFF7F1` | Krem tüy ana tonu |
| `--pofi-lavender` | `#CFC3E6` | Kulak, pati, kuyruk |
| `--pofi-ink` | `#2B2240` | Göz, burun, ağız |
| `--pofi-blush` | `#FFDDEA` | Yanak |

*Bu değerler illüstrasyonun hedef renk rehberidir. PNG içindeki gölgeler bu ana tonlardan doğal geçişler üretir.*

## Üretim yaklaşımı

Yeni sahnelerde kanonik referans ve aşağıdaki poz kuralları birlikte kullanılır. Etkin dosyalar [görsel kaynaklar](../../../docs/brand/assets.md) belgesindedir.

Yeni sahnede ana referans görsel ve [üretim promptunu](MASTER_PROMPT.md) birlikte kullan. Referans görsel kimliği, prompt pozu ve nesne yerleşimini taşır. Çıktıyı yüz, kulak, kıvrım, gövde/pati oranı, poz ve kart açısından referansla karşılaştır; kullanıcı seçimi ve onayından sonra uygulamaya al.

## Poz ve nesne yerleşimi

- Pofi tam gövdede iki arka ayağı üzerinde dengeli biçimde durur; gövde kısa ve tombul kalır.
- İki ön pati kısa, yuvarlak ve vücuda doğal biçimde bağlı görünür.
- Yüz, kulaklar, alın kıvrımı ve kart sahne nesnelerinden tamamen okunur kalır.
- Sahne nesnesinin konumu ve onu tutan pati, istenen sahnenin üretim tarifinde belirtilir.

## Uygulamada kullanım

Dosya seçimi [görsel kaynaklar](../../../docs/brand/assets.md), ekran boyutları ve yerleşim [DESIGN](../../../DESIGN.md) belgesinde yönetilir.

Resimler `object-fit: contain` ile, özgün en/boy oranı korunarak gösterilir.
