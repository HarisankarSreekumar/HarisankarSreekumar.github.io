// Site checks: node tests/check.mjs [filter]
// Loads pages over file:// with the pre-installed Playwright and asserts content, layout and behaviour rules.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
const check = (name, fn) => checks.push({ name, fn });

let browser;
async function page(rel, { width = 1440, height = 900, js = true, reducedMotion = 'no-preference', root = ROOT } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion });
  const p = await ctx.newPage();
  p._errors = [];
  p.on('pageerror', e => p._errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) p._errors.push(m.text()); });
  // Missing files are errors, except owner-supplied screenshots under assets/img/ that may not exist yet.
  p.on('requestfailed', r => { if (!r.url().includes('/assets/img/')) p._errors.push('request failed: ' + r.url()); });
  await p.goto(pathToFileURL(path.join(root, rel)).href, { waitUntil: 'load' });
  return p;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function noHScroll(p) {
  const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert(sw <= iw, `horizontal scroll: scrollWidth ${sw} > innerWidth ${iw}`);
}
async function bannedText(p, list) {
  const text = await p.evaluate(() => document.body.innerText);
  const hits = list.filter(s => (s instanceof RegExp ? s.test(text) : text.toLowerCase().includes(s.toLowerCase())));
  assert(hits.length === 0, `banned text present: ${hits.join(' | ')}`);
}
const src = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const BANNED = ['R²', '0.999', '0.975', 'TEF submission', 'institutional baseline', 'Running in production',
  'Sole owner', 'moving into Data Science'];
// Owner-private strings (exact operational counts, contact details, employer names) live in an untracked file.
const PRIVATE_FILE = path.join(ROOT, 'tests/private-banned.json');
const PRIVATE = fs.existsSync(PRIVATE_FILE) ? JSON.parse(fs.readFileSync(PRIVATE_FILE, 'utf8')) : { home: [], case: [] };
const HOME = 'index.html';
const CASE = 'projects/contracts-lifecycle-dashboard/index.html';

// ---------------- Task 1 ----------------
check('home: no horizontal scroll at 360 and 1440', async () => {
  for (const w of [360, 1440]) { const p = await page(HOME, { width: w, height: 800 }); await noHScroll(p); }
});
check('home: all sections visible with JS disabled', async () => {
  const p = await page(HOME, { js: false });
  const hidden = await p.evaluate(() => [...document.querySelectorAll('section')]
    .filter(s => getComputedStyle(s).opacity !== '1').map(s => s.id || s.className));
  assert(hidden.length === 0, `hidden sections without JS: ${hidden.join(', ')}`);
});
check('home: no console errors', async () => {
  const p = await page(HOME); await p.waitForTimeout(300);
  assert(p._errors.length === 0, p._errors.join('\n'));
});
check('home: loads assets/css/site.css', async () => {
  const p = await page(HOME);
  const ok = await p.evaluate(() => [...document.styleSheets].some(s => (s.href || '').endsWith('assets/css/site.css')));
  assert(ok, 'site.css not linked');
});

