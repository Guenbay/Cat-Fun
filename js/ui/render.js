/** Reines DOM-Zeichnen: bekommt State, schreibt Markup, kennt keine Spiellogik. */

import { RARITIES } from "../core/rarity.js";
import { ACHIEVEMENTS } from "../game/achievements.js";
import { isQuestDone } from "../game/quests.js";

const $ = sel => document.querySelector(sel);
const binds = name => document.querySelectorAll(`[data-bind="${name}"]`);

export function setBind(name, value) {
  binds(name).forEach(el => { el.textContent = value; });
}

/* ---------- Kopf & Spieler ---------- */

export function renderHeader(state, derived) {
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

  $("#chip-streak")?.classList.toggle("is-hot", state.streak >= 3);
}

/* ---------- Fakten-Karte ---------- */

export function renderFact(entry, { xpGained, isNew, combo }) {
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
    pill.textContent = RARITIES[entry.rarity].label;
  }
  if (idEl) idEl.textContent = `${entry.id} · ${entry.source === "offline" ? "offline" : "catfact.ninja"}`;
  if (xpEl) {
    const parts = [`+${xpGained} XP`];
    if (combo > 1) parts.push(`${combo}× Combo`);
    if (!isNew) parts.push("Dublette");
    xpEl.textContent = parts.join(" · ");
  }

  card.classList.remove("is-fresh");
  void card.offsetWidth;
  card.classList.add("is-fresh");
}

export function renderFavoriteButton(isFavorite) {
  const btn = $("#btn-favorite");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(Boolean(isFavorite)));
  btn.querySelector(".btn__label").textContent = isFavorite ? "Favorit ✓" : "Favorit";
}

/* ---------- Tagesaufgaben ---------- */

export function renderQuests(quests, progress, claimed) {
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
        <span class="quest__reward">+${q.xp} XP · ${q.coins} 🐟</span>
      </div>
      <div class="quest__bar"><span></span></div>
      <span class="quest__count"></span>`;

    li.querySelector(".quest__name").textContent = (done ? "✓ " : "") + q.name;
    li.querySelector(".quest__bar span").style.width = (have / q.goal) * 100 + "%";
    li.querySelector(".quest__count").textContent = `${have} / ${q.goal}`;
    list.appendChild(li);
  }
}

/* ---------- Achievements ---------- */

export function renderAchievements(unlocked) {
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
    li.querySelector(".badge__name").textContent = a.name;
    li.querySelector(".badge__desc").textContent = a.desc;
    list.appendChild(li);
  }

  setBind("achDone", unlocked.length);
  setBind("achTotal", ACHIEVEMENTS.length);
}

/* ---------- Sammlung ---------- */

export function renderCollection(facts, filter, onToggleFavorite) {
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
        <button class="card__fav" type="button" aria-pressed="${Boolean(f.favorite)}" title="Als Favorit markieren">⭐</button>
      </div>
      <p class="card__text"></p>
      <span class="card__meta"></span>`;

    li.querySelector(".card__rarity").textContent = RARITIES[f.rarity].label;
    li.querySelector(".card__text").textContent = f.text;
    li.querySelector(".card__meta").textContent = `${f.id} · ${f.seen}× gezogen`;
    li.querySelector(".card__fav").addEventListener("click", () => onToggleFavorite(f.key));

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
