/**
 * Seltenheit eines Fakts. Sie wird aus dem Text selbst abgeleitet, damit
 * derselbe Fakt bei jedem Spieler dieselbe Stufe hat — wie eine Karten-ID.
 * Die Bezeichnungen liegen übersetzt in i18n unter `rarity.<stufe>`.
 */
export const RARITIES = {
  common:    { xp: 10,  weight: 1 },
  rare:      { xp: 25,  weight: 2 },
  epic:      { xp: 60,  weight: 4 },
  legendary: { xp: 150, weight: 8 },
};

export const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

/** FNV-1a — kurz, stabil, deterministisch. */
export function hashText(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function rarityOf(text) {
  const roll = hashText(text) % 1000;
  if (roll < 25) return "legendary";   // 2.5 %
  if (roll < 130) return "epic";       // 10.5 %
  if (roll < 380) return "rare";       // 25 %
  return "common";                     // 62 %
}

/** Kurze, gut lesbare Karten-Nummer wie #4F2A. */
export function cardId(text) {
  return "#" + hashText(text).toString(16).toUpperCase().slice(0, 4).padStart(4, "0");
}
