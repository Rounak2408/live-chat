/**
 * Sets window.API_BASE from <meta name="api-base" content="..."> when not empty.
 * Use when frontend is on Netlify/Vercel and API on Render — put your backend URL (no trailing slash).
 * Leave meta content empty when Node serves /public (same server as API).
 */
(function () {
  if (typeof window.API_BASE === 'string') return;
  var meta = document.querySelector('meta[name="api-base"]');
  var c = meta && meta.getAttribute('content');
  if (c && String(c).trim()) {
    window.API_BASE = String(c).trim().replace(/\/$/, '');
  }
})();
