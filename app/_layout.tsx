// CRITICAL: react-native-reanimated must be imported FIRST, before any other imports
// This ensures the native module is properly initialized
import 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboarding } from '@/hooks/use-onboarding';
import adaptyService from '@/services/adapty-service';
import appsflyerService from '@/services/appsflyer-service';

// Configure notifications to show even when app is in foreground
try {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  // Module not available - ignore
  console.log('expo-notifications not available for handler setup');
}

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00EB3F',
    background: '#1b1b1e',
    card: '#1a1a1a',
    text: '#ECEDEE',
    border: '#333333',
    notification: '#00EB3F',
  },
};

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { isOnboardingCompleted } = useOnboarding();
  const [directCheck, setDirectCheck] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize SDKs on app start
  useEffect(() => {
    const initializeSDKs = async () => {
      try {
        await Promise.all([
          adaptyService.initialize(),
          appsflyerService.initialize(),
        ]);
      } catch (error) {
        console.error('Error initializing SDKs:', error);
      }
    };
    
    initializeSDKs();
  }, []);

  // Mark as mounted after first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Direct check of AsyncStorage as fallback
  useEffect(() => {
    const checkDirectly = async () => {
      try {
        const completed = await AsyncStorage.getItem('@onboarding_completed');
        const isCompleted = completed === 'true';
        setDirectCheck(isCompleted);
      } catch (error) {
        console.error('Error checking onboarding directly:', error);
        setDirectCheck(false);
      }
    };
    
    // Initial check
    checkDirectly();
    
    // Check periodically when on onboarding screen to catch state changes
    const inOnboarding = segments[0] === 'onboarding';
    if (inOnboarding) {
      const interval = setInterval(checkDirectly, 300);
      return () => clearInterval(interval);
    }
  }, [segments]);

  useEffect(() => {
    // Don't navigate until component is mounted
    if (!isMounted) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inPaywall = segments[0] === 'paywall';
    const inModal = segments[0] === 'modal';

    // Prioritize directCheck if it's true (it updates faster from AsyncStorage)
    // If directCheck is true, trust it even if hook hasn't updated yet
    // Otherwise use hook value if available, fallback to directCheck
    let completed: boolean;
    if (directCheck === true) {
      // If directCheck says completed, trust it (it's reading directly from AsyncStorage)
      completed = true;
    } else if (isOnboardingCompleted !== null) {
      // Use hook value if directCheck is not true
      completed = isOnboardingCompleted;
    } else {
      // Fallback to directCheck (could be false or null)
      completed = directCheck ?? false;
    }

    if (completed === null) return;

    console.log('_layout navigation check:', { completed, inTabsGroup, inOnboarding, segments: segments[0], isOnboardingCompleted, directCheck, isMounted });

    // CRITICAL: If onboarding is completed, NEVER redirect back to onboarding
    if (completed) {
      // User has completed onboarding
      if (inOnboarding) {
        console.log('Onboarding completed, redirecting to tabs from _layout');
        // Use setTimeout to ensure navigation happens after mount
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 0);
      }
      // Don't do anything else if completed - let user stay where they are
      return;
    }

    // Only redirect to onboarding if NOT completed and NOT already on onboarding/paywall/modal
    if (!completed) {
      // User hasn't completed onboarding
      if (!inOnboarding && !inPaywall && !inModal) {
        console.log('Redirecting to onboarding - not completed');
        // Use setTimeout to ensure navigation happens after mount
        setTimeout(() => {
          router.replace('/onboarding');
        }, 0);
      }
    }
  }, [isOnboardingCompleted, directCheck, segments, router, isMounted]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={CustomDarkTheme}>
      <RootLayoutNav />
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
