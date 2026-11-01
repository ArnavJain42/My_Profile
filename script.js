/* Arnav Jain · portfolio. Vanilla JS, no dependencies. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;

  /* ---------- entrances: once, as each part arrives ---------- */
  if (hasIO && !reduce) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    $$("[data-reveal]").forEach((el) => io.observe(el));
  } else {
    $$("[data-reveal]").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- section bar: the link of the section in view is marked; a menu on small screens ---------- */
  (() => {
    const nav = $("#bar-links");
    const menu = $(".menu-btn");
    if (!nav) return;
    const links = $$("a", nav);
    const close = () => { nav.classList.remove("is-open"); menu.setAttribute("aria-expanded", "false"); };
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    links.forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    if (!hasIO) return;
    const mark = (id) => links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) mark(e.target.id);
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => io.observe(s));
  })();

  /* ---------- signature: the four lighting views crossfade on the first door ---------- */
  (() => {
    const layers = $$(".lights img");
    if (layers.length < 2 || reduce) return;
    let i = 0, timer = null;
    const step = () => {
      layers[i].classList.remove("is-on");
      i = (i + 1) % layers.length;
      layers[i].classList.add("is-on");
    };
    const start = () => { if (!timer && !document.hidden) timer = setInterval(step, 5500); };
    const stop = () => { clearInterval(timer); timer = null; };
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
  })();

  /* ---------- the moving picture: play only while it is on screen ---------- */
  (() => {
    const v = $("#line-video");
    if (!v || reduce) return; // reduced motion: the poster frame stays
    if (!hasIO) { v.play().catch(() => {}); return; }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.25 }).observe(v);
  })();

  /* ---------- projects: preview anchored to the row ---------- */
  (() => {
    const root = $(".ledger");
    if (!root) return;
    const frame = $(".preview", root);
    const picture = $("img", frame);
    const wide = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1101px)");
    const show = (row) => {
      if (!wide.matches || !row.dataset.preview) return; // keep the current picture
      if (picture.getAttribute("src") === row.dataset.preview) return;
      frame.classList.remove("is-open");                 // close, swap, open: a short shutter
      window.setTimeout(() => { picture.src = row.dataset.preview; frame.classList.add("is-open"); }, reduce ? 0 : 160);
    };
    $$(".row", root).forEach((row) => {
      row.addEventListener("pointerenter", () => show(row));
      row.addEventListener("focus", () => show(row));
    });
  })();

  /* =====================================================================
     The live thing: inspect one simulated chip.
     Four lighting views are drawn, the model's attention per view is
     shown, and the verdict fills the next pocket of the tray.
     ===================================================================== */
  (() => {
    const canvases = $$(".view canvas");
    if (!canvases.length) return;
    const wbars = $$(".wbar i");
    const wnums = $$(".wnum");
    const word = $("#v-word");
    const label = $("#v-label");
    const ms = $("#v-ms");
    const cInsp = $("#c-insp");
    const cNg = $("#c-ng");
    const trayEl = $("#tray");
    const button = $("#next-chip");

    const CELLS = 48;
    for (let k = 0; k < CELLS; k++) trayEl.appendChild(document.createElement("i"));
    const cells = $$("i", trayEl);

    const SIZE = 240;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctxs = canvases.map((c) => {
      c.width = SIZE * dpr;
      c.height = SIZE * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      return ctx;
    });

    // how each light renders a chip
    const LIGHTS = [
      { tray: "#1a1e26", ceramic: "#7a7f89", gold: "#d8b25a", mark: "#2b2b2b", whisker: "#f0d58e" },
      { tray: "#04050a", ceramic: "#14161c", gold: "#2f2612", mark: "#f4f7ff", whisker: "#f4f7ff", edge: "#9fb3c8" },
      { tray: "#10131a", ceramic: ["#3e434d", "#8d939e"], gold: ["#7d6531", "#e2c06e"], mark: "#161616", whisker: "#e0c68e" },
      { tray: "#0c0e13", ceramic: "#2b2e36", gold: "#f6e7b9", mark: "#4a3a1c", whisker: "#fff6d6" },
    ];
    // visibility of each defect under each light; `best` is the light that shows it most
    const DEFECTS = {
      Whisker: { vis: [0.3, 1, 0.45, 0.35], best: 1 },
      Scratch: { vis: [0.45, 0.3, 1, 0.55], best: 2 },
      Chipping: { vis: [1, 0.65, 0.75, 0.9], best: 0 },
      Stain: { vis: [0.55, 0.35, 0.5, 1], best: 3 },
    };
    const NAMES = Object.keys(DEFECTS);
    const rand = (a, b) => a + Math.random() * (b - a);

    let idx = 0, checked = 0, rejected = 0, busy = false, timer = null, visible = false, chip;

    const makeChip = (good) => ({
      pmt: Math.random() < 0.5,
      defect: !good && Math.random() < 0.22 ? NAMES[Math.floor(Math.random() * NAMES.length)] : null,
      g: { wx: rand(0.3, 0.7), ang: rand(-0.7, 0.7), corner: Math.floor(rand(0, 4)), fx: rand(0.35, 0.65), fy: rand(0.35, 0.65), tilt: rand(-2.5, 2.5) },
    });

    function paint(ctx, spec, x, y, w, h) {
      if (Array.isArray(spec)) {
        // a directional light: two tones blended across the part (a drawn picture, not page styling)
        const half = w / 2;
        ctx.fillStyle = spec[0];
        ctx.fillRect(x, y, half, h);
        ctx.fillStyle = spec[1];
        ctx.fillRect(x + half, y, w - half, h);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = spec[1];
        ctx.fillRect(x + half * 0.6, y, half * 0.4, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = spec;
        ctx.fillRect(x, y, w, h);
      }
    }

    function draw(ctx, L, c, vi) {
      const S = SIZE, x0 = 44, y0 = 44, w = 152, h = 152;
      ctx.fillStyle = L.tray;
      ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.rotate((c.g.tilt * Math.PI) / 180);
      ctx.translate(-S / 2, -S / 2);
      const inset = c.pmt ? 24 : 8; // ceramic border with gold, or gold almost edge to edge
      paint(ctx, L.ceramic, x0, y0, w, h);
      paint(ctx, L.gold, x0 + inset, y0 + inset, w - 2 * inset, h - 2 * inset);
      if (L.edge) {
        ctx.strokeStyle = L.edge;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
        ctx.strokeRect(x0 + inset + 1, y0 + inset + 1, w - 2 * inset - 2, h - 2 * inset - 2);
        ctx.globalAlpha = 1;
      }
      if (c.defect) {
        const a = DEFECTS[c.defect].vis[vi], g = c.g;
        ctx.globalAlpha = a;
        if (c.defect === "Whisker") {
          ctx.strokeStyle = L.whisker;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          const sx = x0 + w * g.wx, sy = y0 + inset;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + 20 * g.ang, sy - 28, sx + 36 * g.ang + 8, sy - 52);
          ctx.stroke();
        } else if (c.defect === "Scratch") {
          ctx.strokeStyle = L.mark;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x0 + inset + 12, y0 + h * g.fy - 24);
          ctx.lineTo(x0 + w - inset - 12, y0 + h * g.fy + 28 * g.ang);
          ctx.stroke();
        } else if (c.defect === "Chipping") {
          ctx.globalAlpha = 0.5 + 0.5 * a;
          ctx.fillStyle = L.tray;
          const cx = g.corner % 2 === 0 ? x0 : x0 + w, cy = g.corner < 2 ? y0 : y0 + h;
          const dx = g.corner % 2 === 0 ? 1 : -1, dy = g.corner < 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(cx - dx * 2, cy - dy * 2);
          ctx.lineTo(cx + dx * 34, cy - dy * 2);
          ctx.lineTo(cx + dx * 14, cy + dy * 14);
          ctx.lineTo(cx - dx * 2, cy + dy * 30);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = L.mark;
          ctx.beginPath();
          ctx.ellipse(x0 + w * g.fx, y0 + h * g.fy, 10, 7, g.ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function drawAll(scan) {
      ctxs.forEach((ctx, i) => {
        draw(ctx, LIGHTS[i], chip, i);
        if (scan !== undefined) {
          ctx.fillStyle = "rgba(31, 45, 230, 0.55)";
          ctx.fillRect(0, scan * SIZE - 3, SIZE, 6);
        }
      });
    }

    function next() {
      if (busy) return;
      busy = true;
      if (idx === 0 && checked > 0) cells.forEach((c) => (c.className = ""));
      chip = makeChip(false);
      word.textContent = "…";
      word.classList.remove("is-ng");
      label.textContent = "Reading four lighting views";
      ms.textContent = "Inspecting";
      cells[idx].classList.add("cur");
      const dur = reduce ? 0 : 900, t0 = performance.now();
      (function frame(now) {
        const p = dur ? Math.min(1, (now - t0) / dur) : 1;
        if (p < 1) { drawAll(p); requestAnimationFrame(frame); }
        else { drawAll(); finish(); }
      })(t0);
    }

    function finish() {
      let w = [0, 1, 2, 3].map(() => rand(0.8, 1.2));
      if (chip.defect) w[DEFECTS[chip.defect].best] *= rand(3, 4.5);
      const sum = w.reduce((a, b) => a + b, 0);
      w = w.map((x) => x / sum);
      wbars.forEach((b, i) => (b.style.width = Math.round(w[i] * 100) + "%"));
      wnums.forEach((n, i) => (n.textContent = Math.round(w[i] * 100) + "%"));

      const ng = !!chip.defect;
      const sure = ng ? rand(0.82, 0.99) : rand(0.93, 0.995);
      word.textContent = ng ? "NG" : "OK";
      word.classList.toggle("is-ng", ng);
      label.textContent = (ng ? chip.defect + ", " : "Good chip, ") + (sure * 100).toFixed(1) + "% sure";
      ms.textContent = Math.round(rand(141, 173)) + " ms";

      cells[idx].classList.remove("cur");
      cells[idx].classList.add(ng ? "ng" : "ok");
      checked += 1;
      if (ng) rejected += 1;
      cInsp.textContent = checked;
      cNg.textContent = rejected;
      idx = (idx + 1) % CELLS;
      busy = false;
    }

    function schedule() {
      clearTimeout(timer);
      if (reduce || !visible || document.hidden) return;
      timer = setTimeout(() => { next(); schedule(); }, 2400);
    }

    // start part-way through a tray, so the panel never opens empty
    for (let k = 0; k < 10; k++) { chip = makeChip(false); finish(); }
    drawAll();
    button.addEventListener("click", () => { next(); schedule(); });
    document.addEventListener("visibilitychange", schedule);
    if (hasIO) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) schedule(); else clearTimeout(timer);
      }, { threshold: 0.3 }).observe($(".run"));
    }
  })();
})();
