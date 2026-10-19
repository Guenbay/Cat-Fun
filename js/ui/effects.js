/**
 * Visuelle Spielereien: treibende Pfoten im Hintergrund und
 * ein Partikel-Ausbruch beim Ziehen eines Fakts.
 */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Hintergrund-Pfoten ---------- */

export function startPawField(canvas) {
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let paws = [];
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round((window.innerWidth * window.innerHeight) / 52000);
    paws = Array.from({ length: Math.min(Math.max(count, 10), 34) }, spawn);
  }

  function spawn() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 8 + Math.random() * 16,
      vy: -(0.08 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.14,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.004,
      alpha: 0.04 + Math.random() * 0.09,
    };
  }

  function drawPaw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "#ffffff";

    const s = p.size;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.22, s * 0.42, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    const toes = [[-0.38, -0.3, 0.17], [-0.13, -0.45, 0.17], [0.13, -0.45, 0.17], [0.38, -0.3, 0.17]];
    for (const [tx, ty, tr] of toes) {
      ctx.beginPath();
      ctx.ellipse(tx * s, ty * s, tr * s, tr * s * 1.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of paws) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      if (p.y < -p.size * 2) {
        p.y = window.innerHeight + p.size * 2;
        p.x = Math.random() * window.innerWidth;
      }
      if (p.x < -p.size * 2) p.x = window.innerWidth + p.size;
      if (p.x > window.innerWidth + p.size * 2) p.x = -p.size;
      drawPaw(p);
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

/* ---------- Partikel-Ausbruch ---------- */

const GLYPHS = {
  common:    ["🐾"],
  rare:      ["🐾", "✨"],
  epic:      ["✨", "🔮", "🐾"],
  legendary: ["👑", "✨", "🌟", "🐾", "🎉"],
};

export function burst(originEl, rarity = "common") {
  if (REDUCED || !originEl) return;

  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const glyphs = GLYPHS[rarity] || GLYPHS.common;
  const count = { common: 10, rare: 16, epic: 24, legendary: 42 }[rarity] || 10;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "spark";
    el.textContent = glyphs[i % glyphs.length];
    el.style.left = cx + "px";
    el.style.top = cy + "px";
    el.style.fontSize = 0.7 + Math.random() * 1.1 + "rem";
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 90 + Math.random() * (rarity === "legendary" ? 320 : 170);

    el.animate(
      [
        { transform: "translate(-50%, -50%) scale(.3) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 60}px)) scale(1.1) rotate(${(Math.random() - 0.5) * 720}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 700, easing: "cubic-bezier(.17,.67,.35,1)" }
    ).onfinish = () => el.remove();
  }
}

/** Kurzes Aufblitzen eines Zählers. */
export function popChip(el) {
  if (!el || REDUCED) return;
  el.classList.remove("is-pop");
  void el.offsetWidth;
  el.classList.add("is-pop");
}
