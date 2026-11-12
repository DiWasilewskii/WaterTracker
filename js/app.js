// Напої: категорії → різновиди.
// eff — частка, що йде в залік гідратації; vol — типовий об'єм (підставляється сам);
// full — назва в репліці; msg (необов'язково) — власна репліка різновиду.
// Репліка категорії: msg(full, v, n), де v — випито мл, n — корисна рідина мл.
const DRINK_CATEGORIES = [
    { id: 'water', emoji: '💧', name: 'Вода',
      msg: (f, v, n) => `Глип-глип! +${n} мл чистого здоров'я!`,
      variants: [
        { id: 'water',     name: 'Звичайна',     eff: 1.0,  vol: 250 },
        { id: 'mineral',   name: 'Мінеральна',   eff: 1.0,  vol: 250, msg: (f, v, n) => `Бульбашки лоскочуть! +${n} мл і трохи мінералів!` },
        { id: 'sparkling', name: 'Газована',     eff: 1.0,  vol: 330, msg: (f, v, n) => `Пш-ш-ш! Газована вода: +${n} мл!` },
        { id: 'lemon',     name: 'З лимоном',    eff: 1.0,  vol: 250, msg: (f, v, n) => `Кисленько й освіжаюче! +${n} мл!` },
        { id: 'warm',      name: 'Тепла',        eff: 1.0,  vol: 200, msg: (f, v, n) => `Тепленько всередині! +${n} мл.` }
      ] },
    { id: 'tea', emoji: '🍵', name: 'Чай',
      msg: (f, v, n) => `Чайочок! ${f}: +${n} мл.`,
      variants: [
        { id: 'tea',       name: 'Зелений',      full: 'Зелений чай',      eff: 0.9,  vol: 250 },
        { id: 'blacktea',  name: 'Чорний',       full: 'Чорний чай',       eff: 0.85, vol: 250 },
        { id: 'herbal',    name: "Трав'яний",    full: "Трав'яний чай",    eff: 0.95, vol: 250, msg: (f, v, n) => `Пахне літом! Трав'яний чай: +${n} мл.` },
        { id: 'fruittea',  name: 'Фруктовий',    full: 'Фруктовий чай',    eff: 0.95, vol: 250 },
        { id: 'matcha',    name: 'Матча',        eff: 0.85, vol: 150 },
        { id: 'mate',      name: 'Мате',         eff: 0.85, vol: 200 },
        { id: 'icedtea',   name: 'Холодний',     full: 'Холодний чай',     eff: 0.85, vol: 330 },
        { id: 'chailatte', name: 'Чай-лате',     eff: 0.8,  vol: 300 }
      ] },
    { id: 'coffee', emoji: '☕', name: 'Кава',
      msg: (f, v, n) => `${f}! Залито ${v} мл, користі на +${n} мл.`,
      variants: [
        { id: 'espresso',   name: 'Еспресо',      eff: 0.4,  vol: 40,  msg: (f, v, n) => `Еспресо — маленьке, але бадьоре! Лише +${n} мл.` },
        { id: 'americano',  name: 'Американо',    eff: 0.65, vol: 200 },
        { id: 'cappuccino', name: 'Капучино',     eff: 0.7,  vol: 200 },
        { id: 'latte',      name: 'Лате',         eff: 0.75, vol: 300 },
        { id: 'flatwhite',  name: 'Флет вайт',    eff: 0.7,  vol: 180 },
        { id: 'raf',        name: 'Раф',          eff: 0.65, vol: 250 },
        { id: 'icedlatte',  name: 'Айс-лате',     eff: 0.75, vol: 300 },
        { id: 'coffee',     name: 'Фільтр',       full: 'Фільтр-кава',      eff: 0.6, vol: 250 },
        { id: 'instant',    name: 'Розчинна',     full: 'Розчинна кава',    eff: 0.6, vol: 200 },
        { id: 'decaf',      name: 'Без кофеїну',  full: 'Кава без кофеїну', eff: 0.9, vol: 200 }
      ] },
    { id: 'milk', emoji: '🥛', name: 'Молочне',
      msg: (f, v, n) => `Молочні вуса! ${f}: +${n} мл.`,
      variants: [
        { id: 'milk',       name: 'Молоко',          eff: 0.9,  vol: 250 },
        { id: 'kefir',      name: 'Кефір',           eff: 0.85, vol: 250, msg: (f, v, n) => `Кефірчик для животика! +${n} мл.` },
        { id: 'ayran',      name: 'Айран',           eff: 0.9,  vol: 250 },
        { id: 'ryazhanka',  name: 'Ряжанка',         eff: 0.85, vol: 250 },
        { id: 'yogurt',     name: 'Питний йогурт',   eff: 0.8,  vol: 250 },
        { id: 'plantmilk',  name: 'Рослинне молоко', eff: 0.9,  vol: 250 },
        { id: 'protein',    name: 'Протеїновий коктейль', eff: 0.8, vol: 300, msg: (f, v, n) => `Сила й вода! Протеїновий коктейль: +${n} мл.` }
      ] },
    { id: 'juice', emoji: '🧃', name: 'Соки',
      msg: (f, v, n) => `Вітамінчики! ${f}: +${n} мл, але пам'ятай про цукор.`,
      variants: [
        { id: 'orange',     name: 'Апельсиновий', full: 'Апельсиновий сік', eff: 0.8,  vol: 250 },
        { id: 'juice',      name: 'Яблучний',     full: 'Яблучний сік',     eff: 0.8,  vol: 250 },
        { id: 'tomato',     name: 'Томатний',     full: 'Томатний сік',     eff: 0.85, vol: 250 },
        { id: 'fresh',      name: 'Фреш',         full: 'Свіжий фреш',      eff: 0.85, vol: 250 },
        { id: 'multifruit', name: 'Мультифрукт',  eff: 0.75, vol: 250 },
        { id: 'smoothie',   name: 'Смузі',        eff: 0.75, vol: 300, msg: (f, v, n) => `Густо й фруктово! Зараховую +${n} мл.` }
      ] },
    { id: 'soup', emoji: '🍲', name: 'Суп',
      msg: (f, v, n) => `Смачно й тепло! ${f}: зараховую +${n} мл.`,
      variants: [
        { id: 'broth',      name: 'Бульйон',      eff: 0.95, vol: 250 },
        { id: 'borscht',    name: 'Борщ',         eff: 0.85, vol: 300, msg: (f, v, n) => `Борщик! Смачно й корисно: +${n} мл.` },
        { id: 'creamsoup',  name: 'Крем-суп',     eff: 0.75, vol: 300 },
        { id: 'okroshka',   name: 'Окрошка',      eff: 0.9,  vol: 300 }
      ] },
    { id: 'compote', emoji: '🍒', name: 'Компот',
      msg: (f, v, n) => `Як у бабусі! ${f}: +${n} мл.`,
      variants: [
        { id: 'compote',    name: 'Компот',       eff: 0.85, vol: 250 },
        { id: 'uzvar',      name: 'Узвар',        eff: 0.85, vol: 250 },
        { id: 'mors',       name: 'Морс',         eff: 0.85, vol: 250 },
        { id: 'kissel',     name: 'Кисіль',       eff: 0.7,  vol: 250 }
      ] },
    { id: 'sport', emoji: '🏃', name: 'Спорт',
      msg: (f, v, n) => `Електроліти на місці! ${f}: +${n} мл.`,
      variants: [
        { id: 'isotonic',    name: 'Ізотонік',              eff: 0.95, vol: 500 },
        { id: 'coconut',     name: 'Кокосова вода',         eff: 1.0,  vol: 330 },
        { id: 'electrolyte', name: 'Вода з електролітами',  eff: 1.0,  vol: 500 }
      ] },
    { id: 'sweet', emoji: '🥤', name: 'Солодке',
      msg: (f, v, n) => `Цукрова бомба! ${f}: користі всього +${n} мл.`,
      variants: [
        { id: 'soda',       name: 'Кола',            eff: 0.4,  vol: 330 },
        { id: 'lemonade',   name: 'Лимонад',         eff: 0.5,  vol: 330 },
        { id: 'kvass',      name: 'Квас',            eff: 0.6,  vol: 500 },
        { id: 'tonic',      name: 'Тонік',           eff: 0.5,  vol: 250 },
        { id: 'cocoa',      name: 'Какао',           eff: 0.7,  vol: 250, msg: (f, v, n) => `Шоколадне щастя! Але користі лише +${n} мл.` },
        { id: 'hotchoc',    name: 'Гарячий шоколад', eff: 0.6,  vol: 250 }
      ] },
    { id: 'energy', emoji: '⚡', name: 'Енергетик',
      msg: (f, v, n) => `Ой, серце калатає! ${f}: лише +${n} мл — краще випий води.`,
      variants: [
        { id: 'energy',     name: 'Звичайний', full: 'Енергетик',           eff: 0.3,  vol: 250 },
        { id: 'energyzero', name: 'Без цукру', full: 'Енергетик без цукру', eff: 0.35, vol: 250 }
      ] }
];

