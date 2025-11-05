import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  RefreshCw,
  AlertCircle,
  Shield,
  Activity,
  BarChart3,
} from "lucide-react";

interface ModelBarProps {
  sensorId: string;
  temperature?: number;
  humidity?: number;
  smoke?: number;
  latitude?: number;
  longitude?: number;
}

const ModelBar: React.FC<ModelBarProps> = ({
  sensorId,
  temperature,
  humidity,
  smoke,
  latitude,
  longitude,
}) => {
  const [data, setData] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!sensorId) return;

    try {
      setFetching(true);

      
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=070b8d1eb7f4b59140b6788d2bb9e26f&units=metric`
      );
      const weatherData = await weatherRes.json();

      
      const weather = {
        temp_max: weatherData?.main?.temp_max ?? 0,
        temp_min: weatherData?.main?.temp_min ?? 0,
        pressure: weatherData?.main?.pressure ?? 0,
        clouds_all: weatherData?.clouds?.all ?? 0,
        wind_speed: weatherData?.wind?.speed ?? 0,
        wind_deg: weatherData?.wind?.deg ?? 0,
        wind_gust: weatherData?.wind?.gust ?? 0,
        temp_local: weatherData?.main?.temp ?? 0,
      };

  
      const payload = {
        temperature: temperature ?? 0,
        humidity: humidity ?? 0,
        smoke: smoke ?? 0,
        temp_max: 35,
        temp_min: 15,
        wind_speed: weather.wind_speed,
        wind_gust: weather.wind_gust,
      };

      console.log("Sending payload:", payload);

      
      const aiRes = await fetch("https://forest-fire-api2.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const aiData = await aiRes.json();
      console.log("AI Response:", aiData);
      
      const fireRisk = aiData.prediction === 1;
      const probability =
        typeof aiData.probabilities === "object"
          ? aiData.probabilities["1"] ?? 0
          : aiData.probability ?? 0;

      
      const formattedData = {
        fire_risk: fireRisk,
        message: aiData.message,
        probability,
        weather,
        sensors: { temperature, humidity, smoke },
      };

      setData(formattedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch AI model data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [sensorId, temperature, humidity, smoke]);

  if (!sensorId) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">VanRakshak AI</h1>
              <p className="text-green-100 text-sm lg:text-base">
                Advanced Forest Fire Detection System
              </p>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <p className="text-green-100 text-sm">Sensor ID</p>
            <p className="font-mono font-bold text-lg bg-white/10 px-3 py-1 rounded-lg">
              {sensorId}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Connection Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!data ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AI Fire Risk Assessment...</p>
          <p className="text-gray-500 text-sm mt-2">
            Analyzing sensor and weather data
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 🔥 Risk Assessment */}
          <div
            className={`rounded-2xl shadow-lg border-l-4 ${
              data.fire_risk
                ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-500"
                : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-500"
            }`}
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                  <div
                    className={`p-4 rounded-full ${
                      data.fire_risk ? "bg-red-100 animate-pulse" : "bg-green-100"
                    }`}
                  >
                    {data.fire_risk ? (
                      <AlertTriangle className="h-10 w-10 text-red-600" />
                    ) : (
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                      {data.fire_risk ? "🚨 FIRE RISK DETECTED" : "✅ ALL CLEAR"}
                    </h2>
                    <p className="text-gray-600 mt-1">{data.message}</p>
                  </div>
                </div>
                <div className="text-center lg:text-right">
                  <div
                    className={`text-3xl lg:text-4xl font-bold ${
                      data.fire_risk ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {(data.probability * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-500">Risk Probability</p>
                </div>
              </div>

              {/* Risk Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Risk Level</span>
                  <span className="text-sm text-gray-500">
                    {data.probability > 0.7
                      ? "High"
                      : data.probability > 0.3
                      ? "Medium"
                      : "Low"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      data.fire_risk
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                    }`}
                    style={{ width: `${data.probability * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Low Risk</span>
                  <span>Medium Risk</span>
                  <span>High Risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor & Weather Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Sensor Data */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Real-time Sensor Data
                  </h3>
                  <p className="text-gray-500 text-sm">Live environmental monitoring</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Thermometer, label: "Temperature", value: `${data.sensors.temperature}°C` },
                  { icon: Droplets, label: "Humidity", value: `${data.sensors.humidity}%` },
                  { icon: Wind, label: "Smoke Level", value: data.sensors.smoke },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                      <div>
                        <span className="text-gray-700 font-medium">{label}</span>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather Data */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Cloud className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Weather Conditions</h3>
                  <p className="text-gray-500 text-sm">Local meteorological data</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Temperature", value: `${data.weather.temp_local}°C` },
                  { label: "Min Temp", value: `${data.weather.temp_min}°C` },
                  { label: "Max Temp", value: `${data.weather.temp_max}°C` },
                  { label: "Cloud Cover", value: `${data.weather.clouds_all}%` },
                  { label: "Pressure", value: `${data.weather.pressure} hPa` },
                  { label: "Wind Speed", value: `${data.weather.wind_speed} m/s` },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <span className="text-gray-700">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">AI Analysis Active</p>
                  <p className="text-xs text-gray-500">
                    Monitoring {sensorId} • Updates every 15 seconds
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {fetching && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Updating Analysis...</span>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-xs text-gray-500">Last analysis</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelBar;
