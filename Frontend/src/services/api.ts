// src/services/api.ts
import axios from 'axios';
import { auth } from '../config/firebase';// Your Firebase auth instance
import { getAuth, getIdToken } from 'firebase/auth';
//const API_BASE_URL = 'https://vit-bus-backend-production.up.railway.app/get_location'; // Or your backend URL
import Constants from 'expo-constants';
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://vit-bus-backend-production.up.railway.app/get_location';
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include Firebase token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await getIdToken(user);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.warn('Failed to get ID token:', error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// API methods
export const saveUserRoute = async (route: string) => {
  try {
    const response = await api.post('/api/user/route', { route });
    return response.data;
  } catch (error) {
    console.error('Error saving route:', error);
    throw error;
  }
};

export const getUserRoute = async () => {
  try {
    const response = await api.get('/api/user/route');
    return response.data;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
};

// Add other API methods as needed