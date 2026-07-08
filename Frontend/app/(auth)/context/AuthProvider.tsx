import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, getApiCandidates } from "../../config/api";
import { AuthError, User } from "../../types/auth";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: AuthError | null;
  selectedRouteId: string | null;
  userInfo: any;
  setUserInfo: React.Dispatch<React.SetStateAction<any>>;
  clearError: () => void;
  login: (username: string, password: string, role: "admin" | "student") => Promise<User>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedRouteId: (routeId: string) => Promise<void>;
  requestPasswordOtp: (regNo: string) => Promise<void>;
  verifyOtpAndResetPassword: (regNo: string, otp: string, newPassword: string) => Promise<void>;
  changePasswordFirstLogin: (regNo: string, oldPassword: string, newPassword: string) => Promise<void>;
  updateUserProfile: (data: any) => Promise<void>;
  uploadProfileImage: (uri: string) => Promise<string>;
  setPickingFile: (picking: boolean) => void;
  isPickingFile: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_USER_KEY = "auth_user";
const AUTH_TOKEN_KEY = "auth_token";

/** Shared guard: true while system file picker (e.g. Google Drive) has app in background */
export const isPickingFileRef = { current: false };

const parseErr = (e: any): AuthError => ({ code: e?.code || "auth/error", message: e?.message || "Something went wrong" });

const fetchJsonWithFallback = async (endpoint: string, options: RequestInit) => {
  let lastError: any = null;
  const urls = getApiCandidates(endpoint);

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      return { response, data };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Network request failed");
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [selectedRouteId, setSelectedRouteIdState] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>({});
  const setPickingFile = useCallback((picking: boolean) => {
    isPickingFileRef.current = picking;
  }, []);

  const isPickingFile = useCallback(() => isPickingFileRef.current, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_TOKEN_KEY]);
        setUser(null);
        setToken(null);
        setSelectedRouteIdState(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const clearError = () => setError(null);

  const persistAuth = async (nextUser: User, nextToken: string) => {
    const busRoute = nextUser.busRoute
      ? String(nextUser.busRoute).trim().toUpperCase().replace(/\s+/g, "")
      : null;
    const normalizedUser: User = { ...nextUser, busRoute };
    setUser(normalizedUser);
    setToken(nextToken);
    setSelectedRouteIdState(busRoute);
    await AsyncStorage.multiSet([
      [AUTH_USER_KEY, JSON.stringify(normalizedUser)],
      [AUTH_TOKEN_KEY, nextToken],
    ]);
  };

  const login = async (username: string, password: string, role: "admin" | "student"): Promise<User> => {
    try {
      setIsLoading(true);
      clearError();

      const { response, data } = await fetchJsonWithFallback("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      if (!response.ok || !data.success) throw new Error(data.error || "Login failed");

      const busRouteRaw = data.busRoute ?? data.user?.busRoute ?? null;
      const busRoute = busRouteRaw
        ? String(busRouteRaw).trim().toUpperCase().replace(/\s+/g, "")
        : null;
      const loggedInUser: User = {
        ...(data.user as User),
        busRoute,
        role: data.role || data.user?.role,
      };
      await persistAuth(loggedInUser, data.token);
      return loggedInUser;
    } catch (e: any) {
      const parsed = parseErr(e);
      setError(parsed);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async () => {
    throw new Error("Self-registration disabled. Use admin CSV upload.");
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setSelectedRouteIdState(null);
    await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_TOKEN_KEY]);
  };

  const setSelectedRouteId = async (routeId: string) => {
    const normalized = routeId.toUpperCase();
    if (user?.role === "student") {
      const assigned = (user.busRoute || "").toUpperCase();
      if (assigned && assigned !== normalized) {
        return;
      }
    }
    setSelectedRouteIdState(normalized);
    if (!user) return;
    const nextUser = { ...user, busRoute: normalized };
    setUser(nextUser);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  };

  const requestPasswordOtp = async (regNo: string) => {
    const { response, data } = await fetchJsonWithFallback("/api/auth/forgot-password/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo }),
    });
    if (!response.ok || !data.success) throw new Error(data.error || "Failed to send OTP");
  };

  const verifyOtpAndResetPassword = async (regNo: string, otp: string, newPassword: string) => {
    const { response, data } = await fetchJsonWithFallback("/api/auth/forgot-password/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, otp, newPassword }),
    });
    if (!response.ok || !data.success) throw new Error(data.error || "Failed to reset password");
  };

  const changePasswordFirstLogin = async (regNo: string, oldPassword: string, newPassword: string) => {
    const { response, data } = await fetchJsonWithFallback("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, oldPassword, newPassword }),
    });
    if (!response.ok || !data.success) throw new Error(data.error || "Failed to change password");

    if (user) {
      const updated = { ...user, isFirstLogin: false };
      setUser(updated);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
  };

  const updateUserProfile = async () => {};
  const uploadProfileImage = async () => {
    throw new Error("Profile image upload is not configured for custom auth.");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      error,
      selectedRouteId,
      userInfo,
      setUserInfo,
      clearError,
      login,
      register,
      logout,
      setSelectedRouteId,
      requestPasswordOtp,
      verifyOtpAndResetPassword,
      changePasswordFirstLogin,
      updateUserProfile,
      uploadProfileImage,
      setPickingFile,
      isPickingFile,
    }),
    [user, token, isLoading, error, selectedRouteId, userInfo, setPickingFile, isPickingFile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthProvider;