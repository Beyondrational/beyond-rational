# Beyond Rational — Static Site + CMS

Static HTML site built on the **B_R Design System v1.0**.
Content is stored as JSON in `content/` and edited via **Sveltia CMS** at `/admin`.

## File layout

```
.
├── index.html / product.html / projects.html / contact.html / design-system.html
├── br.css                # design system
├── br.js                 # interactions
├── br-content.js         # JSON → HTML loader (data-content bindings)
├── content/              # text + image paths, edited by CMS
│   ├── home.json
│   ├── projects.json
│   └── founders.json
├── admin/                # Sveltia CMS shell
│   ├── index.html
│   └── config.yml
└── assets/               # uploaded images
    ├── morten-melberg.jpg
    └── rasmus-melberg.jpg
```

## Push to GitHub + enable Pages (one-time, ~10 min)

1. Create a free GitHub account at **github.com** if you don't have one.
2. New repo: **github.com/new** → name it `beyond-rational` → public → create.
3. In Terminal, from this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/beyond-rational.git
   git push -u origin main
   ```

4. In repo settings → **Pages** → Source: `main` / `(root)` → Save.
5. Within a minute the site is live at `https://YOUR-NAME.github.io/beyond-rational/`.

## Wire up the CMS (one-time, ~5 min)

1. Open **`admin/config.yml`** in any text editor.
2. Replace `REPLACE-WITH/your-repo-name` with `YOUR-NAME/beyond-rational`.
3. Commit and push that change.
4. Visit `https://YOUR-NAME.github.io/beyond-rational/admin/` → "Sign in with GitHub" → approve.

## Editing text and images — every day

1. Go to `https://YOUR-NAME.github.io/beyond-rational/admin/`.
2. Pick a page from the left sidebar (Home / Founders / Projects).
3. Edit fields. For images, drag-drop a new file or pick from media library.
4. Click **Save**.
5. The site updates in 30–60 seconds.

## What's editable via the CMS

| Page | Fields |
|---|---|
| **Home** | Hero eyebrows, title, subtitle, CTAs · Manifesto items (3) · What we make · Process · Studio stats · Closing CTA |
| **Founders** | Section labels · Each founder's name, role, email, phone, photo |
| **Projects** | Hero · 6 gallery images (image, title, meta) · Project list (number, title, meta, year) |

## What's NOT editable via the CMS

Structural design choices stay in HTML / CSS:

- The 8-section scroll story on `index.html`
- The 3D tile configurator, absorption chart, data grid on `product.html`
- The tabbed form structure on `contact.html`
- All animations, cursor, layout, colors

If you want to change those, edit the HTML directly or send a request.

## Local preview

```bash
cd "/path/to/this/folder"
python3 -m http.server 7750
# open http://localhost:7750
```

## Troubleshooting

- **CMS shows "no commit access"** → repo isn't public, or you logged in with the wrong GitHub account.
- **Edits don't appear on site** → wait 60 seconds for GitHub Pages to rebuild, or check Actions tab for errors.
- **Image upload fails** → file is too big. Compress to under 1 MB before upload.
- **Content shows old values after edit** → hard refresh the browser (Cmd+Shift+R on Mac).

## Brand assets

The B_R Design System lives in `br.css`. Tokens, components, motion utilities — all documented inline.
A live component reference is rendered at `/design-system.html`.
