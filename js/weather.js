// ==========================================
// 1. ЗМІНА ЗОВНІШНЬОГО ФОНУ СТОРІНКИ (ТЕМПЕРАТУРА)
// ==========================================
function updateBackgroundByWeather(temp) {
    const body = document.body;
    if (!body) return;

    let bg;
    if (temp >= 30) bg = "radial-gradient(circle, #521c17 0%, #1a0807 100%)";
    else if (temp >= 20) bg = "radial-gradient(circle, #423b29 0%, #14120d 100%)";
    else if (temp >= 10) bg = "radial-gradient(circle, #273b32 0%, #0d1411 100%)";
    else if (temp >= 0) bg = "radial-gradient(circle, #1a2936 0%, #080d12 100%)";
    else bg = "radial-gradient(circle, #253540 0%, #0b1114 100%)";

    body.style.background = bg;
}

// ==========================================
// 2. ВІЗУАЛЬНІ ЕФЕКТИ ТА АНІМАЦІЇ НА ЕКРАНІ ТАМАГОЧІ
// ==========================================
let appliedWeatherCode;

function createParticles(overlay, className, count, minDur, rangeDur, maxDelay) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = className;
        el.style.left = `${Math.random() * 100}%`;
        el.style.animationDuration = `${minDur + Math.random() * rangeDur}s`;
        el.style.animationDelay = `${Math.random() * maxDelay}s`;
        frag.appendChild(el);
    }
    overlay.appendChild(frag);
}

function applyWeatherEffects(weatherCode) {
    // Не перебудовуємо анімації, якщо погода не змінилася
    if (weatherCode === appliedWeatherCode) return;
    appliedWeatherCode = weatherCode;

    // Фон і анімації — на весь екран; клас погоди на body керує й кольором тексту
    const bg = document.getElementById('weather-bg');
    if (!bg) return;
    const weatherClasses = document.body.classList;

    // Очищаємо попередній оверлей та класи погоди
    const oldOverlay = bg.querySelector('.weather-overlay');
    if (oldOverlay) oldOverlay.remove();

    weatherClasses.remove('weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-snowy', 'weather-thunder', 'weather-windy');

    if (weatherCode === null || weatherCode === undefined) return;

    // Створюємо новий контейнер для анімаційних елементів
    const overlay = document.createElement('div');
    overlay.className = 'weather-overlay';

    // ☀️ 0, 1 -> Ясно / Сонячно
    if (weatherCode === 0 || weatherCode === 1) {
        weatherClasses.add('weather-sunny');
        overlay.innerHTML = `<div class="sun-ray"></div>`;

    // ☁️ 2, 3 -> Хмарно / Похмуро
    } else if (weatherCode === 2 || weatherCode === 3) {
        weatherClasses.add('weather-cloudy');
        overlay.innerHTML = `
            <div class="cloud cloud-1"></div>
            <div class="cloud cloud-2"></div>
        `;

    // 🌧️ 51-67, 80-82 -> Дощ
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
        weatherClasses.add('weather-rainy');
        createParticles(overlay, 'rain-drop', 35, 0.6, 0.4, 1);

    // ❄️ 71-77, 85-86 -> Сніг
    } else if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
        weatherClasses.add('weather-snowy');
        createParticles(overlay, 'snowflake', 25, 2, 3, 2);

    // 🌩️ 95-99 -> Гроза
    } else if (weatherCode >= 95) {
        weatherClasses.add('weather-thunder');
        createParticles(overlay, 'rain-drop', 35, 0.5, 0.3, 1);
        const flash = document.createElement('div');
        flash.className = 'lightning-flash';
        overlay.appendChild(flash);

    // 🌬️ 45, 48 -> Туман / Вітер (за замовчуванням хмарно)
    } else {
        weatherClasses.add('weather-cloudy');
    }

    bg.appendChild(overlay);
}

// Іконка погоди за кодом Open-Meteo
function weatherEmoji(code) {
    if (code === null || code === undefined) return '🌡️';
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄️';
    if (code >= 95) return '⛈️';
    if (code >= 51 && code <= 82) return '🌧️';
    return '🌡️';
}

function renderWeatherWidget() {
    const weatherCitySpan = document.getElementById('weather-city');
    const weatherTempSpan = document.getElementById('weather-temp');
    const weatherIcon = document.getElementById('weather-icon');
    if (weatherCitySpan) weatherCitySpan.textContent = gameState.city;
    if (weatherTempSpan) weatherTempSpan.textContent = `${gameState.currentTemp}°C`;
    if (weatherIcon) weatherIcon.textContent = weatherEmoji(gameState.weatherCode);
}

// Показ збереженої погоди одразу при запуску (працює й без інтернету)
function applyCachedWeather() {
    if (!gameState.weatherFetchedAt) return;
    renderWeatherWidget();
    updateBackgroundByWeather(gameState.currentTemp);
    applyWeatherEffects(gameState.weatherCode);
}

// ==========================================
// 3. ЗАВАНТАЖЕННЯ ПОГОДИ ТА СИНХРОНІЗАЦІЯ
// ==========================================
let weatherRequestInFlight = false;

async function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchWeatherAndRecalculate(force) {
    if (typeof gameState === 'undefined' || gameState.isDead) return;
    if (weatherRequestInFlight) return;

    // Кеш: не ходимо в мережу, якщо дані свіжі
    const isFresh = Date.now() - (gameState.weatherFetchedAt || 0) < WEATHER_TTL_MS;
    if (!force && isFresh) {
        recalculateWaterGoal();
        return;
    }

    const weatherStatus = document.getElementById('weather-status');
    if (weatherStatus) weatherStatus.textContent = "Оновлення погоди...";

    const cityToFetch = (gameState.city && gameState.city.trim() !== "") ? gameState.city : "Київ";

    weatherRequestInFlight = true;
    try {
        // 1. Геокодування (знаходимо координати)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityToFetch)}&count=1&language=uk`;
        const geoResponse = await fetchWithTimeout(geoUrl, 10000);

        if (!geoResponse.ok) throw new Error("Помилка геокодування");

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            if (weatherStatus) weatherStatus.textContent = "Місто не знайдено.";
            recalculateWaterGoal();
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];
        gameState.city = name;

        // 2. Отримання погоди (температура + код стану погоди)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherResponse = await fetchWithTimeout(weatherUrl, 10000);

        if (!weatherResponse.ok) throw new Error("Помилка сервера погоди");

        const weatherData = await weatherResponse.json();

        if (weatherData.current_weather) {
            const { temperature, weathercode } = weatherData.current_weather;

            gameState.currentTemp = Math.round(temperature);
            gameState.weatherCode = weathercode;
            gameState.weatherFetchedAt = Date.now();

            renderWeatherWidget();
            if (weatherStatus) weatherStatus.textContent = "Погоду синхронізовано!";

            // Застосовуємо тему та анімації
            updateBackgroundByWeather(gameState.currentTemp);
            applyWeatherEffects(weathercode);
        }

        recalculateWaterGoal();
    } catch (error) {
        console.error("Weather fetch error:", error);
        if (weatherStatus) weatherStatus.textContent = "Помилка мережі.";
        recalculateWaterGoal();
    } finally {
        weatherRequestInFlight = false;
    }
}
