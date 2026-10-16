import { ui } from './ui-text.js';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, options = {}, fetchImpl = fetch) {
  const context = {
    apiPath: path.split('?')[0],
    apiMethod: options.method || 'GET',
  };
  let response;
  try {
    response = await fetchImpl(path, { cache: 'no-store', ...options });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(ui.apiErrors.appUnavailable, 0, 'NETWORK_ERROR', {
      ...context,
      diagnostic: ui.apiErrors.browserRequestFailed,
    });
  }
  let result;
  try {
    result = await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      ui.apiErrors.responseUnreadable,
      response.status,
      'INVALID_RESPONSE',
      {
        ...context,
        diagnostic: ui.apiErrors.invalidJsonResponse,
      },
    );
  }
  if (!response.ok) {
    throw new ApiError(
      typeof result?.error === 'string'
        ? result.error
        : ui.apiErrors.requestFailed,
      response.status,
      typeof result?.code === 'string' ? result.code : 'HTTP_ERROR',
      { ...context, ...result?.details },
    );
  }
  return result;
}

export function createLatestRequest() {
  let active;
  return {
    cancel() {
      active?.abort();
      active = undefined;
    },
    async run(path, options = {}, fetchImpl = fetch) {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const cancel = () => controller.abort();
      options.signal?.addEventListener('abort', cancel, { once: true });
      if (options.signal?.aborted) cancel();
      try {
        const result = await api(path, { ...options, signal: controller.signal }, fetchImpl);
        if (active !== controller || controller.signal.aborted) return null;
        return result;
      } catch (error) {
        if (active !== controller || controller.signal.aborted) return null;
        throw error;
      } finally {
        options.signal?.removeEventListener('abort', cancel);
      }
    },
  };
}
