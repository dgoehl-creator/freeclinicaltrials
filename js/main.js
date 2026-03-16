/* FreeClinicalTrials.com — Main JS */

/* ---- Mobile nav ---- */
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
}

/* ---- ClinicalTrials.gov API v2 ---- */
const CT_API = 'https://clinicaltrials.gov/api/v2/studies';

function buildQuery(condition, zip) {
  const params = new URLSearchParams({
    'query.cond': condition,
    'filter.overallStatus': 'RECRUITING',
    'pageSize': '20',
    'fields': 'NCTId,BriefTitle,BriefSummary,Condition,Phase,LocationCity,LocationState,LocationZip,LeadSponsorName,StartDate,PrimaryCompletionDate,EligibilityCriteria,CentralContactName,CentralContactPhone,CentralContactEMail'
  });
  if (zip) params.set('query.locn', zip);
  return `${CT_API}?${params.toString()}`;
}

function phaseLabel(phases) {
  if (!phases || !phases.length) return 'Phase N/A';
  return phases.join(' / ').replace('PHASE', 'Phase ').replace('_', ' ');
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

function renderTrial(study) {
  const p = study.protocolSection || {};
  const id   = p.identificationModule || {};
  const cond = p.conditionsModule     || {};
  const elig = p.eligibilityModule    || {};
  const loc  = p.contactsLocationsModule || {};
  const stat = p.statusModule         || {};
  const spon = p.sponsorCollaboratorsModule || {};
  const desc = p.descriptionModule    || {};

  const nctId    = id.nctId || '';
  const title    = id.briefTitle || 'Untitled Study';
  const summary  = truncate(desc.briefSummary || 'No summary available.', 220);
  const phases   = (stat.phases || []);
  const sponsor  = spon.leadSponsor ? spon.leadSponsor.name : '';
  const locs     = (loc.locations || []).slice(0, 3).map(l => [l.city, l.state].filter(Boolean).join(', ')).join(' · ') || 'Locations vary';

  return `
    <div class="trial-card">
      <div class="trial-header">
        <div class="trial-title">${title}</div>
        ${phases.length ? `<span class="trial-phase">${phaseLabel(phases)}</span>` : ''}
      </div>
      <div class="trial-meta">
        <span>📍 ${locs}</span>
        ${sponsor ? `<span>🏛 ${truncate(sponsor, 40)}</span>` : ''}
      </div>
      <div class="trial-summary">${summary}</div>
      <div class="trial-actions">
        <a href="https://clinicaltrials.gov/study/${nctId}" target="_blank" rel="noopener" class="btn btn-teal btn-sm">View Full Trial →</a>
        <span class="trial-id">${nctId}</span>
      </div>
    </div>`;
}

async function searchTrials(condition, zip, resultsEl, countEl) {
  resultsEl.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Searching 400,000+ active trials…</p></div>`;

  try {
    const res  = await fetch(buildQuery(condition, zip));
    const data = await res.json();
    const studies = data.studies || [];

    if (countEl) countEl.textContent = studies.length ? `${studies.length} recruiting trials found` : '';

    if (!studies.length) {
      resultsEl.innerHTML = `<div class="empty-state"><p>No recruiting trials found for <strong>${condition}</strong>${zip ? ` near ${zip}` : ''}.</p><p>Try a broader condition name or remove the zip code filter.</p></div>`;
      return;
    }

    resultsEl.innerHTML = studies.map(renderTrial).join('');
  } catch (e) {
    resultsEl.innerHTML = `<div class="empty-state"><p>Error loading trials. Please try again in a moment.</p></div>`;
    console.error(e);
  }
}

/* ---- Home page search form ---- */
const homeForm = document.getElementById('home-search-form');
if (homeForm) {
  homeForm.addEventListener('submit', e => {
    e.preventDefault();
    const condition = document.getElementById('search-condition').value.trim();
    const zip       = document.getElementById('search-zip').value.trim();
    if (!condition) return;
    const q = new URLSearchParams({ condition });
    if (zip) q.set('zip', zip);
    window.location.href = `/search?${q.toString()}`;
  });
}

/* ---- Search results page ---- */
const resultsEl = document.getElementById('results-container');
if (resultsEl) {
  const params    = new URLSearchParams(window.location.search);
  const condition = params.get('condition') || '';
  const zip       = params.get('zip') || '';
  const countEl   = document.getElementById('results-count');

  // Populate header fields
  const condDisplay = document.getElementById('condition-display');
  if (condDisplay) condDisplay.textContent = condition || 'All Conditions';

  const searchBarCond = document.getElementById('results-condition-input');
  const searchBarZip  = document.getElementById('results-zip-input');
  if (searchBarCond) searchBarCond.value = condition;
  if (searchBarZip)  searchBarZip.value  = zip;

  if (condition) {
    searchTrials(condition, zip, resultsEl, countEl);
  } else {
    resultsEl.innerHTML = `<div class="empty-state"><p>Enter a condition above to search for trials.</p></div>`;
  }

  // Results page search form
  const resultsForm = document.getElementById('results-search-form');
  if (resultsForm) {
    resultsForm.addEventListener('submit', e => {
      e.preventDefault();
      const c = searchBarCond.value.trim();
      const z = searchBarZip ? searchBarZip.value.trim() : '';
      if (!c) return;
      const q = new URLSearchParams({ condition: c });
      if (z) q.set('zip', z);
      window.location.href = `/search?${q.toString()}`;
    });
  }
}

/* ---- Condition page auto-search ---- */
const conditionPageEl = document.getElementById('condition-results');
if (conditionPageEl) {
  const conditionName = conditionPageEl.dataset.condition;
  if (conditionName) searchTrials(conditionName, '', conditionPageEl, document.getElementById('condition-results-count'));
}

/* ---- Email forms (all pages) ---- */
document.querySelectorAll('.email-signup-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    const condition = form.dataset.condition || '';
    if (!email) return;
    // In production: POST to Beehiiv/ConvertKit API
    form.innerHTML = `<p style="color:#1a5c6b;font-weight:600;text-align:center">✓ You're on the list! We'll alert you when new trials open${condition ? ` for ${condition}` : ''}.</p>`;
  });
});
