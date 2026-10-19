/**
 * Achievements. Jedes prüft den Spielstand und bleibt freigeschaltet,
 * sobald es einmal erfüllt war. Name und Beschreibung liegen übersetzt
 * in i18n unter `ach.<id>.name` und `ach.<id>.desc`.
 */
export const ACHIEVEMENTS = [
  { id: "first",       icon: "🐾",   test: s => s.facts.length >= 1 },
  { id: "ten",         icon: "📚",   test: s => s.facts.length >= 10 },
  { id: "fifty",       icon: "🏛️",   test: s => s.facts.length >= 50 },
  { id: "hundred",     icon: "🌌",   test: s => s.facts.length >= 100 },
  { id: "rare",        icon: "💎",   test: s => countRarity(s, "rare") >= 1 },
  { id: "epic",        icon: "🔮",   test: s => countRarity(s, "epic") >= 1 },
  { id: "legendary",   icon: "👑",   test: s => countRarity(s, "legendary") >= 1 },
  { id: "combo5",      icon: "⚡",   test: s => s.bestCombo >= 5 },
  { id: "combo15",     icon: "🌀",   test: s => s.bestCombo >= 15 },
  { id: "streak3",     icon: "🔥",   test: s => s.bestStreak >= 3 },
  { id: "streak7",     icon: "🗓️",   test: s => s.bestStreak >= 7 },
  { id: "level5",      icon: "⭐",   test: (s, l) => l >= 5 },
  { id: "level10",     icon: "🚀",   test: (s, l) => l >= 10 },
  { id: "fav5",        icon: "❤️",   test: s => s.facts.filter(f => f.favorite).length >= 5 },
  { id: "questday",    icon: "✅",   test: s => s.questDaysCleared >= 1 },
  { id: "nightowl",    icon: "🌙",   test: s => s.flags.nightOwl === true },
  { id: "coins500",    icon: "🐟",   test: s => s.coins >= 500 },
];

function countRarity(state, rarity) {
  return state.facts.filter(f => f.rarity === rarity).length;
}

/**
 * Prüft alle Achievements und gibt die neu freigeschalteten zurück.
 * Mutiert `state.unlocked`.
 */
export function evaluateAchievements(state, level) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (state.unlocked.includes(a.id)) continue;
    let ok = false;
    try { ok = a.test(state, level); } catch { ok = false; }
    if (ok) {
      state.unlocked.push(a.id);
      fresh.push(a);
    }
  }
  return fresh;
}
