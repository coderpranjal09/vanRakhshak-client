// src/components/LiveMonitoring.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFireAlerts, getFireAlertByDeviceId } from '@/api/fireAlerts';
import { getWeatherData } from '../api/weatherApi';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LogOut, 
  Thermometer, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Monitor, 
  Flame,
  Home,
  BarChart3,
  FileText,
  Satellite,
  Cpu,
  Navigation,
  RefreshCw
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useParams, useNavigate } from 'react-router-dom';
import { SensorData } from '@/types/sensor';
import ModelBar from '@/components/ModelBar';
import { Badge } from '@/components/ui/badge';

interface SensorReading {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  humidity: number;
  temp: number;
  smoke: number;
  isFire: boolean;
  timestamp: string;
  name: string;
  status: string;
}

interface WeatherData {
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

interface FireAlertSession {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string | null;
  readings: SensorReading[];
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  maxSmoke: number;
  minSmoke: number;
  avgSmoke: number;
  maxHumidity: number;
  minHumidity: number;
  avgHumidity: number;
  status: 'active' | 'completed';
}

// Convert API data to SensorData format
const convertApiToSensorData = (apiDevices: any[]): SensorData[] => {
  if (!apiDevices || !Array.isArray(apiDevices)) return [];

  return apiDevices.map(device => {
    const deviceId = device.deviceId || device.id || (device._id ? `DEV-${device._id.slice(-4)}` : 'DEV-unknown');
    const id = device._id || device.id || deviceId;

    return {
      id: id,
      deviceId: deviceId,
      latitude: device.latitude || 0,
      longitude: device.longitude || 0,
      humidity: device.humidity || 0,
      temp: device.temp || device.temperature || 0,
      smoke: device.smoke || 0,
      isFire: device.isfire || device.isFire || false,
      timestamp: device.lastUpdate || device.timestamp || new Date().toISOString(),
      name: device.name || `Sensor ${deviceId}`,
      status: device.isfire || device.isFire ? 'warning' : 'active',
    };
  });
};

const LiveMonitoring: React.FC = () => {
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [isMonitoringFire, setIsMonitoringFire] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<FireAlertSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<FireAlertSession[]>([]);
  const [currentSession, setCurrentSession] = useState<FireAlertSession | null>(null);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { sensorId } = useParams();
  const navigate = useNavigate();

  // Fetch all available sensors from API
  const { data: allSensorsData, isLoading: isLoadingSensors, refetch: refetchSensors } = useQuery({
    queryKey: ['allFireAlerts'],
    queryFn: getFireAlerts,
    refetchInterval: 30000,
  });

  // Convert API data to sensor format
  const availableSensors = convertApiToSensorData(allSensorsData || []);

  // Get sensor ID from URL parameters if available
  useEffect(() => {
    if (sensorId) {
      setSelectedSensorId(sensorId);
      setIsMonitoringFire(true);
      setSensorReadings([]);
      setLastProcessedTimestamp('');
    }
  }, [sensorId]);

  // Fetch data for the selected sensor
  const { data: apiResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['fireAlerts', selectedSensorId],
    queryFn: () => selectedSensorId ? getFireAlertByDeviceId(selectedSensorId) : null,
    refetchInterval: 10000,
    enabled: !!selectedSensorId,
  });

