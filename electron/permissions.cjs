const { ORIGIN } = require("./server.cjs");

function isApplicationUrl(value) {
  try { return new URL(value).origin === ORIGIN; }
  catch { return false; }
}

function installPermissions(session, getApplicationContents) {
  function canWriteClipboard(contents, permission, details) {
    return permission === "clipboard-sanitized-write"
      && contents != null && contents === getApplicationContents()
      && !contents.isDestroyed()
      && isApplicationUrl(contents.getURL())
      && details.isMainFrame === true
      && isApplicationUrl(details.requestingUrl);
  }

  session.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(canWriteClipboard(contents, permission, details));
  });
  session.setPermissionCheckHandler((contents, permission, requestingOrigin, details) => {
    return isApplicationUrl(requestingOrigin) && canWriteClipboard(contents, permission, details);
  });
}

module.exports = { installPermissions };
