/**
 * Tagesaufgaben. Der Satz wird pro Kalendertag aus einem festen Pool
 * gezogen — gleicher Tag, gleiche Aufgaben, auch nach einem Reload.
 */
import { hashText } from "../core/rarity.js";

const POOL = [
  { id: "draw5",    name: "Zieh 5 Fakten",              goal: 5,  xp: 40,  coins: 15, track: "draws" },
  { id: "draw12",   name: "Zieh 12 Fakten",             goal: 12, xp: 90,  coins: 35, track: "draws" },
  { id: "rare2",    name: "Finde 2 seltene Fakten",     goal: 2,  xp: 70,  coins: 25, track: "rarePlus" },
  { id: "epic1",    name: "Finde einen epischen Fakt",  goal: 1,  xp: 110, coins: 40, track: "epicPlus" },
  { id: "combo6",   name: "Erreiche Combo 6",           goal: 6,  xp: 80,  coins: 30, track: "comboPeak" },
  { id: "fav2",     name: "Markiere 2 Favoriten",       goal: 2,  xp: 50,  coins: 20, track: "favorites" },
  { id: "new8",     name: "Entdecke 8 neue Karten",     goal: 8,  xp: 100, coins: 35, track: "newCards" },
];

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Wählt drei stabile Aufgaben für den gegebenen Tag. */
export function questsForDay(dayKey) {
  const seed = hashText(dayKey);
  const picked = [];
  const pool = [...POOL];

  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = (seed >>> (i * 5)) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export function emptyProgress() {
  return { draws: 0, rarePlus: 0, epicPlus: 0, comboPeak: 0, favorites: 0, newCards: 0 };
}

export function isQuestDone(quest, progress) {
  return (progress[quest.track] || 0) >= quest.goal;
}
