export const SOURCE_POLICY = Object.freeze({
  origin: "https://pdks.trt.net.tr",
  requestTimeoutMs: 30_000,
  reportCacheMs: 20_000,
  recoveryCooldownMs: 60_000,
  maxPages: 20,
  maxRedirectHops: 6,
});
export const HTTP_POLICY = Object.freeze({ maxJsonBytes: 32_768 });
