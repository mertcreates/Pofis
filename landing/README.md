# Pofis — Landing Page

Pofis için bağımsız static export (`output: 'export'`) Next.js landing sayfası.

## Özellikler

- **Static Export**: `bun run build` doğrudan `out/` klasörüne statik HTML/CSS/JS üretir (Cloudflare Pages, Vercel, GitHub Pages, Netlify veya Nginx ile sıfır konfigürasyonla çalışır).
- **Plain CSS**: Tailwind yok; projenin özgün design token'ları (`light-dark()`, Geist Sans & Mono, Pofis renk paleti) kullanıldı.
- **Merkezi Metinler**: Tüm metin ve linkler [`src/content.ts`](src/content.ts) dosyasından yönetilir.
- **Karanlık/Aydınlık Tema**: Projeyle uyumlu `pofis:theme:v1` localStorage anahtarı ve sistem tercihi desteği.
- **Footer**: `Pofis · 2026 · mertcreates.`

## Komutlar

```bash
# Geliştirme sunucusu (port 3001)
bun run dev

# Statik export derlemesi (çıktı: out/)
bun run build
```
