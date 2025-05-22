
// Weather API configuration
const apiKey = "a44d60cb0d744016894203923253004";
const apiUrl = (city) => `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=yes`;
const forecastUrl = (city) => `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=5&aqi=no`;

// DOM elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const locationButton = document.getElementById('location-button');
const loadingContainer = document.getElementById('loading');
const errorContainer = document.getElementById('error');
const errorMessage = document.querySelector('.error-message');
const weatherContainer = document.getElementById('weather-container');
const currentWeatherContainer = document.getElementById('current-weather');
const aqiContainer = document.getElementById('aqi-container');
const currentYearSpan = document.getElementById('current-year');

// App state
let tempUnit = 'celsius';
let currentLocation = 'New York'; // Default location

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Set the current year in the footer
  currentYearSpan.textContent = new Date().getFullYear();
  
  // Set up event listeners
  searchForm.addEventListener('submit', handleSearch);
  locationButton.addEventListener('click', getCurrentLocation);
  fetchWeatherData(currentLocation);
});

// Event handlers
function handleSearch(e) {
  e.preventDefault();
  const location = searchInput.value.trim();
  
  if (location) {
    currentLocation = location;
    fetchWeatherData(location);
  }
}

function getCurrentLocation() {
  showLoading();
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        hideLoading();
        showError('Unable to get your location. Please try searching manually.');
      }
    );
  } else {
    hideLoading();
    showError('Geolocation is not supported by this browser.');
  }
}

