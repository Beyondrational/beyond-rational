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

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const radius = 120, pull = 0.35;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const k = 1 - dist / radius;
        btn.style.transform = `translate(${dx * pull * k}px, ${dy * pull * k}px)`;
      }
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

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

  /* ---------- Character reveal (word-level wrap) ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      const text = el.textContent || '';
      el.innerHTML = '';
      const words = text.split(' ');
      let charIdx = 0;
      words.forEach((word, wIdx) => {
        const wWrap = document.createElement('span');
        wWrap.className = 'bra-reveal-word';
        [...word].forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'bra-reveal-char';
          span.style.transitionDelay = `${charIdx * 24}ms`;
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

  /* ---------- Nav theme switch over dark sections ---------- */
  const nav = document.querySelector('.bra-nav');
  const darkSections = document.querySelectorAll('.bra-vault, .bra-surface-oak, .bra-surface-ink, .br-logo-hero');
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
        }
        applyTileState();
      });
    });
  });
  applyTileState();
})();
