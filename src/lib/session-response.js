import { ApiError } from "./api-client.js";
import { ui } from "./ui-text.js";

/**
 * @param {unknown} result
 * @param {string} path
 * @param {'GET' | 'POST' | 'DELETE'} method
 */
export function readSessionResponse(result, path, method) {
  if (!result || typeof result !== "object" || Array.isArray(result)
    || !("connected" in result) || typeof result.connected !== "boolean"
    || (method !== "GET" && result.connected !== (method === "POST"))) {
    throw new ApiError(ui.apiErrors.responseUnreadable, 200, "INVALID_RESPONSE", {
      apiPath: path, apiMethod: method,
      diagnostic: ui.apiErrors.invalidSessionResponse,
    });
  }
  return result.connected;
}
