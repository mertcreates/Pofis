# Pofi — Character Bible v1.0

**Ürün:** Pofis  
**Maskot:** Pofi  
**Statü:** Kanonik varsayılan tam gövde pozu, iki arka ayağı üzerinde doğal dik duruştur.

## Kanonik referans

`assets/pofi-full.png` ve `assets/pofi-full.webp`, yüz kimliği, kafa oranları, renkler, materyal ve aksesuarlar için öncelikli görsel referanslardır. Yeni tam gövde üretimlerinde kanonik dik duruş izlenir.

Pofi, açık krem gövdeli, yumuşak lavanta ayrıntılı, iki arka ayağı üzerinde doğal biçimde dik duran tombul bir kedi maskotudur. Gövdesi kısa ve yuvarlak kalır; iki kısa ön pati kol gibi doğal durur. Büyük ve yuvarlak kafa, iki üçgen kulak, alında tek kıvrımlı tüy, iri koyu oval gözler, küçük burun ve gülümseme, pembe yanaklar, yanlarda ince bıyıklar ve sol yanda dolgun lavanta kuyruk karakterin değişmez özellikleridir. Boynunda lavanta renkli bir kart askısı ve beyaz personel kartı bulunur. Kartta kullanıcı tarafından sağlanan **tabii** işareti yer alır.

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
| `--tabii-green` | `#00FF99` | Personel kartı sembolü |

*Bu değerler illüstrasyonun hedef renk rehberidir. PNG içindeki gölgeler bu ana tonlardan doğal geçişler üretir.*

## Üretim yaklaşımı

Mevcut tam gövde PNG/WebP dosyaları Pofi'nin yüz, renk, materyal, kuyruk ve kart kimliğini korumak için referans alınır; yeni tam gövde çizimlerinde kanonik ayakta poz kullanılır. Uygulamada kullanılacak dosyalar kullanıcı seçimiyle belirlenir. Etkin marka simgesi ve durum dosyaları [görsel kaynaklar](../../../docs/brand/assets.md) belgesinde yönetilir.

Yeni bir sahne gerektiğinde ana referans görsel ve `docs/MASTER_PROMPT.md` birlikte kullanılır. Referans görsel kimliği taşır; prompt ayakta pozu ve nesnelerin sahnedeki yerini tarif eder. Şemsiye gibi bir nesne yüzün çevresinde boşluk bırakacak şekilde, başın üstünde ve yanında konumlandırılır. Yeni çıktı uygulamaya alınmadan önce kullanıcı tarafından seçilir. Yüz, kulak, kıvrım, gövde/pati oranı, poz ve kart eşleşmesi karşılaştırılarak ayrıca onaylanır.

## Poz ve nesne yerleşimi

- Pofi tam gövdede iki arka ayağı üzerinde dengeli biçimde durur; gövde kısa ve tombul kalır.
- İki ön pati kısa, yuvarlak ve vücuda doğal biçimde bağlı görünür.
- Yüz, kulaklar, alın kıvrımı ve kart sahne nesnelerinden tamamen okunur kalır.
- Şemsiye kanopisi başın üstünde ve yanında durur; şaft baş ve yanak siluetinin dışından ilerleyerek tutan patiye ulaşır.

## Uygulamada kullanım

Dosya seçimi [görsel kaynaklar](../../../docs/brand/assets.md), ekran boyutları ve yerleşim [DESIGN](../../../DESIGN.md) belgesinde yönetilir.

Resimler `object-fit: contain` ile, özgün en/boy oranı korunarak gösterilir.

## tabii kartı hakkında

`references/tabii-logo-provided.png`, kullanıcı tarafından verilen orijinal logo referansıdır. Karakter illüstrasyonundaki küçük logo görsel üretimi sonucunda oluşmuştur. Kurumsal kullanımda birebir geometrik doğruluk gerekiyorsa badge alanı orijinal logoya göre ayrıca son kez doğrulanmalıdır. Marka hakkı ve şirket içi kullanım onayı yayınlayan ekip tarafından değerlendirilir. **Ürün adı Pofis, personel kartındaki işaret tabii logosudur.**
