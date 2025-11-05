// src/components/FireAlertPopup.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SensorData } from '@/types/sensor';
import { MapPin, Activity, X } from 'lucide-react';

interface FireAlertPopupProps {
  alerts: SensorData[];
  onViewInMap: (sensorId: string) => void;
  onLiveMonitoring: (sensorId: string) => void; // Add this back
  onClose: () => void;
}

const FireAlertPopup: React.FC<FireAlertPopupProps> = ({
  alerts,
  onViewInMap,
  onLiveMonitoring, // Add this back
  onClose
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-card border-forest-danger max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-forest-danger flex items-center">
              <span className="text-2xl">🔥</span>
              <span className="ml-2">Fire Alert!</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {alerts.length} sensor{alerts.length > 1 ? 's' : ''} detected potential fire conditions.
          </p>
          
          {alerts.map((alert) => (
            <div key={alert.id} className="p-3 bg-forest-danger/10 rounded-lg">
              <h4 className="font-medium text-forest-primary">
                {alert.name || `Sensor ${alert.deviceId}`}
              </h4>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Temp:</span>
                  <span className="ml-1 font-medium">{alert.temp}°C</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Smoke:</span>
                  <span className="ml-1 font-medium">{alert.smoke} ppm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <span className="ml-1 font-medium">
                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={() => onViewInMap(alert.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white text-xs"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  View in Map
                </Button>
                <Button 
                  onClick={() => onLiveMonitoring(alert.deviceId)} // <<-- FIX: pass deviceId (not the DB _id)
                  size="sm"
                  className="flex-1 bg-forest-primary text-white hover:bg-forest-primary/90 text-xs"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Live Monitor
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FireAlertPopup;
