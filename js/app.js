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

// DOM елементи вибору напою (у модальному вікні)
const selectDrink = document.getElementById('select-drink');
const inputCustomVolume = document.getElementById('input-custom-volume');

// Лічильники та шкали
const waterCount = document.getElementById('water-count');
const waterGoal = document.getElementById('water-goal');
const totalVolumeCount = document.getElementById('total-volume');
const daysCount = document.getElementById('days-count');
const progressFill = document.getElementById('progress-fill');
const totalVolumeFill = document.getElementById('total-volume-fill'); // Червона шкала

// Екран персонажа
const petAvatar = document.getElementById('pet-avatar');
const petStatus = document.getElementById('pet-status');
const countdownTimer = document.getElementById('countdown-timer');

// Кнопки
const btnRestart = document.getElementById('btn-restart');
const btnSimulateDay = document.getElementById('btn-simulate-day');

// Модальне вікно налаштувань
const settingsModal = document.getElementById('settings-modal');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnUpdateProfile = document.getElementById('btn-update-profile');

// Поля вводу налаштувань
const inputWeight = document.getElementById('input-weight');
const inputHeight = document.getElementById('input-height');
const inputAge = document.getElementById('input-age');
const inputGender = document.getElementById('input-gender');
const inputCity = document.getElementById('input-city');
const intervalSelect = document.getElementById('interval-select'); // Явне оголошення
const inputCustomMinutes = document.getElementById('input-custom-minutes');
const customIntervalWrapper = document.getElementById('custom-interval-wrapper');

// Модальне вікно напою
const drinkModal = document.getElementById('drink-modal');
const btnOpenDrinkModal = document.getElementById('btn-open-drink-modal');
const btnCloseDrink = document.getElementById('btn-close-drink');
const btnDrinkConfirm = document.getElementById('btn-drink-confirm');

const petIntervalWrapper = document.querySelector('.pet-interval-wrapper');


function initGame() {
    const savedState = localStorage.getItem('tamagotchi_water_state_v4');
    if (savedState) {
        gameState = JSON.parse(savedState);
        
        if (inputWeight) inputWeight.value = gameState.weight;
        if (inputHeight) inputHeight.value = gameState.height;
        if (inputAge) inputAge.value = gameState.age;
        if (inputGender) inputGender.value = gameState.gender;
        if (inputCity) inputCity.value = gameState.city;
        if (inputCustomMinutes) inputCustomMinutes.value = gameState.customMinutes || 60;
        
        if (intervalSelect) {
            if (gameState.isCustomInterval) {
                intervalSelect.value = 'custom';
                if (customIntervalWrapper) customIntervalWrapper.classList.remove('hidden');
            } else {
                intervalSelect.value = gameState.chosenInterval;
                if (customIntervalWrapper) customIntervalWrapper.classList.add('hidden');
            }
        }
    } else {
        gameState.secondsLeft = gameState.chosenInterval;
        recalculateWaterGoal();
    }
    
    checkNewDay();
    safeFetchWeather();
    startTimer();
    updateUI();
}

