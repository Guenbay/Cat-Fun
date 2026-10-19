/** Level-Kurve und Ränge. Die Rangnamen liegen übersetzt in i18n (`rank.0` …). */

/** Ab welchem Level ein Rang gilt — Index entspricht dem i18n-Schlüssel. */
export const RANK_THRESHOLDS = [1, 3, 5, 8, 12, 16, 21, 27, 35];

/** XP-Bedarf für den Sprung von `level` auf `level + 1`. */
export function xpForLevel(level) {
  return Math.round(220 * Math.pow(1.26, level - 1));
}

/** Rechnet Gesamt-XP in Level, Fortschritt und Bedarf um. */
export function deriveLevel(totalXp) {
  let level = 1;
  let remaining = totalXp;
  let need = xpForLevel(level);

  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpForLevel(level);
  }

  return { level, into: remaining, need, ratio: need ? remaining / need : 0 };
}

/** Index des Rangs für ein Level — der Aufrufer übersetzt ihn über `rank.<index>`. */
export function rankIndexFor(level) {
  let idx = 0;
  RANK_THRESHOLDS.forEach((from, i) => { if (level >= from) idx = i; });
  return idx;
}
