export function safeLoad<T>(key: string, fallback: T, validator?: (data: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      console.warn(`Data validation failed for key "${key}". Resetting to defaults.`);
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.error(`Corrupt localStorage key "${key}". Falling back safely.`, err);
    return fallback;
  }
}

export function safeSave<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage for key "${key}".`, err);
  }
}