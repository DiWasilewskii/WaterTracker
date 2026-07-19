const DRINK_EFFICIENCY = {
    water: 1.0,
    tea: 0.9,
    coffee: 0.5,
    soda: 0.4
};

let gameState = {
    waterDrunk: 0,
    totalVolume: 0,
    daysSurvived: 0,
    isDead: false,
    lastCheckedDate: new Date().toDateString(),
    chosenInterval: 3600,
    isCustomInterval: false,  // Чи увімкнено кастомний інтервал
    customMinutes: 60,        // Значення кастомного інтервалу
    secondsLeft: 3600,
    weight: 60,
    height: 170,
    age: 25,
    gender: 'male',
    city: 'Київ',
    calculatedGoal: 2000,
    currentTemp: 20
};

let timerIntervalId = null;
let isAnimatingDrink = false;

// DOM елементи бару
const selectDrink = document.getElementById('select-drink');
const inputCustomVolume = document.getElementById('input-custom-volume');

// Лічильники
const waterCount = document.getElementById('water-count');
const waterGoal = document.getElementById('water-goal');
const totalVolumeCount = document.getElementById('total-volume');
const daysCount = document.getElementById('days-count');
const progressFill = document.getElementById('progress-fill');
const totalVolumeFill = document.getElementById('total-volume-fill'); // Нова червона шкала

// Екран
const petAvatar = document.getElementById('pet-avatar');
const petStatus = document.getElementById('pet-status');
const countdownTimer = document.getElementById('countdown-timer');

// Кнопки
const btnDrink = document.getElementById('btn-drink');
const btnRestart = document.getElementById('btn-restart');
const btnSimulateDay = document.getElementById('btn-simulate-day');

// Модальне вікно
const settingsModal = document.getElementById('settings-modal');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnUpdateProfile = document.getElementById('btn-update-profile');

// Поля вводу модалки
const inputWeight = document.getElementById('input-weight');
const inputHeight = document.getElementById('input-height');
const inputAge = document.getElementById('input-age');
const inputGender = document.getElementById('input-gender');
const inputCity = document.getElementById('input-city');
const intervalSelect = document.getElementById('interval-select');
const inputCustomMinutes = document.getElementById('input-custom-minutes');
const customIntervalWrapper = document.getElementById('custom-interval-wrapper');

function initGame() {
    const savedState = localStorage.getItem('tamagotchi_water_state_v4');
    if (savedState) {
        gameState = JSON.parse(savedState);
        
        inputWeight.value = gameState.weight;
        inputHeight.value = gameState.height;
        inputAge.value = gameState.age;
        inputGender.value = gameState.gender;
        inputCity.value = gameState.city;
        inputCustomMinutes.value = gameState.customMinutes || 60;
        
        if (gameState.isCustomInterval) {
            intervalSelect.value = 'custom';
            customIntervalWrapper.classList.remove('hidden');
        } else {
            intervalSelect.value = gameState.chosenInterval;
            customIntervalWrapper.classList.add('hidden');
        }
    } else {
        gameState.secondsLeft = gameState.chosenInterval;
        recalculateWaterGoal();
    }
    
    checkNewDay();
    fetchWeatherAndRecalculate();
    startTimer();
    updateUI();
}

function recalculateWaterGoal() {
    let baseVolume = gameState.gender === 'male' ? gameState.weight * 35 : gameState.weight * 31;
    if (gameState.age < 30) baseVolume += 150;
    if (gameState.age > 55) baseVolume -= 200;
    if (gameState.height > 180) baseVolume += 200;
    
    if (gameState.currentTemp >= 30) baseVolume += 750;
    else if (gameState.currentTemp >= 25) baseVolume += 500;
    else if (gameState.currentTemp <= 5) baseVolume -= 150;
    
    gameState.calculatedGoal = Math.round(baseVolume / 50) * 50;
    if (gameState.calculatedGoal < 1000) gameState.calculatedGoal = 1000;
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
    }
}

function startTimer() {
    if (timerIntervalId) clearInterval(timerIntervalId);
    timerIntervalId = setInterval(() => {
        if (gameState.isDead) { clearInterval(timerIntervalId); return; }
        gameState.secondsLeft--;
        saveState();
        updateUI();
    }, 1000);
}

function resetTimer() {
    if (gameState.isCustomInterval) {
        gameState.secondsLeft = gameState.customMinutes * 60;
    } else {
        gameState.secondsLeft = gameState.chosenInterval;
    }
    saveState();
}

