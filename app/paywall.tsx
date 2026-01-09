import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ADAPTY_CONFIG } from '@/config/adapty';
import adaptyService from '@/services/adapty-service';
import analytics from '@/services/analytics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AdaptyPaywallView } from 'react-native-adapty';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ placement?: string }>();
  const [paywall, setPaywall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine placement ID
  const placementId = params.placement || ADAPTY_CONFIG.placements.paywall.main;

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
          router.back();
        }
      } catch (error) {
        console.error('Purchase error:', error);
      }
    })();
    
    // Return true to close paywall (if not cancelled)
    return purchaseResult.type !== 'user_cancelled';
  };

  const handleCloseButtonPress = () => {
    // Show offer paywall if closing main paywall
    if (placementId === ADAPTY_CONFIG.placements.paywall.main) {
      router.replace({
        pathname: '/paywall',
        params: { placement: ADAPTY_CONFIG.placements.paywall.offer },
      });
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
    
    router.back();
    // Return true to close paywall
    return true;
  };

  if (isLoading || !paywall) {
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
      <AdaptyPaywallView
        paywall={paywall}
        onPurchaseCompleted={handlePurchaseCompleted}
        onCloseButtonPress={handleCloseButtonPress}
        onRestoreCompleted={handleRestoreCompleted}
        onPaywallShown={async () => {
          // Log paywall shown (already logged in useEffect, but this is for Adapty analytics)
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
  paywallView: {
    flex: 1,
  },
});
