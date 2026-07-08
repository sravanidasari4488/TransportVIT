export interface User {
  id: string;
  regNo: string;
  email: string;
  name: string;
  role: "admin" | "student" | "faculty";
  busRoute?: string | null;
  dues?: number;
  paidStatus?: "Paid" | "Unpaid";
  isFirstLogin?: boolean;
  photoURL?: string | null;
  phoneNumber?: string;
  department?: string;
  office?: string;
  designation?: string;
  displayName?: string | null;
}

export interface AuthError {
  code: string;
  message: string;
}