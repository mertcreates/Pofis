import { SOURCE_POLICY } from "../domain/rules/source-policy";
import { isOwnReport } from "../domain/rules/report-access";
import { ui } from "../lib/ui-text.js";
import { load } from "cheerio";
import { CookieJar } from "tough-cookie";
import { dateKey, isDateKey, secondsOf } from "../domain/rules/calendar";

export const PDKS_ORIGIN = SOURCE_POLICY.origin;
export const PASSAGES_PATH =
  "/PizzyKurumWeb/KurumIdare/Raporlar/GecisRaporlari/GenelRaporlar/TarihKisiBazliTumGecisler.aspx";
const LOGIN_PATH = "/PizzyKurumWeb/Giris.aspx";
const PROFILE_PATH = "/PizzyKurumWeb/PizzyMain.aspx";
const REPORT_RECOVERY_COOLDOWN_MS = SOURCE_POLICY.recoveryCooldownMs;
const PASSAGES_GRID = "ASPxRoundPanel1_CBPItems_gridListe";

export class PdksError extends Error {
  constructor(message, code = "SOURCE_ERROR", status = 502, details = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isLoginResponse(html, url) {
  const isLoginUrl = (target) =>
    target.origin === url.origin &&
    target.pathname.toLowerCase() === LOGIN_PATH.toLowerCase();
  if (isLoginUrl(url)) return true;
  const $ = load(html);
  if ($('input[name="tbPassword"], input[name$="$tbPassword"]').length)
    return true;
  // Expired WebForms sessions return HTTP 200 with a standalone frame redirect.
  return $("script:not([src])")
    .toArray()
    .some((script) => {
      const match =
        /^\s*(?:window\.)?(?:(?:parent|top|self)\.)?location(?:\.href)?\s*=\s*(['"])([^'"]+)\1\s*;?\s*$/.exec(
          $(script).text(),
        );
      if (!match) return false;
      try {
        return isLoginUrl(new URL(match[2], url));
      } catch {
        return false;
      }
    });
}

export function readForm(html, url) {
  const $ = load(html);
  const form = $("form").first();
  if (!form.length)
    throw new PdksError(ui.sourceErrors.formUnreadable, "SOURCE_CHANGED");
  const fields = new URLSearchParams();
  form.find("input[name], select[name], textarea[name]").each((_, element) => {
    const field = $(element);
    const type = (field.attr("type") || "").toLowerCase();
    if (
      field.is("[disabled]") ||
      ["submit", "button", "image", "file", "reset"].includes(type)
    )
      return;
    if (["checkbox", "radio"].includes(type) && !field.is("[checked]")) return;
    const value = field.val();
    for (const item of Array.isArray(value) ? value : [value ?? ""])
      fields.append(field.attr("name"), item);
  });
  // DevExpress fills hidden field values on submit; the original HTML leaves them empty.
  const scripts = $("script:not([src])")
    .map((_, script) => $(script).text())
    .get();
  for (const [name, value] of fields) {
    if (!name.endsWith("$I") || value) continue;
    const id = name.slice(0, -2).replaceAll("$", "_");
    const script = scripts.find((text) =>
      text.includes(`new ASPxClientHiddenField('${id}')`),
    );
    if (!script) continue;
    const mode =
      /dxo\.properties\s*=\s*\{\s*'dxpmode'\s*:\s*(\d+)\s*\}\s*;/.exec(
        script,
      )?.[1];
    if (mode !== undefined && /'dxpmode'\s*:\s*18/.test(script))
      fields.set(name, `12|#|mode|18|${mode.length}|${mode}#`);
    else if (!/dxo\.properties\s*=/.test(script)) fields.set(name, "12|#|#");
    else
      throw new PdksError(
        ui.sourceErrors.formStateUnreadable,
        "SOURCE_CHANGED",
      );
  }
  return { $, fields, url: new URL(form.attr("action") || url, url).href };
}

// Decode only a DevExpress string literal; never execute source scripts.
export function readCallback(body) {
  const prefix = /^(\d+)\|/.exec(body);
  let validation;
  if (prefix) {
    const length = Number(prefix[1]);
    validation = body.slice(prefix[0].length, prefix[0].length + length);
    body = body.slice(prefix[0].length + length);
  }
  const match = /^\/\*DX\*\/\(\{[^]*?['"]result['"]\s*:\s*(['"])/.exec(body);
  if (!match)
    throw new PdksError(
      ui.sourceErrors.callbackResponseUnreadable,
      "SOURCE_CHANGED",
    );
  const quote = match[1];
  let result = "";
  for (let i = match[0].length; i < body.length; i++) {
    const char = body[i];
    if (char === quote) return { html: result, validation };
    if (char !== "\\") {
      result += char;
      continue;
    }
    const next = body[++i];
    const escapes = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "\\": "\\",
      "'": "'",
      '"': '"',
      "/": "/",
      "-": "-",
    };
    if (Object.hasOwn(escapes, next)) result += escapes[next];
    else if (next === "u" || next === "x") {
      const count = next === "u" ? 4 : 2;
      const hex = body.slice(i + 1, i + 1 + count);
      if (!new RegExp(`^[0-9a-f]{${count}}$`, "i").test(hex))
        throw new PdksError(
          ui.sourceErrors.callbackEncodingUnreadable,
          "SOURCE_CHANGED",
        );
      result += String.fromCharCode(parseInt(hex, 16));
      i += count;
    } else
      throw new PdksError(
        ui.sourceErrors.callbackEncodingUnreadable,
        "SOURCE_CHANGED",
      );
  }
  throw new PdksError(
    ui.sourceErrors.callbackResponseIncomplete,
    "SOURCE_CHANGED",
  );
}

export async function callback(client, form, id, argument, grid = false) {
  const fields = new URLSearchParams(form.fields);
  fields.set("__EVENTTARGET", "");
  fields.set("__EVENTARGUMENT", "");
  fields.set("__CALLBACKID", id.replaceAll("_", "$"));
  fields.set("__CALLBACKPARAM", `c0:${argument}`);
  const response = await client.request(form.url, fields);
  const result = readCallback(response.html);
  const $ = form.$;
  const target = $(`[id="${id}"]`);
  if (target.length !== 1)
    throw new PdksError(ui.sourceErrors.callbackAreaMissing, "SOURCE_CHANGED");
  for (const [name, value] of form.fields)
    $("input[name]")
      .filter((_, el) => $(el).attr("name") === name)
      .attr("value", value);
  if (grid)
    target
      .children("tbody")
      .children("tr")
      .first()
      .children("td")
      .first()
      .html(result.html);
  else target.html(result.html);
  if (result.validation)
    $('input[name="__EVENTVALIDATION"]').attr("value", result.validation);
  return readForm($.html(), response.url);
}

export async function callbackPage(client, form, id, index) {
  const name = id.replaceAll("_", "$");
  const command = `8|GOTOPAGE${String(index).length}|${index}`;
  const arg = (key, value) => (value ? `${key}|${value.length};${value};` : "");
  const argument =
    arg("SR", form.fields.get(`${name}$DXSelInput`)) +
    arg("KV", form.fields.get(`${name}$DXKVInput`)) +
    arg("FR", form.fields.get(`${name}$DXFocusedRowInput`)) +
    arg("GB", command);
  return callback(client, form, id, argument, true);
}

export function tableFor($, suffix) {
  const table = $(`table[id$="${suffix}_DXMainTable"]`).first();
  if (!table.length)
    throw new PdksError(
      ui.sourceErrors.reportStructureChanged,
      "SOURCE_CHANGED",
    );
  return table;
}

export function headersFor($, table) {
  return table
    .find('tr[id*="DXHeadersRow"]')
    .first()
    .children("td, th")
    .map((_, cell) => $(cell).text().trim())
    .get();
}

const normalize = (value) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export function column(headers, names) {
  const index = headers.findIndex((header) =>
    names.includes(normalize(header)),
  );
  if (index < 0)
    throw new PdksError(ui.sourceErrors.reportColumnMissing, "SOURCE_CHANGED");
  return index;
}

export function parsePassages(html, url) {
  const form = readForm(html, url);
  const { $ } = form;
  const table = tableFor($, PASSAGES_GRID);
  const headers = headersFor($, table);
  const dateIndex = column(headers, ["tarih"]);
  const directionIndex = column(headers, ["islemturu"]);
  const rows = table
    .find('tr[id*="DXDataRow"]')
    .map((_, row) => {
      const cells = $(row).children("td");
      const match = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(
        cells.eq(dateIndex).text().trim(),
      );
      if (!match)
        throw new PdksError(
          ui.sourceErrors.reportDateUnreadable,
          "SOURCE_CHANGED",
        );
      const [, day, month, year, time] = match;
      const date = `${year}-${month}-${day}`;
      if (!isDateKey(date) || secondsOf(time) === null)
        throw new PdksError(
          ui.sourceErrors.reportDateUnreadable,
          "SOURCE_CHANGED",
        );
      const sourceDirection = normalize(cells.eq(directionIndex).text().trim());
      let direction;
      if (sourceDirection === "giris") direction = "in";
      else if (sourceDirection === "cikis") direction = "out";
      else
        throw new PdksError(
          ui.sourceErrors.passageDirectionUnreadable,
          "SOURCE_CHANGED",
        );
      return { date, time, direction };
    })
    .get();

  const id = table.attr("id").replace(/_DXMainTable$/, "");
  const pager = $(
    `[id="${id}_DXPagerBottom"], [id="${id}_DXPagerTop"]`,
  ).first();
  if (pager.length) {
    const match = /Page\s+(\d+)\s+of\s+(\d+)\s*\((\d+)\s+items\)/i.exec(
      pager.text(),
    );
    if (!match)
      throw new PdksError(
        ui.sourceErrors.reportPagesIncomplete,
        "SOURCE_CHANGED",
      );
    const current = Number(match[1]);
    const pages = Number(match[2]);
    const total = Number(match[3]);
    if (current < 1 || pages < current || total < rows.length)
      throw new PdksError(
        ui.sourceErrors.reportPagesIncomplete,
        "SOURCE_CHANGED",
      );
    return { rows, page: { id, current, pages, total }, form };
  }
  const script = $("script:not([src])")
    .map((_, node) => $(node).text())
    .get()
    .find((text) => text.includes(`new ASPxClientGridView('${id}')`));
  const readNumber = (name) => {
    const match = new RegExp(`dxo\\.${name}\\s*=\\s*(\\d+)\\s*;`).exec(
      script || "",
    );
    if (!match)
      throw new PdksError(
        ui.sourceErrors.reportPagesIncomplete,
        "SOURCE_CHANGED",
      );
    return Number(match[1]);
  };
  const pageIndex = readNumber("pageIndex");
  const pages = Math.max(1, readNumber("pageCount"));
  if (readNumber("pageRowCount") !== rows.length || pageIndex >= pages)
    throw new PdksError(
      ui.sourceErrors.reportPagesIncomplete,
      "SOURCE_CHANGED",
    );
  return {
    rows,
    page: { id, current: pageIndex + 1, pages, total: null },
    form,
  };
}

function dateFields(form, from, to) {
  const fields = new URLSearchParams(form.fields);
  for (const [suffix, iso] of [
    ["deTarihBaslangic", from],
    ["deTarihBitis", to],
  ]) {
    const name = [...fields.keys()].find((key) => key.endsWith(`$${suffix}`));
    if (!name)
      throw new PdksError(
        ui.sourceErrors.dateFilterUnreadable,
        "SOURCE_CHANGED",
      );
    const [year, month, day] = iso.split("-");
    fields.set(name, `${day}.${month}.${year}`);
    fields.set(
      `${name.replaceAll("$", "_")}_Raw`,
      String(Date.UTC(Number(year), Number(month) - 1, Number(day))),
    );
  }
  return fields;
}

export class PdksClient {
  constructor({
    origin = PDKS_ORIGIN,
    fetchImpl = fetch,
    clock = Date.now,
  } = {}) {
    this.origin = origin;
    this.fetchImpl = fetchImpl;
    this.clock = clock;
    this.jar = new CookieJar();
    this.self = null;
    this.queue = Promise.resolve();
    this.lastRequestAt = Date.now();
  }

  run(action) {
    const result = this.queue
      .then(action)
      .finally(() => this.onStateChange?.());
    this.queue = result.catch(() => {});
    return result;
  }

  async request(path, fields, { signal, probeSession = true } = {}) {
    if (this.signal)
      signal = signal ? AbortSignal.any([signal, this.signal]) : this.signal;
    let url = new URL(path, this.origin);
    const loginRequest = url.pathname.toLowerCase().endsWith("/giris.aspx");
    const sessionCheck =
      url.pathname.toLowerCase() === PROFILE_PATH.toLowerCase();
    let method = fields ? "POST" : "GET";
    let body = fields?.toString();
    for (let hop = 0; hop < SOURCE_POLICY.maxRedirectHops; hop++) {
      if (
        url.origin !== this.origin ||
        !url.pathname.toLowerCase().startsWith("/pizzykurumweb/")
      )
        throw new PdksError(
          ui.sourceErrors.unexpectedRedirect,
          "SOURCE_CHANGED",
        );
      let response;
      let html;
      try {
        const cookie = await this.jar.getCookieString(url.href);
        signal?.throwIfAborted();
        this.lastRequestAt = Date.now();
        this.onRequest?.();
        response = await this.fetchImpl(url, {
          method,
          body,
          redirect: "manual",
          signal: signal
            ? AbortSignal.any([
                signal,
                AbortSignal.timeout(SOURCE_POLICY.requestTimeoutMs),
              ])
            : AbortSignal.timeout(SOURCE_POLICY.requestTimeoutMs),
          headers: {
            Cookie: cookie,
            ...(fields && {
              "Content-Type": "application/x-www-form-urlencoded",
              Origin: this.origin,
              Referer: url.href,
            }),
          },
        });
        html = await response.text();
      } catch (error) {
        throw new PdksError(
          ui.sourceErrors.connectionFailed,
          "CONNECTION_FAILED",
          502,
          {
            method,
            path: url.pathname,
            diagnostic:
              error.name === "TimeoutError"
                ? ui.sourceErrors.connectionTimeout
                : ui.sourceErrors.connectionUnavailable,
            causeCode: [
              "ENOTFOUND",
              "ECONNREFUSED",
              "ECONNRESET",
              "ETIMEDOUT",
              "CERT_HAS_EXPIRED",
              "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
            ].includes(error.cause?.code)
              ? error.cause.code
              : undefined,
          },
        );
      }
      const cookies = response.headers.getSetCookie();
      for (const cookie of cookies) await this.jar.setCookie(cookie, url.href);
      if (cookies.length) await this.onStateChange?.();
      if (!loginRequest && response.status === 401)
        throw new PdksError(
          ui.sourceErrors.sessionExpired,
          "SESSION_EXPIRED",
          401,
          { sourceStatus: response.status, method, path: url.pathname },
        );
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location)
          throw new PdksError(
            ui.sourceErrors.redirectAddressMissing,
            "SOURCE_CHANGED",
          );
        url = new URL(location, url);
        if ([301, 302, 303].includes(response.status)) {
          method = "GET";
          body = undefined;
        }
        continue;
      }

      if (!loginRequest && isLoginResponse(html, url))
        throw new PdksError(
          ui.sourceErrors.sessionExpired,
          "SESSION_EXPIRED",
          401,
          { sourceStatus: response.status, method, path: url.pathname },
        );
      if (!response.ok) {
        const diagnostic =
          /Invalid postback or callback argument|Validation of viewstate MAC failed|Invalid viewstate|Input string was not in a correct format|ArgumentOutOfRangeException|ArgumentException|FormatException|NullReferenceException/i.exec(
            html,
          )?.[0] || "unclassified";
        let stage = "open-report";
        if (loginRequest) stage = "login";
        if (sessionCheck) stage = "check-session";
        if (fields && !loginRequest) {
          stage = this.postbackStage(fields);
        }
        const details = {
          sourceStatus: response.status,
          stage,
          method,
          path: url.pathname,
          diagnostic:
            diagnostic === "unclassified"
              ? ui.sourceErrors.unknownException
              : diagnostic,
        };
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter !== null) {
          const delay = /^\d+$/.test(retryAfter)
            ? Number(retryAfter) * 1000
            : Date.parse(retryAfter) - Date.now();
          details.retryAfterMs = Number.isFinite(delay)
            ? Math.max(0, delay)
            : 0;
        }
        if (
          probeSession &&
          !loginRequest &&
          !sessionCheck &&
          response.status === 500
        ) {
          try {
            details.sessionCheckStatus = await this.checkSession(signal);
            details.sessionCheck = "active";
          } catch (error) {
            details.sessionCheck = "unverified";
            details.sessionCheckCode = error.code || error.name;
            if (error.details?.sourceStatus)
              details.sessionCheckStatus = error.details.sourceStatus;
            if (error instanceof PdksError && error.code === "SESSION_EXPIRED")
              throw new PdksError(
                ui.sourceErrors.sessionExpired,
                "SESSION_EXPIRED",
                401,
                {
                  ...details,
                  sessionCheck: "expired",
                  diagnostic: ui.sourceErrors.sessionExpired,
                },
              );
            // An inconclusive check preserves the original report failure.
          }
        }
        console.error(
          "PDKS upstream failure:",
          stage,
          response.status,
          diagnostic,
          { ...details },
        );
        throw new PdksError(
          ui.sourceErrors.httpFailure(response.status),
          "SOURCE_ERROR",
          502,
          details,
        );
      }
      return { html, url: url.href, status: response.status };
    }
    throw new PdksError(ui.sourceErrors.redirectFailed, "SOURCE_CHANGED");
  }