function safeFetchWeather() {
    if (typeof fetchWeatherAndRecalculate === 'function') {
        fetchWeatherAndRecalculate();
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
    
    const efficiency = DRINK_EFFICIENCY[selectedDrinkType] || 1.0;
    const netHydration = Math.round(inputVolValue * efficiency);
    
    gameState.waterDrunk += netHydration;
    gameState.totalVolume += inputVolValue;
    
    resetTimer();
    
    isAnimatingDrink = true;
    petAvatar.src = "img/charachter/drink_water.svg";
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
    safeFetchWeather();
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
    if (waterCount) waterCount.textContent = gameState.waterDrunk;
    if (waterGoal) waterGoal.textContent = gameState.calculatedGoal;
    if (totalVolumeCount) totalVolumeCount.textContent = gameState.totalVolume;
    if (daysCount) daysCount.textContent = gameState.daysSurvived;

    // 1. Оновлення СИНЬОЇ шкали (Гідратація)
    if (progressFill) {
        const waterPercent = Math.min((gameState.waterDrunk / gameState.calculatedGoal) * 100, 100);
        progressFill.style.width = `${waterPercent}%`;
    }

    // 2. Оновлення ЧЕРВОНОЇ шкали (Загалом випито)
    if (totalVolumeFill) {
        const totalPercent = Math.min((gameState.totalVolume / gameState.calculatedGoal) * 100, 100);
        totalVolumeFill.style.width = `${totalPercent}%`;
    }

    if (countdownTimer) {
        countdownTimer.textContent = formatTime(gameState.secondsLeft);
    }

    // Якщо зараз іде анімація пиття — не переписуємо статус і сплайт
    if (isAnimatingDrink) return; 

    // Обробка стану смерті / життя персонажа
    if (gameState.isDead) {
        petAvatar.src = "img/charachter/death_water.svg"; 
        petAvatar.className = "pet dead";
        petStatus.textContent = `Помер від спраги на ${gameState.daysSurvived} день...`;
        
        if (countdownTimer) countdownTimer.style.display = 'none';
        if (btnOpenDrinkModal) btnOpenDrinkModal.style.display = 'none';
        if (petIntervalWrapper) petIntervalWrapper.style.display = 'none';
        
        btnRestart.classList.remove('hidden');
    } else {
        if (btnOpenDrinkModal) btnOpenDrinkModal.style.display = 'flex';
        if (petIntervalWrapper) petIntervalWrapper.style.display = 'block';
        
        btnRestart.classList.add('hidden');
        if (countdownTimer) countdownTimer.style.display = 'block';

        if (gameState.secondsLeft < 0) {
            petAvatar.src = "img/charachter/sick_water.svg";
            petAvatar.className = "pet sick";
            petStatus.textContent = "Мені зле! Швидше дай попити!";
            if (countdownTimer) countdownTimer.className = "countdown-timer overdue";
        } else {
            petAvatar.src = "img/charachter/regular_water.svg";
            petAvatar.className = "pet alive";
            if (countdownTimer) countdownTimer.className = "countdown-timer";

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

// Обробка зміни інтервалу безпосередньо з екрана тамагочі
if (intervalSelect) {
    intervalSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            const userInput = prompt("Введіть інтервал нагадування у хвилинах (наприклад: 45):", gameState.customMinutes || 60);
            
            if (userInput !== null && userInput.trim() !== "") {
                let mins = parseInt(userInput);
                if (!isNaN(mins) && mins > 0) {
                    gameState.isCustomInterval = true;
                    gameState.customMinutes = mins;
                    resetTimer();
                    saveState();
                } else {
                    alert("Будь ласка, введіть коректне число більше 0.");
                    intervalSelect.value = gameState.isCustomInterval ? 'custom' : gameState.chosenInterval;
                }
            } else {
                intervalSelect.value = gameState.isCustomInterval ? 'custom' : gameState.chosenInterval;
            }
        } else {
            gameState.isCustomInterval = false;
            gameState.chosenInterval = parseInt(e.target.value);
            resetTimer();
            saveState();
        }
    });
}

// Керування модалкою налаштувань
btnOpenSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// Керування модалкою напою
btnOpenDrinkModal.addEventListener('click', () => {
    if (gameState.isDead) return;
    drinkModal.classList.remove('hidden');
});

btnCloseDrink.addEventListener('click', () => {
    drinkModal.classList.add('hidden');
});

btnDrinkConfirm.addEventListener('click', () => {
    drinkWater();
    drinkModal.classList.add('hidden');
});

// Закриття будь-якого модального вікна при кліку на темний фон навколо
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
    if (e.target === drinkModal) {
        drinkModal.classList.add('hidden');
    }
});

// Кнопка збереження профілю та нових таймерів
btnUpdateProfile.addEventListener('click', () => {
    gameState.weight = parseFloat(inputWeight.value) || 60;
    gameState.height = parseFloat(inputHeight.value) || 170;
    gameState.age = parseInt(inputAge.value) || 25;
    gameState.gender = inputGender.value;
    gameState.city = inputCity.value.trim() || "Київ";
    
    if (intervalSelect.value === 'custom') {
        gameState.isCustomInterval = true;
        let mins = parseInt(inputCustomMinutes.value);
        if (isNaN(mins) || mins <= 0) mins = 60;
        gameState.customMinutes = mins;
    } else {
        gameState.isCustomInterval = false;
        gameState.chosenInterval = parseInt(intervalSelect.value);
    }
    
    resetTimer();
    safeFetchWeather();
    settingsModal.classList.add('hidden');
});

btnRestart.addEventListener('click', restartGame);

btnSimulateDay.addEventListener('click', () => {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    gameState.lastCheckedDate = yesterday.toDateString();
    checkNewDay();
    updateUI();
});

window.onload = initGame;