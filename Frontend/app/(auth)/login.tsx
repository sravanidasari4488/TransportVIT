import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();
import React, { useState } from 'react';
import { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthProvider';
import { auth } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { colors } from '../constants/colors'; // ✅ Adjust the path if needed

// import { useTheme } from '../(auth)/context/ThemeContext'; // update path as needed

// const { isDark } = useTheme();
// const theme = colors[isDark ? 'dark' : 'light'];

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  



  const router = useRouter();
  const { login, register, isLoading, error, clearError } = useAuth();
  const { setUserInfo } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
  // expoClientId: '<YOUR_EXPO_CLIENT_ID>',
  iosClientId: 'http://1036966591471-gg5qhjuc132bpqflieubu5ms52trgtft.apps.googleusercontent.com',
  androidClientId: 'http://1036966591471-2a1ai61lra8mpihktm5irqb6ak668sa3.apps.googleusercontent.com',
  webClientId: 'http://1036966591471-eosv71b6i622hto2emvudsbfuvfld1c5.apps.googleusercontent.com',
});

const [profilePic, setProfilePic] = useState('');





  const validateEmail = (email: string) => {
    const validDomains = ['@vitap.ac.in', '@vitapstudent.ac.in'];
    return validDomains.some(domain => email.endsWith(domain));
  };

  const validateForm = () => {
    let isValid = true;
    clearError();
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Only @vitap.ac.in and @vitapstudent.ac.in emails are allowed');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!isLogin && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    try {
      if (isLogin) {
        await login(email, password);
        // Redirect based on email domain
        if (email.endsWith('@vitap.ac.in')) {
          router.replace('/Faculty');
        } else if (email.endsWith('@vitapstudent.ac.in')) {
          // Check if student has selected a route, if not redirect to route selection
          router.replace('/Student/select-route');
        }
      } else {
        await register(email, password);
        // Redirect based on email domain
        if (email.endsWith('@vitap.ac.in')) {
          router.replace('/Faculty');
        } else if (email.endsWith('@vitapstudent.ac.in')) {
          // New students need to select a route first
          router.replace('/Student/select-route');
        }
      }

    } catch (err: any) {
      console.log('Auth error:', err);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setEmailError('');
    setPasswordError('');
  };
  
  useEffect(() => {
  if (response?.type === 'success') {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    signInWithCredential(auth, credential).then((userCredential) => {
      const user = userCredential.user;
      
      // Check if user email is valid
      if (user.email && (user.email.endsWith('@vitap.ac.in') || user.email.endsWith('@vitapstudent.ac.in'))) {
        setUserInfo({
          photoURL: user.photoURL || '',
          displayName: user.displayName || '',
        });
        // Redirect based on email domain
        if (user.email.endsWith('@vitap.ac.in')) {
          router.replace('/Faculty');
        } else if (user.email.endsWith('@vitapstudent.ac.in')) {
          router.replace('/Student/select-route');
        }
      } else {
        // Sign out if not valid email
        auth.signOut();
        alert('Only @vitap.ac.in and @vitapstudent.ac.in emails are allowed to access this application.');
      }
    });
  }
}, [response]);



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
        
          <Image
            source={{ uri: 'https://images.pexels.com/photos/7470/bus-people-public-transport.jpg' }}
            style={styles.logo}
          />
           
          
          <Text style={styles.title}>VIT-AP Bus Tracker</Text>
          <Text style={styles.subtitle}>Track your bus in real-time</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{isLogin ? 'Login' : 'Create Account'}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email (@vitap.ac.in or @vitapstudent.ac.in)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          {error && <Text style={styles.errorText}>{error.message}</Text>}

          <TouchableOpacity
            style={styles.authButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.authButtonText}>
                {isLogin ? 'Login' : 'Register'}
              </Text>
            )}
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.toggleMode} onPress={toggleAuthMode}>
            <Text style={styles.toggleModeText}>
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  authButton: {
    backgroundColor: '#3366FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#3366FF',
    fontSize: 14,
  },
  toggleMode: {
    alignItems: 'center',
    marginTop: 20,
  },
  toggleModeText: {
    color: '#3366FF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Login;