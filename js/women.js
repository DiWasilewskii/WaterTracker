// ==========================================
// ЖІНОЧЕ ЗДОРОВ'Я: цикл, вагітність, годування груддю
// ==========================================
// Дані зберігаються лише локально на пристрої.
// Надбавки до норми — орієнтовні (не медична порада):
//   вагітність +300 мл/день, годування груддю +700 мл/день (EFSA, 2010);
//   місячні +200 мл, лютеїнова фаза +150 мл — невелика орієнтовна надбавка.

const WOMEN_EXTRA = { pregnancy: 300, breastfeeding: 700, period: 200, luteal: 150 };
const WOMEN_INTERVAL_CAP = { pregnancy: 45, breastfeeding: 45, period: 50 };

const PHASES = {
    period:     { emoji: '🩸', name: 'Місячні' },
    follicular: { emoji: '🌱', name: 'Фолікулярна фаза' },
    fertile:    { emoji: '🌼', name: 'Фертильні дні' },
    ovulation:  { emoji: '🥚', name: 'Овуляція' },
    luteal:     { emoji: '🌙', name: 'Лютеїнова фаза' }
};

// ---------- Дати ----------

function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
    return Math.round((startOfDay(b.getTime()) - startOfDay(a.getTime())) / DAY_MS);
}

function addDays(date, n) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
}

// ---------- Стан ----------

function womenMode() {
    if (gameState.gender !== 'female') return 'off';
    return gameState.womenMode || 'off';
}

function periodStarts() {
    return (Array.isArray(gameState.periodStarts) ? gameState.periodStarts : []).slice().sort();
}

// Тривалість циклу: середнє з останніх відміток (якщо є хоча б дві), інакше з налаштувань
function cycleLength() {
    const starts = periodStarts();
    const diffs = [];
    for (let i = 1; i < starts.length; i++) {
        const d = daysBetween(keyToDate(starts[i - 1]), keyToDate(starts[i]));
        if (d >= 18 && d <= 45) diffs.push(d);
    }
    const recent = diffs.slice(-3);
    if (recent.length) return Math.round(recent.reduce((s, d) => s + d, 0) / recent.length);
    return gameState.cycleLength || 28;
}

function periodLength() {
    return gameState.periodLength || 5;
}

// Останній початок місячних, не пізніше за дату
function lastStartOnOrBefore(date) {
    const key = dateKey(date);
    const starts = periodStarts().filter(s => s <= key);
    return starts.length ? keyToDate(starts[starts.length - 1]) : null;
}

// Фаза для дня циклу
function phaseForDay(day, len, pLen) {
    const ov = len - 14;
    if (day <= pLen) return 'period';
    if (day === ov) return 'ovulation';
    if (day >= ov - 5 && day <= ov + 1) return 'fertile';
    if (day > ov) return 'luteal';
    return 'follicular';
}

// Інформація про день: { day, phase, predicted } або null, якщо даних немає
function cycleInfo(date) {
    const len = cycleLength(), pLen = periodLength();
    const today = new Date();
    let start = lastStartOnOrBefore(date);
    let predicted = false;

    if (!start) return null;
    let day = daysBetween(start, date) + 1;

    // Майбутнє (після останньої відмітки) — прогноз за середньою тривалістю циклу
    if (date > today || day > len) {
        const last = lastStartOnOrBefore(today) || start;
        const sinceLast = daysBetween(last, date);
        if (date > today) {
            predicted = true;
            day = (sinceLast % len) + 1;
        }
    }
    return { day, phase: phaseForDay(day, len, pLen), predicted };
}

// ---------- Вагітність ----------

function pregnancyInfo() {
    if (!gameState.dueDate) return null;
    const daysLeft = daysBetween(new Date(), keyToDate(gameState.dueDate));
    const week = Math.max(1, Math.min(42, Math.floor((280 - daysLeft) / 7) + 1));
    const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
    return { week, trimester, daysLeft };
}

// ---------- Вплив на питний режим ----------

// Надбавка до денної норми (мл) і пояснення
function womenAdjustment() {
    const mode = womenMode();
    if (mode === 'pregnancy') {
        return { ml: WOMEN_EXTRA.pregnancy, reason: 'вагітність', cap: WOMEN_INTERVAL_CAP.pregnancy };
    }
    if (mode === 'breastfeeding') {
        return { ml: WOMEN_EXTRA.breastfeeding, reason: 'годування груддю', cap: WOMEN_INTERVAL_CAP.breastfeeding };
    }
    if (mode === 'cycle') {
        const info = cycleInfo(new Date());
        if (info && info.phase === 'period') {
            return { ml: WOMEN_EXTRA.period, reason: 'місячні', cap: WOMEN_INTERVAL_CAP.period };
        }
        if (info && info.phase === 'luteal') return { ml: WOMEN_EXTRA.luteal, reason: 'лютеїнова фаза', cap: null };
    }
    return { ml: 0, reason: '', cap: null };
}

// Чи пом'якшувати тон крапельки (без жартів про «вбивство»)
function gentleMode() {
    const mode = womenMode();
    if (mode === 'pregnancy') return true;
    if (mode === 'cycle') {
        const info = cycleInfo(new Date());
        return !!(info && info.phase === 'period');
    }
    return false;
}

// Підпис для картки дня
function womenChipText() {
    const mode = womenMode();
    if (mode === 'pregnancy') {
        const p = pregnancyInfo();
        return p ? `🤰 ${p.week} тиждень · ${p.trimester} триместр` : '🤰 Вагітність';
    }
    if (mode === 'breastfeeding') return '🍼 Годування груддю';
    if (mode === 'cycle') {
        const info = cycleInfo(new Date());
        if (!info) return '';
        const ph = PHASES[info.phase];
        return `${ph.emoji} День циклу ${info.day} · ${ph.name.toLowerCase()}`;
    }
    return '';
}

// Коли наступні місячні (за прогнозом)
function nextPeriodIn() {
    const last = lastStartOnOrBefore(new Date());
    if (!last) return null;
    const len = cycleLength();
    let next = addDays(last, len);
    while (next < addDays(new Date(), -1)) next = addDays(next, len);
    return daysBetween(new Date(), next);
}

// Торкання дня: відмітити / зняти початок місячних
function togglePeriodStart(key) {
    if (key > dateKey(new Date())) {
        alert('Відмічати можна лише дні, що вже настали.');
        return;
    }
    const starts = periodStarts();
    gameState.periodStarts = starts.includes(key) ? starts.filter(s => s !== key) : starts.concat(key).sort();
}
