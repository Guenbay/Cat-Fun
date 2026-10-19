/** Level-Kurve und Ränge. */

export const RANKS = [
  { from: 1,  name: "Streunerkätzchen" },
  { from: 3,  name: "Fensterbrett-Beobachter" },
  { from: 5,  name: "Karton-Kapitän" },
  { from: 8,  name: "Nachtjäger" },
  { from: 12, name: "Sofa-Sheriff" },
  { from: 16, name: "Schnurr-Virtuose" },
  { from: 21, name: "Dachfirst-Legende" },
  { from: 27, name: "Großmeister der Fakten" },
  { from: 35, name: "Neunfach Beseelt" },
];

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

export function rankFor(level) {
  let name = RANKS[0].name;
  for (const r of RANKS) if (level >= r.from) name = r.name;
  return name;
}
