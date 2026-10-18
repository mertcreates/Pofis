# Arayüz sahipleri

Demo ve canlı ekran aynı bileşenleri kullanır. Görsel kararlar [DESIGN](../../DESIGN.md), hesaplar [kural haritası](../rules/README.md), demo verisi ve sanal saat [demo rehberi](../demo.md) tarafından yönetilir.

| Alan | Kod sahibi ve sorumluluk |
| --- | --- |
| Uygulama çerçevesi | [AppShell](../../src/components/shell/app-shell.js), [başlık](../../src/components/shell/app-header.js), [alt bilgi](../../src/components/shell/app-footer.js): menü, ayarlar ve sürüm bilgisi |
| Tema | [ThemeSwitch](../../src/components/shell/theme-switch.js), [useAppearance](../../src/data/use-appearance.ts): tercih ve işletim sistemi teması |
| Mesaim | [DashboardView](../../src/components/dashboard/view.tsx), [başlık](../../src/components/dashboard/header.tsx): güncel/geçmiş hafta yerleşimi ve ortak ekran modeli |
| Canlı saat | [ReportContent](../../src/components/dashboard/report-content.tsx): saniyelik izdüşüm; [Dashboard](../../src/components/dashboard.tsx): İstanbul gün değişimi |
| Hafta seçimi | [WeekPicker](../../src/components/dashboard/week-picker.tsx), [takvim](../../src/components/dashboard/week-calendar.ts): aylık gezinme ve hafta seçimi |
| Süre ve metrikler | [Metrics](../../src/components/dashboard/metrics.tsx), [MetricCard](../../src/components/dashboard/metric-card.tsx), [Duration / Progress](../../src/components/primitives.tsx): hesaplanmış süreleri sunma |
| Günün akışı | [DayFlow](../../src/components/attendance/day-flow.tsx): saat ekseni, hedef ve son kayıt/şimdi işaretleri |
| Haftalık toplam | [WeeklyTotal](../../src/components/dashboard/weekly-total.tsx): günlük hedef bölümleri, toplam ve hedef farkı |
| Haftalık grafik | [WeekChart](../../src/components/attendance/week-chart.tsx): günlük kayıtlı süre ve tahmin sütunları |
| Giriş–çıkış raporu | [ReportTable](../../src/components/attendance/report-table.tsx), [RawPassages](../../src/components/attendance/records.tsx): akordeon/tablo, kayıt durumu ve açıldığında hazırlanan ham hareketler |
| Pofi paneli | [PofiPanel](../../src/components/dashboard/pofi-panel.tsx): durum görseli, başlık, mesaj ve odayı açma |
| Pofi odası | [Oda](../../src/components/pofi/room.js), [not defteri](../../src/components/pofi/notebook.js), [bağlantı](../../src/components/pofi-room-content.tsx): albüm, kart, notlar ve sürprizler |
| Pofi çağırma ve ikonlar | [PofiCall](../../src/components/pofi-call.js), [Icon](../../src/components/ui-icon.js): klavye çağrısı ve ortak ikonlar |
| Mesai planı | [PlanEditor](../../src/components/plan-editor.tsx): varsayılan/özel hafta kontrolleri ve kayıt; hesaplar [plan sözleşmesinden](../rules/work-plan.md) gelir |
| Dialog ve tooltip | [Modal](../../src/components/modal.js), [Tooltip](../../src/components/tooltip.tsx): odak, kapatma ve konumlandırma |
| Giriş | [Connection](../../src/components/connection.tsx): PDKS giriş formu ve oturum eylemleri |
| Hata ve bildirim | [RequestError](../../src/components/request-error.js), [InlineNotice](../../src/components/inline-notice.tsx): [hata sözleşmesine](../pdks-errors.md) uygun sunum ve toparlanma |
| Yardımcı ekranlar | [LoadingState](../../src/components/loading-state.js), [NotFoundState](../../src/components/not-found-state.tsx), [error](../../src/app/error.tsx): yükleme, 404 ve hata sınırı |

Stil sahipleri, etkileşim ayrıntıları ve erişilebilirlik kararları DESIGN'da tutulur. Görünür akışlar [doğrulama rehberine](../verification.md) göre kontrol edilir; açık kabul işleri [görev listesindedir](../../tasks/todo.md).
