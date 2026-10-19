function createWindowOpenHandler({ openExternal, onError }) {
  return ({ url }) => {
    let destination;
    try { destination = new URL(url); }
    catch { return { action: "deny" }; }

    // Only the authored credit site's HTTPS origin may reach the OS browser.
    if (destination.origin === "https://mertcreates.com" && !destination.username && !destination.password) {
      openExternal(destination.href).catch(onError);
    }
    return { action: "deny" };
  };
}

module.exports = { createWindowOpenHandler };
