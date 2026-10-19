/**
 * Tagesaufgaben. Der Satz wird pro Kalendertag aus einem festen Pool
 * gezogen — gleicher Tag, gleiche Aufgaben, auch nach einem Reload.
 * Die Aufgabennamen liegen übersetzt in i18n unter `quest.<id>`.
 */
import { hashText } from "../core/rarity.js";

const POOL = [
  { id: "draw5",    goal: 5,  xp: 40,  coins: 15, track: "draws" },
  { id: "draw12",   goal: 12, xp: 90,  coins: 35, track: "draws" },
  { id: "rare2",    goal: 2,  xp: 70,  coins: 25, track: "rarePlus" },
  { id: "epic1",    goal: 1,  xp: 110, coins: 40, track: "epicPlus" },
  { id: "combo6",   goal: 6,  xp: 80,  coins: 30, track: "comboPeak" },
  { id: "fav2",     goal: 2,  xp: 50,  coins: 20, track: "favorites" },
  { id: "new8",     goal: 8,  xp: 100, coins: 35, track: "newCards" },
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
