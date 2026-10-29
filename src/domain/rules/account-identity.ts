export function loginUsername(value: unknown): string {
  return typeof value === "string" ? value.split("@", 1)[0].trim() : "";
}

export function accountUsername(value: string): string {
  return loginUsername(value).replace(/[A-Z]/g, letter => letter.toLowerCase());
}

export function isAccountKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
