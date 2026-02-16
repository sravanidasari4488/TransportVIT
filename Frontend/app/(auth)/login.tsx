import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthProvider';
import { useTheme } from './context/ThemeContext';
import { auth } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { Bus, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import LoadingScreen from './LoadingScreen';
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get('window');

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

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const router = useRouter();
  const { login, register, isLoading, error, clearError } = useAuth();
  const { setUserInfo } = useAuth();
  const { isDark } = useTheme();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: 'http://1036966591471-gg5qhjuc132bpqflieubu5ms52trgtft.apps.googleusercontent.com',
    androidClientId: 'http://1036966591471-2a1ai61lra8mpihktm5irqb6ak668sa3.apps.googleusercontent.com',
    webClientId: 'http://1036966591471-eosv71b6i622hto2emvudsbfuvfld1c5.apps.googleusercontent.com',
  });

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
        // Determine navigation route
        let route = '';
        if (email.endsWith('@vitap.ac.in')) {
          route = '/Faculty';
        } else if (email.endsWith('@vitapstudent.ac.in')) {
          // Check if student has a route selected
          const currentUser = auth.currentUser;
          if (currentUser) {
            route = await checkStudentRoute(currentUser.uid);
          } else {
            route = '/Student/select-route';
          }
        }
        if (route) {
          setPendingNavigation(route);
          setShowLoadingScreen(true);
        }
      } else {
        await register(email, password);
        // Determine navigation route
        let route = '';
        if (email.endsWith('@vitap.ac.in')) {
          route = '/Faculty';
        } else if (email.endsWith('@vitapstudent.ac.in')) {
          // New students always go to route selection
          route = '/Student/select-route';
        }
        if (route) {
          setPendingNavigation(route);
          setShowLoadingScreen(true);
        }
      }
    } catch (err: any) {
      console.log('Auth error:', err);
    }
  };

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    if (pendingNavigation) {
      router.replace(pendingNavigation as any);
      setPendingNavigation(null);
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
      signInWithCredential(auth, credential).then(async (userCredential) => {
        const user = userCredential.user;
        if (user.email && (user.email.endsWith('@vitap.ac.in') || user.email.endsWith('@vitapstudent.ac.in'))) {
          setUserInfo({
            photoURL: user.photoURL || '',
            displayName: user.displayName || '',
          });
          // Determine navigation route
          let route = '';
          if (user.email.endsWith('@vitap.ac.in')) {
            route = '/Faculty';
          } else if (user.email.endsWith('@vitapstudent.ac.in')) {
            // Check if student has a route selected
            route = await checkStudentRoute(user.uid);
          }
          if (route) {
            setPendingNavigation(route);
            setShowLoadingScreen(true);
          }
        } else {
          auth.signOut();
          alert('Only @vitap.ac.in and @vitapstudent.ac.in emails are allowed to access this application.');
        }
      });
    }
  }, [response]);

  const theme = colors[isDark ? 'dark' : 'light'];

  // Show loading screen if needed
  if (showLoadingScreen) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={theme.gradientOmbreHeader || theme.gradientOmbre}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Bus size={48} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.title}>VIT-AP Bus</Text>
            <Text style={styles.subtitle}>Real-time bus tracking system</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isLogin
                  ? 'Sign in to continue'
                  : 'Create an account to get started'}
              </Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <Mail size={20} color={emailError ? theme.error : theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="Email address"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <Lock size={20} color={passwordError ? theme.error : theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.textSecondary} />
                  ) : (
                    <Eye size={20} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Confirm Password Input */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Lock size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.textSecondary} />
                    ) : (
                      <Eye size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark ? theme.gradientOmbre : ['#3A0CA3', '#2A0A7A', '#1A0A4A']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptAsync()}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity style={styles.toggleMode} onPress={toggleAuthMode}>
              <Text style={styles.toggleModeText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleModeLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 32,
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 15,
    color: colors.light.textSecondary,
    fontWeight: '400',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.light.text,
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  inputError: {
    borderColor: colors.light.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: colors.light.error,
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.error,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleMode: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleModeText: {
    color: colors.light.textSecondary,
    fontSize: 15,
  },
  toggleModeLink: {
    color: colors.light.primary,
    fontWeight: '700',
  },
});

export default Login;
