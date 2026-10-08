import { $ } from './utils.js';

/**
 * Contact form.
 * - With data-endpoint (e.g. a Formspree URL) it posts via fetch and shows inline status.
 * - Without one, it composes an email to data-mailto so no enquiry is ever lost.
 */
export function initContactForm() {
  const form = $('[data-contact-form]');
  if (!form) return;
  const status = $('.form__status', form);
  const submit = $('[type="submit"]', form);

  // allow links like contact.html?interest=Speaking to preselect the dropdown
  const interest = new URLSearchParams(location.search).get('interest');
  if (interest) {
    const select = form.elements.interest;
    const match = Array.from(select.options).find((o) => o.text.toLowerCase().startsWith(interest.toLowerCase().slice(0, 12)));
    if (match) select.value = match.value;
  }

  const setStatus = (msg, type) => {
    status.textContent = msg;
    status.className = `form__status${type ? ` is-${type}` : ''}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (form.elements._gotcha.value) return; // bot

    const data = Object.fromEntries(new FormData(form));
    delete data._gotcha;
    const endpoint = form.dataset.endpoint;

    if (!endpoint) {
      const body = `Name: ${data.name}\nEmail: ${data.email}\nOrganisation: ${data.organisation || '-'}\nInterest: ${data.interest}\n\n${data.message}`;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(`Website enquiry: ${data.interest}`)}&body=${encodeURIComponent(body)}`;
      setStatus('Opening your email app to send the message…', 'success');
      return;
    }

    submit.disabled = true;
    setStatus('Sending…');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus('Thank you! Your message has been sent. Fara’a will be in touch soon.', 'success');
    } catch {
      setStatus(`Sorry, something went wrong. Please email ${form.dataset.mailto} directly.`, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
