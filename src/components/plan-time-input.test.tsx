import { expect, test } from "bun:test";
import { editPlanTimeSegment, pastePlanTime, stepPlanTime } from "./plan-time-input";
import { parsePlanClock, planClockTimes } from "@/domain/rules/plan-duration";

test("6, 3, 0 tuşları saati tamamlayıp dakikaya geçer ve 06:30 üretir", () => {
  const hour = editPlanTimeSegment("", "hour", "6")!;
  expect(hour).toEqual({ value: "06:", advance: true });
  const minute = editPlanTimeSegment(hour.value, "minute", "3")!;
  expect(minute.value).toBe("06:3");
  expect(parsePlanClock(minute.value)).toBeNull();
  const complete = editPlanTimeSegment(minute.value, "minute", "30")!;
  expect(complete.value).toBe("06:30");
  expect(parsePlanClock(complete.value)).toBe(390);
  expect(planClockTimes({ anchor: "entry", minute: parsePlanClock(complete.value)! }, 28800)?.exit.value).toBe("14:30");
});

test("0, 1 ve 2 ikinci saat rakamını bekler; 3–9 saati tamamlar", () => {
  for (const digit of ["0", "1", "2"]) {
    expect(editPlanTimeSegment("", "hour", digit)).toEqual({ value: `${digit}:`, advance: false });
  }
  for (const digit of ["3", "4", "5", "6", "7", "8", "9"]) {
    expect(editPlanTimeSegment("", "hour", digit)).toEqual({ value: `0${digit}:`, advance: true });
  }
  for (const hour of ["00", "06", "12", "18", "20", "23"]) {
    expect(editPlanTimeSegment(`${hour[0]}:`, "hour", hour)).toEqual({ value: `${hour}:`, advance: true });
  }
});

test("seçili bölümü değiştirmek veya silmek karşı bölümü korur", () => {
  expect(editPlanTimeSegment("06:30", "hour", "1")).toEqual({ value: "1:30", advance: false });
  expect(editPlanTimeSegment("1:30", "hour", "18")?.value).toBe("18:30");
  expect(editPlanTimeSegment("18:30", "minute", "45")?.value).toBe("18:45");
  expect(editPlanTimeSegment("18:30", "minute", "3")?.value).toBe("18:3");
  expect(editPlanTimeSegment("18:3", "minute", "")?.value).toBe("18:");
  expect(editPlanTimeSegment("18:", "hour", "")?.value).toBe("");
  expect(editPlanTimeSegment("06:30", "hour", "")?.value).toBe(":30");
  expect(parsePlanClock(":30")).toBeNull();
});

test("dakika tek rakamla tamamlanabiliyorsa sıfırla başlar; sıfır dakika açıkça girilir", () => {
  expect(editPlanTimeSegment("06:", "minute", "0")?.value).toBe("06:0");
  expect(parsePlanClock("06:0")).toBeNull();
  expect(editPlanTimeSegment("06:0", "minute", "00")?.value).toBe("06:00");
  expect(editPlanTimeSegment("06:", "minute", "6")?.value).toBe("06:06");
  expect(editPlanTimeSegment("23:5", "minute", "59")?.value).toBe("23:59");
});

test("geçersiz bölüm girişi değeri değiştirmez", () => {
  for (const input of ["24", "99", "12983", "a", "-1", "1.5", "6:30"]) {
    expect(editPlanTimeSegment("06:30", "hour", input)).toBeNull();
  }
  for (const input of ["60", "99", "300", "a", "-1", "3:0"]) {
    expect(editPlanTimeSegment("06:30", "minute", input)).toBeNull();
  }
});

test("tam saat yapıştırma iki bölümü birlikte değiştirir; bozuk içerik kesilmez", () => {
  for (const input of ["0630", "06:30", "6:30", " 06:30 "]) expect(pastePlanTime(input)).toBe("06:30");
  expect(pastePlanTime("0000")).toBe("00:00");
  expect(pastePlanTime("2359")).toBe("23:59");
  for (const input of ["12983", "24:00", "12:60", "12:001", "abc", "09a00", "::", ":30", "630", "6"]) {
    expect(pastePlanTime(input)).toBeNull();
  }
});

test("yukarı/aşağı ok saat bölümünde bir saat, dakika bölümünde bir dakika değiştirir", () => {
  expect(stepPlanTime("06:30", "hour", 1)).toBe("07:30");
  expect(stepPlanTime("06:30", "hour", -1)).toBe("05:30");
  expect(stepPlanTime("06:30", "minute", 1)).toBe("06:31");
  expect(stepPlanTime("06:30", "minute", -1)).toBe("06:29");
  expect(stepPlanTime("06:59", "minute", 1)).toBe("07:00");
  expect(stepPlanTime("06:00", "minute", -1)).toBe("05:59");
});

test("ok tuşları gece yarısında döner; boş veya eksik saati tamamlamaz", () => {
  expect(stepPlanTime("23:59", "minute", 1)).toBe("00:00");
  expect(stepPlanTime("00:00", "minute", -1)).toBe("23:59");
  expect(stepPlanTime("23:30", "hour", 1)).toBe("00:30");
  expect(stepPlanTime("00:30", "hour", -1)).toBe("23:30");
  for (const clock of ["", "06:", ":30", "06:3", "24:00"]) {
    for (const part of ["hour", "minute"] as const) {
      expect(stepPlanTime(clock, part, 1)).toBeNull();
      expect(stepPlanTime(clock, part, -1)).toBeNull();
    }
  }
});
