# Decap CMS — opsætningsguide

Sådan får du Decap CMS til at virke på `/admin`, så du kan redigere tekst og
billeder selv. Siden hostes på **GitHub Pages**, og derfor skal Decap have en
lille gratis **login-hjælper** (en Cloudflare Worker) — det er det eneste
ekstra, og det er en engangsopgave.

> **Hvorfor en Worker?** Decap logger ind via GitHub OAuth, og det kræver en
> hemmelig nøgle der ikke må ligge i browseren. Worker'en holder nøglen og
> gennemfører login. Den kører gratis og passer sig selv.

Rækkefølgen er vigtig (Worker først, så OAuth App, så nøgler):

---

## Trin 1 — Deploy login-Worker'en (Cloudflare)

1. Opret en gratis konto på <https://dash.cloudflare.com> hvis du ikke har en.
2. Gå til repoet **<https://github.com/sveltia/sveltia-cms-auth>** og brug
   knappen **"Deploy to Cloudflare"** i deres README (eller: Cloudflare
   dashboard → **Workers & Pages** → **Create** → importér det repo).
   (Den hedder "sveltia" men er en standard OAuth-hjælper der også virker til Decap.)
3. Når den er deployet, notér Worker-URL'en. Den ser typisk sådan ud:
   `https://sveltia-cms-auth.DIT-SUBDOMÆNE.workers.dev`

➡️ **Gem denne URL — du bruger den i trin 2 og 4.**

---

## Trin 2 — Opret en GitHub OAuth App

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   (<https://github.com/settings/developers>).
2. Udfyld:
   - **Application name:** `Beyond Rational CMS`
   - **Homepage URL:** `https://beyondrational.github.io/beyond-rational/`
   - **Authorization callback URL:** `<DIN-WORKER-URL>/callback`
     (f.eks. `https://sveltia-cms-auth.dit-subdomæne.workers.dev/callback`)
3. Klik **Register application**.
4. Notér **Client ID**.
5. Klik **Generate a new client secret** → kopiér den med det samme
   (den vises kun én gang).

➡️ **Du har nu et Client ID og et Client Secret.**

---

## Trin 3 — Læg nøglerne ind i Worker'en

1. Cloudflare dashboard → **Workers & Pages** → vælg din `sveltia-cms-auth`
   Worker → **Settings → Variables and Secrets**.
2. Tilføj disse (markér de to som **Secret/Encrypted**):

   | Navn                   | Værdi                                   |
   |------------------------|------------------------------------------|
   | `GITHUB_CLIENT_ID`     | Client ID fra trin 2                     |
   | `GITHUB_CLIENT_SECRET` | Client Secret fra trin 2                 |
   | `ALLOWED_DOMAINS`      | `beyondrational.github.io,beyondrational.com` |

3. **Save / Deploy** så Worker'en genstarter med nøglerne.

> `ALLOWED_DOMAINS` sikrer at kun *dine* sider må bruge Worker'en til login.

---

## Trin 4 — Peg config'en på Worker'en

1. Åbn `admin/config.yml`.
2. Find linjen:
   ```yaml
   base_url: https://REPLACE-WITH-YOUR-WORKER.workers.dev
   ```
3. Erstat med din rigtige Worker-URL (uden `/callback`):
   ```yaml
   base_url: https://sveltia-cms-auth.dit-subdomæne.workers.dev
   ```
4. Gem, og push til GitHub:
   ```bash
   git add admin/config.yml
   git commit -m "chore: point Decap at OAuth worker"
   git push
   ```

---

## Trin 5 — Log ind og redigér

1. Vent ~1 min på at GitHub Pages opdaterer.
2. Gå til **<https://beyondrational.github.io/beyond-rational/admin/>**.
3. Klik **"Login with GitHub"** → godkend → du er inde.
4. Vælg en side i venstre side (Home / Founders / Projects / Wuud), ret tekst
   eller træk et nyt billede ind, klik **Save**.
5. Ændringen committes til GitHub, og siden opdaterer sig selv på ~1 min.

---

## Senere: når domænet flytter til beyondrational.com

Når `beyondrational.com` peger på GitHub Pages, skal du opdatere to ting:

1. **GitHub OAuth App** (trin 2): skift Homepage URL til
   `https://beyondrational.com/` (callback-URL'en til Worker'en ændres ikke).
2. `ALLOWED_DOMAINS` indeholder allerede `beyondrational.com`, så den er klar.

---

## Fejlfinding

| Symptom | Sandsynlig årsag |
|---|---|
| "Login with GitHub" gør ingenting / popup lukker straks | `base_url` peger forkert, eller callback-URL i OAuth App'en mangler `/callback` |
| "Error: Not Found" efter login | Worker'en mangler `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, eller de er forkerte |
| "origin not allowed" | Domænet hvor `/admin` ligger står ikke i `ALLOWED_DOMAINS` |
| Login virker, men "Save" fejler | OAuth App'en har ikke skriveadgang — tjek at du godkendte for repoet, eller at kontoen har push-adgang til `Beyondrational/beyond-rational` |
