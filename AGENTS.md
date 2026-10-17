# Pofis — proje talimatları

## Ürün kurallarıyla çalışma

- Ürün davranışını etkileyen değişikliklerde [kural haritasından](docs/rules/README.md) ilgili kuralın belgesini, kod sahibini ve kullanan yerleri bul. Terimleri [GLOSSARY.md](GLOSSARY.md) ile eşleştir.
- Kural değişikliğini mevcut sahibinde uygula; bağlı hesaplar, sunucu adaptörleri ve görünümler aynı sahibin sonucunu kullansın. Yeni bir kural için tek sahip belirleyip haritaya ekle.
- Davranış değiştiğinde sözleşme belgesini ve bağımlı davranış testlerini birlikte güncelle. Beklenen sonucu ürün sözleşmesinden alınmış somut senaryoyla doğrula.
- Pofi günlüklerinde [içerik yönetim rehberini](docs/pofi-notes.md) izle. Tema/metin düzenlemelerini katalogda, seçim davranışını seçim motorunda ve özel günleri tek listede yönet. Tek güncel not havuzu tüm tarihler için kullanılır; tarih bazlı eski havuz veya arşiv uyumluluğu ekleme.
- Ürün kapsamı için [PRODUCT.md](PRODUCT.md), arayüz kararları için [DESIGN.md](DESIGN.md), Pofi metinleri için [ton rehberini](docs/brand/pofi-tone-guide.md) ilgili değişiklik kapsamında kullan.
- Belge sahiplerini [belge haritasından](docs/README.md) bul; her konunun ayrıntısını kendi belgesinde yönet, diğer belgelerden bağlantı ver.
- Doğrulamayı [doğrulama rehberine](docs/verification.md) göre seç: kural testleri, tür kontrolü ve görünür akış değiştiğinde tarayıcı kabulü. Sonucu ve kanıtın sınırlarını kullanıcıya bildir.
- Oturum, kaynak erişimi veya dağıtım sözleşmesi değiştiğinde ilgili kural belgesiyle birlikte [çok kullanıcılı yapıyı](docs/architecture/multi-user-sessions.md), [dağıtım rehberini](docs/deployment.md) ve etkilenen README/PRODUCT/uygulama planı bölümlerini kodla eşleştir. Açık kabul işlerini [görev kaydına](tasks/todo.md) işle.
- Tamamlanan doğrulamaların audit raporlarını, ekran görüntülerini ve ölçüm çıktılarını temizle. Geçerli kararları ilgili sözleşmeye, çözülmemiş bulguları görev listesine taşı. Testleri, tekrar kullanılabilir kabul betiklerini ve kullanıcı kaynaklarını koru. Doküman değişikliğinde yerel bağlantıları ve kodla tutarlılığı doğrula.

## Talimat ve iletişim dili

İstenen davranışı somut, olumlu eylemlerle anlat. Her yönlendirme ilgili işi, sahibini ve beklenen sonucu açıkça söylesin; açıklamayı mevcut görev ve gözlenen kanıt üzerinden kur.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
