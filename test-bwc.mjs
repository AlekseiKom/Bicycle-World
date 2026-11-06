// Headless Chrome CDP-тесты для Bicycle-World/index.html
// Запуск: node --experimental-websocket test-bwc.mjs
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'file:///C:/Users/Lep4i/Desktop/My%20GitHub/Bicycle-World/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws; const pending = new Map(); let idc = 1;
function send(method, params = {}) { return new Promise((res, rej) => { const id = idc++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }); }

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=9241`, 'about:blank'], { stdio: 'ignore' });
let pageWsUrl;
for (let i = 0; i < 50 && !pageWsUrl; i++) {
  try {
    const r = await fetch('http://127.0.0.1:9241/json/new?' + encodeURIComponent(URL), { method: 'PUT' });
    if (r.ok) pageWsUrl = (await r.json()).webSocketDebuggerUrl;
    else { const g = await fetch('http://127.0.0.1:9241/json/new?' + encodeURIComponent(URL)); if (g.ok) pageWsUrl = (await g.json()).webSocketDebuggerUrl; }
  } catch (e) { await sleep(400); }
}
if (!pageWsUrl) { console.error('Chrome CDP not available'); process.exit(1); }

ws = new WebSocket(pageWsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let jsErrors = 0, pageLoaded = false;
const consoleErrs = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
  else if (d.method === 'Runtime.exceptionThrown') jsErrors++;
  else if (d.method === 'Console.messageAdded' && d.params.type === 'error') consoleErrs.push(d.params.message?.text || '');
  else if (d.method === 'Page.loadEventFired') pageLoaded = true;
};

const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
let passed = 0, failed = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name); cond ? passed++ : failed++; };

await send('Runtime.enable');
await send('Page.enable');
for (let i = 0; i < 50 && !pageLoaded; i++) await sleep(200);

// S1 — каркас: hero, 4 секции, футер
ok('hero + h1.grad', await ev(`!!document.querySelector('.hero h1 .grad')`));
ok('4 sections present', await ev(`['encyclopedia','sizing','compat','standards'].every(id => !!document.getElementById(id))`));
ok('footer fineprint', await ev(`/торгов.*марк/i.test(document.querySelector('.site-footer .fineprint').textContent)`));
ok('encyclopedia 5 cards (4 types + timeline)', await ev(`document.querySelectorAll('#encyclopedia .card').length === 5`));
ok('standards 3 tables', await ev(`document.querySelectorAll('#standards table.tbl').length === 3`));
ok('standards: six cards include ETRTO, brakes, and derailleur hangers', await ev(`(() => {
  const cards = Array.from(document.querySelectorAll('#standards .card'));
  return cards.length === 6 && ['ETRTO', 'Post Mount', 'SRAM UDH', 'T-Type'].every(term =>
    cards.some(card => card.textContent.includes(term)));
})()`));
ok('standards: T47 and cartridge-splined legacy bottom brackets documented', await ev(`(() => {
  const text = document.querySelector('#standards').textContent;
  return text.includes('T47') && text.includes('Octalink') && text.includes('ISIS') &&
    text.includes('73×118 мм') && text.includes('сверхнадёжное легаси');
})()`));
ok('gear range default is 520%', await ev(`document.querySelector('#gearRange').textContent === '520%'`));
await ev(`(() => { const i = document.querySelector('#gearLarge'); i.value = 50; i.dispatchEvent(new Event('input')); return 1; })()`);
ok('gear range recalculates on input', await ev(`document.querySelector('#gearRange').textContent === '500%'`));
await ev(`(() => { const i = document.querySelector('#gearLarge'); i.value = 52; i.dispatchEvent(new Event('input')); return 1; })()`);
ok('scroll-to-top button starts hidden and has accessible label', await ev(`(() => {
  const b = document.querySelector('#scrollTop');
  return !!b && b.getAttribute('aria-label') === 'Вернуться наверх' &&
    getComputedStyle(b).visibility === 'hidden' && getComputedStyle(b).position === 'fixed';
})()`));

// S2 — SizingCalc: MTB по умолчанию (inseam 80 → 17.95" ≈ 18", M)
const mtbText = await ev(`document.querySelector('#sizingResult').textContent`);
ok('MTB default shows inches + letter', /18\.0"/.test(mtbText) && /\(M\)/.test(mtbText));
await ev(`(() => { const i = document.querySelector('#inseam'); i.value = 85; i.dispatchEvent(new Event('input')); return 1; })()`);
const mtb85 = await ev(`document.querySelector('#sizingResult').textContent`);
ok('MTB inseam 85 → 19.1" L', /19\.1"/.test(mtb85) && /\(L\)/.test(mtb85));

// S3 — SizingCalc: шоссе (inseam возвращаем в 80 → 53.6 см ≈ 54, Reach/Stack)
await ev(`(() => { const i = document.querySelector('#inseam'); i.value = 80; i.dispatchEvent(new Event('input')); return 1; })()`);
await ev(`(() => { const s = document.querySelector('#bikeType'); s.value = 'road'; s.dispatchEvent(new Event('change')); return 1; })()`);
const roadText = await ev(`document.querySelector('#sizingResult').textContent`);
ok('Road shows cm size + Reach/Stack', /≈ 54 см/.test(roadText) && /Reach ≈ \d+ мм · Stack ≈ \d+ мм/.test(roadText));
await ev(`(() => { const i = document.querySelector('#inseam'); i.value = 70; i.dispatchEvent(new Event('input')); return 1; })()`);
ok('Road small inseam → compact geometry tip', /компактн/.test(await ev(`document.querySelector('.fit-list').textContent`)));

// S4 — CompatBuilder: по умолчанию Shimano 12 MTB + MicroSpline = Совместимо (is-ok)
ok('compat default is-ok «Совместимо»', await ev(`document.querySelector('#compatCallout').classList.contains('is-ok') && /Совместимо/.test(document.querySelector('#compatCallout h3').textContent)`));

// S5 — SRAM Eagle 12 + HG = Несовместимо (барабан)
await ev(`(() => { const s = document.querySelector('#shifterOpt'), d = document.querySelector('#derailleurOpt'), f = document.querySelector('#freehubOpt');
  s.value = 'sram-mtb-12'; d.value = 'sram-mtb-12'; f.value = 'hg';
  [s,d,f].forEach(x => x.dispatchEvent(new Event('change'))); return 1; })()`);
ok('SRAM Eagle 12 + HG → is-bad «Несовместимо»', await ev(`document.querySelector('#compatCallout').classList.contains('is-bad') && /Несовместимо/.test(document.querySelector('#compatCallout h3').textContent)`));

// S6 — кросс-бренд: Shimano 12 MTB + SRAM 12 MTB = Несовместимо (рычажность)
await ev(`(() => { const s = document.querySelector('#shifterOpt'), d = document.querySelector('#derailleurOpt');
  s.value = 'shi-mtb-12'; d.value = 'sram-mtb-12';
  [s,d].forEach(x => x.dispatchEvent(new Event('change'))); return 1; })()`);
ok('cross-brand → is-bad Cable Pull Ratio', await ev(`document.querySelector('#compatCallout').classList.contains('is-bad') && /Cable Pull/i.test(document.querySelector('#compatCallout').textContent)`));

// S7 — Shimano MicroSpline + HG = Несовместимо
await ev(`(() => { const f = document.querySelector('#freehubOpt'); f.value = 'hg'; f.dispatchEvent(new Event('change')); return 1; })()`);
ok('Shimano MSPL + HG → is-bad', await ev(`document.querySelector('#compatCallout').classList.contains('is-bad')`));

// S8 — бургер: open/close в мобильном viewport (эмуляция 420px, брейкпоинт CSS ≤680px)
await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 1, mobile: true });
await sleep(300);
ok('burger visible at narrow width', await ev(`getComputedStyle(document.querySelector('#burgerBtn')).display !== 'none'`));
ok('nav hidden on mobile initially', await ev(`getComputedStyle(document.querySelector('#siteNav')).display === 'none'`));
await ev(`document.querySelector('#burgerBtn').click(); 1`);
ok('nav opens + burger is-active', await ev(`document.querySelector('#siteNav').classList.contains('is-active') && document.querySelector('#burgerBtn').classList.contains('is-active') && getComputedStyle(document.querySelector('#siteNav')).display !== 'none'`));
await ev(`document.querySelector('#burgerBtn').click(); 1`);
ok('nav closes', await ev(`!document.querySelector('#siteNav').classList.contains('is-active')`));
await send('Emulation.clearDeviceMetricsOverride');

// S9 — ScrollSpy: мгновенный скролл к #standards → активная ссылка «Стандарты»
const target = await ev(`(() => { const t = document.getElementById('standards').offsetTop - 120; window.scrollTo({ top: t, behavior: 'instant' }); return t; })()`);
for (let i = 0; i < 20 && Math.abs((await ev(`window.scrollY`)) - target) > 4; i++) await sleep(100);
await sleep(300);
ok('scrollspy highlights standards link', await ev(`document.querySelector('.site-nav a[href="#standards"]').classList.contains('is-active')`));
ok('scroll-to-top appears after 500px', await ev(`window.scrollY > 500 && document.querySelector('#scrollTop').classList.contains('is-visible')`));
await ev(`document.querySelector('#scrollTop').click(); 1`);
for (let i = 0; i < 50 && (await ev(`window.scrollY`)) > 2; i++) await sleep(100);
ok('scroll-to-top button returns to page start', await ev(`window.scrollY <= 2`));

// S10 — smooth scroll включён в CSS (html { scroll-behavior: smooth })
ok('css scroll-behavior: smooth', await ev(`getComputedStyle(document.documentElement).scrollBehavior === 'smooth'`));

// S11 — Accordion: open/close + ARIA sync (encyclopedia section)
{
  const headSel = '#encyclopedia .acc-head';
  ok('accordion: four heads present', (await ev(`document.querySelectorAll('${headSel}').length`)) === 4);
  await ev(`document.querySelector('${headSel}').click(); 1`);
  ok('accordion: first item opens on click', await ev(`document.querySelector('#acc-mtb').classList.contains('open')`));
  ok('accordion: aria-expanded=true after open', await ev(`document.querySelector('${headSel}').getAttribute('aria-expanded') === 'true'`));
  await ev(`document.querySelector('${headSel}').click(); 1`);
  ok('accordion: item closes on second click', !(await ev(`document.querySelector('#acc-mtb').classList.contains('open')`)));
  ok('accordion: aria-expanded=false after close', await ev(`document.querySelector('${headSel}').getAttribute('aria-expanded') === 'false'`));
  ok('accordion: panel ids match aria-controls', await ev(`Array.from(document.querySelectorAll('${headSel}')).every(h => { const t = document.getElementById(h.getAttribute('aria-controls')); return !!t && t.classList.contains('acc-panel'); })`));
}

// S12 — TierGuide: task buttons + row highlighting (#hierarchy)
{
  const cats = await ev(`Array.from(document.querySelectorAll('#hierarchy .guide-btn[data-cat]')).map(b => b.dataset.cat)`);
  ok('tier: five task buttons (all/casual/touring/intense/racing)', JSON.stringify(cats) === '["all","casual","touring","intense","racing"]');

  const totalRows = await ev(`document.querySelectorAll('#hierarchy .tbl tbody tr[data-cat]').length`);
  ok('tier: tier tables contain data rows', totalRows >= 12);

  for (const cat of ['racing', 'touring', 'intense']) {
    await ev(`document.querySelector('#hierarchy .guide-btn[data-cat="${cat}"]').click(); 1`);
    const hl = await ev(`document.querySelectorAll('#hierarchy .tbl tbody tr.hl-row').length`);
    const expected = await ev(`Array.from(document.querySelectorAll('#hierarchy .tbl tbody tr[data-cat]')).filter(r => r.dataset.cat.includes(${JSON.stringify(cat)})).length`);
    ok(`tier: "${cat}" highlights exactly matching rows (${expected})`, hl === expected && hl > 0);
    const btnOn = await ev(`(() => { const b = document.querySelector('#hierarchy .guide-btn[data-cat=${JSON.stringify(cat)}]'); return b.classList.contains('is-on') && b.getAttribute('aria-pressed') === 'true'; })()`);
    ok(`tier: "${cat}" button becomes active (is-on + aria-pressed)`, btnOn);
  }

  ok('tier: previous button deactivated on new selection', await ev(`!document.querySelector('#hierarchy .guide-btn[data-cat="racing"]').classList.contains('is-on') && document.querySelector('#hierarchy .guide-btn[data-cat="intense"]').classList.contains('is-on')`));

  await ev(`document.querySelector('#hierarchy .guide-btn[data-cat="all"]').click(); 1`);
  ok('tier: "all" resets highlights and active state', !(await ev(`document.querySelectorAll('#hierarchy .tbl tbody tr.hl-row').length`)) && (await ev(`(() => { const b = document.querySelector('#hierarchy .guide-btn[data-cat="all"]'); return b.classList.contains('is-on') && !document.querySelector('#hierarchy .guide-btn[data-cat="intense"]').classList.contains('is-on'); })()`)));
  ok('tier: hint returns to default text', await ev(`document.querySelector('#tierHint').textContent.includes('Выберите задачу')`));

  await ev(`document.querySelector('#hierarchy .guide-btn[data-cat="touring"]').click(); 1`);
  ok('tier: hint changes per task (touring)', await ev(`document.querySelector('#tierHint').textContent.includes('Оптимум для туризма')`));
}

// S13 — CompatBuilder: кросс-брендовые пресеты (#crossBrandOpt)
{
  const opts = await ev(`Array.from(document.querySelectorAll('#crossBrandOpt option')).map(o => o.value)`);
  ok('compat: cross-brand select has default + 3 presets', JSON.stringify(opts) === '["","x-shi12-sram12-mtb","x-sram12-shi12-mtb","x-shi-road-sram-road"]');

  await ev(`(() => { const s = document.querySelector('#shifterOpt'), d = document.querySelector('#derailleurOpt'); s.value = 'sram-mtb-12'; s.dispatchEvent(new Event('change')); d.value = 'shi-mtb-12'; d.dispatchEvent(new Event('change')); return 1; })()`);
  ok('compat: matching manual pair fills cross-brand select', await ev(`document.querySelector('#crossBrandOpt').value === 'x-sram12-shi12-mtb'`));

  await ev(`(() => { const c = document.querySelector('#crossBrandOpt'); c.value = 'x-shi12-sram12-mtb'; c.dispatchEvent(new Event('change')); return 1; })()`);
  ok('compat: preset sets Shimano 1×12 shifter + SRAM 12T derailleur', await ev(`document.querySelector('#shifterOpt').value === 'shi-mtb-12' && document.querySelector('#derailleurOpt').value === 'sram-mtb-12'`));
  ok('compat: verdict is-bad (cross-brand pull) + preset note shown', await ev(`(() => { const c = document.querySelector('#compatCallout'); return c.classList.contains('is-bad') && c.textContent.includes('Кросс-брендовая пара применена из пресетов'); })()`));

  await ev(`(() => { const s = document.querySelector('#shifterOpt'); s.value = 'shi-road-11'; s.dispatchEvent(new Event('change')); return 1; })()`);
  ok('compat: non-preset pair resets cross-brand select + note hidden', await ev(`(() => { const c = document.querySelector('#compatCallout'); return document.querySelector('#crossBrandOpt').value === '' && !c.textContent.includes('Кросс-брендовая пара применена'); })()`));
}

// S14 — прозрачные формулы ростовки (#sizing .formula-box)
{
  await ev(`(() => { const i = document.querySelector('#inseam'); i.value = 80; i.dispatchEvent(new Event('input')); return 1; })()`);
  await ev(`(() => { const t = document.querySelector('#bikeType'); t.value = 'mtb'; t.dispatchEvent(new Event('change')); return 1; })()`);

  ok('sizing: MTB formula box appears with step list', (await ev(`document.querySelectorAll('#sizingResult .formula-box').length`)) === 1);
  const mtbLis = await ev(`Array.from(document.querySelectorAll('#sizingResult .formula-box ol li')).map(li => li.textContent)`);
  ok('sizing: MTB formula box has five steps', mtbLis.length === 5);
  const m1raw = await ev(`(() => { const t = document.querySelector('#sizingResult .size-big').textContent; const m = t.match(/→ (\\d+)" · ([A-Z0-9]+)/); return JSON.stringify({ size: m && m[1], letter: m && m[2] }); })()`);
  const m1 = m1raw ? JSON.parse(m1raw) : null;
  ok('sizing: MTB headline is 18" / M for Inseam 80 cm', m1 !== null && m1.size === '18' && m1.letter === 'M');
  const m2 = mtbLis.find(s => s.includes('round(raw)'));
  ok('sizing: MTB round(raw)=18" matches headline (letter M)', !!m2 && /round\(raw\) = 18" → буква M/.test(m2));
  const m3 = mtbLis.find(s => s.startsWith('standover'));
  ok('sizing: standover formula shown with numeric result', !!m3 && /^standover = Inseam − высота ШТ = 80 − [\d.,]+ ≈ [-\d.,]+ см \(норма 1–5 см\)$/.test(m3));

  await ev(`(() => { const t = document.querySelector('#bikeType'); t.value = 'road'; t.dispatchEvent(new Event('change')); return 1; })()`);
  ok('sizing: road formula box appears with step list', (await ev(`document.querySelectorAll('#sizingResult .formula-box').length`)) === 1);
  const roadLis = await ev(`Array.from(document.querySelectorAll('#sizingResult .formula-box ol li')).map(li => li.textContent)`);
  ok('sizing: road formula box has four steps', roadLis.length === 4);
  const r1 = roadLis.find(s => s.includes('Reach'));
  const r2 = roadLis.find(s => s.includes('Stack'));
  ok('sizing: Reach formula uses base 378 mm (+3 mm/см)', !!r1 && /Reach = 378 \+ \(54 − 50\) × 3 = \d+ мм/.test(r1));
  const rHead = await ev(`document.querySelector('#sizingResult .size-list li:nth-child(2) b').textContent`);
  ok('sizing: Reach/Stack headline matches formula result', !!rHead && rHead.includes(String(await ev(`378 + (54 - 50) * 3`))) && String(rHead).includes(String(await ev(`526 + (54 - 50) * 4`))));
}

// S15 — новые приводы, пять барабанов и доступность связей
{
  const hubIds = await ev(`Array.from(document.querySelectorAll('#freehubOpt option')).map(o => o.value)`);
  ok('compat: five distinct freehub standards', JSON.stringify(hubIds) === '["hg","xd","xdr","ms","n3w"]');

  const driveIds = await ev(`Array.from(document.querySelectorAll('#shifterOpt option')).map(o => o.value)`);
  ok('compat: Campagnolo Road/Ekar and MicroSHIFT Advent X are selectable',
    ['campy-road-12', 'campy-ekar-13', 'microshift-adventx-10'].every(id => driveIds.includes(id)));

  await ev(`(() => { const s = document.querySelector('#shifterOpt'), d = document.querySelector('#derailleurOpt'), h = document.querySelector('#freehubOpt');
    s.value = 'campy-ekar-13'; d.value = 'campy-ekar-13'; h.value = 'n3w';
    [s,d,h].forEach(x => x.dispatchEvent(new Event('change'))); return 1; })()`);
  ok('compat: Ekar 13s + N3W is compatible', await ev(`document.querySelector('#compatCallout').classList.contains('is-ok')`));

  await ev(`(() => { const s = document.querySelector('#shifterOpt'), d = document.querySelector('#derailleurOpt'), h = document.querySelector('#freehubOpt');
    s.value = 'microshift-adventx-10'; d.value = 'microshift-adventx-10'; h.value = 'hg';
    [s,d,h].forEach(x => x.dispatchEvent(new Event('change'))); return 1; })()`);
  ok('compat: Advent X 10s + HG is compatible', await ev(`document.querySelector('#compatCallout').classList.contains('is-ok')`));

  ok('tier: exactly six equipment tables are filtered',
    (await ev(`document.querySelectorAll('#hierarchy .tbl').length`)) === 6 &&
    (await ev(`document.querySelectorAll('#hierarchy .guide-btn[data-cat="racing"]').length`)) === 1);
  ok('accessibility: all aria-controls and label/for references resolve', await ev(`(() => {
    const controls = Array.from(document.querySelectorAll('[aria-controls]')).every(el =>
      el.getAttribute('aria-controls').split(/\\s+/).every(id => !!document.getElementById(id)));
    const labels = Array.from(document.querySelectorAll('label[for]')).every(el => !!document.getElementById(el.htmlFor));
    return controls && labels;
  })()`));
  ok('structure: unique ids and no sec-index numbers', await ev(`(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    return new Set(ids).size === ids.length && document.querySelectorAll('.sec-index').length === 0;
  })()`));
  ok('accordion: CSS Grid replaces fixed max-height', await ev(`(() => {
    const css = document.querySelector('style').textContent;
    return css.includes('grid-template-rows: 0fr') && css.includes('grid-template-rows: 1fr') && !css.includes('1300px');
  })()`));
  ok('accessibility: gravel accordion has inner wrapper and syncs aria-hidden', await ev(`(() => {
    const head = document.querySelector('#head-gravel'), panel = document.querySelector('#panel-gravel');
    const wrapped = !!panel.querySelector(':scope > .acc-body > .acc-inner');
    head.click();
    const opened = head.getAttribute('aria-expanded') === 'true' && panel.getAttribute('aria-hidden') === 'false';
    head.click();
    const closed = head.getAttribute('aria-expanded') === 'false' && panel.getAttribute('aria-hidden') === 'true';
    return wrapped && opened && closed;
  })()`));
}

// S10 — нет ошибок JS/консоли
ok('no page JS errors (' + jsErrors + ')', jsErrors === 0);
if (consoleErrs.length) console.log('console errors:', consoleErrs.join(' | '));

console.log(`\nRESULT: ${passed}/${passed + failed} PASS${failed ? ', ' + failed + ' FAIL' : ''}`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);