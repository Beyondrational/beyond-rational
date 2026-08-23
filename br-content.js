/* ============================================================
   B_R Content Loader — fetches content/<page>.<lang>.json and
   content/site.<lang>.json, populates data-content attributes.
   Language resolves as: ?lang= query param > localStorage
   ('brLang') > 'en', and is re-run on demand by the nav language
   toggle (br.js) via window.brSetLanguage(). Edits flow via
   Sveltia CMS (Decap i18n, structure: multiple_files).

   Images are language-independent, so they live separately in
   content/<page>.media.json (one shared file, no .en/.da split)
   and get deep-merged over the language file — editing a photo
   once in the CMS's "Images" collection updates both languages,
   instead of the two text files silently drifting apart.
   ============================================================ */

(function () {
  const SUPPORTED_LANGS = ['en', 'da'];
  const LANG_KEY = 'brLang';

  function resolveLang() {
    const url = new URL(location.href);
    const q = url.searchParams.get('lang');
    if (SUPPORTED_LANGS.includes(q)) return q;
    const stored = localStorage.getItem(LANG_KEY);
    if (SUPPORTED_LANGS.includes(stored)) return stored;
    return 'en';
  }

  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  // Deep-merges `source` (the shared, language-independent media file) over
  // `target` (the language file) so an image value at content.hero.image
  // overrides just that leaf, without clobbering the text sitting next to
  // it. Objects recurse key-by-key; arrays merge index-by-index (media and
  // language files are generated/edited from the same shape, so a gallery's
  // Nth media entry always lines up with the Nth language entry); anything
  // else (a string image path) from source simply wins.
  function deepMerge(target, source) {
    if (Array.isArray(source)) {
      const base = Array.isArray(target) ? target : [];
      return source.map((item, i) => deepMerge(base[i], item));
    }
    if (source && typeof source === 'object') {
      const base = target && typeof target === 'object' && !Array.isArray(target) ? target : {};
      const out = Object.assign({}, base);
      Object.keys(source).forEach((k) => { out[k] = deepMerge(base[k], source[k]); });
      return out;
    }
    return source;
  }

  function bindSingleValues(data) {
    document.querySelectorAll('[data-content]').forEach((el) => {
      const path = el.dataset.content;
      const value = get(data, path);
      if (value == null || value === '') return;

      const attr = el.dataset.contentAttr;
      if (attr) {
        // Skip no-op writes: re-setting src/href etc. to the same value it
        // already has still resets that resource (an <img> restarts its load
        // and fires 'load' again, dropping any one-time listener a page script
        // attached before this ran) — same class of bug the reveal-text skip
        // below guards against, just for attributes instead of textContent.
        if (el.getAttribute(attr) !== String(value)) el.setAttribute(attr, value);
      } else if (el.dataset.contentHtml === 'true' && el.hasAttribute('data-reveal') && window.braSplitRevealText) {
        // Reveal-lines strip tags on split anyway (char-by-char), so just
        // animate the plain text rather than skipping the reveal entirely.
        const plain = value.replace(/<[^>]+>/g, '');
        window.braSplitRevealText(el, plain);
      } else if (el.dataset.contentHtml === 'true') {
        el.innerHTML = value;
      } else if (el.hasAttribute('data-reveal') && window.braSplitRevealText) {
        // Plain textContent would wipe out the char-reveal spans br.js already
        // built for this element — re-split instead so the scroll-in animation
        // still plays with the real CMS text.
        window.braSplitRevealText(el, value);
      } else {
        el.textContent = value;
      }
    });
  }

  /* ---------- List iteration ----------
     <ul data-content-each="projects.list">
       <template>
         <li>
           <span data-each="title"></span>
           <img data-each="image" data-each-attr="src">
         </li>
       </template>
     </ul>
  */
  function bindLists(data) {
    document.querySelectorAll('[data-content-each]').forEach((container) => {
      const path = container.dataset.contentEach;
      const items = get(data, path);
      if (!Array.isArray(items)) return;

      const tpl = container.querySelector('template');
      if (!tpl) return;

      // Remove any previously rendered children (re-render safe)
      container.querySelectorAll('[data-rendered]').forEach((n) => n.remove());

      items.forEach((item) => {
        const clone = tpl.content.cloneNode(true);
        const root = clone.firstElementChild;
        if (root) root.setAttribute('data-rendered', 'true');

        clone.querySelectorAll('[data-each]').forEach((el) => {
          const key = el.dataset.each;
          const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), item);
          if (val == null || val === '') return;

          const attr = el.dataset.eachAttr;
          if (attr) {
            el.setAttribute(attr, val);
          } else if (el.dataset.eachHtml === 'true') {
            el.innerHTML = val;
          } else {
            el.textContent = val;
          }
        });

        // Additional, independent bindings so one element (typically an <img>
        // already using data-each/data-each-attr for its src) can also pull
        // *different* fields onto other attributes. Any `data-each-<name>`
        // sets attribute `<name>`, camelCase in the suffix becoming kebab:
        //   data-each-alt="title"        -> alt="…"        (per-image alt text)
        //   data-each-data-gated="gated" -> data-gated="…" (per-item flags)
        // `attr` and `html` are reserved by the primary binding above.
        const RESERVED = new Set(['attr', 'html']);
        const toKebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
        clone.querySelectorAll('*').forEach((el) => {
          Object.keys(el.dataset).forEach((dataKey) => {
            if (!dataKey.startsWith('each') || dataKey === 'each') return;
            const suffix = dataKey.slice(4);
            const name = toKebab(suffix.charAt(0).toLowerCase() + suffix.slice(1));
            if (RESERVED.has(name)) return;
            const val = el.dataset[dataKey].split('.').reduce((o, k) => (o == null ? o : o[k]), item);
            // `false` means "not set" for a flag — don't write gated="false"
            if (val == null || val === '' || val === false) return;
            el.setAttribute(name, val === true ? '' : val);
          });
        });

        container.appendChild(clone);
      });
    });
  }

  async function loadContent(lang) {
    const page = document.body.dataset.page;
    if (!page) return;

    document.documentElement.lang = lang;

    let siteData = {};
    try {
      const siteRes = await fetch(`content/site.${lang}.json`, { cache: 'no-cache' });
      if (siteRes.ok) siteData = await siteRes.json();
    } catch (e) { /* no site.json yet — fine */ }

    let pageData;
    try {
      const res = await fetch(`content/${page}.${lang}.json`, { cache: 'no-cache' });
      if (!res.ok) return;
      pageData = await res.json();
    } catch (e) { return; }

    let mediaData = null;
    try {
      const mediaRes = await fetch(`content/${page}.media.json`, { cache: 'no-cache' });
      if (mediaRes.ok) mediaData = await mediaRes.json();
    } catch (e) { /* no shared media file for this page — fine */ }

    const data = Object.assign({}, siteData, mediaData ? deepMerge(pageData, mediaData) : pageData);
    bindSingleValues(data);
    bindLists(data);

    document.dispatchEvent(new CustomEvent('br-content-ready', { detail: data }));
  }

  // Exposed so the nav language toggle (br.js) can switch language without
  // a full page reload: persists the choice, updates the shareable URL and
  // <html lang>, then re-fetches and re-binds in place.
  window.brSetLanguage = function (lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    localStorage.setItem(LANG_KEY, lang);
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    loadContent(lang);
  };
  window.brCurrentLang = resolveLang;

  loadContent(resolveLang());
})();
