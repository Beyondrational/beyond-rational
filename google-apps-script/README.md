# Form notifier — deploy instructions

**Superseded 2026-07-07:** the live site's forms submit to HubSpot's Forms
API instead (see `br-forms.js` in the repo root) — the Beyond Rational
Workspace has a policy that blocks anonymous access to Apps Script web apps,
which this deployment never got past. Left here in case that gets resolved
and this path is worth revisiting.

Replaces the old Odoo `website/form/` submission target. Runs entirely on
Google Workspace, no separate hosting needed.

## Deploy

1. Go to [script.google.com](https://script.google.com) while logged into
   the Workspace account that should send these emails (e.g. hello@ or your
   own account — the email will be *sent as* whichever account deploys this).
2. **New project** → paste in the contents of `form-notifier.gs`.
3. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (this is what lets the public website POST to
     it — it does not expose anything sensitive, it only *receives* form data)
4. Authorize the script when prompted (it needs permission to send email).
5. Copy the **Web app URL** it gives you — looks like
   `https://script.google.com/macros/s/AKfycb.../exec`.

## Wire it into the site

Give that URL to whoever is editing `contact.html` — every `<form
action="https://beyond-rational.odoo.com/website/form/">` (4 forms) and the
newsletter form get their `action` attribute swapped to this URL instead.
Nothing else about the forms changes — field names, validation, and the
submit buttons all stay exactly as they are.

## Optional: also forward to HubSpot

Only needed if you want these submissions to *also* create a HubSpot
contact/deal (separately from the email). In HubSpot: **Marketing → Forms →
Create form**, matching the field names in `FIELD_LABELS` in the script.
Once created, HubSpot gives you a **portal ID** and a **form GUID** per form.
Paste those into `HUBSPOT_PORTAL_ID` and `HUBSPOT_FORM_GUIDS` at the top of
the script and redeploy (**Deploy → Manage deployments → Edit → New version**).
Leave `HUBSPOT_PORTAL_ID` blank to skip this entirely — the email still sends
either way.

## Test it

After deploying, open the Web app URL directly in a browser — you should see
a plain "Thanks — redirecting you back…" page (a GET request with no form
data, so the email step is skipped safely). Then submit a real test entry
from each of the 4 forms + the newsletter form on the live site and confirm
the email arrives at hello@beyondrational.com formatted with bold labels.

## Redeploying after edits

Google Apps Script Web app URLs stay stable across **New version** deploys
(Deploy → Manage deployments → Edit existing deployment → New version), so
editing `FIELD_LABELS`, `HUBSPOT_*`, or anything else later doesn't require
updating the site's form `action` attributes again.
