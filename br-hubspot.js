/* ============================================================
   B_R HubSpot — activates the tracking code once the visitor
   has accepted in the consent bar.

   Each page carries the embed as an inert <script type="text/plain"
   id="hs-script-loader">. The browser parses that tag but never
   fetches or runs it, so nothing of HubSpot's exists on the page
   before consent — no cookies, no requests. Keeping the tag in the
   markup is what lets HubSpot's installation check find the portal
   script, since that check reads the served HTML and cannot see a
   script that only JS adds.

   HubSpot's own doNotTrack switch is not enough for this: with it
   set, the tracker still writes hubspotutk, __hstc, __hssc and
   __hssrc on the first page view. Not loading it at all is the only
   way to keep the page cookie-free until asked.

   br.js owns the bar: it stores the choice in localStorage under
   brConsent ("accept" | "decline") and fires a br-consent event the
   moment a visitor picks one, so tracking starts on the same page
   view as the click rather than the next one.
   ============================================================ */

(function () {
  var CONSENT_KEY = 'brConsent';
  var PLACEHOLDER_ID = 'hs-script-loader';

  function activateTracker() {
    var placeholder = document.getElementById(PLACEHOLDER_ID);
    if (!placeholder || placeholder.dataset.brActivated) return;
    placeholder.dataset.brActivated = 'true';

    // The live tag inherits the id so HubSpot finds what it expects; the
    // placeholder gives it up rather than leaving two elements sharing one.
    placeholder.removeAttribute('id');
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = PLACEHOLDER_ID;
    script.async = true;
    script.defer = true;
    script.src = placeholder.src;
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
    activateTracker();
    return;
  }

  document.addEventListener('br-consent', function (e) {
    if (e.detail === 'accept') activateTracker();
  });
})();
