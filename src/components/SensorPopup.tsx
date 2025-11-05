import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SensorData } from '@/types/sensor';
import { MapPin, Activity } from 'lucide-react';

interface SensorPopupProps {
  sensor: SensorData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInMap: (sensorId: string) => void;
  onLiveTracking: (sensorId: string) => void;
}

const SensorPopup: React.FC<SensorPopupProps> = ({
  sensor,
  isOpen,
  onClose,
  onViewInMap,
  onLiveTracking
}) => {
  if (!sensor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-forest-accent">
        <DialogHeader>
          <DialogTitle className="text-forest-primary">
            {sensor.name || `Sensor ${sensor.deviceId}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Temperature</p>
              <p className="text-lg font-semibold text-forest-primary">{sensor.temp}°C</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Humidity</p>
              <p className="text-lg font-semibold text-forest-primary">{sensor.humidity}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Smoke Level</p>
              <p className="text-lg font-semibold text-forest-primary">{sensor.smoke}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={`text-lg font-semibold ${
                sensor.isFire ? 'text-forest-danger' : 'text-forest-success'
              }`}>
                {sensor.isFire ? '🔥 Fire Detected' : '✅ Normal'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Location</p>
            <p className="text-sm text-forest-primary">
              {sensor.latitude.toFixed(6)}, {sensor.longitude.toFixed(6)}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Last Update</p>
            <p className="text-sm text-forest-primary">
              {new Date(sensor.timestamp).toLocaleString()}
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => onViewInMap(sensor.id)}
              variant="outline"
              className="flex-1 border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white"
            >
              <MapPin className="w-4 h-4 mr-2" />
              View in Map
            </Button>
            <Button 
              onClick={() => onLiveTracking(sensor.id)}
              className="flex-1 bg-forest-primary text-white hover:bg-forest-primary/90"
            >
              <Activity className="w-4 h-4 mr-2" />
              Live Tracking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SensorPopup;