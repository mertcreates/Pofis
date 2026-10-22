import { expect, test } from "bun:test";
import { defaultNotificationPreferences, mesaiNotifications, readNotificationPreferences } from "./notifications";

const at = (clock: string) => Date.parse(`2026-10-21T${clock}+03:00`);
const goal = { date: "2026-10-21", at: at("17:00:00") };
const preferences = defaultNotificationPreferences();

test("tüm türler ve kanallar kullanıcı açana kadar kapalıdır; süre sınırı doğrulanır", () => {
  expect(preferences).toEqual({ leadMinutes: 10, approaching: { native: false, telegram: false }, reached: { native: false, telegram: false } });
  for (const leadMinutes of [0, 121, 1.5, NaN]) expect(() => readNotificationPreferences({ ...preferences, leadMinutes })).toThrow();
  expect(() => readNotificationPreferences({ ...preferences, reached: { native: true } })).toThrow();
});

test("16:50 ön bildirimi, 17:00 hedefi ve bir dakikalık geçerlilik bağımsız saatlerle sınanır", () => {
  const run = (time: string) => mesaiNotifications(goal, preferences, goal.date, at(time), at("16:00:00"));
  expect(run("16:49:59")).toEqual([]);
  expect(run("16:50:00")[0]).toMatchObject({ key: "2026-10-21:approaching", dueAt: at("16:50:00"), expiresAt: at("16:51:00") });
  expect(run("16:50:59")[0].body).toContain("17:00");
  expect(run("16:51:00")).toEqual([]);
  expect(run("17:00:00")[0].kind).toBe("reached");
  expect(run("17:01:00")).toEqual([]);
});

test("önceki gün, hedef yokluğu, açılış ve uyanma öncesindeki eşikler atlanır", () => {
  for (const selected of [null, { ...goal, date: "2026-10-20" }])
    expect(mesaiNotifications(selected, preferences, goal.date, at("17:00:10"), at("16:00:00"))).toEqual([]);
  expect(mesaiNotifications(goal, preferences, goal.date, at("17:00:10"), at("17:00:01"))).toEqual([]);
});