// Плаский довідник різновидів: id → { ...різновид, cat, full, msg }
const DRINK_BY_ID = {};
DRINK_CATEGORIES.forEach(cat => cat.variants.forEach(v => {
    DRINK_BY_ID[v.id] = { ...v, cat, full: v.full || v.name, msg: v.msg || cat.msg };
}));

// Обраний різновид (зі збереженого стану; невідомий id → звичайна вода)
function currentDrink() {
    return DRINK_BY_ID[gameState.lastDrink] || DRINK_BY_ID.water;
}

const STORAGE_KEY = 'tamagotchi_water_state_v4';
const WEATHER_TTL_MS = 30 * 60 * 1000; // погоду оновлюємо не частіше ніж раз на 30 хв

const SPRITES = {
    alive: 'img/charachter/regular_water.png',
    drinking: 'img/charachter/drink_water.png',
    sick: 'img/charachter/sick_water.png',
    dead: 'img/charachter/death_water.png'
};

const DEFAULT_STATE = {
    waterDrunk: 0,
    totalVolume: 0,
    daysSurvived: 0,
    isDead: false,
    lastCheckedDate: new Date().toDateString(),
    baseIntervalMin: 60,      // Інтервал нагадувань у звичайний час (хв), налаштовується
    lastDrinkAt: 0,           // Коли востаннє пили (мс) — від цього рахуються нагадування
    nextDrinkAt: 0,           // Коли капелька захоче пити (мс) — обчислюється з розкладу
    schedule: null,           // Активності: [{ id, type, start, end, daily, date }]
    drinkLog: null,           // Пиття за сьогодні: [{ t, n }] — для графіка
    womenMode: 'cycle',       // Жіноче здоров'я: cycle / pregnancy / breastfeeding / off
    periodStarts: [],         // Дати початку місячних (YYYY-MM-DD)
    cycleLength: 28,
    periodLength: 5,
    dueDate: '',              // Передбачувана дата пологів (YYYY-MM-DD)
    weight: 60,
    height: 170,
    age: 25,
    gender: 'male',
    lastDrink: 'water',     // Останній обраний напій
    userName: '',        // Ім'я, на яке звертається капелька
    city: 'Київ',
    calculatedGoal: 2000,
    currentTemp: 20,
    weatherCode: null,
    weatherFetchedAt: 0
};

let gameState = { ...DEFAULT_STATE };

let timerIntervalId = null;
let isAnimatingDrink = false;
let lastPetMode = '';

const $ = (id) => document.getElementById(id);

// DOM елементи вибору напою (у модальному вікні)
const drinkGrid = $('drink-grid');
const drinkVariants = $('drink-variants');
const inputCustomVolume = $('input-custom-volume');

// Лічильники та шкали
const waterCount = $('water-count');
const waterGoal = $('water-goal');
const totalVolumeCount = $('total-volume');
const daysCount = $('days-count');
const progressFill = $('progress-fill');
const totalVolumeFill = $('total-volume-fill'); // Червона шкала