// ---------------- Task 2 ----------------
check('home: hero banned text absent', async () => {
  const p = await page(HOME);
  const text = await p.evaluate(() => document.querySelector('#top').innerText + document.title);
  const hits = [...BANNED, ...PRIVATE.home].filter(s => text.toLowerCase().includes(s.toLowerCase()));
  assert(!hits.length, `banned text in hero: ${hits.join(' | ')}`);
});
check('home: positioning', async () => {
  const p = await page(HOME);
  const t = await p.evaluate(() => document.querySelector('#top').innerText);
  assert(/Data \/ BI Analyst/i.test(t), 'hero missing "Data / BI Analyst"');
  assert(/Open to Data & BI Analyst roles/i.test(t), 'hero missing status line');
});
check('home: proof strip above fold at 1440x900', async () => {
  const p = await page(HOME, { width: 1440, height: 900 });
  const r = await p.evaluate(() => { const e = document.querySelector('[data-proof]'); return e && { b: e.getBoundingClientRect().bottom, t: e.innerText }; });
  assert(r, 'no [data-proof]');
  assert(r.b <= 900, `proof strip bottom ${r.b} > 900`);
  for (const s of ['~50%', '200+', '3+', '6,500']) assert(r.t.includes(s), `proof strip missing ${s}`);
});
check('home: hero chart uses only real figures', async () => {
  const p = await page(HOME);
  const label = await p.evaluate(() => document.querySelector('svg#hero-chart')?.getAttribute('aria-label') || '');
  assert(label.includes('56%') && label.includes('40 working days'), `bad hero chart label: "${label}"`);
  const html = src(HOME);
  assert(!/Math\.random|rng\(/.test(html), 'synthetic data generator still in index.html');
});
check('home: case study CTA resolves', async () => {
  const p = await page(HOME);
  const href = await p.evaluate(() => document.querySelector('#top .btn.solid')?.getAttribute('href') || '');
  assert(href.endsWith('projects/contracts-lifecycle-dashboard/index.html'), `CTA href: ${href}`);
  await p.click('#top .btn.solid');
  await p.waitForLoadState('load');
  const h1 = await p.evaluate(() => document.querySelector('h1')?.innerText.trim() || '');
  assert(p.url().includes('contracts-lifecycle-dashboard') && h1, 'case study page did not load');
});
check('home: no phone number', async () => {
  assert(!/\b0\d{4}\s?\d{6}\b|\+44/.test(src(HOME)), 'phone number present');
});
check('home: CV links use one constant', async () => {
  const p = await page(HOME);
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('[data-cv]')].map(a => a.href));
  assert(hrefs.length >= 1 && hrefs.every(h => h.endsWith('Harisankar_Sreekumar_Resume.pdf')), `CV links: ${hrefs}`);
  assert(/const CV_URL\s*=\s*'Harisankar_Sreekumar_Resume\.pdf'/.test(src(HOME)), 'CV_URL constant missing');
});

// ---------------- Task 3 ----------------
check('home: banned text absent (whole page)', async () => {
  const p = await page(HOME); await bannedText(p, [...BANNED, ...PRIVATE.home]);
});
check('home: work section order', async () => {
  const p = await page(HOME);
  const r = await p.evaluate(() => {
    const w = document.querySelector('#work'); if (!w) return null;
    const f = w.querySelector('[data-featured]');
    return { featured: f ? f.innerText : '', text: w.innerText };
  });
  assert(r, 'no #work');
  assert(r.featured.includes('Contracts Lifecycle'), 'featured card missing Contracts Lifecycle');
  const order = ['Contracts Lifecycle', 'Retail demand forecasting', 'Departmental performance review', 'Kimball',
    'Local RAG Agent', 'Nottingham', 'Nvidia', 'In progress', 'grocery', 'HVAC'];
  let pos = -1;
  for (const s of order) {
    const i = r.text.toLowerCase().indexOf(s.toLowerCase(), pos + 1);
    assert(i > pos, `"${s}" missing or out of order in #work`); pos = i;
  }
});
check('home: repo links', async () => {
  const p = await page(HOME);
  const hrefs = (await p.evaluate(() => [...document.querySelectorAll('#work a')].map(a => a.href))).join(' ');
  for (const r of ['github.com/HarisankarSreekumar/retail-forecasting-thesis', 'github.com/HarisankarSreekumar/Local_rag_agent',
    'github.com/HarisankarSreekumar/UoN-Attainment-analysis-', 'github.com/HarisankarSreekumar/nvidia-stock-dashboard'])
    assert(hrefs.includes(r), `missing link ${r}`);
});
check('home: Warwick card does not link the case study', async () => {
  const p = await page(HOME);
  const bad = await p.evaluate(() => { const c = document.querySelector('[data-card="review"]');
    return !c ? 'no review card' : [...c.querySelectorAll('a')].some(a => a.getAttribute('href').includes('projects/')) ? 'links case study' : ''; });
  assert(!bad, bad);
});
check('home: Kimball framing', async () => {
  const p = await page(HOME);
  const t = await p.evaluate(() => document.querySelector('[data-card="kimball"]')?.innerText || '');
  assert(t.includes('Data With Baraa') && t.includes('then modified'), `Kimball card text: ${t.slice(0, 80)}`);
});
check('home: experience', async () => {
  const p = await page(HOME);
  const r = await p.evaluate(() => {
    const e = document.querySelector('#experience'); if (!e) return null;
    const w = [...e.querySelectorAll('.role')].find(x => x.textContent.includes('University of Warwick'));
    return { text: e.textContent, warwick: w ? w.textContent : '' };
  });
  assert(r, 'no #experience');
  let pos = -1;
  for (const s of ['Mercor', 'University of Warwick', 'London Metropolitan', 'City St George', 'Tata Consultancy Services']) {
    const i = r.text.indexOf(s, pos + 1); assert(i > pos, `"${s}" missing or out of order`); pos = i;
  }
  assert(/Dec 2025/.test(r.warwick) && /Jun 2026/.test(r.warwick), 'Warwick dates wrong');
  assert(!/present/i.test(r.warwick), 'Warwick shown as present');
});
check('home: acronyms explained', async () => {
  const p = await page(HOME);
  const bad = await p.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) {
      if (/\b(SITS|OfS|TEF|NSS)\b/.test(n.nodeValue) && !n.parentElement.closest('abbr[title]') && !n.parentElement.closest('script,style')) out.push(n.nodeValue.trim().slice(0, 40));
    }
    return out;
  });
  assert(!bad.length, `unexplained acronyms: ${bad.join(' | ')}`);
});
check('home: certifications order', async () => {
  const p = await page(HOME);
  const li = await p.evaluate(() => [...document.querySelectorAll('#certs li')].map(l => l.innerText));
  const want = ['Google Cloud', 'Google Analytics', 'PL-300', 'BCG', 'Snowflake'];
  assert(li.length === 5 && want.every((w, i) => li[i].includes(w)), `certs: ${li.join(' / ')}`);
  assert(/in progress/i.test(li[2]), 'PL-300 not marked in progress');
});
check('home: skills legend', async () => {
  const p = await page(HOME);
  const r = await p.evaluate(() => { const g = [...document.querySelectorAll('#skills li')].find(l => /GCP|Google Cloud/.test(l.innerText)); return g ? g.className : null; });
  assert(r !== null, 'no GCP skill item');
  assert(!/\bb\b/.test(r), 'GCP marked as building');
});

