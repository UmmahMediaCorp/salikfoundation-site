/* Salik Foundation — cinematic story edition
   Lenis smooth scroll + GSAP ScrollTrigger (hero word entrance, pinned
   "one book" interlude, horizontal filmstrip, reveals, count-ups)
   + accessible Toast notifications + helpful form validation.
   Degrades gracefully: reduced-motion or missing libs => everything visible. */

/* ============================================================
   TOAST NOTIFICATIONS — accessible, app-wide (window.Toast)
   types: success | error | warning | info
   ============================================================ */
window.Toast = (function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ICONS = { success: "✓", error: "!", warning: "⚠", info: "ℹ" };
  var DURATION = { success: 5000, info: 6000, warning: 8000, error: 0 }; /* 0 = until dismissed */
  var container;

  function ensure() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "toasts";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
    return container;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function show(type, title, message, opts) {
    opts = opts || {};
    var c = ensure();
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", (type === "error" || type === "warning") ? "alert" : "status");
    el.innerHTML =
      '<span class="toast__icon" aria-hidden="true">' + ICONS[type] + "</span>" +
      '<div class="toast__body">' +
        (title ? '<p class="toast__title">' + esc(title) + "</p>" : "") +
        (message ? '<p class="toast__msg">' + esc(message) + "</p>" : "") +
      "</div>" +
      '<button class="toast__close" type="button" aria-label="Dismiss notification">×</button>';
    c.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("toast--in"); });

    var dur = (opts.duration != null) ? opts.duration : DURATION[type];
    var timer = null, remaining = dur, startedAt = 0;
    function remove() {
      el.classList.remove("toast--in"); el.classList.add("toast--out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduce ? 250 : 360);
    }
    function play() { if (!dur) return; startedAt = Date.now(); timer = setTimeout(remove, remaining); }
    function pause() { if (!dur || !timer) return; clearTimeout(timer); timer = null; remaining -= (Date.now() - startedAt); }
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", play);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", play);
    el.querySelector(".toast__close").addEventListener("click", function () { clearTimeout(timer); remove(); });
    play();
    return remove;
  }

  return {
    success: function (t, m, o) { return show("success", t, m, o); },
    error:   function (t, m, o) { return show("error", t, m, o); },
    warning: function (t, m, o) { return show("warning", t, m, o); },
    info:    function (t, m, o) { return show("info", t, m, o); }
  };
})();

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.getElementById("nav");
  var progressBar = document.getElementById("progressBar");

  function setNav(y) {
    if (y > 12) nav.classList.add("nav--scrolled");
    else nav.classList.remove("nav--scrolled");
  }
  function setProgress(y) {
    if (!progressBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
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

  /* ---------- Request-a-Qur'an form: helpful validation + toasts ---------- */
  function initForm() {
    var form = document.getElementById("reqform");
    var done = document.getElementById("reqdone");
    if (!form || !done) return;

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var fields = [
      { name: "name",    msg: "Please tell us your name — we'd love to address your Qur'an personally." },
      { name: "email",   email: true,
        empty: "We'll need your email so we can confirm your request.",
        msg: "That email doesn't look right — please enter it like name@example.com." },
      { name: "address", msg: "Please add a street address so we know where to mail your Qur'an." },
      { name: "city",    msg: "Which city should we send it to?" },
      { name: "region",  msg: "Please add your province or state." },
      { name: "postal",  msg: "Please add your postal or ZIP code so it arrives at the right place." },
      { name: "country", msg: "Please add your country." }
    ];

    fields.forEach(function (f) {
      var input = form.elements[f.name];
      if (!input) return;
      var wrap = input.closest(".field");
      var err = document.createElement("span");
      err.className = "field__error";
      err.id = "err-" + f.name;
      err.setAttribute("role", "alert");
      wrap.appendChild(err);
      input.setAttribute("aria-describedby", err.id);
      input.addEventListener("input", function () {
        if (wrap.classList.contains("field--invalid")) {
          wrap.classList.remove("field--invalid");
          input.setAttribute("aria-invalid", "false");
          err.textContent = "";
        }
      });
    });

    function val(n) { var el = form.elements[n]; return el ? String(el.value).trim() : ""; }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var firstBad = null, badCount = 0;

      fields.forEach(function (f) {
        var input = form.elements[f.name];
        var wrap = input.closest(".field");
        var err = document.getElementById("err-" + f.name);
        var v = val(f.name);
        var message = "";
        if (f.email) {
          if (!v) message = f.empty;
          else if (!emailRe.test(v)) message = f.msg;
        } else if (!v) {
          message = f.msg;
        }
        if (message) {
          badCount++;
          wrap.classList.add("field--invalid");
          input.setAttribute("aria-invalid", "true");
          err.textContent = message;
          if (!firstBad) firstBad = input;
        }
      });

      if (badCount) {
        if (firstBad) firstBad.focus();
        window.Toast.error(
          "Just a couple of details",
          badCount === 1
            ? "One field needs a quick fix — it's highlighted above."
            : "Please fix the " + badCount + " highlighted fields so we can send your Qur'an."
        );
        return;
      }

      var lines = [
        "As-salāmu ʿalaykum — a new free Qur'an request from salikfoundation.com:", "",
        "Name:    " + val("name"), "Email:   " + val("email"), "Address: " + val("address"),
        "City:    " + val("city"), "Region:  " + val("region"), "Postal:  " + val("postal"),
        "Country: " + val("country"), "", "Note: " + (val("note") || "—")
      ];
      window.location.href = "mailto:info@salikfoundation.com?subject=" +
        encodeURIComponent("Free Qur'an request — " + (val("name") || "website")) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      window.Toast.success("Request received", "In shaa Allah, your Qur'an is on its way.");
      form.hidden = true; done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  }

  /* ---------- Fallback: no motion / no GSAP ---------- */
  if (reduce || !window.gsap) {
    showAll();
    setNav(window.scrollY);
    setProgress(window.scrollY);
    window.addEventListener("scroll", function () { setNav(window.scrollY); setProgress(window.scrollY); }, { passive: true });
    initForm();
    return;
  }

  /* ---------- Animated path ---------- */
  gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", function () {
      ScrollTrigger.update();
      var y = lenis.actualScroll || window.scrollY;
      setNav(y); setProgress(y);
    });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener("scroll", function () { setNav(window.scrollY); setProgress(window.scrollY); }, { passive: true });
  }
  setNav(window.scrollY);
  setProgress(window.scrollY);

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

  /* Hero title — word-by-word entrance */
  function splitTitle(el) {
    var words = [];
    function process(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (k) {
        if (k.nodeType === 3) {
          var parts = k.textContent.split(/\s+/).filter(Boolean);
          if (!parts.length) return;
          var frag = document.createDocumentFragment();
          parts.forEach(function (w) {
            var outer = document.createElement("span"); outer.className = "hw";
            var inner = document.createElement("span"); inner.className = "hw__i"; inner.textContent = w;
            outer.appendChild(inner);
            frag.appendChild(outer);
            frag.appendChild(document.createTextNode(" "));
            words.push(inner);
          });
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1) { process(k); }
      });
    }
    process(el);
    return words;
  }
  var titleEl = document.getElementById("heroTitle");
  if (titleEl) {
    var words = splitTitle(titleEl);
    gsap.fromTo(words, { yPercent: 112 }, { yPercent: 0, duration: 1.05, ease: "power4.out", stagger: 0.075, delay: 0.2 });
  }

  /* "One book" interlude — pinned, scrubbed beats */
  var lines = gsap.utils.toArray(".interlude__line");
  if (lines.length) {
    gsap.set(lines, { opacity: 0, y: 44 });
    var itl = gsap.timeline({
      scrollTrigger: { trigger: ".interlude", start: "top top", end: "+=200%", scrub: 0.6, pin: true, anticipatePin: 1 }
    });
    lines.forEach(function (l, i) {
      itl.to(l, { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, i * 1.15);
      if (i < lines.length - 1) itl.to(l, { opacity: 0.22, duration: 0.7 }, i * 1.15 + 1.0);
    });
    itl.to({}, { duration: 0.6 }); /* hold on the final gold line */
  }

  /* Horizontal filmstrip — pinned scroll-driven strip (desktop only) */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", function () {
    var strip = document.getElementById("filmstrip");
    var track = document.getElementById("filmTrack");
    if (!strip || !track) return;
    strip.classList.add("filmstrip--pinned");
    strip.scrollLeft = 0;
    var amt = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 64); };
    gsap.to(track, {
      x: function () { return -amt(); }, ease: "none",
      scrollTrigger: { trigger: ".moments", start: "top top", end: function () { return "+=" + amt(); }, scrub: 0.5, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
    });
    return function () { strip.classList.remove("filmstrip--pinned"); gsap.set(track, { x: 0 }); };
  });

  gsap.utils.toArray(".reveal").forEach(function (el) {
    if (el.querySelector(".reveal-stagger")) { gsap.set(el, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(el, { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  gsap.utils.toArray(".cards, .stats").forEach(function (group) {
    var items = group.querySelectorAll(".reveal-stagger");
    if (!items.length) return;
    gsap.fromTo(items, { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: group, start: "top 85%" } });
  });

  /* framed-image scale-in (skip filmstrip — it has its own motion) */
  gsap.utils.toArray(".frame img").forEach(function (img) {
    if (img.closest(".filmstrip")) return;
    gsap.fromTo(img, { scale: 1.07 }, { scale: 1, duration: 1.3, ease: "power3.out", scrollTrigger: { trigger: img, start: "top 92%" } });
  });

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

  /* Smart mobile donate dock */
  var dock = document.querySelector(".dock-cta");
  if (dock) {
    document.body.classList.add("smart-dock");
    var heroEl = document.querySelector(".hero");
    var heroH = heroEl ? heroEl.offsetHeight : 600;
    var lastY = 0, zoneCount = 0;
    function refreshDock(dir) {
      var y = (lenis && lenis.actualScroll) || window.scrollY;
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