// Екран персонажа
const petAvatar = $('pet-avatar');
const petStatus = $('pet-status');

// Кнопки
const btnRestart = $('btn-restart');

// Модальне вікно налаштувань
// Модальне вікно профілю
const profileModal = $('profile-modal');
const btnOpenProfile = $('btn-open-profile');
const btnCloseProfile = $('btn-close-profile');
const btnBackToProfile = $('btn-back-to-profile');
const inputName = $('input-name');
const profileBtnLabel = $('profile-btn-label');

const settingsModal = $('settings-modal');
const btnOpenSettings = $('btn-open-settings');
const btnCloseSettings = $('btn-close-settings');
const btnUpdateProfile = $('btn-update-profile');

// Поля вводу налаштувань
const inputWeight = $('input-weight');
const inputHeight = $('input-height');
const inputAge = $('input-age');
const inputGender = $('input-gender');
const inputCity = $('input-city');
const baseIntervalSelect = $('base-interval-select');

// Розклад активностей
const scheduleModal = $('schedule-modal');
const btnOpenSchedule = $('btn-open-schedule');
const btnCloseSchedule = $('btn-close-schedule');
const scheduleList = $('schedule-list');
const scheduleSummary = $('schedule-summary');
const activityGrid = $('activity-grid');
const activityCats = $('activity-cats');
const activityInfo = $('activity-info');
const inputActivityStart = $('input-activity-start');
const inputActivityEnd = $('input-activity-end');
const inputActivityRepeat = $('input-activity-repeat');
const btnAddActivity = $('btn-add-activity');
const currentActivityLabel = $('current-activity');

// Модальне вікно напою
const drinkModal = $('drink-modal');
const btnOpenDrinkModal = $('btn-open-drink-modal');
const btnCloseDrink = $('btn-close-drink');
const btnDrinkConfirm = $('btn-drink-confirm');

const petIntervalWrapper = document.querySelector('.pet-interval-wrapper');


// ==========================================
// ЗБЕРЕЖЕННЯ
// ==========================================
function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return false;
        gameState = { ...DEFAULT_STATE, ...saved };
        // Міграція: фіксований інтервал → базовий інтервал у хвилинах
        if (saved.baseIntervalMin === undefined) {
            gameState.baseIntervalMin = saved.isCustomInterval
                ? (saved.customMinutes || 60)
                : Math.round((saved.chosenInterval || 3600) / 60);
        }
        // Міграція: час останнього пиття відновлюємо зі старого таймера
        if (!gameState.lastDrinkAt) {
            gameState.lastDrinkAt = saved.nextDrinkAt
                ? Math.min(Date.now(), saved.nextDrinkAt - gameState.baseIntervalMin * 60000)
                : Date.now();
        }
        ['secondsLeft', 'chosenInterval', 'isCustomInterval', 'customMinutes'].forEach(k => delete gameState[k]);
        return true;
    } catch (e) {
        return false;
    }
}

// Хмара щойно підставила дані з іншого пристрою і перезапускає гру — нічого не зберігаємо
const cloudReloading = () => typeof Cloud !== 'undefined' && Cloud.isReloading();

function saveState() {
    if (cloudReloading()) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) { /* сховище недоступне — граємо без збереження */ }
    syncReminders();
    if (typeof Cloud !== 'undefined') Cloud.onLocalSave();
}

// Передає розклад нагадувань у застосунок Android (у браузері нічого не робить).
// Сповіщення плануються системою і приходять, навіть коли застосунок закритий.
// APK 1.6+: передаємо весь план нагадувань (за розкладом активностей і часом
// від останнього пиття). Старіші APK отримують лише найближчий час та інтервал.
let lastReminderKey = '';
function syncReminders() {
    if (!window.AndroidBridge) return;
    const goalMet = gameState.waterDrunk >= gameState.calculatedGoal;
    const key = [gameState.lastDrinkAt, JSON.stringify(scheduleEntries()), baseIntervalMin(),
        gameState.isDead, goalMet, gameState.userName, dateKey(new Date())].join('|');
    if (key === lastReminderKey) return;
    lastReminderKey = key;
    try {
        if (window.AndroidBridge.syncPlan) {
            window.AndroidBridge.syncPlan(JSON.stringify({
                reminders: gameState.isDead ? [] : buildReminderPlan(),
                fallbackSec: baseIntervalMin() * 60,
                eveningAt: goalMet || gameState.isDead ? 0 : eveningWarningAt(),
                eveningText: addressed(fillLine(notifLineAt('evening', 0))),
                isDead: gameState.isDead
            }));
        } else {
            window.AndroidBridge.sync(gameState.nextDrinkAt, getIntervalSeconds(), gameState.isDead, goalMet);
        }
    } catch (e) { /* міст недоступний */ }
}

// ==========================================
// ІГРОВА ЛОГІКА
// ==========================================
function initGame() {
    // Попереднє завантаження спрайтів, щоб не було блимання при зміні стану
    Object.values(SPRITES).forEach(src => { new Image().src = src; });

    if (loadState()) {
        inputWeight.value = gameState.weight;
        inputHeight.value = gameState.height;
        inputAge.value = gameState.age;
        inputGender.value = gameState.gender;
        inputName.value = gameState.userName || '';
        inputCity.value = gameState.city;
    } else {
        gameState.lastDrinkAt = Date.now();
    }
    // Новим гравцям і тим, хто оновився, — типовий сон 23:00–07:00, щоб не будити вночі
    if (!Array.isArray(gameState.schedule)) gameState.schedule = DEFAULT_SCHEDULE.map(e => ({ ...e }));
    // Міграція: старі збереження без журналу пиття — один запис на весь випитий об'єм
    if (!Array.isArray(gameState.drinkLog)) {
        gameState.drinkLog = gameState.waterDrunk > 0
            ? [{ t: Math.max(startOfDay(Date.now()), Math.min(gameState.lastDrinkAt || Date.now(), Date.now())), n: gameState.waterDrunk }]
            : [];
    }
    purgeOldScheduleEntries();
    syncBaseIntervalSelect();
    syncWomenInputs();
    refreshDue();
    recalculateWaterGoal();

    // Миттєво показуємо збережену погоду, не чекаючи мережі
    if (typeof applyCachedWeather === 'function') applyCachedWeather();

    updateProfileLabel();
    checkNewDay();
    syncReminders();
    safeFetchWeather(false);
    startTimer();
    updateUI();

    // Акаунт: підтягуємо новішу копію з іншого пристрою або відправляємо свою
    if (typeof Cloud !== 'undefined') {
        Cloud.initUI();
        Cloud.sync();
    }
}

