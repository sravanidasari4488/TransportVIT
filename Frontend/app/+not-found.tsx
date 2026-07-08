import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from './constants/colors';

const theme = colors.dark;

function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'VIT-AP Transport', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.emoji}>🚌</Text>
        <Text style={[styles.text, { color: theme.text }]}>This screen doesn&apos;t exist.</Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          The page you tried to open isn&apos;t part of the app.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Go to login</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotFoundScreen;
