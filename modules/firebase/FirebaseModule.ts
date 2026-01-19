/**
 * Firebase Analytics Module
 *
 * Wrapper for Firebase Analytics SDK.
 * Checks initialization before calling methods.
 *
 * @module modules/firebase
 */

import analytics from '@react-native-firebase/analytics';
import app from '@react-native-firebase/app';

interface FirebaseModuleInterface {
  logEvent(name: string, params?: Record<string, any>): Promise<void>;
  setUserId(userId: string): Promise<void>;
  setUserProperty(name: string, value: string): Promise<void>;
  resetAnalyticsData(): Promise<void>;
  setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
}

// Check if Firebase is initialized
const isFirebaseInitialized = (): boolean => {
  try {
    // Try to get default app - if it exists, Firebase is initialized
    const defaultApp = app();
    return defaultApp !== null && defaultApp !== undefined;
  } catch (error) {
    return false;
  }
};

class FirebaseModule implements FirebaseModuleInterface {
  async logEvent(name: string, params?: Record<string, any>): Promise<void> {
    try {
      if (!isFirebaseInitialized()) {
        if (__DEV__) {
          console.warn('Firebase not initialized - skipping logEvent:', name);
        }
        return;
      }
      await analytics().logEvent(name, params);
    } catch (error) {
      // Only log error if Firebase is initialized (to avoid spam)
      if (isFirebaseInitialized()) {
        console.error('Firebase Analytics logEvent error:', error);
      } else if (__DEV__) {
        console.warn('Firebase not initialized - skipping logEvent:', name);
      }
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      if (!isFirebaseInitialized()) {
        if (__DEV__) {
          console.warn('Firebase not initialized - skipping setUserId');
        }
        return;
      }
      await analytics().setUserId(userId);
    } catch (error) {
      if (isFirebaseInitialized()) {
        console.error('Firebase Analytics setUserId error:', error);
      }
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      if (!isFirebaseInitialized()) {
        if (__DEV__) {
          console.warn('Firebase not initialized - skipping setUserProperty');
        }
        return;
      }
      await analytics().setUserProperty(name, value);
    } catch (error) {
      if (isFirebaseInitialized()) {
        console.error('Firebase Analytics setUserProperty error:', error);
      }
    }
  }

  async resetAnalyticsData(): Promise<void> {
    try {
      if (!isFirebaseInitialized()) {
        if (__DEV__) {
          console.warn('Firebase not initialized - skipping resetAnalyticsData');
        }
        return;
      }
      await analytics().resetAnalyticsData();
    } catch (error) {
      if (isFirebaseInitialized()) {
        console.error('Firebase Analytics resetAnalyticsData error:', error);
      }
    }
  }

  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      if (!isFirebaseInitialized()) {
        if (__DEV__) {
          console.warn('Firebase not initialized - skipping setAnalyticsCollectionEnabled');
        }
        return;
      }
      await analytics().setAnalyticsCollectionEnabled(enabled);
    } catch (error) {
      if (isFirebaseInitialized()) {
        console.error('Firebase Analytics setAnalyticsCollectionEnabled error:', error);
      }
    }
  }
}

export default new FirebaseModule();

