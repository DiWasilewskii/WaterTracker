const DRINK_EFFICIENCY = {
    water: 1.0,
    tea: 0.9,
    coffee: 0.5,
    soda: 0.4
};

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
    chosenInterval: 3600,
    isCustomInterval: false,  // Чи увімкнено кастомний інтервал
    customMinutes: 60,        // Значення кастомного інтервалу
    nextDrinkAt: 0,           // Мітка часу (мс), коли треба пити наступного разу
    weight: 60,
    height: 170,
    age: 25,
    gender: 'male',
    city: 'Київ',
    calculatedGoal: 2000,
    currentTemp: 20,
    weatherCode: null,
    weatherFetchedAt: 0
};

let gameState = { ...DEFAULT_STATE };

let timerIntervalId = null;
let isAnimatingDrink = false;
let lastRenderedTimer = '';
let lastPetMode = '';

const $ = (id) => document.getElementById(id);

// DOM елементи вибору напою (у модальному вікні)
const selectDrink = $('select-drink');
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
const countdownTimer = $('countdown-timer');

// Кнопки
const btnRestart = $('btn-restart');

// Модальне вікно налаштувань
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
const intervalSelect = $('interval-select');
const inputCustomMinutes = $('input-custom-minutes');
const customIntervalWrapper = $('custom-interval-wrapper');

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
        // Міграція зі старого формату (secondsLeft зберігався кожну секунду)
        if (!gameState.nextDrinkAt) {
            const left = typeof saved.secondsLeft === 'number' ? saved.secondsLeft : getIntervalSeconds();
            gameState.nextDrinkAt = Date.now() + left * 1000;
        }
        delete gameState.secondsLeft;
        return true;
    } catch (e) {
        return false;
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) { /* сховище недоступне — граємо без збереження */ }
    syncReminders();
}

// Передає розклад нагадувань у застосунок Android (у браузері нічого не робить).
// Сповіщення плануються системою і приходять, навіть коли застосунок закритий.
let lastReminderKey = '';
function syncReminders() {
    if (!window.AndroidBridge) return;
    const goalMet = gameState.waterDrunk >= gameState.calculatedGoal;
    const key = [gameState.nextDrinkAt, getIntervalSeconds(), gameState.isDead, goalMet].join('|');
    if (key === lastReminderKey) return;
    lastReminderKey = key;
    try {
        window.AndroidBridge.sync(gameState.nextDrinkAt, getIntervalSeconds(), gameState.isDead, goalMet);
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
        inputCity.value = gameState.city;
        inputCustomMinutes.value = gameState.customMinutes || 60;
        syncIntervalSelect();
    } else {
        resetTimer();
        recalculateWaterGoal();
    }

    // Миттєво показуємо збережену погоду, не чекаючи мережі
    if (typeof applyCachedWeather === 'function') applyCachedWeather();

    checkNewDay();
    syncReminders();
    safeFetchWeather(false);
    startTimer();
    updateUI();
}

function syncIntervalSelect() {
    if (gameState.isCustomInterval) {
        intervalSelect.value = 'custom';
        customIntervalWrapper.classList.remove('hidden');
    } else {
        intervalSelect.value = gameState.chosenInterval;
        customIntervalWrapper.classList.add('hidden');
    }
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
            resetTimer();
        }
        updateUI();
    }
}

function getIntervalSeconds() {
    return gameState.isCustomInterval ? gameState.customMinutes * 60 : gameState.chosenInterval;
}

function getSecondsLeft() {
    return Math.ceil((gameState.nextDrinkAt - Date.now()) / 1000);
}

