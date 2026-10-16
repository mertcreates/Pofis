async (page) => {
  const endpoint = "http://127.0.0.1:3000/api/session";
  const request = (origin) =>
    page.request.post(endpoint, {
      headers: {
        Origin: origin,
        "Sec-Fetch-Site": "cross-site",
        "Content-Type": "application/json",
      },
      data: {},
    });
  const institution = await request("https://pofis.example.internal");
  const other = await request("https://other.example");
  const migration = await page.request.get(endpoint, {
    headers: {
      Cookie: "pdks_local_session=" + "a".repeat(64),
      "X-Forwarded-Proto": "https",
    },
  });
  const cookie = migration.headers()["set-cookie"] || "";
  const direct = await page.request.get(endpoint, {
    headers: { Cookie: "pdks_local_session=" + "a".repeat(64) },
  });
  const headers = {
    Origin: "https://other.example",
    "Sec-Fetch-Site": "cross-site",
  };
  const heartbeat = await page.request.post(`${endpoint}/heartbeat`, { headers });
  const logout = await page.request.delete(endpoint, { headers });
  const result = {
    institutionOrigin: institution.status(),
    otherOrigin: other.status(),
    heartbeat: heartbeat.status(),
    logout: logout.status(),
    directHttpCookieSecure: (direct.headers()["set-cookie"] || "").includes(
      "Secure",
    ),
    secureCookie: cookie.includes("Secure"),
    httpOnlyCookie: cookie.includes("HttpOnly"),
  };
  if (
    result.institutionOrigin !== 400 ||
    result.otherOrigin !== 400 ||
    result.heartbeat !== 401 ||
    result.logout !== 200 ||
    result.directHttpCookieSecure ||
    !result.secureCookie ||
    !result.httpOnlyCookie
  )
    throw new Error(JSON.stringify(result));
  return { passed: true, ...result, noSourceRequests: true };
}
