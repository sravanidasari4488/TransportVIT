// API Configuration
import Constants from 'expo-constants';

const LOCAL_API_URL = Constants.expoConfig?.extra?.apiUrl || '';
const CLOUD_API_URL = 'https://git-backend-1-production.up.railway.app';

const expoHostUri =
  (Constants.expoConfig as any)?.hostUri ||
  (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
  '';
const expoHostIp = String(expoHostUri).split(':')[0];

const buildCandidates = (): string[] => {
  const candidates = [
    LOCAL_API_URL,
    expoHostIp ? `http://${expoHostIp}:4000` : '',
    'http://10.0.2.2:4000',
    'http://localhost:4000',
    CLOUD_API_URL,
  ].filter(Boolean);

  // Keep order and remove duplicates.
  return Array.from(new Set(candidates));
};

export const API_BASE_CANDIDATES = buildCandidates();

export const API_CONFIG = {
  // First candidate; use getApiCandidates() for fallback sequence.
  BASE_URL: API_BASE_CANDIDATES[0] || CLOUD_API_URL,

  ENDPOINTS: {
    UPLOAD_PROFILE_IMAGE: '/api/images/upload-profile',
    GET_IMAGE: '/api/images',
    GET_USER_PROFILE_IMAGE: '/api/images/profile',
    DELETE_IMAGE: '/api/images',
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getApiCandidates = (endpoint: string): string[] => {
  return API_BASE_CANDIDATES.map((base) => `${base}${endpoint}`);
};