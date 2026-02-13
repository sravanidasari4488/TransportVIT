import { API_CONFIG } from '../../app/config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

export interface ArrivalData {
  routeId: string;
  busNumber: string;
  stopName: string;
  scheduledTime: string;
  actualTime: string;
  location: {
    lat: number;
    lng: number;
  };
  occupancy?: 'low' | 'medium' | 'high';
  passengerCount?: number;
  driverNotes?: string;
  weather?: string;
  trafficCondition?: 'light' | 'moderate' | 'heavy';
}

export interface ArrivalResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ArrivalStats {
  routeId: string;
  date: string;
  overallStats: {
    totalArrivals: number;
    totalOnTime: number;
    totalDelayed: number;
    onTimePercentage: number;
    averageDelay: number;
  };
  stopStats: Array<{
    _id: string;
    totalArrivals: number;
    onTimeCount: number;
    delayedCount: number;
    avgDelay: number;
    avgPassengerCount: number;
  }>;
}

export interface ArrivalAnalytics {
  routeId: string;
  period: string;
  summary: {
    totalArrivals: number;
    onTimeArrivals: number;
    delayedArrivals: number;
    onTimePercentage: number;
    averageDelay: number;
  };
  dailyStats: Record<string, {
    total: number;
    onTime: number;
    delayed: number;
  }>;
  stopStats: Record<string, {
    total: number;
    onTime: number;
    delayed: number;
    avgDelay: number;
  }>;
}

class ArrivalService {
  // Record a new arrival
  async recordArrival(arrivalData: ArrivalData): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(arrivalData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error recording arrival:', error);
      return {
        success: false,
        message: 'Failed to record arrival',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get arrivals for a specific route
  async getRouteArrivals(routeId: string, date?: string, limit: number = 50, todayOnly: boolean = true): Promise<ArrivalResponse> {
    try {
      let url = `${API_BASE_URL}/arrivals/route/${routeId}?limit=${limit}`;
      if (date) {
        url += `&date=${date}&today=false`;
      } else if (todayOnly) {
        url += '&today=true';
      } else {
        url += '&today=false';
      }

      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching route arrivals:', error);
      return {
        success: false,
        message: 'Failed to fetch route arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get today's arrivals for a route
  async getTodayArrivals(routeId: string): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/route/${routeId}/today`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching today\'s arrivals:', error);
      return {
        success: false,
        message: 'Failed to fetch today\'s arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get arrival statistics for a route
  async getArrivalStats(routeId: string, date?: string): Promise<ArrivalResponse> {
    try {
      let url = `${API_BASE_URL}/arrivals/route/${routeId}/stats`;
      if (date) {
        url += `?date=${date}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching arrival stats:', error);
      return {
        success: false,
        message: 'Failed to fetch arrival stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get recent arrivals for a route
  async getRecentArrivals(routeId: string, limit: number = 10): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/route/${routeId}/recent?limit=${limit}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching recent arrivals:', error);
      return {
        success: false,
        message: 'Failed to fetch recent arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get arrival analytics for a route
  async getArrivalAnalytics(routeId: string, days: number = 7): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/route/${routeId}/analytics?days=${days}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching arrival analytics:', error);
      return {
        success: false,
        message: 'Failed to fetch arrival analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all arrivals with filters
  async getAllArrivals(filters: {
    routeId?: string;
    busNumber?: string;
    stopName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    todayOnly?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ArrivalResponse> {
    try {
      const params = new URLSearchParams();
      
      // Set default to today only if no date range specified
      if (!filters.startDate && !filters.endDate && filters.todayOnly !== false) {
        params.append('today', 'true');
      } else if (filters.startDate || filters.endDate) {
        params.append('today', 'false');
      }
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && key !== 'todayOnly') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/arrivals?${params.toString()}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching all arrivals:', error);
      return {
        success: false,
        message: 'Failed to fetch arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update arrival record
  async updateArrival(id: string, updateData: Partial<ArrivalData>): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating arrival:', error);
      return {
        success: false,
        message: 'Failed to update arrival',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Delete arrival record
  async deleteArrival(id: string): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting arrival:', error);
      return {
        success: false,
        message: 'Failed to delete arrival',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to create arrival data from route information
  createArrivalData(
    routeId: string,
    busNumber: string,
    stopName: string,
    scheduledTime: string,
    actualTime: string,
    location: { lat: number; lng: number },
    occupancy: 'low' | 'medium' | 'high' = 'medium',
    passengerCount: number = 0
  ): ArrivalData {
    return {
      routeId: routeId.toLowerCase(),
      busNumber,
      stopName,
      scheduledTime,
      actualTime,
      location,
      occupancy,
      passengerCount,
      driverNotes: '',
      weather: 'clear',
      trafficCondition: 'moderate'
    };
  }

  // Bulk operations
  async bulkDeleteArrivals(ids?: string[], filters?: any): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, filters }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error bulk deleting arrivals:', error);
      return {
        success: false,
        message: 'Failed to bulk delete arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exportArrivals(format: 'json' | 'csv' = 'json', filters?: any): Promise<ArrivalResponse> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters) {
        params.append('filters', JSON.stringify(filters));
      }

      const response = await fetch(`${API_BASE_URL}/arrivals/export?${params.toString()}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        return {
          success: true,
          message: 'Export successful',
          data: blob
        };
      } else {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('Error exporting arrivals:', error);
      return {
        success: false,
        message: 'Failed to export arrivals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getArrivalSummary(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ArrivalResponse> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('groupBy', groupBy);

      const response = await fetch(`${API_BASE_URL}/arrivals/summary?${params.toString()}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching arrival summary:', error);
      return {
        success: false,
        message: 'Failed to fetch arrival summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getRoutePerformance(startDate: string, endDate: string): Promise<ArrivalResponse> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/arrivals/performance/routes?${params.toString()}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching route performance:', error);
      return {
        success: false,
        message: 'Failed to fetch route performance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getStopPerformance(startDate: string, endDate: string, routeId?: string): Promise<ArrivalResponse> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (routeId) {
        params.append('routeId', routeId);
      }

      const response = await fetch(`${API_BASE_URL}/arrivals/performance/stops?${params.toString()}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching stop performance:', error);
      return {
        success: false,
        message: 'Failed to fetch stop performance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get latest arrival per stop for a route
  async getLatestArrivalsPerStop(routeId: string): Promise<ArrivalResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/arrivals/routes/${routeId}/arrivals`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching latest arrivals per stop:', error);
      return {
        success: false,
        message: 'Failed to fetch latest arrivals per stop',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const arrivalService = new ArrivalService();
export default arrivalService;