// Список інтервалів у налаштуваннях; нестандартне значення (зі старого «Свій...») додаємо
function syncBaseIntervalSelect() {
    const v = String(baseIntervalMin());
    if (![...baseIntervalSelect.options].some(o => o.value === v)) {
        baseIntervalSelect.add(new Option(`${v} хв`, v));
    }
    baseIntervalSelect.value = v;
}

// Перерахувати, коли капелька захоче пити (розклад + час від останнього пиття)
function refreshDue() {
    gameState.nextDrinkAt = computeDueAt();
}

function safeFetchWeather(force) {
    if (typeof fetchWeatherAndRecalculate === 'function') {
        fetchWeatherAndRecalculate(force);
    } else {
        recalculateWaterGoal();
    }
}

function recalculateWaterGoal() {
    let baseVolume = gameState.gender === 'male' ? gameState.weight * 35 : gameState.weight * 31;
    if (gameState.age < 30) baseVolume += 150;
    if (gameState.age > 55) baseVolume -= 200;
    if (gameState.height > 180) baseVolume += 200;

    if (gameState.currentTemp >= 30) baseVolume += 750;
    else if (gameState.currentTemp >= 25) baseVolume += 500;
    else if (gameState.currentTemp <= 5) baseVolume -= 150;

    // Активності з розкладу на сьогодні (спорт, спека, сауна…)
    baseVolume += activitiesExtraMl();

    // Цикл, вагітність, годування груддю (лише для жіночої статі)
    baseVolume += womenAdjustment().ml;

    gameState.calculatedGoal = Math.max(1000, Math.round(baseVolume / 50) * 50);
    saveState();
    updateUI();
}

function checkNewDay() {
    if (gameState.isDead) return;
    const todayStr = new Date().toDateString();
    if (gameState.lastCheckedDate !== todayStr) {
        if (gameState.waterDrunk < gameState.calculatedGoal) {
            triggerDeath();
        } else {
            gameState.daysSurvived++;
            gameState.waterDrunk = 0;
            gameState.totalVolume = 0;
            gameState.lastCheckedDate = todayStr;
            gameState.drinkLog = [];
            // Новий день — нові активності «лише сьогодні» і нова норма
            purgeOldScheduleEntries();
            recalculateWaterGoal();
        }
        updateUI();
    }
}

// Інтервал нагадувань зараз (с) — для старих APK, що вміють лише фіксований інтервал
function getIntervalSeconds() {
    const o = currentActivity();
    return (intervalFor(o && o.act) || baseIntervalMin()) * 60;
}

function getSecondsLeft() {
    return Math.ceil((gameState.nextDrinkAt - Date.now()) / 1000);
}

let lastTickMinute = 0;
function tick() {
    if (gameState.isDead) { stopTimer(); return; }
    checkNewDay();
    // Раз на хвилину: активність могла змінитися (почався біг, настав сон)
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== lastTickMinute) {
        lastTickMinute = minute;
        refreshDue();
        updateUI();  // рівень «образи» капельки росте з часом
    }
    renderTimer();
}

function startTimer() {
    stopTimer();
    if (gameState.isDead || document.hidden) return;
    tick();
    timerIntervalId = setInterval(tick, 1000);
}

function stopTimer() {
    if (timerIntervalId) clearInterval(timerIntervalId);
    timerIntervalId = null;
}

// Людина щойно попила — відлік нагадувань починається заново
function resetTimer() {
    consumeShownReminders();  // показані сповіщення більше не повторюватимуться сьогодні
    gameState.lastDrinkAt = Date.now();
    refreshDue();
    saveState();
}

function drinkWater() {
    if (gameState.isDead || isAnimatingDrink) return false;

    const drink = currentDrink();
    const inputVolValue = parseInt(inputCustomVolume.value, 10);

    if (isNaN(inputVolValue) || inputVolValue <= 0) {
        alert("Введіть коректну кількість мілілітрів!");
        return false;
    }

    const netHydration = Math.round(inputVolValue * drink.eff);
    // На скільки хвилин запізнились із питтям (для реплік полегшення)
    const lateMin = (Date.now() - gameState.nextDrinkAt) / 60000;

    gameState.waterDrunk += netHydration;
    gameState.totalVolume += inputVolValue;
    logDrink(netHydration);

    resetTimer();

    isAnimatingDrink = true;
    setPetMode('drinking');

    const name = gameState.userName;
    const text = drink.msg(drink.full, inputVolValue, netHydration);
    if (lateMin >= 30 && !gentleMode()) {
        // Довго не пили — капелька з полегшенням (і докором)
        petStatus.textContent = `${fillLine(pickStatusLine('relief'))} +${netHydration} мл`;
    } else {
        // Для води — подяка на ім'я, для решти — звертання на початку
        petStatus.textContent = drink.id === 'water' && name
            ? text.replace('! ', `! Дякую, ${name}! `)
            : addressed(text);
    }
    currentLine = null;  // після пиття — свіжа репліка

    setTimeout(() => {
        isAnimatingDrink = false;
        updateUI();
    }, 1500);
    updateUI();
    return true;
}

function triggerDeath() {
    gameState.isDead = true;
    stopTimer();
    saveState();
    updateUI();
}

function restartGame() {
    gameState.isDead = false;
    gameState.waterDrunk = 0;
    gameState.totalVolume = 0;
    gameState.daysSurvived = 0;
    gameState.drinkLog = [];
    gameState.lastCheckedDate = new Date().toDateString();
    resetTimer();
    safeFetchWeather(false);
    startTimer();
    updateUI();
}

