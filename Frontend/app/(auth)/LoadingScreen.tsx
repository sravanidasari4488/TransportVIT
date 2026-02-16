import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bus } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { useTheme } from './context/ThemeContext';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];
  
  // Animation values
  const busPosition = useRef(new Animated.Value(-100)).current; // Start off-screen left
  const busRotation = useRef(new Animated.Value(0)).current;
  const busScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation for background
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bus animation sequence
    const animationSequence = Animated.sequence([
      // Phase 1: Move from left to middle (smooth)
      Animated.timing(busPosition, {
        toValue: width / 2 - 30, // Middle of screen (30 is half icon size)
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // Phase 2: Sudden break - quick deceleration with rotation
      Animated.parallel([
        Animated.timing(busPosition, {
          toValue: width / 2 - 25, // Slight forward movement
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(busRotation, {
            toValue: -0.1, // Slight tilt forward
            duration: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(busRotation, {
            toValue: 0.05, // Bounce back
            duration: 100,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(busRotation, {
            toValue: 0, // Settle
            duration: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(busScale, {
            toValue: 1.1, // Slight scale up
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(busScale, {
            toValue: 1, // Scale back
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]),
      
      // Phase 3: Pause at middle (500ms)
      Animated.delay(500),
      
      // Phase 4: Continue to right (smooth acceleration)
      Animated.timing(busPosition, {
        toValue: width + 100, // Off-screen right
        duration: 600,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    // Complete after 2.5 seconds (total animation time)
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const busTranslateX = busPosition;
  const busRotate = busRotation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradientOmbreHeader || theme.gradientOmbre}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Animated background pulse */}
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            ]}
          />
          
          {/* Bus icon with animation */}
          <Animated.View
            style={[
              styles.busContainer,
              {
                transform: [
                  { translateX: busTranslateX },
                  { rotate: busRotate },
                  { scale: busScale },
                ],
              },
            ]}
          >
            <Bus size={60} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>

          {/* Loading text */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
              Loading...
            </Text>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  busContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    bottom: '30%',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

