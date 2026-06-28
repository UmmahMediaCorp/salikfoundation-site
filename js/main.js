/* Salik Foundation — editorial Qur'an-distribution site
   Lenis smooth scroll + GSAP ScrollTrigger (reveals, framed-image scale-in, count-ups).
   Degrades gracefully: reduced-motion or missing libs => everything visible. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.getElementById("nav");

  function setNav(y) {
    if (y > 12) nav.classList.add("nav--scrolled");
    else nav.classList.remove("nav--scrolled");
  }

  function countUpInstant(el) {
    var t = parseInt(el.getAttribute("data-to"), 10);
    if (isNaN(t)) return;
    el.textContent = t.toLocaleString("en-CA") + (el.getAttribute("data-suffix") || "");
  }

  function showAll() {
    document.querySelectorAll(".reveal,.reveal-stagger").forEach(function (e) { e.classList.add("is-in"); });
    document.querySelectorAll(".stat__num[data-to]").forEach(countUpInstant);
  }

  /* ---------- Request-a-Qur'an form (every path) ---------- */
  function initForm() {
    var form = document.getElementById("reqform");
    var done = document.getElementById("reqdone");
    if (!form || !done) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var v = function (n) { var el = form.elements[n]; return el ? String(el.value).trim() : ""; };
      var lines = [
        "As-salāmu ʿalaykum — a new free Qur'an request from salikfoundation.com:", "",
        "Name:    " + v("name"), "Email:   " + v("email"), "Address: " + v("address"),
        "City:    " + v("city"), "Region:  " + v("region"), "Postal:  " + v("postal"),
        "Country: " + v("country"), "", "Note: " + (v("note") || "—")
      ];
      var mailto = "mailto:info@salikfoundation.com?subject=" +
        encodeURIComponent("Free Qur'an request — " + (v("name") || "website")) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mailto;
      form.hidden = true; done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  }

  /* ---------- Fallback: no motion / no GSAP ---------- */
  if (reduce || !window.gsap) {
    showAll();
    setNav(window.scrollY);
    window.addEventListener("scroll", function () { setNav(window.scrollY); }, { passive: true });
    initForm();
    return;
  }

  /* ---------- Animated path ---------- */
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", function () { ScrollTrigger.update(); setNav(lenis.actualScroll || window.scrollY); });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener("scroll", function () { setNav(window.scrollY); }, { passive: true });
  }
  setNav(window.scrollY);

  // Smooth in-page anchors with nav offset
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else target.scrollIntoView();
    });
  });

  // Generic reveals (skip stagger/grid containers — show them, animate their children)
  gsap.utils.toArray(".reveal").forEach(function (el) {
    if (el.matches(".grid3") || el.querySelector(".reveal-stagger")) { gsap.set(el, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(el, { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // Staggered groups: give cards + reach stats
  gsap.utils.toArray(".cards, .stats").forEach(function (group) {
    var items = group.querySelectorAll(".reveal-stagger");
    if (!items.length) return;
    gsap.fromTo(items, { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 85%" } });
  });

  // Moments gallery: stagger the framed photos
  var grid = document.querySelector(".grid3");
  if (grid) {
    gsap.fromTo(grid.querySelectorAll(".frame"), { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: grid, start: "top 85%" } });
  }

  // Framed images: subtle "window opening" scale-in
  gsap.utils.toArray(".frame img").forEach(function (img) {
    gsap.fromTo(img, { scale: 1.07 }, { scale: 1, duration: 1.3, ease: "power3.out",
      scrollTrigger: { trigger: img, start: "top 92%" } });
  });

  // Count-ups
  gsap.utils.toArray(".stat__num[data-to]").forEach(function (el) {
    var t = parseInt(el.getAttribute("data-to"), 10);
    if (isNaN(t)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: function () {
        gsap.to(obj, { v: t, duration: 1.6, ease: "power2.out",
          onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString("en-CA") + suffix; } });
      }
    });
  });

  // Smart mobile donate dock: hide while reading down, reveal on scroll-up / idle,
  // and disappear entirely inside the donate sections (no content overlap).
  var dock = document.querySelector(".dock-cta");
  if (dock) {
    document.body.classList.add("smart-dock");
    var heroEl = document.querySelector(".hero");
    var heroH = heroEl ? heroEl.offsetHeight : 600;
    var lastY = 0, zoneCount = 0;
    function refreshDock(dir) {
      var y = (lenis && lenis.actualScroll) || window.scrollY;
      // Hidden in the hero and inside donate sections; otherwise reveal only on scroll-up.
      var hide = y < heroH * 0.65 || zoneCount > 0 || dir === "down";
      dock.classList.toggle("dock-cta--hidden", hide);
    }
    var zones = document.querySelectorAll(".give, .request, .finalcta, .footer");
    if ("IntersectionObserver" in window && zones.length) {
      var zo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { zoneCount += e.isIntersecting ? 1 : -1; });
        if (zoneCount < 0) zoneCount = 0;
        refreshDock("idle");
      }, { threshold: 0 });
      zones.forEach(function (z) { zo.observe(z); });
    }
    function onDockScroll() {
      var y = (lenis && lenis.actualScroll) || window.scrollY;
      var dir = y > lastY + 2 ? "down" : (y < lastY - 2 ? "up" : "idle");
      if (dir !== "idle") { lastY = y; refreshDock(dir); }
    }
    if (lenis) lenis.on("scroll", onDockScroll);
    else window.addEventListener("scroll", onDockScroll, { passive: true });
    refreshDock("idle");
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  initForm();
})();
