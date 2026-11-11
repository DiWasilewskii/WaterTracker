// ==========================================
// КАРТКА ДНЯ: дата, аватар і графік пиття за сьогодні
// ==========================================
const UA_WEEKDAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
const UA_MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

function renderTodayDate() {
    const d = new Date();
    document.getElementById('today-date').textContent =
        `${UA_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${UA_MONTHS_GEN[d.getMonth()]}`;
}

// Аватар профілю: перша літера імені або 👤
function renderAvatar() {
    const name = (gameState.userName || '').trim();
    document.getElementById('profile-avatar').textContent = name ? name.charAt(0).toUpperCase() : '👤';
}

// ---------- Журнал пиття ----------

// Записи пиття за сьогодні: [{ t: мс, n: корисна рідина мл }]
function todayDrinkLog() {
    const day = startOfDay(Date.now());
    return (Array.isArray(gameState.drinkLog) ? gameState.drinkLog : []).filter(e => e.t >= day);
}

function logDrink(netMl) {
    gameState.drinkLog = todayDrinkLog().concat({ t: Date.now(), n: netMl });
}

// ---------- Межі «дня»: від пробудження до сну (з розкладу) ----------

function dayWindow() {
    const day = startOfDay(Date.now());
    const sleeps = activityOccurrences(day - DAY_MS, day + 2 * DAY_MS).filter(o => o.act.id === 'sleep');
    // Прокинулись: кінець сну, що закінчується сьогодні до обіду
    const wake = sleeps.map(o => o.e).filter(e => e > day && e <= day + 14 * 60 * MIN_MS).sort((a, b) => b - a)[0];
    // Лягаємо: початок сну сьогодні після обіду (або до 3 ночі)
    const bed = sleeps.map(o => o.s).filter(s => s >= day + 12 * 60 * MIN_MS && s <= day + 27 * 60 * MIN_MS).sort((a, b) => a - b)[0];
    let start = wake || day + 7 * 60 * MIN_MS;
    let end = bed || day + 23 * 60 * MIN_MS;
    // Пили раніше за пробудження або засиділись після «відбою» — розширюємо
    const log = todayDrinkLog();
    if (log.length) start = Math.min(start, log[0].t);
    end = Math.max(end, Math.min(Date.now(), day + DAY_MS));
    return { start, end };
}

// ---------- Графік ----------

const chartSvg = document.getElementById('hydration-chart');
const chartTip = document.getElementById('chart-tip');
let chartModel = null;

function niceGoalTicks(goal) {
    return [0, Math.round(goal / 2 / 100) * 100, goal];
}

function renderHydrationChart() {
    const W = Math.max(200, chartSvg.clientWidth || 300);
    const H = 92;
    const pad = { l: 44, r: 10, t: 8, b: 18 };
    const { start, end } = dayWindow();
    const now = Math.min(Date.now(), end);
    const goal = gameState.calculatedGoal || 2000;
    const log = todayDrinkLog();

    // Накопичувальна сума: сходинка в момент кожного пиття
    const pts = [[start, 0]];
    let cum = 0;
    log.forEach(e => {
        const t = Math.max(start, e.t);
        pts.push([t, cum]);
        cum += e.n;
        pts.push([t, cum]);
    });
    pts.push([now, cum]);

    const yMax = Math.max(goal, cum) * 1.08;
    const x = t => pad.l + (t - start) / (end - start) * (W - pad.l - pad.r);
    const y = v => H - pad.b - v / yMax * (H - pad.t - pad.b);

    // Сітка та підписи осі Y (0, половина, норма)
    let svg = '';
    niceGoalTicks(goal).forEach(v => {
        svg += `<line class="ch-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/>` +
            `<text class="ch-axis" x="${pad.l - 6}" y="${y(v) + 3}" text-anchor="end">${v} мл</text>`;
    });

    // Підписи осі X: кожні 3 години
    const firstHour = new Date(start);
    firstHour.setMinutes(0, 0, 0);
    for (let t = firstHour.getTime() + 60 * MIN_MS; t < end; t += 60 * MIN_MS) {
        const h = new Date(t).getHours();
        if (h % 3 !== 0) continue;
        svg += `<text class="ch-axis" x="${x(t)}" y="${H - 4}" text-anchor="middle">${h}:00</text>`;
    }

    // Ідеальний темп: рівномірно від 0 при пробудженні до норми перед сном
    svg += `<line class="ch-pace" x1="${x(start)}" y1="${y(0)}" x2="${x(end)}" y2="${y(goal)}"/>`;

    // Випито: заливка (тонка) + лінія 2px + точка «зараз»
    const line = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
    svg += `<path class="ch-area" d="${line}L${x(now).toFixed(1)},${y(0)}L${x(start)},${y(0)}Z"/>`;
    svg += `<path class="ch-line" d="${line}"/>`;
    svg += `<circle class="ch-dot" cx="${x(now)}" cy="${y(cum)}" r="4"/>`;

    // Підпис значення лише на кінці лінії
    const labelRight = x(now) > W - 70;
    svg += `<text class="ch-value" x="${x(now) + (labelRight ? -8 : 8)}" y="${Math.max(pad.t + 8, y(cum) - 6)}" ` +
        `text-anchor="${labelRight ? 'end' : 'start'}">${cum} мл</text>`;

    // Курсор для підказки
    svg += `<line id="ch-cursor" class="ch-cursor" x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>`;

    chartSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    chartSvg.setAttribute('height', H);
    chartSvg.innerHTML = svg;
    chartSvg.setAttribute('aria-label',
        `Сьогодні випито ${cum} мл із ${goal} мл, з ${formatHM(start)} до ${formatHM(now)}`);
    chartModel = { start, end, now, goal, log, x, pad, W };
}

