/* ============================================================
   B_R Design System · v1.0 · shared interactions
   Beyond Rational · Aisti
   ============================================================
   Wires up all interactive components on a page by data-attr:
     data-magnetic     · magnetic button
     data-parallax     · cursor-tilt stage
     data-reveal       · char-level reveal on scroll-in
     data-count        · number ticker on scroll-in
     data-stagger      · sibling stagger on scroll-in
     data-ratio        · ratio-bar fill on scroll-in
     data-vbars        · vertical bars rise on scroll-in
     data-tile-stage   · 3D tile cursor follow
     data-config-group · configurator option group
   ============================================================ */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Page loader (once per session) ---------- */
  const loader = document.querySelector('.br-loader');
  if (loader) {
    if (sessionStorage.getItem('brLoaderShown')) {
      loader.remove();
    } else {
      sessionStorage.setItem('brLoaderShown', '1');
      document.body.classList.add('is-loading');
      const counter = loader.querySelector('.br-loader__counter');
      const duration = reduceMotion ? 0 : 1500;
      const dismissAt = reduceMotion ? 200 : 1800;
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      requestAnimationFrame(() => loader.classList.add('is-loading'));

      if (counter) {
        const start = performance.now();
        const step = (now) => {
          const t = Math.min((now - start) / Math.max(duration, 1), 1);
          counter.textContent = Math.round(easeOut(t) * 100).toString().padStart(2, '0');
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }

      setTimeout(() => {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        // Remove from DOM after slide-up finishes so it doesn't block hit-testing
        setTimeout(() => loader.remove(), 1300);
      }, dismissAt);
    }
  }

  /* ---------- Custom cursor + lag + dark detection ---------- */
  const cursor = document.querySelector('.bra-cursor');
  let cx = 0, cy = 0, tx = 0, ty = 0;
  if (cursor && !reduceMotion) {
    document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    const tick = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.querySelectorAll('button, a, input, select, textarea, [data-magnetic]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-large'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-large'));
    });
    const darkSel = '.bra-vault, .bra-surface-oak, .bra-surface-ink, .bra-card--ink, .bra-card--oak, .bra-gallery-data--ink, .bra-gallery-data--oak, .br-logo-hero, [data-on-dark]';
    document.querySelectorAll(darkSel).forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-on-dark'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-on-dark'));
    });
  }



  /* ---------- Parallax stage ---------- */
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const inner = el.querySelector('.bra-parallax-stage__inner');
    if (!inner) return;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = `translate(${x * -18}px, ${y * -18}px) rotateX(${y * 4}deg) rotateY(${x * -4}deg)`;
    });
    el.addEventListener('mouseleave', () => { inner.style.transform = ''; });
  });

  /* ---------- Character reveal (word-level wrap) ----------
     Design-system spec (design-system.html, "Character reveal"): each char
     rises 110% with a 24ms stagger; words stay together, only the line
     wrapper masks. Keep this flat per-char delay matching that spec exactly
     rather than reinterpreting it. */
  var REVEAL_CHAR_DELAY_MS = 24;

  function splitRevealChars(el, text) {
    const wasIn = el.classList.contains('is-in');
    el.classList.remove('is-in');
    el.innerHTML = '';
    const words = text.split(' ');
    let charIdx = 0;
    words.forEach((word, wIdx) => {
      const wWrap = document.createElement('span');
      wWrap.className = 'bra-reveal-word';
      [...word].forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'bra-reveal-char';
        span.style.transitionDelay = `${charIdx * REVEAL_CHAR_DELAY_MS}ms`;
        span.textContent = ch;
        wWrap.appendChild(span);
        charIdx++;
      });
      el.appendChild(wWrap);
      if (wIdx < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
        charIdx++;
      }
    });
    if (wasIn) {
      // Force a reflow so the browser registers the freshly hidden chars
      // before is-in goes back on, otherwise the transition is skipped.
      void el.offsetWidth;
      el.classList.add('is-in');
    }
  }

  // Exposed so br-content.js can re-split a reveal-line's chars after it
  // swaps in the CMS text — otherwise its plain textContent write wipes
  // out the char spans set up below and the line just pops in unanimated.
  // Skip the rebuild entirely when the CMS text matches what's already
  // rendered (the normal case, since the static HTML is written to match
  // its own content.json) — otherwise the line plays its reveal once on
  // load, then immediately replays it once content arrives, looking like
  // it "loads twice".
  window.braSplitRevealText = function (el, text) {
    if (el.textContent === text) return;
    if (reduceMotion) { el.textContent = text; return; }
    splitRevealChars(el, text);
  };

  if (!reduceMotion) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      splitRevealChars(el, el.textContent || '');
    });
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Number ticker ---------- */
  const formatNum = (target, current) =>
    Number.isInteger(target) ? Math.round(current).toString() : current.toFixed(2);
  const tickerIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count || '0');
      const duration = 1400;
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const v = target * ease(t);
        el.textContent = formatNum(target, v);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      tickerIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach((el) => tickerIO.observe(el));

  /* ---------- Stagger reveal ---------- */
  const staggerIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); staggerIO.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-stagger]').forEach((el) => staggerIO.observe(el));

  /* ---------- Ratio bar + vbars ---------- */
  const fillIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); fillIO.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-ratio], [data-vbars]').forEach((el) => fillIO.observe(el));

  /* ---------- Logo stroke-draw + cursor parallax ---------- */
  const logo = document.querySelector('.br-logo');
  const logoCenter = document.querySelector('.br-logo-hero__center');
  if (logo && !reduceMotion) {
    const paths = logo.querySelectorAll('path');
    paths.forEach((p, i) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.style.transition = `stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 25}ms, fill 400ms cubic-bezier(0.16, 1, 0.30, 1) ${500 + i * 18}ms`;
      } catch (e) { /* getTotalLength fails on some shapes */ }
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paths.forEach((p) => { p.style.strokeDashoffset = '0'; });
        setTimeout(() => logo.classList.add('is-drawn'), 450);
      });
    });
  } else if (logo) {
    logo.classList.add('is-drawn');
  }
  if (logoCenter && !reduceMotion) {
    const hero = logoCenter.closest('.br-logo-hero');
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        logoCenter.style.transform = `translate(${x * -14}px, ${y * -10}px)`;
      });
      hero.addEventListener('mouseleave', () => { logoCenter.style.transform = ''; });
    }
  }

  /* ---------- Form tabs (multi-form switcher) ---------- */
  const activateTab = (target) => {
    document.querySelectorAll('.bra-form-tab').forEach((t) => {
      t.classList.toggle('is-active', t.dataset.tab === target);
    });
    document.querySelectorAll('form[data-form]').forEach((f) => {
      f.classList.toggle('is-active', f.dataset.form === target);
    });
  };
  document.querySelectorAll('[data-form-tabs]').forEach((wrap) => {
    wrap.querySelectorAll('.bra-form-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        activateTab(tab.dataset.tab);
      });
    });
  });
  // Contact cards trigger the right tab + smooth scroll to form
  document.querySelectorAll('[data-jump-tab]').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const target = card.dataset.jumpTab;
      activateTab(target);
      const formSection = document.querySelector('#form-section');
      if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- Chart reveal ---------- */
  const chartIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); chartIO.unobserve(e.target); }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.bra-chart').forEach((el) => chartIO.observe(el));

  /* ---------- Chart interactions (hover tooltip, locking, multi-source controllers) ---------- */
  document.querySelectorAll('.bra-chart').forEach((chart) => {
    const svg = chart.querySelector('.bra-chart__svg');
    const tooltip = chart.querySelector('.bra-chart__tooltip');
    if (!svg || !tooltip) return;

    const variantSpan = tooltip.querySelector('.bra-chart__tooltip-variant');
    const metaSpan = tooltip.querySelector('.bra-chart__tooltip-meta');
    const hitzones = svg.querySelectorAll('.bra-chart-hitzone');
    const markers = svg.querySelectorAll('.bra-chart-marker');
    const lines = svg.querySelectorAll('.bra-chart-line');
    if (!hitzones.length || !markers.length) return;

    // Build a lookup: variant -> [{ cx, cy, freq, alpha, el }]
    const variantPoints = {};
    markers.forEach((m) => {
      const v = m.getAttribute('data-variant');
      if (!v) return;
      (variantPoints[v] = variantPoints[v] || []).push({
        cx: parseFloat(m.getAttribute('cx')),
        cy: parseFloat(m.getAttribute('cy')),
        freq: m.getAttribute('data-freq'),
        alpha: m.getAttribute('data-alpha'),
        el: m,
      });
    });

    // Insert a vertical guide line into the SVG (under the hitzones group)
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guide.setAttribute('class', 'bra-chart-guide');
    guide.setAttribute('y1', '30');
    guide.setAttribute('y2', '420');
    const hitGroup = svg.querySelector('.bra-chart-hitzones');
    if (hitGroup) hitGroup.parentNode.insertBefore(guide, hitGroup);
    else svg.appendChild(guide);

    // Locked variant: stays highlighted even when nothing is hovered.
    // null = unlocked, all lines shown at full opacity.
    let lockedVariant = null;

    // Scrub-mode tracking: if mouse moves fast along a line, suppress tooltip transitions
    let lastScrubAt = 0;
    let lastScrubX = 0;
    const SCRUB_VELOCITY = 1.0; // px/ms threshold
    const SCRUB_RESET_MS = 200;
    let lastTooltipShownAt = 0;
    const INSTANT_TOOLTIP_WINDOW_MS = 600; // subsequent tooltips inside this window = instant

    // Apply line/marker active+dim classes for a given variant (or clear if null)
    const applyHighlight = (variant) => {
      if (!variant) {
        lines.forEach((ln) => ln.classList.remove('is-active', 'is-dim'));
        markers.forEach((m) => m.classList.remove('is-active', 'is-dim'));
        return;
      }
      const targetClass = variantClass(variant);
      lines.forEach((ln) => {
        const isThis = ln.classList.contains(targetClass);
        ln.classList.toggle('is-active', isThis);
        ln.classList.toggle('is-dim', !isThis);
      });
      markers.forEach((m) => {
        m.classList.toggle('is-dim', m.getAttribute('data-variant') !== variant);
      });
    };

    // Sync external controllers (legend buttons, data cells) to the locked state
    const syncControllers = () => {
      document.querySelectorAll(
        '.bra-chart__legend-item[data-variant], .bra-gallery-data--interactive[data-variant]'
      ).forEach((el) => {
        el.setAttribute('aria-pressed', String(el.getAttribute('data-variant') === lockedVariant));
      });
    };

    // Clear hover state (but keep locked variant highlighted)
    const clearHover = () => {
      markers.forEach((m) => m.classList.remove('is-active'));
      guide.classList.remove('is-visible');
      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('hidden', '');
      tooltip.classList.remove('bra-chart__tooltip--scrub');
      // Re-apply locked highlight (or full clear if no lock)
      applyHighlight(lockedVariant);
    };

    // Convert client coords to SVG user units
    const toSvgPoint = (evt) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      return pt.matrixTransform(ctm.inverse());
    };

    // Detect fast cursor movement → enable scrub mode (instant tooltip updates)
    const detectScrub = (evt) => {
      const now = performance.now();
      const dt = now - lastScrubAt;
      if (dt < SCRUB_RESET_MS && dt > 0) {
        const dx = Math.abs(evt.clientX - lastScrubX);
        const velocity = dx / dt;
        if (velocity > SCRUB_VELOCITY) {
          tooltip.classList.add('bra-chart__tooltip--scrub');
        }
      }
      lastScrubAt = now;
      lastScrubX = evt.clientX;
    };

    // Show tooltip + highlight for a given variant at the nearest x position
    const showAt = (variant, evt) => {
      const points = variantPoints[variant];
      if (!points || !points.length) return;

      const { x: svgX } = toSvgPoint(evt);
      let nearest = points[0];
      let bestDx = Math.abs(svgX - nearest.cx);
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(svgX - points[i].cx);
        if (dx < bestDx) { bestDx = dx; nearest = points[i]; }
      }

      applyHighlight(variant);
      markers.forEach((m) => m.classList.toggle('is-active', m === nearest.el));

      guide.setAttribute('x1', nearest.cx);
      guide.setAttribute('x2', nearest.cx);
      guide.classList.add('is-visible');

      const markerRect = nearest.el.getBoundingClientRect();
      const chartRect = chart.getBoundingClientRect();
      const left = markerRect.left + markerRect.width / 2 - chartRect.left;

      variantSpan.innerHTML =
        '<span class="bra-chart__tooltip-swatch" style="color:' + variantColor(variant) + '"></span>' + variant;
      metaSpan.textContent = nearest.freq + ' · α ' + nearest.alpha;

      // Instant if a tooltip was visible very recently (sequential hover = no re-animation)
      const now = performance.now();
      const wasRecentlyVisible = now - lastTooltipShownAt < INSTANT_TOOLTIP_WINDOW_MS;
      if (wasRecentlyVisible) tooltip.classList.add('bra-chart__tooltip--scrub');
      lastTooltipShownAt = now;

      tooltip.removeAttribute('hidden');
      tooltip.classList.add('is-visible');

      // Auto-flip below if it would clip above the viewport
      const tooltipHeight = tooltip.offsetHeight || 48;
      const markerYAbs = markerRect.top + window.scrollY;
      const wouldClipAbove = markerYAbs - tooltipHeight - 12 < window.scrollY;
      const above = !wouldClipAbove;
      tooltip.classList.toggle('bra-chart__tooltip--below', !above);

      const top = above
        ? markerRect.top - chartRect.top - 10
        : markerRect.bottom - chartRect.top + 10;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    };

    const handleMove = (variant) => (evt) => {
      detectScrub(evt);
      showAt(variant, evt);
    };

    // Toggle lock for a variant (called by legend, data cells, configurator)
    const toggleLock = (variant) => {
      lockedVariant = lockedVariant === variant ? null : variant;
      applyHighlight(lockedVariant);
      syncControllers();
    };

    // Set lock to a specific variant (idempotent), null clears
    const setLock = (variant) => {
      lockedVariant = variant || null;
      applyHighlight(lockedVariant);
      syncControllers();
    };

    // Expose API on the chart element for external controllers
    chart._chartAPI = { setLock, toggleLock, getLock: () => lockedVariant };

    // SVG-internal hover targets
    hitzones.forEach((hz) => {
      const variant = hz.getAttribute('data-variant');
      if (!variant) return;
      hz.addEventListener('mousemove', handleMove(variant));
      hz.addEventListener('mouseleave', clearHover);
    });
    markers.forEach((m) => {
      const variant = m.getAttribute('data-variant');
      if (!variant) return;
      m.addEventListener('mouseenter', handleMove(variant));
      m.addEventListener('mouseleave', clearHover);
    });

    // Legend items: hover preview, click locks
    chart.querySelectorAll('.bra-chart__legend-item[data-variant]').forEach((btn) => {
      const variant = btn.getAttribute('data-variant');
      btn.addEventListener('mouseenter', () => { if (!lockedVariant) applyHighlight(variant); });
      btn.addEventListener('mouseleave', () => { if (!lockedVariant) applyHighlight(null); });
      btn.addEventListener('click', () => toggleLock(variant));
    });

    // Data cells: hover preview, click locks (these live OUTSIDE the chart element)
    document.querySelectorAll('.bra-gallery-data--interactive[data-variant]').forEach((cell) => {
      const variant = cell.getAttribute('data-variant');
      cell.addEventListener('mouseenter', () => { if (!lockedVariant) applyHighlight(variant); });
      cell.addEventListener('mouseleave', () => { if (!lockedVariant) applyHighlight(null); });
      cell.addEventListener('click', () => toggleLock(variant));
    });

    // ESC clears the lock
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape' && lockedVariant) setLock(null);
    });
  });

  /* ---------- Configurator → chart binding (thickness + air gap) ---------- */
  const chartEl = document.querySelector('.bra-chart');
  if (chartEl && chartEl._chartAPI) {
    const getActiveConfig = (group) => {
      const row = document.querySelector('[data-config-group="' + group + '"]');
      if (!row) return null;
      return row.querySelector('.is-active');
    };

    const deriveVariant = () => {
      const thickBtn = getActiveConfig('thick');
      const gapBtn = getActiveConfig('gap');
      if (!thickBtn || !gapBtn) return null;
      const thick = thickBtn.getAttribute('data-d-mm');         // "20" or "40"
      const gap = gapBtn.getAttribute('data-gap');              // "tight" or "wide"
      // 20mm tight=20mm gap, 40mm tight=40mm gap
      const gapMm = gap === 'wide' ? '200' : thick;
      return thick + ' / ' + gapMm + ' mm';
    };

    const applyConfigToChart = () => {
      const v = deriveVariant();
      if (v) chartEl._chartAPI.setLock(v);
    };

    // Listen for any configurator click in the thickness OR gap row
    document.querySelectorAll('[data-config-group="thick"] .bra-config-opt, [data-config-group="gap"] .bra-config-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Allow the existing configurator handler to update .is-active first
        setTimeout(applyConfigToChart, 0);
      });
    });
  }

  function variantClass(variant) {
    const map = {
      '20 / 20 mm':  'bra-chart-line--a',
      '20 / 200 mm': 'bra-chart-line--b',
      '40 / 40 mm':  'bra-chart-line--c',
      '40 / 200 mm': 'bra-chart-line--d',
    };
    return map[variant] || '';
  }
  function variantColor(variant) {
    const map = {
      '20 / 20 mm':  '#D4A02C',
      '20 / 200 mm': '#9E3B65',
      '40 / 40 mm':  '#8B3A1F',
      '40 / 200 mm': '#D08AA0',
    };
    return map[variant] || 'currentColor';
  }

  /* ---------- Scroll progress bar ---------- */
  const progress = document.getElementById('scrollProgress');
  if (progress) {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = pct + '%';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Mobile nav (hamburger) ---------- */
  const navEl = document.querySelector('.bra-nav');
  const navLinks = navEl && navEl.querySelector('.bra-nav__links');
  if (navEl && navLinks) {
    // Inject toggle button
    const toggle = document.createElement('button');
    toggle.className = 'bra-nav__toggle';
    toggle.setAttribute('aria-label', 'Menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span>';
    navEl.appendChild(toggle);

    // Inject scrim
    const scrim = document.createElement('div');
    scrim.className = 'bra-nav__scrim';
    navEl.appendChild(scrim);

    const setOpen = (open) => {
      navEl.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('bra-nav-locked', open);
    };
    toggle.addEventListener('click', () => setOpen(!navEl.classList.contains('is-open')));
    scrim.addEventListener('click', () => setOpen(false));
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    // Close menu if resized up to desktop
    window.addEventListener('resize', () => { if (window.innerWidth > 720) setOpen(false); });
  }

  /* ---------- Nav theme switch over dark sections ---------- */
  const nav = document.querySelector('.bra-nav');
  const darkSections = document.querySelectorAll('.bra-vault, .bra-surface-oak, .bra-surface-ink, .br-logo-hero, .home-hero');
  if (nav && darkSections.length) {
    const update = () => {
      const top = 80;
      let isDark = false;
      darkSections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top < top && r.bottom > top) isDark = true;
      });
      nav.classList.toggle('is-dark', isDark);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 3D tile configurator ---------- */
  const tileStage = document.querySelector('[data-tile-stage]');
  const tile3d = document.getElementById('tile3d');
  if (tileStage && tile3d) {
    let targetX = -18, targetY = 24, currentX = targetX, currentY = targetY;
    if (!reduceMotion) {
      tileStage.addEventListener('mousemove', (e) => {
        const r = tileStage.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        targetX = -18 - ny * 26;
        targetY = 24 + nx * 40;
      });
      tileStage.addEventListener('mouseleave', () => { targetX = -18; targetY = 24; });
      const tickTile = () => {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        tile3d.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
        requestAnimationFrame(tickTile);
      };
      tickTile();
    } else {
      tile3d.style.transform = `rotateX(${targetX}deg) rotateY(${targetY}deg)`;
    }
  }

  const tileState = {
    dimW: 240, dimH: 240, wMm: '600', hMm: '600',
    d: 10, dMm: '20',
    color: '#E8DCC4', name: 'Birch'
  };
  const finishLabels = {
    '#E8DCC4': 'Birch · pale fibre',
    '#A8855E': 'Oak · mid warm',
    '#5A3F2E': 'Walnut · deep warm',
    '#7A7770': 'Stone · neutral cool',
    '#6B7F5C': 'Lichen · sage'
  };
  const summaryEl = document.getElementById('config-summary');
  const readoutEl = document.getElementById('color-readout');
  const viewReadoutEl = document.getElementById('view-readout');
  const applyTileState = () => {
    if (!tile3d) return;
    tile3d.style.setProperty('--tile-w', tileState.dimW + 'px');
    tile3d.style.setProperty('--tile-h', tileState.dimH + 'px');
    tile3d.style.setProperty('--tile-d', tileState.d + 'px');
    tile3d.style.setProperty('--tile-color', tileState.color);
    if (summaryEl) summaryEl.textContent = `${tileState.wMm} × ${tileState.hMm} × ${tileState.dMm} mm · ${tileState.name}`;
    if (readoutEl) readoutEl.textContent = finishLabels[tileState.color] || tileState.name;
  };
  document.querySelectorAll('[data-config-group]').forEach((group) => {
    group.querySelectorAll('[data-config]').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('[data-config]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const c = btn.dataset.config;
        if (c === 'dim') {
          tileState.dimW = parseInt(btn.dataset.w);
          tileState.dimH = parseInt(btn.dataset.h);
          tileState.wMm  = btn.dataset.wMm;
          tileState.hMm  = btn.dataset.hMm;
        } else if (c === 'thick') {
          tileState.d   = parseInt(btn.dataset.d);
          tileState.dMm = btn.dataset.dMm;
        } else if (c === 'color') {
          tileState.color = btn.dataset.color;
          tileState.name  = btn.dataset.name;
        } else if (c === 'view') {
          const inGrid = btn.dataset.view === 'grid';
          tile3d.classList.toggle('show-grid', inGrid);
          if (viewReadoutEl) {
            viewReadoutEl.textContent = inGrid
              ? 'Laid into a standard suspended T-grid.'
              : 'The tile on its own.';
          }
        }
        applyTileState();
      });
    });
  });
  applyTileState();

  /* ---------- Video showcase (custom player) ---------- */
  const fmtTime = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  document.querySelectorAll('.bra-video').forEach((root) => {
    const video = root.querySelector('.bra-video__media');
    if (!video) return;
    const play   = root.querySelector('.bra-video__play');
    const toggle = root.querySelector('[data-video-toggle]');
    const mute   = root.querySelector('[data-video-mute]');
    const full   = root.querySelector('[data-video-full]');
    const track  = root.querySelector('.bra-video__track');
    const fill   = root.querySelector('.bra-video__fill');
    const time   = root.querySelector('.bra-video__time');

    const setToggleGlyph = () => { if (toggle) toggle.innerHTML = video.paused ? '<svg class="bra-ic"><use href="#ph-play"></use></svg>' : '<svg class="bra-ic"><use href="#ph-pause"></use></svg>'; };
    const startPlay = () => {
      root.classList.add('is-started');
      video.play();
    };
    const updateState = () => {
      root.classList.toggle('is-playing', !video.paused);
      root.classList.toggle('is-paused', video.paused);
      setToggleGlyph();
    };

    if (play) play.addEventListener('click', startPlay);
    if (toggle) toggle.addEventListener('click', () => { video.paused ? startPlay() : video.pause(); });
    video.addEventListener('click', () => { if (root.classList.contains('is-started')) { video.paused ? video.play() : video.pause(); } });
    video.addEventListener('play', updateState);
    video.addEventListener('pause', updateState);
    video.addEventListener('ended', () => { root.classList.remove('is-started'); updateState(); });

    video.addEventListener('timeupdate', () => {
      const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      if (fill) fill.style.width = pct + '%';
      if (time) time.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
    });
    video.addEventListener('loadedmetadata', () => {
      if (time) time.textContent = `0:00 / ${fmtTime(video.duration)}`;
    });

    if (track) {
      const seek = (e) => {
        const r = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        if (video.duration) video.currentTime = ratio * video.duration;
      };
      let scrubbing = false;
      track.addEventListener('pointerdown', (e) => { scrubbing = true; track.setPointerCapture(e.pointerId); seek(e); });
      track.addEventListener('pointermove', (e) => { if (scrubbing) seek(e); });
      track.addEventListener('pointerup', () => { scrubbing = false; });
    }

    if (mute) {
      const setMuteGlyph = () => { mute.innerHTML = video.muted ? '<svg class="bra-ic"><use href="#ph-mute"></use></svg>' : '<svg class="bra-ic"><use href="#ph-speaker"></use></svg>'; };
      mute.addEventListener('click', () => { video.muted = !video.muted; setMuteGlyph(); });
      setMuteGlyph();
    }
    if (full) {
      full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (root.requestFullscreen) root.requestFullscreen();
      });
    }
    setToggleGlyph();
  });
})();