// API calls
async function fetchWeatherData(location) {
  showLoading();
  hideError();
  
  try {
    const [weatherData, forecastData] = await Promise.all([
      fetch(apiUrl(location)).then(res => {
        if (!res.ok) throw new Error('City not found');
        return res.json();
      }),
      fetch(forecastUrl(location)).then(res => {
        if (!res.ok) throw new Error('Forecast data not available');
        return res.json();
      })
    ]);
    
    displayWeatherData(weatherData, forecastData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError(`Failed to load weather data for ${location}.`);
  } finally {
    hideLoading();
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const response = await fetch(apiUrl(`${lat},${lon}`));
    if (!response.ok) throw new Error('Unable to fetch weather for this location');
    
    const data = await response.json();
    currentLocation = data.location.name;
    
    // Fetch forecast data for the detected location
    const forecastResponse = await fetch(forecastUrl(currentLocation));
    if (!forecastResponse.ok) throw new Error('Forecast data not available');
    
    const forecastData = await forecastResponse.json();
    displayWeatherData(data, forecastData);
  } catch (error) {
    console.error('Error fetching weather by coordinates:', error);
    showError('Unable to get weather for your location.');
  } finally {
    hideLoading();
  }
}

// UI updates
function showLoading() {
  loadingContainer.classList.remove('hidden');
  weatherContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');
}

function hideLoading() {
  loadingContainer.classList.add('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorContainer.classList.remove('hidden');
  weatherContainer.classList.add('hidden');
}

function hideError() {
  errorContainer.classList.add('hidden');
}

function displayWeatherData(weatherData, forecastData) {
  // Check if we have valid data
  if (!weatherData || !weatherData.current || !weatherData.location) {
    showError('Invalid weather data received.');
    return;
  }
  
  // Display current weather
  displayCurrentWeather(weatherData);
  
  // Display forecast if available
  if (forecastData && forecastData.forecast) {
    displayForecast(forecastData);
  }
  
  // Display air quality if available
  if (weatherData.current.air_quality) {
    displayAirQuality(weatherData.current.air_quality);
  } else {
    aqiContainer.classList.add('hidden');
  }
  
  // Show the weather container
  weatherContainer.classList.remove('hidden');
}

function displayCurrentWeather(data) {
  const { location, current } = data;
  const isDay = current.is_day;
  
  // Format the date
  const date = new Date();
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Decide on temperature display
  const tempC = current.temp_c;
  const tempF = current.temp_f;
  const feelsLikeC = current.feelslike_c;
  const feelsLikeF = current.feelslike_f;
  
  const displayTemp = tempUnit === 'celsius' ? tempC : tempF;
  const displayFeelsLike = tempUnit === 'celsius' ? feelsLikeC : feelsLikeF;
  const unitSymbol = tempUnit === 'celsius' ? 'C' : 'F';
  
  // Get weather icon code
  const iconCode = current.condition.icon.split('/').pop().split('.')[0];
  
  // Create the HTML for current weather
  const weatherHTML = `
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h2 class="weather-location">${location.name}, ${location.country}</h2>
        <p class="weather-date">${formattedDate}</p>
        <div class="weather-details">
          <img src="${current.condition.icon}" alt="${current.condition.text}" class="weather-icon" />
          <p class="weather-desc">${current.condition.text}</p>
        </div>
      </div>
      
      <div class="weather-temp-container">
        <div class="weather-temp" id="temp-display">${displayTemp}°<span class="temp-unit">${unitSymbol}</span></div>
        <p class="feels-like">Feels like ${displayFeelsLike}°</p>
      </div>
    </div>
    
    <div class="weather-stats-grid">
      <div class="weather-stat">
        <span class="weather-stat-label">Min</span>
        <span class="weather-stat-value" id="temp-min">${tempUnit === 'celsius' ? tempC - 2 : tempF - 4}°</span>
      </div>
      <div class="weather-stat">
        <span class="weather-stat-label">Max</span>
        <span class="weather-stat-value" id="temp-max">${tempUnit === 'celsius' ? tempC + 2 : tempF + 4}°</span>
      </div>
      <div class="weather-stat">
        <span class="weather-stat-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
          </svg>
          Wind
        </span>
        <span class="weather-stat-value">${current.wind_kph} km/h</span>
      </div>
      <div class="weather-stat">
        <span class="weather-stat-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
          </svg>
          Humidity
        </span>
        <span class="weather-stat-value">${current.humidity}%</span>
      </div>
    </div>
  `;
  
  currentWeatherContainer.innerHTML = weatherHTML;
  
  // Add event listener to temperature to toggle units
  const tempDisplay = document.getElementById('temp-display');
  tempDisplay.addEventListener('click', toggleTemperatureUnit);
}

function displayForecast(data) {
  // Create a forecast section if it doesn't exist
  let forecastContainer = document.getElementById('forecast-container');
  if (!forecastContainer) {
    forecastContainer = document.createElement('div');
    forecastContainer.id = 'forecast-container';
    forecastContainer.className = 'weather-card';
    weatherContainer.appendChild(forecastContainer);
  }
  
  const forecastDays = data.forecast.forecastday;
  
  let forecastHTML = `
    <h3 class="text-xl font-bold mb-4">5-Day Forecast</h3>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
  `;
  
  forecastDays.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const tempC = day.day.avgtemp_c;
    const tempF = day.day.avgtemp_f;
    const displayTemp = tempUnit === 'celsius' ? tempC : tempF;
    
    forecastHTML += `
      <div class="weather-glass p-3 flex flex-col items-center">
        <p class="font-medium">${dayName}</p>
        <div class="my-2">
          <img src="${day.day.condition.icon}" alt="${day.day.condition.text}" width="40" />
        </div>
        <p class="text-xl font-bold">${Math.round(displayTemp)}°</p>
        <p class="text-xs capitalize text-gray-600">${day.day.condition.text}</p>
      </div>
    `;
  });
  
  forecastHTML += '</div>';
  forecastContainer.innerHTML = forecastHTML;
}

function displayAirQuality(airQuality) {
  // Define AQI levels and their classifications
  const getAQILevel = (aqi) => {
    if (aqi <= 50) return { level: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { level: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy' };
    if (aqi <= 200) return { level: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { level: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { level: 'Hazardous', class: 'aqi-hazardous' };
  };
  
  // Get PM2.5 value for AQI calculation
  const pm25 = airQuality["pm2_5"] || 0;
  const aqiValue = Math.round(pm25); // Simplified AQI calculation
  const { level, class: aqiClass } = getAQILevel(aqiValue);
  
  const aqiHTML = `
    <h3 class="aqi-title">Air Quality Index</h3>
    <div class="aqi-level ${aqiClass}">${level}</div>
    <p>PM2.5: ${pm25.toFixed(1)} μg/m³</p>
    <p>Air quality is considered ${level.toLowerCase()} for this area.</p>
  `;
  
  aqiContainer.innerHTML = aqiHTML;
  aqiContainer.classList.remove('hidden');
}

function toggleTemperatureUnit() {
  tempUnit = tempUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  fetchWeatherData(currentLocation); // Refresh weather display with new unit
}
