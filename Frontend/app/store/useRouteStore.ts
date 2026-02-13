import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteStore {
  selectedRouteId: string | null;
  setSelectedRouteId: (routeId: string) => void;
  loadStoredRoute: () => Promise<void>;
}

export const useRouteStore = create<RouteStore>((set) => ({
  selectedRouteId: null,

  setSelectedRouteId: async (routeId: string) => {
    try {
      await AsyncStorage.setItem('selectedRoute', routeId);
      set({ selectedRouteId: routeId });
    } catch (error) {
      console.error('Failed to save selected route:', error);
    }
  },

  loadStoredRoute: async () => {
    try {
      const storedRoute = await AsyncStorage.getItem('selectedRoute');
      if (storedRoute) {
        set({ selectedRouteId: storedRoute });
      }
    } catch (error) {
      console.error('Failed to load stored route:', error);
    }
  },
}));
