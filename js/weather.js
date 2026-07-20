// ==========================================
// 1. ЗМІНА ЗОВНІШНЬОГО ФОНУ СТОРІНКИ (ТЕМПЕРАТУРА)
// ==========================================
function updateBackgroundByWeather(temp) {
    const body = document.body;
    if (!body) return;

    if (temp >= 30) {
        body.style.background = "radial-gradient(circle, #521c17 0%, #1a0807 100%)";
    } else if (temp >= 20) {
        body.style.background = "radial-gradient(circle, #423b29 0%, #14120d 100%)";
    } else if (temp >= 10) {
        body.style.background = "radial-gradient(circle, #273b32 0%, #0d1411 100%)";
    } else if (temp >= 0) {
        body.style.background = "radial-gradient(circle, #1a2936 0%, #080d12 100%)";
    } else {
        body.style.background = "radial-gradient(circle, #253540 0%, #0b1114 100%)";
    }
}

// ==========================================
// 2. ВІЗУАЛЬНІ ЕФЕКТИ ТА АНІМАЦІЇ НА ЕКРАНІ ТАМАГОЧІ
// ==========================================
function applyWeatherEffects(weatherCode) {
    const petScreen = document.querySelector('.pet-screen');
    if (!petScreen) return;

    // Очищаємо попередній оверлей та класи погоди
    const oldOverlay = petScreen.querySelector('.weather-overlay');
    if (oldOverlay) oldOverlay.remove();

    petScreen.classList.remove('weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-snowy', 'weather-thunder', 'weather-windy');

    // Створюємо новий контейнер для анімаційних елементів
    const overlay = document.createElement('div');
    overlay.className = 'weather-overlay';

    // ☀️ 0, 1 -> Ясно / Сонячно
    if (weatherCode === 0 || weatherCode === 1) {
        petScreen.classList.add('weather-sunny');
        overlay.innerHTML = `<div class="sun-ray"></div>`;

    // ☁️ 2, 3 -> Хмарно / Похмуро
    } else if (weatherCode === 2 || weatherCode === 3) {
        petScreen.classList.add('weather-cloudy');
        overlay.innerHTML = `
            <div class="cloud cloud-1"></div>
            <div class="cloud cloud-2"></div>
        `;

    // 🌧️ 51-67, 80-82 -> Дощ
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
        petScreen.classList.add('weather-rainy');
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${0.6 + Math.random() * 0.4}s`;
            drop.style.animationDelay = `${Math.random() * 1}s`;
            overlay.appendChild(drop);
        }

    // ❄️ 71-77, 85-86 -> Сніг
    } else if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
        petScreen.classList.add('weather-snowy');
        for (let i = 0; i < 15; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.animationDuration = `${2 + Math.random() * 3}s`;
            flake.style.animationDelay = `${Math.random() * 2}s`;
            overlay.appendChild(flake);
        }

    // 🌩️ 95-99 -> Гроза
    } else if (weatherCode >= 95) {
        petScreen.classList.add('weather-thunder');
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${0.5 + Math.random() * 0.3}s`;
            drop.style.animationDelay = `${Math.random() * 1}s`;
            overlay.appendChild(drop);
        }
        const flash = document.createElement('div');
        flash.className = 'lightning-flash';
        overlay.appendChild(flash);

    // 🌬️ 45, 48 -> Туман / Вітер (за замовчуванням хмарно)
    } else {
        petScreen.classList.add('weather-cloudy');
    }

    petScreen.appendChild(overlay);
}

// ==========================================
// 3. ЗАВНАТАЖЕННЯ ПОГОДИ ТА СИНХРОНІЗАЦІЯ
// ==========================================
async function fetchWeatherAndRecalculate() {
    if (typeof gameState === 'undefined' || gameState.isDead) return;
    
    const weatherStatus = document.getElementById('weather-status');
    const weatherCitySpan = document.getElementById('weather-city');
    const weatherTempSpan = document.getElementById('weather-temp');
    
    if (weatherStatus) weatherStatus.textContent = "Оновлення погоди...";

    const cityToFetch = (gameState.city && gameState.city.trim() !== "") ? gameState.city : "Київ";
    
    try {
        // 1. Геокодування (знаходимо координати)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityToFetch)}&count=1&language=uk`;
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) throw new Error("Помилка геокодування");
        
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            if (weatherStatus) weatherStatus.textContent = "Місто не знайдено.";
            if (typeof recalculateWaterGoal === 'function') recalculateWaterGoal();
            return;
        }
        
        const { latitude, longitude, name } = geoData.results[0];
        gameState.city = name;
        
        // 2. Отримання погоди (температура + код стан погоди)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) throw new Error("Помилка сервера погоди");
        
        const weatherData = await weatherResponse.json();
        
        if (weatherData.current_weather) {
            const { temperature, weathercode } = weatherData.current_weather;
            
            gameState.currentTemp = Math.round(temperature);
            gameState.weatherCode = weathercode;
            
            if (weatherCitySpan) weatherCitySpan.textContent = gameState.city;
            if (weatherTempSpan) weatherTempSpan.textContent = `${gameState.currentTemp}°C`;
            if (weatherStatus) weatherStatus.textContent = "Погоду синхронізовано!";
            
            // Застосовуємо тему та анімації
            updateBackgroundByWeather(gameState.currentTemp);
            applyWeatherEffects(weathercode);
        }
        
        if (typeof recalculateWaterGoal === 'function') recalculateWaterGoal();
    } catch (error) {
        console.error("Weather fetch error:", error);
        if (weatherStatus) weatherStatus.textContent = "Помилка мережі.";
        if (typeof recalculateWaterGoal === 'function') recalculateWaterGoal();
    }
}