function connect(url, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    let closed = false;
    const pending = new Map();
    const close = (error = new Error("CDP bağlantısı kapandı.")) => {
      if (closed) return;
      closed = true;
      clearTimeout(connectionTimer);
      reject(error);
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.fail(error);
      }
      pending.clear();
      socket.close();
    };
    const connectionTimer = setTimeout(() => close(new Error("CDP bağlantısı zaman aşımına uğradı.")), timeoutMs);
    socket.onopen = () => {
      clearTimeout(connectionTimer);
      if (closed) return;
      resolve({
        close: () => close(),
        send: (method, params = {}) => new Promise((done, fail) => {
          if (closed) { fail(new Error("CDP bağlantısı kapandı.")); return; }
          const requestId = ++id;
          const timer = setTimeout(() => close(new Error(`CDP komutu zaman aşımına uğradı: ${method}`)), timeoutMs);
          pending.set(requestId, { done, fail, timer });
          try { socket.send(JSON.stringify({ id: requestId, method, params })); }
          catch (error) { close(error); }
        }),
      });
    };
    socket.onerror = () => close(new Error("CDP bağlantı hatası."));
    socket.onclose = () => close();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.fail(new Error(message.error.message));
      else request.done(message.result);
    };
  });
}
module.exports = { connect };
