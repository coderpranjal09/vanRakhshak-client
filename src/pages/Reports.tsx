// src/pages/Reports.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Clock, Thermometer, Droplets, Wind, MapPin, AlertTriangle, Trash2, BarChart3, Download } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SensorReading {
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

interface FireAlertSession {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string | null;
  readings: SensorReading[];
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  maxSmoke: number;
  minSmoke: number;
  avgSmoke: number;
  maxHumidity: number;
  minHumidity: number;
  avgHumidity: number;
  status: 'active' | 'completed';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Reports: React.FC = () => {
  const [sessions, setSessions] = useState<FireAlertSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FireAlertSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('fireAlertSessions') || '[]');
    setSessions(savedSessions);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleMainSite = () => {
    navigate('/');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleLiveMonitoring = () => {
    navigate('/live-monitoring');
  };

  const getStatusColor = (reading: SensorReading) => {
    if (reading.isFire) return 'text-red-600';
    if (reading.temp > 35 || reading.smoke > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = (reading: SensorReading) => {
    if (reading.isFire) return 'FIRE DETECTED';
    if (reading.temp > 35 || reading.smoke > 50) return 'WARNING';
    return 'NORMAL';
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click event
    setSessionToDelete(sessionId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      const updatedSessions = sessions.filter(session => session.id !== sessionToDelete);
      setSessions(updatedSessions);
      localStorage.setItem('fireAlertSessions', JSON.stringify(updatedSessions));
      
      // If the deleted session was selected, clear the selection
      if (selectedSession && selectedSession.id === sessionToDelete) {
        setSelectedSession(null);
      }
      
      setSessionToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const cancelDelete = () => {
    setSessionToDelete(null);
    setShowDeleteDialog(false);
  };

  // Prepare chart data for the selected session
  const chartData = useMemo(() => {
    if (!selectedSession) return [];
    
    return selectedSession.readings.map(reading => ({
      time: new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: reading.timestamp,
      temp: reading.temp,
      smoke: reading.smoke,
      humidity: reading.humidity,
      isFire: reading.isFire ? 1 : 0,
      status: reading.isFire ? 'Fire' : (reading.temp > 35 || reading.smoke > 50 ? 'Warning' : 'Normal')
    }));
  }, [selectedSession]);

  // Prepare severity distribution data
  const severityData = useMemo(() => {
    if (!selectedSession) return [];
    
    const normal = selectedSession.readings.filter(r => !r.isFire && r.temp <= 35 && r.smoke <= 50).length;
    const warning = selectedSession.readings.filter(r => !r.isFire && (r.temp > 35 || r.smoke > 50)).length;
    const fire = selectedSession.readings.filter(r => r.isFire).length;
    
    return [
      { name: 'Normal', value: normal, color: '#10B981' },
      { name: 'Warning', value: warning, color: '#F59E0B' },
      { name: 'Fire', value: fire, color: '#EF4444' }
    ];
  }, [selectedSession]);

  // Calculate statistics for the session
  const sessionStats = useMemo(() => {
    if (!selectedSession) return null;
    
    const fireReadings = selectedSession.readings.filter(r => r.isFire).length;
    const warningReadings = selectedSession.readings.filter(r => !r.isFire && (r.temp > 35 || r.smoke > 50)).length;
    const normalReadings = selectedSession.readings.filter(r => !r.isFire && r.temp <= 35 && r.smoke <= 50).length;
    
    // Find peak fire time
    let peakFireTime = null;
    if (fireReadings > 0) {
      const fireTimestamps = selectedSession.readings
        .filter(r => r.isFire)
        .map(r => new Date(r.timestamp).getTime());
      
      const avgFireTime = fireTimestamps.reduce((a, b) => a + b, 0) / fireTimestamps.length;
      peakFireTime = new Date(avgFireTime).toLocaleTimeString();
    }
    
    return {
      totalReadings: selectedSession.readings.length,
      fireReadings,
      warningReadings,
      normalReadings,
      firePercentage: (fireReadings / selectedSession.readings.length * 100).toFixed(1),
      warningPercentage: (warningReadings / selectedSession.readings.length * 100).toFixed(1),
      normalPercentage: (normalReadings / selectedSession.readings.length * 100).toFixed(1),
      peakFireTime
    };
  }, [selectedSession]);

  // Function to export session data as CSV
  const exportSessionData = () => {
    if (!selectedSession) return;
    
    const headers = "Timestamp,Temperature (°C),Humidity (%),Smoke (ppm),Status\n";
    const csvContent = selectedSession.readings.map(reading => {
      return `${reading.timestamp},${reading.temp},${reading.humidity},${reading.smoke},${getStatusText(reading)}`;
    }).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `fire-session-${selectedSession.deviceId}-${selectedSession.startTime}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to generate a PDF report (placeholder)
  const generatePDFReport = () => {
    alert("PDF generation functionality would be implemented here. This would typically use a library like jsPDF or browser print functionality.");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 glass border-b border-forest-accent/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-forest-primary" />
          <div>
            <h1 className="text-xl font-bold text-forest-primary">Fire Alert Reports</h1>
            <p className="text-sm text-muted-foreground">Historical fire alert sessions and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white"
            onClick={handleMainSite}
          >
            Main Site
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-forest-accent text-forest-primary hover:bg-forest-accent"
            onClick={handleDashboard}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-forest-accent text-forest-primary hover:bg-forest-accent"
            onClick={handleLiveMonitoring}
          >
            Live Monitoring
          </Button>
          <Button size="sm" className="bg-forest-primary text-white hover:bg-forest-primary/90">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {sessions.length === 0 ? (
          <Card className="glass-card p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-forest-primary mb-4">No Fire Alert Sessions Recorded</h2>
            <p className="text-muted-foreground">Fire alert sessions will appear here after they are detected and resolved.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Session List */}
            <div className="lg:col-span-1">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Fire Alert Sessions ({sessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {sessions.map(session => (
                      <Card 
                        key={session.id} 
                        className={`cursor-pointer p-4 hover:bg-forest-50 relative ${
                          selectedSession?.id === session.id ? 'bg-forest-50 border-forest-primary' : ''
                        }`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">Device: {session.deviceId}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.startTime).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            className={session.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                          >
                            {session.status === 'completed' ? 'Completed' : 'Active'}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center">
                            <Thermometer className="w-3 h-3 mr-1 text-red-500" />
                            <span>Max: {session.maxTemp.toFixed(1)}°C</span>
                          </div>
                          <div className="flex items-center">
                            <Wind className="w-3 h-3 mr-1 text-gray-500" />
                            <span>Max: {session.maxSmoke}ppm</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Duration: {getDuration(session.startTime, session.endTime)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Readings: {session.readings.length} records
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session Details */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>
                        Fire Alert Details - {selectedSession.deviceId}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={exportSessionData}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={generatePDFReport}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Generate PDF
                        </Button>
                      </div>
                    </div>
                    <Badge className={selectedSession.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {selectedSession.status === 'completed' ? 'Completed' : 'Active'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Device ID</p>
                        <p className="text-lg font-semibold">{selectedSession.deviceId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-semibold">
                          {getDuration(selectedSession.startTime, selectedSession.endTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Time</p>
                        <p className="text-lg font-semibold">{formatDate(selectedSession.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Time</p>
                        <p className="text-lg font-semibold">
                          {selectedSession.endTime ? formatDate(selectedSession.endTime) : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid grid-cols-4 mb-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="charts">Charts</TabsTrigger>
                        <TabsTrigger value="analysis">Analysis</TabsTrigger>
                        <TabsTrigger value="rawdata">Raw Data</TabsTrigger>
                      </TabsList>

                      {/* Overview Tab */}
                      <TabsContent value="overview">
                        <h3 className="text-lg font-semibold mb-4">Sensor Data Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Thermometer className="w-4 h-4 text-red-500" />
                                Temperature
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold">{selectedSession.avgTemp.toFixed(1)}°C</p>
                              <p className="text-sm text-muted-foreground">
                                Min: {selectedSession.minTemp.toFixed(1)}°C | Max: {selectedSession.maxTemp.toFixed(1)}°C
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Wind className="w-4 h-4 text-gray-500" />
                                Smoke Level
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold">{selectedSession.avgSmoke.toFixed(1)} ppm</p>
                              <p className="text-sm text-muted-foreground">
                                Min: {selectedSession.minSmoke}ppm | Max: {selectedSession.maxSmoke}ppm
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Droplets className="w-4 h-4 text-blue-500" />
                                Humidity
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold">{selectedSession.avgHumidity.toFixed(1)}%</p>
                              <p className="text-sm text-muted-foreground">
                                Min: {selectedSession.minHumidity}% | Max: {selectedSession.maxHumidity}%
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={severityData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {severityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Session Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {sessionStats && (
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Readings:</span>
                                    <span className="font-medium">{sessionStats.totalReadings}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Normal Readings:</span>
                                    <span className="font-medium text-green-600">
                                      {sessionStats.normalReadings} ({sessionStats.normalPercentage}%)
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Warning Readings:</span>
                                    <span className="font-medium text-yellow-600">
                                      {sessionStats.warningReadings} ({sessionStats.warningPercentage}%)
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fire Readings:</span>
                                    <span className="font-medium text-red-600">
                                      {sessionStats.fireReadings} ({sessionStats.firePercentage}%)
                                    </span>
                                  </div>
                                  {sessionStats.peakFireTime && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Peak Fire Time:</span>
                                      <span className="font-medium">{sessionStats.peakFireTime}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Charts Tab */}
                      <TabsContent value="charts">
                        <h3 className="text-lg font-semibold mb-4">Temperature Trend</h3>
                        <Card className="mb-6">
                          <CardContent className="pt-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="temp" stroke="#ef4444" activeDot={{ r: 8 }} name="Temperature (°C)" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        <h3 className="text-lg font-semibold mb-4">Smoke Level Trend</h3>
                        <Card className="mb-6">
                          <CardContent className="pt-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Area type="monotone" dataKey="smoke" stroke="#8884d8" fill="#8884d8" name="Smoke (ppm)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        <h3 className="text-lg font-semibold mb-4">Multi-Sensor Comparison</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.slice(0, 10)}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="temp" fill="#ef4444" name="Temperature (°C)" />
                                  <Bar dataKey="smoke" fill="#8884d8" name="Smoke (ppm)" />
                                  <Bar dataKey="humidity" fill="#3b82f6" name="Humidity (%)" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Analysis Tab */}
                      <TabsContent value="analysis">
                        <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Fire Risk Indicators</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between mb-1">
                                    <span>Temperature Risk</span>
                                    <span className="font-medium">
                                      {selectedSession.maxTemp > 60 ? 'High' : 
                                       selectedSession.maxTemp > 40 ? 'Medium' : 'Low'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        selectedSession.maxTemp > 60 ? 'bg-red-600' : 
                                        selectedSession.maxTemp > 40 ? 'bg-yellow-500' : 'bg-green-600'
                                      }`} 
                                      style={{width: `${Math.min(selectedSession.maxTemp, 100)}%`}}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1">
                                    <span>Smoke Risk</span>
                                    <span className="font-medium">
                                      {selectedSession.maxSmoke > 100 ? 'High' : 
                                       selectedSession.maxSmoke > 50 ? 'Medium' : 'Low'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        selectedSession.maxSmoke > 100 ? 'bg-red-600' : 
                                        selectedSession.maxSmoke > 50 ? 'bg-yellow-500' : 'bg-green-600'
                                      }`} 
                                      style={{width: `${Math.min(selectedSession.maxSmoke, 100)}%`}}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1">
                                    <span>Overall Risk Level</span>
                                    <span className="font-medium">
                                      {selectedSession.maxTemp > 60 || selectedSession.maxSmoke > 100 ? 'High' : 
                                       selectedSession.maxTemp > 40 || selectedSession.maxSmoke > 50 ? 'Medium' : 'Low'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        selectedSession.maxTemp > 60 || selectedSession.maxSmoke > 100 ? 'bg-red-600' : 
                                        selectedSession.maxTemp > 40 || selectedSession.maxSmoke > 50 ? 'bg-yellow-500' : 'bg-green-600'
                                      }`} 
                                      style={{width: `${Math.min(
                                        (selectedSession.maxTemp / 100 * 50) + (selectedSession.maxSmoke / 200 * 50), 
                                        100
                                      )}%`}}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Environmental Impact</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Potential Area Affected:</span>
                                  <span className="font-medium">
                                    {selectedSession.maxTemp > 60 ? 'Large (5+ acres)' : 
                                     selectedSession.maxTemp > 40 ? 'Medium (1-5 acres)' : 'Small (<1 acre)'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Response Time Needed:</span>
                                  <span className="font-medium">
                                    {selectedSession.maxTemp > 60 ? 'Immediate (<15 mins)' : 
                                     selectedSession.maxTemp > 40 ? 'Urgent (15-30 mins)' : 'Standard (30+ mins)'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Recommended Action:</span>
                                  <span className="font-medium">
                                    {selectedSession.maxTemp > 60 ? 'Evacuate and deploy fire services' : 
                                     selectedSession.maxTemp > 40 ? 'Increase monitoring and prepare response' : 'Continue standard monitoring'}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <h3 className="text-lg font-semibold mb-4">Pattern Recognition</h3>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Fire Development Pattern</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {sessionStats && sessionStats.fireReadings > 0 ? (
                              <div className="space-y-3">
                                <p>The data indicates a fire event that:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>Started at approximately {formatDate(selectedSession.startTime)}</li>
                                  <li>Lasted for {getDuration(selectedSession.startTime, selectedSession.endTime)}</li>
                                  <li>Reached peak intensity around {sessionStats.peakFireTime || 'unknown time'}</li>
                                  <li>Showed {selectedSession.readings.some(r => r.temp > 70) ? 'high' : 'moderate'} temperature escalation</li>
                                </ul>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  This pattern suggests a {selectedSession.readings.some(r => r.temp > 70) ? 'rapidly developing' : 'gradual'} fire that may have been influenced by weather conditions and available fuel sources.
                                </p>
                              </div>
                            ) : (
                              <p>No significant fire pattern detected in this session. The readings indicate normal environmental conditions with occasional warnings.</p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Raw Data Tab */}
                      <TabsContent value="rawdata">
                        <h3 className="text-lg font-semibold mb-4">All Readings ({selectedSession.readings.length} records)</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selectedSession.readings.map((reading, index) => (
                            <div key={`${reading.timestamp}-${index}`} className="p-3 border rounded-lg bg-white">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium">
                                  {new Date(reading.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`text-sm font-semibold ${getStatusColor(reading)}`}>
                                  {getStatusText(reading)}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Temp:</span> {reading.temp}°C
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Humidity:</span> {reading.humidity}%
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Smoke:</span> {reading.smoke} ppm
                                </div>
                              </div>
                              {reading.latitude && reading.longitude && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Location: {reading.latitude.toFixed(4)}, {reading.longitude.toFixed(4)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-card p-6 rounded-lg text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-bold text-forest-primary mb-2">Select a Session</h2>
                  <p className="text-muted-foreground">Choose a fire alert session from the list to view details</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the fire alert session
                and all its associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Reports;