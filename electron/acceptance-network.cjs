// Install before loading the first document so production tags cannot send test traffic.
function isolateAcceptanceAnalytics(session, enabled) {
  if (!enabled) return;
  session.webRequest.onBeforeRequest({ urls: [
    "https://*.google-analytics.com/*",
    "https://*.googletagmanager.com/*",
    "https://analytics.google.com/*",
  ] }, (_details, callback) => callback({ cancel: true }));
}

module.exports = { isolateAcceptanceAnalytics };
