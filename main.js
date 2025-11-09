(function () {
  // Year stamps (optional)
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const yearRF = document.getElementById("yearRF");
  if (yearRF) yearRF.textContent = new Date().getFullYear();

  // Elements
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("mobileNav");
  const backdrop = document.getElementById("mobileBackdrop");
  const closeBtn = document.getElementById("closeMenu");
  const html = document.documentElement;

  if (!btn || !panel || !backdrop) return;

  // We animate via translate, not display
  panel.classList.remove("hidden");

  // Use the same offset the header uses
  const CLOSED = "translate-y-[-120%]";
  const OPEN = "translate-y-0";

  // Ensure initial state/ARIA
  btn.setAttribute("aria-expanded", "false");
  panel.setAttribute("aria-hidden", "true");
  backdrop.classList.add("hidden");
  panel.classList.add(CLOSED);
  panel.classList.remove(OPEN);

  function openMenu() {
    panel.classList.remove(CLOSED);
    panel.classList.add(OPEN);
    backdrop.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    html.classList.add("overflow-hidden");
  }

  function closeMenu() {
    panel.classList.add(CLOSED);
    panel.classList.remove(OPEN);
    backdrop.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    html.classList.remove("overflow-hidden");
  }

  function toggleMenu() {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    expanded ? closeMenu() : openMenu();
  }

  // Wire up
  btn.addEventListener("click", toggleMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  backdrop.addEventListener("click", closeMenu);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  panel
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", closeMenu));
})();

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = ["#how", "#models", "#about"];
  sections.forEach((sel) => {
    const root = document.querySelector(sel);
    if (!root) return;
    if (reduce) {
      root.querySelectorAll("[data-animate]").forEach((el) => {
        el.style.opacity = 1;
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target;
            const delay = el.getAttribute("data-delay") || 0;
            el.style.setProperty("--delay", `${delay}ms`);
            el.classList.add("animate-fade-up");
            el.style.opacity = 1;
            io.unobserve(el);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    root.querySelectorAll("[data-animate]").forEach((el) => io.observe(el));
  });
})();

(function () {
  // Guard: need Chart.js
  if (!window.Chart) return;

  const el = (id) => document.getElementById(id);
  const form = el("rf-calc-form");
  const startAmount = el("startAmount");
  const duration = el("duration");
  const durationType = el("durationType");
  const roi = el("roi");
  const currencySel = el("currency");
  const result = el("result");
  const btn = el("calcBtn");

  const donutCtx = document.getElementById("rf-donut").getContext("2d");
  const lineCtx = document.getElementById("rf-line").getContext("2d");
  let donutChart, lineChart;

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function fmtCurrency(val, code) {
    const locales = { ILS: "he-IL", USD: "en-US", EUR: "de-DE" };
    return new Intl.NumberFormat(locales[code] || "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(val);
  }

  function calc() {
    const start = Math.max(0, parseFloat(startAmount.value || "0"));
    const durInput = Math.max(1, parseFloat(duration.value || "1"));
    const durType = durationType.value;
    const apr = Math.max(0, parseFloat(roi.value || "0")) / 100;
    const code = currencySel.value;

    const months = durType === "years" ? durInput * 12 : durInput;
    const monthlyRate = Math.pow(1 + apr, 1 / 12) - 1;

    let total = start;
    const values = [];
    const labels = [];
    const startYear = new Date().getFullYear();

    for (let i = 0; i < months; i++) {
      total *= 1 + monthlyRate;
      // sample once per year or at the end
      if (i % 12 === 0 || i === months - 1) {
        values.push(Number(total.toFixed(2)));
        labels.push(String(startYear + Math.floor(i / 12)));
      }
    }

    const interest = Math.max(0, total - start);

    // Render Donut
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(donutCtx, {
      type: "doughnut",
      data: {
        labels: ["סכום התחלתי", "ריבית מצטברת"],
        datasets: [
          {
            data: [start, interest],
            backgroundColor: ["#bd8604", "#012b1a"],
            borderColor: ["#bd8604", "#012b1a"],
            borderWidth: 1,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        animation: prefersReduced
          ? false
          : { animateRotate: true, duration: 800 },
        plugins: {
          legend: { position: "bottom", labels: { color: "#fefefe" } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${fmtCurrency(ctx.parsed, code)}`,
            },
          },
        },
      },
    });

    // Render Line
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "ערך השקעה",
            data: values,
            borderColor: "#bd8604",
            backgroundColor: "rgba(189,134,4,0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        animation: prefersReduced ? false : { duration: 900 },
        scales: {
          x: {
            title: { display: true, text: "שנה", color: "#fefefe" },
            ticks: { color: "#fefefe" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
          y: {
            title: { display: true, text: "שווי השקעה", color: "#fefefe" },
            ticks: {
              color: "#fefefe",
              callback: (v) => fmtCurrency(v, code),
            },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
        plugins: {
          legend: { labels: { color: "#fefefe" } },
          tooltip: {
            callbacks: { label: (ctx) => fmtCurrency(ctx.parsed.y, code) },
          },
        },
      },
    });

    result.textContent = `השקעה זו תהיה שווה: ${fmtCurrency(total, code)}`;
  }

  // Events
  [startAmount, duration, durationType, roi, currencySel].forEach((inp) => {
    inp.addEventListener("input", calc);
    inp.addEventListener("change", calc);
  });
  btn.addEventListener("click", calc);

  // Initial render
  calc();
})();

// --- Properties filtering ---
document.addEventListener("DOMContentLoaded", () => {
  const filters = document.getElementById("propFilters");
  if (!filters) return;

  const btns = Array.from(filters.querySelectorAll(".prop-filter"));
  const cards = Array.from(document.querySelectorAll(".project-card"));
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Normalize: remove any stray color classes so JS can control state cleanly
  btns.forEach((b) => {
    b.classList.remove(
      "text-[#fefefe]/90",
      "text-[#fefefe]/80",
      "text-[#fefefe]",
      "bg-[#bd8604]",
      "text-[#012b1a]"
    );
    b.classList.add("text-[#fefefe]/80"); // base (inactive)
    b.setAttribute("aria-pressed", "false");
  });

  function setActive(btn) {
    btns.forEach((b) => {
      const isActive = b === btn;
      b.setAttribute("aria-pressed", String(isActive));
      b.classList.toggle("active", isActive);

      // Colors
      if (isActive) {
        b.classList.add("bg-[#bd8604]", "text-[#012b1a]");
        b.classList.remove("text-[#fefefe]/80");
      } else {
        b.classList.remove("bg-[#bd8604]", "text-[#012b1a]");
        b.classList.add("text-[#fefefe]/80");
      }
    });
  }

  function showCard(card) {
    card.classList.remove("hidden");
    if (reduceMotion) return;
    card.style.opacity = "0";
    card.style.transition = "opacity .2s ease";
    requestAnimationFrame(() => {
      card.style.opacity = "1";
    });
  }

  function hideCard(card) {
    if (reduceMotion) {
      card.classList.add("hidden");
      return;
    }
    card.style.transition = "opacity .2s ease";
    card.style.opacity = "0";
    // Wait for fade then hide
    setTimeout(() => {
      card.classList.add("hidden");
    }, 200);
  }

  function applyFilter(key) {
    const k = (key || "all").toLowerCase();
    cards.forEach((card) => {
      const status = (card.getAttribute("data-status") || "").toLowerCase();
      const shouldShow = k === "all" ? true : status === k;
      if (shouldShow) {
        showCard(card);
      } else {
        hideCard(card);
      }
    });
  }

  // Click handling (delegation)
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".prop-filter");
    if (!btn) return;
    const key = btn.getAttribute("data-filter");
    setActive(btn);
    applyFilter(key);
    history.replaceState(null, "", "#" + key); // optional hash sync
  });

  // Init from hash or default "all"
  const initial = (location.hash || "#all").slice(1);
  const initialBtn =
    btns.find((b) => b.getAttribute("data-filter") === initial) || btns[0];
  setActive(initialBtn);
  applyFilter(initialBtn.getAttribute("data-filter"));
});

// Privacy Policy === Scroll-Spy for Table of Contents ===
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll("aside nav a");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute("id");
      const link = document.querySelector(`aside nav a[href="#${id}"]`);
      if (entry.isIntersecting) {
        navLinks.forEach((a) =>
          a.classList.remove("text-primary", "font-bold")
        );
        link.classList.add("text-primary", "font-bold");
      }
    });
  },
  {
    threshold: 0.45,
    rootMargin: "-10% 0px -55% 0px", // triggers a bit before midpoint
  }
);

sections.forEach((section) => observer.observe(section));

// Blog Page Script--year
document.getElementById("yearRF").textContent = new Date().getFullYear();

document.getElementById("year").textContent = new Date().getFullYear();
