import { test, expect, spyOn } from "bun:test";
import { pofiNotesForWeek } from "./pofi-notes.js";
import {
  PdksClient,
  PDKS_ORIGIN,
  PASSAGES_PATH,
  parsePassages,
  readCallback,
  readForm,
} from "./pdks.js";

const name = "Fixture Person";

test("menüsüz yönetici girişi sabit hesap anahtarı üretir; aynı adlı hesapları ayırır", async () => {
  async function login(username, origin = PDKS_ORIGIN) {
    const calls = [];
    const client = new PdksClient({ origin, fetchImpl: async (url) => {
      calls.push(url.pathname);
      if (url.pathname.endsWith("/Giris.aspx"))
        return new Response('<form><input name="tbUserName"><input name="tbPassword"></form>');
      if (url.pathname.endsWith("/PizzyMain.aspx"))
        return new Response('<span id="ctl_RPPersonel_LblKisiAdiSoyadi">Same Name</span>');
      throw new Error("Unexpected request: menu must not be required");
    } });
    await client.login(username, "fixture-password");
    expect(calls).toEqual([
      "/PizzyKurumWeb/Giris.aspx", "/PizzyKurumWeb/Giris.aspx", "/PizzyKurumWeb/PizzyMain.aspx",
    ]);
    expect(JSON.stringify(client)).not.toContain(username.trim());
    expect(JSON.stringify(client)).not.toContain("fixture-password");
    return client.self.pofiKey;
  }
  const key = await login("manager-account");
  expect(key).toMatch(/^[a-f0-9]{64}$/);
  expect(await login("  manager-account  ")).toBe(key);
  expect(await login("another-account")).not.toBe(key);
  expect(await login("Manager-account")).not.toBe(key);
  expect(await login("manager-account", "https://fixture.example")).not.toBe(key);
  expect(pofiNotesForWeek("2026-10-16", await login("manager-account")))
    .toEqual(pofiNotesForWeek("2026-10-16", key));
});

test.each(["", "<span id=ctl_RPPersonel_LblKisiAdiSoyadi> </span>",
  "<span id=a_RPPersonel_LblKisiAdiSoyadi>A</span><span id=b_RPPersonel_LblKisiAdiSoyadi>B</span>"])(
  "bozuk profil girişe ve Pofi anahtarı üretimine izin vermez: %s", async (profile) => {
    const client = new PdksClient({ fetchImpl: async url => new Response(
      url.pathname.endsWith("/Giris.aspx") ? '<form><input name="tbUserName"><input name="tbPassword"></form>' : profile,
    ) });
    await expect(client.login("fixture-user", "fixture-password"))
      .rejects.toMatchObject({ code: "SOURCE_CHANGED", status: 502 });
    expect(client.self).toBeNull();
  },
);

test("kaynağın bozuk form ve yönlendirme adresleri uygulama hatası sayılmaz", async () => {
  try {
    readForm('<form action="http://[invalid"></form>', `${PDKS_ORIGIN}/PizzyKurumWeb/Giris.aspx`);
    throw new Error("Expected invalid source address");
  } catch (error) { expect(error).toMatchObject({ code: "SOURCE_CHANGED", status: 502 }); }
  const redirect = new PdksClient({ fetchImpl: async () => new Response("", { status: 302, headers: { location: "http://[invalid" } }) });
  await expect(redirect.request(PASSAGES_PATH)).rejects.toMatchObject({ code: "SOURCE_CHANGED", status: 502 });
});

test("istek öncesi uygulama hatası bağlantı hatasına çevrilmez", async () => {
  const original = new Error("fixture invariant");
  let calls = 0;
  const client = new PdksClient({ fetchImpl: async () => { calls++; return new Response("fixture"); } });
  client.onRequest = () => { throw original; };
  await expect(client.request("/PizzyKurumWeb/fixture")).rejects.toBe(original);
  expect(calls).toBe(0);
});

