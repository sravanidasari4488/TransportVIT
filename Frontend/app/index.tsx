import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from './constants/colors';

const SPLASH_TOTAL_MS = 2500;
const theme = colors.dark;

export default function SplashScreen() {
  const router = useRouter();

  const busScale = useRef(new Animated.Value(0)).current;
  const busOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const dot1Opacity = useRef(new Animated.Value(0.35)).current;
  const dot2Opacity = useRef(new Animated.Value(0.35)).current;
  const dot3Opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(busOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(busScale, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const textTimer = setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 400);

    const loaderTimer = setTimeout(() => {
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const pulseDot = (dot: Animated.Value, delayMs: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delayMs),
            Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.35, duration: 320, useNativeDriver: true }),
          ]),
        );

      pulseDot(dot1Opacity, 0).start();
      pulseDot(dot2Opacity, 160).start();
      pulseDot(dot3Opacity, 320).start();
    }, 800);

    const navTimer = setTimeout(() => {
      router.replace('/(auth)');
    }, SPLASH_TOTAL_MS);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(loaderTimer);
      clearTimeout(navTimer);
    };
  }, [
    router,
    busOpacity,
    busScale,
    textOpacity,
    loaderOpacity,
    dot1Opacity,
    dot2Opacity,
    dot3Opacity,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.busWrap,
          {
            opacity: busOpacity,
            transform: [{ scale: busScale }],
          },
        ]}
      >
        <Text style={styles.busEmoji}>ðŸšŒ</Text>
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={[styles.title, { color: theme.text }]}>VIT-AP Transport</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Smart Campus Mobility
        </Text>
      </Animated.View>

      <Animated.View style={[styles.loaderRow, { opacity: loaderOpacity }]}>
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.primary, opacity: dot1Opacity }]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.secondary, opacity: dot2Opacity }]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.accent, opacity: dot3Opacity }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  busWrap: {
    marginBottom: 28,
  },
  busEmoji: {
    fontSize: 88,
    lineHeight: 96,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
