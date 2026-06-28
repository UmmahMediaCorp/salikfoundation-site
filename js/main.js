/* Salik Foundation — cinematic Qur'an-distribution site
   Lenis smooth scroll + GSAP ScrollTrigger (parallax, reveals, count-ups).
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

  /* ---------- Request-a-Qur'an form (works in every path) ---------- */
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

  /* ---------- Fallback path: no motion / no GSAP ---------- */
  if (reduce || !window.gsap) {
    showAll();
    setNav(window.scrollY);
    window.addEventListener("scroll", function () { setNav(window.scrollY); }, { passive: true });
    initForm();
    return;
  }

  /* ---------- Animated path ---------- */
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll (optional — native scroll if unavailable)
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on("scroll", function () { ScrollTrigger.update(); setNav(lenis.actualScroll || window.scrollY); });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener("scroll", function () { setNav(window.scrollY); }, { passive: true });
  }
  setNav(window.scrollY);

  // Smooth in-page anchor scrolling with nav offset
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

  // Individual reveals (skip stagger containers — show them, animate their children)
  gsap.utils.toArray(".reveal").forEach(function (el) {
    if (el.querySelector(".reveal-stagger")) { gsap.set(el, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(el, { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // Staggered groups
  gsap.utils.toArray(".steps, .cards, .gallery, .stats, .reach__regions").forEach(function (group) {
    var items = group.querySelectorAll(".reveal-stagger");
    if (!items.length) return;
    gsap.fromTo(items, { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 85%" } });
  });

  // Cinematic story panels: parallax image + staggered text
  gsap.utils.toArray(".panel").forEach(function (panel) {
    var img = panel.querySelector(".panel__media img");
    if (img) {
      gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: "none",
        scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true } });
    }
    var inner = panel.querySelector(".panel__inner");
    if (inner) {
      gsap.fromTo(inner.children, { opacity: 0, y: 42 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.1,
          scrollTrigger: { trigger: panel, start: "top 62%" } });
    }
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

  // Recalculate trigger positions once everything (incl. lazy images) has loaded
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  initForm();
})();
