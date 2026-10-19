/* ============================================================
   Purrdex — Orchestrierung: State, Spielregeln, Ereignisse
   ============================================================ */

import { fetchFact } from "./core/api.js";
import { loadSave, persist, clearSave } from "./core/storage.js";
import { rarityOf, cardId, RARITIES, hashText } from "./core/rarity.js";
import { play, setSoundEnabled, isSoundEnabled } from "./core/audio.js";
import { deriveLevel, rankFor } from "./game/xp.js";
import { evaluateAchievements } from "./game/achievements.js";
import { questsForDay, todayKey, emptyProgress, isQuestDone } from "./game/quests.js";
import { toast } from "./ui/toast.js";
import { startPawField, burst, popChip } from "./ui/effects.js";
import * as view from "./ui/render.js";

/* ---------- Konstanten ---------- */

const COMBO_WINDOW_MS = 12_000;   // so lange bleibt die Combo am Leben
const COMBO_MAX = 25;
const DUPLICATE_XP_FACTOR = 0.25; // Dubletten geben weniger

/* ---------- State ---------- */

function freshState() {
  return {
    xp: 0,
    coins: 0,
    facts: [],              // { key, id, text, rarity, favorite, seen, source }
    unlocked: [],
    combo: 0,
    bestCombo: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayDay: null,
    questDay: null,
    questProgress: emptyProgress(),
    questClaimed: [],
    questDaysCleared: 0,
    sound: true,
    theme: "midnight",
    flags: {},
  };
}

/** Füllt fehlende Felder eines alten Speicherstands auf. */
function hydrate(raw) {
  const base = freshState();
  if (!raw || typeof raw !== "object") return base;

  const merged = { ...base, ...raw };
  merged.facts = Array.isArray(raw.facts) ? raw.facts : [];
  merged.unlocked = Array.isArray(raw.unlocked) ? raw.unlocked : [];
  merged.questClaimed = Array.isArray(raw.questClaimed) ? raw.questClaimed : [];
  merged.questProgress = { ...emptyProgress(), ...(raw.questProgress || {}) };
  merged.flags = { ...(raw.flags || {}) };
  return merged;
}

let state = hydrate(loadSave());
let quests = [];
let filter = "all";
let currentKey = null;
let comboTimer = null;
let comboDeadline = 0;
let busy = false;

/* ---------- Abgeleitete Werte ---------- */

function derived() {
  const d = deriveLevel(state.xp);
  return { ...d, rank: rankFor(d.level) };
}

function currentEntry() {
  return state.facts.find(f => f.key === currentKey) || null;
}

/* ---------- Tageswechsel: Streak & Quests ---------- */

