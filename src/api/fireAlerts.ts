// src/api/fireAlerts.ts
const API_BASE_URL = 'https://fire-detection-system-neon.vercel.app/api/fire-alerts';

export interface AlertData {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  humidity: number;
  temp: number;
  smoke: number;
  isFire: boolean;
  timestamp: string;
}

// ✅ Fetch all alerts (GET)
export const getFireAlerts = async (): Promise<AlertData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/getAlert`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (data.success && Array.isArray(data.devices)) {
      return data.devices.map((alert: any) => ({
        id: alert._id,
        deviceId: alert.deviceId,
        latitude: alert.latitude,
        longitude: alert.longitude,
        humidity: alert.humidity,
        temp: alert.temp,
        smoke: alert.smoke,
        isFire: alert.isfire,
        timestamp: alert.lastUpdate,
      }));
    }

    console.warn('Unexpected API response format:', data);
    return [];
  } catch (error) {
    console.error('Error fetching fire alerts:', error);
    throw error;
  }
};

// ✅ Fetch alert by device ID (GET) - with fallback to getAll if specific endpoint fails
export const getFireAlertByDeviceId = async (deviceId: string): Promise<AlertData | null> => {
  try {
    // First try the specific device endpoint
    const response = await fetch(`${API_BASE_URL}/getAlert`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('API Response for device:', deviceId, data);

      if (data.success && data.device) {
        const alert = data.device;
        return {
          id: alert._id,
          deviceId: alert.deviceId,
          latitude: alert.latitude,
          longitude: alert.longitude,
          humidity: alert.humidity,
          temp: alert.temp,
          smoke: alert.smoke,
          isFire: alert.isfire,
          timestamp: alert.lastUpdate,
        };
      }
    }

    // Fallback: Get all alerts and filter by deviceId
    console.warn(`Specific device endpoint failed, trying fallback for device: ${deviceId}`);
    const allAlerts = await getFireAlerts();
    const deviceAlert = allAlerts.find(alert => alert.deviceId === deviceId);
    return deviceAlert || null;
  } catch (error) {
    console.error(`Error fetching fire alert for device ${deviceId}:`, error);
    throw error;
  }
};

// ✅ Create / update device alert (POST)
export const createFireAlert = async (alertData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/createAlert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create alert: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating fire alert:', error);
    throw error;
  }
};