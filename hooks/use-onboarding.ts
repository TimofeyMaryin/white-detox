/**
 * Onboarding Hook
 *
 * Manages onboarding completion state.
 * Persists state to AsyncStorage.
 *
 * @module hooks/use-onboarding
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_completed';

/**
 * Hook to manage onboarding flow state
 *
 * @returns Onboarding state and actions
 */
export function useOnboarding() {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setIsOnboardingCompleted(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingCompleted(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save to storage first
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      // Update state synchronously - this will trigger useEffect in _layout.tsx
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error; // Re-throw to allow caller to handle
    }
  };

  return {
    isOnboardingCompleted,
    completeOnboarding,
  };
}

