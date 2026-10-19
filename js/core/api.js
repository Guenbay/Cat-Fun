import { FALLBACK_FACTS } from "../data/fallback-facts.js";

const ENDPOINT = "https://catfact.ninja/fact";
const TIMEOUT_MS = 6000;

/** Fakten, die der Vorrat schon ausgespielt hat — verhindert Dauerwiederholung. */
const usedFallback = new Set();

function pickFallback() {
  if (usedFallback.size >= FALLBACK_FACTS.length) usedFallback.clear();
  let pick;
  do {
    pick = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
  } while (usedFallback.has(pick));
  usedFallback.add(pick);
  return pick;
}

/**
 * Holt einen Fakt. Fällt bei Netzfehler, Timeout oder leerer Antwort
 * still auf den eingebauten Vorrat zurück.
 * @returns {Promise<{text: string, source: "api" | "offline"}>}
 */
export async function fetchFact() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const text = (data?.fact || "").trim();
    if (!text) throw new Error("leere Antwort");

    return { text, source: "api" };
  } catch {
    return { text: pickFallback(), source: "offline" };
  } finally {
    clearTimeout(timer);
  }
}