function rolloverDay() {
  const today = todayKey();

  if (state.questDay !== today) {
    state.questDay = today;
    state.questProgress = emptyProgress();
    state.questClaimed = [];
  }
  quests = questsForDay(state.questDay);

  if (state.lastPlayDay !== today) {
    const yesterday = todayKey(new Date(Date.now() - 86_400_000));
    if (state.lastPlayDay === yesterday) {
      state.streak += 1;
      toast({ icon: "🔥", title: `Streak ${state.streak} Tage`, body: "Weiter so — morgen wieder vorbeischauen." });
    } else if (state.lastPlayDay !== null) {
      if (state.streak > 1) toast({ icon: "💔", title: "Streak zurückgesetzt", body: "Ein Tag ohne Fakten. Neustart bei 1." });
      state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.lastPlayDay = today;
  }
}

/* ---------- Combo ---------- */

function bumpCombo() {
  state.combo = Math.min(state.combo + 1, COMBO_MAX);
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.questProgress.comboPeak = Math.max(state.questProgress.comboPeak, state.combo);
  comboDeadline = Date.now() + COMBO_WINDOW_MS;

  const meter = document.getElementById("combo-meter");
  meter?.classList.add("is-on");
  meter?.setAttribute("aria-hidden", "false");

  if (!comboTimer) comboTimer = setInterval(tickCombo, 120);
}

function tickCombo() {
  const left = comboDeadline - Date.now();
  const fill = document.getElementById("combo-fill");
  const secs = document.getElementById("combo-secs");

  if (left <= 0) {
    clearInterval(comboTimer);
    comboTimer = null;
    state.combo = 0;
    const meter = document.getElementById("combo-meter");
    meter?.classList.remove("is-on");
    meter?.setAttribute("aria-hidden", "true");
    view.setBind("combo", 0);
    save();
    return;
  }

  if (fill) fill.style.transform = `scaleX(${left / COMBO_WINDOW_MS})`;
  if (secs) secs.textContent = Math.ceil(left / 1000);
}

function comboMultiplier() {
  return 1 + Math.min(state.combo, COMBO_MAX) * 0.08;  // bis ca. 3×
}

/* ---------- Belohnungen ---------- */

function grant(xp, coins) {
  const before = deriveLevel(state.xp).level;
  state.xp += xp;
  state.coins += coins;
  const after = deriveLevel(state.xp).level;

  if (after > before) {
    const rank = rankFor(after);
    view.showLevelUp(after, rank);
    play("levelup");
    toast({ icon: "🎊", title: `Level ${after}`, body: rank, gold: true });
  }
  popChip(document.getElementById("chip-coins"));
}

function checkAchievements() {
  const fresh = evaluateAchievements(state, derived().level);
  for (const a of fresh) {
    toast({ icon: a.icon, title: `Achievement: ${a.name}`, body: a.desc, gold: true });
    play("unlock");
    grant(40, 15);
  }
  return fresh.length > 0;
}

function checkQuests() {
  let changed = false;

  for (const q of quests) {
    if (state.questClaimed.includes(q.id)) continue;
    if (!isQuestDone(q, state.questProgress)) continue;

    state.questClaimed.push(q.id);
    grant(q.xp, q.coins);
    toast({ icon: "✅", title: `Aufgabe erledigt: ${q.name}`, body: `+${q.xp} XP · ${q.coins} Fischli` });
    play("unlock");
    changed = true;
  }

  const allDone = quests.length > 0 && quests.every(q => state.questClaimed.includes(q.id));
  if (allDone && state.flags.questDayKey !== state.questDay) {
    state.flags.questDayKey = state.questDay;
    state.questDaysCleared += 1;
    grant(120, 60);
    toast({ icon: "🏆", title: "Alle Tagesaufgaben erledigt", body: "+120 XP · 60 Fischli", gold: true });
    changed = true;
  }
  return changed;
}

/* ---------- Kernaktion: Fakt ziehen ---------- */

async function drawFact() {
  if (busy) return;
  busy = true;

  const btn = document.getElementById("btn-fact");
  if (btn) { btn.classList.add("is-loading"); btn.disabled = true; }

  try {
    rolloverDay();

    const { text, source } = await fetchFact();
    const key = String(hashText(text));
    const rarity = rarityOf(text);

    let entry = state.facts.find(f => f.key === key);
    const isNew = !entry;

    if (isNew) {
      entry = { key, id: cardId(text), text, rarity, favorite: false, seen: 0, source };
      state.facts.push(entry);
      state.questProgress.newCards += 1;
      if (rarity === "rare" || rarity === "epic" || rarity === "legendary") state.questProgress.rarePlus += 1;
      if (rarity === "epic" || rarity === "legendary") state.questProgress.epicPlus += 1;
    }
    entry.seen += 1;
    currentKey = key;

    bumpCombo();
    state.questProgress.draws += 1;

    const base = RARITIES[rarity].xp * (isNew ? 1 : DUPLICATE_XP_FACTOR);
    const xpGained = Math.max(1, Math.round(base * comboMultiplier()));
    const coinsGained = Math.max(1, Math.round(xpGained / 3));

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) state.flags.nightOwl = true;

    grant(xpGained, coinsGained);

    view.renderFact(entry, { xpGained, isNew, combo: state.combo });
    view.renderFavoriteButton(entry.favorite);
    burst(document.getElementById("factcard"), rarity);
    play(rarity === "common" ? "draw" : rarity);

    if (isNew && rarity !== "common") {
      toast({
        icon: rarity === "legendary" ? "👑" : rarity === "epic" ? "🔮" : "💎",
        title: `${RARITIES[rarity].label}er Fakt!`,
        body: `${entry.id} wandert in deine Sammlung.`,
        gold: rarity === "legendary",
      });
    }
    if (source === "offline" && !state.flags.offlineNoticed) {
      state.flags.offlineNoticed = true;
      toast({ icon: "📴", title: "Offline-Modus", body: "catfact.ninja nicht erreichbar — der eingebaute Vorrat springt ein." });
    }

    checkQuests();
    checkAchievements();
    renderAll();
    save();
  } finally {
    btn?.classList.remove("is-loading");
    if (btn) btn.disabled = false;
    busy = false;
  }
}