// ---------------- Task 4 ----------------
check('case: banned text absent', async () => {
  const p = await page(CASE); await bannedText(p, [...BANNED, ...PRIVATE.case]);
});
check('case: no horizontal scroll at 360 and 1440', async () => {
  for (const w of [360, 1440]) { const p = await page(CASE, { width: w, height: 800 }); await noHScroll(p); }
});
check('case: no console errors', async () => {
  const p = await page(CASE); await p.waitForTimeout(300);
  assert(p._errors.length === 0, p._errors.join('\n'));
});
check('case: sections in order', async () => {
  const p = await page(CASE);
  const hs = (await p.evaluate(() => [...document.querySelectorAll('h2')].map(h => h.textContent.trim()))).join(' | ');
  let pos = -1;
  for (const s of ['Overview', 'Business problem', 'Workflow', 'Data preparation', 'Data model', 'DAX & business logic',
    'Dashboard', 'Findings', 'Recommendations', 'Skills']) {
    const i = hs.indexOf(s, pos + 1); assert(i > pos, `heading "${s}" missing or out of order in: ${hs}`); pos = i;
  }
});
check('case: KPI cards', async () => {
  const p = await page(CASE);
  const k = await p.evaluate(() => [...document.querySelectorAll('[data-kpi]')].map(e => e.textContent));
  assert(k.length === 5, `expected 5 KPI cards, got ${k.length}`);
  const all = k.join(' ');
  for (const s of ['~6,500', '~56%', '~50', '~65%', '~26']) assert(all.includes(s), `KPI cards missing ${s}`);
});
check('case: data model', async () => {
  const p = await page(CASE);
  const r = await p.evaluate(() => {
    const svg = document.querySelector('svg#model'); if (!svg) return null;
    const tables = [...svg.querySelectorAll('[data-table]')].map(t => t.getAttribute('data-table')).sort();
    const rels = [...svg.querySelectorAll('[data-rel]')].map(e => ({ kind: e.getAttribute('data-rel'), from: e.getAttribute('data-from'), to: e.getAttribute('data-to'), dash: e.getAttribute('stroke-dasharray') || getComputedStyle(e).strokeDasharray }));
    return { role: svg.getAttribute('role'), tables, rels };
  });
  assert(r, 'no svg#model');
  assert(r.role === 'img', 'svg#model missing role=img');
  assert(JSON.stringify(r.tables) === JSON.stringify(['Dim_Contract_stages', 'Dim_Contracts', 'Dim_date', 'Fact_Contract', 'Fact_Contract_stages']), `tables: ${r.tables}`);
  const inactive = r.rels.filter(x => x.kind === 'inactive');
  assert(inactive.length === 1, `expected 1 inactive relationship, got ${inactive.length}`);
  const ia = inactive[0];
  assert([ia.from, ia.to].sort().join() === 'Dim_date,Fact_Contract', `inactive rel between ${ia.from} and ${ia.to}`);
  assert(ia.dash && ia.dash !== 'none', 'inactive relationship not dashed');
  assert(!r.rels.some(x => x.from.startsWith('Fact_') && x.to.startsWith('Fact_')), 'fact-to-fact relationship drawn');
});
check('case: DAX blocks', async () => {
  const p = await page(CASE);
  const r = await p.evaluate(() => ({ n: document.querySelectorAll('details').length, t: [...document.querySelectorAll('details')].map(d => d.textContent).join(' ') }));
  assert(r.n >= 3, `only ${r.n} <details>`);
  for (const s of ['NETWORKDAYS', 'TREATAS', 'Within Target', 'Breached', 'Open', 'Overdue Open']) assert(r.t.includes(s), `DAX blocks missing ${s}`);
});
check('case: recommendations labelled', async () => {
  const p = await page(CASE);
  const t = await p.evaluate(() => document.querySelector('#recommendations')?.textContent || '');
  assert(/Recommendations/.test(t) && /not implemented outcomes/.test(t), 'recommendations not labelled as such');
});
check('case: missing screenshots show placeholders', async () => {
  const p = await page(CASE); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({
    shots: [...document.querySelectorAll('.shot')].map(f => ({ src: f.dataset.src, text: f.textContent })),
    broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length,
  }));
  assert(r.shots.length === 2, `expected 2 .shot, got ${r.shots.length}`);
  for (const s of r.shots) { const name = s.src.split('/').pop(); assert(s.text.includes(name), `placeholder for ${name} missing`); }
  assert(r.broken === 0, `${r.broken} broken images`);
});
check('case: back link resolves on file://', async () => {
  const p = await page(CASE);
  const href = await p.evaluate(() => document.querySelector('a[data-back]')?.getAttribute('href'));
  assert(href === '../../index.html', `back link: ${href}`);
  await p.click('a[data-back]'); await p.waitForLoadState('load');
  assert(p.url().endsWith('/index.html') && !p.url().includes('projects'), `back went to ${p.url()}`);
});
check('case: all sections visible with JS disabled', async () => {
  const p = await page(CASE, { js: false });
  const hidden = await p.evaluate(() => [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).opacity !== '1').length);
  assert(hidden === 0, `${hidden} hidden sections without JS`);
});