// ==========================================
// ВІДОБРАЖЕННЯ
// ==========================================

// Змінює спрайт і клас персонажа лише тоді, коли стан справді змінився
function setPetMode(mode) {
    if (lastPetMode === mode) return;
    lastPetMode = mode;
    petAvatar.src = SPRITES[mode];
    petAvatar.className = `pet ${mode}`;
}

// Щосекундна перевірка: чи не час капельці «захворіти» від спраги
function renderTimer() {
    const wantSick = getSecondsLeft() < 0;
    if (!isAnimatingDrink && !gameState.isDead && wantSick !== (lastPetMode === 'sick')) {
        updateUI();
    }
}

// Звертання на ім'я: "Мені зле!" → "Дмитро, мені зле!"
function addressed(text) {
    const name = gameState.userName;
    if (!name) return text;
    return `${name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

// Кнопка профілю показує ім'я, якщо воно є
function updateProfileLabel() {
    profileBtnLabel.textContent = gameState.userName || 'Профіль';
    renderAvatar();
}

function updateUI() {
    waterCount.textContent = gameState.waterDrunk;
    waterGoal.textContent = gameState.calculatedGoal;
    totalVolumeCount.textContent = gameState.totalVolume;
    daysCount.textContent = gameState.daysSurvived;

    // 1. СИНЯ шкала (Гідратація) — scaleX працює на GPU без перерахунку макета
    const waterPercent = Math.min(gameState.waterDrunk / gameState.calculatedGoal, 1);
    progressFill.style.transform = `scaleX(${waterPercent})`;

    // 2. ЧЕРВОНА шкала (Загалом випито)
    const totalPercent = Math.min(gameState.totalVolume / gameState.calculatedGoal, 1);
    totalVolumeFill.style.transform = `scaleX(${totalPercent})`;

    const secondsLeft = getSecondsLeft();

    renderDayCard();
    renderCurrentActivity();

    // Якщо зараз іде анімація пиття — не переписуємо статус і спрайт
    if (isAnimatingDrink) return;

    const isDead = gameState.isDead;
    btnOpenDrinkModal.classList.toggle('hidden', isDead);
    petIntervalWrapper.classList.toggle('hidden', isDead);
    btnRestart.classList.toggle('hidden', !isDead);

    if (isDead) {
        setPetMode('dead');
    } else if (secondsLeft < 0) {
        setPetMode('sick');
    } else {
        setPetMode('alive');
    }
    showStatusLine(statusPool(secondsLeft));
}

// Який пул реплік зараз доречний
function statusPool(secondsLeft) {
    if (gameState.isDead) return 'dead';
    if (secondsLeft < 0) {
        const lateMin = -secondsLeft / 60;
        const level = lateMin < 30 ? 'over1' : lateMin < 90 ? 'over2' : lateMin < 180 ? 'over3' : 'over4';
        // Вагітність і місячні: без жартів про «вбивство», максимум легкий сарказм
        return gentleMode() && (level === 'over3' || level === 'over4') ? 'over2' : level;
    }
    const act = currentActivity();
    if (act && act.act.id === 'sleep') return 'sleep';
    const mode = womenMode();
    if (mode === 'pregnancy' && gameState.waterDrunk < gameState.calculatedGoal) return 'pregnant';
    if (gentleMode() && gameState.waterDrunk < gameState.calculatedGoal) return 'period';
    if (gameState.waterDrunk === 0) return 'greeting';
    return gameState.waterDrunk >= gameState.calculatedGoal ? 'goal' : 'ok';
}

// Репліка змінюється, коли змінився стан, або раз на 15 хв (без повторів за день)
let currentLine = null;
function showStatusLine(pool) {
    const now = Date.now();
    if (!currentLine || currentLine.pool !== pool || now - currentLine.at > 15 * 60000) {
        currentLine = { pool, at: now, text: pickStatusLine(pool) };
        saveUsedLines();
    }
    petStatus.textContent = fillLine(currentLine.text);
}

// Зберігаємо список показаних реплік, не чіпаючи нагадування
function saveUsedLines() {
    if (cloudReloading()) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); } catch (e) { /* ignore */ }
}

// ==========================================
// ОБРОБНИКИ ПОДІЙ
// ==========================================

// Базовий інтервал нагадувань (у налаштуваннях)
baseIntervalSelect.addEventListener('change', () => {
    gameState.baseIntervalMin = parseInt(baseIntervalSelect.value, 10) || 60;
    refreshDue();
    saveState();
    updateUI();
});

function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

btnOpenProfile.addEventListener('click', () => openModal(profileModal));
btnCloseProfile.addEventListener('click', () => closeModal(profileModal));

// Профіль → Налаштування і назад
btnOpenSettings.addEventListener('click', () => { closeModal(profileModal); openModal(settingsModal); });
btnBackToProfile.addEventListener('click', () => { closeModal(settingsModal); openModal(profileModal); });
btnCloseSettings.addEventListener('click', () => closeModal(settingsModal));


// Вибір напою у два кроки: категорія (плитки) → різновид (кнопки під плитками)
function renderDrinkGrid() {
    drinkGrid.innerHTML = DRINK_CATEGORIES.map(c =>
        `<button type="button" class="drink-tile" role="radio" data-cat="${c.id}">` +
        `<span class="drink-emoji">${c.emoji}</span>` +
        `<span class="drink-name">${c.name}</span></button>`
    ).join('');
    updateDrinkSelection();
}

function updateDrinkSelection() {
    if (!DRINK_BY_ID[gameState.lastDrink]) gameState.lastDrink = 'water';
    const drink = currentDrink();

    drinkGrid.querySelectorAll('.drink-tile').forEach(tile => {
        const on = tile.dataset.cat === drink.cat.id;
        tile.classList.toggle('selected', on);
        tile.setAttribute('aria-checked', on);
    });

    drinkVariants.innerHTML = drink.cat.variants.map(v =>
        `<button type="button" class="drink-chip${v.id === drink.id ? ' selected' : ''}" role="radio" ` +
        `aria-checked="${v.id === drink.id}" data-drink="${v.id}">${v.name} ` +
        `<span class="drink-eff">${Math.round(v.eff * 100)}%</span></button>`
    ).join('');
}

// Обрати різновид і підставити його типовий об'єм
function selectDrink(id) {
    gameState.lastDrink = id;
    inputCustomVolume.value = DRINK_BY_ID[id].vol;
    updateDrinkSelection();
}

drinkGrid.addEventListener('click', (e) => {
    const tile = e.target.closest('.drink-tile');
    if (!tile) return;
    const cat = DRINK_CATEGORIES.find(c => c.id === tile.dataset.cat);
    // Та сама категорія — лишаємо обраний різновид, інша — перший різновид
    if (currentDrink().cat !== cat) selectDrink(cat.variants[0].id);
});

drinkVariants.addEventListener('click', (e) => {
    const chip = e.target.closest('.drink-chip');
    if (chip) selectDrink(chip.dataset.drink);
});
renderDrinkGrid();

btnOpenDrinkModal.addEventListener('click', () => {
    if (gameState.isDead) return;
    selectDrink(currentDrink().id);
    openModal(drinkModal);
});
btnCloseDrink.addEventListener('click', () => closeModal(drinkModal));

btnDrinkConfirm.addEventListener('click', () => {
    if (drinkWater()) closeModal(drinkModal);
});

// Закриття будь-якого модального вікна при натисканні на темний фон навколо
[profileModal, settingsModal, scheduleModal, drinkModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// Кнопка "Назад" на Android / Escape — закриває відкрите вікно
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(profileModal);
        closeModal(settingsModal);
        closeModal(scheduleModal);
        closeModal(drinkModal);
    }
});

// Кнопка збереження профілю та нових таймерів
btnUpdateProfile.addEventListener('click', () => {
    gameState.userName = inputName.value.trim().slice(0, 20);
    inputName.value = gameState.userName;
    gameState.weight = parseFloat(inputWeight.value) || 60;
    gameState.height = parseFloat(inputHeight.value) || 170;
    gameState.age = parseInt(inputAge.value, 10) || 25;
    gameState.gender = inputGender.value;
    readWomenInputs();
    gameState.city = inputCity.value.trim() || "Київ";

    saveState();
    updateProfileLabel();
    updateUI();
    safeFetchWeather(true);
    closeModal(profileModal);
});

btnRestart.addEventListener('click', restartGame);

// Налаштування сповіщень — лише в застосунку Android (APK 1.5+)
const NOTIF_CHECKS = [
    { key: 'notifications', ok: 'Сповіщення дозволені', bad: 'Сповіщення вимкнені', fix: 'Дозволити' },
    { key: 'exact', ok: 'Нагадування приходять вчасно', bad: 'Нагадування можуть запізнюватись', fix: 'Дозволити' },
    { key: 'battery', ok: 'Батарея не обмежує гру', bad: 'Економія батареї може блокувати нагадування', fix: 'Налаштувати' }
];

function renderNotifSettings() {
    if (!window.AndroidBridge || !AndroidBridge.getNotificationStatus) return;
    let st = {};
    try { st = JSON.parse(AndroidBridge.getNotificationStatus()); } catch (e) { return; }

    const rows = NOTIF_CHECKS.map(c => {
        const good = !!st[c.key];
        return `<li class="${good ? 'ok' : 'bad'}"><span>${good ? '✅' : '⚠️'} ${good ? c.ok : c.bad}</span>` +
            (good ? '' : `<button type="button" class="btn-link" data-open="${c.key}">${c.fix}</button>`) + '</li>';
    });
    if (st.xiaomi) {
        rows.push(`<li class="${st.autostartConfirmed ? 'ok' : 'bad'}"><span>${st.autostartConfirmed ? '☑️' : '⚠️'} Автозапуск (Xiaomi)</span>` +
            `<button type="button" class="btn-link" data-open="autostart">Відкрити</button></li>`);
    }
    $('notif-status').innerHTML = rows.join('');
    $('notif-xiaomi-hint').classList.toggle('hidden', !st.xiaomi);
    $('notif-settings').classList.remove('hidden');
}

if (window.AndroidBridge && AndroidBridge.getNotificationStatus) {
    $('notif-status').addEventListener('click', (e) => {
        const what = e.target.getAttribute && e.target.getAttribute('data-open');
        if (what) AndroidBridge.openNotificationSetting(what);
    });
    btnOpenSettings.addEventListener('click', renderNotifSettings);
    // Повернулися з системних налаштувань — оновлюємо стан
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !settingsModal.classList.contains('hidden')) renderNotifSettings();
    });
}

// Версія та кнопка оновлення — лише в застосунку Android
if (window.AndroidBridge && AndroidBridge.checkForUpdates) {
    try { $('app-version').textContent = AndroidBridge.getVersion(); } catch (e) { /* ignore */ }
    $('app-update').classList.remove('hidden');
    $('btn-check-update').addEventListener('click', () => AndroidBridge.checkForUpdates());
}

// ==========================================
// ВІКНО РОЗКЛАДУ: календар місяця + обраний день + додавання активностей
// ==========================================
let selectedActivity = 'run';
let selectedCategory = 'sport';
let selectedDay = new Date();      // обраний у календарі день
let calMonth = null;               // перше число місяця, що показується
const UA_MONTHS_NOM = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

function isCycleMode() {
    return womenMode() === 'cycle';
}

function activityHint(act) {
    const iv = intervalFor(act);
    const remind = iv === null ? 'нагадувань немає' : `нагадування кожні ${iv} хв`;
    return `${act.emoji} ${act.name}: ${act.ml ? `+${act.ml} мл/год до норми` : 'норма не змінюється'}, ${remind}.`;
}

// ---------- Календар ----------

function renderScheduleCalendar() {
    if (!calMonth) calMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
    $('cal-month').textContent = `${UA_MONTHS_NOM[calMonth.getMonth()]} ${calMonth.getFullYear()}`;

    const cycle = isCycleMode();
    const todayKey = dateKey(new Date());
    const selKey = dateKey(selectedDay);
    const starts = new Set(periodStarts());
    const offset = (calMonth.getDay() + 6) % 7;  // тиждень з понеділка
    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();

    let html = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => `<div class="cal-head">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
        const key = dateKey(date);
        const cls = ['cal-day'];
        let label = `${d}`;
        if (cycle) {
            const info = cycleInfo(date);
            if (info) {
                cls.push(`ph-${info.phase}`);
                if (info.predicted) cls.push('predicted');
                label += `: ${PHASES[info.phase].name}${info.predicted ? ' (прогноз)' : ''}`;
            }
            if (starts.has(key)) cls.push('start');
        }
        // Крапка — разові активності саме на цей день (щоденні були б на кожному дні)
        const planned = scheduleEntries().some(e => entryRepeat(e) === 'once' && e.date === key);
        if (planned) { cls.push('has-plan'); label += ', є активності'; }
        if (key === todayKey) cls.push('today');
        if (key === selKey) cls.push('selected');
        html += `<button type="button" class="${cls.join(' ')}" data-date="${key}" aria-label="${label}">${d}</button>`;
    }
    $('cal-grid').innerHTML = html;
    document.querySelectorAll('#schedule-modal .cycle-only').forEach(el => {
        if (el.id !== 'btn-mark-period') el.classList.toggle('hidden', !cycle);
    });
}

