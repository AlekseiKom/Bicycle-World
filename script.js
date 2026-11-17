"use strict";
        /* Bicycle World — приложение (нативный ES6, без фреймворков). Модули: Burger, SizingCalc, GearCalculator, CompatBuilder, Accordion, TierGuide, ScrollSpy. */

        const $ = (sel, root = document) => root.querySelector(sel);
        const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
        const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

        /* ============================ Тема оформления ============================ */
        (() => {
            const toggle = $('#themeToggle');
            const root = document.documentElement;
            let savedTheme = '';
            try { savedTheme = localStorage.getItem('bicycle-world-theme') || ''; } catch (_) { /* storage может быть недоступен */ }

            const setTheme = theme => {
                const isLight = theme === 'light';
                root.dataset.theme = isLight ? 'light' : 'dark';
                if (toggle) {
                    const label = isLight ? 'Включить тёмную тему' : 'Включить светлую тему';
                    toggle.setAttribute('aria-label', label);
                    toggle.setAttribute('aria-pressed', String(isLight));
                    toggle.title = label;
                }
            };

            setTheme(savedTheme === 'light' ? 'light' : 'dark');
            toggle?.addEventListener('click', () => {
                const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
                setTheme(nextTheme);
                try { localStorage.setItem('bicycle-world-theme', nextTheme); } catch (_) { /* тема действует до закрытия вкладки */ }
            });
        })();

        /* ============================ Фоновое изображение ============================ */
        (() => {
            const image = $('#pageBackgroundImage');
            const stage = image?.closest('.page-background');
            if (!image || !stage) return;

            const sourceForViewport = () => {
                if (matchMedia('(min-width: 1280px)').matches) return 'img/Desctop.jpeg';
                if (matchMedia('(min-width: 681px) and (orientation: landscape)').matches) return 'img/Tab-horisontal.jpeg';
                if (matchMedia('(min-width: 681px) and (orientation: portrait)').matches) return 'img/Tab-vertical.jpeg';
                return 'img/Mobile.jpeg';
            };
            const expectedUrl = () => new URL(sourceForViewport(), document.baseURI).href;
            let activeSource = sourceForViewport();
            const reveal = () => {
                const source = sourceForViewport();
                if (!image.complete || !image.naturalWidth || image.currentSrc !== expectedUrl()) return;

                if (source !== activeSource) {
                    stage.classList.remove('is-loaded');
                    stage.classList.add('is-loading');
                    activeSource = source;
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (image.currentSrc === expectedUrl() && image.complete) {
                                stage.classList.remove('is-loading');
                                stage.classList.add('is-loaded');
                            }
                        });
                    });
                    return;
                }

                stage.classList.add('is-loaded');
            };
            const hideWhileSourceChanges = () => {
                if (sourceForViewport() !== activeSource) {
                    stage.classList.remove('is-loaded');
                    stage.classList.add('is-loading');
                }
            };

            image.addEventListener('load', reveal);
            image.addEventListener('error', () => {
                console.error(`Не удалось загрузить фоновое изображение: ${image.currentSrc}`);
            });
            window.addEventListener('resize', hideWhileSourceChanges, { passive: true });
            window.addEventListener('orientationchange', hideWhileSourceChanges, { passive: true });
            if (image.complete && image.naturalWidth) reveal();
        })();

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
                    const centerSize = Math.round(estimateIn);
                    const rangeStart = Math.max(1, centerSize - 1);
                    const rangeEnd = centerSize + 1;
                    html += '<h3>Результат: горный MTB</h3>';
                    html += `<p class="size-big">≈ ${estimateIn.toFixed(1)}<small>" — грубый традиционный ориентир длины рамы</small></p>`;
                    html += `<p class="size-range"><b>Диапазон для сверки: ${rangeStart}–${rangeEnd}"</b><span>Соседние размерные метки вокруг результата формулы.</span></p>`;
                    html += '<div class="formula-box"><h4>Как читать результат</h4>' +
                        `<p>Inseam ${inseam} см × 0,57 ÷ 2,54 ≈ ${estimateIn.toFixed(1)}″. Это не размерная рекомендация производителя: современные MTB подбирают по таблице конкретной модели и геометрии, а не только по дюймам.</p>` +
                        `<p class="f-note">Рост ${height} см вместе с inseam задаёт только отправную точку. Standover, Reach и Stack нужно брать из геометрии выбранной рамы. Проверьте зазор над верхней трубой, длину посадки и высоту руля; буквенные размеры S/M/L между брендами не стандартизованы.</p></div>`;
                } else {
                    const estimateCm = inseam * 0.67;
                    const centerSize = Math.round(estimateCm);
                    const rangeStart = Math.max(1, centerSize - 2);
                    const rangeEnd = centerSize + 2;
                    html += '<h3>Результат: шоссе / грэвел</h3>';
                    html += `<p class="size-big">≈ ${estimateCm.toFixed(1)}<small> см — грубый традиционный ориентир длины подседельной трубы</small></p>`;
                    html += `<p class="size-range"><b>Диапазон для сверки: ${rangeStart}–${rangeEnd} см</b><span>Соседние размерные метки вокруг результата формулы.</span></p>`;
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
            const shifterSel = $('#shifterOpt'), derailleurSel = $('#derailleurOpt'),
                cassetteSel = $('#cassetteOpt'), cassetteSpeedSel = $('#cassetteSpeedOpt'),
                chainSpeedSel = $('#chainSpeedOpt'), freehubSel = $('#freehubOpt');
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

            const CASSETTES = [
                { id: 'hg-9-11', label: 'HG — Shimano / SRAM / MicroSHIFT, 9–11 скоростей', speeds: [9, 10, 11], hubs: ['hg'], families: null },
                { id: 'hg-eagle-nx', label: 'SRAM Eagle NX 12s — HG, малая звезда 11T', speeds: [12], hubs: ['hg'], families: ['sram-mtb'] },
                { id: 'shimano-ms-12', label: 'Shimano MTB 12s — MicroSpline', speeds: [12], hubs: ['ms'], families: ['shi-mtb'] },
                { id: 'sram-xd-12', label: 'SRAM Eagle 12s — XD', speeds: [12], hubs: ['xd'], families: ['sram-mtb'] },
                { id: 'sram-xdr-12', label: 'SRAM Road / Gravel 12s — XDR', speeds: [12], hubs: ['xdr'], families: ['sram-road'] },
                { id: 'campy-road-12', label: 'Campagnolo Road 12s — Campagnolo / N3W с адаптером', speeds: [12], hubs: ['campy', 'n3w'], families: ['campy-road'] },
                { id: 'campy-ekar-13', label: 'Campagnolo Ekar 13s — N3W', speeds: [13], hubs: ['n3w'], families: ['campy-ekar'] }
            ];
            const SPEED_OPTIONS = [9, 10, 11, 12, 13].map(speed => ({ id: String(speed), label: `${speed} скоростей` }));

            /* Проверка рычажности троса манетка ↔ переключатель */
            function chainCheck(sh, d) {
                const aS = ACT[famOf(sh)], aD = ACT[famOf(d)];
                if (famOf(sh) === famOf(d)) {
                        if (sh.spd === d.spd) return { s: 'ok', t: `Общее семейство и число скоростей совпадают (${aS.label}, ${sh.spd} spd); точную совместимость моделей и поколения всё равно проверьте.` };
                        return { s: 'warn', t: `Общее семейство, но разное число скоростей (${sh.spd} vs ${d.spd}): совместимость по одной категории определить нельзя.` };
                }
                    return { s: 'bad', t: `Эта общая таблица не подтверждает сочетание семейств ${aS.label} и ${aD.label}; проверьте руководство к точным моделям. Для электронных систем отдельно проверьте протокол и поколение.` };
            }

            function speedCheck(sh, derailleur, cassetteSpeed) {
                const parts = [sh.spd, derailleur.spd, cassetteSpeed];
                if (parts.every(speed => speed === parts[0])) {
                    return { s: 'warn', t: `У манетки, переключателя и кассеты по ${cassetteSpeed} скоростей. Совпало только число; поколение и точная индексация не проверялись.` };
                }
                return { s: 'bad', t: `Скорости не совпадают: манетка ${sh.spd}, переключатель ${derailleur.spd}, кассета ${cassetteSpeed}.` };
            }

            function cassetteDriveCheck(cassette, sh, derailleur, cassetteSpeed) {
                if (!cassette.speeds.includes(cassetteSpeed)) {
                    return { s: 'bad', t: `Профиль кассеты «${cassette.label}» не рассчитан на ${cassetteSpeed} скоростей.` };
                }
                if (!cassette.families) {
                    return { s: 'warn', t: 'Профиль HG охватывает несколько брендов; совпадение числа скоростей не подтверждает индексацию кассеты с конкретной системой.' };
                }
                if (cassette.families.includes(sh.family) && cassette.families.includes(derailleur.family) &&
                    sh.spd === cassetteSpeed && derailleur.spd === cassetteSpeed) {
                    return { s: 'warn', t: 'Семейство и число скоростей совпадают с профилем кассеты; точные модели, поколение и диапазон не проверялись.' };
                }
                return { s: 'bad', t: `Профиль кассеты не совпадает с семейством выбранной манетки и переключателя (${sh.spd}s / ${derailleur.spd}s).` };
            }

            function cassetteHubCheck(cassette, cassetteSpeed, hubId) {
                if (!cassette.speeds.includes(cassetteSpeed)) {
                    return { s: 'bad', t: `Профиль «${cassette.label}» не подходит для кассеты на ${cassetteSpeed} скоростей.` };
                }
                if (!cassette.hubs.includes(hubId)) {
                    return { s: 'bad', t: `Профиль «${cassette.label}» не рассчитан на выбранный барабан ${hubId.toUpperCase()}.` };
                }
                if (cassette.id === 'campy-road-12' && hubId === 'n3w') {
                    return { s: 'warn', t: 'Для Campagnolo Road 12s на N3W может требоваться адаптер 4,4 мм; проверьте исполнение кассеты.' };
                }
                return { s: 'ok', t: `Профиль кассеты и барабан ${hubId.toUpperCase()} совпадают по справочной таблице; артикул и поколение не проверялись.` };
            }

            function chainSpeedCheck(cassetteSpeed, chainSpeed) {
                if (cassetteSpeed !== chainSpeed) {
                    return { s: 'bad', t: `Кассета на ${cassetteSpeed} скоростей, цепь — на ${chainSpeed}; число скоростей должно совпадать.` };
                }
                return { s: 'warn', t: `Число скоростей совпадает (${chainSpeed}); ширину и совместимость конкретной цепи с кассетой и системой проверьте по документации.` };
            }

            const fill = (sel, list) => { sel.innerHTML = list.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join(''); };
            fill(shifterSel, DRIVES);
            fill(derailleurSel, DRIVES);
            fill(cassetteSel, CASSETTES);
            fill(cassetteSpeedSel, SPEED_OPTIONS);
            fill(chainSpeedSel, SPEED_OPTIONS);
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
                const cassette = CASSETTES.find(o => o.id === cassetteSel.value) || CASSETTES[0];
                const cassetteSpeed = Number(cassetteSpeedSel.value);
                const chainSpeed = Number(chainSpeedSel.value);
                const hub = HUBS.find(o => o.id === freehubSel.value) || HUBS[0];

                const checks = [
                    { name: 'Ход троса (Cable Pull Ratio)', ...chainCheck(sh, d) },
                    { name: 'Совпадение скоростей', ...speedCheck(sh, d, cassetteSpeed) },
                    { name: 'Кассета и система', ...cassetteDriveCheck(cassette, sh, d, cassetteSpeed) },
                    { name: 'Кассета и барабан', ...cassetteHubCheck(cassette, cassetteSpeed, hub.id) },
                    { name: 'Цепь и кассета', ...chainSpeedCheck(cassetteSpeed, chainSpeed) }
                ];
                const worst = ['ok', 'warn', 'bad'].reduce((w, c) => checks.some(x => x.s === c) && ['ok', 'warn', 'bad'].indexOf(c) > ['ok', 'warn', 'bad'].indexOf(w) ? c : w, 'ok');
                const title = { ok: 'Базовые признаки совпадают', warn: 'Нужна проверка моделей', bad: 'Не подтверждено' }[worst];

                callout.className = `callout glass is-${worst}`;
                callout.innerHTML =
                    `<h3><span class="status-dot"></span>${title}</h3>` +
                    `<p>Манетка: ${esc(sh.label)} · переключатель: ${esc(d.label)} · кассета: ${esc(cassette.label)} (${cassetteSpeed} скоростей) · цепь: ${chainSpeed} скоростей · барабан: ${esc(hub.label)}</p>` +
                    `<ul class="check-grid">${checks.map(c => `<li class="check-item"><b>${c.name}:</b> ${esc(c.t)}</li>`).join('')}</ul>` +
                    (crossSel && crossSel.value ? '<p style="margin-top:.6rem; font-size:.82rem; color:var(--text-dim)">Выбрана известная кросс-брендовая комбинация для дальнейшей проверки; это не подтверждение совместимости конкретных деталей.</p>' : '');
            }

            [shifterSel, derailleurSel, cassetteSel, cassetteSpeedSel, chainSpeedSel, freehubSel].forEach(sel =>
                sel.addEventListener('change', () => { syncCross(); evaluate(); }));
            if (crossSel) crossSel.addEventListener('change', () => {
                const p = CROSSES.find(o => o.id === crossSel.value);
                if (p) { shifterSel.value = p.sh; derailleurSel.value = p.d; }
                syncCross(); evaluate();
            });
            shifterSel.value = 'shi-mtb-12';
            derailleurSel.value = 'shi-mtb-12';
            cassetteSel.value = 'shimano-ms-12';
            cassetteSpeedSel.value = '12';
            chainSpeedSel.value = '12';
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
            if (topBtn) topBtn.addEventListener('click', () => {
                if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    window.scrollTo(0, 0);
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
            update();
        })();
