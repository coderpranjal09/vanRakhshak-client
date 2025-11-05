import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SensorData } from '@/types/sensor';
import { MapPin, Thermometer, Droplets, Flame } from 'lucide-react';

interface SensorListProps {
  sensors: SensorData[];
  onSensorClick: (sensor: SensorData) => void;
}

const SensorList: React.FC<SensorListProps> = ({ sensors, onSensorClick }) => {
  const getStatusColor = (sensor: SensorData) => {
    if (sensor.isFire) return 'bg-forest-danger text-white';
    if ((sensor.temp ?? 0) > 35 || (sensor.smoke ?? 0) > 50) {
      return 'bg-forest-warning text-white';
    }
    return 'bg-forest-success text-white';
  };

  const getStatusText = (sensor: SensorData) => {
    if (sensor.isFire) return 'FIRE DETECTED';
    if ((sensor.temp ?? 0) > 35 || (sensor.smoke ?? 0) > 50) return 'WARNING';
    return 'NORMAL';
  };

  return (
    <Card className="glass-card border-forest-accent/30">
      <CardHeader>
        <CardTitle className="text-forest-primary">Active Sensors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sensors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sensors available</p>
          ) : (
            sensors.map((sensor) => (
              <div
                key={sensor.id}
                onClick={() => onSensorClick(sensor)}
                className="p-3 rounded-lg border border-forest-accent/30 
                           hover:border-forest-accent cursor-pointer 
                           transition-all duration-200 hover:shadow-md"
              >
                {/* Header: Name + Status */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-forest-primary">
                    {sensor.name || `Sensor ${sensor.deviceId}`}
                  </h4>
                  <Badge className={getStatusColor(sensor)}>
                    {getStatusText(sensor)}
                  </Badge>
                </div>

                {/* Sensor Data Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    <span>{sensor.temp ?? '--'}°C</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>{sensor.humidity ?? '--'}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>Smoke: {sensor.smoke ?? '--'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {(sensor.latitude ?? 0).toFixed(3)}, {(sensor.longitude ?? 0).toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Last update */}
                <div className="mt-2 text-xs text-muted-foreground">
                  Last update:{' '}
                  {sensor.timestamp
                    ? new Date(sensor.timestamp).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SensorList;