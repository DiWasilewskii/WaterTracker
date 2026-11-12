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
    { id: 'ill',     emoji: '🤒', name: 'Хвороба',          ml: 40,  remind: 40 },
    { id: 'hike',    emoji: '🥾', name: 'Похід',            ml: 400, remind: 25 },
    { id: 'garden',  emoji: '🌱', name: 'Сад / город',      ml: 400, remind: 25 },
    { id: 'shopping', emoji: '🛒', name: 'Покупки',          ml: 100, remind: 50 },
    { id: 'meeting', emoji: '🗣️', name: 'Наради / зустрічі', short: 'Наради', ml: 50, remind: null },
    { id: 'creative', emoji: '🎨', name: 'Творчість',        ml: 50,  remind: null },
    { id: 'train',   emoji: '🚆', name: 'Потяг / автобус',  short: 'Потяг', ml: 50, remind: null },
    { id: 'cold',    emoji: '❄️', name: 'На морозі',        ml: 100, remind: 45 }
];
const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));

// Категорії активностей (порядок плиток у розкладі)
// Спеку й мороз окремо не обираємо — їх враховує погода (heat/cold лишаються для старих записів)
const ACTIVITY_CATEGORIES = [
    { id: 'sport',  emoji: '🏅', name: 'Спорт',       items: ['gym', 'run', 'bike', 'swim', 'team', 'yoga', 'dance', 'hike'] },
    { id: 'physical', emoji: '💪', name: 'Фізична',   items: ['labor', 'home', 'walk', 'garden', 'shopping'] },
    { id: 'mental', emoji: '🧠', name: 'Розумова',    items: ['office', 'study', 'meeting', 'creative'] },
    { id: 'travel', emoji: '🚗', name: 'Дорога',      items: ['commute', 'train', 'flight'] },
    { id: 'rest',   emoji: '😴', name: "Сон, відпочинок і здоров'я", short: 'Відпочинок', items: ['sleep', 'rest', 'party', 'sauna', 'ill'] }
];

// Як повторюється запис розкладу
const REPEAT_LABELS = { once: 'лише цей день', daily: 'щодня', weekdays: 'по буднях', weekends: 'по вихідних' };

function entryRepeat(e) {
    return e.repeat || (e.daily ? 'daily' : 'once');
}

// Чи діє запис у конкретний день
function entryAppliesOn(e, day) {
    const rep = entryRepeat(e);
    const wd = day.getDay();
    if (rep === 'daily') return true;
    if (rep === 'weekdays') return wd >= 1 && wd <= 5;
    if (rep === 'weekends') return wd === 0 || wd === 6;
    return e.date === dateKey(day);
}

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

// Разові записи старші за 30 днів більше не потрібні
function purgeOldScheduleEntries() {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const limit = dateKey(old);
    gameState.schedule = scheduleEntries().filter(e => entryRepeat(e) !== 'once' || e.date >= limit);
}

// Конкретні проміжки активностей (з датами) у діапазоні [from, to)
function activityOccurrences(from, to) {
    const occ = [];
    for (let day = startOfDay(from) - DAY_MS; day < to; day += DAY_MS) {
        const dayDate = new Date(day);
        scheduleEntries().forEach(e => {
            if (!entryAppliesOn(e, dayDate)) return;
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
    let base = Math.max(15, gameState.baseIntervalMin || 60);
    // Вагітність, годування, місячні — нагадування частіше
    const cap = typeof womenAdjustment === 'function' ? womenAdjustment().cap : null;
    if (cap) base = Math.min(base, cap);
    return base;
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

// Час, коли крапелька «захоче пити» (для таймера на головному екрані)
function computeDueAt() {
    const from = gameState.lastDrinkAt || Date.now();
    return dueAfter(activityOccurrences(from, from + 2 * DAY_MS + DAY_MS), from);
}

// Скільки води додають активності в день (мл); без аргументу — сьогодні
function activitiesExtraMl(dayTs) {
    const day = startOfDay(dayTs || Date.now());
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

// Який пул для k-го нагадування поспіль без пиття (k = 0, 1, 2, …)
function reminderPool(k, o, prevWasSleep) {
    if (prevWasSleep) return 'morning';
    const act = o && o.act;
    // Вагітність і місячні: сповіщення не стають «злими» далі другого рівня
    if (k >= 2 && typeof gentleMode === 'function' && gentleMode()) return 'second';
    if (k === 0) return act && act.remind && act.remind <= 25 ? 'sport' : 'first';
    return k === 1 ? 'second' : k === 2 ? 'third' : 'fourth';
}

// Перебирає всі нагадування від `start` до `until`: cb(t, k, pool, o)
function walkReminders(start, until, cb) {
    const occ = activityOccurrences(start - DAY_MS, until + DAY_MS);
    let from = start;
    for (let k = 0; k < 200; k++) {
        const t = dueAfter(occ, from);
        if (t > until) break;
        const prev = activityAtFrom(occ, t - MIN_MS);
        const prevWasSleep = !!(prev && prev.act.remind === 'off');
        const o = activityAtFrom(occ, t);
        cb(t, k, reminderPool(k, o, prevWasSleep), o);
        from = t;
    }
}

// Людина попила: нагадування, що встигли прийти, «витрачають» репліки дня,
// щоб наступні сповіщення сьогодні були новими
function consumeShownReminders() {
    const now = Date.now();
    const last = gameState.lastDrinkAt || now;
    const c = notifCounters();
    walkReminders(Math.max(last, now - DAY_MS), now, (t, k, pool) => { c[pool] = (c[pool] || 0) + 1; });
}

// Список нагадувань на найближчі 36 год (якщо людина так і не вип'є):
// перше — коли «настане час пити», далі — повтори, і кожне наступне зліше за попереднє.
function buildReminderPlan() {
    const now = Date.now();
    const last = gameState.lastDrinkAt || now;
    // Давно не відкривали гру — рахуємо повтори лише з останньої доби
    const start = Math.max(last, now - DAY_MS);
    const c = Object.assign({}, notifCounters());  // локальна копія денних лічильників
    const items = [];
    walkReminders(start, now + PLAN_HORIZON_MS, (t, k, pool, o) => {
        const idx = c[pool] = (c[pool] || 0) + 1;
        if (t <= now) return;  // вже показані — лише займають свої репліки
        const line = notifLineAt(pool, idx - 1);
        const vars = {
            since: formatDuration(t - last),
            act: o ? (o.act.short || o.act.name) : '',
            emoji: o ? o.act.emoji : '💧'
        };
        items.push({ at: t, title: fillLine(line.t, vars), text: fillLine(line.x, vars) });
    });
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
