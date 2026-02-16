import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { API_CONFIG } from '../config/api';

// Helper function to check if student has a route selected
const checkStudentRoute = async (userId: string): Promise<string> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user?.selectedRoute) {
        return '/Student'; // Student has route, go to dashboard
      }
    }
    return '/Student/select-route'; // No route selected, go to route selection
  } catch (error) {
    console.error('Error checking student route:', error);
    return '/Student/select-route'; // Default to route selection on error
  }
};

function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
      
      if (user && user.email) {
        if (user.email.endsWith('@vitap.ac.in')) {
          setRedirectPath('/Faculty');
        } else if (user.email.endsWith('@vitapstudent.ac.in')) {
          // Check if student has a route selected
          const route = await checkStudentRoute(user.uid);
          setRedirectPath(route);
        } else {
          setRedirectPath('/login');
        }
      } else {
        setRedirectPath('/login');
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }

  if (redirectPath) {
    return <Redirect href={redirectPath as any} />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default Index;
