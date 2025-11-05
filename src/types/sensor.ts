export interface SensorData {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  humidity: number;
  temp: number;
  smoke: number;
  isFire: boolean;
  timestamp: string;
  name?: string;
  status?: 'active' | 'inactive' | 'warning';
}

export interface SensorStats {
  totalSensors: number;
  activeSensors: number;
  fireDetected: number;
  warningStatus: number;
}