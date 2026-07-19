// Функція зміни загального фону сторінки (як було раніше)
function updateBackgroundByWeather(temp) {
    const body = document.body;
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

// НОВА ФУНКЦІЯ: Зміна фону безпосередньо всередині екрана тамагочі
function updatePetScreenBackground(temp) {
    const petScreen = document.querySelector('.pet-screen');
    if (!petScreen) return;

    // Спочатку видаляємо всі старі погодні класи, щоб вони не накладалися
    petScreen.classList.remove('weather-freezing', 'weather-chilly', 'weather-mild', 'weather-warm', 'weather-hot');

    // Додаємо потрібний клас залежно від градусів
    if (temp >= 30) {
        petScreen.classList.add('weather-hot');
    } else if (temp >= 20) {
        petScreen.classList.add('weather-warm');
    } else if (temp >= 10) {
        petScreen.classList.add('weather-mild');
    } else if (temp >= 0) {
        petScreen.classList.add('weather-chilly');
    } else {
        petScreen.classList.add('weather-freezing');
    }
}

async function fetchWeatherAndRecalculate() {
    if (gameState.isDead) return;
    
    const weatherStatus = document.getElementById('weather-status');
    const weatherCitySpan = document.getElementById('weather-city');
    const weatherTempSpan = document.getElementById('weather-temp');
    
    if (weatherStatus) weatherStatus.textContent = "Оновлення погоди...";
    
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(gameState.city)}&count=1&language=uk`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            if (weatherStatus) weatherStatus.textContent = "Місто не знайдено.";
            recalculateWaterGoal();
            return;
        }
        
        const { latitude, longitude, name } = geoData.results[0];
        gameState.city = name;
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        gameState.currentTemp = Math.round(weatherData.current_weather.temperature);
        
        if (weatherCitySpan) weatherCitySpan.textContent = gameState.city;
        if (weatherTempSpan) weatherTempSpan.textContent = gameState.currentTemp;
        if (weatherStatus) weatherStatus.textContent = "Погоду синхронізовано!";
        
        // 1. Оновлюємо фон усього сайту
        updateBackgroundByWeather(gameState.currentTemp);
        
        // 2. Оновлюємо фон віконця з тамагочі
        updatePetScreenBackground(gameState.currentTemp);
        
        recalculateWaterGoal();
    } catch (error) {
        if (weatherStatus) weatherStatus.textContent = "Помилка мережі.";
        recalculateWaterGoal();
    }
}