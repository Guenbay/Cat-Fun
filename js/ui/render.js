/**
 * Reines DOM-Zeichnen: bekommt State und eine Übersetzungsfunktion `t`,
 * schreibt Markup, kennt keine Spiellogik und keinen festen Text.
 */

import { ACHIEVEMENTS } from "../game/achievements.js";
import { isQuestDone } from "../game/quests.js";
import { LANG_META } from "../data/i18n.js";

const $ = sel => document.querySelector(sel);
const binds = name => document.querySelectorAll(`[data-bind="${name}"]`);

export function setBind(name, value) {
  binds(name).forEach(el => { el.textContent = value; });
}

/* ---------- Statische Texte ---------- */

/** Übersetzt alles, was im Markup mit data-i18n ausgezeichnet ist. */
export function applyStaticText(t, lang) {
  document.documentElement.lang = LANG_META[lang]?.htmlLang || lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-label]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  });

  const combo = $("#combo-text");
  if (combo) combo.innerHTML = t("combo.text");
}

/* ---------- Kopf & Spieler ---------- */

export function renderHeader(state, derived, pool, t) {
  setBind("streak", state.streak);
  setBind("coins", state.coins);
  setBind("level", derived.level);
  setBind("rank", derived.rank);
  setBind("xpInto", derived.into);
  setBind("xpNeed", derived.need);
  setBind("collected", state.facts.length);
  setBind("combo", state.combo);
  setBind("bestCombo", state.bestCombo);
  setBind("legendary", state.facts.filter(f => f.rarity === "legendary").length);

  setBind("langIcon", LANG_META[state.lang]?.label || state.lang.toUpperCase());
  setBind("poolLang", LANG_META[state.lang]?.label || state.lang.toUpperCase());
  setBind("poolText", pool.unlimited ? t("kpi.poolUnlimited") : `${pool.have} / ${pool.total}`);

  const pct = Math.round(derived.ratio * 100);
  const bar = $("#xp-bar");
  if (bar) bar.style.width = pct + "%";

  const wrap = $("#xp-bar-wrap");
  if (wrap) wrap.setAttribute("aria-valuenow", String(pct));

  const ring = $("#ring-fill");
  if (ring) {
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference * (1 - derived.ratio));
  }

  const src = $("#stage-src");
  if (src) src.textContent = pool.unlimited ? t("stage.src.api") : t("stage.src.pool");

  $("#chip-streak")?.classList.toggle("is-hot", state.streak >= 3);
}

/* ---------- Fakten-Karte ---------- */

function sourceLabel(entry, t) {
  if (entry.source === "api") return t("src.api");
  if (entry.source === "offline") return t("src.offline");
  return t("src.pool");
}

export function renderFact(entry, { xpGained, isNew, combo }, t) {
  const card = $("#factcard");
  const text = $("#fact-text");
  const pill = $("#rarity-pill");
  const idEl = $("#fact-id");
  const xpEl = $("#fact-xp");
  if (!card || !text) return;

  text.textContent = entry.text;
  card.dataset.rarity = entry.rarity;
  if (pill) {
    pill.dataset.rarity = entry.rarity;
    pill.textContent = t(`rarity.${entry.rarity}`);
  }
  if (idEl) idEl.textContent = `${entry.id} · ${(entry.lang || "de").toUpperCase()} · ${sourceLabel(entry, t)}`;
  if (xpEl) {
    const parts = [t("fact.xp", { xp: xpGained })];
    if (combo > 1) parts.push(t("fact.combo", { n: combo }));
    if (!isNew) parts.push(t("fact.duplicate"));
    xpEl.textContent = parts.join(" · ");
  }

  card.classList.remove("is-fresh");
  void card.offsetWidth;
  card.classList.add("is-fresh");
}

/** Setzt die Bühne auf den Startzustand — nach einem Reset oder Sprachwechsel. */
export function renderEmptyStage(t) {
  const text = $("#fact-text");
  if (text) text.innerHTML = t("fact.placeholder");

  const card = $("#factcard");
  if (card) card.dataset.rarity = "common";

  const pill = $("#rarity-pill");
  if (pill) { pill.dataset.rarity = "common"; pill.textContent = t("rarity.common"); }

  const idEl = $("#fact-id");
  if (idEl) idEl.textContent = "#000";

  const xpEl = $("#fact-xp");
  if (xpEl) xpEl.textContent = "";

  renderFavoriteButton(false, t);
}