/* ============================================================
   Design-system v1.1 behaviours — accordion · filter chips · lightbox
   Event-delegated so they work on CMS-rendered content too.
   ============================================================ */
(function () {
  /* ---- Accordion ---- */
  document.addEventListener('click', function (e) {
    var trig = e.target.closest && e.target.closest('.bra-accordion__trigger');
    if (!trig) return;
    var item = trig.closest('.bra-accordion__item');
    if (!item) return;
    var open = item.classList.toggle('is-open');
    trig.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---- Filter chips ----
     <div data-filter-group [data-filter-target="#grid"]>
       <button class="bra-chip is-active" data-filter="all">All</button> ...
     items to filter carry data-category="x" (inside group, or in target) */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('.bra-chip[data-filter]');
    if (!chip) return;
    var group = chip.closest('[data-filter-group]');
    if (!group) return;
    var val = chip.dataset.filter;
    group.querySelectorAll('.bra-chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    var scope = group.dataset.filterTarget ? document.querySelector(group.dataset.filterTarget) : group;
    if (!scope) return;
    scope.querySelectorAll('[data-category]').forEach(function (it) {
      it.style.display = (val === 'all' || it.dataset.category === val) ? '' : 'none';
    });
  });

  /* ---- Image lightbox ----
     Auto-enabled on .brg, .bra-gallery--img, and any [data-lightbox] container. */
  var box = null, items = [], idx = 0, imgEl, titleEl, countEl;
  function build() {
    box = document.createElement('div');
    box.className = 'bra-lightbox';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('role', 'dialog');
    box.innerHTML =
      '<button class="bra-lightbox__close" type="button" aria-label="Close"><svg class="bra-ic" aria-hidden="true"><use href="#ph-close"></use></svg></button>' +
      '<button class="bra-lightbox__nav bra-lightbox__nav--prev" type="button" aria-label="Previous"><svg class="bra-ic" aria-hidden="true"><use href="#ph-prev"></use></svg></button>' +
      '<button class="bra-lightbox__nav bra-lightbox__nav--next" type="button" aria-label="Next"><svg class="bra-ic" aria-hidden="true"><use href="#ph-next"></use></svg></button>' +
      '<div class="bra-lightbox__stage"><img class="bra-lightbox__img" alt="">' +
      '<div class="bra-lightbox__cap"><span data-lb-title></span><span data-lb-count></span></div></div>';
    document.body.appendChild(box);
    imgEl = box.querySelector('.bra-lightbox__img');
    titleEl = box.querySelector('[data-lb-title]');
    countEl = box.querySelector('[data-lb-count]');
    box.querySelector('.bra-lightbox__close').addEventListener('click', close);
    box.querySelector('.bra-lightbox__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
    box.querySelector('.bra-lightbox__nav--next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
  }
  function show(i) {
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    var it = items[idx];
    imgEl.src = it.src; imgEl.alt = it.alt || '';
    titleEl.textContent = it.title || '';
    countEl.textContent = (idx + 1) + ' / ' + items.length;
  }
  function open(list, i) {
    if (!box) build();
    items = list;
    box.classList.add('is-open'); box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    show(i);
  }
  function close() {
    if (!box) return;
    box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('img');
    if (!img) return;
    var group = img.closest('[data-lightbox], .brg, .bra-gallery--img');
    if (!group) return;
    var imgs = Array.prototype.slice.call(group.querySelectorAll('img'));
    var i = imgs.indexOf(img);
    if (i < 0) return;
    var list = imgs.map(function (m) {
      var fig = m.closest('figure, .bra-gallery-cell');
      var t = fig && fig.querySelector('.brg__title, .bra-gallery-img__title');
      return { src: m.currentSrc || m.src, alt: m.alt, title: t ? t.textContent : (m.alt || '') };
    });
    open(list, i);
  });
  document.addEventListener('keydown', function (e) {
    if (!box || !box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

/* ============================================================
   Design-system v1.2 behaviours
   sub-nav scrollspy · back-to-top · cookie banner · form validation
   ============================================================ */
(function () {
  /* ---- Sticky sub-nav scrollspy ---- */
  document.querySelectorAll('[data-subnav]').forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var map = links.map(function (l) { return { l: l, sec: document.querySelector(l.getAttribute('href')) }; })
                   .filter(function (x) { return x.sec; });
    if (!map.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var m = map.find(function (x) { return x.sec === e.target; });
        if (m) m.l.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach(function (m) { io.observe(m.sec); });
  });

  /* ---- Back-to-top (auto-injected once) ---- */
  var totop = document.querySelector('.bra-totop');
  if (!totop) {
    totop = document.createElement('button');
    totop.className = 'bra-totop'; totop.type = 'button'; totop.setAttribute('aria-label', 'Back to top');
    totop.innerHTML = '<svg class="bra-ic" aria-hidden="true"><use href="#ph-arrow-up"></use></svg>';
    document.body.appendChild(totop);
  }
  var onScroll = function () { totop.classList.toggle('is-visible', window.pageYOffset > window.innerHeight * 0.8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  totop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') });
  });

  /* ---- Cookie / consent banner (auto-injected on every page) ---- */
  var cookie = document.querySelector('[data-cookie]');
  if (!cookie) {
    cookie = document.createElement('div');
    cookie.className = 'bra-cookie';
    cookie.setAttribute('data-cookie', '');
    cookie.innerHTML =
      '<p class="bra-cookie__text">Vi bruger minimale cookies for at forstå hvad der virker. Se vores <a href="privatlivspolitik.html">privatlivspolitik</a>.</p>' +
      '<div class="bra-cookie__actions">' +
      '<button class="bra-cookie__btn" type="button" data-consent="decline">Afvis</button>' +
      '<button class="bra-cookie__btn bra-cookie__btn--accept" type="button" data-consent="accept">Accepter</button>' +
      '</div>';
    document.body.appendChild(cookie);
  }
  var CONSENT_KEY = 'brConsent';
  if (!localStorage.getItem(CONSENT_KEY)) {
    setTimeout(function () { cookie.classList.add('is-in'); }, 800);
  }
  cookie.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-consent]');
    if (!btn) return;
    localStorage.setItem(CONSENT_KEY, btn.dataset.consent); // "accept" | "decline"
    cookie.classList.remove('is-in');
    document.dispatchEvent(new CustomEvent('br-consent', { detail: btn.dataset.consent }));
  });

  /* ---- Form validation (opt-in via [data-validate]) ---- */
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    // 'invalid' fires per control when the form is validated, even though the
    // browser then blocks submit — mark the field so our styled error shows.
    form.addEventListener('invalid', function (e) {
      var field = e.target.closest && e.target.closest('.bra-field');
      if (field) field.classList.add('is-error');
    }, true);
    // On submit attempt, focus the first invalid control.
    form.addEventListener('submit', function () {
      var bad = form.querySelector(':invalid');
      if (bad) { var f = bad.closest('.bra-field'); if (f) f.classList.add('is-error'); bad.focus(); }
    });
    // Clear the error state as soon as the control becomes valid again.
    form.querySelectorAll('.bra-field input, .bra-field textarea, .bra-field select').forEach(function (ctrl) {
      ctrl.addEventListener('input', function () {
        var field = ctrl.closest('.bra-field');
        if (field && field.classList.contains('is-error') && ctrl.checkValidity()) field.classList.remove('is-error');
      });
    });
  });
})();

/* ============================================================
   Design-system v1.3 — CO2 savings calculator
   <div class="bra-co2calc" data-co2calc data-co2-km="0.15"> … </div>
   rows carry data-factor (kg CO2e/m2), one row has data-ours.
   ============================================================ */
(function () {
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };

  document.querySelectorAll('[data-co2calc]').forEach(function (calc) {
    var range   = calc.querySelector('[data-co2-area]');
    var areaOut = calc.querySelector('[data-co2-area-val]');
    var rows    = Array.prototype.slice.call(calc.querySelectorAll('.bra-co2calc__row'));
    var saveEl  = calc.querySelector('[data-co2-save]');
    var altNm   = calc.querySelector('[data-co2-alt-name]');
    var equivEl = calc.querySelector('[data-co2-equiv]');
    var chips   = Array.prototype.slice.call(calc.querySelectorAll('[data-co2-alt]'));
    var kmFactor = parseFloat(calc.getAttribute('data-co2-km') || '0.15');
    if (!range || !rows.length) return;

    var activeAlt = (chips.filter(function (c) { return c.classList.contains('is-active'); })[0] || chips[0]);
    var altKey = activeAlt ? activeAlt.getAttribute('data-co2-alt') : null;

    // Supports either one "ours" row, or several (e.g. lifecycle + stored
    // carbon shown as separate bars but summed together for the total saving).
    function oursRows() { return rows.filter(function (r) { return r.hasAttribute('data-ours'); }); }

    function render() {
      var area = parseFloat(range.value) || 0;
      if (areaOut) areaOut.textContent = fmt(area);

      // visible rows: ours + the selected alternative (or all if no chips)
      var visible = rows.filter(function (r) {
        if (r.hasAttribute('data-ours')) return true;
        if (!altKey) return true;
        return r.getAttribute('data-key') === altKey;
      });
      var totals = visible.map(function (r) { return area * (parseFloat(r.getAttribute('data-factor')) || 0); });
      var maxAbs = Math.max.apply(null, totals.map(Math.abs).concat([1]));

      rows.forEach(function (r) {
        var isVis = visible.indexOf(r) !== -1;
        r.style.display = isVis ? '' : 'none';
        if (!isVis) return;
        var total = area * (parseFloat(r.getAttribute('data-factor')) || 0);
        var val = r.querySelector('[data-co2-val]');
        if (val) val.textContent = (total > 0 ? '+' : '') + fmt(total) + ' kg';
        var fill = r.querySelector('.bra-co2calc__fill');
        if (fill) {
          var w = Math.min(Math.abs(total) / maxAbs, 1) * 50;
          if (total < 0) { fill.style.left = (50 - w) + '%'; fill.style.width = w + '%'; }
          else { fill.style.left = '50%'; fill.style.width = w + '%'; }
        }
      });

      // savings = alternative total - ours total (ours rows summed; net negative -> large positive saving)
      var oRows = oursRows();
      var altRow = visible.filter(function (r) { return !r.hasAttribute('data-ours'); })[0];
      if (oRows.length && altRow) {
        var oursTotal = oRows.reduce(function (sum, r) { return sum + area * (parseFloat(r.getAttribute('data-factor')) || 0); }, 0);
        var altTotal  = area * (parseFloat(altRow.getAttribute('data-factor')) || 0);
        var saving = altTotal - oursTotal;
        if (saveEl) saveEl.textContent = fmt(saving);
        if (altNm) altNm.textContent = altRow.getAttribute('data-name') || altRow.querySelector('.bra-co2calc__name').firstChild.textContent.trim();
        if (equivEl) equivEl.textContent = 'Roughly the same as ' + fmt(saving / kmFactor) + ' km of driving avoided.';
      }
    }

    range.addEventListener('input', render);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        altKey = chip.getAttribute('data-co2-alt');
        render();
      });
    });
    render();
  });
})();

