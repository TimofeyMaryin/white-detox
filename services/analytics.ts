import FirebaseModule from '@/modules/firebase/FirebaseModule';
import AppsFlyerModule from '@/modules/appsflyer/AppsFlyerModule';

// Firebase event names
export const FIREBASE_EVENTS = {
  ONBOARDING_SCREEN_VIEW: 'onboarding_screen_view',
} as const;

// AppsFlyer event names
export const APPSFLYER_EVENTS = {
  ONBOARDING_COMPLETED: 'af_onboarding_completed',
  PAYWALL_SHOWN: 'af_paywall_shown',
  SUBSCRIPTION_STARTED: 'af_subscription_started',
} as const;

class AnalyticsService {
  /**
   * Log onboarding screen view to Firebase
   * @param screenId - Action ID from Adapty (screen_1, screen_2, etc.)
   * @param actionId - Action ID from Adapty (allowScreenTime, allowRateApp, etc.)
   */
  async logOnboardingScreenView(screenId: string, actionId?: string) {
    try {
      await FirebaseModule.logEvent(FIREBASE_EVENTS.ONBOARDING_SCREEN_VIEW, {
        screen_id: screenId,
        action_id: actionId || null,
      });
    } catch (error) {
      console.error('Error logging onboarding screen view:', error);
    }
  }

  /**
   * Log event to Firebase
   */
  async logFirebaseEvent(eventName: string, params?: Record<string, any>) {
    try {
      await FirebaseModule.logEvent(eventName, params);
    } catch (error) {
      console.error('Error logging Firebase event:', error);
    }
  }

  /**
   * Log event to AppsFlyer
   */
  async logAppsFlyerEvent(eventName: string, params?: Record<string, any>) {
    try {
      await AppsFlyerModule.logEvent(eventName, params);
    } catch (error) {
      console.error('Error logging AppsFlyer event:', error);
    }
  }

  /**
   * Set user ID for both Firebase and AppsFlyer
   */
  async setUserId(userId: string) {
    try {
      await Promise.all([
        FirebaseModule.setUserId(userId),
        AppsFlyerModule.setUserId(userId),
      ]);
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }
}

export default new AnalyticsService();

