# Kaynak arayüz aktarımı

16 Ekim 2026 kullanıcı kararı: `pofis-1.0.0-docker-source.zip` içindeki ekran yerleşimi ve bileşen görünümleri canlı Mesaim ve `/demo` için esas alınır.

Arşiv SHA256: `555d19dfde9e26f6513cde3b9807f241dcccf51e5cf5d463b8f70a490ac907ca`. Aşağıdaki kaynak adları arşiv içindeki yollardır. Güncel dosyalar ortak UI sahipleridir; hesaplar [kural haritasındaki](rules/README.md) sahiplerden gelir.

## Bileşen eşlemesi

| Arşiv kaynağı | Güncel sahip | Davranış |
| --- | --- | --- |
| `app/app-shell.js`, `app/app-header.js`, `app/app-footer.js` | [shell](../src/components/shell/app-shell.js), [header](../src/components/shell/app-header.js), [footer](../src/components/shell/app-footer.js) | Sol menü, mobil açılır menü, ayarlar modalı, sürüm notu |
| `app/theme-switch.js` | [theme-switch](../src/components/shell/theme-switch.js), [use-appearance](../src/data/use-appearance.ts) | Kaynak animasyonlu anahtar; ortak tercih sahibi |
| `app/mesai.js`, `app/dashboard/dashboard.js` | [DashboardView](../src/components/dashboard/view.tsx), [header](../src/components/dashboard/header.tsx) | Güncel/geçmiş hafta yerleşimleri; demo ve canlı aynı görünüm |
| `app/dashboard/week-selector.js`, `week-navigation.js` | [WeekPicker](../src/components/dashboard/week-picker.tsx), [week-calendar](../src/components/dashboard/week-calendar.ts) | Aylık popover, kesişen haftalar, önceki/sonraki hafta, bugüne dönüş |
| `app/dashboard/metric-card.js`, `exit-card.js` | [metrics](../src/components/dashboard/metrics.tsx), [MetricCard](../src/components/dashboard/metric-card.tsx), [Duration / Progress](../src/components/primitives.tsx) | Güncel haftada üç, geçmişte dört metrik |
| `app/dashboard/daily-timeline.js` | [DayFlow](../src/components/attendance/day-flow.tsx) | Saat ekseni, hedef, son kayıt/şimdi işaretlerinin çakışma yerleşimi |
| `app/dashboard/weekly-chart.js` | [WeekChart](../src/components/attendance/week-chart.tsx), [tooltip](../src/components/attendance/use-chart-tooltip.ts) | Ölçek çizgileri, sütunlar, canlı tahmin detayı, Escape ile kapatma |
| `app/dashboard/recent-records.js` | [DailyRecords / RecordsDialog](../src/components/attendance/records.tsx) | Bugünün son dört aralığı; dolu günde tüm kayıtlar modalı |
| `app/dashboard/daily-records.js` | [ReportTable](../src/components/attendance/report-table.tsx), [RawPassages](../src/components/attendance/records.tsx) | Altı sütun; bağımsız açılan kronolojik ham hareketler; mobil kartlar; [kayıt durumu iyileştirmesi](rules/record-status.md) |
| `app/dashboard/panel-heading.js` | Kartların `panel-heading` bölgeleri | Aynı başlık yapısı ve kaynak CSS sınıfları |
| `app/dashboard/pofi-note.js` | [PofiPanel](../src/components/dashboard/pofi-panel.tsx) | Durum rozeti, 156px görsel, metin, maskottan odayı açma |
| `app/dashboard/pofi-room.js`, `pofi-notebook.js` | [oda](../src/components/pofi/room.js), [not defteri](../src/components/pofi/notebook.js), [bağlantı](../src/components/pofi-room-content.tsx) | Albüm, kart, mesai, notlar ve mevcut sürprizler |
| `app/pofi-call.js`, `ui-icon.js` | [PofiCall](../src/components/pofi-call.js), [Icon](../src/components/ui-icon.js) | Klavyeyle Pofi çağırma ve ortak ikonlar |
| `app/dashboard/work-plan.js`, `app/plan-controls.js` | [PlanEditor](../src/components/plan-editor.tsx), [plan CSS](../src/components/plan-editor.css) | 17 Ekim 2026 plan düzenlemesi: varsayılan/özel hafta, gün başına süre, sınırlı dağıtım ve anında kayıt; [hesap sözleşmesi](rules/work-plan.md) |
| `app/modal.js` | [Modal](../src/components/modal.js) | Native dialog, tipli prop arayüzü, varsayılan açık durum, odak dönüşü, Escape, mobil tutamaktan sürükleme |
| `app/mesai.js` Connection | [Connection](../src/components/connection.tsx) | Kaynak giriş kartı ve maskot; mevcut oturum sınırları |
| `app/request-error.js`, `loading-state.js` | [RequestError](../src/components/request-error.js), [LoadingState](../src/components/loading-state.js) | [Hata sözleşmesi](pdks-errors.md): beklenen giriş hatası formda ve teknik tanısızdır; eski rapor korunur, yeniden deneme ilgili işlemi çalıştırır |
| `app/error.js`, `not-found.js`, `loading.js` | [error](../src/app/error.tsx), [not-found](../src/app/not-found.tsx), [loading](../src/app/loading.tsx) | Next 16 hata yeniden denemesi ve kaynak yardımcı ekranları |
| `app/globals.css`, `pofis.css`, `modal.css`, `dashboard/pofi-room.css` | [globals](../src/app/globals.css), [pofis](../src/app/pofis.css), [modal](../src/app/modal.css), [oda CSS](../src/components/pofi/room.css) | Kaynak tema, boyutlar, duyarlı kırılımlar ve modal görünümleri |

## İlgili sözleşmeler

- Görsel kararlar, hedef işareti ve tooltip konumu [DESIGN](../DESIGN.md) belgesinde yönetilir.
- Hesap, plan, Pofi ve kaynak politikaları [kural sahiplerinden](rules/README.md) gelir.
- Gün seçimi ve sanal ek süre [demo sözleşmesine](demo.md) aittir.
- Tema/metin ve yayın yönetimi [Pofi notları rehberindedir](pofi-notes.md).
- Kontrol yöntemi [doğrulama rehberinde](verification.md), bekleyen kabul işleri [görev listesinde](../tasks/todo.md) tutulur.
