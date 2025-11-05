import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SensorData } from '@/types/sensor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ForestMapProps {
  sensors: SensorData[];
  onSensorClick?: (sensor: SensorData) => void;
  selectedSensorId?: string;
  className?: string;
}

const ForestMap: React.FC<ForestMapProps> = ({ 
  sensors, 
  onSensorClick, 
  selectedSensorId,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [77.5946, 12.9716], // Bangalore coordinates (forest region)
        zoom: 8,
        pitch: 45,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        addSensorMarkers();
      });

      setShowTokenInput(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      alert('Invalid Mapbox token. Please check your token and try again.');
    }
  };

  const addSensorMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    sensors.forEach((sensor) => {
      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = `w-4 h-4 rounded-full border-2 border-white cursor-pointer transition-all duration-300 ${
        sensor.isFire 
          ? 'bg-forest-danger animate-pulse-glow' 
          : sensor.status === 'warning'
          ? 'bg-forest-warning'
          : 'bg-forest-success'
      }`;
      
      if (selectedSensorId === sensor.id) {
        markerElement.classList.add('w-6', 'h-6', 'border-4');
      }

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        className: 'forest-popup'
      }).setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-forest-primary">${sensor.name || `Sensor ${sensor.deviceId}`}</h3>
          <p class="text-sm text-muted-foreground">Temp: ${sensor.temp}°C</p>
          <p class="text-sm text-muted-foreground">Humidity: ${sensor.humidity}%</p>
          <p class="text-sm text-muted-foreground">Smoke: ${sensor.smoke}</p>
          ${sensor.isFire ? '<p class="text-sm text-forest-danger font-semibold">🔥 Fire Detected!</p>' : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([sensor.longitude, sensor.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Add click handler
      markerElement.addEventListener('click', () => {
        onSensorClick?.(sensor);
      });

      markers.current.push(marker);
    });
  };

  const focusOnSensor = (sensorId: string) => {
    const sensor = sensors.find(s => s.id === sensorId);
    if (sensor && map.current) {
      map.current.flyTo({
        center: [sensor.longitude, sensor.latitude],
        zoom: 12,
        duration: 2000
      });
    }
  };

  useEffect(() => {
    if (selectedSensorId) {
      focusOnSensor(selectedSensorId);
    }
  }, [selectedSensorId]);

  useEffect(() => {
    if (map.current && sensors.length > 0) {
      addSensorMarkers();
    }
  }, [sensors]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      initializeMap(mapboxToken);
    }
  };

  if (showTokenInput) {
    return (
      <div className={`${className} glass-card p-6 flex items-center justify-center`}>
        <form onSubmit={handleTokenSubmit} className="space-y-4 w-full max-w-md">
          <div>
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.ey..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="mt-1"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-forest-primary text-white py-2 px-4 rounded-md hover:bg-forest-primary/90 transition-colors"
          >
            Initialize Map
          </button>
          <p className="text-sm text-muted-foreground text-center">
            Get your token from{' '}
            <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-forest-primary hover:underline">
              Mapbox Dashboard
            </a>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      <div className="absolute top-4 left-4 glass-card p-2">
        <h3 className="font-semibold text-forest-primary text-sm">Forest Sensor Network</h3>
        <p className="text-xs text-muted-foreground">{sensors.length} sensors deployed</p>
      </div>
    </div>
  );
};

export default ForestMap;