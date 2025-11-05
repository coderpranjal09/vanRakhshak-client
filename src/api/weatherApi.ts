// src/api/weatherApi.ts
export interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  visibility: number;
  description: string;
  icon: string;
}

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    
    
    // For demo purposes, using a free API endpoint
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=070b8d1eb7f4b59140b6788d2bb9e26f&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      wind_gust: data.wind.gust,
      visibility: data.visibility,
      description: data.weather[0].description,
      icon: data.weather[0].icon
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Fallback mock data for demo purposes
    return {
      temp: 25 + (Math.random() * 10 - 5), // Random temp between 20-30
      feels_like: 26 + (Math.random() * 10 - 5),
      humidity: 60 + (Math.random() * 20 - 10), // Random humidity
      pressure: 1013,
      wind_speed: 3.5 + (Math.random() * 5), // Random wind speed
      wind_deg: Math.random() * 360, // Random wind direction
      wind_gust: 5.0 + (Math.random() * 5),
      visibility: 10000,
      description: 'clear sky',
      icon: '01d'
    };
  }
};