// src/components/SensorStats.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SensorStats as SensorStatsType } from '@/types/sensor';
import { Thermometer, Droplets, AlertTriangle, CheckCircle } from 'lucide-react';

interface SensorStatsProps {
  stats: SensorStatsType;
}

const SensorStats: React.FC<SensorStatsProps> = ({ stats }) => {
  // Ensure defaults so UI doesn't break if stats is undefined/null
  const safeStats: SensorStatsType = {
    totalSensors: stats?.totalSensors ?? 0,
    activeSensors: stats?.activeSensors ?? 0,
    fireDetected: stats?.fireDetected ?? 0,
    warningStatus: stats?.warningStatus ?? 0,
  };

  const statItems = [
    {
      label: 'Total Sensors',
      value: safeStats.totalSensors,
      icon: Thermometer,
      color: 'text-forest-primary',
      bgColor: 'bg-forest-accent/20',
    },
    {
      label: 'Active Sensors',
      value: safeStats.activeSensors,
      icon: CheckCircle,
      color: 'text-forest-success',
      bgColor: 'bg-forest-success/20',
    },
    {
      label: 'Fire Detected',
      value: safeStats.fireDetected,
      icon: AlertTriangle,
      color: 'text-forest-danger',
      bgColor: 'bg-forest-danger/20',
    },
    {
      label: 'Warning Status',
      value: safeStats.warningStatus,
      icon: Droplets,
      color: 'text-forest-warning',
      bgColor: 'bg-forest-warning/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className="glass-card border-forest-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
              <div className={`p-2 rounded-full ${item.bgColor}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SensorStats;
