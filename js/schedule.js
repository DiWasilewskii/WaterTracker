// ==========================================
// РОЗКЛАД АКТИВНОСТЕЙ ТА ПЛАНУВАННЯ НАГАДУВАНЬ
// ==========================================
// ml     — скільки води додається до денної норми за годину активності
// remind — як часто нагадувати пити під час активності (хв);
//          null — базовий інтервал з налаштувань, 'off' — не нагадувати (сон)
const ACTIVITIES = [
    { id: 'sleep',   emoji: '😴', name: 'Сон',              ml: 0,   remind: 'off' },
    { id: 'office',  emoji: '💻', name: "Робота за комп'ютером", short: "За комп'ютером", ml: 50, remind: null },
    { id: 'study',   emoji: '📚', name: 'Навчання',         ml: 50,  remind: null },
    { id: 'rest',    emoji: '🛋️', name: 'Відпочинок',       ml: 0,   remind: null },
    { id: 'commute', emoji: '🚗', name: 'Дорога',           ml: 50,  remind: null },
    { id: 'home',    emoji: '🏠', name: 'Домашні справи',   ml: 100, remind: 50 },
    { id: 'walk',    emoji: '🚶', name: 'Прогулянка',       ml: 150, remind: 40 },
    { id: 'flight',  emoji: '✈️', name: 'Переліт',          ml: 150, remind: 45 },
    { id: 'yoga',    emoji: '🧘', name: 'Йога / розтяжка',  short: 'Йога', ml: 200, remind: 30 },
    { id: 'party',   emoji: '🎉', name: 'Вечірка',          ml: 250, remind: 30 },
    { id: 'swim',    emoji: '🏊', name: 'Плавання',         ml: 400, remind: 30 },
    { id: 'dance',   emoji: '💃', name: 'Танці',            ml: 400, remind: 25 },
    { id: 'labor',   emoji: '🛠️', name: 'Фізична праця',    ml: 400, remind: 25 },
    { id: 'gym',     emoji: '🏋️', name: 'Спортзал',         ml: 500, remind: 20 },
    { id: 'bike',    emoji: '🚴', name: 'Велосипед',        ml: 500, remind: 20 },
    { id: 'heat',    emoji: '☀️', name: 'На спеці',         ml: 500, remind: 20 },
    { id: 'run',     emoji: '🏃', name: 'Біг',              ml: 600, remind: 15 },
    { id: 'team',    emoji: '⚽', name: 'Командний спорт',  short: 'Футбол / ігри', ml: 600, remind: 15 },
    { id: 'sauna',   emoji: '🧖', name: 'Сауна / лазня',    short: 'Сауна', ml: 700, remind: 15 },
    { id: 'ill',     emoji: '🤒', name: 'Хвороба',          ml: 40,  remind: 40 }
];
const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));

const MIN_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MIN_MS;
const PLAN_HORIZON_MS = 36 * 60 * MIN_MS;  // нагадування плануємо на 36 год уперед
const DEFAULT_SCHEDULE = [
    { id: 'default-sleep', type: 'sleep', start: '23:00', end: '07:00', daily: true }
];

// ---------- Дати й час ----------

function dateKey(d) {
    const m = d.getMonth() + 1, day = d.getDate();
    return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

function minutesOf(hm) {
    const [h, m] = String(hm).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function formatHM(ts) {
    const d = new Date(ts);
    const h = d.getHours(), m = d.getMinutes();
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / MIN_MS));
    const h = Math.floor(total / 60), m = total % 60;
    if (h && m) return `${h} год ${m} хв`;
    return h ? `${h} год` : `${m} хв`;
}

// ---------- Розклад ----------

function scheduleEntries() {
    return Array.isArray(gameState.schedule) ? gameState.schedule : [];
}

// Записи «лише сьогодні» з минулих днів більше не потрібні
function purgeOldScheduleEntries() {
    const today = dateKey(new Date());
    gameState.schedule = scheduleEntries().filter(e => e.daily || e.date >= today);
}

// Конкретні проміжки активностей (з датами) у діапазоні [from, to)
function activityOccurrences(from, to) {
    const occ = [];
    for (let day = startOfDay(from) - DAY_MS; day < to; day += DAY_MS) {
        const key = dateKey(new Date(day));
        scheduleEntries().forEach(e => {
            if (!e.daily && e.date !== key) return;
            const act = ACTIVITY_BY_ID[e.type];
            if (!act) return;
            const s = day + minutesOf(e.start) * MIN_MS;
            let en = day + minutesOf(e.end) * MIN_MS;
            if (en <= s) en += DAY_MS;  // через північ (напр. сон 23:00–07:00)
            if (en > from && s < to) occ.push({ s, e: en, act, entry: e });
        });
    }
    return occ;
}