  async checkSession(signal) {
    const page = await this.request(PROFILE_PATH, undefined, { signal });
    const $ = load(page.html);
    const names = $('span[id$="_RPPersonel_LblKisiAdiSoyadi"]');
    if (
      names.length !== 1 ||
      !this.self?.name ||
      names.text().trim() !== this.self.name
    )
      throw new PdksError(
        ui.sourceErrors.selfReportUnverified,
        "SOURCE_CHANGED",
        502,
        { sourceStatus: page.status },
      );
    return page.status;
  }

  async openReport(path) {
    try {
      return await this.request(path);
    } catch (error) {
      if (
        !(error instanceof PdksError) ||
        error.code !== "SOURCE_ERROR" ||
        error.details.sourceStatus !== 500 ||
        error.details.method !== "GET" ||
        error.details.sessionCheck !== "active" ||
        error.details.retryAfterMs !== undefined ||
        Date.now() < (this.reportRecoveryAfter || 0)
      )
        throw error;
      this.reportRecoveryAfter = Date.now() + REPORT_RECOVERY_COOLDOWN_MS;
      try {
        return await this.request(path, undefined, { probeSession: false });
      } catch (retryError) {
        if (retryError instanceof PdksError) {
          retryError.details.recoveryAttempts = 1;
          if (retryError.code !== "SESSION_EXPIRED") {
            retryError.details.sessionCheck = error.details.sessionCheck;
            retryError.details.sessionCheckStatus =
              error.details.sessionCheckStatus;
          }
        }
        throw retryError;
      }
    }
  }