// ---------- Обраний день ----------

function entriesForDay(day) {
    return scheduleEntries()
        .filter(e => entryAppliesOn(e, day))
        .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
}

function renderDayPanel() {
    const day = selectedDay;
    const isToday = dateKey(day) === dateKey(new Date());
    $('day-title').textContent = `${UA_WEEKDAYS[day.getDay()]}, ${day.getDate()} ${UA_MONTHS_GEN[day.getMonth()]}${isToday ? ' · сьогодні' : ''}`;

    const cur = isToday ? currentActivity() : null;
    const entries = entriesForDay(day);
    scheduleList.innerHTML = entries.length ? entries.map(e => {
        const act = ACTIVITY_BY_ID[e.type];
        if (!act) return '';
        const isNow = cur && cur.entry.id === e.id;
        const iv = intervalFor(act);
        const meta = [act.ml ? `+${act.ml} мл/год` : null,
            iv === null ? 'без нагадувань' : `кожні ${iv} хв`,
            REPEAT_LABELS[entryRepeat(e)]].filter(Boolean).join(' · ');
        return `<li class="schedule-item${isNow ? ' now' : ''}">` +
            `<span class="schedule-emoji">${act.emoji}</span>` +
            `<span class="schedule-text"><b>${act.name}</b> ${e.start}–${e.end}${isNow ? ' <span class="schedule-now">зараз</span>' : ''}` +
            `<br><small>${meta}</small></span>` +
            `<button type="button" class="schedule-del" data-del="${e.id}" aria-label="Видалити${entryRepeat(e) !== 'once' ? ' (з усіх днів)' : ''}">✕</button></li>`;
    }).join('') : '<li class="schedule-empty">На цей день нічого не заплановано.</li>';

    // Підсумок: на скільки активності збільшать норму в цей день
    const extra = activitiesExtraMl(day.getTime());
    let summary = `Активності ${isToday ? 'сьогодні додають' : 'додадуть'} ${extra ? `+${extra} мл` : '0 мл'} до норми.`;
    if (isToday) {
        summary += ` Норма: ${gameState.calculatedGoal} мл. Наступне нагадування — о ${formatHM(Math.max(gameState.nextDrinkAt, Date.now()))}.`;
    }
    if (isCycleMode()) {
        const info = cycleInfo(day);
        if (info) summary += ` ${PHASES[info.phase].emoji} ${info.day}-й день циклу (${PHASES[info.phase].name.toLowerCase()}${info.predicted ? ', прогноз' : ''}).`;
    }
    scheduleSummary.textContent = summary;

    // Кнопка позначки місячних для обраного дня (лише в режимі циклу і не в майбутньому)
    const markBtn = $('btn-mark-period');
    const canMark = isCycleMode() && dateKey(day) <= dateKey(new Date());
    markBtn.classList.toggle('hidden', !canMark);
    if (canMark) {
        markBtn.textContent = periodStarts().includes(dateKey(day))
            ? '✖️ Зняти позначку початку місячних' : '🩸 Позначити початок місячних цього дня';
    }
}

