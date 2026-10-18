function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    socket.onopen = () => resolve({
      close: () => socket.close(),
      send: (method, params = {}) => new Promise((done, fail) => {
        pending.set(++id, { done, fail });
        socket.send(JSON.stringify({ id, method, params }));
      }),
    });
    socket.onerror = reject;
    socket.onclose = () => {
      for (const request of pending.values()) request.fail(new Error("CDP bağlantısı kapandı."));
      pending.clear();
    };
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.fail(new Error(message.error.message));
      else request.done(message.result);
    };
  });
}
module.exports = { connect };
