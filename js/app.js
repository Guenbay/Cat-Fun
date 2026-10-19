/* ============================================================
   Purrdex — Orchestrierung: State, Spielregeln, Ereignisse
   ============================================================ */

import { fetchFact, poolSize, hasApi, LANGS } from "./core/api.js";
import { loadSave, persist, clearSave } from "./core/storage.js";
import { rarityOf, cardId, RARITIES, hashText } from "./core/rarity.js";
import { play, setSoundEnabled } from "./core/audio.js";
import { deriveLevel, rankIndexFor } from "./game/xp.js";
import { evaluateAchievements } from "./game/achievements.js";
import { questsForDay, todayKey, emptyProgress, isQuestDone } from "./game/quests.js";
import { translator, LANG_ORDER, LANG_META } from "./data/i18n.js";
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
    facts: [],              // { key, id, text, rarity, favorite, seen, source, lang }
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
    lang: "de",
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
  if (!LANGS[merged.lang]) merged.lang = "de";
  return merged;
}

let state = hydrate(loadSave());
let t = translator(state.lang);
let quests = [];
let filter = "all";
let currentKey = null;
let comboTimer = null;
let comboDeadline = 0;
let busy = false;

/* ---------- Abgeleitete Werte ---------- */

function derived() {
  const d = deriveLevel(state.xp);
  return { ...d, rank: t(`rank.${rankIndexFor(d.level)}`) };
}

function currentEntry() {
  return state.facts.find(f => f.key === currentKey) || null;
}

/** Wie viel des Pools der aktuellen Sprache schon gesammelt ist. */
function poolProgress() {
  const lang = state.lang;
  if (hasApi(lang)) return { unlimited: true, have: 0, total: 0 };

  const owned = new Set(state.facts.filter(f => (f.lang || "de") === lang).map(f => f.text));
  const have = LANGS[lang].pool.filter(text => owned.has(text)).length;
  return { unlimited: false, have, total: poolSize(lang) };
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
      toast({ icon: "🔥", title: t("toast.streak.title", { n: state.streak }), body: t("toast.streak.body") });
    } else if (state.lastPlayDay !== null) {
      if (state.streak > 1) toast({ icon: "💔", title: t("toast.streakLost.title"), body: t("toast.streakLost.body") });
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
    stopCombo();
    view.setBind("combo", 0);
    save();
    return;
  }

  if (fill) fill.style.transform = `scaleX(${left / COMBO_WINDOW_MS})`;
  if (secs) secs.textContent = Math.ceil(left / 1000);
}

function stopCombo() {
  clearInterval(comboTimer);
  comboTimer = null;
  state.combo = 0;

  const meter = document.getElementById("combo-meter");
  meter?.classList.remove("is-on");
  meter?.setAttribute("aria-hidden", "true");
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
    const rank = t(`rank.${rankIndexFor(after)}`);
    view.showLevelUp(after, rank);
    play("levelup");
    toast({ icon: "🎊", title: t("toast.level.title", { n: after }), body: rank, gold: true });
  }
  popChip(document.getElementById("chip-coins"));
}

function checkAchievements() {
  const fresh = evaluateAchievements(state, derived().level);
  for (const a of fresh) {
    toast({
      icon: a.icon,
      title: t("toast.ach.title", { name: t(`ach.${a.id}.name`) }),
      body: t(`ach.${a.id}.desc`),
      gold: true,
    });
    play("unlock");
    grant(40, 15);
  }
}

function checkQuests() {
  for (const q of quests) {
    if (state.questClaimed.includes(q.id)) continue;
    if (!isQuestDone(q, state.questProgress)) continue;

    state.questClaimed.push(q.id);
    grant(q.xp, q.coins);
    toast({
      icon: "✅",
      title: t("toast.quest.title", { name: t(`quest.${q.id}`) }),
      body: t("toast.quest.body", { xp: q.xp, coins: q.coins }),
    });
    play("unlock");
  }

  const allDone = quests.length > 0 && quests.every(q => state.questClaimed.includes(q.id));
  if (allDone && state.flags.questDayKey !== state.questDay) {
    state.flags.questDayKey = state.questDay;
    state.questDaysCleared += 1;
    grant(120, 60);
    toast({ icon: "🏆", title: t("toast.allQuests.title"), body: t("toast.allQuests.body"), gold: true });
  }
}

/* ---------- Kernaktion: Fakt ziehen ---------- */

