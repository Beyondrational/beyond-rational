/* ============================================================
   B_R HubSpot — the HubSpot tracking code (portal 148769719, EU1),
   loaded only once the visitor has accepted in the consent bar.

   HubSpot's tracker sets cookies (hubspotutk, __hstc, __hssc,
   __hssrc) and reports page views back to HubSpot, so under the
   Danish cookie rules it must not run before consent is given.

   br.js owns the bar: it stores the choice in localStorage under
   brConsent ("accept" | "decline") and fires a br-consent event
   the moment a visitor picks one — listening for that event means
   tracking starts on the same page view rather than the next one.
   ============================================================ */

(function () {
  var HUBSPOT_PORTAL_ID = '148769719';
  var HUBSPOT_SRC = 'https://js-eu1.hs-scripts.com/' + HUBSPOT_PORTAL_ID + '.js';
  var SCRIPT_ID = 'hs-script-loader';
  var CONSENT_KEY = 'brConsent';

  function loadTracker() {
    if (document.getElementById(SCRIPT_ID)) return;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = HUBSPOT_SRC;
    document.head.appendChild(script);
  }

  function storedConsent() {
    // Private browsing and blocked site-data both throw on localStorage —
    // treat an unreadable store as "no consent yet" rather than failing.
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (err) {
      return null;
    }
  }

  if (storedConsent() === 'accept') {
    loadTracker();
    return;
  }

  document.addEventListener('br-consent', function (e) {
    if (e.detail === 'accept') loadTracker();
  });
})();
