/* ─────────────────────────────────────────────────────────────
   Advanced BioAnalytic — Scroll Engine
   Lenis + GSAP ScrollTrigger + Canvas frame playback
   ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────── */
  const FRAME_COUNT  = 226;
  const FRAME_SPEED  = 2.0;   // animation completes at 50% scroll
  const IMAGE_SCALE  = 0.86;  // padded-cover scale (0.82–0.90)
  const TOTAL_FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) =>
    `frames/frame_${String(i + 1).padStart(4, '0')}.webp`
  );

  /* ── DOM refs ────────────────────────────────────────────── */
  const loader       = document.getElementById('loader');
  const loaderBar    = document.getElementById('loader-bar');
  const loaderPct    = document.getElementById('loader-percent');
  const canvas       = document.getElementById('canvas');
  const canvasWrap   = document.getElementById('canvas-wrap');
  const scrollCont   = document.getElementById('scroll-container');
  const heroSection  = document.getElementById('hero');
  const darkOverlay  = document.getElementById('dark-overlay');
  const marqueeWrap  = document.getElementById('marquee-wrap');
  const marqueeText  = document.getElementById('marquee-text');
  const forkLeft     = document.getElementById('fork-left');
  const forkRight    = document.getElementById('fork-right');
  const forkDivider  = document.getElementById('fork-divider');
  const header       = document.getElementById('site-header');
  const hamburger    = document.getElementById('hamburger');
  const nav          = document.getElementById('site-nav');
  const ctx          = canvas.getContext('2d');

  /* ── State ───────────────────────────────────────────────── */
  const frames   = new Array(FRAME_COUNT).fill(null);
  let loadedCount = 0;
  let currentFrame = 0;
  let bgColor    = '#1A1614';
  let raf;

  /* ── Canvas sizing ───────────────────────────────────────── */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    drawFrame(currentFrame);
  }
  window.addEventListener('resize', resizeCanvas);

  /* ── Frame draw ──────────────────────────────────────────── */
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ── BG color sampling ───────────────────────────────────── */
  function sampleBgColor(index) {
    if (index % 20 !== 0) return;
    const img = frames[index];
    if (!img) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = offscreen.height = 4;
    const c = offscreen.getContext('2d');
    c.drawImage(img, 0, 0, 4, 4);
    const d = c.getImageData(0, 0, 4, 4).data;
    const r = Math.round(d[0]), g = Math.round(d[1]), b = Math.round(d[2]);
    bgColor = `rgb(${r},${g},${b})`;
  }

  /* ── Frame preloader ─────────────────────────────────────── */
  function loadFrames() {
    const firstBatch = Math.min(12, FRAME_COUNT);

    function loadOne(i) {
      if (i >= FRAME_COUNT) return;
      const img = new Image();
      img.onload = () => {
        frames[i] = img;
        loadedCount++;
        const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
        loaderBar.style.width = pct + '%';
        loaderPct.textContent = pct + '%';

        if (loadedCount === FRAME_COUNT) {
          setTimeout(hideLoader, 200);
        }
        if (i >= firstBatch) {
          loadOne(i + 1);
        }
      };
      img.onerror = () => { loadedCount++; loadOne(i + 1); };
      img.src = TOTAL_FRAMES[i];
    }

    // Load first batch in parallel
    for (let i = 0; i < firstBatch; i++) loadOne(i);
    // Load rest sequentially after first
    loadOne(firstBatch);
  }

  function hideLoader() {
    loader.classList.add('hidden');
    drawFrame(0);
    initAll();
  }

  /* ── Lenis smooth scroll ─────────────────────────────────── */
  let lenis;
  function initLenis() {
    lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Section positioning ─────────────────────────────────── */
  function positionSections() {
    document.querySelectorAll('.scroll-section').forEach(section => {
      const enter = parseFloat(section.dataset.enter);
      const leave  = parseFloat(section.dataset.leave);
      const mid    = (enter + leave) / 2;
      section.style.top = mid + '%';
    });
  }

  /* ── Frame-to-scroll binding ─────────────────────────────── */
  function initFrameScroll() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
        if (index !== currentFrame) {
          currentFrame = index;
          sampleBgColor(currentFrame);
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => drawFrame(currentFrame));
        }
      }
    });
  }

  /* ── Hero phrase scroll animation ───────────────────────────── */
  function initHeroPhrases() {
    const phrase1 = document.getElementById('hero-phrase-1');
    const phrase2 = document.getElementById('hero-phrase-2');
    if (!phrase1) return;

    // Fade phrase 1 in on initial load
    gsap.fromTo(phrase1,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1.1, delay: 0.4, ease: 'power2.out' }
    );

    if (!phrase2) return;

    // Use GSAP ticker (already running for Lenis) — reads lenis.scroll directly
    const heroH = heroSection.offsetHeight;
    gsap.ticker.add(() => {
      const scroll = lenis ? lenis.scroll : 0;
      if (scroll >= heroH) {
        phrase1.style.opacity = '0';
        phrase2.style.opacity = '0';
        return;
      }
      const p = scroll / heroH; // 0 → 1 across hero

      // Phrase 1: full 0–38%, fade out 38–52%
      let op1 = p <= 0.38 ? 1
              : p <= 0.52 ? 1 - (p - 0.38) / 0.14
              : 0;
      op1 = Math.max(0, Math.min(1, op1));
      phrase1.style.opacity   = op1;
      phrase1.style.transform = `translateY(${(1 - op1) * 18}px)`;

      // Phrase 2: fade in 54–62%, full 62–80%, fade out 80–92%
      let op2 = p < 0.54  ? 0
              : p <= 0.62 ? (p - 0.54) / 0.08
              : p <= 0.80 ? 1
              : p <= 0.92 ? 1 - (p - 0.80) / 0.12
              : 0;
      op2 = Math.max(0, Math.min(1, op2));
      phrase2.style.opacity   = op2;
      phrase2.style.transform = `translateY(${(1 - op2) * -18}px)`;
    });
  }

  /* ── Hero circle-wipe + fade ─────────────────────────────── */
  function initHeroTransition() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const p = self.progress;
        // Hero fades quickly
        heroSection.style.opacity = Math.max(0, 1 - p * 20);
        // Canvas circle-wipe reveals
        const wp = Math.min(1, Math.max(0, (p - 0.008) / 0.07));
        const r  = wp * 80;
        canvasWrap.style.clipPath = `circle(${r}% at 50% 50%)`;
      }
    });
  }

  /* ── Header scroll state ─────────────────────────────────── */
  function initHeader() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top-=10',
      onEnter: () => header.classList.add('scrolled'),
      onLeaveBack: () => header.classList.remove('scrolled')
    });
  }

  /* ── Dark overlay ────────────────────────────────────────── */
  function initDarkOverlay(enter, leave) {
    const fadeRange = 0.03;
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const p = self.progress;
        let opacity = 0;
        if (p >= enter - fadeRange && p <= enter) {
          opacity = (p - (enter - fadeRange)) / fadeRange;
        } else if (p > enter && p < leave) {
          opacity = 0.9;
        } else if (p >= leave && p <= leave + fadeRange) {
          opacity = 0.9 * (1 - (p - leave) / fadeRange);
        }
        darkOverlay.style.opacity = opacity;
      }
    });
  }

  /* ── Marquee ─────────────────────────────────────────────── */
  function initMarquee(showFrom, showTo) {
    const fadeRange = 0.04;
    // CSS animation handles continuous left-scroll; only control opacity here
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const p = self.progress;
        let op = 0;
        if (p >= showFrom && p <= showTo) op = 1;
        else if (p >= showFrom - fadeRange && p < showFrom) op = (p - (showFrom - fadeRange)) / fadeRange;
        else if (p > showTo && p <= showTo + fadeRange) op = 1 - (p - showTo) / fadeRange;
        marqueeWrap.style.opacity = op;
      }
    });
  }

  /* ── Fork panels ─────────────────────────────────────────── */
  function initForkPanels(enterAt, leaveAt) {
    const fadeIn  = 0.03;
    ScrollTrigger.create({
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const p = self.progress;
        let op = 0;
        if (p >= enterAt && p <= leaveAt) {
          op = Math.min(1, (p - enterAt) / fadeIn);
        } else if (p > leaveAt) {
          op = 0;
        }
        forkLeft.style.opacity   = op;
        forkRight.style.opacity  = op;
        forkDivider.style.opacity = op * 0.6;
        if (op > 0.05) {
          forkLeft.style.pointerEvents  = 'auto';
          forkRight.style.pointerEvents = 'auto';
        } else {
          forkLeft.style.pointerEvents  = 'none';
          forkRight.style.pointerEvents = 'none';
        }
      }
    });
  }

  /* ── Section animations ──────────────────────────────────── */
  function initSectionAnimations() {
    document.querySelectorAll('.scroll-section').forEach(section => {
      const type    = section.dataset.animation || 'fade-up';
      const persist = section.dataset.persist === 'true';
      const enter   = parseFloat(section.dataset.enter) / 100;
      const leave   = parseFloat(section.dataset.leave) / 100;
      const children = Array.from(section.querySelectorAll(
        '.section-label, .section-heading, .section-body, .section-note, ' +
        '.cta-button, .stat, .fork-direction, .fork-label, .fork-sub, .fork-cta'
      ));

      // Build timeline
      const tl = gsap.timeline({ paused: true });
      switch (type) {
        case 'fade-up':
          gsap.set(children, { y: 50, opacity: 0 });
          tl.to(children, { y: 0, opacity: 1, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
          break;
        case 'slide-left':
          gsap.set(children, { x: -80, opacity: 0 });
          tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
          break;
        case 'slide-right':
          gsap.set(children, { x: 80, opacity: 0 });
          tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
          break;
        case 'scale-up':
          gsap.set(children, { scale: 0.88, opacity: 0 });
          tl.to(children, { scale: 1, opacity: 1, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
          break;
        case 'stagger-up':
          gsap.set(children, { y: 60, opacity: 0 });
          tl.to(children, { y: 0, opacity: 1, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
          break;
      }

      let played = false;
      let faded  = false;

      ScrollTrigger.create({
        trigger: scrollCont,
        start: 'top top',
        end: 'bottom bottom',
        scrub: false,
        onUpdate(self) {
          const p = self.progress;
          if (p >= enter && p <= leave) {
            if (!played) { played = true; faded = false; tl.play(); }
            section.style.opacity = '1';
            section.style.pointerEvents = 'auto';
          } else if (p < enter || p > leave) {
            if (!faded && !persist) {
              faded = true;
              played = false;
              tl.reverse();
            }
            if (!persist || p < enter) {
              section.style.opacity = '0';
              section.style.pointerEvents = 'none';
            }
          }
        }
      });
    });
  }

  /* ── Counter animations ──────────────────────────────────── */
  function initCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
      const target   = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || '0');
      ScrollTrigger.create({
        trigger: el.closest('.scroll-section'),
        start: 'top 80%',
        once: true,
        onEnter() {
          gsap.fromTo(el,
            { textContent: 0 },
            {
              textContent: target,
              duration: 2,
              ease: 'power1.out',
              snap: { textContent: decimals === 0 ? 1 : 0.01 },
              onUpdate() {
                el.textContent = decimals === 0
                  ? Math.round(parseFloat(el.textContent))
                  : parseFloat(el.textContent).toFixed(decimals);
              }
            }
          );
        }
      });
    });
  }

  /* ── Mobile nav ──────────────────────────────────────────── */
  function initMobileNav() {
    if (!hamburger) return;
    const navBg = document.getElementById('mobile-nav-bg');
    hamburger.addEventListener('click', () => {
      const opening = !nav.classList.contains('open');
      nav.classList.toggle('open');
      if (navBg) navBg.classList.toggle('open', opening);
      document.body.classList.toggle('nav-open', opening);
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        if (navBg) navBg.classList.remove('open');
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* ── Init all ────────────────────────────────────────────── */
  function initAll() {
    gsap.registerPlugin(ScrollTrigger);

    // On mobile: skip the entire scroll engine and canvas frame loader.
    // CSS hides canvas/marquee/fork-panels; sections are position:static.
    if (window.innerWidth <= 900) {
      initMobileNav();
      initCounters();

      // Speed up the vertical logo animation video — wait for canplay so mobile browsers honour it
      var logoVid = document.querySelector('.mobile-logo-video');
      if (logoVid) {
        logoVid.addEventListener('canplay', function () {
          logoVid.playbackRate = 2.0;
        });
      }

      // Header darkens on scroll
      window.addEventListener('scroll', function () {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }, { passive: true });

      // Dynamic text: fade-up each section's content as it enters the viewport
      document.querySelectorAll('.scroll-section:not(.desktop-only)').forEach(function (section) {
        var els = Array.from(section.querySelectorAll(
          '.section-label, .section-heading, .section-body, .section-note, .stat, .cta-button'
        ));
        if (!els.length) return;
        gsap.from(els, {
          opacity: 0,
          y: 22,
          duration: 0.75,
          stagger: 0.1,
          ease: 'power2.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            once: true
          }
        });
      });

      ScrollTrigger.refresh();
      return;
    }

    resizeCanvas();
    initLenis();
    positionSections();
    initHeroTransition();
    initFrameScroll();
    initHeader();
    initDarkOverlay(0.46, 0.62);  // dark overlay for stats section
    initMarquee(0.44, 0.62);      // marquee visible 44–62%
    initForkPanels(0.54, 0.88);   // fork panels 54–88%
    initSectionAnimations();
    initCounters();
    initMobileNav();
    ScrollTrigger.refresh();
  }

  /* ── Boot ────────────────────────────────────────────────── */
  // On mobile: skip 226-frame download entirely; show page immediately.
  if (window.innerWidth > 900) {
    loadFrames();
  } else {
    loader.classList.add('hidden');
    initAll();
  }

})();