// ---------- Додавання активностей ----------

function renderActivityPicker() {
    activityCats.innerHTML = ACTIVITY_CATEGORIES.map(c =>
        `<button type="button" class="drink-tile${c.id === selectedCategory ? ' selected' : ''}" role="tab" ` +
        `aria-selected="${c.id === selectedCategory}" data-cat="${c.id}">` +
        `<span class="drink-emoji">${c.emoji}</span><span class="drink-name">${c.short || c.name}</span></button>`
    ).join('');
    const cat = ACTIVITY_CATEGORIES.find(c => c.id === selectedCategory);
    activityGrid.innerHTML = cat.items.map(id => {
        const a = ACTIVITY_BY_ID[id];
        return `<button type="button" class="drink-chip${id === selectedActivity ? ' selected' : ''}" role="radio" ` +
            `aria-checked="${id === selectedActivity}" data-activity="${id}">${a.emoji} ${a.short || a.name}</button>`;
    }).join('');
    activityInfo.textContent = activityHint(ACTIVITY_BY_ID[selectedActivity]);
}

// Пропонуємо найближчу «круглу» годину як початок
function suggestTimes() {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    inputActivityStart.value = formatHM(d.getTime());
    inputActivityEnd.value = formatHM(d.getTime() + 60 * MIN_MS);
}

function renderSchedule() {
    renderScheduleCalendar();
    renderDayPanel();
}

function openSchedule() {
    selectedDay = new Date();
    calMonth = null;
    renderSchedule();
    renderActivityPicker();
    suggestTimes();
    openModal(scheduleModal);
}

// Розклад змінився: оновити норму, таймер, нагадування і вікно
function scheduleChanged() {
    refreshDue();
    recalculateWaterGoal();   // зберігає стан і синхронізує нагадування
    renderSchedule();
    renderCurrentActivity();
}

