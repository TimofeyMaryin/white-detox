import { ThemedView } from '@/components/themed-view';
import { ADAPTY_CONFIG } from '@/config/adapty';
import { Colors } from '@/constants/theme';
import adaptyService from '@/services/adapty-service';
import analytics from '@/services/analytics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AdaptyPaywallView } from 'react-native-adapty';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ placement?: string; fromOnboarding?: string }>();
  const [paywall, setPaywall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine placement ID and if coming from onboarding
  const placementId = params.placement || ADAPTY_CONFIG.placements.paywall.main;
  const isFromOnboarding = params.fromOnboarding === 'true';

  useEffect(() => {
    const loadPaywall = async () => {
      try {
        setIsLoading(true);
        // Get paywall from Adapty
        const foundPaywall = await adaptyService.getPaywall(placementId);
        setPaywall(foundPaywall);
        
        // Log paywall shown
        if (foundPaywall) {
          await analytics.logFirebaseEvent('paywall_shown', {
            placement_id: placementId,
          });
          await analytics.logAppsFlyerEvent('af_paywall_shown', {
            placement_id: placementId,
          });
        }
      } catch (error) {
        console.error('Error loading Adapty paywall:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPaywall();
  }, [placementId]);

  const handlePurchaseCompleted = (purchaseResult: any, product: any) => {
    (async () => {
      try {
        // Purchase successful - log events and refresh profile
        if (purchaseResult.type === 'success') {
          await analytics.logFirebaseEvent('purchase_completed', {
            placement_id: placementId,
            product_id: product.vendorProductId,
          });
          await analytics.logAppsFlyerEvent('af_purchase', {
            placement_id: placementId,
            product_id: product.vendorProductId,
          });
          
          // Force refresh profile to get updated subscription status
          // This ensures the app recognizes the purchase immediately
          await adaptyService.refreshProfile();
          
          // Wait a bit for profile to propagate
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Verify subscription is active
          const isActive = await adaptyService.hasActiveSubscription();
          if (!isActive) {
            console.warn('Purchase completed but subscription not yet active, will retry on next check');
          }
        }
        
        // Close paywall if not cancelled
        if (purchaseResult.type !== 'user_cancelled') {
          // If coming from onboarding flow, go directly to main screen
          if (isFromOnboarding) {
            router.replace('/(tabs)');
          } else {
            router.back();
          }
        }
      } catch (error) {
        console.error('Purchase error:', error);
      }
    })();
    
    // Return true to close paywall (if not cancelled)
    return purchaseResult.type !== 'user_cancelled';
  };

  const handleCloseButtonPress = () => {
    // If coming from onboarding, go to main screen
    if (isFromOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
    // Return true to close paywall
    return true;
  };

  const handleRestoreCompleted = async () => {
    // Restore successful - refresh profile
    try {
      await adaptyService.refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error refreshing profile after restore:', error);
    }
    
    // If coming from onboarding flow, go directly to main screen
    if (isFromOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
    // Return true to close paywall
    return true;
  };

  if (isLoading || !paywall) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image
            source={require('@/assets/images/icon.jpg')}
            style={styles.loadingIcon}
            resizeMode="cover"
          />
          <Text style={styles.loadingTitle}>Dopamine Detox</Text>
          <Text style={styles.loadingSubtitle}>SELF CONTROL</Text>
          <ActivityIndicator size="large" color={Colors.dark.primary} style={styles.loader} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <AdaptyPaywallView
        paywall={paywall}
        onPurchaseCompleted={(result: any, product: any) => {
          console.log('[Paywall] onPurchaseCompleted:', result, product);
          return handlePurchaseCompleted(result, product);
        }}
        onCloseButtonPress={() => {
          console.log('[Paywall] onCloseButtonPress triggered!');
          return handleCloseButtonPress();
        }}
        onRestoreCompleted={(profile: any) => {
          console.log('[Paywall] onRestoreCompleted triggered!', profile);
          handleRestoreCompleted();
          return true;
        }}
        onCustomAction={(actionId: string) => {
          console.log('[Paywall] onCustomAction triggered! actionId:', actionId);
          // Handle custom action to navigate to pw_offer
          if (actionId === 'pw_offer') {
            console.log('[Paywall] Navigating to pw_offer...');
            router.replace({
              pathname: '/paywall',
              params: {
                placement: ADAPTY_CONFIG.placements.paywall.offer,
                fromOnboarding: isFromOnboarding ? 'true' : undefined,
              },
            });
            return true; // Close current paywall
          }
          return false;
        }}
        onUrlPress={(url: string) => {
          console.log('[Paywall] onUrlPress:', url);
        }}
        onPaywallShown={() => {
          console.log('[Paywall] onPaywallShown triggered!');
        }}
        style={styles.paywallView}
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
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.primary,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 3,
  },
  loader: {
    marginTop: 40,
  },
  paywallView: {
    flex: 1,
  },
});
