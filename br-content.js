/* ============================================================
   B_R Content Loader — fetches content/<page>.json and populates
   data-content attributes in the DOM. Edits flow via Sveltia CMS.
   ============================================================ */

(async function () {
  const page = document.body.dataset.page;
  if (!page) return;

  // Shared, site-wide content (footer, etc.) — merged under page data so a
  // single edit in the CMS updates every page at once. Optional: pages work
  // fine without it.
  let siteData = {};
  try {
    const siteRes = await fetch('content/site.json', { cache: 'no-cache' });
    if (siteRes.ok) siteData = await siteRes.json();
  } catch (e) { /* no site.json yet — fine */ }

  let pageData;
  try {
    const res = await fetch(`content/${page}.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    pageData = await res.json();
  } catch (e) { return; }

  const data = Object.assign({}, siteData, pageData);

  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- Single-value bindings ---------- */
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

      container.appendChild(clone);
    });
  });

  /* ---------- Notify other scripts that content is ready ---------- */
  document.dispatchEvent(new CustomEvent('br-content-ready', { detail: data }));
})();
