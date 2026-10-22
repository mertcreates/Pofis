# Not defteri takvimi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/notebook-calendar.ts](../../src/domain/rules/notebook-calendar.ts)

Arayüz: `isNotebookDate(date, specialDates)`, `pofiNotebookDates(today, specialDates)`, `defaultNotebookDate`.

## Sözleşme

Mevcut haftanın hafta içi günleri ve özel tarihe denk gelen hafta sonları seçilir. Takvim özel tarihleri parametre olarak alır. [Not motoru](../../src/lib/pofi-notes/notebook.ts) [özel gün listesini](../../src/lib/pofi-notes/special-days.ts), ekran ise sunucudan dönen notların tarihlerini bu parametreye verir. Bugün listede değilse son hafta içi günü açılır. Takvim kişinin çalışma planından bağımsızdır. Güncel havuz ve seçim davranışı [Pofi notları rehberinde](../pofi-notes.md) yönetilir.

## Arayüz davranışı

Seçilen tarihte not bulunamazsa defter tarihini ve gezinme kontrollerini korur; not alanında nötr durum mesajı gösterilir. Hafta değiştiğinde eski seçim kullanılabilir tarihler arasında değilse aynı takvim sahibinin varsayılan günü gösterilir.

Normal tema havuzu boşken motor yalnız özel tarihlere ait notları döndürür. Normal günlerin notsuz olması takvimdeki hafta içi tarihlerini kaldırmaz; özel hafta sonu tarihleri dönen özel notlarla takvime katılır.

## Bağımlılıklar

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [index.ts](../../src/lib/pofi-notes/index.ts)
- [pofi-notes.js](../../src/server/pofi-notes.js)
- [notebook.js](../../src/components/pofi/notebook.js)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