// ---------------- Task 5 ----------------
check('case: lightbox keyboard', async () => {
  const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const d of ['index.html', 'assets', 'projects'])
    fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(tmp, 'assets/img/contracts/page-1-overview.png'), png);
  const p = await page(CASE, { root: tmp }); await p.waitForTimeout(300);
  const trig = p.locator('.shot button.enlarge').first();
  assert(await trig.count() === 1, 'no enlarge button on loaded screenshot');
  await trig.focus(); await p.keyboard.press('Enter');
  const src = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.querySelector('img')?.getAttribute('src'); });
  assert(src && src.endsWith('page-1-overview.png'), `dialog not open with image (src=${src})`);
  await p.keyboard.press('Escape');
  const r = await p.evaluate(() => ({ open: !!document.querySelector('dialog[open]'), focusOk: document.activeElement?.classList.contains('enlarge') }));
  assert(!r.open, 'dialog still open after Escape');
  assert(r.focusOk, 'focus not returned to trigger');
  const phButtons = await p.evaluate(() => [...document.querySelectorAll('.shot:not(.loaded)')].filter(f => f.querySelector('button')).length);
  assert(phButtons === 0, 'placeholder has a focusable trigger');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------- Final review fixes ----------------
check('repo: tracked files contain no private strings', async () => {
  const { execSync } = await import('node:child_process');
  const files = execSync('git ls-files', { cwd: ROOT }).toString().trim().split('\n')
    .filter(f => /\.(html|css|js|mjs|md|json)$/.test(f));
  const priv = [...new Set([...PRIVATE.home, ...PRIVATE.case])].filter(s => s !== 'Warwick');
  const hits = [];
  for (const f of files) { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); for (const s of priv) if (t.includes(s)) hits.push(`${f}: ${s}`); }
  const tests = fs.readFileSync(path.join(ROOT, 'tests/check.mjs'), 'utf8');
  if (/BANNED, '\w+'\]/.test(tests)) hits.push('tests/check.mjs: employer name in case-page ban list');
  assert(priv.length > 0, 'private list missing (tests/private-banned.json)');
  assert(!hits.length, `private strings in tracked files: ${hits.join(' | ')}`);
});
check('case: screenshots show without JS once files exist', async () => {
  const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const d of ['index.html', 'assets', 'projects']) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  for (const n of ['page-1-overview.png', 'page-2-lifecycle.png']) fs.writeFileSync(path.join(tmp, 'assets/img/contracts', n), png);
  const p = await page(CASE, { root: tmp, js: false });
  const r = await p.evaluate(() => [...document.querySelectorAll('.shot')].map(f => ({
    img: !!f.querySelector('img') && f.querySelector('img').naturalWidth > 0,
    ph: [...f.querySelectorAll('.ph')].some(e => getComputedStyle(e).display !== 'none') })));
  fs.rmSync(tmp, { recursive: true, force: true });
  assert(r.length === 2 && r.every(x => x.img && !x.ph), `no-JS screenshots: ${JSON.stringify(r)}`);
});
check('home: Nottingham card sticks to the CV', async () => {
  const p = await page(HOME);
  const t = await p.evaluate(() => [...document.querySelectorAll('#work .card')].find(c => c.textContent.includes('Nottingham'))?.textContent || '');
  assert(/ethnicity/i.test(t), 'Nottingham card should say ethnicity-based gaps');
  assert(!/20 Russell Group|sector averages/.test(t), 'Nottingham card claims unsourced benchmarking');
});
check('pages: bottleneck wording is not causal', async () => {
  for (const f of [HOME, CASE]) {
    const t = await (await page(f)).evaluate(() => document.body.innerText);
    assert(!/causes the delays|finds the stage/i.test(t), `${f}: causal bottleneck wording`);
  }
});
check('case: TREATAS uses the brief wording', async () => {
  const t = await (await page(CASE)).evaluate(() => document.querySelector('#dax').textContent);
  assert(!/apply filters across/.test(t), 'invented TREATAS purpose');
  assert(/TREATAS[^.]*stage-level analysis/.test(t), 'TREATAS sentence missing brief wording');
});

