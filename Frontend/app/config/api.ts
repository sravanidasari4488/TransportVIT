// API Configuration
export const API_CONFIG = {
  // Cloud backend URL
  BASE_URL: 'https://vit-bus-backend-production.up.railway.app', // Cloud backend URL
  
  // Alternative URLs for different environments
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
