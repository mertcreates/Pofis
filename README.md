# Pofis

Mesaiye biraz Pofi.

Next.js, React ve Bun ile çalışan yerel ilk sürüm. Ekrandaki **DENİZ ÖRNEK** kişisi ve tüm geçişler sentetiktir. Gerçek PDKS bağlantısı ve giriş/oturum sistemi henüz uygulanmadı.

## Çalıştırma

Bun 1.4.3 ile:

```powershell
bun install --frozen-lockfile
bun run dev
```

Adres: http://127.0.0.1:3000

```powershell
bun test
bun run typecheck
bun run build
bun run start
```

Build çalıştırmadan önce geliştirme sunucusunu durdurun; ikisi de `.next` çıktısını kullanır. `build`, statik dosyaları standalone sunucunun yanına kopyalar; `start`, bu sunucuyu yalnızca `127.0.0.1` üzerinde açar. Next standalone çıktısı, tek Bun executable veya tamamlanmış Docker/macOS paketi anlamına gelmez.

## Mevcut davranış

- İlk giriş–son çıkış hesabı; ara dışarıda kalma süreleri düşülmez.
- Kayıtlı süre ile anlık tahminin ayrı gösterimi; belirsiz kayıtların açıklanması.
- Europe/Istanbul takvimi, güncel/geçmiş hafta, günlük kayıt ve hareket ayrıntıları.
- Varsayılan ve haftaya özel planlar, son çalışma gününde haftalık fazla/eksik hesabı.
- Açık/koyu tema, mobil düzen, Pofi'nin odası ve 20 temalı not defteri.
- Ayarlar yalnızca bu tarayıcının localStorage alanında tutulur. Şifre veya gerçek personel kaydı işlenmez.
- `/api/health` örnek veri kaynağını ve sürümü bildirir.

## Kaynaklar

- `docs/spec/master-spec-v2.md`: özgün ürün sözleşmesi.
- `docs/brand/pofi-tone-guide.md`: özgün dil, ton ve karakter rehberi.
- `docs/brand/assets.md`: kullanılan Pofi ve marka kitinin kaynağı.
- `PRODUCT.md`, `DESIGN.md`: ürün sınırları ve mevcut görsel sistem.
- `docs/implementation-plan.md`, `docs/verification.md`: ilerleme ve kabul kanıtları.
- `src/domain`: UI'dan bağımsız hesaplamalar ve davranış testleri.
- `src/data/demo.ts`: sentetik raporlar; gelecekteki PDKS adaptörü için kaynak sınırı.

PDKS veri sözleşmesinin çıkarılması, şifre saklamayan oturumlar ve oturum izolasyonu, gerçek kaynağın yenileme/hata davranışları, yük testi ve dağıtım paketleri sonraki aşamadadır.