// ---------------- Owner updates ----------------
check('home: SITS expanded as the owner specified', async () => {
  const titles = await (await page(HOME)).evaluate(() => [...document.querySelectorAll('abbr')].filter(a => a.textContent === 'SITS').map(a => a.title));
  assert(titles.length > 0 && titles.every(t => t.startsWith('Student Information & Tracking System')), `SITS titles: ${titles}`);
});
check('home: Kimball card shows the real model', async () => {
  const p = await page(HOME);
  const r = await p.evaluate(() => { const c = document.querySelector('[data-card="kimball"]'); const i = c.querySelector('img');
    return { src: i?.getAttribute('src'), w: i?.naturalWidth || 0, alt: i?.alt || '', todo: !!c.querySelector('[data-todo]'), sketch: /sketch/i.test(c.textContent) }; });
  assert(r.src === 'assets/img/kimball/model.png' && r.w > 0, `model image: ${r.src} (${r.w}px)`);
  assert(/model/i.test(r.alt), 'model image needs descriptive alt');
  assert(!r.todo && !r.sketch, 'placeholder sketch still present');
});

check('cv: PDF is current and clean', async () => {
  const { execSync } = await import('node:child_process');
  const t = execSync('pdftotext -layout Harisankar_Sreekumar_Resume.pdf -', { cwd: ROOT }).toString();
  const hits = [...BANNED, ...PRIVATE.home, 'R2 ', 'Present\nCoventry'].filter(x => t.includes(x));
  assert(!hits.length, `CV contains: ${hits.join(' | ')}`);
  assert(!/0\d{4}\s?\d{6}|\+44/.test(t), 'CV contains a phone number');
  for (const need of ['Data / BI Analyst', 'Mercor', 'Jun 2026', 'harisankarsreekumar.github.io', 'contract lifecycle', '40-working-day', 'Data With Baraa'])
    assert(t.includes(need), `CV missing "${need}"`);
  const pages = execSync('pdfinfo Harisankar_Sreekumar_Resume.pdf', { cwd: ROOT }).toString().match(/Pages:\s+(\d+)/)[1];
  assert(+pages <= 2, `CV is ${pages} pages`);
});

// ---------------- runner ----------------
const filter = process.argv[2] || '';
browser = await chromium.launch();
let fail = 0, pass = 0;
for (const c of checks.filter(c => c.name.includes(filter))) {
  try { await c.fn(); pass++; console.log(`PASS  ${c.name}`); }
  catch (e) { fail++; console.log(`FAIL  ${c.name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
