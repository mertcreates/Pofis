import { TIME_ZONE } from "../domain/rules/calendar";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
});

const dateWithYearFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDateLabel(value, today) {
  let formatter = dateFormatter;
  if (value.slice(0, 4) !== today.slice(0, 4)) {
    formatter = dateWithYearFormatter;
  }
  return formatter.format(new Date(`${value}T12:00:00Z`));
}

export function formatWeekLabel(from, to, today) {
  const options = { timeZone: TIME_ZONE, day: "numeric", month: "long" };
  if (
    from.slice(0, 4) !== today.slice(0, 4) ||
    to.slice(0, 4) !== today.slice(0, 4)
  )
    options.year = "numeric";
  return new Intl.DateTimeFormat("tr-TR", options).formatRange(
    new Date(`${from}T12:00:00Z`),
    new Date(`${to}T12:00:00Z`),
  );
}
