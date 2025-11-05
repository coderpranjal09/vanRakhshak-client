// src/components/LeafletMap.tsx
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SensorData } from '@/types/sensor';

interface LeafletMapProps {
  sensors: SensorData[];
  onSensorClick?: (sensor: SensorData) => void;
  selectedSensorId?: string;
  className?: string;
}

// Utility function to create base64 SVG icons
const toBase64 = (str: string): string => {
  try {
    return typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(str)))
      : Buffer.from(str).toString('base64');
  } catch (e) {
    return typeof window !== 'undefined' ? window.btoa(str) : Buffer.from(str).toString('base64');
  }
};

// Create sensor icon based on status
const createSensorIcon = (sensor: SensorData, isSelected: boolean = false) => {
  const size = isSelected ? 30 : 20;
  let color = '#22c55e'; // green for normal
  
  if (sensor.isFire) {
    color = '#ef4444'; // red for fire
  } else if (sensor.status === 'warning' || sensor.temp > 35 || sensor.smoke > 50) {
    color = '#f59e0b'; // orange for warning
  }

  const svgString = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="12" cy="12" r="6" fill="white" fill-opacity="0.3"/>
    ${sensor.isFire ? '<path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round"/>' : ''}
  </svg>`;

  const dataUrl = `data:image/svg+xml;base64,${toBase64(svgString)}`;

  return L.icon({
    iconUrl: dataUrl,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

export interface LeafletMapHandle {
  zoomToSensor: (sensor: SensorData) => void;
}

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(({ 
  sensors, 
  onSensorClick, 
  selectedSensorId,
  className = ""
}, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map focused on Uttarakhand
    const mapInstance = L.map(mapRef.current, {
      preferCanvas: true,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true
    }).setView([30.0668, 79.0193], 8); // Center of Uttarakhand

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapInstance);

    // Add zoom control to bottom right
    mapInstance.zoomControl.setPosition('bottomright');

    mapInstanceRef.current = mapInstance;
    setMapReady(true);

    // Fix map rendering
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    zoomToSensor: (sensor: SensorData) => {
      if (mapInstanceRef.current) {
        // 🔥 Increased zoom from 15 → 18
        mapInstanceRef.current.setView([sensor.latitude, sensor.longitude], 18, { animate: true });
        
        // Find and open the marker's popup
        const marker = markersRef.current.find(m => {
          const latLng = m.getLatLng();
          return latLng.lat === sensor.latitude && latLng.lng === sensor.longitude;
        });
        
        if (marker) {
          setTimeout(() => marker.openPopup(), 300);
        }
      }
    }
  }));

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Remove existing markers and circles
    markersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    markersRef.current = [];

    circlesRef.current.forEach(circle => {
      if (map.hasLayer(circle)) map.removeLayer(circle);
    });
    circlesRef.current = [];

    // Filter sensors to only include those with valid coordinates from API
    const validSensors = sensors.filter(sensor => 
      sensor.latitude !== undefined && 
      sensor.longitude !== undefined &&
      !isNaN(sensor.latitude) && 
      !isNaN(sensor.longitude) &&
      sensor.latitude !== 0 && 
      sensor.longitude !== 0
    );

    // Only use valid API sensors
    validSensors.forEach((sensor) => {
      const isSelected = selectedSensorId === sensor.id;
      const icon = createSensorIcon(sensor, isSelected);

      const marker = L.marker([sensor.latitude, sensor.longitude], { icon }).addTo(map);
      
      const lastUpdate = new Date(sensor.timestamp).toLocaleString();
      
      marker.bindPopup(`
        <div style="padding:8px; min-width:200px">
          <h3 style="margin:0 0 8px 0;font-weight:700;color:#166534">${sensor.name || sensor.deviceId}</h3>
          <div><strong>Device ID:</strong> ${sensor.deviceId}</div>
          <div><strong>Temperature:</strong> ${sensor.temp}°C</div>
          <div><strong>Humidity:</strong> ${sensor.humidity}%</div>
          <div><strong>Smoke:</strong> ${sensor.smoke} ppm</div>
          <div><strong>Status:</strong> ${sensor.isFire ? '🔥 Fire Detected' : sensor.status}</div>
          <div><strong>Last Update:</strong> ${lastUpdate}</div>
          <div style="margin-top: 8px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${sensor.latitude},${sensor.longitude}" 
               target="_blank" 
               style="background: #166534; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; display: inline-block; font-size: 12px;">
              Get Directions
            </a>
          </div>
        </div>
      `);

      // Add click event
      marker.on('click', () => {
        onSensorClick?.(sensor);
      });

      markersRef.current.push(marker);

      // Add red zone circle for sensors with fire alerts
      if (sensor.isFire) {
        const circle = L.circle([sensor.latitude, sensor.longitude], {
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.2,
          radius: 500 // 500 meter radius around the sensor
        }).addTo(map);
        
        circlesRef.current.push(circle);
      }

      if (isSelected) {
        // Focus on selected sensor
        map.setView([sensor.latitude, sensor.longitude], 12, { animate: true });
        setTimeout(() => marker.openPopup(), 300);
      }
    });

    // If we have valid sensors, adjust the map view to show them
    if (validSensors.length > 0) {
      const group = L.featureGroup([...markersRef.current, ...circlesRef.current]);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Ensure map is properly rendered
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

  }, [sensors, selectedSensorId, mapReady, onSensorClick]);

  return (
    <div className={`${className} relative`}>
      <div ref={mapRef} className="absolute inset-0 rounded-lg" />
      <div className="absolute top-4 left-4 glass-card p-2">
        <h3 className="font-semibold text-forest-primary text-sm">Forest Sensor Network</h3>
        <p className="text-xs text-muted-foreground">
          {sensors.filter(sensor => 
            sensor.latitude !== undefined && 
            sensor.longitude !== undefined &&
            !isNaN(sensor.latitude) && 
            !isNaN(sensor.longitude) &&
            sensor.latitude !== 0 && 
            sensor.longitude !== 0
          ).length} sensors deployed
        </p>
        <div className="flex items-center mt-1">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span className="text-xs">Fire Alert Zone</span>
        </div>
      </div>
    </div>
  );
});

LeafletMap.displayName = 'LeafletMap';

export default LeafletMap;
