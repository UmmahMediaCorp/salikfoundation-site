/* ============================================================
   SALIK FOUNDATION — interaction layer
   Lenis smooth scroll + GSAP ScrollTrigger choreography
   Progressive enhancement: page is fully usable without JS/CDNs.
   ============================================================ */
(function () {
  "use strict";

  const doc = document.documentElement;
  // ?static (or ?nofx) → render everything visible with no smooth-scroll (for capture/debug)
  const STATIC = /[?&](static|nofx)/.test(location.search);
  if (STATIC) {
    doc.classList.add("is-static");
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => i.removeAttribute("loading"));
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || STATIC;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const canAnimate = hasGSAP && !reduce;

  // Only hide reveal elements (via CSS) if we can actually animate them back in.
  if (canAnimate) {
    doc.classList.add("js");
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    window.lenis = lenis;
    if (hasGSAP) {
      // Drive Lenis from the GSAP ticker ONLY (avoids double-stepping)
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------------- Mobile menu ---------------- */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  function openMenu() { nav.classList.add("is-open"); menu.classList.add("is-open"); burger.setAttribute("aria-expanded", "true"); menu.setAttribute("aria-hidden", "false"); lenis && lenis.stop(); }
  function closeMenu() { nav.classList.remove("is-open"); menu.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); menu.setAttribute("aria-hidden", "true"); lenis && lenis.start(); }
  burger && burger.addEventListener("click", () => nav.classList.contains("is-open") ? closeMenu() : openMenu());

  /* ---------------- Anchor scrolling ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { duration: 1.2 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------------- Nav scrolled state ---------------- */
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add("nav--scrolled");
    else nav.classList.remove("nav--scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- Lazy-play videos in view ---------------- */
  const ambient = document.querySelectorAll(".ambient-video");
  const heroVideo = document.getElementById("heroVideo");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (!v.src && v.dataset.src) v.src = v.dataset.src;
          const p = v.play(); if (p && p.catch) p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "250px 0px" });
    ambient.forEach((v) => io.observe(v));
    if (heroVideo) io.observe(heroVideo);
  } else {
    ambient.forEach((v) => { if (v.dataset.src) { v.src = v.dataset.src; v.play && v.play(); } });
  }

  /* ---------------- Magnetic buttons (fine pointers only) ---------------- */
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.22}px, ${my * 0.32}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = "translate(0,0)"; });
    });
  }

  /* ---------------- Inventory carousel (drag + arrows) ---------------- */
  const track = document.getElementById("invTrack");
  if (track) {
    if (window.matchMedia("(pointer:fine)").matches) {
      track.classList.add("is-grab");
      let down = false, sx = 0, sl = 0, moved = false;
      track.addEventListener("pointerdown", (e) => { down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.classList.add("is-grabbing"); });
      window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = sl - dx; });
      window.addEventListener("pointerup", () => { down = false; track.classList.remove("is-grabbing"); });
      track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    }
    const card = track.querySelector(".invcard");
    const step = () => ((card ? card.getBoundingClientRect().width : 300) + 20) * 1.5;
    document.getElementById("invPrev")?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    document.getElementById("invNext")?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
  }

  /* ---------------- Scroll-reveal choreography ---------------- */
  function buildReveals() {
    if (!canAnimate) return;

    // IntersectionObserver reveals — observe EVERY element individually (incl.
    // stagger items) so they fire reliably however you arrive: natural scroll,
    // scroll-snap jump, nav-anchor click, or mobile fling.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        gsap.to(el, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", delay: parseFloat(el.dataset.revd || 0) });
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -3% 0px" });

    gsap.utils.toArray(".reveal").forEach((el) => {
      if (el.closest(".hero")) return;
      gsap.set(el, { y: 26, opacity: 0 });
      io.observe(el);
    });
    gsap.utils.toArray(".pillars, .story__stats, .story__quote, .visit__details").forEach((group) => {
      [...group.querySelectorAll(".reveal-stagger")].forEach((it, i) => {
        gsap.set(it, { y: 30, opacity: 0 });
        it.dataset.revd = (i * 0.08).toFixed(2);
        io.observe(it);
      });
    });

    // Safety net: if anything is still hidden after load (e.g. already on-screen
    // before observers settle), reveal what's in view.
    setTimeout(() => {
      document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => {
        if (getComputedStyle(el).opacity === "0") {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) gsap.to(el, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
        }
      });
    }, 1400);

    // Hero footage parallax
    if (heroVideo) {
      gsap.to(heroVideo, {
        yPercent: 16, scale: 1.08, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    }

    // Showcase footage parallax
    var showcaseVid = document.querySelector(".showcase__bg .ambient-video");
    if (showcaseVid) {
      gsap.to(showcaseVid, {
        yPercent: 12, scale: 1.12, ease: "none",
        scrollTrigger: { trigger: ".showcase", start: "top bottom", end: "bottom top", scrub: true },
      });
    }
  }

  /* ---------------- Hero intro timeline ---------------- */
  function heroIntro() {
    if (!canAnimate) return;
    gsap.set(".hero__title .line__in", { yPercent: 110 });
    gsap.set([".hero__sub", ".hero__actions"], { opacity: 1, clearProps: "" });

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".hero__kicker", { y: 18, opacity: 0, duration: 0.9 }, 0.05)
      .to(".hero__title .line__in", { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0.15)
      .from(".hero__sub", { y: 24, opacity: 0, duration: 0.9 }, 0.55)
      .from(".hero__actions", { y: 24, opacity: 0, duration: 0.9 }, 0.7)
      .from(".hero__foot", { y: 18, opacity: 0, duration: 0.9 }, 0.85);
  }

  // Pre-hide hero copy so it doesn't flash before the intro runs
  if (canAnimate) gsap.set([".hero__sub", ".hero__actions"], { opacity: 1 });

  /* ---------------- Contact form (mailto) ---------------- */
  const form = document.getElementById("bookForm");
  const note = document.getElementById("formNote");
  form && form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if (!name || !email) {
      note.textContent = "Please add your name and an email address.";
      note.classList.add("is-error");
      return;
    }
    note.classList.remove("is-error");
    const topic = form.topic.value;
    const msg = form.message.value.trim();
    const first = name.split(" ")[0];
    note.textContent = `JazakAllah khayr, ${first} — your message is ready to send.`;
    const subject = encodeURIComponent("Salik Foundation enquiry — " + topic);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\nMessage: ${msg || "—"}`);
    setTimeout(() => { window.location.href = `mailto:info@salikfoundation.com?subject=${subject}&body=${body}`; }, 700);
    form.reset();
  });

  /* ---------------- Preloader → reveal ---------------- */
  const pre = document.getElementById("preloader");
  const fill = document.getElementById("preloaderFill");
  let prog = 0;
  const tick = setInterval(() => {
    prog = Math.min(prog + Math.random() * 16 + 4, 92);
    if (fill) fill.style.width = prog + "%";
  }, 150);

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(tick);
    if (fill) fill.style.width = "100%";
    setTimeout(() => {
      pre && pre.classList.add("is-done");
      heroIntro();
      buildReveals();
      if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 200);
    }, 260);
  }
  window.addEventListener("load", () => setTimeout(finish, 350));
  setTimeout(finish, 2800); // hard cap so the page never stays hidden
})();
