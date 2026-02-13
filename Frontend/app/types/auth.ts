
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber?: string;
  department?: string;
  office?: string;
  designation?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// Add this default export to fix the warning:
import React from 'react';

export default function DummyComponent() {
  return null;
}
