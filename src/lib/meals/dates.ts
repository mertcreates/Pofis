function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}

export function getIstanbulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function shiftMealDate(date: string, { days = 0, months = 0 }: { days?: number; months?: number }) {
  const shifted = parseDate(date);
  if (months !== 0) {
    const targetMonth = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + months, 1));
    const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    shifted.setUTCFullYear(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(shifted.getUTCDate(), lastDay));
  }
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateKey(shifted);
}

export function getMealDateRange(today = getIstanbulDate()) {
  return { minDate: shiftMealDate(today, { months: -1 }), maxDate: shiftMealDate(today, { days: 15 }) };
}

export function getMealWeekDates(date: string) {
  const monday = parseDate(date);
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(day.getUTCDate() + index);
    return dateKey(day);
  });
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
  const firstWeekday = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return [
    ...Array<string | null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => dateKey(new Date(Date.UTC(year, monthNumber - 1, index + 1)))),
  ];
}
