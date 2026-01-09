import analytics from '@react-native-firebase/analytics';

interface FirebaseModuleInterface {
  logEvent(name: string, params?: Record<string, any>): Promise<void>;
  setUserId(userId: string): Promise<void>;
  setUserProperty(name: string, value: string): Promise<void>;
  resetAnalyticsData(): Promise<void>;
  setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
}

class FirebaseModule implements FirebaseModuleInterface {
  async logEvent(name: string, params?: Record<string, any>): Promise<void> {
    try {
      await analytics().logEvent(name, params);
    } catch (error) {
      console.error('Firebase Analytics logEvent error:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      await analytics().setUserId(userId);
    } catch (error) {
      console.error('Firebase Analytics setUserId error:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      console.error('Firebase Analytics setUserProperty error:', error);
    }
  }

  async resetAnalyticsData(): Promise<void> {
    try {
      await analytics().resetAnalyticsData();
    } catch (error) {
      console.error('Firebase Analytics resetAnalyticsData error:', error);
    }
  }

  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      await analytics().setAnalyticsCollectionEnabled(enabled);
    } catch (error) {
      console.error('Firebase Analytics setAnalyticsCollectionEnabled error:', error);
    }
  }
}

export default new FirebaseModule();

