import AppsFlyerModule from '@/modules/appsflyer/AppsFlyerModule';
import { APPSFLYER_CONFIG } from '@/config/appsflyer';
import { Platform } from 'react-native';

class AppsFlyerService {
  private isInitialized = false;

  /**
   * Initialize AppsFlyer SDK
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const options: any = {
        devKey: APPSFLYER_CONFIG.devKey,
        appId: APPSFLYER_CONFIG.appId,
        isDebug: __DEV__,
      };

      if (Platform.OS === 'ios') {
        await AppsFlyerModule.initSdk(
          APPSFLYER_CONFIG.devKey,
          APPSFLYER_CONFIG.appId,
          options
        );
      }

      this.isInitialized = true;
      console.log('AppsFlyer initialized successfully');
    } catch (error) {
      console.error('Error initializing AppsFlyer:', error);
    }
  }

  /**
   * Log event
   */
  async logEvent(eventName: string, params?: Record<string, any>) {
    try {
      await AppsFlyerModule.logEvent(eventName, params);
    } catch (error) {
      console.error('Error logging AppsFlyer event:', error);
    }
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string) {
    try {
      await AppsFlyerModule.setUserId(userId);
    } catch (error) {
      console.error('Error setting AppsFlyer user ID:', error);
    }
  }
}

export default new AppsFlyerService();

