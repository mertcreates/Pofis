export const THEME_STORAGE_KEY = "pofis:theme:v1";

export function themePreference(value) {
  if (value === "light" || value === "dark") return value;
  return "system";
}

export const themeInitScript = `
  (() => {
    let preference = 'system';
    try {
      const saved = localStorage.getItem('${THEME_STORAGE_KEY}');
      preference = (${themePreference.toString()})(saved);
    } catch {
      // Browser colors still apply when storage is unavailable.
    }
    document.documentElement.dataset.theme = preference;
  })();
`;
