const STEP_VOLUME = 250;

let gameState = {
    waterDrunk: 0,
    daysSurvived: 0,
    isDead: false,
    lastCheckedDate: new Date().toDateString(),
    chosenInterval: 3600,
    secondsLeft: 3600,
    // Параметри користувача
    weight: 60,
    height: 170,
    age: 25,
    gender: 'male',
    city: 'Київ',
    calculatedGoal: 2000,
    currentTemp: 20
};

let timerIntervalId = null;
let isAnimatingDrink = false; // Блокування зміни картинок під час пиття

// DOM Елементи
const petAvatar = document.getElementById('pet-avatar');
const petStatus = document.getElementById('pet-status');
const waterCount = document.getElementById('water-count');
const waterGoal = document.getElementById('water-goal');
const daysCount = document.getElementById('days-count');
const progressFill = document.getElementById('progress-fill');
const btnDrink = document.getElementById('btn-drink');
const btnRestart = document.getElementById('btn-restart');
const btnSimulateDay = document.getElementById('btn-simulate-day');
const intervalSelect = document.getElementById('interval-select');
const countdownTimer = document.getElementById('countdown-timer');

// DOM Елементи налаштувань
const inputWeight = document.getElementById('input-weight');
const inputHeight = document.getElementById('input-height');
const inputAge = document.getElementById('input-age');
const inputGender = document.getElementById('input-gender');
const inputCity = document.getElementById('input-city');
const btnUpdateProfile = document.getElementById('btn-update-profile');
const weatherCitySpan = document.getElementById('weather-city');
const weatherTempSpan = document.getElementById('weather-temp');
const weatherStatus = document.getElementById('weather-status');

function initGame() {
    const savedState = localStorage.getItem('tamagotchi_water_state_pro');
    if (savedState) {
        gameState = JSON.parse(savedState);
        // Заповнюємо поля даними з пам'яті
        inputWeight.value = gameState.weight;
        inputHeight.value = gameState.height;
        inputAge.value = gameState.age;
        inputGender.value = gameState.gender;
        inputCity.value = gameState.city;
        intervalSelect.value = gameState.chosenInterval;
    } else {
        gameState.secondsLeft = gameState.chosenInterval;
        recalculateWaterGoal();
    }
    
    checkNewDay();
    fetchWeatherAndRecalculate();
    startTimer();
    updateUI();
}

// 🌤️ ФУНКЦІЯ ОТРИМАННЯ ПОГОДИ ТА РОЗРАХУНКУ НОРМИ
async function fetchWeatherAndRecalculate() {
    if (gameState.isDead) return;
    weatherStatus.textContent = "Оновлення погоди...";
    
    try {
        // Крок 1: Геокодинг (Отримуємо координати міста через Open-Meteo Geocoding API)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(gameState.city)}&count=1&language=uk`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            weatherStatus.textContent = "Місто не знайдено. Використовуємо стандартну норму.";
            recalculateWaterGoal();
            return;
        }
        
        const { latitude, longitude, name } = geoData.results[0];
        gameState.city = name;
        
        // Крок 2: Отримуємо поточну температуру
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        gameState.currentTemp = Math.round(weatherData.current_weather.temperature);
        
        weatherCitySpan.textContent = gameState.city;
        weatherTempSpan.textContent = gameState.currentTemp;
        weatherStatus.textContent = "Погоду успішно синхронізовано!";
        
        // Крок 3: Перераховуємо норму
        recalculateWaterGoal();
        
    } catch (error) {
        console.error("Помилка отримання погоди:", error);
        weatherStatus.textContent = "Помилка мережі. Використовуємо стандартну норму.";
        recalculateWaterGoal();
    }
}