test("oturum iptali bağlantı hatasına çevrilmez; timeout bağlantı hatasıdır", async () => {
  const controller = new AbortController();
  const cancelled = new DOMException("fixture", "AbortError");
  controller.abort(cancelled);
  const client = new PdksClient({ fetchImpl: async () => { throw new Error("must not fetch"); } });
  await expect(client.request("/PizzyKurumWeb/fixture", undefined, { signal: controller.signal })).rejects.toBe(cancelled);
  const timedOut = new PdksClient({ fetchImpl: async () => { throw new DOMException("fixture", "TimeoutError"); } });
  await expect(timedOut.request("/PizzyKurumWeb/fixture")).rejects.toMatchObject({ code: "CONNECTION_FAILED", status: 502, details: { diagnostic: "PDKS yanıtı 30 saniye içinde gelmedi." } });
});

test.each(["bun", "node"])("%s DNS hatası kaynak erişim hatası olarak güvenli koduyla korunur", async (runtime) => {
  const client = new PdksClient({ fetchImpl: async () => {
    throw Object.assign(new TypeError("private transport message"), runtime === "bun"
      ? { code: "ENOTFOUND" } : { cause: { code: "ENOTFOUND" } });
  } });
  await expect(client.request("/PizzyKurumWeb/Giris.aspx")).rejects.toMatchObject({
    code: "CONNECTION_FAILED", status: 502,
    details: { method: "GET", path: "/PizzyKurumWeb/Giris.aspx", causeCode: "ENOTFOUND", diagnostic: "PDKS sunucu adresi çözümlenemedi." },
  });
});
const passageUrl = `${PDKS_ORIGIN}${PASSAGES_PATH}`;
const form = (content) =>
  `<form action=""><input name="__VIEWSTATE" value="fixture-viewstate">${content}</form>`;
const gridId = "ctl_ASPxRoundPanel1_CBPItems_gridListe";
const events = [
  { date: "2026-10-16", time: "08:00:00", direction: "in" },
  { date: "2026-10-16", time: "12:00:00", direction: "out" },
  { date: "2026-10-16", time: "13:00:00", direction: "in" },
];
function gridContent(rows, page = 1, pages = 1, total = rows.length, language = "en") {
  const body = rows
    .map((event, i) => {
      const [year, month, day] = event.date.split("-");
      return `<tr id="DXDataRow${i}"><td>${day}.${month}.${year} ${event.time}</td><td>${event.direction === "in" ? "Giriş" : "Çıkış"}</td></tr>`;
    })
    .join("");
  const pager = language === "tr"
    ? `\n Sayfa ${page} / ${pages} (${total} &#246;ğe)<a>1</a><a>2</a>\n`
    : `Page ${page} of ${pages} (${total} items)`;
  return `<table id="${gridId}_DXMainTable"><tr id="DXHeadersRow"><th>Tarih</th><th>İşlem Türü</th></tr>${body}</table><div id="${gridId}_DXPagerBottom">${pager}</div>`;
}
const wrapGrid = (content) =>
  `<table id="${gridId}"><tr><td>${content}</td></tr></table>`;
const dx = (html) => new Response(`/*DX*/({"result":${JSON.stringify(html)}})`);
const passageGrid = wrapGrid(gridContent(events));
const prefix = "ctl00$ContentPlaceHolder1$RpFiltrelemeKurallari$FLSonGecisler";
const passageForm = form(
  `<input name="ctl$deTarihBaslangic"><input name="ctl$deTarihBitis"><input name="${prefix}$cbTumIslemNoktalari"><input name="${prefix}$teBaslangic"><input name="${prefix}$teBitis"><input type="submit" name="${prefix}$btnGoruntule"><div id="ctl00_ContentPlaceHolder1_ASPxRoundPanel1_CBPItems"></div>`,
);

