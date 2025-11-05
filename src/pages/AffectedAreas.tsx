// src/components/PossibleAffectedAreasMap.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wind, MapPin, Thermometer, AlertTriangle, Navigation } from 'lucide-react';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in Leaflet - this is crucial
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SensorData {
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

// Mock wind data - in real app, you'd fetch this from a weather API
const getWindData = (latitude: number, longitude: number) => {
  return {
    speed: Math.random() * 20 + 5, // km/h
    direction: Math.random() * 360, // degrees
    gust: Math.random() * 10 + 5,
  };
};

// Calculate affected areas based on wind
const calculateAffectedAreas = (
  centerLat: number,
  centerLng: number,
  windSpeed: number,
  windDirection: number,
  fireIntensity: number
) => {
  const areas = [];
  const baseDistance = (windSpeed / 10) * (fireIntensity / 100) * 2; // km
  
  // Convert wind direction to radians
  const windRad = (windDirection * Math.PI) / 180;
  
  // Main affected area in wind direction
  areas.push({
    lat: centerLat + (baseDistance * Math.sin(windRad) / 111),
    lng: centerLng + (baseDistance * Math.cos(windRad) / (111 * Math.cos(centerLat * Math.PI / 180))),
    intensity: 0.8,
    radius: baseDistance * 1000, // meters
  });
  
  // Secondary affected areas
  for (let i = 0; i < 3; i++) {
    const angleVariation = (Math.random() - 0.5) * 0.5; // ± 30 degrees
    const variedDirection = windDirection + angleVariation * 180;
    const variedRad = (variedDirection * Math.PI) / 180;
    const distance = baseDistance * (0.3 + Math.random() * 0.4);
    
    areas.push({
      lat: centerLat + (distance * Math.sin(variedRad) / 111),
      lng: centerLng + (distance * Math.cos(variedRad) / (111 * Math.cos(centerLat * Math.PI / 180))),
      intensity: 0.4 + Math.random() * 0.3,
      radius: distance * 800,
    });
  }
  
  return areas;
};

// Create custom fire icon
const createFireIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: radial-gradient(circle, red, orange);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid darkred;
        box-shadow: 0 0 15px rgba(255,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">🔥</div>
    `,
    className: 'fire-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Create wind direction icon
const createWindIcon = (direction: number) => {
  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${direction}deg);
        color: #4285F4;
        font-size: 24px;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      ">➤</div>
    `,
    className: 'wind-direction-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Helper function to convert degrees to cardinal direction
const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const AffectedAreas: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [windData, setWindData] = useState<any>(null);
  const [affectedAreas, setAffectedAreas] = useState<any[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  useEffect(() => {
    // Get sensor data from location state or localStorage
    const data = location.state?.sensorData || 
                 JSON.parse(localStorage.getItem('lastSensorData') || 'null');
    
    if (data) {
      setSensorData(data);
      const wind = getWindData(data.latitude, data.longitude);
      setWindData(wind);
      
      // Calculate fire intensity based on sensor readings
      const fireIntensity = Math.min(
        ((data.temp - 20) / 40) * 100 + // Temperature contribution
        (data.smoke / 2) + // Smoke contribution
        ((100 - data.humidity) / 2), // Low humidity contribution
        100
      );
      
      const areas = calculateAffectedAreas(
        data.latitude,
        data.longitude,
        wind.speed,
        wind.direction,
        fireIntensity
      );
      setAffectedAreas(areas);
    }
  }, [location]);

  // Initialize map - Fixed version
  useEffect(() => {
    if (!sensorData || !mapRef.current || isMapInitialized) return;

    // Ensure the map container is properly mounted
    if (mapRef.current && !mapRef.current._leaflet_id) {
      const leafletMap = L.map(mapRef.current).setView(
        [sensorData.latitude, sensorData.longitude], 
        12
      );

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 3,
      }).addTo(leafletMap);

      setMap(leafletMap);
      setIsMapInitialized(true);
    }

    // Cleanup function
    return () => {
      if (map) {
        map.remove();
        setMap(null);
        setIsMapInitialized(false);
      }
    };
  }, [sensorData, isMapInitialized]);

  // Add markers and overlays to map - Fixed version
  useEffect(() => {
    if (map && sensorData && affectedAreas.length > 0) {
      // Clear existing layers (except base tile layer)
      map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) {
          map.removeLayer(layer);
        }
      });

      // Add fire origin marker
      const fireMarker = L.marker([sensorData.latitude, sensorData.longitude], {
        icon: createFireIcon()
      })
      .addTo(map)
      .bindPopup(`
        <div class="text-center p-2">
          <strong class="text-red-600">🔥 Fire Origin</strong><br/>
          <strong>Device:</strong> ${sensorData.deviceId}<br/>
          <strong>Temp:</strong> ${sensorData.temp}°C<br/>
          <strong>Smoke:</strong> ${sensorData.smoke} ppm<br/>
          <strong>Humidity:</strong> ${sensorData.humidity}%
        </div>
      `);

      // Open popup by default
      setTimeout(() => {
        fireMarker.openPopup();
      }, 500);

      // Add affected areas as circles
      affectedAreas.forEach((area, index) => {
        const color = area.intensity > 0.6 ? 'red' : area.intensity > 0.4 ? 'orange' : 'yellow';
        
        const circle = L.circle([area.lat, area.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.3,
          radius: area.radius,
          weight: 2
        })
        .addTo(map)
        .bindPopup(`
          <div class="p-2">
            <strong class="${area.intensity > 0.6 ? 'text-red-600' : area.intensity > 0.4 ? 'text-orange-600' : 'text-yellow-600'}">
              Risk Zone ${index + 1}
            </strong><br/>
            <strong>Risk Level:</strong> ${(area.intensity * 100).toFixed(0)}%<br/>
            <strong>Radius:</strong> ${(area.radius / 1000).toFixed(1)} km
          </div>
        `);
      });

      // Add wind direction
      if (windData) {
        const windEndLat = sensorData.latitude + (0.1 * Math.sin(windData.direction * Math.PI / 180));
        const windEndLng = sensorData.longitude + (0.1 * Math.cos(windData.direction * Math.PI / 180));
        
        // Wind direction line
        L.polyline([
          [sensorData.latitude, sensorData.longitude],
          [windEndLat, windEndLng]
        ], {
          color: '#4285F4',
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10'
        }).addTo(map).bindPopup(`
          <div class="text-center">
            <strong>Wind Direction</strong><br/>
            ${getWindDirection(windData.direction)}<br/>
            ${windData.speed.toFixed(1)} km/h
          </div>
        `);

        // Wind direction arrow
        L.marker([windEndLat, windEndLng], {
          icon: createWindIcon(windData.direction),
          zIndexOffset: 1000
        }).addTo(map);
      }

      // Add heatmap effect using circle markers
      affectedAreas.forEach(area => {
        const pointsCount = 30;
        for (let i = 0; i < pointsCount; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * area.radius;
          const pointLat = area.lat + (distance * Math.sin(angle) / 111000);
          const pointLng = area.lng + (distance * Math.cos(angle) / (111000 * Math.cos(area.lat * Math.PI / 180)));
          const intensity = area.intensity * Math.random();
          
          const heatColor = intensity > 0.6 ? '#ff0000' : 
                           intensity > 0.4 ? '#ffa500' : 
                           '#ffff00';
          
          L.circleMarker([pointLat, pointLng], {
            radius: 6 + (intensity * 4),
            fillColor: heatColor,
            color: heatColor,
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.3 + (intensity * 0.3)
          }).addTo(map);
        }
      });

      // Fit map to show all affected areas with padding
      if (affectedAreas.length > 0) {
        const group = new L.FeatureGroup([
          ...affectedAreas.map(area => L.circle([area.lat, area.lng], { radius: area.radius })),
          L.marker([sensorData.latitude, sensorData.longitude])
        ]);
        
        setTimeout(() => {
          map.fitBounds(group.getBounds().pad(0.1));
        }, 100);
      }
    }
  }, [map, sensorData, affectedAreas, windData]);

  if (!sensorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Sensor Data Available</h2>
            <p className="text-gray-600 mb-6">Please select a sensor from the monitoring page first.</p>
            <Button onClick={() => navigate('/monitoring')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/monitoring')}
            className="text-gray-700 hover:text-green-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Monitoring
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Navigation className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Possible Affected Areas</h1>
              <p className="text-sm text-gray-600">Fire spread prediction based on current conditions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  Fire Spread Prediction Map
                  <div className="flex gap-2 ml-auto text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>High Risk</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Low Risk</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div 
                  ref={mapRef}
                  id="map" 
                  className="w-full h-96 lg:h-[600px] rounded-b-lg"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  Sensor Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Device ID:</span>
                  <span className="font-semibold">{sensorData.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-semibold text-red-600">{sensorData.temp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Humidity:</span>
                  <span className="font-semibold text-blue-600">{sensorData.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Smoke Level:</span>
                  <span className="font-semibold text-gray-700">{sensorData.smoke} ppm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-semibold text-sm">
                    {sensorData.latitude.toFixed(4)}, {sensorData.longitude.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-blue-500" />
                  Wind Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {windData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-semibold">{windData.speed.toFixed(1)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Direction:</span>
                      <span className="font-semibold">{getWindDirection(windData.direction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gusts:</span>
                      <span className="font-semibold">{windData.gust.toFixed(1)} km/h</span>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Wind Impact:</strong> Fire is likely to spread {windData.speed > 15 ? 'rapidly' : 'moderately'} 
                        towards {getWindDirection(windData.direction)}.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center">Loading wind data...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-1">High Risk Areas</h4>
                    <p className="text-sm text-red-700">
                      {affectedAreas.length} potential spread zones identified
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Red zones: High probability of fire spread</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Orange zones: Moderate risk areas</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Yellow zones: Low risk areas</span>
                    </p>
                    <p className="text-red-600 font-semibold mt-2">
                      • Consider evacuation for red zone areas
                    </p>
                    <p className="text-orange-600 font-semibold">
                      • Monitor orange zones closely
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AffectedAreas;