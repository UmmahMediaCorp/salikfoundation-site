/* Salik Foundation — Qur'an distribution site (vanilla, no deps) */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav scrolled state ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 12) nav.classList.add("nav--scrolled");
    else nav.classList.remove("nav--scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Count-up for stats ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-to"), 10);
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target.toLocaleString("en-CA") + suffix; return; }
    var start = null, dur = 1600;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-CA") + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Reveal on scroll (+ trigger count-up) ---------- */
  var items = document.querySelectorAll(".reveal, .reveal-stagger");
  var counters = document.querySelectorAll(".stat__num[data-to]");

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
    counters.forEach(countUp);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var group = el.parentElement ? el.parentElement.querySelectorAll(".reveal-stagger") : [];
        if (el.classList.contains("reveal-stagger") && group.length) {
          var idx = Array.prototype.indexOf.call(group, el);
          el.style.transitionDelay = (idx * 80) + "ms";
        }
        el.classList.add("is-in");
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Request-a-Qur'an form ---------- */
  /* Interim: composes an email to info@salikfoundation.com and shows a
     confirmation. Swap for a real endpoint (Formspree / Salik backend)
     when available — see data-* TODO in the spec. */
  var form = document.getElementById("reqform");
  var done = document.getElementById("reqdone");
  if (form && done) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var v = function (n) {
        var el = form.elements[n];
        return el ? String(el.value).trim() : "";
      };
      var lines = [
        "As-salāmu ʿalaykum — a new free Qur'an request from salikfoundation.com:",
        "",
        "Name:    " + v("name"),
        "Email:   " + v("email"),
        "Address: " + v("address"),
        "City:    " + v("city"),
        "Region:  " + v("region"),
        "Postal:  " + v("postal"),
        "Country: " + v("country"),
        "",
        "Note: " + (v("note") || "—")
      ];
      var subject = "Free Qur'an request — " + (v("name") || "website");
      var mailto = "mailto:info@salikfoundation.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      // Open the user's mail client with the request prefilled.
      window.location.href = mailto;

      // Show the confirmation regardless (the request is captured visually).
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  }
})();
