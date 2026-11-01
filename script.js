/* Arnav Jain · portfolio interactions. Vanilla JS, no dependencies. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMAIL = "arnav.jain6505@gmail.com";
  const RESUME = $("#resume-link").href;
  const AWS_CERT = "https://drive.google.com/file/d/1UxcF-54jJ9YMOR-Fj7qA3F9nrYTrPa-Y/view?usp=drive_link";

  /* ---------- keyboard hint: ⌘K on Apple devices, Ctrl K elsewhere ---------- */
  const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  $$(".kbd-hint").forEach((k) => (k.textContent = isApple ? "⌘ K" : "Ctrl K"));

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- copy email ---------- */
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast("Copied " + EMAIL);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      toast(ok ? "Copied " + EMAIL : EMAIL);
    }
  }
  $$(".copy-email").forEach((b) => b.addEventListener("click", copyEmail));

  /* ---------- theme ---------- */
  function currentTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) { /* storage blocked: theme still applies */ }
    $('meta[name="theme-color"]').setAttribute("content", t === "light" ? "#f6f7f9" : "#0a0c10");
  }
  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  }
  $("#theme-toggle").addEventListener("click", toggleTheme);

  /* ---------- mobile menu ---------- */
  const menuBtn = $("#menu-toggle");
  const menu = $("#mobile-menu");
  menuBtn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", menu).forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- scroll progress ---------- */
  const progress = $("#progress-bar");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveal, count-up numbers, comparison bars ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const start = performance.now();
    const dur = 1200;
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  function fillBars(root) {
    $$(".bar span", root).forEach((s) => {
      s.style.width = (parseFloat(s.dataset.value) / parseFloat(s.dataset.max)) * 100 + "%";
    });
  }

  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add("in");
        $$("[data-count]", el).forEach(countUp);
        fillBars(el);
        revealObs.unobserve(el);
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((el) => revealObs.observe(el));

    // highlight the nav link of the section in view
    const links = $$(".nav-links a");
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.map((a) => $(a.getAttribute("href"))).filter(Boolean).forEach((s) => navObs.observe(s));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
    fillBars(document);
  }

  /* ---------- spotlight that follows the pointer on cards ---------- */
  $$(".card").forEach((c) =>
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--x", e.clientX - r.left + "px");
      c.style.setProperty("--y", e.clientY - r.top + "px");
    })
  );

  /* =====================================================================
     Live inspection simulation
     Four lighting views of one chip face, a scan, attention weights per
     view, and an OK / NG verdict, filling a tray like the operator screen.
     ===================================================================== */
  const demo = (() => {
    const root = $("#views");
    if (!root) return null;

    const canvases = $$("canvas", root);
    const figs = $$(".view", root);
    const attn = $$(".attn i", root);
    const badge = $("#v-badge");
    const label = $("#v-label");
    const ms = $("#v-ms");
    const conf = $("#v-conf");
    const trayEl = $("#tray");
    const cInsp = $("#c-insp");
    const cNg = $("#c-ng");

    const CELLS = 48;
    for (let i = 0; i < CELLS; i++) trayEl.appendChild(document.createElement("i"));
    const cells = $$("i", trayEl);

    const SIZE = 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctxs = canvases.map((c) => {
      c.width = SIZE * dpr;
      c.height = SIZE * dpr;
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      return ctx;
    });

    // One palette per lighting view, roughly how each exposure renders a chip.
    const VIEWS = [
      { tray: "#1a1e26", ceramic: "#7a7f89", gold: "#d8b25a", mark: "#2b2b2b", whisker: "#f0d58e" }, // bright field
      { tray: "#04050a", ceramic: "#14161c", gold: "#2f2612", mark: "#f4f7ff", whisker: "#f4f7ff", edge: "#9fb3c8" }, // dark field
      { tray: "#10131a", ceramic: ["#3e434d", "#8d939e"], gold: ["#7d6531", "#e2c06e"], mark: "#161616", whisker: "#e0c68e" }, // low angle
      { tray: "#0c0e13", ceramic: "#2b2e36", gold: "#f6e7b9", mark: "#4a3a1c", whisker: "#fff6d6" }, // coaxial
    ];
    // How visible each defect is in each view; `primary` is the view that shows it best.
    const DEFECTS = {
      Whisker: { vis: [0.3, 1, 0.45, 0.35], primary: 1 },
      Scratch: { vis: [0.45, 0.3, 1, 0.55], primary: 2 },
      Chipping: { vis: [1, 0.65, 0.75, 0.9], primary: 0 },
      "Foreign material": { vis: [0.55, 0.35, 0.5, 1], primary: 3 },
    };
    const NAMES = Object.keys(DEFECTS);

    const rand = (a, b) => a + Math.random() * (b - a);
    let idx = 0, inspected = 0, flagged = 0, busy = false, timer = null, visible = true, current = null;

    function makeChip(forceGood) {
      return {
        pmt: Math.random() < 0.5,
        defect: !forceGood && Math.random() < 0.22 ? NAMES[Math.floor(Math.random() * NAMES.length)] : null,
        g: { wx: rand(0.3, 0.7), ang: rand(-0.7, 0.7), corner: Math.floor(rand(0, 4)), fx: rand(0.35, 0.65), fy: rand(0.35, 0.65), tilt: rand(-2.5, 2.5) },
      };
    }

    function fill(ctx, spec, x, y, w, h) {
      if (Array.isArray(spec)) {
        const gr = ctx.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, spec[0]);
        gr.addColorStop(1, spec[1]);
        ctx.fillStyle = gr;
      } else {
        ctx.fillStyle = spec;
      }
      ctx.fillRect(x, y, w, h);
    }

    function drawChip(ctx, v, chip, vi) {
      const S = SIZE, x0 = 22, y0 = 22, w = 76, h = 76;
      ctx.fillStyle = v.tray;
      ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.rotate((chip.g.tilt * Math.PI) / 180);
      ctx.translate(-S / 2, -S / 2);

      const inset = chip.pmt ? 12 : 4; // PMT: ceramic border + gold; FMT: almost full gold
      fill(ctx, v.ceramic, x0, y0, w, h);
      fill(ctx, v.gold, x0 + inset, y0 + inset, w - 2 * inset, h - 2 * inset);
      if (v.edge) {
        ctx.strokeStyle = v.edge;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
        ctx.strokeRect(x0 + inset + 0.5, y0 + inset + 0.5, w - 2 * inset - 1, h - 2 * inset - 1);
        ctx.globalAlpha = 1;
      }

      if (chip.defect) {
        const a = DEFECTS[chip.defect].vis[vi];
        const g = chip.g;
        ctx.globalAlpha = a;
        if (chip.defect === "Whisker") {
          ctx.strokeStyle = v.whisker;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          const sx = x0 + w * g.wx, sy = y0 + inset;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + 10 * g.ang, sy - 14, sx + 18 * g.ang + 4, sy - 26);
          ctx.stroke();
        } else if (chip.defect === "Scratch") {
          ctx.strokeStyle = v.mark;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x0 + inset + 6, y0 + h * g.fy - 12);
          ctx.lineTo(x0 + w - inset - 6, y0 + h * g.fy + 14 * g.ang);
          ctx.stroke();
        } else if (chip.defect === "Chipping") {
          ctx.globalAlpha = 0.5 + 0.5 * a;
          ctx.fillStyle = v.tray;
          const cx = g.corner % 2 === 0 ? x0 : x0 + w;
          const cy = g.corner < 2 ? y0 : y0 + h;
          const dx = g.corner % 2 === 0 ? 1 : -1;
          const dy = g.corner < 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dy);
          ctx.lineTo(cx + dx * 17, cy - dy);
          ctx.lineTo(cx + dx * 7, cy + dy * 7);
          ctx.lineTo(cx - dx, cy + dy * 15);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = v.mark;
          ctx.beginPath();
          ctx.ellipse(x0 + w * g.fx, y0 + h * g.fy, 5, 3.5, g.ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function drawAll(scan) {
      ctxs.forEach((ctx, i) => {
        drawChip(ctx, VIEWS[i], current, i);
        if (scan !== undefined) {
          const y = scan * SIZE;
          const gr = ctx.createLinearGradient(0, y - 16, 0, y + 2);
          gr.addColorStop(0, "rgba(94,234,212,0)");
          gr.addColorStop(1, "rgba(94,234,212,0.6)");
          ctx.fillStyle = gr;
          ctx.fillRect(0, y - 16, SIZE, 18);
        }
      });
    }

    function next() {
      if (busy) return;
      busy = true;
      if (idx === 0 && inspected > 0) cells.forEach((c) => (c.className = ""));
      current = makeChip(false);
      figs.forEach((f) => f.classList.remove("hot"));
      badge.className = "badge";
      badge.textContent = "SCAN";
      label.textContent = "Reading 4 lighting views…";
      ms.textContent = "… ms";
      conf.style.width = "0";
      cells[idx].classList.add("cur");

      const dur = reduceMotion ? 0 : 900;
      const t0 = performance.now();
      (function frame(now) {
        const p = dur ? Math.min(1, (now - t0) / dur) : 1;
        if (p < 1) {
          drawAll(p);
          requestAnimationFrame(frame);
        } else {
          drawAll();
          finish();
        }
      })(t0);
    }

    function finish() {
      let w = [0, 1, 2, 3].map(() => rand(0.8, 1.2));
      if (current.defect) w[DEFECTS[current.defect].primary] *= rand(3, 4.5);
      const sum = w.reduce((a, b) => a + b, 0);
      w = w.map((x) => x / sum);
      attn.forEach((b, i) => (b.style.width = Math.round(w[i] * 100) + "%"));

      const ng = !!current.defect;
      const c = ng ? rand(0.82, 0.99) : rand(0.93, 0.995);
      badge.className = "badge " + (ng ? "ng" : "ok");
      badge.textContent = ng ? "NG" : "OK";
      label.textContent = (ng ? current.defect : "Good chip") + " · " + (c * 100).toFixed(1) + "% sure";
      ms.textContent = Math.round(rand(141, 173)) + " ms";
      conf.style.width = (c * 100).toFixed(1) + "%";
      if (ng) figs[DEFECTS[current.defect].primary].classList.add("hot");

      cells[idx].classList.remove("cur");
      cells[idx].classList.add(ng ? "ng" : "ok");
      inspected += 1;
      if (ng) flagged += 1;
      cInsp.textContent = inspected;
      cNg.textContent = flagged;
      idx = (idx + 1) % CELLS;
      busy = false;
    }

    function schedule() {
      clearTimeout(timer);
      if (reduceMotion || !visible || document.hidden) return;
      timer = setTimeout(() => { next(); schedule(); }, 1900);
    }

    // first frame: an idle good chip
    current = makeChip(true);
    drawAll();

    $("#next-chip").addEventListener("click", () => { next(); schedule(); });
    document.addEventListener("visibilitychange", schedule);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) schedule(); else clearTimeout(timer);
      }, { threshold: 0.2 }).observe(root.closest(".demo"));
    } else {
      schedule();
    }

    return { next: () => { next(); schedule(); } };
  })();

  /* =====================================================================
     Command palette (Ctrl/⌘ K, or "/")
     ===================================================================== */
  const go = (sel) => () => {
    const el = $(sel);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };
  const openUrl = (url) => () => window.open(url, "_blank", "noopener");

  const commands = [
    { label: "Go to Impact", hint: "section", run: go("#impact") },
    { label: "Go to About", hint: "section", run: go("#about") },
    { label: "Go to Experience", hint: "section", run: go("#work") },
    { label: "Go to Projects", hint: "section", run: go("#projects") },
    { label: "Go to Skills", hint: "section", run: go("#skills") },
    { label: "Go to Contact", hint: "section", run: go("#contact") },
    { label: "Open resume", hint: "link", run: openUrl(RESUME) },
    { label: "Copy email address", hint: "action", run: copyEmail },
    { label: "Switch light / dark theme", hint: "action", run: toggleTheme },
    { label: "Inspect a chip in the live demo", hint: "demo", run: () => { go("#top")(); if (demo) demo.next(); } },
    { label: "SecureFile Vault overview", hint: "project", run: () => { location.href = "./securefile/"; } },
    { label: "View AWS certificate", hint: "link", run: openUrl(AWS_CERT) },
    { label: "Open GitHub", hint: "link", run: openUrl("https://github.com/ArnavJain42") },
    { label: "Open LinkedIn", hint: "link", run: openUrl("https://www.linkedin.com/in/arnav-jain-8aa943156") },
  ];

  const pal = $("#palette");
  const input = $("#palette-input");
  const list = $("#palette-list");
  let filtered = commands, sel = 0, lastFocus = null;

  function render() {
    list.textContent = "";
    if (!filtered.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No matches";
      list.appendChild(li);
      input.removeAttribute("aria-activedescendant");
      return;
    }
    filtered.forEach((c, i) => {
      const li = document.createElement("li");
      li.id = "cmd-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === sel));
      const name = document.createElement("span");
      name.textContent = c.label;
      const hint = document.createElement("small");
      hint.textContent = c.hint;
      li.append(name, hint);
      li.addEventListener("mousemove", () => { if (sel !== i) { sel = i; updateSel(); } });
      li.addEventListener("click", () => runCmd(c));
      list.appendChild(li);
    });
    input.setAttribute("aria-activedescendant", "cmd-" + sel);
  }

  function updateSel() {
    $$("li[role=option]", list).forEach((li, i) => li.setAttribute("aria-selected", String(i === sel)));
    const cur = $("#cmd-" + sel);
    if (cur) {
      cur.scrollIntoView({ block: "nearest" });
      input.setAttribute("aria-activedescendant", cur.id);
    }
  }

  function filter() {
    const q = input.value.trim().toLowerCase();
    filtered = q ? commands.filter((c) => (c.label + " " + c.hint).toLowerCase().includes(q)) : commands;
    sel = 0;
    render();
  }

  function openPalette() {
    lastFocus = document.activeElement;
    pal.hidden = false;
    input.value = "";
    filter();
    input.focus();
    document.body.style.overflow = "hidden";
  }

  function closePalette() {
    pal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function runCmd(c) {
    closePalette();
    c.run();
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length;
      updateSel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[sel]) runCmd(filtered[sel]);
    } else if (e.key === "Escape") {
      closePalette();
    } else if (e.key === "Tab") {
      e.preventDefault(); // keep focus inside the dialog
    }
  });
  pal.addEventListener("click", (e) => { if (e.target === pal) closePalette(); });
  $("#open-palette").addEventListener("click", openPalette);

  document.addEventListener("keydown", (e) => {
    const a = document.activeElement;
    const typing = a && (/^(input|textarea|select)$/i.test(a.tagName) || a.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (pal.hidden) openPalette(); else closePalette();
    } else if (e.key === "/" && !typing && pal.hidden) {
      e.preventDefault();
      openPalette();
    } else if (e.key === "Escape" && !pal.hidden) {
      closePalette();
    }
  });
})();