/* ============================================================
   Icon sprite — Phosphor Light (MIT, phosphoricons.com), injected once.
   Use anywhere:  <svg class="bra-ic" aria-hidden="true"><use href="#ph-play"></use></svg>
   Available ids: ph-play ph-pause ph-speaker ph-mute ph-fullscreen ph-close
     ph-prev ph-next ph-arrow-up ph-arrow-right ph-arrow-left ph-arrow-ur
     ph-download ph-check ph-leaf ph-recycle ph-wave ph-plus ph-minus
   ============================================================ */
(function () {
  if (document.getElementById('bra-icon-sprite')) return;
  var wrap = document.createElement('div');
  wrap.id = 'bra-icon-sprite';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="ph-play" viewBox="0 0 256 256"><path d="M231.36,116.19,87.28,28.06a14,14,0,0,0-14.18-.27A13.69,13.69,0,0,0,66,39.87V216.13a13.69,13.69,0,0,0,7.1,12.08,14,14,0,0,0,14.18-.27l144.08-88.13a13.82,13.82,0,0,0,0-23.62Zm-6.26,13.38L81,217.7a2,2,0,0,1-2.06,0,1.78,1.78,0,0,1-1-1.61V39.87a1.78,1.78,0,0,1,1-1.61A2.06,2.06,0,0,1,80,38a2,2,0,0,1,1,.31L225.1,126.43a1.82,1.82,0,0,1,0,3.14Z"/></symbol><symbol id="ph-pause" viewBox="0 0 256 256"><path d="M200,34H160a14,14,0,0,0-14,14V208a14,14,0,0,0,14,14h40a14,14,0,0,0,14-14V48A14,14,0,0,0,200,34Zm2,174a2,2,0,0,1-2,2H160a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h40a2,2,0,0,1,2,2ZM96,34H56A14,14,0,0,0,42,48V208a14,14,0,0,0,14,14H96a14,14,0,0,0,14-14V48A14,14,0,0,0,96,34Zm2,174a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2H96a2,2,0,0,1,2,2Z"/></symbol><symbol id="ph-speaker" viewBox="0 0 256 256"><path d="M154.64,26.61a6,6,0,0,0-6.32.65L77.94,82H32A14,14,0,0,0,18,96v64a14,14,0,0,0,14,14H77.94l70.38,54.74A6,6,0,0,0,158,224V32A6,6,0,0,0,154.64,26.61ZM30,160V96a2,2,0,0,1,2-2H74v68H32A2,2,0,0,1,30,160Zm116,51.73L86,165.07V90.93l60-46.66Zm50.53-108.85a38,38,0,0,1,0,50.24,6,6,0,1,1-9-7.94,26,26,0,0,0,0-34.37,6,6,0,0,1,9-7.93ZM246,128a77.86,77.86,0,0,1-19.86,52,6,6,0,1,1-8.94-8,66,66,0,0,0,0-88,6,6,0,1,1,8.94-8A77.86,77.86,0,0,1,246,128Z"/></symbol><symbol id="ph-mute" viewBox="0 0 256 256"><path d="M52.44,36A6,6,0,0,0,43.56,44L78,81.94l-.08.06H32A14,14,0,0,0,18,96v64a14,14,0,0,0,14,14H77.94l70.38,54.74A6,6,0,0,0,158,224V169.92L203.56,220a6,6,0,0,0,8.88-8.08ZM30,160V96a2,2,0,0,1,2-2H74v68H32A2,2,0,0,1,30,160Zm116,51.73L86,165.07V90.93l.11-.08L146,156.72Zm41.5-66.53a26,26,0,0,0,0-34.37,6,6,0,1,1,9-7.93,38,38,0,0,1,0,50.24,6,6,0,0,1-9-7.94ZM107.41,66.68a6,6,0,0,1,1.06-8.42l39.85-31A6,6,0,0,1,158,32v74.83a6,6,0,0,1-12,0V44.27L115.83,67.73A6,6,0,0,1,107.41,66.68ZM246,128a77.86,77.86,0,0,1-19.86,52,6,6,0,1,1-8.94-8,66,66,0,0,0,0-88,6,6,0,1,1,8.94-8A77.86,77.86,0,0,1,246,128Z"/></symbol><symbol id="ph-fullscreen" viewBox="0 0 256 256"><path d="M214,48V88a6,6,0,0,1-12,0V54H168a6,6,0,0,1,0-12h40A6,6,0,0,1,214,48ZM88,202H54V168a6,6,0,0,0-12,0v40a6,6,0,0,0,6,6H88a6,6,0,0,0,0-12Zm120-40a6,6,0,0,0-6,6v34H168a6,6,0,0,0,0,12h40a6,6,0,0,0,6-6V168A6,6,0,0,0,208,162ZM88,42H48a6,6,0,0,0-6,6V88a6,6,0,0,0,12,0V54H88a6,6,0,0,0,0-12Z"/></symbol><symbol id="ph-close" viewBox="0 0 256 256"><path d="M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z"/></symbol><symbol id="ph-prev" viewBox="0 0 256 256"><path d="M164.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L88.49,128Z"/></symbol><symbol id="ph-next" viewBox="0 0 256 256"><path d="M180.24,132.24l-80,80a6,6,0,0,1-8.48-8.48L167.51,128,91.76,52.24a6,6,0,0,1,8.48-8.48l80,80A6,6,0,0,1,180.24,132.24Z"/></symbol><symbol id="ph-arrow-up" viewBox="0 0 256 256"><path d="M204.24,116.24a6,6,0,0,1-8.48,0L134,54.49V216a6,6,0,0,1-12,0V54.49L60.24,116.24a6,6,0,0,1-8.48-8.48l72-72a6,6,0,0,1,8.48,0l72,72A6,6,0,0,1,204.24,116.24Z"/></symbol><symbol id="ph-arrow-right" viewBox="0 0 256 256"><path d="M220.24,132.24l-72,72a6,6,0,0,1-8.48-8.48L201.51,134H40a6,6,0,0,1,0-12H201.51L139.76,60.24a6,6,0,0,1,8.48-8.48l72,72A6,6,0,0,1,220.24,132.24Z"/></symbol><symbol id="ph-arrow-left" viewBox="0 0 256 256"><path d="M222,128a6,6,0,0,1-6,6H54.49l61.75,61.76a6,6,0,1,1-8.48,8.48l-72-72a6,6,0,0,1,0-8.48l72-72a6,6,0,0,1,8.48,8.48L54.49,122H216A6,6,0,0,1,222,128Z"/></symbol><symbol id="ph-arrow-ur" viewBox="0 0 256 256"><path d="M198,64V168a6,6,0,0,1-12,0V78.48L68.24,196.24a6,6,0,0,1-8.48-8.48L177.52,70H88a6,6,0,0,1,0-12H192A6,6,0,0,1,198,64Z"/></symbol><symbol id="ph-download" viewBox="0 0 256 256"><path d="M222,144v64a6,6,0,0,1-6,6H40a6,6,0,0,1-6-6V144a6,6,0,0,1,12,0v58H210V144a6,6,0,0,1,12,0Zm-98.24,4.24a6,6,0,0,0,8.48,0l40-40a6,6,0,0,0-8.48-8.48L134,129.51V32a6,6,0,0,0-12,0v97.51L92.24,99.76a6,6,0,0,0-8.48,8.48Z"/></symbol><symbol id="ph-check" viewBox="0 0 256 256"><path d="M228.24,76.24l-128,128a6,6,0,0,1-8.48,0l-56-56a6,6,0,0,1,8.48-8.48L96,191.51,219.76,67.76a6,6,0,0,1,8.48,8.48Z"/></symbol><symbol id="ph-leaf" viewBox="0 0 256 256"><path d="M221.45,40.19a6,6,0,0,0-5.64-5.64C140.43,30.11,80.14,52.71,54.53,95c-17.44,28.79-16.76,62.8,1.79,96.2L35.76,211.76a6,6,0,1,0,8.48,8.48L64.8,199.68c17.27,9.59,34.7,14.41,51.49,14.41A85.38,85.38,0,0,0,161,201.47C203.29,175.86,225.88,115.57,221.45,40.19Zm-66.66,151c-24.08,14.58-52.64,14.37-81.13-.39l90.59-90.59a6,6,0,0,0-8.48-8.48L65.18,182.34c-14.76-28.49-15-57-.39-81.13,22.68-37.43,76.63-57.8,145-54.95C212.59,114.58,192.22,168.54,154.79,191.21Z"/></symbol><symbol id="ph-recycle" viewBox="0 0 256 256"><path d="M94,208a6,6,0,0,1-6,6H40a22,22,0,0,1-19-33l36.71-63.44-18.76,5a6,6,0,0,1-3.1-11.6l32.77-8.77A6,6,0,0,1,76,106.45l8.8,32.76a6,6,0,0,1-4.24,7.35,6.09,6.09,0,0,1-1.56.21,6,6,0,0,1-5.79-4.45l-5-18.8L31.38,187A10,10,0,0,0,40,202H88A6,6,0,0,1,94,208Zm141-27-23.14-40a6,6,0,0,0-10.38,6l23.14,40A10,10,0,0,1,216,202H142.48l13.76-13.76a6,6,0,0,0-8.48-8.48l-24,24a6,6,0,0,0,0,8.48l24,24a6,6,0,0,0,8.48-8.48L142.48,214H216a22,22,0,0,0,19-33ZM136.65,35l36.72,63.44-18.76-5A6,6,0,0,0,151.5,105l32.78,8.79a6,6,0,0,0,7.34-4.25l8.79-32.78a6,6,0,1,0-11.58-3.11l-5.05,18.82L147,29A22,22,0,0,0,109,29L85.8,69a6,6,0,0,0,10.39,6l23.16-40a10,10,0,0,1,17.3,0Z"/></symbol><symbol id="ph-wave" viewBox="0 0 256 256"><path d="M237.43,130.55C215.84,176.57,197,198,178,198c-23.83,0-39.2-32.76-55.47-67.45C109.26,102.17,94.17,70,78,70c-9.18,0-25,10.5-48.53,60.55a6,6,0,0,1-10.86-5.1C40.16,79.43,59,58,78,58c23.83,0,39.2,32.76,55.47,67.45C146.74,153.83,161.83,186,178,186c9.18,0,25.05-10.5,48.53-60.55a6,6,0,0,1,10.86,5.1Z"/></symbol><symbol id="ph-plus" viewBox="0 0 256 256"><path d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"/></symbol><symbol id="ph-minus" viewBox="0 0 256 256"><path d="M222,128a6,6,0,0,1-6,6H40a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128Z"/></symbol></svg>';
  document.body.insertBefore(wrap, document.body.firstChild);
})();
