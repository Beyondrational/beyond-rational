/* ============================================================
   B_R Forms — submits the 4 contact forms + newsletter form to
   HubSpot's public Forms API instead of a server-rendered action.
   Fields are folded into HubSpot's standard "message" property
   (labelled, one per line) alongside "email", since the HubSpot
   form itself only has those two fields wired up.
   ============================================================ */

(function () {
  var HUBSPOT_PORTAL_ID = '148769719';
  var HUBSPOT_FORM_GUID = '6cb2a245-ea0f-472c-9457-91f0753094df';
  var HUBSPOT_SUBMIT_URL =
    'https://api-eu1.hsforms.com/submissions/v3/integration/submit/' +
    HUBSPOT_PORTAL_ID + '/' + HUBSPOT_FORM_GUID;

  var FIELD_LABELS = {
    contact_name: 'Full name',
    email_from: 'Email',
    phone: 'Phone',
    partner_name: 'Office / company',
    finish: 'Preferred colour',
    description: 'Message',
    function: 'Role',
    project_name: 'Project name',
    project_type: 'Project type',
    area_m2: 'Area (m²)',
    target_date: 'Target completion',
    info_kind: 'What they need'
  };
  var SKIP_FIELDS = { name: true, email: true };

  function buildMessage(form, formData) {
    var lines = [(formData.get('name') || 'Website enquiry') + ':', ''];
    formData.forEach(function (value, key) {
      if (SKIP_FIELDS[key] || value === '') return;
      lines.push((FIELD_LABELS[key] || key) + ': ' + value);
    });
    return lines.join('\n');
  }

  function showResult(form, message, isError) {
    var box = form.querySelector('.bra-form-result');
    if (!box) {
      box = document.createElement('p');
      box.className = 'bra-form-result';
      form.appendChild(box);
    }
    box.textContent = message;
    box.classList.toggle('is-error', !!isError);
  }

  function submitToHubSpot(form) {
    var formData = new FormData(form);
    var email = formData.get('email_from') || formData.get('email') || '';
    var fields = [{ name: 'email', value: email }, { name: 'message', value: buildMessage(form, formData) }];

    return fetch(HUBSPOT_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: fields,
        context: { pageUri: window.location.href, pageName: document.title }
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('HubSpot submission failed (' + res.status + ')');
    });
  }

  function wireForm(form, submitLabel) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var btnText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      submitToHubSpot(form)
        .then(function () {
          form.reset();
          showResult(form, "Thanks — we'll be in touch shortly.", false);
        })
        .catch(function () {
          showResult(form, "Something went wrong sending this — please email us directly at hello@beyondrational.com.", true);
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
        });
    });
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) { wireForm(form); });

  var newsletter = document.querySelector('form[data-newsletter]');
  if (newsletter) wireForm(newsletter);
})();
