/**
 * Beyond Rational — contact + newsletter form notifier.
 *
 * Receives the site's <form> POSTs (replacing the old Odoo website-form
 * action), sends a formatted notification email via Google Workspace, and
 * optionally forwards the same data to a HubSpot form.
 *
 * Deploy as a Web App (see README.md in this folder). The exec URL you get
 * back is what goes into every <form action="..."> on the site.
 */

var NOTIFY_TO = 'hello@beyondrational.com';

// HubSpot forward is optional — leave PORTAL_ID empty to skip it entirely.
// Fill in once the matching form exists in HubSpot (Marketing > Forms) and
// you have its portal ID + form GUID.
var HUBSPOT_PORTAL_ID = '';
var HUBSPOT_FORM_GUIDS = {
  'Sample box request': '',
  'Project specification request': '',
  'Information request': '',
  'General enquiry': '',
  'Newsletter signup': ''
};

// Human-readable labels per field name, used to build the email body.
// Fields not listed here are skipped (bookkeeping fields like team_id).
var FIELD_LABELS = {
  contact_name: 'Full name',
  email_from: 'Email',
  phone: 'Phone',
  partner_name: 'Studio / company',
  finish: 'Preferred colour',
  description: 'Message',
  function: 'Role',
  project_name: 'Project name',
  project_type: 'Project type',
  area_m2: 'Area (m²)',
  target_date: 'Target completion',
  info_kind: 'What they need'
};

// Fields that should never appear in the email body even if present.
var SKIP_FIELDS = { name: true, team_id: true, tag_ids: true };

function doPost(e) {
  var params = (e && e.parameter) || {};

  // The newsletter form only ever sends an email address, no "name" field.
  var isNewsletter = !params.name && params.email && Object.keys(params).length <= 2;

  var subject = isNewsletter ? 'signup' : (params.name || 'Website enquiry');
  var htmlBody = isNewsletter
    ? '<p><b>Email</b><br>' + escapeHtml(params.email) + '</p>'
    : buildHtmlBody(params);

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: subject,
    htmlBody: htmlBody,
    body: htmlToPlainFallback(htmlBody)
  });

  forwardToHubSpot(subject, params, isNewsletter);

  return HtmlOutput_thanks();
}

function buildHtmlBody(params) {
  var rows = [];
  Object.keys(params).forEach(function (key) {
    if (SKIP_FIELDS[key]) return;
    var value = params[key];
    if (value === '' || value == null) return;
    var label = FIELD_LABELS[key] || key;
    rows.push('<p><b>' + escapeHtml(label) + '</b><br>' + escapeHtml(value) + '</p>');
  });
  return rows.join('\n');
}

function htmlToPlainFallback(html) {
  return html.replace(/<br>/g, '\n').replace(/<\/?[^>]+>/g, '').trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Best-effort forward to HubSpot's public Forms submission endpoint.
 * Safe to leave disabled (HUBSPOT_PORTAL_ID = '') — silently no-ops.
 * Never throws: a HubSpot hiccup must not block the email notification.
 */
function forwardToHubSpot(formName, params, isNewsletter) {
  if (!HUBSPOT_PORTAL_ID) return;
  var guid = HUBSPOT_FORM_GUIDS[isNewsletter ? 'Newsletter signup' : formName];
  if (!guid) return;

  try {
    var fields = Object.keys(params)
      .filter(function (k) { return !SKIP_FIELDS[k] && params[k] !== ''; })
      .map(function (k) { return { name: k, value: params[k] }; });

    UrlFetchApp.fetch(
      'https://api.hsforms.com/submissions/v3/integration/submit/' + HUBSPOT_PORTAL_ID + '/' + guid,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ fields: fields }),
        muteHttpExceptions: true
      }
    );
  } catch (err) {
    // Swallow — HubSpot forwarding is a nice-to-have, not the primary path.
  }
}

function HtmlOutput_thanks() {
  // Update this once beyondrational.com's DNS points at GitHub Pages instead
  // of the old Squarespace site — until then this is the real live URL.
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="refresh" content="1;url=https://beyondrational.github.io/beyond-rational/contact.html?sent=1#form-section">' +
    '<style>body{font-family:sans-serif;padding:48px;color:#1c1c1a;}</style></head>' +
    '<body>Thanks — redirecting you back…</body></html>'
  );
}
