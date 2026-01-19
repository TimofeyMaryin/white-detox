/**
 * Adapty Native Module
 *
 * Wrapper for native Adapty SDK.
 * Provides fallback implementation for development.
 *
 * @module modules/adapty
 */

import { NativeModules, Platform } from 'react-native';

interface AdaptyModuleInterface {
  activate(apiKey: string): Promise<void>;
  identify(userId: string): Promise<void>;
  getProfile(): Promise<any>;
  getPaywalls(): Promise<any>;
  makePurchase(product: any): Promise<any>;
  restorePurchases(): Promise<any>;
  setFallbackPaywalls(paywalls: any): Promise<void>;
  updateProfile(params: any): Promise<void>;
  updateAttribution(attribution: any, source: string): Promise<void>;
  showPaywall(paywall: any): Promise<any>;
}

const { Adapty: NativeAdaptyModule } = NativeModules;

// Fallback implementation for development
const fallbackAdaptyModule: AdaptyModuleInterface = {
  async activate() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
  },
  async identify() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
  },
  async getProfile() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
    return null;
  },
  async getPaywalls() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
    return [];
  },
  async makePurchase() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
    return null;
  },
  async restorePurchases() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
    return null;
  },
  async setFallbackPaywalls() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
  },
  async updateProfile() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
  },
  async updateAttribution() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
  },
  async showPaywall() {
    if (__DEV__) {
      console.warn('AdaptyModule not available - using fallback');
    }
    return null;
  },
};

const AdaptyModule = (Platform.OS === 'ios' && NativeAdaptyModule)
  ? (NativeAdaptyModule as AdaptyModuleInterface)
  : fallbackAdaptyModule;

export default AdaptyModule;

