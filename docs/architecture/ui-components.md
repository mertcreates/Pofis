# Arayüz sahipleri

Paylaşılan yüzeylerde demo ve canlı ekran aynı bileşenleri kullanır. Görsel kararlar [DESIGN](../../DESIGN.md), hesaplar [kural haritası](../rules/README.md), demo verisi ve sanal saat [demo rehberi](../demo.md) tarafından yönetilir.

| Alan | Kod sahibi ve sorumluluk |
| --- | --- |
| Metinler | [ui-text.js](../../src/lib/ui-text.js): arayüz etiketleri, erişilebilir adlar, bildirim metinleri, işlem sonuçları ve hatalar. Pofi notları ve faaliyetleri [içerik rehberindeki sahiplerde](../pofi-notes.md), yemek yorumları [senaryo dosyalarında](../rules/meal-menu.md), konsol easter egg metni kök yerleşimde yönetilir |
| Uygulama çerçevesi | [AppShell](../../src/components/shell/app-shell.js), [başlık](../../src/components/shell/app-header.js), [alt bilgi](../../src/components/shell/app-footer.js): menü, ayarlar ve sürüm bilgisi |
| Tema | [ThemeSwitch](../../src/components/shell/theme-switch.js), [useAppearance](../../src/data/use-appearance.ts): tercih ve işletim sistemi teması |
| Masaüstü güncellemesi | [useDesktopUpdate / DesktopUpdateModal](../../src/components/shell/desktop-update.tsx): köprüden sürüm bilgisini alma, platform yönlendirmesi ve komut kopyalama; [masaüstü sözleşmesi](../desktop.md#açılışta-sürüm-denetimi) |
| Sürüm geçmişi | [ChangelogHistory](../../src/components/changelog/history.tsx): manuel kataloğu yeniden eskiye zaman çizgisinde sunma, menü/footer/güncelleme hedefini odaklama; içerik ve yayın sözleşmesi [sürüm rehberindedir](../release.md#uygulama-içi-sürüm-geçmişi) |
| Mesaim | [DashboardView](../../src/components/dashboard/view.tsx), [başlık](../../src/components/dashboard/header.tsx): güncel/geçmiş hafta yerleşimi ve ortak ekran modeli |
| Pofi Mini | [MiniDashboard](../../src/components/mini/mini-dashboard.tsx): ortak rapor ve plan sahiplerinin kompakt sunumu; pencere ve menü davranışı [masaüstü sözleşmesinde](../desktop.md#pofi-mini-ve-macos-menü-çubuğu) |
| Canlı saat ve gün seçimi | [ReportContent](../../src/components/dashboard/report-content.tsx): saniyelik izdüşüm ve cetvelde seçilen tarihi rapora/plana yönlendirme; [Dashboard](../../src/components/dashboard.tsx): İstanbul gün değişimi |
| Hafta seçimi | [WeekPicker](../../src/components/dashboard/week-picker.tsx), [takvim](../../src/components/dashboard/week-calendar.ts): aylık gezinme ve hafta seçimi |
| Süre ve metrikler | [Metrics](../../src/components/dashboard/metrics.tsx), [Duration / Progress](../../src/components/primitives.tsx): hesaplanmış süreleri sunma; geçmiş haftada grafik ve haftalık toplamı aynı satırda birleştirme |
| Günün akışı | [DayFlow](../../src/components/attendance/day-flow.tsx): mesai özeti, çubuğun ucunu takip eden Şimdi/Son çıkış ve hedef işaretine bağlı Hedef çıkış etiketleri, kayıt durumu ve `onOpenRecords` eylemi; [ReportContent](../../src/components/dashboard/report-content.tsx) bugünün rapor satırını açar |
| Haftalık toplam | [WeeklyTotal](../../src/components/dashboard/weekly-total.tsx): toplam ve hedef farkı; güncel haftada günlük hedef cetveli ve `onSelectDay(date)` olayı |
| Haftalık grafik | [WeekChart](../../src/components/attendance/week-chart.tsx): günlük kayıtlı süre ve tahmin sütunları |
| Giriş–çıkış raporu | [ReportTable](../../src/components/attendance/report-table.tsx), [RawPassages](../../src/components/attendance/records.tsx): açılır günlük özetler ve ham hareketler; `openDay(date)` arayüzü bugün veya geçmiş günün mevcut satırını açar, odaklar ve görünür alana kaydırır; [labels](../../src/components/attendance/labels.ts) kayıt durumunu ve somut nedenleri metne çevirir |
| Pofi paneli | [PofiPanel](../../src/components/dashboard/pofi-panel.tsx): durum görseli, başlık, mesaj ve odayı açma |
| Pofi odası | [Oda](../../src/components/pofi/room.js), [not defteri](../../src/components/pofi/notebook.js), [bağlantı](../../src/components/pofi-room-content.tsx): albüm, kart, notlar, günlük faaliyetler ve sürprizler. İçerik ve seçim sahipleri [içerik rehberindedir](../pofi-notes.md) |
| Pofi çağırma ve ikonlar | [PofiCall](../../src/components/pofi-call.js), [Icon](../../src/components/ui-icon.js): klavye çağrısı ve ortak ikonlar |
| Yemek menüsü | [MealMenuModal](../../src/components/meals/menu-modal.tsx), [tarih seçici](../../src/components/meals/date-picker.tsx): oturumlu ana ekrandan açılan menü ve Pofi notu; veri ve kategori sahipleri [menü sözleşmesinde](../rules/meal-menu.md) |
| Mesai planı | [PlanEditor](../../src/components/plan-editor.tsx): varsayılan/özel hafta kontrolleri ve kayıt; isteğe bağlı `initialDate` aynı haftanın çalışma gününü başlangıçta seçer. [DashboardView](../../src/components/dashboard/view.tsx) modalı bu tarihle açar; hesaplar [plan sözleşmesinden](../rules/work-plan.md) gelir |
| Dialog ve tooltip | [Modal](../../src/components/modal.js), [Tooltip](../../src/components/tooltip.tsx): odak, kapatma ve konumlandırma |
| Bildirim tercihleri | [NotificationSettings](../../src/components/notifications/settings.tsx): masaüstü/web/demo ortak ekranı, opt-in, kanal bağlantısı ve durum. [useDesktopNotifications](../../src/data/use-desktop-notifications.ts) gerçek köprüyü, [useDemoNotifications](../../src/demo/use-notifications.ts) bellekte örnek işlem sonuçlarını sağlar; zamanlama Electron ana sürecindedir |
| Giriş | [Connection](../../src/components/connection.tsx): PDKS giriş formu ve oturum eylemleri |
| Hata ve bildirim | [RequestError](../../src/components/request-error.js), [InlineNotice](../../src/components/inline-notice.tsx): [hata sözleşmesine](../pdks-errors.md) uygun sunum ve toparlanma |
| Yardımcı ekranlar | [LoadingState](../../src/components/loading-state.js), [NotFoundState](../../src/components/not-found-state.tsx), [error](../../src/app/error.tsx): yükleme, 404 ve hata sınırı |

Stil sahipleri, etkileşim ayrıntıları ve erişilebilirlik kararları DESIGN'da tutulur. Görünür akışlar [doğrulama rehberine](../verification.md) göre kontrol edilir.
