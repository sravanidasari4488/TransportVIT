import { API_CONFIG } from '../../app/config/api';

export interface TrackerData {
  trackerId: string;
  trackerName: string;
  routeId: string;
  busNumber: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  currentArea: string;
  currentTime: string;
  lastUpdateTime: string;
  status: 'active' | 'inactive' | 'maintenance';
  speed: number;
  heading: number;
  batteryLevel: number;
  signalStrength: number;
  isOnline: boolean;
}

export interface TrackerResponse {
  success: boolean;
  message: string;
  data?: TrackerData;
}

export interface TrackerListResponse {
  success: boolean;
  data: TrackerData[];
  count: number;
}

export interface TrackerDashboardResponse {
  success: boolean;
  summary: {
    totalTrackers: number;
    activeTrackers: number;
    inactiveTrackers: number;
    maintenanceTrackers: number;
    recentActivity: number;
  };
  trackersByRoute: Array<{
    _id: string;
    count: number;
  }>;
}

class TrackerService {
  private baseUrl = `${API_CONFIG.BASE_URL}/api/trackers`;

  // Update tracker location
  async updateTrackerLocation(trackerData: {
    trackerId: string;
    trackerName: string;
    routeId: string;
    busNumber: string;
    lat: number;
    lng: number;
    area: string;
    speed?: number;
    heading?: number;
    batteryLevel?: number;
    signalStrength?: number;
  }): Promise<TrackerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackerData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating tracker location:', error);
      throw error;
    }
  }

  // Get all active trackers
  async getAllTrackers(params?: {
    routeId?: string;
    busNumber?: string;
    status?: string;
  }): Promise<TrackerListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.routeId) queryParams.append('routeId', params.routeId);
      if (params?.busNumber) queryParams.append('busNumber', params.busNumber);
      if (params?.status) queryParams.append('status', params.status);

      const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching trackers:', error);
      throw error;
    }
  }

  // Get tracker by ID
  async getTrackerById(trackerId: string): Promise<TrackerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${trackerId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tracker by ID:', error);
      throw error;
    }
  }

  // Get tracker by route ID
  async getTrackerByRoute(routeId: string): Promise<TrackerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/route/${routeId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tracker by route:', error);
      throw error;
    }
  }

  // Update tracker status
  async updateTrackerStatus(trackerId: string, status: {
    status?: 'active' | 'inactive' | 'maintenance';
    isOnline?: boolean;
  }): Promise<TrackerResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${trackerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(status),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating tracker status:', error);
      throw error;
    }
  }

  // Get tracker dashboard summary
  async getTrackerDashboardSummary(): Promise<TrackerDashboardResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/summary`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tracker dashboard summary:', error);
      throw error;
    }
  }
}

export default new TrackerService();




