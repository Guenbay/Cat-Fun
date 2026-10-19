import { FACTS_DE } from "../data/facts-de.js";
import { FACTS_EN } from "../data/facts-en.js";

const ENDPOINT = "https://catfact.ninja/fact";
const TIMEOUT_MS = 6000;

export const LANGS = {
  de: { label: "DE", pool: FACTS_DE, finite: true },
  en: { label: "EN", pool: FACTS_EN, finite: false },
};

export function poolSize(lang) {
  return (LANGS[lang] || LANGS.de).pool.length;
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
 * DE kommt immer aus dem eingebauten Pool — es gibt keine deutschsprachige
 * Katzenfakten-API. EN fragt catfact.ninja und fällt bei Netzfehler,
 * Timeout oder leerer Antwort still auf den englischen Vorrat zurück.
 *
 * @param {"de"|"en"} lang
 * @param {Set<string>} known Bereits gesammelte Texte
 * @returns {Promise<{text: string, source: "pool"|"api"|"offline", exhausted: boolean}>}
 */
export async function fetchFact(lang, known = new Set()) {
  const cfg = LANGS[lang] || LANGS.de;

  if (lang === "de") {
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