// ---------- Події ----------

$('cal-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-date]');
    if (!btn) return;
    selectedDay = keyToDate(btn.dataset.date);
    renderSchedule();
});

$('btn-cal-prev').addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    renderScheduleCalendar();
});
$('btn-cal-next').addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    renderScheduleCalendar();
});

$('btn-mark-period').addEventListener('click', () => {
    togglePeriodStart(dateKey(selectedDay));
    recalculateWaterGoal();  // фаза могла змінитися — оновлюємо норму й зберігаємо
    renderSchedule();
});

activityCats.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-cat]');
    if (!tile) return;
    selectedCategory = tile.dataset.cat;
    const cat = ACTIVITY_CATEGORIES.find(c => c.id === selectedCategory);
    if (!cat.items.includes(selectedActivity)) selectedActivity = cat.items[0];
    renderActivityPicker();
});

activityGrid.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-activity]');
    if (!chip) return;
    selectedActivity = chip.dataset.activity;
    renderActivityPicker();
});

btnAddActivity.addEventListener('click', () => {
    const start = inputActivityStart.value, end = inputActivityEnd.value;
    if (!start || !end || start === end) {
        alert('Вкажіть час початку й кінця активності.');
        return;
    }
    const repeat = inputActivityRepeat.value;
    const entry = { id: `a${Date.now()}`, type: selectedActivity, start, end, repeat };
    if (repeat === 'once') entry.date = dateKey(selectedDay);
    gameState.schedule = scheduleEntries().concat(entry);
    scheduleChanged();
});

scheduleList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    gameState.schedule = scheduleEntries().filter(x => x.id !== btn.dataset.del);
    scheduleChanged();
});

btnOpenSchedule.addEventListener('click', openSchedule);
btnCloseSchedule.addEventListener('click', () => closeModal(scheduleModal));

// Підпис під таймером: що зараз за активність
function renderCurrentActivity() {
    const o = currentActivity();
    if (!o || gameState.isDead) {
        currentActivityLabel.classList.add('hidden');
        return;
    }
    currentActivityLabel.textContent = `${o.act.emoji} ${o.act.short || o.act.name} до ${formatHM(o.e)}`;
    currentActivityLabel.classList.remove('hidden');
}

// ==========================================
// ЖІНОЧЕ ЗДОРОВ'Я: профіль і календар циклу
// ==========================================
const womenSection = $('women-section');
const inputWomenMode = $('input-women-mode');
const inputCycleLength = $('input-cycle-length');
const inputPeriodLength = $('input-period-length');
const inputDueDate = $('input-due-date');

// Показати потрібні поля залежно від статі та режиму (ще до збереження)
function updateWomenSectionVisibility() {
    const female = inputGender.value === 'female';
    womenSection.classList.toggle('hidden', !female);
    $('women-cycle').classList.toggle('hidden', inputWomenMode.value !== 'cycle');
    $('women-pregnancy').classList.toggle('hidden', inputWomenMode.value !== 'pregnancy');
    renderWomenEffect();
}

// Пояснення, як режим впливає на норму й нагадування
function renderWomenEffect() {
    const text = {
        cycle: `У дні місячних норма +${WOMEN_EXTRA.period} мл і нагадування частіше, у лютеїновій фазі +${WOMEN_EXTRA.luteal} мл.`,
        pregnancy: `Норма +${WOMEN_EXTRA.pregnancy} мл на день, нагадування щонайменше кожні ${WOMEN_INTERVAL_CAP.pregnancy} хв.`,
        breastfeeding: `Норма +${WOMEN_EXTRA.breastfeeding} мл на день, нагадування щонайменше кожні ${WOMEN_INTERVAL_CAP.breastfeeding} хв.`,
        off: 'Норма рахується лише за вагою, віком, погодою та активностями.'
    };
    $('women-effect').textContent = text[inputWomenMode.value] || '';
}

function syncWomenInputs() {
    inputWomenMode.value = gameState.womenMode || 'cycle';
    inputCycleLength.value = gameState.cycleLength || 28;
    inputPeriodLength.value = gameState.periodLength || 5;
    inputDueDate.value = gameState.dueDate || '';
    updateWomenSectionVisibility();
}

function readWomenInputs() {
    gameState.womenMode = inputWomenMode.value;
    gameState.cycleLength = Math.min(45, Math.max(20, parseInt(inputCycleLength.value, 10) || 28));
    gameState.periodLength = Math.min(10, Math.max(2, parseInt(inputPeriodLength.value, 10) || 5));
    gameState.dueDate = inputDueDate.value || '';
    recalculateWaterGoal();
}

inputGender.addEventListener('change', updateWomenSectionVisibility);
inputWomenMode.addEventListener('change', updateWomenSectionVisibility);

// Календар циклу — це той самий календар розкладу
$('btn-open-cycle').addEventListener('click', () => {
    // Тривалості з полів застосовуємо одразу, щоб прогноз у календарі був актуальний
    gameState.cycleLength = Math.min(45, Math.max(20, parseInt(inputCycleLength.value, 10) || 28));
    gameState.periodLength = Math.min(10, Math.max(2, parseInt(inputPeriodLength.value, 10) || 5));
    gameState.womenMode = inputWomenMode.value;
    closeModal(profileModal);
    openSchedule();
});

// Підпис у картці дня: день циклу / тиждень вагітності
function renderWomenChip() {
    const chip = $('women-chip');
    const text = womenChipText();
    chip.textContent = text;
    chip.classList.toggle('hidden', !text);
}

// Зупиняємо таймер, коли застосунок у фоні (економія батареї),
// і одразу перераховуємо все при поверненні
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
        saveState();
        if (typeof Cloud !== 'undefined') Cloud.flush();
    } else {
        checkNewDay();
        startTimer();
        updateUI();
        safeFetchWeather(false);
        if (typeof Cloud !== 'undefined') Cloud.sync();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Офлайн-кеш для веб-версії (у APK не потрібен — файли вже всередині)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