// Активність у момент ts (при накладанні — найінтенсивніша)
function activityAtFrom(occ, ts) {
    let best = null;
    for (const o of occ) {
        if (o.s <= ts && ts < o.e && (!best || o.act.ml > best.act.ml)) best = o;
    }
    return best;
}

function currentActivity() {
    const now = Date.now();
    return activityAtFrom(activityOccurrences(now - MIN_MS, now + MIN_MS), now);
}

function baseIntervalMin() {
    return Math.max(15, gameState.baseIntervalMin || 60);
}

// Інтервал нагадувань (хв) під час активності; null — не нагадувати
function intervalFor(act) {
    if (!act) return baseIntervalMin();
    if (act.remind === 'off') return null;
    return act.remind ? Math.min(act.remind, baseIntervalMin()) : baseIntervalMin();
}

// Коли треба пити, якщо востаннє пили (або нагадували) в момент `from`:
// перша хвилина, коли минуло не менше інтервалу поточної активності; сон пропускаємо.
function dueAfter(occ, from) {
    for (let t = from + MIN_MS; t <= from + 2 * DAY_MS; t += MIN_MS) {
        const o = activityAtFrom(occ, t);
        const iv = intervalFor(o && o.act);
        if (iv !== null && t - from >= iv * MIN_MS) return t;
    }
    return from + baseIntervalMin() * MIN_MS;
}

// Час, коли капелька «захоче пити» (для таймера на головному екрані)
function computeDueAt() {
    const from = gameState.lastDrinkAt || Date.now();
    return dueAfter(activityOccurrences(from, from + 2 * DAY_MS + DAY_MS), from);
}

// Скільки води додають активності сьогодні (мл)
function activitiesExtraMl() {
    const day = startOfDay(Date.now());
    const occ = activityOccurrences(day, day + DAY_MS);
    let ml = 0;
    occ.forEach(o => {
        // рахуємо лише ту частину, що припадає на сьогодні
        const s = Math.max(o.s, day), e = Math.min(o.e, day + DAY_MS);
        if (e > s) ml += o.act.ml * (e - s) / (60 * MIN_MS);
    });
    return Math.round(ml / 50) * 50;
}

// ---------- План нагадувань для Android ----------

function reminderText(o, prevWasSleep, sinceMs) {
    const name = gameState.userName;
    if (prevWasSleep) {
        return {
            title: `☀️ Доброго ранку${name ? ', ' + name : ''}!`,
            text: 'Почни день зі склянки води — капелька вже скучила.'
        };
    }
    const act = o && o.act;
    if (act && act.remind && act.remind <= 25) {
        return {
            title: `${act.emoji} ${act.short || act.name} — не забувай пити!`,
            text: `${name ? name + ', під' : 'Під'} час активності тіло втрачає більше води. Зроби кілька ковтків.`
        };
    }
    return {
        title: '💧 Аква-Тамагочі хоче пити!',
        text: `${name ? name + ', в' : 'В'}ід останнього пиття минуло ${formatDuration(sinceMs)}. Не дай улюбленцю засохнути.`
    };
}

// Список нагадувань на найближчі 36 год (якщо людина так і не вип'є):
// перше — коли «настане час пити», далі — повтори з інтервалом поточної активності.
function buildReminderPlan() {
    const now = Date.now();
    const last = gameState.lastDrinkAt || now;
    // Давно не відкривали гру — рахуємо повтори лише з останньої доби
    const start = Math.max(last, now - DAY_MS);
    const occ = activityOccurrences(start - DAY_MS, now + PLAN_HORIZON_MS + DAY_MS);
    const items = [];
    let from = start;
    for (let i = 0; i < 200; i++) {
        const t = dueAfter(occ, from);
        if (t > now + PLAN_HORIZON_MS) break;
        if (t > now) {
            const prev = activityAtFrom(occ, t - MIN_MS);
            const prevWasSleep = !!(prev && prev.act.remind === 'off');
            items.push({ at: t, ...reminderText(activityAtFrom(occ, t), prevWasSleep, t - last) });
        }
        from = t;
    }
    return items;
}

// Вечірнє попередження «норму не виконано»: за 2 год до сну (або о 21:00)
function eveningWarningAt() {
    const now = Date.now();
    const day = startOfDay(now);
    const sleep = activityOccurrences(day, day + DAY_MS)
        .filter(o => o.act.id === 'sleep' && o.s >= day + 12 * 60 * MIN_MS)
        .sort((a, b) => a.s - b.s)[0];
    const at = sleep ? sleep.s - 2 * 60 * MIN_MS : day + 21 * 60 * MIN_MS;
    return at > now ? at : 0;
}