function drinkWater() {
    if (gameState.isDead || isAnimatingDrink) return;

    const selectedDrinkType = selectDrink.value;
    let inputVolValue = parseInt(inputCustomVolume.value);
    
    if (isNaN(inputVolValue) || inputVolValue <= 0) {
        alert("Введіть коректну кількість мілілітрів!");
        return;
    }
    
    const efficiency = DRINK_EFFICIENCY[selectedDrinkType];
    const netHydration = Math.round(inputVolValue * efficiency);
    
    gameState.waterDrunk += netHydration;
    gameState.totalVolume += inputVolValue;
    
    resetTimer();
    
    isAnimatingDrink = true;
    petAvatar.src = "img/drink_water.svg";
    petAvatar.className = "pet drinking";
    
    if (selectedDrinkType === 'water') {
        petStatus.textContent = `Глип-глип! +${netHydration} мл чистого здоров'я!`;
    } else if (selectedDrinkType === 'coffee') {
        petStatus.textContent = `Кава! Залито ${inputVolValue} мл, користі на +${netHydration} мл!`;
    } else if (selectedDrinkType === 'tea') {
        petStatus.textContent = `Чайочок! Корисної рідини додано: +${netHydration} мл.`;
    } else if (selectedDrinkType === 'soda') {
        petStatus.textContent = `Цукрова бомба! Користі всього +${netHydration} мл!`;
    }

    setTimeout(() => {
        isAnimatingDrink = false;
        updateUI();
    }, 1500);
}

function triggerDeath() {
    gameState.isDead = true;
    clearInterval(timerIntervalId);
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
    fetchWeatherAndRecalculate();
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

function updateUI() {
    waterCount.textContent = gameState.waterDrunk;
    waterGoal.textContent = gameState.calculatedGoal;
    totalVolumeCount.textContent = gameState.totalVolume;
    daysCount.textContent = gameState.daysSurvived;

    const progressPercent = Math.min((gameState.waterDrunk / gameState.calculatedGoal) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;
    countdownTimer.textContent = formatTime(gameState.secondsLeft);

    if (isAnimatingDrink) return; 

    if (gameState.isDead) {
        petAvatar.src = "img/death_water.svg"; 
        petAvatar.className = "pet dead";
        petStatus.textContent = `Помер від спраги на ${gameState.daysSurvived} день...`;
        countdownTimer.style.display = 'none';
        btnDrink.disabled = true;
        selectDrink.disabled = true;
        inputCustomVolume.disabled = true;
        btnRestart.classList.remove('hidden');
    } else {
        btnDrink.disabled = false;
        selectDrink.disabled = false;
        inputCustomVolume.disabled = false;
        btnRestart.classList.add('hidden');
        countdownTimer.style.display = 'block';

        if (gameState.secondsLeft < 0) {
            petAvatar.src = "img/sick_water.svg";
            petAvatar.className = "pet sick";
            petStatus.textContent = "Мені зле! Швидше дай попити!";
            countdownTimer.className = "countdown-timer overdue";
        } else {
            petAvatar.src = "img/regular_water.svg";
            petAvatar.className = "pet alive";
            countdownTimer.className = "countdown-timer";

            if (gameState.waterDrunk === 0) {
                petStatus.textContent = `Ціль на сьогодні — ${gameState.calculatedGoal} мл корисного зволоження!`;
            } else if (gameState.waterDrunk < gameState.calculatedGoal) {
                petStatus.textContent = "Продовжуй у тому ж дусі, політ нормальний!";
            } else {
                petStatus.textContent = "Норму виконано! Я в повному порядку!";
            }
        }
    }
}

function saveState() {
    localStorage.setItem('tamagotchi_water_state_v4', JSON.stringify(gameState));
}

// Перемикання відображення кастомного інпуту хвилин при зміні селектора
intervalSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customIntervalWrapper.classList.remove('hidden');
    } else {
        customIntervalWrapper.classList.add('hidden');
    }
});

// Керування модалкою
btnOpenSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

// Кнопка збереження профілю та нових таймерів
btnUpdateProfile.addEventListener('click', () => {
    gameState.weight = parseFloat(inputWeight.value) || 60;
    gameState.height = parseFloat(inputHeight.value) || 170;
    gameState.age = parseInt(inputAge.value) || 25;
    gameState.gender = inputGender.value;
    gameState.city = inputCity.value.trim() || "Київ";
    
    // Перевірка обраного інтервалу
    if (intervalSelect.value === 'custom') {
        gameState.isCustomInterval = true;
        let mins = parseInt(inputCustomMinutes.value);
        if (isNaN(mins) || mins <= 0) mins = 60;
        gameState.customMinutes = mins;
    } else {
        gameState.isCustomInterval = false;
        gameState.chosenInterval = parseInt(intervalSelect.value);
    }
    
    resetTimer(); // Оновлюємо таймер під новий інтервал
    fetchWeatherAndRecalculate();
    settingsModal.classList.add('hidden');
});

btnDrink.addEventListener('click', drinkWater);
btnRestart.addEventListener('click', restartGame);

btnSimulateDay.addEventListener('click', () => {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    gameState.lastCheckedDate = yesterday.toDateString();
    checkNewDay();
    updateUI();
});

window.onload = initGame;