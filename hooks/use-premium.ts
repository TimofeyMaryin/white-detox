/**
 * Premium Status Hook
 *
 * Manages premium subscription status with caching and auto-refresh.
 * Listens for app state changes and profile updates to stay in sync.
 *
 * @module hooks/use-premium
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import adaptyService from '@/services/adapty-service';

interface UsePremiumResult {
  /** Whether user has active premium subscription */
  hasPremium: boolean;
  /** Whether premium status is being checked */
  isLoading: boolean;
  /** Manually refresh premium status */
  refresh: () => Promise<void>;
}

/**
 * Hook to check and monitor premium subscription status
 *
 * @returns Premium status and controls
 *
 * @example
 * ```tsx
 * const { hasPremium, isLoading } = usePremium();
 *
 * if (isLoading) return <Loading />;
 * if (!hasPremium) return <Paywall />;
 * return <PremiumContent />;
 * ```
 */
export function usePremium(): UsePremiumResult {
  const [hasPremium, setHasPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPremiumStatus = useCallback(async () => {
    try {
      // Small delay to ensure Adapty is initialized
      await new Promise((resolve) => setTimeout(resolve, 300));
      const isPremium = await adaptyService.hasActiveSubscription();
      setHasPremium(isPremium);
    } catch (error: any) {
      // Ignore Adapty initialization errors
      if (!error?.message?.includes('undefined') && !error?.message?.includes('getProfile')) {
        console.error('[usePremium] Error checking status:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await checkPremiumStatus();
  }, [checkPremiumStatus]);

  useEffect(() => {
    // Initial check
    checkPremiumStatus();

    // Subscribe to profile updates (after purchases)
    const unsubscribe = adaptyService.onProfileUpdate(() => {
      checkPremiumStatus();
    });

    // Re-check when app becomes active
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPremiumStatus();
        // Double-check after a short delay
        setTimeout(checkPremiumStatus, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [checkPremiumStatus]);

  return { hasPremium, isLoading, refresh };
}

export default usePremium;