function recalculateWaterGoal() {
    // Базова наукова формула: Вага * 35 мл (для чоловіків) або Вага * 31 мл (для жінок)
    let baseVolume = gameState.gender === 'male' ? gameState.weight * 35 : gameState.weight * 31;
    
    // Корекція за віком (молодшим потрібно трохи більше, старшим менше)
    if (gameState.age < 30) baseVolume += 150;
    if (gameState.age > 55) baseVolume -= 200;
    
    // Корекція за зростом (високим людям потрібно більше рідини)
    if (gameState.height > 180) baseVolume += 200;
    
    // 🔥 Корекція від погоди: якщо спекотно (більше 25°C), додаємо 500 мл. Якщо холодно (менше 5°C) — трохи зменшуємо.
    if (gameState.currentTemp >= 30) {
        baseVolume += 750;
    } else if (gameState.currentTemp >= 25) {
        baseVolume += 500;
    } else if (gameState.currentTemp <= 5) {
        baseVolume -= 150;
    }
    
    // Округляємо до красивого числа, кратного 50
    gameState.calculatedGoal = Math.round(baseVolume / 50) * 50;
    if (gameState.calculatedGoal < 1000) gameState.calculatedGoal = 1000; // Мінімум 1 літр
    
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
    gameState.secondsLeft = gameState.chosenInterval;
    saveState();
}

// 🥛 ФУНКЦІЯ ПИТТЯ З АНІМАЦІЄЮ
function drinkWater() {
    if (gameState.isDead || isAnimatingDrink) return;

    gameState.waterDrunk += STEP_VOLUME;
    resetTimer();
    
    // Вмикаємо анімацію пиття
    isAnimatingDrink = true;
    petAvatar.src = "img/drink_water.svg";
    petAvatar.className = "pet drinking";
    petStatus.textContent = "Глип-глип... Дуже смачна вода! Дякую!";
    
    // Через 1.5 секунди повертаємо звичайний стан
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
    gameState.daysSurvived = 0;
    gameState.lastCheckedDate = new Date().toDateString();
    gameState.secondsLeft = gameState.chosenInterval;
    
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
    daysCount.textContent = gameState.daysSurvived;

    const progressPercent = Math.min((gameState.waterDrunk / gameState.calculatedGoal) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;
    countdownTimer.textContent = formatTime(gameState.secondsLeft);

    // Перериваємо оновлення картинок екрану, якщо зараз програється анімація пиття
    if (isAnimatingDrink) return; 

    if (gameState.isDead) {
        // НОВА КАРТИНКА СМЕРТІ
        petAvatar.src = "img/death_water.svg"; 
        petAvatar.className = "pet dead";
        petStatus.textContent = `Твій улюбленець помер від зневоднення на ${gameState.daysSurvived} день... Спробуй ще раз.`;
        countdownTimer.style.display = 'none';
        btnDrink.disabled = true;
        btnRestart.classList.remove('hidden');
    } else {
        btnDrink.disabled = false;
        btnRestart.classList.add('hidden');
        countdownTimer.style.display = 'block';

        if (gameState.secondsLeft < 0) {
            petAvatar.src = "img/sick_water.svg";
            petAvatar.className = "pet sick";
            petStatus.textContent = "Мені дуже кепсько! Ти пропустив час прийому води!";
            countdownTimer.className = "countdown-timer overdue";
        } else {
            petAvatar.src = "img/regular_water.svg";
            petAvatar.className = "pet alive";
            countdownTimer.className = "countdown-timer";

            if (gameState.waterDrunk === 0) {
                petStatus.textContent = `Сьогодні треба випити ${gameState.calculatedGoal} мл. Чекаю на воду!`;
            } else if (gameState.waterDrunk < gameState.calculatedGoal) {
                petStatus.textContent = "Чудово почуваюся! Продовжуй у тому ж дусі.";
            } else {
                petStatus.textContent = "Денна норма виконана! Я у безпеці!";
            }
        }
    }
}

function saveState() {
    localStorage.setItem('tamagotchi_water_state_pro', JSON.stringify(gameState));
}

// Слухач кнопки оновлення профілю
btnUpdateProfile.addEventListener('click', () => {
    gameState.weight = parseFloat(inputWeight.value) || 60;
    gameState.height = parseFloat(inputHeight.value) || 170;
    gameState.age = parseInt(inputAge.value) || 25;
    gameState.gender = inputGender.value;
    gameState.city = inputCity.value.trim() || "Київ";
    
    fetchWeatherAndRecalculate();
});

intervalSelect.addEventListener('change', (e) => {
    const newInterval = parseInt(e.target.value);
    gameState.chosenInterval = newInterval;
    gameState.secondsLeft = newInterval;
    saveState();
    updateUI();
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