async function drawFact() {
  if (busy) return;
  busy = true;

  const btn = document.getElementById("btn-fact");
  if (btn) { btn.classList.add("is-loading"); btn.disabled = true; }

  try {
    rolloverDay();

    const known = new Set(state.facts.filter(f => (f.lang || "de") === state.lang).map(f => f.text));
    const { text, source, exhausted } = await fetchFact(state.lang, known);
    const key = String(hashText(text));
    const rarity = rarityOf(text);

    let entry = state.facts.find(f => f.key === key);
    const isNew = !entry;

    if (isNew) {
      entry = { key, id: cardId(text), text, rarity, favorite: false, seen: 0, source, lang: state.lang };
      state.facts.push(entry);
      state.questProgress.newCards += 1;
      if (rarity !== "common") state.questProgress.rarePlus += 1;
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

    view.renderFact(entry, { xpGained, isNew, combo: state.combo }, t);
    view.renderFavoriteButton(entry.favorite, t);
    burst(document.getElementById("factcard"), rarity);
    play(rarity === "common" ? "draw" : rarity);

    if (isNew && rarity !== "common") {
      toast({
        icon: rarity === "legendary" ? "👑" : rarity === "epic" ? "🔮" : "💎",
        title: t("toast.rarity.title", { rarity: t(`rarity.${rarity}`) }),
        body: t("toast.rarity.body", { id: entry.id }),
        gold: rarity === "legendary",
      });
    }
    if (source === "offline" && !state.flags.offlineNoticed) {
      state.flags.offlineNoticed = true;
      toast({ icon: "📴", title: t("toast.offline.title"), body: t("toast.offline.body") });
    }
    const poolFlag = `poolComplete_${state.lang}`;
    if (exhausted && !state.flags[poolFlag]) {
      state.flags[poolFlag] = true;
      toast({
        icon: "🏅", gold: true,
        title: t("toast.poolDone.title"),
        body: t("toast.poolDone.body", { n: poolSize(state.lang) }),
      });
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

  if (key === currentKey) view.renderFavoriteButton(entry.favorite, t);
  checkQuests();
  checkAchievements();
  renderAll();
  save();
}

/* ---------- Teilen ---------- */

async function copyCurrent() {
  const entry = currentEntry();
  if (!entry) {
    toast({ icon: "🐈", title: t("toast.noFact.title"), body: t("toast.noFact.body") });
    return;
  }

  const payload = `${entry.text}\n\n— Purrdex ${entry.id} · ${t(`rarity.${entry.rarity}`)}`;
  try {
    await navigator.clipboard.writeText(payload);
    toast({ icon: "📋", title: t("toast.copied.title"), body: t("toast.copied.body") });
  } catch {
    toast({ icon: "⚠️", title: t("toast.copyFail.title"), body: t("toast.copyFail.body") });
  }
  play("click");
}

/* ---------- Sprache, Theme, Sound ---------- */

function applyLanguage() {
  t = translator(state.lang);
  view.applyStaticText(t, state.lang);

  // Filter-Beschriftungen stehen im Markup und werden von applyStaticText
  // erneuert — die aktive Markierung muss danach wiederhergestellt werden.
  document.querySelectorAll(".filter").forEach(b => {
    b.classList.toggle("is-active", b.dataset.filter === filter);
  });

  const entry = currentEntry();
  if (entry) {
    view.renderFact(entry, { xpGained: 0, isNew: true, combo: 0 }, t);
    document.getElementById("fact-xp").textContent = t("fact.lastDrawn");
    view.renderFavoriteButton(entry.favorite, t);
  } else {
    view.renderEmptyStage(t);
  }
}

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
  view.renderHeader(state, d, poolProgress(), t);
  view.renderQuests(quests, state.questProgress, state.questClaimed, t);
  view.renderAchievements(state.unlocked, t);
  view.renderCollection(state.facts, filter, toggleFavorite, t);
}

function save() {
  persist(state);
}

/* ---------- Bestätigungs-Dialog ----------
   Bewusst kein confirm(): native Dialoge sind in eingebetteten Kontexten
   (sandboxed iframes) gesperrt und liefern dort stillschweigend false. */

let onConfirm = null;

function openModal(handler) {
  const modal = document.getElementById("modal");
  if (!modal) return;
  onConfirm = handler;
  modal.hidden = false;
  document.getElementById("modal-confirm")?.focus();
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.hidden = true;
  onConfirm = null;
}

function wireModal() {
  document.getElementById("modal-confirm")?.addEventListener("click", () => {
    const handler = onConfirm;
    closeModal();
    handler?.();
  });

  document.querySelectorAll("[data-modal-dismiss]").forEach(el => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("modal")?.hidden) closeModal();
  });
}

/* ---------- Zurücksetzen ---------- */

function resetProgress() {
  stopCombo();

  clearSave();
  const { theme, sound, lang } = state;
  state = freshState();
  Object.assign(state, { theme, sound, lang });
  currentKey = null;

  rolloverDay();
  applyTheme();
  applySound();
  view.renderEmptyStage(t);
  renderAll();
  save();
  toast({ icon: "🧹", title: t("toast.reset.title"), body: t("toast.reset.body") });
}

/* ---------- Ereignisse ---------- */

function wireEvents() {
  document.getElementById("btn-fact")?.addEventListener("click", drawFact);

  document.getElementById("btn-favorite")?.addEventListener("click", () => {
    if (currentKey) toggleFavorite(currentKey);
  });

  document.getElementById("btn-share")?.addEventListener("click", copyCurrent);

  document.getElementById("btn-lang")?.addEventListener("click", () => {
    const next = (LANG_ORDER.indexOf(state.lang) + 1) % LANG_ORDER.length;
    state.lang = LANG_ORDER[next];
    play("click");
    applyLanguage();
    renderAll();
    save();
    toast({
      icon: LANG_META[state.lang].flag,
      title: t("toast.lang.title"),
      body: t("toast.lang.body", { n: poolSize(state.lang) }),
    });
  });

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
      view.renderCollection(state.facts, filter, toggleFavorite, t);
    });
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    play("click");
    openModal(resetProgress);
  });

  document.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing) return;
    if (!document.getElementById("modal")?.hidden) return;  // Dialog hat Vorrang

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

  const last = state.facts.at(-1);
  if (last) currentKey = last.key;

  applyTheme();
  applySound();
  applyLanguage();
  wireModal();
  wireEvents();
  startPawField(document.getElementById("paw-canvas"));
  renderAll();
  save();
}

init();
