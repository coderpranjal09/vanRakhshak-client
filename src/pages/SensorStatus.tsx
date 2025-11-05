import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import SensorStats from '@/components/SensorStats';
import SensorList from '@/components/SensorList';
import SensorPopup from '@/components/SensorPopup';
import { getFireAlerts } from '@/api/fireAlerts';
import { SensorData, SensorStats as SensorStatsType } from '@/types/sensor';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

// Convert API data to SensorData format with proper error handling
const convertApiToSensorData = (apiDevices: any[]): SensorData[] => {
  if (!apiDevices || !Array.isArray(apiDevices)) return [];
  
  return apiDevices.map(device => {
    // Handle cases where device properties might be missing
    const deviceId = device.deviceId || device._id || 'unknown';
    const id = device._id || device.id || `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: id,
      deviceId: deviceId,
      latitude: device.latitude || 0,
      longitude: device.longitude || 0,
      humidity: device.humidity || 0,
      temp: device.temp || 0,
      smoke: device.smoke || 0,
      isFire: device.isfire || device.isFire || false,
      timestamp: device.lastUpdate || device.timestamp || new Date().toISOString(),
      name: `Sensor ${deviceId}`,
      status: (device.isfire || device.isFire || device.temp > 35 || device.smoke > 140) ? 'warning' : 'active'
    };
  });
};

const SensorStatus: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSensor, setSelectedSensor] = useState<SensorData | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['fireAlerts'],
    queryFn: getFireAlerts,
    refetchInterval: 5000,
  });

  // Extract devices from API response or use empty array
  const apiDevices = apiResponse && Array.isArray(apiResponse) ? apiResponse : [];
  const allSensors = convertApiToSensorData(apiDevices);

  const stats: SensorStatsType = {
    totalSensors: allSensors.length,
    activeSensors: allSensors.filter(s => s.status === 'active').length,
    fireDetected: allSensors.filter(s => s.isFire).length,
    warningStatus: allSensors.filter(s => s.status === 'warning').length
  };

  const handleSensorClick = (sensor: SensorData) => {
    setSelectedSensor(sensor);
    setIsPopupOpen(true);
  };

  const handleViewInMap = (sensorId: string) => {
    navigate(`/?sensor=${sensorId}`);
    setIsPopupOpen(false);
  };

  const handleLiveTracking = (sensorId: string) => {
    navigate(`/monitoring?sensor=${sensorId}`);
    setIsPopupOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 glass border-b border-forest-accent/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-forest-primary" />
          <div>
            <h1 className="text-xl font-bold text-forest-primary">Sensor Status</h1>
            <p className="text-sm text-muted-foreground">Monitor all deployed forest sensors</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white">
            Main Site
          </Button>
          <Button variant="outline" size="sm" className="border-forest-accent text-forest-primary hover:bg-forest-accent">
            Dashboard
          </Button>
          <Button size="sm" className="bg-forest-primary text-white hover:bg-forest-primary/90">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="space-y-6">
          {/* Stats Section */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-forest-primary mb-6">Sensor Overview</h2>
            <SensorStats stats={stats} />
          </div>

          {/* Sensor List */}
          <div className="glass-card p-6 rounded-lg">
            <SensorList 
              sensors={allSensors} 
              onSensorClick={handleSensorClick}
            />
          </div>

          {/* Loading/Error States */}
          {isLoading && (
            <div className="glass-card p-6 rounded-lg text-center">
              <p className="text-muted-foreground">Loading sensor data...</p>
            </div>
          )}
          
          {error && (
            <div className="glass-card p-6 rounded-lg text-center">
              <p className="text-forest-danger">Failed to load API data. Showing mock sensors only.</p>
            </div>
          )}
        </div>
      </main>

      {/* Sensor Popup */}
      <SensorPopup
        sensor={selectedSensor}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onViewInMap={handleViewInMap}
        onLiveTracking={handleLiveTracking}
      />
    </div>
  );
};

export default SensorStatus;