test("tam giriş ve kendi raporu WebForms/DevExpress sözleşmesini uygular; parola yalnız giriş isteğinde", async () => {
  const calls = [];
  const client = new PdksClient({
    fetchImpl: async (url, options) => {
      calls.push({ url: url.href, ...options });
      if (url.pathname.endsWith("/Giris.aspx"))
        return new Response(
          form('<input name="tbUserName"><input name="tbPassword">'),
          { headers: { "Set-Cookie": "source=fixture; Path=/" } },
        );
      if (url.pathname.endsWith("/PizzyMain.aspx"))
        return new Response(
          '<span id="ctl_RPPersonel_LblKisiAdiSoyadi">Fixture Person</span>',
        );
      if (url.pathname.endsWith("/TarihKisiBazliTumGecisler.aspx"))
        return new Response(
          options.method === "POST"
            ? `/*DX*/({"result":${JSON.stringify(passageGrid)}})`
            : passageForm,
        );
      throw new Error("Unexpected fixture request");
    },
  });
  await client.login("fixture-user", "fixture-password");
  expect(client.self.pofiKey).toMatch(/^[a-f0-9]{64}$/);
  const report = await client.report("self", "2026-10-12", "2026-10-18");
  expect(report.person).toEqual({ id: "self", name, unit: "", title: "" });
  expect(report.passages).toEqual(events);
  expect(report.passages.map((event) => event.direction)).toEqual([
    "in",
    "out",
    "in",
  ]);
  const login = calls.find(
    (call) => call.method === "POST" && call.url.includes("/Giris.aspx"),
  );
  expect(new URLSearchParams(login.body).get("__CALLBACKPARAM")).toBe(
    "c0:login",
  );
  expect(
    calls.filter((call) => call.body?.includes("fixture-password")),
  ).toHaveLength(1);
  expect(calls.map((call) => [new URL(call.url).pathname, call.method])).toEqual([
    ["/PizzyKurumWeb/Giris.aspx", "GET"],
    ["/PizzyKurumWeb/Giris.aspx", "POST"],
    ["/PizzyKurumWeb/PizzyMain.aspx", "GET"],
    [PASSAGES_PATH, "GET"],
    [PASSAGES_PATH, "POST"],
  ]);
  const reportPost = calls.find(
    (call) =>
      call.method === "POST" && call.url.includes("/TarihKisiBazliTumGecisler.aspx"),
  );
  expect(new URLSearchParams(reportPost.body).get("ctl$deTarihBaslangic")).toBe(
    "12.10.2026",
  );
  expect(reportPost.headers.Cookie).toBe("source=fixture");
  expect(JSON.stringify(report)).not.toContain("fixture-password");
  expect(JSON.stringify(client)).not.toContain("fixture-password");
  expect(JSON.stringify(client)).not.toContain("fixture-user");
  await expect(
    client.report("other-person", "2026-10-12", "2026-10-18"),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});

test("turnike kolonları, yönü, takvim tarihi ve callback kodlaması doğrulanır", () => {
  expect(() => parsePassages(form("<table></table>"), passageUrl)).toThrow();
  expect(() => parsePassages(form(passageGrid.replaceAll("İşlem Türü", "Bilinmeyen")), passageUrl)).toThrow();
  expect(() => parsePassages(form(passageGrid.replaceAll("Giriş", "Bilinmeyen")), passageUrl)).toThrow();
  expect(() =>
    parsePassages(
      form(passageGrid.replaceAll("16.10.2026", "30.02.2026")),
      `${PDKS_ORIGIN}${PASSAGES_PATH}`,
    ),
  ).toThrow();
  expect(() => readCallback("globalThis.untrusted = true")).toThrow();
});

test.each(["2015-03-29", "2016-03-27"])("İstanbul ileri saat geçişinde var olmayan kaynak saati reddedilir: %s", (date) => {
  const html = form(wrapGrid(gridContent([
    { date, time: "03:30:00", direction: "in" },
  ])));
  let error;
  try {
    parsePassages(html, passageUrl);
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({ code: "SOURCE_CHANGED", status: 502 });
});

test.each(["02:30:00", "04:00:00"])("İstanbul ileri saat geçişinin geçerli kaynak saati korunur: %s", (time) => {
  const passage = { date: "2015-03-29", time, direction: "in" };
  const html = form(wrapGrid(gridContent([passage])));
  expect(parsePassages(html, passageUrl).rows).toEqual([passage]);
});

test("yönlendirme kurum dışına çıkamaz ve HTTP 200 giriş sayfası oturum bitişidir", async () => {
  let calls = 0;
  const redirect = new PdksClient({
    fetchImpl: async () => {
      calls++;
      return new Response("", {
        status: 302,
        headers: { location: "https://example.com/leak" },
      });
    },
  });
  await expect(redirect.request(PASSAGES_PATH)).rejects.toMatchObject({
    code: "SOURCE_CHANGED",
  });
  expect(calls).toBe(1);
  const expired = new PdksClient({
    fetchImpl: async () => new Response('<input name="tbPassword">'),
  });
  await expect(expired.request(PASSAGES_PATH)).rejects.toMatchObject({
    code: "SESSION_EXPIRED",
    status: 401,
  });
});

function paginatedClient(fault, language = "en") {
  const calls = [];
  const all = [
    ...events,
    { date: "2026-10-16", time: "16:00:00", direction: "out" },
  ];
  const client = new PdksClient({
    fetchImpl: async (url, options) => {
      expect(url.pathname).toBe(PASSAGES_PATH);
      const fields = new URLSearchParams(options.body);
      calls.push(fields);
      if (options.method === "GET") return new Response(passageForm);
      if (fields.get("__CALLBACKPARAM") === "c0:List")
        return dx(wrapGrid(gridContent(all.slice(0, 2), 1, 2, 4, language)));
      expect(fields.get("__CALLBACKPARAM")).toContain("8|GOTOPAGE1|1");
      let rows = all.slice(2);
      if (fault === "short") rows = rows.slice(0, 1);
      if (fault === "range")
        rows = rows.map((row) => ({ ...row, date: "2026-10-19" }));
      let html = gridContent(
        rows,
        fault === "page" ? 1 : 2,
        fault === "pages" ? 3 : 2,
        fault === "total" ? 5 : 4,
        language,
      );
      if (fault === "pager") html = html.replace(/<div[^]*?<\/div>/, "");
      if (fault === "label") html = html.replace(/items|&#246;ğe/, "kayıt");
      return dx(html);
    },
  });
  client.self = { name, unit: "", title: "", pofiKey: "fixture" };
  return { client, calls, all };
}

test.each(["en", "tr"])("%s sayfalayıcıyla haftanın tüm kayıtları birleşir; filtreler korunur", async (language) => {
  const { client, calls, all } = paginatedClient(undefined, language);
  const report = await client.report("self", "2026-10-12", "2026-10-18");
  expect(report.passages).toEqual(all);
  expect(calls).toHaveLength(3);
  const fields = calls[1];
  expect(fields.get("ctl$deTarihBaslangic")).toBe("12.10.2026");
  expect(fields.get("ctl$deTarihBitis")).toBe("18.10.2026");
  expect(fields.get(`${prefix}$teBaslangic`)).toBe("00:00");
  expect(fields.get(`${prefix}$teBitis`)).toBe("23:59");
  expect(fields.get(`${prefix}$cbTumIslemNoktalari`)).toBe("C");
});

for (const language of ["en", "tr"]) {
  test.each(["page", "pages", "total", "short", "range", "pager", "label"])(
    `${language} sayfalama kusuru kısmi haftayı başarı olarak döndürmez: %s`,
    async (fault) => {
      const { client } = paginatedClient(fault, language);
      await expect(
        client.report("self", "2026-10-12", "2026-10-18"),
      ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
      expect(client.reportCache).toBeUndefined();
    },
  );
}

test("sayfalayıcı görünmeyen tek sayfalık rapor grid metaverisinden okunur", () => {
  const grid = gridContent(events).replace(/<div[^]*?<\/div>/, "");
  const script = `<script>var dxo = new ASPxClientGridView('${gridId}'); dxo.pageRowCount = 3; dxo.pageIndex = 0; dxo.pageCount = 1;</script>`;
  const result = parsePassages(form(wrapGrid(grid) + script), passageUrl);
  expect(result.rows).toEqual(events);
  expect(result.page).toEqual({ id: gridId, current: 1, pages: 1, total: null });
});

function cachedReportClient(clock, name = "Fixture Person") {
  const client = new PdksClient({
    clock,
    fetchImpl: async () => {
      throw new Error("No network in cache test");
    },
  });
  let loads = 0;
  client.personalProfile = async () => ({
    name, unit: "", title: "", pofiKey: name,
  });
  client.personalPassages = async () => {
    loads++;
    return structuredClone(events);
  };
  return { client, loads: () => loads };
}

test("aynı rapor 20 saniye önbellekten gelir; eşzamanlı çağrılar birleşir ve fetchedAt korunur", async () => {
  let now = Date.parse("2026-10-16T12:00:00Z");
  const { client, loads } = cachedReportClient(() => now);
  const reports = await Promise.all(
    Array.from({ length: 20 }, () =>
      client.report("self", "2026-10-12", "2026-10-18"),
    ),
  );
  expect(loads()).toBe(1);
  expect(reports[0].fetchedAt).toBe("2026-10-16T12:00:00.000Z");
  reports[0].person.name = "modified";
  reports[0].passages.length = 0;
  now += 19_999;
  const cached = await client.report("self", "2026-10-12", "2026-10-18");
  expect(loads()).toBe(1);
  expect(cached.person.name).toBe("Fixture Person");
  expect(cached.passages).toHaveLength(3);
  expect(cached.fetchedAt).toBe("2026-10-16T12:00:00.000Z");
  now++;
  expect(
    (await client.report("self", "2026-10-12", "2026-10-18")).fetchedAt,
  ).toBe("2026-10-16T12:00:20.000Z");
  expect(loads()).toBe(2);
});

test("önbellek oturum ve tarih aralığına aittir; İstanbul günü değişince yeniden alınır", async () => {
  let now = Date.parse("2026-10-18T20:59:55Z");
  const a = cachedReportClient(() => now, "Alice");
  const b = cachedReportClient(() => now, "Bob");
  const first = await a.client.report("self", "2026-10-12", "2026-10-18");
  const other = await b.client.report("self", "2026-10-12", "2026-10-18");
  expect(first.person.name).toBe("Alice");
  expect(other.person.name).toBe("Bob");
  expect(a.loads()).toBe(1);
  expect(b.loads()).toBe(1);
  now += 6_000;
  await a.client.report("self", "2026-10-12", "2026-10-18");
  expect(a.loads()).toBe(2);
  // A distinct, valid range must load independently.
  await a.client.report("self", "2026-10-15", "2026-10-17");
  expect(a.loads()).toBe(3);
  await expect(
    a.client.report("other-person", "2026-10-15", "2026-10-17"),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});

test("başarısız yenileme önbellek başarısı gibi sunulmaz; sonraki deneme kaynağı tekrar çağırır", async () => {
  const { client } = cachedReportClient(Date.now);
  let attempts = 0;
  const load = client.personalPassages;
  client.personalPassages = async (...args) => {
    attempts++;
    if (attempts === 1) throw new Error("fixture failure");
    return load(...args);
  };
  await expect(
    client.report("self", "2026-10-12", "2026-10-18"),
  ).rejects.toThrow("fixture failure");
  expect(
    (await client.report("self", "2026-10-12", "2026-10-18")).passages,
  ).toHaveLength(3);
  expect(attempts).toBe(2);
});

test("giriş hatası ham kaynak yanıtındaki veya bağlantı hatasındaki kimlik bilgilerini loglara ve tanıya taşımaz", async () => {
  const logs = [];
  const logger = spyOn(console, "error").mockImplementation((...args) =>
    logs.push(args),
  );
  try {
    for (const fetchImpl of [
      async (_url, options) =>
        options.method === "POST"
          ? new Response("fixture-user fixture-password", { status: 500 })
          : new Response(
              form('<input name="tbUserName"><input name="tbPassword">'),
            ),
      async () => {
        throw new Error("fixture-user fixture-password");
      },
    ]) {
      const client = new PdksClient({ fetchImpl });
      let received;
      try {
        await client.login("fixture-user", "fixture-password");
      } catch (error) {
        received = error;
      }
      expect(received).toBeDefined();
      expect(JSON.stringify(received)).not.toContain("fixture-password");
      expect(JSON.stringify(received)).not.toContain("fixture-user");
      expect(JSON.stringify(client)).not.toContain("fixture-password");
    }
    expect(JSON.stringify(logs)).not.toContain("fixture-password");
    expect(JSON.stringify(logs)).not.toContain("fixture-user");
  } finally {
    logger.mockRestore();
  }
});
