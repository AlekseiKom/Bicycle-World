"use strict";
        /* Bicycle World — приложение (нативный ES6, без фреймворков). Модули: Burger, SizingCalc, GearCalculator, CompatBuilder, Accordion, TierGuide, ScrollSpy. */

        const $ = (sel, root = document) => root.querySelector(sel);
        const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
        const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

        /* ============================ Мобильное меню (бургер) ============================ */
        (() => {
            const btn = $('#burgerBtn'), nav = $('#siteNav');
            if (!btn || !nav) return;
            const close = () => {
                btn.classList.remove('is-active');
                nav.classList.remove('is-active');
                btn.setAttribute('aria-expanded', 'false');
                btn.setAttribute('aria-label', 'Открыть меню');
            };
            btn.addEventListener('click', () => {
                const open = !nav.classList.contains('is-active');
                btn.classList.toggle('is-active', open);
                nav.classList.toggle('is-active', open);
                btn.setAttribute('aria-expanded', String(open));
                btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
            });
            btn.addEventListener('keydown', event => {
                if (event.key === 'Escape') close();
            });
            $$('.site-nav .nav-link, .footer-nav a').forEach(a => a.addEventListener('click', close));
        })();

        /* ============================ SizingCalc — калькулятор ростовки ============================ */
        (() => {
            const form = $('#sizingForm');
            if (!form) return;
            const typeSel = $('#bikeType'), heightIn = $('#height'), inseamIn = $('#inseam');
            const heightOut = $('#heightOut'), inseamOut = $('#inseamOut'), resultBox = $('#sizingResult');

            const setFill = el => {
                const min = +el.min, max = +el.max;
                el.style.setProperty('--fill', (((+el.value - min) / (max - min)) * 100).toFixed(1) + '%');
            };

            function render() {
                const type = typeSel.value;
                const height = +heightIn.value, inseam = +inseamIn.value;
                heightOut.textContent = height + ' см';
                inseamOut.textContent = inseam + ' см';
                setFill(heightIn); setFill(inseamIn);

                let html = '';
                if (type === 'mtb') {
                    const estimateIn = (inseam * 0.57) / 2.54;
                    html += '<h3>Результат: горный MTB</h3>';
                    html += `<p class="size-big">≈ ${estimateIn.toFixed(1)}<small>" — грубый традиционный ориентир длины рамы</small></p>`;
                    html += '<div class="formula-box"><h4>Как читать результат</h4>' +
                        `<p>Inseam ${inseam} см × 0,57 ÷ 2,54 ≈ ${estimateIn.toFixed(1)}″. Это не размерная рекомендация производителя: современные MTB подбирают по таблице конкретной модели и геометрии, а не только по дюймам.</p>` +
                        `<p class="f-note">Рост ${height} см вместе с inseam задаёт только отправную точку. Standover, Reach и Stack нужно брать из геометрии выбранной рамы. Проверьте зазор над верхней трубой, длину посадки и высоту руля; буквенные размеры S/M/L между брендами не стандартизованы.</p></div>`;
                } else {
                    const estimateCm = inseam * 0.67;
                    html += '<h3>Результат: шоссе / грэвел</h3>';
                    html += `<p class="size-big">≈ ${estimateCm.toFixed(1)}<small> см — грубый традиционный ориентир длины подседельной трубы</small></p>`;
                    html += '<div class="formula-box"><h4>Как читать результат</h4>' +
                        `<p>Inseam ${inseam} см × 0,67 ≈ ${estimateCm.toFixed(1)} см. Современные производители по-разному измеряют и маркируют рамы, поэтому это не точный размер велосипеда.</p>` +
                        `<p class="f-note">Рост ${height} см вместе с inseam задаёт только отправную точку. Сверьте размерную таблицу модели, затем сравните Reach, Stack и Standover. На посадку также влияют длина торса и рук, вынос, руль, седло и его положение.</p></div>`;
                }

                resultBox.innerHTML = html;
            }

            typeSel.addEventListener('change', render);
            heightIn.addEventListener('input', render);
            inseamIn.addEventListener('input', render);
            render();
        })();

        /* ============================ GearCalculator — сравнение всех звёзд кассеты ============================ */
        (() => {
            const form = $('#gearCalculatorForm');
            if (!form) return;
            const chainringIn = $('#gearChainring');
            const circumferenceIn = $('#gearCircumference');
            const cassetteIn = $('#gearCassetteTeeth');
            const lowRatioOut = $('#gearLowRatio');
            const highRatioOut = $('#gearHighRatio');
            const rangeOut = $('#gearCassetteRange');
            const rowsOut = $('#gearCassetteRows');
            const errorOut = $('#gearCassetteError');
            const numberFormat = (value, digits) => value.toFixed(digits).replace('.', ',');

            function render() {
                const validChainring = Boolean(chainringIn.value && chainringIn.validity.valid && chainringIn.valueAsNumber > 0);
                const validCircumference = Boolean(circumferenceIn.value && circumferenceIn.validity.valid && circumferenceIn.valueAsNumber > 0);
                chainringIn.setAttribute('aria-invalid', String(!validChainring));
                circumferenceIn.setAttribute('aria-invalid', String(!validCircumference));

                const rawTeeth = cassetteIn.value.trim();
                const tokens = rawTeeth ? rawTeeth.split(/[\s,;]+/) : [];
                const cogs = tokens.map(token => /^\d+$/.test(token) ? Number(token) : NaN);
                const validCassette = cogs.length >= 2 && cogs.length <= 16 &&
                    cogs.every(teeth => Number.isInteger(teeth) && teeth >= 1 && teeth <= 60) &&
                    new Set(cogs).size === cogs.length;
                cassetteIn.setAttribute('aria-invalid', String(!validCassette));

                if (!validChainring || !validCircumference) {
                    lowRatioOut.textContent = '—';
                    highRatioOut.textContent = '—';
                    rangeOut.textContent = '—';
                    rowsOut.replaceChildren();
                    errorOut.textContent = 'Проверьте переднюю звезду и окружность колеса.';
                    return;
                }

                if (!validCassette) {
                    lowRatioOut.textContent = '—';
                    highRatioOut.textContent = '—';
                    rangeOut.textContent = '—';
                    rowsOut.replaceChildren();
                    errorOut.textContent = 'Введите от 2 до 16 разных целых значений от 1 до 60, разделённых запятыми.';
                    return;
                }

                errorOut.textContent = '';
                const circumference = circumferenceIn.valueAsNumber;
                const wheelDiameterInches = circumference / (Math.PI * 25.4);
                const teethAscending = [...cogs].sort((a, b) => a - b);
                const easiestCog = teethAscending[teethAscending.length - 1];
                const hardestCog = teethAscending[0];
                const formatRatio = cog => `${numberFormat(chainringIn.valueAsNumber / cog, 2)} : 1`;

                lowRatioOut.textContent = formatRatio(easiestCog);
                highRatioOut.textContent = formatRatio(hardestCog);
                rangeOut.textContent = `${Math.round((easiestCog / hardestCog) * 100)}%`;
                rowsOut.innerHTML = cogs.map(cog => {
                    const ratio = chainringIn.valueAsNumber / cog;
                    const gearInches = wheelDiameterInches * ratio;
                    const rollout = circumference * ratio / 1000;
                    return `<tr><th scope="row">${cog}T</th><td>${formatRatio(cog)}</td>` +
                        `<td>${numberFormat(gearInches, 1)}″</td><td>${numberFormat(rollout, 2)} м</td></tr>`;
                }).join('');
            }

            form.addEventListener('submit', event => event.preventDefault());
            [chainringIn, circumferenceIn, cassetteIn].forEach(input => input.addEventListener('input', render));
            render();
        })();

        /* ============================ CompatBuilder — совместимость трансмиссий ============================ */
        (() => {
            const form = $('#compatForm');
            if (!form) return;
            const shifterSel = $('#shifterOpt'), derailleurSel = $('#derailleurOpt'), freehubSel = $('#freehubOpt');
            const callout = $('#compatCallout');

            /* Cable Pull проверяется по семейству: численные значения зависят от поколения и модели. */
            const ACT = {
                'shi-mtb': { label: 'Shimano MTB (Dyna-Sys)' },
                'sram-mtb': { label: 'SRAM X-Actuation / Eagle' },
                'shi-road': { label: 'Shimano Road (SLR-EV)' },
                'sram-road': { label: 'SRAM Road' },
                'campy-road': { label: 'Campagnolo Road 12s' },
                'campy-ekar': { label: 'Campagnolo Ekar 13s' },
                'microshift-adventx': { label: 'MicroSHIFT Advent X' }
            };

            const famOf = d => d.family;
            const mk = (id, brand, disc, spd, family, series) => ({
                id,
                label: `${brand} · ${series} · ${spd} spd`,
                brand,
                disc,
                spd,
                family
            });

            /* База приводов: манетки/переключатели */
            const DRIVES = [
                mk('shi-mtb-9', 'Shimano', 'mtb', 9, 'shi-mtb', 'MTB'),
                mk('shi-mtb-10', 'Shimano', 'mtb', 10, 'shi-mtb', 'MTB'),
                mk('shi-mtb-11', 'Shimano', 'mtb', 11, 'shi-mtb', 'MTB'),
                mk('shi-mtb-12', 'Shimano', 'mtb', 12, 'shi-mtb', 'MTB'),
                mk('sram-mtb-10', 'SRAM', 'mtb', 10, 'sram-mtb', 'MTB'),
                mk('sram-mtb-11', 'SRAM', 'mtb', 11, 'sram-mtb', 'MTB'),
                mk('sram-mtb-12', 'SRAM', 'mtb', 12, 'sram-mtb', 'Eagle'),
                mk('shi-road-10', 'Shimano', 'road', 10, 'shi-road', 'Road'),
                mk('shi-road-11', 'Shimano', 'road', 11, 'shi-road', 'Road'),
                mk('shi-road-12', 'Shimano', 'road', 12, 'shi-road', 'Road'),
                mk('sram-road-11', 'SRAM', 'road', 11, 'sram-road', 'Road'),
                mk('sram-road-12', 'SRAM', 'road', 12, 'sram-road', 'AXS Road/Gravel'),
                mk('campy-road-12', 'Campagnolo', 'road', 12, 'campy-road', 'Road'),
                mk('campy-ekar-13', 'Campagnolo', 'gravel', 13, 'campy-ekar', 'Ekar Gravel'),
                mk('microshift-adventx-10', 'MicroSHIFT', 'mtb', 10, 'microshift-adventx', 'Advent X MTB')
            ];

            const HUBS = [
                { id: 'hg', label: 'HG — распространённые кассеты Shimano/SRAM/MicroSHIFT' },
                { id: 'xd', label: 'SRAM XD — кассеты с 10T для XD' },
                { id: 'xdr', label: 'SRAM XDR — кассеты с посадкой XDR' },
                { id: 'ms', label: 'Shimano MicroSpline — MTB 12s' },
                { id: 'campy', label: 'Campagnolo — стандартные кассеты ряда поколений' },
                { id: 'n3w', label: 'Campagnolo N3W — Ekar 13s' }
            ];

            /* Предварительная проверка типичного барабана для выбранной категории; кассета не задаётся отдельно. */
            function hubCheck(sh, hubId) {
                const fam = famOf(sh);
                if (fam === 'sram-mtb' && sh.spd === 12) {
                    if (hubId === 'xd') return { s: 'warn', t: 'Распространённые кассеты Eagle с 10T используют XD; конкретные звёзды и модель кассеты необходимо сверить.' };
                    if (hubId === 'hg') return { s: 'warn', t: 'Некоторые 12s Eagle кассеты, например NX с 11T малой звездой, используют HG; проверьте точную модель.' };
                    return { s: 'bad', t: `Для типичных SRAM Eagle 12s нужен XD или HG в зависимости от кассеты; выбран ${hubId.toUpperCase()}.` };
                }
                if (fam === 'shi-mtb' && sh.spd === 12) {
                    if (hubId === 'ms') return { s: 'ok', t: 'Кассета Shimano MTB 12s устанавливается на MicroSpline.' };
                    return { s: 'bad', t: `Для Shimano MTB 12s нужен MicroSpline; выбран ${hubId.toUpperCase()}.` };
                }
                if (fam === 'shi-mtb' && sh.spd <= 11) {
                    if (hubId === 'hg') return { s: 'ok', t: `Для многих Shimano MTB ${sh.spd}s кассет подходит HG; подтвердите стандарт выбранной кассеты.` };
                    return { s: 'bad', t: `Для типичных Shimano MTB ${sh.spd}s кассет нужен HG; выбран ${hubId.toUpperCase()}. Проверьте конкретную модель.` };
                }
                if (fam === 'microshift-adventx') {
                    if (hubId === 'hg') return { s: 'ok', t: 'Кассета MicroSHIFT Advent X 10s устанавливается на HG.' };
                    return { s: 'bad', t: `Для MicroSHIFT Advent X 10s нужен HG; выбран ${hubId.toUpperCase()}.` };
                }
                if (fam === 'sram-mtb' && sh.spd < 12) {
                    if (hubId === 'hg') return { s: 'warn', t: 'Многие кассеты SRAM MTB 10/11s совместимы с HG; для некоторых моделей нужен XD — проверьте кассету.' };
                    if (hubId === 'xd') return { s: 'warn', t: 'XD применяется с совместимыми кассетами SRAM MTB; проверьте конкретную модель и число скоростей.' };
                    return { s: 'bad', t: `Для этой кассеты SRAM MTB 10/11s не подходит ${hubId.toUpperCase()}.` };
                }
                if (fam === 'sram-road' && sh.spd === 12) {
                    if (hubId === 'xdr') return { s: 'ok', t: 'Кассета SRAM AXS Road/Gravel 12s устанавливается на XDR.' };
                    return { s: 'bad', t: `Для SRAM AXS Road/Gravel 12s нужен XDR; выбран ${hubId.toUpperCase()}.` };
                }
                if (fam === 'sram-road' && sh.spd === 11) {
                    if (hubId === 'hg') return { s: 'ok', t: 'Многие SRAM Road 11s кассеты используют HG; проверьте артикул.' };
                    return { s: 'bad', t: `Для типичных SRAM Road 11s кассет нужен HG; выбран ${hubId.toUpperCase()}. Проверьте конкретную модель.` };
                }
                if (fam === 'campy-ekar') {
                    if (hubId === 'n3w') return { s: 'ok', t: 'Кассета Campagnolo Ekar 13s устанавливается на N3W.' };
                    return { s: 'bad', t: `Для Campagnolo Ekar 13s нужен N3W; выбран ${hubId.toUpperCase()}.` };
                }
                if (fam === 'campy-road') {
                    if (hubId === 'n3w') return { s: 'warn', t: 'Кассета Campagnolo Road 12s может устанавливаться на N3W с 4,4-мм адаптером; проверьте исполнение кассеты.' };
                    if (hubId === 'campy') return { s: 'warn', t: 'Ряд Campagnolo кассет подходит к стандартному Campagnolo freehub; поколение и конкретную кассету проверьте.' };
                    return { s: 'bad', t: `Для Campagnolo Road нужен совместимый Campagnolo freehub или подходящий N3W с адаптером; выбран ${hubId.toUpperCase()}.` };
                }
                if (hubId === 'hg') return { s: 'ok', t: `Многие Shimano Road ${sh.spd}s кассеты используют HG; проверьте поколение и артикул.` };
                return { s: 'bad', t: `Для типичных Shimano Road ${sh.spd}s кассет нужен HG; выбран ${hubId.toUpperCase()}. Проверьте конкретную модель.` };
            }

            /* Проверка рычажности троса манетка ↔ переключатель */
            function chainCheck(sh, d) {
                const aS = ACT[famOf(sh)], aD = ACT[famOf(d)];
                if (famOf(sh) === famOf(d)) {
                        if (sh.spd === d.spd) return { s: 'ok', t: `Общее семейство и число скоростей совпадают (${aS.label}, ${sh.spd} spd); точную совместимость моделей и поколения всё равно проверьте.` };
                        return { s: 'warn', t: `Общее семейство, но разное число скоростей (${sh.spd} vs ${d.spd}): совместимость по одной категории определить нельзя.` };
                }
                    return { s: 'bad', t: `Эта общая таблица не подтверждает сочетание семейств ${aS.label} и ${aD.label}; проверьте руководство к точным моделям. Для электронных систем отдельно проверьте протокол и поколение.` };
            }

            const fill = (sel, list) => { sel.innerHTML = list.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join(''); };
            fill(shifterSel, DRIVES);
            fill(derailleurSel, DRIVES);
            fill(freehubSel, HUBS);

            /* Кросс-брендовые пресеты (манетка → переключатель) */
            const CROSSES = [
                { id: 'x-shi12-sram12-mtb',   sh: 'shi-mtb-12', d: 'sram-mtb-12' },
                { id: 'x-sram12-shi12-mtb',   sh: 'sram-mtb-12', d: 'shi-mtb-12' },
                { id: 'x-shi-road-sram-road', sh: 'shi-road-11', d: 'sram-road-11' }
            ];
            const crossSel = $('#crossBrandOpt');
            if (crossSel) {
                const lbl = id => DRIVES.find(x => x.id === id).label;
                crossSel.innerHTML = '<option value="">— без кросс-брендовой пары —</option>' +
                    CROSSES.map(o => `<option value="${o.id}">${esc(lbl(o.sh))} → ${esc(lbl(o.d))}</option>`).join('');
            }

            function syncCross() {
                if (!crossSel) return;
                const hit = CROSSES.find(o => o.sh === shifterSel.value && o.d === derailleurSel.value);
                crossSel.value = hit ? hit.id : '';
            }

            function evaluate() {
                const sh = DRIVES.find(o => o.id === shifterSel.value) || DRIVES[0];
                const d = DRIVES.find(o => o.id === derailleurSel.value) || DRIVES[0];
                const hub = HUBS.find(o => o.id === freehubSel.value) || HUBS[0];

                const checks = [
                    { name: 'Ход троса (Cable Pull Ratio)', ...chainCheck(sh, d) },
                    { name: 'Барабан и кассета', ...hubCheck(sh, hub.id) }
                ];
                const worst = ['ok', 'warn', 'bad'].reduce((w, c) => checks.some(x => x.s === c) && ['ok', 'warn', 'bad'].indexOf(c) > ['ok', 'warn', 'bad'].indexOf(w) ? c : w, 'ok');
                const title = { ok: 'Базовые признаки совпадают', warn: 'Нужна проверка моделей', bad: 'Не подтверждено' }[worst];

                callout.className = `callout glass is-${worst}`;
                callout.innerHTML =
                    `<h3><span class="status-dot"></span>${title}</h3>` +
                    `<p>Пара: ${esc(sh.label)} → ${esc(d.label)} · барабан: ${esc(hub.label)}</p>` +
                    `<ul class="check-grid">${checks.map(c => `<li class="check-item"><b>${c.name}:</b> ${esc(c.t)}</li>`).join('')}</ul>` +
                    (crossSel && crossSel.value ? '<p style="margin-top:.6rem; font-size:.82rem; color:var(--text-dim)">Выбрана известная кросс-брендовая комбинация для дальнейшей проверки; это не подтверждение совместимости конкретных деталей.</p>' : '');
            }

            [shifterSel, derailleurSel, freehubSel].forEach(sel => sel.addEventListener('change', () => { syncCross(); evaluate(); }));
            if (crossSel) crossSel.addEventListener('change', () => {
                const p = CROSSES.find(o => o.id === crossSel.value);
                if (p) { shifterSel.value = p.sh; derailleurSel.value = p.d; }
                syncCross(); evaluate();
            });
            shifterSel.value = 'shi-mtb-12';
            derailleurSel.value = 'shi-mtb-12';
            freehubSel.value = 'ms';
            evaluate();
        })();

        /* ============================ Accordion — аккордеон в энциклопедии ============================ */
        (() => {
            const heads = $$('.acc .acc-head');
            if (!heads.length) return;
            heads.forEach(head => head.addEventListener('click', () => {
                const item = head.closest('.acc-item');
                if (!item) return;
                const open = !item.classList.contains('open');
                item.classList.toggle('open', open);
                head.setAttribute('aria-expanded', String(open));
                const panel = document.getElementById(head.getAttribute('aria-controls'));
                if (panel) panel.setAttribute('aria-hidden', String(!open));
            }));
        })();

        /* ============================ TierGuide — гид по уровням ============================ */
        (() => {
            const btns = $$('#hierarchy .guide-btn[data-cat]');
            if (!btns.length) return;
            const rows = $$('#hierarchy .tbl tbody tr[data-cat]');
            const hint = $('#tierHint');

            const HINTS = {
                all: 'Выберите задачу, чтобы подсветить примеры. Уровни условны, а поколения групп различаются; перед подбором проверяйте артикулы и официальную таблицу совместимости.',
                casual: 'Для повседневной езды важны подходящий диапазон, доступность расходников и удобство обслуживания. Дорогая группа не обязательна, а низкий ценовой сегмент сам по себе не означает непригодность.',
                touring: 'Для туризма проверьте широкий диапазон передач, наличие запасных частей, устойчивость колёс к нагрузке и возможность установить багаж и защиту. Учитывайте массу райдера и багажа.',
                intense: 'Для интенсивной езды подбирайте компоненты по дисциплине, совместимости и условиям обслуживания; уровень в таблице не заменяет оценку тормозов, колёс, подвески и состояния деталей.',
                racing: 'Для соревнований учитывайте регламент, посадку, массу и надёжность всей сборки. Флагманские группы не являются обязательным условием для гонок.'
            };

            function apply(cat) {
                btns.forEach(b => {
                    const on = b.dataset.cat === cat;
                    b.classList.toggle('is-on', on);
                    b.setAttribute('aria-pressed', String(on));
                });
                rows.forEach(r => r.classList.toggle('hl-row', cat !== 'all' && (r.dataset.cat || '').split(' ').includes(cat)));
                if (hint) hint.textContent = HINTS[cat] || HINTS.all;
            }

            btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.cat)));
        })();

        /* ============================ ScrollSpy / Smooth Scroll ============================ */
        (() => {
            const links = $$('.site-nav .nav-link');
            const topBtn = $('#scrollTop');
            const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
            const sections = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);

            let ticking = false;
            const update = () => {
                ticking = false;
                const scrollY = window.scrollY;
                if (topBtn) topBtn.classList.toggle('is-visible', scrollY > 500);
                if (!links.length) return;
                const y = scrollY + 140; /* зона срабатывания под липкой шапкой */
                let current = null;
                for (const s of sections) if (s.offsetTop <= y) current = s.id;
                links.forEach(a => a.classList.toggle('is-active', a === byId.get(current)));
            };
            addEventListener('scroll', () => {
                if (!ticking) { ticking = true; requestAnimationFrame(update); }
            }, { passive: true });
            if (topBtn) topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            update();
        })();