  async verify() {
    try {
      await this.personalProfile();
    } catch (error) {
      if (error instanceof PdksError && error.code === "SESSION_EXPIRED")
        throw new PdksError(ui.sourceErrors.authFailed, "AUTH_FAILED", 401);
      throw error;
    }
  }

  async login(username, password) {
    const page = await this.request(LOGIN_PATH);
    const form = readForm(page.html, page.url);
    form.fields.set("tbUserName", username);
    form.fields.set("tbPassword", password);
    form.fields.set("__CALLBACKID", "CbpLogin");
    form.fields.set("__CALLBACKPARAM", "c0:login");
    try {
      await this.request(form.url, form.fields);
    } finally {
      form.fields.delete("tbUserName");
      form.fields.delete("tbPassword");
      username = undefined;
      password = undefined;
    }
    await this.verify();
  }

  async personalProfile() {
    if (this.self?.sourceId) return this.self;
    const main = await this.request(PROFILE_PATH);
    const menu = await this.request("/PizzyKurumWeb/PizzyLeft.aspx");
    const $main = load(main.html);
    const names = $main('span[id$="_RPPersonel_LblKisiAdiSoyadi"]');
    const name = names.text().trim();
    const $menu = load(menu.html);
    const links = $menu("a[href]")
      .map((_, link) => new URL($menu(link).attr("href"), menu.url))
      .get()
      .filter((url) => url.searchParams.get("KisiID"));
    if (
      names.length !== 1 ||
      !name ||
      links.length !== 1 ||
      links[0].origin !== this.origin ||
      !links[0].pathname.toLowerCase().startsWith("/pizzykurumweb/")
    )
      throw new PdksError(
        ui.sourceErrors.selfReportUnverified,
        "SOURCE_CHANGED",
      );
    this.self = {
      id: "self",
      name,
      unit: "",
      title: "",
      sourceId: links[0].searchParams.get("KisiID"),
    };
    return this.self;
  }