/* ---------- Favoriten ---------- */

function toggleFavorite(key) {
  const entry = state.facts.find(f => f.key === key);
  if (!entry) return;

  entry.favorite = !entry.favorite;
  if (entry.favorite) state.questProgress.favorites += 1;
  play("click");

  if (key === currentKey) view.renderFavoriteButton(entry.favorite);
  checkQuests();
  checkAchievements();
  renderAll();
  save();
}

/* ---------- Teilen ---------- */

async function copyCurrent() {
  const entry = currentEntry();
  if (!entry) {
    toast({ icon: "🐈", title: "Noch kein Fakt", body: "Zieh erst einen Fakt." });
    return;
  }

  const payload = `${entry.text}\n\n— Purrdex ${entry.id} · ${RARITIES[entry.rarity].label}`;
  try {
    await navigator.clipboard.writeText(payload);
    toast({ icon: "📋", title: "Kopiert", body: "Der Fakt liegt in der Zwischenablage." });
  } catch {
    toast({ icon: "⚠️", title: "Kopieren nicht möglich", body: "Der Browser hat den Zugriff abgelehnt." });
  }
  play("click");
}

/* ---------- Theme & Sound ---------- */

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  view.setBind("themeIcon", state.theme === "midnight" ? "🌙" : "☀️");
}

function applySound() {
  setSoundEnabled(state.sound);
  view.setBind("soundIcon", state.sound ? "🔊" : "🔇");
  document.getElementById("btn-sound")?.setAttribute("aria-pressed", String(state.sound));
}

/* ---------- Rendern & Speichern ---------- */

function renderAll() {
  const d = derived();
  view.renderHeader(state, d);
  view.renderQuests(quests, state.questProgress, state.questClaimed);
  view.renderAchievements(state.unlocked);
  view.renderCollection(state.facts, filter, toggleFavorite);
}

function save() {
  persist(state);
}

/* ---------- Ereignisse ---------- */

function wireEvents() {
  document.getElementById("btn-fact")?.addEventListener("click", drawFact);

  document.getElementById("btn-favorite")?.addEventListener("click", () => {
    if (currentKey) toggleFavorite(currentKey);
  });

  document.getElementById("btn-share")?.addEventListener("click", copyCurrent);

  document.getElementById("btn-sound")?.addEventListener("click", () => {
    state.sound = !state.sound;
    applySound();
    if (state.sound) play("click");
    save();
  });

  document.getElementById("btn-theme")?.addEventListener("click", () => {
    state.theme = state.theme === "midnight" ? "daylight" : "midnight";
    applyTheme();
    play("click");
    save();
  });

  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      filter = btn.dataset.filter;
      view.renderCollection(state.facts, filter, toggleFavorite);
    });
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    const ok = confirm("Wirklich den gesamten Fortschritt löschen? Sammlung, Level und Achievements sind danach weg.");
    if (!ok) return;
    clearSave();
    state = freshState();
    currentKey = null;
    rolloverDay();
    applyTheme();
    applySound();
    renderAll();
    toast({ icon: "🧹", title: "Zurückgesetzt", body: "Frischer Start — viel Spaß beim Sammeln." });
  });

  document.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing) return;

    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      drawFact();
    } else if (e.key.toLowerCase() === "f" && currentKey) {
      toggleFavorite(currentKey);
    } else if (e.key.toLowerCase() === "c") {
      copyCurrent();
    }
  });
}

/* ---------- Start ---------- */

function init() {
  rolloverDay();
  applyTheme();
  applySound();
  wireEvents();
  startPawField(document.getElementById("paw-canvas"));
  renderAll();

  const entry = state.facts.at(-1);
  if (entry) {
    currentKey = entry.key;
    view.renderFact(entry, { xpGained: 0, isNew: false, combo: 0 });
    view.renderFavoriteButton(entry.favorite);
    document.getElementById("fact-xp").textContent = "zuletzt gezogen";
  }

  save();
}

init();
