import { FACTS_DE } from "../data/facts-de.js";
import { FACTS_EN } from "../data/facts-en.js";
import { FACTS_TR } from "../data/facts-tr.js";

const ENDPOINT = "https://catfact.ninja/fact";
const TIMEOUT_MS = 6000;

/**
 * Pro Sprache: der eingebaute Pool und ob zusätzlich eine API befragt wird.
 * Nur Englisch hat eine Quelle im Netz — für Deutsch und Türkisch gibt es
 * keine Katzenfakten-API, deshalb sind diese Pools die alleinige Quelle.
 */
export const LANGS = {
  de: { pool: FACTS_DE, api: false },
  en: { pool: FACTS_EN, api: true },
  tr: { pool: FACTS_TR, api: false },
};

export function poolSize(lang) {
  return (LANGS[lang] || LANGS.de).pool.length;
}

export function hasApi(lang) {
  return Boolean((LANGS[lang] || LANGS.de).api);
}

/**
 * Zieht aus einem Pool und bevorzugt dabei, was noch nicht gesammelt ist.
 * @param {string[]} pool
 * @param {Set<string>} known Texte, die der Spieler schon hat
 */
function pickFrom(pool, known) {
  const fresh = pool.filter(t => !known.has(t));
  const source = fresh.length ? fresh : pool;
  return {
    text: source[Math.floor(Math.random() * source.length)],
    exhausted: fresh.length === 0,
  };
}

/**
 * Liefert einen Fakt in der gewünschten Sprache.
 *
 * @param {"de"|"en"|"tr"} lang
 * @param {Set<string>} known Bereits gesammelte Texte
 * @returns {Promise<{text: string, source: "pool"|"api"|"offline", exhausted: boolean}>}
 */
export async function fetchFact(lang, known = new Set()) {
  const cfg = LANGS[lang] || LANGS.de;

  if (!cfg.api) {
    const { text, exhausted } = pickFrom(cfg.pool, known);
    return { text, source: "pool", exhausted };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const text = (data?.fact || "").trim();
    if (!text) throw new Error("leere Antwort");

    return { text, source: "api", exhausted: false };
  } catch {
    const { text, exhausted } = pickFrom(cfg.pool, known);
    return { text, source: "offline", exhausted };
  } finally {
    clearTimeout(timer);
  }
}