function tick() {
    if (gameState.isDead) { stopTimer(); return; }
    checkNewDay();
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

function resetTimer() {
    gameState.nextDrinkAt = Date.now() + getIntervalSeconds() * 1000;
    saveState();
}

function drinkWater() {
    if (gameState.isDead || isAnimatingDrink) return false;

    const selectedDrinkType = selectDrink.value;
    const inputVolValue = parseInt(inputCustomVolume.value, 10);

    if (isNaN(inputVolValue) || inputVolValue <= 0) {
        alert("Введіть коректну кількість мілілітрів!");
        return false;
    }

    const efficiency = DRINK_EFFICIENCY[selectedDrinkType] || 1.0;
    const netHydration = Math.round(inputVolValue * efficiency);

    gameState.waterDrunk += netHydration;
    gameState.totalVolume += inputVolValue;

    resetTimer();

    isAnimatingDrink = true;
    setPetMode('drinking');

    const messages = {
        water: `Глип-глип! +${netHydration} мл чистого здоров'я!`,
        coffee: `Кава! Залито ${inputVolValue} мл, користі на +${netHydration} мл!`,
        tea: `Чайочок! Корисної рідини додано: +${netHydration} мл.`,
        soda: `Цукрова бомба! Користі всього +${netHydration} мл!`
    };
    petStatus.textContent = messages[selectedDrinkType] || messages.water;

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
    gameState.lastCheckedDate = new Date().toDateString();
    resetTimer();
    safeFetchWeather(false);
    startTimer();
    updateUI();
}

function formatTime(seconds) {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hrs = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    const padded = [hrs, mins, secs].map(v => v < 10 ? '0' + v : v).join(':');
    return isNegative ? `-${padded}` : padded;
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

// Щосекундне оновлення: тільки текст таймера та перехід у стан "хворий"
function renderTimer() {
    const secondsLeft = getSecondsLeft();
    const text = formatTime(secondsLeft);
    if (text !== lastRenderedTimer) {
        countdownTimer.textContent = text;
        lastRenderedTimer = text;
    }
    const wantSick = secondsLeft < 0;
    if (!isAnimatingDrink && !gameState.isDead && wantSick !== (lastPetMode === 'sick')) {
        updateUI();
    }
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
    lastRenderedTimer = formatTime(secondsLeft);
    countdownTimer.textContent = lastRenderedTimer;

    // Якщо зараз іде анімація пиття — не переписуємо статус і спрайт
    if (isAnimatingDrink) return;

    const isDead = gameState.isDead;
    countdownTimer.classList.toggle('hidden', isDead);
    btnOpenDrinkModal.classList.toggle('hidden', isDead);
    petIntervalWrapper.classList.toggle('hidden', isDead);
    btnRestart.classList.toggle('hidden', !isDead);

    if (isDead) {
        setPetMode('dead');
        petStatus.textContent = `Помер від спраги на ${gameState.daysSurvived} день...`;
    } else if (secondsLeft < 0) {
        setPetMode('sick');
        petStatus.textContent = "Мені зле! Швидше дай попити!";
        countdownTimer.classList.add('overdue');
    } else {
        setPetMode('alive');
        countdownTimer.classList.remove('overdue');

        if (gameState.waterDrunk === 0) {
            petStatus.textContent = `Ціль на сьогодні — ${gameState.calculatedGoal} мл корисного зволоження!`;
        } else if (gameState.waterDrunk < gameState.calculatedGoal) {
            petStatus.textContent = "Продовжуй у тому ж дусі, політ нормальний!";
        } else {
            petStatus.textContent = "Норму виконано! Я в повному порядку!";
        }
    }
}

// ==========================================
// ОБРОБНИКИ ПОДІЙ
// ==========================================

// Обробка зміни інтервалу безпосередньо з екрана тамагочі
intervalSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        const userInput = prompt("Введіть інтервал нагадування у хвилинах (наприклад: 45):", gameState.customMinutes || 60);
        const mins = userInput === null ? NaN : parseInt(userInput, 10);

        if (!isNaN(mins) && mins > 0) {
            gameState.isCustomInterval = true;
            gameState.customMinutes = mins;
            inputCustomMinutes.value = mins;
            resetTimer();
        } else if (userInput !== null && userInput.trim() !== "") {
            alert("Будь ласка, введіть коректне число більше 0.");
        }
    } else {
        gameState.isCustomInterval = false;
        gameState.chosenInterval = parseInt(e.target.value, 10);
        resetTimer();
    }
    syncIntervalSelect();
    updateUI();
});

function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

btnOpenSettings.addEventListener('click', () => openModal(settingsModal));
btnCloseSettings.addEventListener('click', () => closeModal(settingsModal));

btnOpenDrinkModal.addEventListener('click', () => {
    if (!gameState.isDead) openModal(drinkModal);
});
btnCloseDrink.addEventListener('click', () => closeModal(drinkModal));

btnDrinkConfirm.addEventListener('click', () => {
    if (drinkWater()) closeModal(drinkModal);
});

// Закриття будь-якого модального вікна при натисканні на темний фон навколо
[settingsModal, drinkModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// Кнопка "Назад" на Android / Escape — закриває відкрите вікно
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(settingsModal);
        closeModal(drinkModal);
    }
});

// Кнопка збереження профілю та нових таймерів
btnUpdateProfile.addEventListener('click', () => {
    gameState.weight = parseFloat(inputWeight.value) || 60;
    gameState.height = parseFloat(inputHeight.value) || 170;
    gameState.age = parseInt(inputAge.value, 10) || 25;
    gameState.gender = inputGender.value;
    gameState.city = inputCity.value.trim() || "Київ";

    if (intervalSelect.value === 'custom') {
        gameState.isCustomInterval = true;
        let mins = parseInt(inputCustomMinutes.value, 10);
        if (isNaN(mins) || mins <= 0) mins = 60;
        gameState.customMinutes = mins;
    } else {
        gameState.isCustomInterval = false;
        gameState.chosenInterval = parseInt(intervalSelect.value, 10);
    }

    resetTimer();
    safeFetchWeather(true);
    closeModal(settingsModal);
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

// Зупиняємо таймер, коли застосунок у фоні (економія батареї),
// і одразу перераховуємо все при поверненні
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
        saveState();
    } else {
        checkNewDay();
        startTimer();
        updateUI();
        safeFetchWeather(false);
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
