// API Configuration
import Constants from 'expo-constants';

// Use local IP from app.json config, fallback to cloud
const LOCAL_API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.29.190:4000';
// Use the correct Railway backend URL that's actually deployed
const CLOUD_API_URL = 'https://git-backend-1-production.up.railway.app';

// Try to detect if local backend is available, otherwise use cloud
// For now, use cloud backend by default since local may not be running
export const API_CONFIG = {
  // Use cloud backend URL (change to LOCAL_API_URL if you have local backend running)
  BASE_URL: CLOUD_API_URL, // Cloud backend URL - using git-backend-1-production
  
  // Alternative URLs for different environments
  // BASE_URL: LOCAL_API_URL, // Local backend URL (uncomment if running locally)
  // BASE_URL: 'http://localhost:4000', // For web development
  // BASE_URL: 'http://10.0.2.2:4000', // For Android emulator
  // BASE_URL: 'http://127.0.0.1:4000', // For iOS simulator
  
  ENDPOINTS: {
    UPLOAD_PROFILE_IMAGE: '/api/images/upload-profile',
    GET_IMAGE: '/api/images',
    GET_USER_PROFILE_IMAGE: '/api/images/profile',
    DELETE_IMAGE: '/api/images',
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
