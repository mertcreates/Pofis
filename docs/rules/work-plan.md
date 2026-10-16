# Mesai planı ve çıkış hedefi

[Kural haritası](README.md) · [Terimler](../../GLOSSARY.md)

## Tek sahip

[src/domain/rules/work-plan.ts](../../src/domain/rules/work-plan.ts)

Arayüz: `WorkPlan`, `DEFAULT_WORK_PLAN`, `PLAN_LIMITS`, `readPlanInput`, `planTargets`, `resolveWeekPlan`, `targetExitAt`.

## Sözleşme

Planın seçili günleri ve haftalık saati tek modeldir. Girdi sınırları hem formdan hem depolama doğrulamasından okunur. Haftalık saat seçili günlere eşit dağılır; normal günlük hedef saniyeye yukarı yuvarlanır. Son kalan çalışma gününün çıkış hedefi haftalık hedef eksi önceki kayıtlı toplamdır; bugünün kaydı iki kez düşülmez. Eksik/belirsiz kayıt, kısmi hafta veya kalan gün olmaması çıkış hedefini engeller. Normal günlük hedef ile haftalık farkı taşıyan çıkış hedefi farklı kavramlardır. Haftalık anahtar gerçek bir pazartesidir.

## Bağımlılıklar

- [Günlük kayıt durumu](record-status.md): rapor adaptörü geçiş belirsizliğini `incomplete` olarak bu sahibin plan girdisine taşır; ilk giriş/son çıkış süresinin bulunması belirsiz günü kapatmaz.

- [Takvim ve kaynak saati](calendar.md)

## Kullanan yerler

- [report.ts](../../src/domain/report.ts)
- [plan-controls.js](../../src/components/plan-controls.js)
- [plan-storage.js](../../src/lib/plan-storage.js)
- [work-plans.ts](../../src/data/work-plans.ts)
- [metrics.tsx](../../src/components/dashboard/metrics.tsx)

## Testler

- [rules.test.ts](../../src/domain/rules/rules.test.ts)
- [report.test.ts](../../src/domain/report.test.ts)
- [work-plans.test.ts](../../src/data/work-plans.test.ts)
- [Tarayıcı kabulü](../../scripts/acceptance/archive-behavior.js)
