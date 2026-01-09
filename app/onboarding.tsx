import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useOnboarding } from '@/hooks/use-onboarding';
import { usePermissions } from '@/hooks/use-permissions';
import { ADAPTY_CONFIG } from '@/config/adapty';
import adaptyService from '@/services/adapty-service';
import analytics from '@/services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import { AdaptyOnboardingView } from 'react-native-adapty';

// Function to get store review module safely
function getStoreReviewModule() {
  try {
    return require('expo-store-review');
  } catch (error) {
    return null;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const { requestScreenTimePermission } = usePermissions();
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to get notifications module safely
  function getNotificationsModule() {
    try {
      return require('expo-notifications');
    } catch (error) {
      return null;
    }
  }

  const requestNotificationPermission = async () => {
    try {
      const Notifications = getNotificationsModule();
      if (!Notifications) {
        return false;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Load Adapty onboarding
  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        setIsLoading(true);
        // Get onboarding from Adapty
        const onboarding = await adaptyService.getOnboarding(ADAPTY_CONFIG.placements.onboarding.main);
        
        if (!onboarding) {
          // Fallback - complete onboarding if no data
          await AsyncStorage.setItem('@onboarding_completed', 'true');
          await completeOnboarding();
          router.replace('/(tabs)');
          return;
        }
        
        setOnboardingData(onboarding);
        
        // Log onboarding start
        await analytics.logFirebaseEvent('onboarding_started', {
          placement_id: ADAPTY_CONFIG.placements.onboarding.main,
        });
      } catch (error) {
        console.error('Error loading Adapty onboarding:', error);
        // Fallback - complete onboarding if Adapty fails
        await AsyncStorage.setItem('@onboarding_completed', 'true');
        await completeOnboarding();
        router.replace('/(tabs)');
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboarding();
  }, []);

  // Handle Adapty onboarding custom action
  const handleCustom = (actionId: string, meta: any) => {
    try {
      const screenId = meta?.screenId || 'unknown';
      // Log screen view with action to Firebase
      analytics.logOnboardingScreenView(screenId, actionId).catch(console.error);

      // Handle specific actions
      switch (actionId) {
        case ADAPTY_CONFIG.actionIds.allowScreenTime:
          requestScreenTimePermission().catch(console.error);
          break;
        
        case ADAPTY_CONFIG.actionIds.allowRateApp:
          (async () => {
            try {
              const StoreReview = getStoreReviewModule();
              if (StoreReview && Platform.OS === 'ios' && await StoreReview.isAvailableAsync()) {
                await StoreReview.requestReview();
              } else {
                Alert.alert(
                  'Rate Us',
                  'Thank you for using Dopamine Detox! Your feedback helps us improve.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert(
                'Rate Us',
                'Thank you for using Dopamine Detox! Your feedback helps us improve.',
                [{ text: 'OK' }]
              );
            }
          })();
          break;
      }
    } catch (error) {
      console.error('Error handling Adapty action:', error);
    }
  };

  // Handle onboarding close
  const handleClose = (actionId: string, meta: any) => {
    (async () => {
      try {
        const screenId = meta?.screenId || 'unknown';
        // Log screen view with action to Firebase
        await analytics.logOnboardingScreenView(screenId, actionId);
        
        // Complete onboarding
        await AsyncStorage.setItem('@onboarding_completed', 'true');
        await completeOnboarding();
        await new Promise(resolve => setTimeout(resolve, 150));
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    })();
  };

  // Handle onboarding paywall
  const handlePaywall = (actionId: string, meta: any) => {
    const screenId = meta?.screenId || 'unknown';
    // Log screen view with action to Firebase
    analytics.logOnboardingScreenView(screenId, actionId).catch(console.error);
    
    router.push({
      pathname: '/paywall',
      params: { placement: ADAPTY_CONFIG.placements.paywall.onboarding },
    });
  };

  // Handle onboarding analytics
  const handleAnalytics = (event: any) => {
    (async () => {
      try {
        // Log to Firebase
        if (event.screenId) {
          await analytics.logOnboardingScreenView(event.screenId, event.actionId);
        }
      } catch (error) {
        console.error('Error logging analytics:', error);
      }
    })();
  };

  if (isLoading || !onboardingData) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <AdaptyOnboardingView
        onboarding={onboardingData}
        onCustom={handleCustom}
        onClose={handleClose}
        onPaywall={handlePaywall}
        onAnalytics={handleAnalytics}
        style={styles.onboardingView}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingView: {
    flex: 1,
  },
});
