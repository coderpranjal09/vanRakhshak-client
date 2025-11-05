// src/pages/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import LeafletMap, { LeafletMapHandle } from '@/components/LeafletMap';
import { getFireAlerts } from '@/api/fireAlerts';
import { SensorData } from '@/types/sensor';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import FireAlertPopup from '@/components/FireAlertPopup';

// Convert API data to SensorData format with proper error handling
const convertApiToSensorData = (apiDevices: any[]): SensorData[] => {
  if (!apiDevices || !Array.isArray(apiDevices)) return [];

  return apiDevices.map(device => {
    // Safely extract device ID with fallbacks
    const deviceId =
      device.deviceId ||
      device.id ||
      (device._id ? `DEV-${device._id.slice(-4)}` : 'DEV-unknown');

    // Safely extract ID with fallback to deviceId
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
      timestamp:
        device.lastUpdate || device.timestamp || new Date().toISOString(),
      name: device.name || `Sensor ${deviceId}`,
      status: device.isfire || device.isFire ? 'warning' : 'active',
    };
  });
};

const Dashboard: React.FC = () => {
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [fireAlerts, setFireAlerts] = useState<SensorData[]>([]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [previousFireCount, setPreviousFireCount] = useState(0);
  const mapRef = useRef<LeafletMapHandle>(null);

  // Query returns AlertData[] (array), not { success, devices }
  const { data: apiResponse = [], isLoading, error } = useQuery({
    queryKey: ['fireAlerts'],
    queryFn: getFireAlerts,
    refetchInterval: 40000, // Refetch every 40 seconds
  });

  // Convert the array into SensorData[]
  const apiSensors: SensorData[] = convertApiToSensorData(apiResponse);
  const currentFireCount = apiSensors.filter(sensor => sensor.isFire).length;

  // Check for new fire alerts
  useEffect(() => {
    const fireSensors = apiSensors.filter(sensor => sensor.isFire);
    
    // Only show popup if there are new fires that weren't in the previous state
    if (fireSensors.length > 0 && currentFireCount > previousFireCount) {
      setFireAlerts(fireSensors);
      setShowAlertPopup(true);
    }
    
    // Update the previous fire count
    setPreviousFireCount(currentFireCount);
  }, [apiSensors, currentFireCount, previousFireCount]);

  const handleViewInMap = (sensorId: string) => {
    setSelectedSensorId(sensorId);
    setShowAlertPopup(false);
    
    // Find the sensor in our data
    const sensor = apiSensors.find(s => s.id === sensorId);
    if (sensor && mapRef.current) {
      // Use the ref to zoom to the sensor
      mapRef.current.zoomToSensor(sensor);
    }
  };

  const handleLiveMonitoring = (sensorId: string) => {
    // Navigate to Live Monitoring page with the specific sensor pre-selected
    window.location.href = `/monitoring/${sensorId}`;
  };

  const handleClosePopup = () => {
    setShowAlertPopup(false);
  };

  return (
    <div className="min-h-screen">
      {/* Fire Alert Popup */}
      {showAlertPopup && fireAlerts.length > 0 && (
        <FireAlertPopup
          alerts={fireAlerts}
          onViewInMap={handleViewInMap}
          onLiveMonitoring={handleLiveMonitoring}
          onClose={handleClosePopup}
        />
      )}

      {/* Header */}
      <header className="h-16 glass border-b border-forest-accent/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-forest-primary" />
          <div>
            <h1 className="text-xl font-bold text-forest-primary">
              Forest Monitoring Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time forest fire detection system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
<Button
  variant="outline"
  size="sm"
  className="border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white"
  onClick={() => window.location.href = "https://dimriutkarsh.github.io/Van-updated/"}
>
  Main Site
</Button>

          <Button
            variant="outline"
            size="sm"
            className="border-forest-accent text-forest-primary hover:bg-forest-accent"
          >
            Dashboard
          </Button>
          <Button
  variant="outline"
  size="sm"
  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
  onClick={() => window.location.href = "https://dimriutkarsh.github.io/Van-updated/login.html"}
>
  <LogOut className="w-4 h-4 mr-2" />
  Logout
</Button>

        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="glass-card p-6 rounded-lg">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-forest-primary mb-2">
              Forest Sensor Network
            </h2>
            <p className="text-muted-foreground">
              Monitor sensor locations and forest fire detection across the
              region
            </p>
          </div>

          <div className="h-[600px] w-full">
            <LeafletMap
              ref={mapRef}
              sensors={apiSensors}
              selectedSensorId={selectedSensorId}
              onSensorClick={(sensor) => {
                console.log('Sensor clicked:', sensor);
                setSelectedSensorId(sensor.id);
              }}
              className="h-full w-full"
            />
          </div>

          {isLoading && (
            <div className="mt-4 text-center">
              <p className="text-muted-foreground">Loading sensor data...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 text-center">
              <p className="text-forest-danger">
                Failed to load API data. Showing mock sensors only.
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>API Sensors: {apiSensors.length}</span>
            <span>Active Fires: {apiSensors.filter((s) => s.isFire).length}</span>
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;