  // Fetch weather data when sensor is selected and has readings
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (selectedSensorId && sensorReadings.length > 0) {
        const latestReading = sensorReadings[0];
        try {
          const weather = await getWeatherData(latestReading.latitude, latestReading.longitude);
          setWeatherData(weather);
        } catch (error) {
          console.error('Failed to fetch weather data:', error);
        }
      }
    };

    fetchWeatherData();
  }, [selectedSensorId, sensorReadings]);

  // Load saved sessions on component mount
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('fireAlertSessions') || '[]');
    setCompletedSessions(savedSessions);
  }, []);

  // Check if reading is a duplicate
  const isDuplicateReading = useCallback((newReading: SensorReading, existingReadings: SensorReading[]) => {
    return existingReadings.some(reading => 
      reading.timestamp === newReading.timestamp &&
      reading.temp === newReading.temp &&
      reading.humidity === newReading.humidity &&
      reading.smoke === newReading.smoke
    );
  }, []);

  // Convert API data to sensor format and store readings history
  useEffect(() => {
    if (apiResponse && selectedSensorId && apiResponse.timestamp !== lastProcessedTimestamp) {
      setLastUpdate(new Date());
      setLastProcessedTimestamp(apiResponse.timestamp);
      
      const newReading = {
        id: apiResponse.id || Date.now().toString(),
        deviceId: apiResponse.deviceId,
        latitude: apiResponse.latitude,
        longitude: apiResponse.longitude,
        humidity: apiResponse.humidity,
        temp: apiResponse.temp,
        smoke: apiResponse.smoke,
        isFire: apiResponse.isFire,
        timestamp: apiResponse.timestamp || new Date().toISOString(),
        name: `Sensor ${apiResponse.deviceId}`,
        status: apiResponse.isFire ? 'warning' : 'active'
      };

      setSensorReadings(prev => {
        if (isDuplicateReading(newReading, prev)) {
          return prev;
        }
        return [newReading, ...prev].slice(0, 20);
      });
    }
  }, [apiResponse, selectedSensorId, isDuplicateReading, lastProcessedTimestamp]);

  // Handle session tracking
  useEffect(() => {
    if (sensorReadings.length > 0) {
      const latestReading = sensorReadings[0];
      
      const plainReading = {
        id: latestReading.id,
        deviceId: latestReading.deviceId,
        latitude: latestReading.latitude,
        longitude: latestReading.longitude,
        humidity: latestReading.humidity,
        temp: latestReading.temp,
        smoke: latestReading.smoke,
        isFire: latestReading.isFire,
        timestamp: latestReading.timestamp,
        name: latestReading.name,
        status: latestReading.status
      };
      
      if (plainReading.isFire && !currentSession) {
        const newSession: FireAlertSession = {
          id: `session-${Date.now()}`,
          deviceId: plainReading.deviceId,
          startTime: plainReading.timestamp,
          endTime: null,
          readings: [plainReading],
          maxTemp: plainReading.temp,
          minTemp: plainReading.temp,
          avgTemp: plainReading.temp,
          maxSmoke: plainReading.smoke,
          minSmoke: plainReading.smoke,
          avgSmoke: plainReading.smoke,
          maxHumidity: plainReading.humidity,
          minHumidity: plainReading.humidity,
          avgHumidity: plainReading.humidity,
          status: 'active'
        };
        
        setCurrentSession(newSession);
        setActiveSessions(prev => [...prev, newSession]);
      }
      
      else if (plainReading.isFire && currentSession) {
        const lastSessionReading = currentSession.readings[0];
        const timeDiff = new Date(plainReading.timestamp).getTime() - new Date(lastSessionReading.timestamp).getTime();
        const significantChange = 
          Math.abs(plainReading.temp - lastSessionReading.temp) > 1 ||
          Math.abs(plainReading.smoke - lastSessionReading.smoke) > 5 ||
          Math.abs(plainReading.humidity - lastSessionReading.humidity) > 2;
        
        if (timeDiff > 5000 || significantChange) {
          const updatedSession = {
            ...currentSession,
            readings: [plainReading, ...currentSession.readings.slice(0, 49)],
            maxTemp: Math.max(currentSession.maxTemp, plainReading.temp),
            minTemp: Math.min(currentSession.minTemp, plainReading.temp),
            maxSmoke: Math.max(currentSession.maxSmoke, plainReading.smoke),
            minSmoke: Math.min(currentSession.minSmoke, plainReading.smoke),
            maxHumidity: Math.max(currentSession.maxHumidity, plainReading.humidity),
            minHumidity: Math.min(currentSession.minHumidity, plainReading.humidity),
          };
          
          const totalReadings = updatedSession.readings.length;
          updatedSession.avgTemp = updatedSession.readings.reduce((sum, r) => sum + r.temp, 0) / totalReadings;
          updatedSession.avgSmoke = updatedSession.readings.reduce((sum, r) => sum + r.smoke, 0) / totalReadings;
          updatedSession.avgHumidity = updatedSession.readings.reduce((sum, r) => sum + r.humidity, 0) / totalReadings;
          
          setCurrentSession(updatedSession);
          setActiveSessions(prev => 
            prev.map(session => 
              session.id === updatedSession.id ? updatedSession : session
            )
          );
        }
      }
      
      else if (!plainReading.isFire && currentSession) {
        const completedSession = {
          ...currentSession,
          endTime: plainReading.timestamp,
          status: 'completed' as const
        };
        
        setCurrentSession(null);
        setActiveSessions(prev => prev.filter(session => session.id !== completedSession.id));
        
        setCompletedSessions(prev => [completedSession, ...prev.slice(0, 9)]);
        
        const savedSessions = JSON.parse(localStorage.getItem('fireAlertSessions') || '[]');
        localStorage.setItem('fireAlertSessions', JSON.stringify([completedSession, ...savedSessions.slice(0, 9)]));
      }
    }
  }, [sensorReadings, currentSession]);

  // Force refetch when sensor is selected from URL
  useEffect(() => {
    if (selectedSensorId) {
      refetch();
    }
  }, [selectedSensorId, refetch]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      await refetchSensors();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getStatusColor = (sensor: SensorReading) => {
    if (sensor.isFire) return 'text-red-600 bg-red-100';
    if (sensor.temp > 35 || sensor.smoke > 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusText = (sensor: SensorReading) => {
    if (sensor.isFire) return 'FIRE DETECTED';
    if (sensor.temp > 35 || sensor.smoke > 50) return 'WARNING';
    return 'NORMAL';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = ((diffMs % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const handleManualSensorSelect = (deviceId: string) => {
    setSelectedSensorId(deviceId);
    setIsMonitoringFire(false);
    setSensorReadings([]);
    setLastProcessedTimestamp('');
    navigate(`/monitoring/${deviceId}`);
  };

  const handleMainSite = () => {
    navigate('/');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleReports = () => {
    navigate('/reports');
  };

  const handleAffectedAreas = () => {
    if (sensorReadings.length > 0) {
      const sensorData = {
        ...sensorReadings[0],
        weatherData: weatherData
      };
      localStorage.setItem('lastSensorData', JSON.stringify(sensorData));
      navigate('/affected-areas', { 
        state: { 
          sensorData: sensorReadings[0],
          weatherData: weatherData 
        }
      });
    }
  };

  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-green-600 hover:text-green-700 transition-colors" />
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
              <Satellite className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Monitoring</h1>
              <p className="text-sm text-gray-600">Real-time forest fire detection</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
            onClick={handleMainSite}
          >
            <Home className="w-4 h-4 mr-2" />
            Main Site
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
            onClick={handleDashboard}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
            onClick={handleReports}
          >
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all shadow-md">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Enhanced Sensor Selection */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  Select Sensor for Monitoring
                  <p className="text-sm font-normal text-gray-600 mt-1">
                    Choose a sensor to view real-time environmental data
                  </p>
                </div>
                {isMonitoringFire && (
                  <span className="flex items-center gap-2 text-sm text-red-600 bg-red-100 px-3 py-1 rounded-full ml-auto">
                    <Flame className="w-4 h-4" />
                    Fire Alert Mode Active
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Select value={selectedSensorId} onValueChange={handleManualSensorSelect}>
                  <SelectTrigger className="w-full sm:w-80 bg-white border-gray-300 rounded-xl h-12">
                    <SelectValue placeholder="Choose a sensor to monitor" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSensors ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          Loading sensors...
                        </div>
                      </SelectItem>
                    ) : availableSensors.length > 0 ? (
                      availableSensors.map(sensor => (
                        <SelectItem key={sensor.deviceId} value={sensor.deviceId}>
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-gray-400" />
                            {sensor.name || `Sensor ${sensor.deviceId}`}
                            {sensor.isFire && (
                              <Flame className="w-3 h-3 text-red-500 ml-auto" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sensors" disabled>
                        No sensors available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading sensor data...</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">Error loading sensor data</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Reading Display */}
          {sensorReadings.length > 0 && (
            <div className="space-y-6">
              {/* Fire Spread Analysis Button */}
              {(sensorReadings[0].isFire) && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                          <Navigation className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Fire Spread Analysis</h3>
                          <p className="text-sm text-gray-600">
                            View predicted affected areas based on current fire detection and weather conditions
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAffectedAreas}
                        className="bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-md"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        View Possible Affected Areas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Model Bar Integration */}
              <ModelBar
                sensorId={sensorReadings[0].deviceId}
                temperature={sensorReadings[0].temp}
                humidity={sensorReadings[0].humidity}
                smoke={sensorReadings[0].smoke}
                latitude={sensorReadings[0].latitude}
                longitude={sensorReadings[0].longitude}
              />

              {/* Current Reading Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(sensorReadings[0])}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      Current Reading: {sensorReadings[0].name}
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        Live sensor data from {sensorReadings[0].deviceId}
                      </p>
                    </div>
                    {sensorReadings[0].isFire && (
                      <span className="flex items-center gap-2 text-sm text-red-600 bg-red-100 px-3 py-2 rounded-full ml-auto animate-pulse">
                        <Flame className="w-4 h-4" />
                        🚨 FIRE DETECTED
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-600">Device ID</p>
                      <p className="text-lg font-semibold text-gray-900 font-mono">{sensorReadings[0].deviceId}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`text-lg font-semibold ${getStatusColor(sensorReadings[0])} px-2 py-1 rounded-full inline-block`}>
                        {getStatusText(sensorReadings[0])}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {sensorReadings[0].latitude.toFixed(4)}, {sensorReadings[0].longitude.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-600">Last Update</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatTimestamp(sensorReadings[0].timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Enhanced Real-time Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-0 shadow-md rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Thermometer className="w-5 h-5 text-red-500" />
                          Temperature
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-red-600">{sensorReadings[0].temp}°C</p>
                        <p className={`text-sm mt-2 ${sensorReadings[0].temp > 35 ? 'text-red-600' : 'text-green-600'}`}>
                          {sensorReadings[0].temp > 35 ? '⚠️ Above normal range' : '✅ Normal range'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-md rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Droplets className="w-5 h-5 text-blue-500" />
                          Humidity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">{sensorReadings[0].humidity}%</p>
                        <p className={`text-sm mt-2 ${sensorReadings[0].humidity < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {sensorReadings[0].humidity < 30 ? '⚠️ Low humidity' : '✅ Normal range'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-0 shadow-md rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wind className="w-5 h-5 text-gray-500" />
                          Smoke Level
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-gray-700">{sensorReadings[0].smoke} ppm</p>
                        <p className={`text-sm mt-2 ${sensorReadings[0].smoke > 50 ? 'text-red-600' : 'text-green-600'}`}>
                          {sensorReadings[0].smoke > 50 ? '⚠️ Elevated levels' : '✅ Normal levels'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weather Data Display */}
                  {weatherData && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
                        <Wind className="w-5 h-5" />
                        Live Weather Conditions
                        {weatherData.icon && (
                          <img 
                            src={`https://openweathermap.org/img/wn/${weatherData.icon}.png`} 
                            alt={weatherData.description}
                            className="w-6 h-6"
                          />
                        )}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-600">Temperature</p>
                          <p className="text-lg font-bold text-blue-600">{weatherData.temp}°C</p>
                          <p className="text-xs text-gray-500">Feels like {weatherData.feels_like}°C</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-600">Wind Speed</p>
                          <p className="text-lg font-bold text-blue-600">{weatherData.wind_speed} m/s</p>
                          <p className="text-xs text-gray-500">{getWindDirection(weatherData.wind_deg)}</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-600">Humidity</p>
                          <p className="text-lg font-bold text-blue-600">{weatherData.humidity}%</p>
                          <p className="text-xs text-gray-500">Atmospheric</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-600">Pressure</p>
                          <p className="text-lg font-bold text-blue-600">{weatherData.pressure} hPa</p>
                          <p className="text-xs text-gray-500">Visibility {weatherData.visibility/1000}km</p>
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-sm text-gray-600 capitalize">
                          {weatherData.description}
                          {weatherData.wind_gust && ` • Gusts up to ${weatherData.wind_gust} m/s`}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reading History */}
          {sensorReadings.length > 1 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    Reading History
                    <p className="text-sm font-normal text-gray-600 mt-1">
                      {sensorReadings.length} records • Last 20 readings
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {sensorReadings.slice(1).map((reading, index) => (
                    <div 
                      key={`${reading.timestamp}-${index}`} 
                      className="p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatTimestamp(reading.timestamp)}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(reading)}`}>
                          {getStatusText(reading)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-red-500" />
                          <span className="text-gray-600">Temp:</span>
                          <span className="font-semibold">{reading.temp}°C</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">Humidity:</span>
                          <span className="font-semibold">{reading.humidity}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Smoke:</span>
                          <span className="font-semibold">{reading.smoke} ppm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-700">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    Active Fire Alert Sessions
                    <p className="text-sm font-normal text-red-600 mt-1">
                      {activeSessions.length} ongoing fire detection{activeSessions.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeSessions.map(session => (
                    <div key={session.id} className="p-4 border border-red-200 rounded-xl bg-red-50/50 backdrop-blur-sm">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">Device: {session.deviceId}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Started: {formatTimestamp(session.startTime)}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Badge variant="destructive" className="animate-pulse">
                            🔥 ACTIVE FIRE SESSION
                          </Badge>
                          <Badge variant="outline">
                            Duration: {formatDuration(session.startTime, session.endTime)}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg border">
                          <span className="text-gray-600">Max Temp:</span>
                          <span className="font-semibold text-red-600 ml-2">{session.maxTemp.toFixed(1)}°C</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <span className="text-gray-600">Max Smoke:</span>
                          <span className="font-semibold text-red-600 ml-2">{session.maxSmoke} ppm</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <span className="text-gray-600">Avg Temp:</span>
                          <span className="font-semibold text-orange-600 ml-2">{session.avgTemp.toFixed(1)}°C</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <span className="text-gray-600">Readings:</span>
                          <span className="font-semibold text-gray-900 ml-2">{session.readings.length} records</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-refresh info */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-0 shadow-md rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Live Monitoring Active</p>
                    <p className="text-xs text-gray-600">
                      Real-time data updates every 10 seconds
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs text-gray-600">Last system update</p>
                  <p className="text-sm font-medium text-gray-900">
                    {lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {!selectedSensorId && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-r from-gray-100 to-blue-100 p-6 rounded-2xl inline-block mb-6">
                    <Satellite className="w-12 h-12 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Sensor Selected
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Choose a sensor from the dropdown above to start monitoring real-time environmental data and AI-powered fire risk assessment.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => availableSensors.length > 0 && handleManualSensorSelect(availableSensors[0].deviceId)}
                      disabled={availableSensors.length === 0}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Monitor First Available Sensor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default LiveMonitoring;