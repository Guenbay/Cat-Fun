/**
 * Persistenz. localStorage kann in privaten Fenstern oder bei blockierten
 * Site-Daten werfen, deshalb ist jeder Zugriff abgesichert.
 */
const KEY = "purrdex.save.v1";

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persist(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nichts zu tun */
  }
}