  postbackStage(fields) {
    const argument = fields.get("__CALLBACKPARAM");
    if (argument === "c0:List")
      return "report-submit";
    if (argument?.includes("8|GOTOPAGE"))
      return "pagination";
    return "postback";
  }

  report(id, from, to) {
    if (!isOwnReport(id))
      return Promise.reject(
        new PdksError(ui.apiErrors.invalidPerson, "INVALID_INPUT", 400),
      );
    const now = this.clock();
    const key = JSON.stringify([id, from, to, dateKey(now)]);
    if (this.reportCache?.key === key && this.reportCache.expiresAt > now)
      return Promise.resolve(structuredClone(this.reportCache.value));
    const pending = (this.pendingReports ||= new Map());
    if (pending.has(key))
      return pending.get(key).then((value) => structuredClone(value));
    const result = this.run(async () => {
      const person = await this.personalProfile();
      const passages = await this.personalPassages(from, to);
      return {
        person: {
          id,
          name: person.name,
          unit: person.unit,
          title: person.title,
        },
        from,
        to,
        passages,
        fetchedAt: new Date(this.clock()).toISOString(),
      };
    })
      .then((value) => {
        if (!this.signal?.aborted)
          this.reportCache = {
            key,
            expiresAt: this.clock() + SOURCE_POLICY.reportCacheMs,
            value,
          };
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, result);
    return result.then((value) => structuredClone(value));
  }

  async personalPassages(from, to) {
    const page = await this.openReport(PASSAGES_PATH);
    const form = readForm(page.html, page.url);
    if (
      new URL(form.url).pathname !==
      new URL(PASSAGES_PATH, this.origin).pathname
    )
      throw new PdksError(
        ui.sourceErrors.reportStructureChanged,
        "SOURCE_CHANGED",
      );
    const fields = dateFields(form, from, to);
    const prefix =
      "ctl00$ContentPlaceHolder1$RpFiltrelemeKurallari$FLSonGecisler";
    const button = form.$(`input[name="${prefix}$btnGoruntule"]`).attr("name");
    if (!button || !fields.has(`${prefix}$cbTumIslemNoktalari`))
      throw new PdksError(
        ui.sourceErrors.reportButtonUnreadable,
        "SOURCE_CHANGED",
      );
    for (const [control, value, raw] of [
      ["teBaslangic", "00:00", Date.UTC(1900, 0, 1)],
      ["teBitis", "23:59", Date.UTC(1900, 0, 1, 23, 59)],
    ]) {
      const name = `${prefix}$${control}`;
      if (!fields.has(name))
        throw new PdksError(
          ui.sourceErrors.dateFilterUnreadable,
          "SOURCE_CHANGED",
        );
      fields.set(name, value);
      fields.set(`${name.replaceAll("$", "_")}_Raw`, String(raw));
    }
    fields.set(`${prefix}$cbTumIslemNoktalari`, "C");
    const panel = "ctl00_ContentPlaceHolder1_ASPxRoundPanel1_CBPItems";
    let current = await callback(this, { ...form, fields }, panel, "List");
    let result = parsePassages(current.$.html(), current.url);
    if (result.page.current !== 1)
      throw new PdksError(
        ui.sourceErrors.reportNextPageUnreadable,
        "SOURCE_CHANGED",
        502,
        {
          stage: "passages-list",
          diagnostic: `Beklenen ilk sayfa 1; gelen sayfa ${result.page.current}/${result.page.pages}.`,
        },
      );
    const rows = [...result.rows];
    const count = result.page.pages;
    const gridId = result.page.id;
    const total = result.page.total;
    if (count > SOURCE_POLICY.maxPages)
      throw new PdksError(ui.sourceErrors.tooManyRows, "TOO_MANY_RESULTS", 400);
    for (let index = 1; index < count; index++) {
      current = await callbackPage(this, result.form, result.page.id, index);
      result = parsePassages(current.$.html(), current.url);
      if (
        result.page.current !== index + 1 ||
        result.page.pages !== count ||
        result.page.id !== gridId ||
        result.page.total !== total
      )
        throw new PdksError(
          ui.sourceErrors.reportNextPageUnreadable,
          "SOURCE_CHANGED",
          502,
          {
            stage: "passages-pagination",
            diagnostic: `Beklenen sayfa ${index + 1}/${count}; gelen sayfa ${result.page.current}/${result.page.pages}.`,
          },
        );
      rows.push(...result.rows);
    }
    if (result.page.total !== null && rows.length !== result.page.total)
      throw new PdksError(
        ui.sourceErrors.reportPagesIncomplete,
        "SOURCE_CHANGED",
      );
    if (rows.some((row) => row.date < from || row.date > to))
      throw new PdksError(
        ui.sourceErrors.dateRangeNotApplied,
        "SOURCE_CHANGED",
      );
    return rows.sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
    );
  }
}
