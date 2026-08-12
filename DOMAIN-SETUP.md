# Domæneflytning — beyondrational.com → GitHub Pages

I dag ligger `beyondrational.com`'s DNS hos **Squarespace**, og det er stadig
den gamle Squarespace-side, der er live på domænet. Den nye side (den vi
bygger her) ligger på **GitHub Pages** under
`beyondrational.github.io/beyond-rational/`. Denne guide flytter selve
domænet over, så `beyondrational.com` viser den nye side.

Det er **samme domæne hele vejen** — kun *hvor det peger hen* ændres. I skal
ikke købe et nyt domæne, og det påvirker ikke jeres SEO nævneværdigt, fordi
adressen forbliver den samme.

> ⚠️ **Rør ikke ved e-mail-indstillinger.** Hvis I sender/modtager mail på
> `@beyondrational.com`, styres det af **MX-records** i DNS. Dem må I ikke
> slette eller ændre i denne proces — kun A-, AAAA- og CNAME-records for selve
> hjemmesiden skal ændres.

---

## Trin 1 — Forbered i GitHub

*(Denne del kan jeg gøre for dig, hvis du siger til.)*

1. Repo → **Settings → Pages → Custom domain** → indtast `beyondrational.com` → **Save**.
   Det opretter automatisk en `CNAME`-fil i roden af repoet med indholdet
   `beyondrational.com` — det er sådan GitHub ved, hvilket domæne der hører til.
2. Dette trin er **harmløst at gøre først** — der sker ikke noget med den
   live side, før DNS (trin 2) også peger herhen.
3. Når DNS er sat op (trin 2–3), dukker en grøn "DNS check successful" op i
   samme indstilling, og du kan slå **"Enforce HTTPS"** til.

---

## Trin 2 — DNS hos Squarespace

*(Dette skal du gøre selv — jeg har ikke adgang til jeres Squarespace-konto.)*

1. Log ind på Squarespace → **Settings → Domains** (eller **Domains** i
   venstremenuen) → vælg `beyondrational.com` → **DNS Settings**
   (nogle gange kaldet "Advanced DNS" eller "Custom Records").

2. **Tag et screenshot af de nuværende records, før du ændrer noget.**
   Det er jeres nødbremse, hvis noget skal rulles tilbage (se Trin 6).

3. Tilføj/ret følgende records for roddomænet (`@` / `beyondrational.com`):

   | Type | Navn | Værdi |
   |------|------|-------|
   | A | @ | `185.199.108.153` |
   | A | @ | `185.199.109.153` |
   | A | @ | `185.199.110.153` |
   | A | @ | `185.199.111.153` |
   | AAAA *(valgfrit, IPv6)* | @ | `2606:50c0:8000::153` |
   | AAAA *(valgfrit)* | @ | `2606:50c0:8001::153` |
   | AAAA *(valgfrit)* | @ | `2606:50c0:8002::153` |
   | AAAA *(valgfrit)* | @ | `2606:50c0:8003::153` |
   | CNAME | www | `beyondrational.github.io` |

4. **Fjern** de gamle A/CNAME-records, der i dag peger på Squarespace's egen
   hosting (typisk Squarespace-specifikke IP'er eller noget med
   `ext-cust.squarespace.com`). Der må ikke stå to modstridende A-records for
   samme navn.

5. Lad **MX-records og alt andet ikke-hosting-relateret stå urørt.**

---

## Trin 3 — Vent på DNS-propagering

DNS-ændringer breder sig typisk på under en time, men kan i sjældne tilfælde
tage op til 24–48 timer.

Tjek status med <https://dnschecker.org> — søg på `beyondrational.com` og se
om A-records viser GitHub's IP'er globalt.

---

## Trin 4 — Bekræft i GitHub

Gå tilbage til repo → **Settings → Pages**. Når DNS er slået igennem, viser
GitHub "DNS check successful", og du kan slå **"Enforce HTTPS"** til (kan
tage op til et par timer, før certifikatet er klar første gang).

---

## Trin 5 — Opdater Decap CMS-loginet

Der er allerede forberedt til dette i [DECAP-SETUP.md](DECAP-SETUP.md) (afsnittet
"Senere: når domænet flytter til beyondrational.com"):

1. GitHub → **Settings → Developer settings → OAuth Apps** → jeres CMS-app
   → skift **Homepage URL** til `https://beyondrational.com/`.
   (Callback-URL'en til Cloudflare Worker'en skal *ikke* ændres.)
2. `ALLOWED_DOMAINS` i Worker'en indeholder allerede `beyondrational.com`,
   så der er intet at gøre der.
3. Herefter ligger CMS'et på `https://beyondrational.com/admin/`.

---

## Trin 6 — Efter cutover

- Tjek at både `https://beyondrational.com` og `https://www.beyondrational.com`
  virker og viser den nye side, med hængelås (HTTPS) uden advarsler.
- **Vent med at opsige eller nedgradere Squarespace-hosting-abonnementet**,
  til I har testet i mindst et par dage. I beholder typisk selve
  domæneregistreringen uanset hosting-plan.
- **Rollback, hvis noget går galt:** sæt DNS-records tilbage til det, du
  noterede/screenshottede i Trin 2. Den gamle Squarespace-side er live igen,
  så snart DNS peger tilbage.

---

## Én ting at være opmærksom på bagefter

Den gamle Squarespace-side og den nye side har ikke nødvendigvis samme
side-adresser (fx `/about-us` findes måske ikke på den nye side under samme
navn). Hvis nogen har delt eller bogmærket gamle links, vil de nu få en
404-side i stedet for et automatisk redirect. Det er ikke noget, der skal
løses før selve domæneflytningen — men sig til, hvis du vil have en oversigt
over hvilke gamle URL'er der er værd at omdirigere, så laver jeg nogle små
redirect-sider til dem.
