/**
 * Achievements. Jedes prüft den Spielstand und bleibt freigeschaltet,
 * sobald es einmal erfüllt war.
 */
export const ACHIEVEMENTS = [
  { id: "first",      icon: "🐾", name: "Erster Pfotenabdruck", desc: "Sammle deinen ersten Fakt",            test: s => s.facts.length >= 1 },
  { id: "ten",        icon: "📚", name: "Kleine Bibliothek",     desc: "10 Fakten gesammelt",                  test: s => s.facts.length >= 10 },
  { id: "fifty",      icon: "🏛️", name: "Fakten-Archiv",         desc: "50 Fakten gesammelt",                  test: s => s.facts.length >= 50 },
  { id: "hundred",    icon: "🌌", name: "Hundert Leben",         desc: "100 Fakten gesammelt",                 test: s => s.facts.length >= 100 },
  { id: "rare",       icon: "💎", name: "Glücksgriff",           desc: "Einen seltenen Fakt gezogen",          test: s => countRarity(s, "rare") >= 1 },
  { id: "epic",       icon: "🔮", name: "Episches Fundstück",    desc: "Einen epischen Fakt gezogen",          test: s => countRarity(s, "epic") >= 1 },
  { id: "legendary",  icon: "👑", name: "Legendenjäger",         desc: "Einen legendären Fakt gezogen",        test: s => countRarity(s, "legendary") >= 1 },
  { id: "combo5",     icon: "⚡", name: "Flinke Pfoten",          desc: "Combo von 5 erreicht",                 test: s => s.bestCombo >= 5 },
  { id: "combo15",    icon: "🌀", name: "Pfoten-Wirbelsturm",    desc: "Combo von 15 erreicht",                test: s => s.bestCombo >= 15 },
  { id: "streak3",    icon: "🔥", name: "Warmgelaufen",          desc: "3 Tage in Folge",                      test: s => s.bestStreak >= 3 },
  { id: "streak7",    icon: "🗓️", name: "Woche der Katze",       desc: "7 Tage in Folge",                      test: s => s.bestStreak >= 7 },
  { id: "level5",     icon: "⭐", name: "Aufsteiger",             desc: "Level 5 erreicht",                     test: (s, l) => l >= 5 },
  { id: "level10",    icon: "🚀", name: "Zweistellig",            desc: "Level 10 erreicht",                    test: (s, l) => l >= 10 },
  { id: "fav5",       icon: "❤️", name: "Herzenssache",          desc: "5 Favoriten markiert",                 test: s => s.facts.filter(f => f.favorite).length >= 5 },
  { id: "questday",   icon: "✅", name: "Tagwerk",                desc: "Alle Tagesaufgaben an einem Tag",      test: s => s.questDaysCleared >= 1 },
  { id: "nightowl",   icon: "🌙", name: "Nachtschwärmer",        desc: "Zwischen 0 und 5 Uhr gesammelt",       test: s => s.flags.nightOwl === true },
  { id: "coins500",   icon: "🐟", name: "Fischli-Hamster",       desc: "500 Fischli angehäuft",                test: s => s.coins >= 500 },
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
