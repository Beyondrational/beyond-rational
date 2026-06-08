/* ============================================================
   B_R Content Loader — fetches content/<page>.json and populates
   data-content attributes in the DOM. Edits flow via Sveltia CMS.
   ============================================================ */

(async function () {
  const page = document.body.dataset.page;
  if (!page) return;

  let data;
  try {
    const res = await fetch(`content/${page}.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    data = await res.json();
  } catch (e) { return; }

  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- Single-value bindings ---------- */
  document.querySelectorAll('[data-content]').forEach((el) => {
    const path = el.dataset.content;
    const value = get(data, path);
    if (value == null || value === '') return;

    const attr = el.dataset.contentAttr;
    if (attr) {
      el.setAttribute(attr, value);
    } else if (el.dataset.contentHtml === 'true') {
      el.innerHTML = value;
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
