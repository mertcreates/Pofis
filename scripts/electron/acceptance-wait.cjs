async function until(check, timeout = 30000, message = "Pofis kabul kontrolü zaman aşımına uğradı.") {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, timeout);
  });
  const poll = (async () => {
    while (!controller.signal.aborted) {
      const result = await check(controller.signal);
      if (result) return result;
      await new Promise(done => setTimeout(done, 100));
    }
    throw new Error(message);
  })();
  try { return await Promise.race([poll, deadline]); }
  finally { clearTimeout(timer); controller.abort(); }
}

// Keep headers and response-body reads bounded, including a server that accepts
// a connection and never responds. Renderer fetches keep their own app contract.
function fetchLocal(url, options = {}) {
  const timeout = AbortSignal.timeout(3000);
  return globalThis.fetch(url, { ...options,
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
}

module.exports = { until, fetchLocal };
