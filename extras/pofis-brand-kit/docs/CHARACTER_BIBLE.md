# Pofi — Character Bible v1.0

**Ürün:** Pofis  
**Maskot:** Pofi  
**Statü:** Kanonik varsayılan tam gövde pozu, iki arka ayağı üzerinde doğal dik duruştur.

## Kanonik referans

`assets/pofi-full.png` ve `assets/pofi-full.webp`, yüz kimliği, kafa oranları, renkler, materyal ve aksesuarlar için öncelikli görsel referanslardır. Bu dosyalardaki oturan poz, yeni üretimlerin pozunu belirlemez; tam gövde üretimlerinde kanonik dik duruş izlenir.

Pofi, açık krem gövdeli, yumuşak lavanta ayrıntılı, iki arka ayağı üzerinde doğal biçimde dik duran tombul bir kedi maskotudur. Gövdesi kısa ve yuvarlak kalır; iki kısa ön pati kol gibi doğal durur. Büyük ve yuvarlak kafa, iki üçgen kulak, alında tek kıvrımlı tüy, iri koyu oval gözler, küçük burun ve gülümseme, pembe yanaklar, yanlarda ince bıyıklar ve sol yanda dolgun lavanta kuyruk karakterin değişmez özellikleridir. Boynunda lavanta renkli bir kart askısı ve beyaz personel kartı bulunur. Kartta kullanıcı tarafından sağlanan **tabii** işareti yer alır.

## Tasarım dili

- Yumuşak, neredeyse mat, hacim hissi veren 2D illüstrasyon
- Açık krem ve lavanta tonları, düşük kontrastlı doğal gölgeler
- Sakin ve hafif gülümseyen yüz
- Tam gövde, dengeli ve doğal iki ayaklı dik duruş
- Statik illüstrasyon, animasyon yok
- Karakterin yüzü, gövdesi ve kartı bir bütün olarak kullanılır

## Karakter renkleri

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--pofi-fur` | `#FFF7F1` | Krem tüy ana tonu |
| `--pofi-lavender` | `#CFC3E6` | Kulak, pati, kuyruk |
| `--pofi-ink` | `#2B2240` | Göz, burun, ağız |
| `--pofi-blush` | `#FFDDEA` | Yanak |
| `--tabii-green` | `#00FF99` | Personel kartı sembolü |

*Bu değerler illüstrasyonun hedef renk rehberidir. Rendered PNG içindeki gölgeler nedeniyle her pikselin birebir bu HEX değerinde olması beklenmez.*

## Üretim yaklaşımı

Mevcut tam gövde PNG/WebP dosyaları Pofi'nin yüz, renk, materyal, kuyruk ve kart kimliğini korumak için referans alınır; yeni tam gövde çizimlerinde kanonik ayakta poz kullanılır. Uygulamadaki mevcut görseller bu prompt kararıyla değiştirilmez. Küçük boyutlar için `assets/pofi-mark.svg`, Pofi'nin tanınan yüz hatlarından üretilmiş **basitleştirilmiş ayrı bir vektör sembolüdür**. Tam gövde illüstrasyonunun vektörel eşdeğeri değildir.

Yeni bir sahne gerektiğinde ana referans görsel ve `docs/MASTER_PROMPT.md` birlikte kullanılır. Referans görsel kimliği taşır; prompt ayakta pozu ve nesnelerin sahnedeki yerini tarif eder. Şemsiye gibi bir nesne yüzün çevresinde boşluk bırakacak şekilde, başın üstünde ve yanında konumlandırılır. Yeni çıktı, ana görsel dosyalarının yerini otomatik almaz. Yüz, kulak, kıvrım, gövde/pati oranı, poz ve kart eşleşmesi karşılaştırılarak ayrıca onaylanır.

## Poz ve nesne yerleşimi

- Pofi tam gövdede iki arka ayağı üzerinde dengeli biçimde durur; gövde kısa ve tombul kalır.
- İki ön pati kısa, yuvarlak ve vücuda doğal biçimde bağlı görünür.
- Yüz, kulaklar, alın kıvrımı ve kart sahne nesnelerinden tamamen okunur kalır.
- Şemsiye kanopisi başın üstünde ve yanında durur; şaft baş ve yanak siluetinin dışından ilerleyerek tutan patiye ulaşır.

## Kullanım boyutları

| Alan | Önerilen dosya | CSS boyutu |
| --- | --- | --- |
| Sidebar / favicon | `pofi-mark.svg` | 24–48 px |
| Küçük yardımcı alan | `pofi-mark.svg` | 48–64 px |
| Dashboard kartı | `pofi-full-512.webp` | 96–160 px |
| Onboarding / büyük gösterim | `pofi-full.webp` | 160–320 px |

Resimler `object-fit: contain` ile, sabit en/boy oranında gösterilir. Orantısız sıkıştırma uygulanmaz.

## tabii kartı hakkında

`references/tabii-logo-provided.png`, kullanıcı tarafından verilen orijinal logo referansıdır. Karakter illüstrasyonundaki küçük logo görsel üretimi sonucunda oluşmuştur. Kurumsal kullanımda birebir geometrik doğruluk gerekiyorsa badge alanı orijinal logoya göre ayrıca son kez doğrulanmalıdır. Marka hakkı ve şirket içi kullanım onayı yayınlayan ekip tarafından değerlendirilir. **Pofis ürün adı ile tabii logosu birbirine karıştırılmaz.**