export function renderFavoriteButton(isFavorite, t) {
  const btn = $("#btn-favorite");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(Boolean(isFavorite)));
  btn.querySelector(".btn__label").textContent = isFavorite ? t("btn.favOn") : t("btn.fav");
}

/* ---------- Tagesaufgaben ---------- */

export function renderQuests(quests, progress, claimed, t) {
  const list = $("#quest-list");
  if (!list) return;
  list.innerHTML = "";

  for (const q of quests) {
    const have = Math.min(progress[q.track] || 0, q.goal);
    const done = isQuestDone(q, progress) || claimed.includes(q.id);

    const li = document.createElement("li");
    li.className = "quest" + (done ? " is-done" : "");
    li.innerHTML = `
      <div class="quest__top">
        <span class="quest__name"></span>
        <span class="quest__reward"></span>
      </div>
      <div class="quest__bar"><span></span></div>
      <span class="quest__count"></span>`;

    li.querySelector(".quest__name").textContent = (done ? "✓ " : "") + t(`quest.${q.id}`);
    li.querySelector(".quest__reward").textContent = t("quests.reward", { xp: q.xp, coins: q.coins });
    li.querySelector(".quest__bar span").style.width = (have / q.goal) * 100 + "%";
    li.querySelector(".quest__count").textContent = `${have} / ${q.goal}`;
    list.appendChild(li);
  }
}

/* ---------- Achievements ---------- */

export function renderAchievements(unlocked, t) {
  const list = $("#badge-list");
  if (!list) return;
  list.innerHTML = "";

  for (const a of ACHIEVEMENTS) {
    const li = document.createElement("li");
    li.className = "badge" + (unlocked.includes(a.id) ? " is-unlocked" : "");
    li.innerHTML = `
      <span class="badge__icon">${a.icon}</span>
      <span class="badge__name"></span>
      <span class="badge__desc"></span>`;
    li.querySelector(".badge__name").textContent = t(`ach.${a.id}.name`);
    li.querySelector(".badge__desc").textContent = t(`ach.${a.id}.desc`);
    list.appendChild(li);
  }

  setBind("achDone", unlocked.length);
  setBind("achTotal", ACHIEVEMENTS.length);
}

/* ---------- Sammlung ---------- */

export function renderCollection(facts, filter, onToggleFavorite, t) {
  const list = $("#collection-list");
  const empty = $("#collection-empty");
  if (!list) return;

  const shown = facts
    .filter(f => {
      if (filter === "all") return true;
      if (filter === "favorite") return f.favorite;
      return f.rarity === filter;
    })
    .slice()
    .reverse();

  list.innerHTML = "";
  if (empty) empty.hidden = shown.length > 0;

  for (const f of shown) {
    const li = document.createElement("li");
    li.className = "card";
    li.dataset.rarity = f.rarity;
    li.innerHTML = `
      <div class="card__top">
        <span class="card__rarity"></span>
        <span class="card__lang"></span>
        <button class="card__fav" type="button" aria-pressed="${Boolean(f.favorite)}">⭐</button>
      </div>
      <p class="card__text"></p>
      <span class="card__meta"></span>`;

    li.querySelector(".card__rarity").textContent = t(`rarity.${f.rarity}`);
    li.querySelector(".card__lang").textContent = (f.lang || "de").toUpperCase();
    li.querySelector(".card__text").textContent = f.text;
    li.querySelector(".card__meta").textContent = `${f.id} · ${t("card.drawn", { n: f.seen })}`;
    const fav = li.querySelector(".card__fav");
    fav.title = t("btn.fav");
    fav.addEventListener("click", () => onToggleFavorite(f.key));

    list.appendChild(li);
  }
}

/* ---------- Level-Up ---------- */

export function showLevelUp(level, rank) {
  const overlay = $("#levelup");
  if (!overlay) return;
  $("#levelup-num").textContent = level;
  $("#levelup-rank").textContent = rank;
  overlay.hidden = false;
  setTimeout(() => { overlay.hidden = true; }, 2200);
}