// Скільки було випито на момент t
function cumulativeAt(log, t) {
    return log.filter(e => e.t <= t).reduce((s, e) => s + e.n, 0);
}

// ---------- Підказка: наведення / дотик ----------

let tipHideTimer = null;
function showChartTip(clientX) {
    if (!chartModel) return;
    const m = chartModel;
    const rect = chartSvg.getBoundingClientRect();
    const px = (clientX - rect.left) * (m.W / rect.width);
    const frac = Math.min(1, Math.max(0, (px - m.pad.l) / (m.W - m.pad.l - m.pad.r)));
    const t = Math.min(m.now, m.start + frac * (m.end - m.start));
    const drunk = cumulativeAt(m.log, t);
    const pace = Math.round(m.goal * (t - m.start) / (m.end - m.start) / 10) * 10;
    const diff = drunk - pace;

    const cursor = document.getElementById('ch-cursor');
    cursor.setAttribute('x1', m.x(t));
    cursor.setAttribute('x2', m.x(t));
    cursor.setAttribute('visibility', 'visible');

    chartTip.innerHTML = `<b>${formatHM(t)}</b> · випито ${drunk} мл<br>` +
        `<span>${diff >= 0 ? `випереджаєш темп на ${diff} мл` : `до темпу бракує ${-diff} мл`}</span>`;
    chartTip.classList.remove('hidden');
    const tipX = m.x(t) / m.W * rect.width;
    chartTip.style.left = `${Math.min(Math.max(tipX, 70), rect.width - 70)}px`;

    clearTimeout(tipHideTimer);
    tipHideTimer = setTimeout(hideChartTip, 3000);
}

function hideChartTip() {
    chartTip.classList.add('hidden');
    const cursor = document.getElementById('ch-cursor');
    if (cursor) cursor.setAttribute('visibility', 'hidden');
}

chartSvg.addEventListener('pointerdown', e => showChartTip(e.clientX));
chartSvg.addEventListener('pointermove', e => showChartTip(e.clientX));
chartSvg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideChartTip(); });

let chartResizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(chartResizeTimer);
    chartResizeTimer = setTimeout(() => { if (isChartOpen()) renderHydrationChart(); }, 150);
});

// Графік ховається за кнопкою «🔥 День» (за замовчуванням згорнутий)
const chartWrap = document.getElementById('chart-wrap');
const btnToggleChart = document.getElementById('btn-toggle-chart');

function isChartOpen() {
    return !chartWrap.classList.contains('collapsed');
}

btnToggleChart.addEventListener('click', () => {
    const open = !isChartOpen();
    chartWrap.classList.toggle('collapsed', !open);
    document.body.classList.toggle('chart-open', open);
    btnToggleChart.setAttribute('aria-expanded', open);
    btnToggleChart.title = open ? 'Сховати графік' : 'Показати графік за сьогодні';
    if (open) renderHydrationChart();  // у схованому стані ширина 0 — малюємо при відкритті
    else hideChartTip();
});

function renderDayCard() {
    renderTodayDate();
    renderAvatar();
    if (isChartOpen()) renderHydrationChart();
}
