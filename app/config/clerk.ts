import { ClerkProvider } from '@clerk/clerk-expo';
import Constants from 'expo-constants';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || Constants.expoConfig?.extra?.clerkPublishableKey || 'pk_test_placeholder';

// Don't throw error, use placeholder if missing (for development)
if (!publishableKey || publishableKey === 'pk_test_placeholder') {
  console.warn('⚠️ Clerk Publishable Key not set. Some auth features may not work.');
}


export { publishableKey }