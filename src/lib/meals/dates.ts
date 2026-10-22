import { addDays, dateKey, weekday, weekDates, weekStart } from "@/domain/rules/calendar";

export function getIstanbulDate(now = new Date()) {
  return dateKey(now);
}

export function shiftMealDate(date: string, { days = 0, months = 0 }: { days?: number; months?: number }) {
  const shifted = new Date(`${date}T12:00:00Z`);
  if (months !== 0) {
    const targetMonth = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + months, 1));
    const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    shifted.setUTCFullYear(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(shifted.getUTCDate(), lastDay));
  }
  return addDays(shifted.toISOString().slice(0, 10), days);
}

export function getMealDateRange(today = getIstanbulDate()) {
  return { minDate: shiftMealDate(today, { months: -1 }), maxDate: shiftMealDate(today, { days: 15 }) };
}

export function getMealWeekDates(date: string) {
  return weekDates(weekStart(date));
}

export function shiftMealWeek(date: string, direction: -1 | 1, minDate: string, maxDate: string) {
  const nextWeek = getMealWeekDates(shiftMealDate(date, { days: direction * 7 }));
  const currentWeekDay = getMealWeekDates(date).indexOf(date);
  const availableDates = nextWeek.filter((day) => day >= minDate && day <= maxDate);
  if (availableDates.length === 0) return null;
  return availableDates.reduce((closest, day) => {
    const closestOffset = Math.abs(nextWeek.indexOf(closest) - currentWeekDay);
    const dayOffset = Math.abs(nextWeek.indexOf(day) - currentWeekDay);
    return dayOffset < closestOffset ? day : closest;
  });
}

export function shiftMealCalendarMonth(month: string, amount: number) {
  return shiftMealDate(`${month}-01`, { months: amount }).slice(0, 7);
}

export function getMealCalendarDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDate = `${month}-01`;
  const firstWeekday = weekday(firstDate);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return [
    ...Array<string | null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => addDays(firstDate, index)),
  ];
}
