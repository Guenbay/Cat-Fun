const host = () => document.getElementById("toasts");

/** Zeigt eine kurze Meldung unten rechts. */
export function toast({ icon = "🐾", title, body = "", gold = false, ttl = 4200 }) {
  const root = host();
  if (!root) return;

  const el = document.createElement("div");
  el.className = "toast" + (gold ? " toast--gold" : "");
  el.innerHTML = `
    <span class="toast__icon">${icon}</span>
    <span>
      <span class="toast__title"></span>
      ${body ? '<span class="toast__body"></span>' : ""}
    </span>`;

  el.querySelector(".toast__title").textContent = title;
  if (body) el.querySelector(".toast__body").textContent = body;

  root.appendChild(el);

  setTimeout(() => {
    el.classList.add("is-out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, ttl);
}
