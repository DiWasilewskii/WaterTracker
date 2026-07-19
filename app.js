// Константи конфігурації
const DAILY_GOAL = 2000; // Ціль у мл
const STEP_VOLUME = 250;  // Об'єм однієї склянки

// Стан гри
let gameState = {
    waterDrunk: 0,
    daysSurvived: 0,
    isDead: false,
    lastCheckedDate: new Date().toDateString()
};

// DOM Елементи
const petAvatar = document.getElementById('pet-avatar');
const petStatus = document.getElementById('pet-status');
const waterCount = document.getElementById('water-count');
const daysCount = document.getElementById('days-count');
const progressFill = document.getElementById('progress-fill');
const btnDrink = document.getElementById('btn-drink');
const btnRestart = document.getElementById('btn-restart');
const btnSimulateDay = document.getElementById('btn-simulate-day');

// 1. Ініціалізація гри
function initGame() {
    const savedState = localStorage.getItem('tamagotchi_water_state');
    if (savedState) {
        gameState = JSON.parse(savedState);
    }
    
    // Перевірка, чи не пропустив користувач дні, поки додаток був закритий
    checkNewDay();
    updateUI();
}

// 2. Перевірка настання нового дня
function checkNewDay() {
    if (gameState.isDead) return;

    const todayStr = new Date().toDateString();
    
    // Якщо дата змінилася
    if (gameState.lastCheckedDate !== todayStr) {
        // Головна перевірка: чи виконав норму за минулий день?
        if (gameState.waterDrunk < DAILY_GOAL) {
            triggerDeath();
        } else {
            // Якщо виконав — вижив, додаємо день, обнуляємо воду
            gameState.daysSurvived++;
            gameState.waterDrunk = 0;
            gameState.lastCheckedDate = todayStr;
            saveState();
        }
    }
}

// 3. Функція випивання води
function drinkWater() {
    if (gameState.isDead) return;

    gameState.waterDrunk += STEP_VOLUME;
    saveState();
    updateUI();
}

// 4. Смерть улюбленця
function triggerDeath() {
    gameState.isDead = true;
    saveState();
    updateUI();
}

// 5. Перезапуск (Респаун)
function restartGame() {
    gameState = {
        waterDrunk: 0,
        daysSurvived: 0,
        isDead: false,
        lastCheckedDate: new Date().toDateString()
    };
    saveState();
    updateUI();
}

// 6. Оновлення інтерфейсу (Візуалізація стану)
function updateUI() {
    // Оновлення текстових показників
    waterCount.textContent = gameState.waterDrunk;
    daysCount.textContent = gameState.daysSurvived;

    // Розрахунок прогрес-бару
    const progressPercent = Math.min((gameState.waterDrunk / DAILY_GOAL) * 100, 100);
    progressFill.style.width = `${progressPercent}%`;

    // Логіка відображення тамагочі залежно від стану
    if (gameState.isDead) {
        petAvatar.textContent = "💀";
        petAvatar.className = "pet dead";
        petStatus.textContent = `Твій улюбленець помер від дегідратації на ${gameState.daysSurvived} день... Тобі соромно?`;
        
        btnDrink.disabled = true;
        btnRestart.classList.remove('hidden');
    } else {
        btnDrink.disabled = false;
        btnRestart.classList.add('hidden');

        // Зміна настрою залежно від кількості випитої води
        if (gameState.waterDrunk === 0) {
            petAvatar.textContent = "🐱";
            petAvatar.className = "pet thirsty";
            petStatus.textContent = "Я вмираю від спраги! Випий води!";
        } else if (gameState.waterDrunk < DAILY_GOAL) {
            petAvatar.textContent = "🥤";
            petAvatar.className = "pet alive";
            petStatus.textContent = "Краще, але треба ще. Пий далі!";
        } else {
            petAvatar.textContent = "👑";
            petAvatar.className = "pet alive";
            petStatus.textContent = "Норма виконана! Я буду жити завтра!";
        }
    }
}

// Збереження даних в локальну пам'ять браузера
function saveState() {
    localStorage.setItem('tamagotchi_water_state', JSON.stringify(gameState));
}

// Слухачі подій (Кліки)
btnDrink.addEventListener('click', drinkWater);
btnRestart.addEventListener('click', restartGame);

// Функція для тесту розробника: симулює, ніби настав наступний день
btnSimulateDay.addEventListener('click', () => {
    // Штучно міняємо дату на «вчора» в об'єкті стану
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    gameState.lastCheckedDate = yesterday.toDateString();
    
    // Запускаємо перевірку дня
    checkNewDay();
    updateUI();
});

// Запуск програми при завантаженні сторінки
window.onload = initGame;