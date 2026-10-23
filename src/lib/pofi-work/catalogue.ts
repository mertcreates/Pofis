import { isDateKey } from "@/domain/rules/calendar";
import { ui } from "../ui-text.js";
import type { PofiWorkCategory, PofiWorkContent, PofiWorkDay, PofiWorkEntry } from "./types";

const categories = ["window", "break", "company"] as const;
const linkedInterval = 7;
const minimumPoolSize = 10;
const modulo = (value: number, size: number) => ((value % size) + size) % size;

export function createPofiWorkCatalogue(content: PofiWorkContent) {
  const texts = { window: new Set<string>(), break: new Set<string>(), company: new Set<string>() };
  function validateId(id: string, ids: Set<string>) {
    if (typeof id !== "string" || !/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) {
      throw new Error(ui.internalErrors.invalidPofiWorkDay(id));
    }
    ids.add(id);
  }
  function validateText(category: PofiWorkCategory, text: string, id: string) {
    if (typeof text !== "string" || !text.trim() || texts[category].has(text.trim())) {
      throw new Error(ui.internalErrors.invalidPofiWorkDay(`${category}:${id}`));
    }
    texts[category].add(text.trim());
  }
  function createPool(category: PofiWorkCategory) {
    const source = content.pools[category];
    if (!Array.isArray(source) || source.length < minimumPoolSize) {
      throw new Error(ui.internalErrors.pofiWorkPoolTooSmall);
    }
    const ids = new Set<string>();
    return source.map(entry => {
      validateId(entry.id, ids);
      validateText(category, entry.text, entry.id);
      return Object.freeze({ ...entry });
    });
  }
  const pools = { window: createPool("window"), break: createPool("break"), company: createPool("company") };
  if (content.linked.length === 1) throw new Error(ui.internalErrors.pofiWorkLinkedTooSmall);
  const linkedIds = new Set<string>();
  const linked = content.linked.map(day => {
    validateId(day.id, linkedIds);
    for (const category of categories) validateText(category, day[category], day.id);
    return Object.freeze({ ...day, id: `linked:${day.id}` });
  });
  function pick(pool: readonly PofiWorkEntry[], position: number) {
    return pool[modulo(position, pool.length)];
  }

  return {
    forDate(date: string): PofiWorkDay {
      if (!isDateKey(date)) throw new Error(ui.internalErrors.invalidPofiWorkDate);
      const day = Date.parse(`${date}T00:00:00Z`) / 86_400_000;
      if (linked.length && modulo(day, linkedInterval) === 0) {
        return linked[modulo(Math.floor(day / linkedInterval), linked.length)];
      }
      // Shift pairings after each window cycle and triples after each pair cycle.
      // Over seven days these shifts add at most two steps, below the minimum pool size.
      const pairCycle = Math.floor(day / pools.window.length);
      const tripleCycle = Math.floor(day / (pools.window.length * pools.break.length));
      const window = pick(pools.window, day);
      const pause = pick(pools.break, day + pairCycle);
      const company = pick(pools.company, day + pairCycle + tripleCycle);
      return Object.freeze({
        id: `mixed:${window.id}:${pause.id}:${company.id}`,
        window: window.text, break: pause.text, company: company.text,
      });
    },
  };
}
